import Battle from '../models/Battle.js';
import Question from '../models/Question.js';
import Test from '../models/Test.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import { REWARDS } from '../constants/rewards.js';
import { getSetting } from '../utils/settingsCache.js';

// Generate a random 6-character battle code
const generateBattleCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Check and handle expired battle
const checkAndExpireBattle = async (battle) => {
  if (battle.status === 'completed' || battle.status === 'expired') return battle;
  if (Date.now() <= new Date(battle.expiresAt).getTime()) return battle;

  if (battle.status === 'waiting') {
    battle.status = 'expired';
    battle.completedAt = new Date();
    await battle.save();
    return battle;
  }

  if (battle.status === 'in_progress') {
    // Timeout — compare scores
    const creatorScore = battle.creatorState.score;
    const opponentScore = battle.opponentState.score;

    battle.status = 'completed';
    battle.winReason = 'timeout';
    battle.completedAt = new Date();

    if (creatorScore > opponentScore) {
      battle.winner = battle.creator;
    } else if (opponentScore > creatorScore) {
      battle.winner = battle.opponent;
    } else {
      battle.isDraw = true;
    }

    await distributeBattleRewards(battle);
    await battle.save();
    return battle;
  }

  return battle;
};

// Distribute rewards to winner/loser
const distributeBattleRewards = async (battle) => {
  const winnerCoins = getSetting('rewards.battle.winner.coins', REWARDS.BATTLE.WINNER.coins);
  const winnerXp = getSetting('rewards.battle.winner.xp', REWARDS.BATTLE.WINNER.xp);
  const loserCoins = getSetting('rewards.battle.loser.coins', REWARDS.BATTLE.LOSER.coins);
  const loserXp = getSetting('rewards.battle.loser.xp', REWARDS.BATTLE.LOSER.xp);
  const drawCoins = getSetting('rewards.battle.draw.coins', REWARDS.BATTLE.DRAW.coins);
  const drawXp = getSetting('rewards.battle.draw.xp', REWARDS.BATTLE.DRAW.xp);

  if (battle.isDraw) {
    battle.rewards = {
      winner: { coins: drawCoins, xp: drawXp },
      loser: { coins: drawCoins, xp: drawXp }
    };

    const [creator, opponent] = await Promise.all([
      User.findById(battle.creator),
      User.findById(battle.opponent)
    ]);
    if (creator) await creator.addRewards(drawCoins, drawXp, 'battle_draw');
    if (opponent) await opponent.addRewards(drawCoins, drawXp, 'battle_draw');
  } else if (battle.winner) {
    battle.rewards = {
      winner: { coins: winnerCoins, xp: winnerXp },
      loser: { coins: loserCoins, xp: loserXp }
    };

    const winnerId = battle.winner.toString();
    const loserId = battle.creator.toString() === winnerId
      ? battle.opponent.toString()
      : battle.creator.toString();

    const [winner, loser] = await Promise.all([
      User.findById(winnerId),
      User.findById(loserId)
    ]);
    if (winner) await winner.addRewards(winnerCoins, winnerXp, 'battle_win');
    if (loser) await loser.addRewards(loserCoins, loserXp, 'battle_loss');
  }
};

// Check win conditions after an answer submission
const checkWinConditions = async (battle, playerId) => {
  const isCreator = battle.creator.toString() === playerId;
  const playerState = isCreator ? battle.creatorState : battle.opponentState;
  const otherState = isCreator ? battle.opponentState : battle.creatorState;

  // Check: did this player reach target score?
  if (playerState.score >= battle.targetScore) {
    battle.status = 'completed';
    battle.winner = isCreator ? battle.creator : battle.opponent;
    battle.winReason = 'target_reached';
    battle.completedAt = new Date();
    playerState.isFinished = true;
    playerState.finishedAt = new Date();
    await distributeBattleRewards(battle);
    return true;
  }

  // Check: has this player answered all questions? → end battle immediately
  if (playerState.currentQuestionIndex >= battle.maxQuestions) {
    playerState.isFinished = true;
    playerState.finishedAt = new Date();

    battle.status = 'completed';
    battle.winReason = 'all_answered';
    battle.completedAt = new Date();

    if (playerState.score > otherState.score) {
      battle.winner = isCreator ? battle.creator : battle.opponent;
    } else if (otherState.score > playerState.score) {
      battle.winner = isCreator ? battle.opponent : battle.creator;
    } else {
      battle.isDraw = true;
    }
    await distributeBattleRewards(battle);
    return true;
  }

  return false;
};

// ==========================================
// CONTROLLER METHODS
// ==========================================

// GET /api/battle/subjects
export const getSubjects = async (req, res) => {
  try {
    // Intersect: only return subjects that are both active in Subject collection AND have playable tests
    const [activeSubjects, testSubjects] = await Promise.all([
      Subject.find({ isActive: true }).select('name').lean(),
      Test.distinct('subject', {
        isPublic: true,
        questions: { $exists: true, $not: { $size: 0 } }
      }),
    ]);

    const activeNames = new Set(activeSubjects.map(s => s.name));
    const subjects = testSubjects.filter(s => s && activeNames.has(s)).sort();

    res.status(200).json({
      success: true,
      data: { subjects }
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
};

// POST /api/battle/create
export const createBattle = async (req, res) => {
  try {
    const userId = req.userId;
    const { subject, maxQuestions = 10, targetScore = 20, correctMarks = 2, wrongMarks = 1 } = req.body;

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    if (maxQuestions < 5 || maxQuestions > 50) {
      return res.status(400).json({ success: false, message: 'Max questions must be between 5 and 50' });
    }
    if (targetScore < 1) {
      return res.status(400).json({ success: false, message: 'Target score must be at least 1' });
    }
    const maxPossibleScore = maxQuestions * correctMarks;
    if (targetScore > maxPossibleScore) {
      return res.status(400).json({
        success: false,
        message: `Target score cannot exceed max possible score (${maxQuestions} questions × ${correctMarks} marks = ${maxPossibleScore})`
      });
    }

    // Find questions for the subject
    const tests = await Test.find({ subject }).select('_id');
    const testIds = tests.map(t => t._id);

    if (testIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No tests found for this subject' });
    }

    const questions = await Question.aggregate([
      { $match: { tests: { $in: testIds } } },
      { $sample: { size: maxQuestions } },
      { $project: { question: 1, options: 1, correctAnswer: 1 } }
    ]);

    if (questions.length < maxQuestions) {
      return res.status(400).json({
        success: false,
        message: `Only ${questions.length} questions available for this subject. Please choose ${questions.length} or fewer.`,
        data: { availableQuestions: questions.length }
      });
    }

    // Generate unique battle code
    let battleCode;
    let codeExists = true;
    let attempts = 0;
    while (codeExists && attempts < 10) {
      battleCode = generateBattleCode();
      codeExists = await Battle.findOne({ battleCode, status: { $in: ['waiting', 'in_progress'] } });
      attempts++;
    }

    if (codeExists) {
      return res.status(500).json({ success: false, message: 'Failed to generate battle code. Please try again.' });
    }

    const battle = await Battle.create({
      battleCode,
      creator: userId,
      subject,
      maxQuestions: questions.length,
      targetScore,
      correctMarks,
      wrongMarks,
      questions: questions.map(q => ({
        questionId: q._id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer
      })),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes to join
    });

    res.status(201).json({
      success: true,
      data: {
        battleId: battle._id,
        battleCode: battle.battleCode,
        subject: battle.subject,
        maxQuestions: battle.maxQuestions,
        targetScore: battle.targetScore,
        correctMarks: battle.correctMarks,
        wrongMarks: battle.wrongMarks,
        status: battle.status,
        expiresAt: battle.expiresAt
      }
    });
  } catch (error) {
    console.error('Create battle error:', error);
    res.status(500).json({ success: false, message: 'Failed to create battle' });
  }
};

// POST /api/battle/join
export const joinBattle = async (req, res) => {
  try {
    const userId = req.userId;
    const { battleCode } = req.body;

    if (!battleCode) {
      return res.status(400).json({ success: false, message: 'Battle code is required' });
    }

    const battle = await Battle.findOne({ battleCode: battleCode.toUpperCase() });

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found. Check the code and try again.' });
    }

    // Check expiration
    if (Date.now() > new Date(battle.expiresAt).getTime()) {
      if (battle.status === 'waiting') {
        battle.status = 'expired';
        await battle.save();
      }
      return res.status(400).json({ success: false, message: 'This battle has expired.' });
    }

    if (battle.status !== 'waiting') {
      return res.status(400).json({ success: false, message: 'This battle is no longer available.' });
    }

    if (battle.creator.toString() === userId) {
      return res.status(400).json({ success: false, message: 'You cannot join your own battle.' });
    }

    // Join the battle
    battle.opponent = userId;
    battle.status = 'in_progress';
    battle.startedAt = new Date();
    battle.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes to complete

    await battle.save();

    // Populate names for response
    await battle.populate([
      { path: 'creator', select: 'name profileImage' },
      { path: 'opponent', select: 'name profileImage' }
    ]);

    res.status(200).json({
      success: true,
      data: {
        battleId: battle._id,
        battleCode: battle.battleCode,
        subject: battle.subject,
        maxQuestions: battle.maxQuestions,
        targetScore: battle.targetScore,
        correctMarks: battle.correctMarks,
        wrongMarks: battle.wrongMarks,
        status: battle.status,
        creator: { _id: battle.creator._id, name: battle.creator.name, profileImage: battle.creator.profileImage },
        opponent: { _id: battle.opponent._id, name: battle.opponent.name, profileImage: battle.opponent.profileImage },
        questions: battle.questions.map(q => ({
          questionId: q.questionId,
          question: q.question,
          options: q.options
          // correctAnswer NOT sent
        })),
        creatorState: { score: 0, currentQuestionIndex: 0 },
        opponentState: { score: 0, currentQuestionIndex: 0 }
      }
    });
  } catch (error) {
    console.error('Join battle error:', error);
    res.status(500).json({ success: false, message: 'Failed to join battle' });
  }
};

// GET /api/battle/:battleId
export const getBattle = async (req, res) => {
  try {
    const userId = req.userId;
    const { battleId } = req.params;

    const battle = await Battle.findById(battleId)
      .populate('creator', 'name profileImage')
      .populate('opponent', 'name profileImage')
      .populate('winner', 'name');

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    // Check if user is a participant
    const isCreator = battle.creator._id.toString() === userId;
    const isOpponent = battle.opponent && battle.opponent._id.toString() === userId;
    if (!isCreator && !isOpponent) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    await checkAndExpireBattle(battle);

    // Build questions without correctAnswer (unless battle is completed)
    const isCompleted = battle.status === 'completed';
    const questions = battle.questions.map(q => {
      const base = { questionId: q.questionId, question: q.question, options: q.options };
      if (isCompleted) base.correctAnswer = q.correctAnswer;
      return base;
    });

    res.status(200).json({
      success: true,
      data: {
        battleId: battle._id,
        battleCode: battle.battleCode,
        subject: battle.subject,
        maxQuestions: battle.maxQuestions,
        targetScore: battle.targetScore,
        correctMarks: battle.correctMarks,
        wrongMarks: battle.wrongMarks,
        status: battle.status,
        creator: battle.creator ? { _id: battle.creator._id, name: battle.creator.name, profileImage: battle.creator.profileImage } : null,
        opponent: battle.opponent ? { _id: battle.opponent._id, name: battle.opponent.name, profileImage: battle.opponent.profileImage } : null,
        creatorState: {
          score: battle.creatorState.score,
          currentQuestionIndex: battle.creatorState.currentQuestionIndex,
          isFinished: battle.creatorState.isFinished,
          ...(isCompleted && { answers: battle.creatorState.answers })
        },
        opponentState: {
          score: battle.opponentState.score,
          currentQuestionIndex: battle.opponentState.currentQuestionIndex,
          isFinished: battle.opponentState.isFinished,
          ...(isCompleted && { answers: battle.opponentState.answers })
        },
        questions,
        winner: battle.winner ? { _id: battle.winner._id, name: battle.winner.name } : null,
        winReason: battle.winReason,
        isDraw: battle.isDraw,
        rewards: battle.rewards,
        startedAt: battle.startedAt,
        completedAt: battle.completedAt,
        expiresAt: battle.expiresAt
      }
    });
  } catch (error) {
    console.error('Get battle error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch battle' });
  }
};

// POST /api/battle/:battleId/answer
export const submitAnswer = async (req, res) => {
  try {
    const userId = req.userId;
    const { battleId } = req.params;
    const { questionIndex, selectedAnswer } = req.body;

    const battle = await Battle.findById(battleId);

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    // Check expiration first
    await checkAndExpireBattle(battle);

    if (battle.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: battle.status === 'completed' ? 'This battle has already ended.' : 'This battle is not active.',
        data: { battleStatus: battle.status }
      });
    }

    const isCreator = battle.creator.toString() === userId;
    const isOpponent = battle.opponent && battle.opponent.toString() === userId;

    if (!isCreator && !isOpponent) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    const playerState = isCreator ? battle.creatorState : battle.opponentState;

    // Validate sequential answering
    if (questionIndex !== playerState.currentQuestionIndex) {
      return res.status(400).json({
        success: false,
        message: `Expected question index ${playerState.currentQuestionIndex}, got ${questionIndex}`
      });
    }

    if (playerState.isFinished) {
      return res.status(400).json({ success: false, message: 'You have already finished this battle.' });
    }

    if (questionIndex >= battle.questions.length) {
      return res.status(400).json({ success: false, message: 'No more questions available.' });
    }

    // Validate selectedAnswer
    const question = battle.questions[questionIndex];
    if (selectedAnswer < 0 || selectedAnswer >= question.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid answer selection.' });
    }

    // Calculate points
    const isCorrect = selectedAnswer === question.correctAnswer;
    const pointsEarned = isCorrect ? battle.correctMarks : -battle.wrongMarks;

    // Update player state
    playerState.score += pointsEarned;
    playerState.currentQuestionIndex += 1;
    playerState.answers.push({
      questionIndex,
      selectedAnswer,
      isCorrect,
      pointsEarned,
      answeredAt: new Date()
    });

    // Check win conditions
    const battleEnded = await checkWinConditions(battle, userId);

    await battle.save();

    const otherState = isCreator ? battle.opponentState : battle.creatorState;

    res.status(200).json({
      success: true,
      data: {
        isCorrect,
        correctAnswer: question.correctAnswer,
        pointsEarned,
        yourScore: playerState.score,
        opponentScore: otherState.score,
        yourQuestionIndex: playerState.currentQuestionIndex,
        opponentQuestionIndex: otherState.currentQuestionIndex,
        battleStatus: battle.status,
        winner: battle.winner ? battle.winner.toString() : null,
        winReason: battle.winReason,
        isDraw: battle.isDraw
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit answer' });
  }
};

// GET /api/battle/:battleId/state
export const getBattleState = async (req, res) => {
  try {
    const userId = req.userId;
    const { battleId } = req.params;

    const battle = await Battle.findById(battleId);

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    const isCreator = battle.creator.toString() === userId;
    const isOpponent = battle.opponent && battle.opponent.toString() === userId;

    if (!isCreator && !isOpponent) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    await checkAndExpireBattle(battle);

    res.status(200).json({
      success: true,
      data: {
        status: battle.status,
        creatorState: {
          score: battle.creatorState.score,
          currentQuestionIndex: battle.creatorState.currentQuestionIndex,
          isFinished: battle.creatorState.isFinished
        },
        opponentState: {
          score: battle.opponentState.score,
          currentQuestionIndex: battle.opponentState.currentQuestionIndex,
          isFinished: battle.opponentState.isFinished
        },
        winner: battle.winner ? battle.winner.toString() : null,
        winReason: battle.winReason,
        isDraw: battle.isDraw
      }
    });
  } catch (error) {
    console.error('Get battle state error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch battle state' });
  }
};

// POST /api/battle/:battleId/forfeit
export const forfeitBattle = async (req, res) => {
  try {
    const userId = req.userId;
    const { battleId } = req.params;

    const battle = await Battle.findById(battleId);

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    if (battle.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Battle is not in progress.' });
    }

    const isCreator = battle.creator.toString() === userId;
    const isOpponent = battle.opponent && battle.opponent.toString() === userId;

    if (!isCreator && !isOpponent) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    // The other player wins
    battle.status = 'completed';
    battle.winner = isCreator ? battle.opponent : battle.creator;
    battle.winReason = 'opponent_quit';
    battle.completedAt = new Date();

    await distributeBattleRewards(battle);
    await battle.save();

    res.status(200).json({
      success: true,
      data: {
        battleStatus: battle.status,
        winner: battle.winner.toString(),
        winReason: battle.winReason
      }
    });
  } catch (error) {
    console.error('Forfeit battle error:', error);
    res.status(500).json({ success: false, message: 'Failed to forfeit battle' });
  }
};
