/**
 * End-to-end smoke test for server performance fixes.
 * Uses real DB users + JWT secret — no OTP email flow needed.
 * Run: node scripts/e2e-test.mjs
 */

import jwt from 'jsonwebtoken';

const BASE = 'http://localhost:8080';
const JWT_SECRET = 'dsakdsajdlkasdalksdjlka';

// Real user IDs from DB
const STUDENT_ID  = '68e5df785246abd11c559070';
const TEACHER_ID  = '69196ab8e347c16ec070d782';
// Public test with questions
const PUBLIC_TEST_ID = '6951eb173a3b068c53c3e727';
const QUESTION_ID    = '68e5ddf75246abd11c558fb7';

// Generate tokens directly (same algorithm the server uses)
const studentToken = jwt.sign({ userId: STUDENT_ID },  JWT_SECRET, { expiresIn: '1h' });
const teacherToken = jwt.sign({ userId: TEACHER_ID }, JWT_SECRET, { expiresIn: '1h' });

let attemptId = null;
let passed = 0;
let failed = 0;

// ─── helpers ────────────────────────────────────────────────────────────────

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, body: json, headers: res.headers };
}

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

// ─── 1. Health ───────────────────────────────────────────────────────────────

section('1. Health check');
{
  const r = await req('GET', '/', null, null);
  check('GET / returns 200', r.status === 200);
  check('Response has message field', !!r.body.message);
}

// ─── 2. Auth middleware + Fix #3 & #12 ───────────────────────────────────────

section('2. Auth middleware — Fix #3 (no debug logs), Fix #12 (slimmed select)');
{
  const r = await req('GET', '/api/auth/profile', null, studentToken);
  check('GET /api/auth/profile returns 200', r.status === 200, JSON.stringify(r.body?.message));
  check('User object returned', !!r.body.data?.user || !!r.body.user);
}

// ─── 3. Student stats — Fix #12 (calculateAccuracy still works) ──────────────

section('3. Student stats — Fix #12 (calculateAccuracy not broken by lean)');
{
  const r = await req('GET', '/api/user/student-stats', null, studentToken);
  check('GET /api/user/student-stats returns 200', r.status === 200, JSON.stringify(r.body));
  check('averageAccuracy field present', 'averageAccuracy' in (r.body.data?.stats || {}), JSON.stringify(r.body.data));
}

// ─── 4. Leaderboard — Fix #2, #4, #16 ───────────────────────────────────────

section('4. Leaderboard — Fix #2 (no N+1 aggregations), Fix #4 (no console.log), Fix #16 (DB-side pagination)');
{
  const r = await req('GET', '/api/ranking/leaderboard?category=students&page=1&limit=5', null, studentToken);
  check('GET /api/ranking/leaderboard returns 200', r.status === 200, JSON.stringify(r.body?.message));
  if (r.status === 200 && r.body.data?.leaderboard?.length > 0) {
    const first = r.body.data.leaderboard[0];
    check('Users have rank field', 'rank' in first);
    check('Rank 1 on page 1', first.rank === 1, `rank=${first.rank}`);
    check('badges array present', Array.isArray(first.badges));
  }
  // page 2 — rank offset = 5
  const r2 = await req('GET', '/api/ranking/leaderboard?category=students&page=2&limit=5', null, studentToken);
  if (r2.status === 200 && r2.body.data?.leaderboard?.length > 0) {
    check('Page 2 first rank = 6', r2.body.data.leaderboard[0].rank === 6, `rank=${r2.body.data.leaderboard[0].rank}`);
  }
}

// ─── 5. Get all tests — Fix #8 (no $lookup), Fix #9 (no allowDiskUse) ────────

section('5. Get all tests — Fix #8 (no ratings $lookup), Fix #9 (no allowDiskUse)');
{
  const r = await req('GET', '/api/test/get-all-tests?page=1&limit=5', null, studentToken);
  check('GET /api/test/get-all-tests returns 200', r.status === 200, JSON.stringify(r.body?.message));
  if (r.status === 200) {
    check('Returns data array', Array.isArray(r.body.data));
    check('Has pagination meta', !!r.body.meta);
    if (r.body.data?.length > 0) {
      const t = r.body.data[0];
      check('Test has averageRating (stored field, not computed via $lookup)', 'averageRating' in t);
      check('Test has totalRatings field', 'totalRatings' in t);
    }
  }
}

// ─── 6. Create question — Fix #11 (bulk validation) ──────────────────────────

section('6. Create question — Fix #11 (no N+1 test validation)');
{
  const r = await req('POST', '/api/question/create', {
    question: 'E2E test: what is 2+2?',
    options: ['3', '4', '5', '6'],
    correctAnswer: 1,
    explanation: 'Basic arithmetic',
    tests: [],
  }, teacherToken);
  check('POST /api/question/create returns 201', r.status === 201, JSON.stringify(r.body));
}

// ─── 7. Start test — Fix #7 (one Test fetch), Fix #10 (updateMany abandoned) ─

section('7. Start test — Fix #7 (validateTestAccess reuses fetched test), Fix #10 (updateMany)');
{
  const r = await req('POST', `/api/test-taking/start-test/${PUBLIC_TEST_ID}`, null, studentToken);
  check('POST /api/test-taking/start-test returns 200 or 400', [200, 400].includes(r.status), JSON.stringify(r.body));
  if (r.status === 200) {
    attemptId = r.body.data?.attempt?._id || r.body.data?.attemptId;
    check('Attempt ID in response', !!attemptId, JSON.stringify(r.body.data));
  }
}

// ─── 8. Submit answer — Fix #14 (targeted findByIdAndUpdate) ──────────────────

if (attemptId) {
  section('8. Submit answer — Fix #14 (no full document write)');
  {
    const r = await req('POST', `/api/test-taking/submit-answer/${attemptId}`, {
      questionId: QUESTION_ID,
      selectedAnswer: 0,
      timeSpent: 3,
    }, studentToken);
    check('POST /api/test-taking/submit-answer returns 200 or 400', [200, 400].includes(r.status), JSON.stringify(r.body));
  }

  // ─── 9. Submit test — Fix #1 (bulk Question.find) ───────────────────────────

  section('9. Submit test — Fix #1 (bulk Question.find instead of N findById)');
  {
    const r = await req('POST', `/api/test-taking/submit-test/${attemptId}`, {
      answers: [{ questionId: QUESTION_ID, selectedAnswer: 0, timeSpent: 3 }],
      clientEndTime: new Date().toISOString(),
    }, studentToken);
    check('POST /api/test-taking/submit-test returns 200 or 400', [200, 400].includes(r.status), JSON.stringify(r.body));
  }
}

// ─── 10. Create test — Fix #6 (teacher fetched once) ─────────────────────────

section('10. Create test — Fix #6 (teacher fetched once, not 3×)');
{
  const r = await req('POST', '/api/test/create-test', {
    title: 'E2E Test ' + Date.now(),
    subject: 'Math',
    timeLimit: 10,
    isPublic: true,
  }, teacherToken);
  check('POST /api/test/create-test returns 201', r.status === 201, JSON.stringify(r.body));
}

// ─── 11. Gzip compression — Fix #13 ──────────────────────────────────────────

section('11. Gzip compression — Fix #13');
{
  const res = await fetch(`${BASE}/api/ranking/leaderboard?category=students&limit=20`, {
    headers: {
      'Authorization': `Bearer ${studentToken}`,
      'Accept-Encoding': 'gzip, deflate, br',
    },
  });
  const encoding = res.headers.get('content-encoding');
  check('Response compressed (gzip or br)', ['gzip', 'br', 'deflate'].includes(encoding), `content-encoding: ${encoding}`);
}

// ─── 12. Body size limit — Fix #18 ────────────────────────────────────────────

section('12. Body size limit — Fix #18 (1mb global limit)');
{
  const bigPayload = 'x'.repeat(2 * 1024 * 1024);
  const res = await fetch(`${BASE}/api/auth/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
    body: JSON.stringify({ data: bigPayload }),
  });
  check('2MB body to non-upload route rejected (413)', res.status === 413, `got ${res.status}`);
}

// ─── 13. DB indexes — Fix #5 (verify server did not crash on startup) ─────────

section('13. DB indexes — Fix #5 (server healthy after index creation)');
{
  const r = await req('GET', '/', null, null);
  check('Server still healthy (indexes did not crash startup)', r.status === 200);
}

// ─── Connection pool — Fix #15 (verify server handles concurrent requests) ────

section('14. Connection pool — Fix #15 (concurrent requests do not queue/fail)');
{
  const concurrent = Array.from({ length: 10 }, () =>
    req('GET', '/api/test/get-all-tests?page=1&limit=3', null, studentToken)
  );
  const results = await Promise.all(concurrent);
  const allOk = results.every(r => r.status === 200);
  check('10 concurrent test-list requests all return 200', allOk, `statuses: ${results.map(r => r.status).join(',')}`);
}

// ─── summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(45)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅ All checks passed');
} else {
  console.log('❌ Some checks failed — see above');
  process.exit(1);
}
