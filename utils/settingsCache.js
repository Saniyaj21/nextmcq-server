// File: ./utils/settingsCache.js
// In-memory settings cache with invalidate-on-write strategy
// Auto-seeds missing default settings on first startup

import AppConfig from '../models/AppConfig.js';

const cache = new Map();
let loaded = false;

// Default settings — seeded into DB if missing
const DEFAULT_SETTINGS = [
  // Rewards — Question-Based
  { key: 'rewards.question_correct.first_attempt.coins', value: 10, description: 'Coins per correct answer (first attempt)', category: 'rewards' },
  { key: 'rewards.question_correct.first_attempt.xp', value: 10, description: 'XP per correct answer (first attempt)', category: 'rewards' },
  { key: 'rewards.question_correct.repeat_attempt.coins', value: 2, description: 'Coins per correct answer (repeat attempt)', category: 'rewards' },
  { key: 'rewards.question_correct.repeat_attempt.xp', value: 2, description: 'XP per correct answer (repeat attempt)', category: 'rewards' },
  // Rewards — Speed Bonus
  { key: 'rewards.speed_bonus.coins', value: 15, description: 'Speed bonus coins (under 50% time, 90%+ accuracy)', category: 'rewards' },
  { key: 'rewards.speed_bonus.xp', value: 15, description: 'Speed bonus XP (under 50% time, 90%+ accuracy)', category: 'rewards' },
  // Rewards — Referral
  { key: 'rewards.referral.referrer.coins', value: 150, description: 'Coins awarded to referrer on successful signup', category: 'rewards' },
  { key: 'rewards.referral.referrer.xp', value: 75, description: 'XP awarded to referrer on successful signup', category: 'rewards' },
  { key: 'rewards.referral.referee.coins', value: 75, description: 'Coins awarded to referee on successful signup', category: 'rewards' },
  { key: 'rewards.referral.referee.xp', value: 40, description: 'XP awarded to referee on successful signup', category: 'rewards' },
  // Rewards — Teacher
  { key: 'rewards.teacher.create_test.coins', value: 50, description: 'Coins awarded to teacher for creating a test', category: 'rewards' },
  { key: 'rewards.teacher.create_test.xp', value: 75, description: 'XP awarded to teacher for creating a test', category: 'rewards' },
  { key: 'rewards.teacher.student_attempt.coins', value: 10, description: 'Coins awarded to teacher per student attempt', category: 'rewards' },
  { key: 'rewards.teacher.student_attempt.xp', value: 10, description: 'XP awarded to teacher per student attempt', category: 'rewards' },
  // Rewards — Monthly Rankings
  { key: 'ranking.monthly.champion.coins', value: 1000, description: 'Monthly champion coins (#1)', category: 'rewards' },
  { key: 'ranking.monthly.champion.xp', value: 500, description: 'Monthly champion XP (#1)', category: 'rewards' },
  { key: 'ranking.monthly.champion.badge', value: 'Monthly Champion', description: 'Monthly champion badge name (#1)', category: 'rewards' },
  { key: 'ranking.monthly.elite.coins', value: 500, description: 'Monthly elite coins (Top 10)', category: 'rewards' },
  { key: 'ranking.monthly.elite.xp', value: 400, description: 'Monthly elite XP (Top 10)', category: 'rewards' },
  { key: 'ranking.monthly.elite.badge', value: 'Monthly Elite', description: 'Monthly elite badge name (Top 10)', category: 'rewards' },
  { key: 'ranking.monthly.achiever.coins', value: 200, description: 'Monthly achiever coins (Top 50)', category: 'rewards' },
  { key: 'ranking.monthly.achiever.xp', value: 300, description: 'Monthly achiever XP (Top 50)', category: 'rewards' },
  { key: 'ranking.monthly.achiever.badge', value: 'Monthly Achiever', description: 'Monthly achiever badge name (Top 50)', category: 'rewards' },
  { key: 'ranking.monthly.performer.coins', value: 100, description: 'Monthly performer coins (Top 100)', category: 'rewards' },
  { key: 'ranking.monthly.performer.xp', value: 200, description: 'Monthly performer XP (Top 100)', category: 'rewards' },
  { key: 'ranking.monthly.performer.badge', value: 'Monthly Performer', description: 'Monthly performer badge name (Top 100)', category: 'rewards' },
  { key: 'ranking.monthly.unplaced.coins', value: 10, description: 'Monthly unplaced coins (101+)', category: 'rewards' },
  { key: 'ranking.monthly.unplaced.xp', value: 100, description: 'Monthly unplaced XP (101+)', category: 'rewards' },
  { key: 'ranking.monthly.unplaced.badge', value: 'Monthly Unplaced', description: 'Monthly unplaced badge name (101+)', category: 'rewards' },
  // System — Level System
  { key: 'level_system.base_xp', value: 100, description: 'Base XP required for level 2', category: 'system' },
  { key: 'level_system.xp_multiplier', value: 1.2, description: 'XP requirement multiplier per level (1.2 = 20% increase)', category: 'system' },
  // System — Ranking Score Weights
  { key: 'ranking.score.tests_weight', value: 15, description: 'Points per test completed (student ranking)', category: 'system' },
  { key: 'ranking.score.correct_answers_weight', value: 1, description: 'Points per correct answer (student ranking)', category: 'system' },
  // System — Revenue Share
  { key: 'revenue_share.teacher_share', value: 0.8, description: 'Teacher share of coin fees (0.8 = 80%)', category: 'system' },
  { key: 'revenue_share.platform_share', value: 0.2, description: 'Platform share of coin fees (0.2 = 20%)', category: 'system' },
  // Limits
  { key: 'limits.max_daily_coins', value: 1000, description: 'Maximum coins a user can earn per day', category: 'limits' },
  { key: 'limits.max_daily_xp', value: 2000, description: 'Maximum XP a user can earn per day', category: 'limits' },
  { key: 'limits.max_test_attempts_per_day', value: 50, description: 'Maximum test attempts per user per day', category: 'limits' },
  { key: 'limits.test_time.min', value: 1, description: 'Minimum test time limit (minutes)', category: 'limits' },
  { key: 'limits.test_time.max', value: 60, description: 'Maximum test time limit (minutes)', category: 'limits' },
  { key: 'limits.test_time.default', value: 30, description: 'Default test time limit (minutes)', category: 'limits' },
  { key: 'limits.max_referrals_per_day', value: 10, description: 'Maximum referral rewards per day', category: 'limits' },
];

/**
 * Seed missing default settings into AppConfig.
 * Only creates keys that don't exist — won't overwrite admin changes.
 */
async function seedDefaults() {
  const existingKeys = new Set(
    (await AppConfig.find({}, { key: 1 }).lean()).map(d => d.key)
  );

  const missing = DEFAULT_SETTINGS.filter(s => !existingKeys.has(s.key));
  if (missing.length === 0) return;

  await AppConfig.insertMany(missing);
  console.log(`[SettingsCache] Auto-seeded ${missing.length} missing settings`);
}

/**
 * Load all AppConfig documents into the in-memory cache.
 * Auto-seeds missing defaults on first call, then loads into cache.
 * Called once at server startup.
 */
export async function loadSettings() {
  try {
    await seedDefaults();
    const docs = await AppConfig.find({}).lean();
    cache.clear();
    for (const doc of docs) {
      cache.set(doc.key, doc.value);
    }
    loaded = true;
    console.log(`[SettingsCache] Loaded ${docs.length} settings into cache`);
  } catch (error) {
    console.error('[SettingsCache] Failed to load settings:', error.message);
  }
}

/**
 * Get a setting value from cache (synchronous, 0ms).
 * Falls back to defaultValue if key is not in cache.
 * @param {string} key - Dot-notation key (e.g. 'rewards.question_correct.first_attempt.coins')
 * @param {*} defaultValue - Fallback value if key not found
 * @returns {*} The cached value or defaultValue
 */
export function getSetting(key, defaultValue) {
  if (!loaded) return defaultValue;
  const val = cache.get(key);
  return val !== undefined ? val : defaultValue;
}

/**
 * Invalidate the cache and reload from DB.
 * Called after admin writes to AppConfig.
 */
export async function invalidateCache() {
  console.log('[SettingsCache] Invalidating cache...');
  await loadSettings();
}
