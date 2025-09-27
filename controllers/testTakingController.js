// File: ./controllers/testTakingController.js
// Controller for test-taking functionality

import Test from '../models/Test.js';
import TestAttempt from '../models/TestAttempt.js';
import User from '../models/User.js';
import Question from '../models/Question.js';
import { REWARDS, LEVEL_SYSTEM } from '../constants/rewards.js';
import { validateTestTime, formatTimeForLogging } from '../utils/timeValidator.js';

/**
 * Validate user access to a test
 * @param {string} userId - User ID
 * @param {string} testId - Test ID
 * @returns {boolean} - Access granted
 */
const validateTestAccess = async (userId, testId) => {
  const test = await Test.findById(testId);

  if (!test) {
    throw new Error('Test not found');
  }

  // Public tests are accessible to all
  if (test.isPublic) {
    return true;
  }

  // Check if user is in allowed users or is the creator
  const hasAccess = test.allowedUsers.some(user => user.toString() === userId) ||
                   test.createdBy.toString() === userId;

  if (!hasAccess) {
    throw new Error('Access denied to private test');
  }

  return true;
};

/**
 * Calculate test rewards
 * @param {Object} attempt - TestAttempt document
 * @param {Object} test - Test document
 * @returns {Object} - Reward breakdown
 */
const calculateTestRewards = (attempt, test) => {
  const isFirstAttempt = attempt.attemptNumber === 1;

  // Calculate question rewards (correct answers only)
  const correctAnswers = attempt.answers.filter(answer => answer.isCorrect);
  const questionRewards = {
    coins: correctAnswers.length * (isFirstAttempt ? REWARDS.QUESTION_CORRECT.FIRST_ATTEMPT.coins : REWARDS.QUESTION_CORRECT.REPEAT_ATTEMPT.coins),
    xp: correctAnswers.length * (isFirstAttempt ? REWARDS.QUESTION_CORRECT.FIRST_ATTEMPT.xp : REWARDS.QUESTION_CORRECT.REPEAT_ATTEMPT.xp)
  };

  // Calculate speed bonus
  const timeThreshold = test.timeLimit * 0.5; // 50% of time limit
  const speedBonus = attempt.timeSpent < timeThreshold
    ? REWARDS.SPEED_BONUS.UNDER_50_PERCENT_TIME
    : { coins: 0, xp: 0 };

  // Calculate completion bonus
  const completionBonus = REWARDS.TEST_COMPLETION;

  return {
    coins: questionRewards.coins + speedBonus.coins + completionBonus.coins,
    xp: questionRewards.xp + speedBonus.xp + completionBonus.xp,
    breakdown: {
      questionRewards,
      speedBonus,
      completionBonus
    }
  };
};

/**
 * Distribute rewards to teacher
 * @param {string} testId - Test ID
 * @param {Object} studentAttempt - Student attempt data
 */
const distributeTeacherRewards = async (testId, studentAttempt) => {
  try {
    const test = await Test.findById(testId).populate('createdBy');
    const teacher = test.createdBy;

    const teacherReward = REWARDS.TEACHER.STUDENT_ATTEMPT;

    await User.findByIdAndUpdate(teacher._id, {
      $inc: {
        'rewards.coins': teacherReward.coins,
        'rewards.xp': teacherReward.xp,
        'teacher.totalAttemptsOfStudents': 1
      }
    });

    console.log(`Teacher rewards distributed: userId=${teacher._id}, coins=${teacherReward.coins}, xp=${teacherReward.xp}`);
  } catch (error) {
    console.error('Error distributing teacher rewards:', error);
  }
};

/**
 * Validate time spent to prevent manipulation
 * @param {Object} attempt - TestAttempt document
 * @param {Date} clientEndTime - Client submitted end time
 * @returns {number} - Validated time spent in seconds
 */
const validateTimeSpent = (attempt, clientEndTime) => {
  const validation = validateTestTime(attempt, clientEndTime);

  if (!validation.isValid) {
    console.warn(`Time validation failed: attemptId=${attempt._id}, serverTime=${formatTimeForLogging(validation.serverTimeSpent)}, clientTime=${formatTimeForLogging(validation.clientTimeSpent)}, diff=${formatTimeForLogging(validation.timeDifference)}, tolerance=${formatTimeForLogging(validation.tolerance)}`);
  }

  return validation.validatedTimeSpent;
};

/**
 * Start a test attempt
 * POST /api/test-taking/start-test/:testId
 */
export const startTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate access
    await validateTestAccess(userId, testId);

    // Get test with questions
    const test = await Test.findById(testId).populate('questions');
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Check for existing in-progress attempt
    const existingAttempt = await TestAttempt.findOne({
      userId,
      testId,
      status: 'in_progress'
    });

    if (existingAttempt) {
      return res.status(400).json({
        success: false,
        message: 'Test already in progress',
        data: { attemptId: existingAttempt._id }
      });
    }

    // Get attempt number
    const attemptNumber = await TestAttempt.countDocuments({ userId, testId }) + 1;

    // Create new attempt
    const serverStartTime = new Date();
    const attempt = new TestAttempt({
      userId,
      testId,
      attemptNumber,
      serverStartTime,
      timeLimit: test.timeLimit,
      status: 'in_progress'
    });

    await attempt.save();

    // Prepare questions for response
    const questions = test.questions.map(question => ({
      id: question._id,
      question: question.question,
      options: question.options
    }));

    console.log(`Test started: userId=${userId}, testId=${testId}, attemptId=${attempt._id}`);

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        testId: test._id,
        questions,
        timeLimit: test.timeLimit,
        totalQuestions: questions.length,
        serverStartTime,
        attemptNumber
      },
      message: 'Test started successfully'
    });

  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start test'
    });
  }
};

/**
 * Submit individual answer (auto-save)
 * POST /api/test-taking/submit-answer/:attemptId
 */
export const submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedAnswer, timeSpent } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find attempt
    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt || attempt.userId.toString() !== userId) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Test not in progress' });
    }

    // Get question to validate answer
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Validate answer
    if (selectedAnswer < 0 || selectedAnswer > 3) {
      return res.status(400).json({ success: false, message: 'Invalid answer selection' });
    }

    // Check if answer already exists for this question
    const existingAnswerIndex = attempt.answers.findIndex(
      answer => answer.questionId.toString() === questionId
    );

    const isCorrect = question.correctAnswer === selectedAnswer;

    if (existingAnswerIndex >= 0) {
      // Update existing answer
      attempt.answers[existingAnswerIndex] = {
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpent: timeSpent || 0,
        submittedAt: new Date()
      };
    } else {
      // Add new answer
      attempt.answers.push({
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpent: timeSpent || 0,
        submittedAt: new Date()
      });
    }

    attempt.lastUpdated = new Date();
    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Answer saved successfully'
    });

  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save answer'
    });
  }
};

/**
 * Submit complete test
 * POST /api/test-taking/submit-test/:attemptId
 */
export const submitTest = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers: clientAnswers, clientEndTime } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find attempt
    const attempt = await TestAttempt.findById(attemptId)
      .populate('testId')
      .populate('answers.questionId');

    if (!attempt || attempt.userId.toString() !== userId) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Test not in progress' });
    }

    // Validate time spent
    const validatedTimeSpent = validateTimeSpent(attempt, clientEndTime);

    // Process client answers and validate with server data
    const processedAnswers = [];
    let correctCount = 0;

    for (const clientAnswer of clientAnswers) {
      const question = await Question.findById(clientAnswer.questionId);
      if (question) {
        const isCorrect = question.correctAnswer === clientAnswer.selectedAnswer;
        if (isCorrect) correctCount++;

        processedAnswers.push({
          questionId: clientAnswer.questionId,
          selectedAnswer: clientAnswer.selectedAnswer,
          isCorrect,
          timeSpent: clientAnswer.timeSpent || 0,
          submittedAt: new Date()
        });
      }
    }

    // Calculate results
    const totalQuestions = attempt.testId.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Calculate rewards
    const rewards = calculateTestRewards({ ...attempt.toObject(), answers: processedAnswers, timeSpent: validatedTimeSpent }, attempt.testId);

    // Update attempt
    attempt.answers = processedAnswers;
    attempt.score = {
      correct: correctCount,
      total: totalQuestions,
      percentage
    };
    attempt.rewards = rewards;
    attempt.timeSpent = validatedTimeSpent;
    attempt.completedAt = new Date();
    attempt.serverEndTime = new Date();
    attempt.clientTimeValidation = {
      startTime: attempt.serverStartTime,
      endTime: new Date(clientEndTime),
      timeDifference: Math.abs(validatedTimeSpent - Math.floor((new Date(clientEndTime) - attempt.serverStartTime) / 1000))
    };
    attempt.status = 'completed';

    await attempt.save();

    // Update test attempt count
    await Test.findByIdAndUpdate(attempt.testId._id, {
      $inc: { attemptsCount: 1 },
      $addToSet: { attemptedBy: userId }
    });

    // Update user statistics
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'student.totalTests': 1,
        'student.correctAnswers': correctCount,
        'student.totalQuestions': totalQuestions,
        'rewards.coins': rewards.coins,
        'rewards.xp': rewards.xp
      }
    });

    // Update user level
    const user = await User.findById(userId);
    const newLevel = LEVEL_SYSTEM.calculateLevelFromXP(user.rewards.xp + rewards.xp);
    if (newLevel > user.rewards.level) {
      await User.findByIdAndUpdate(userId, {
        $set: { 'rewards.level': newLevel }
      });
    }

    // Distribute teacher rewards
    await distributeTeacherRewards(attempt.testId._id, attempt);

    console.log(`Test completed: attemptId=${attemptId}, score=${correctCount}/${totalQuestions}, timeSpent=${validatedTimeSpent}s, rewards=${rewards.coins}c ${rewards.xp}xp`);

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        score: attempt.score,
        timeSpent: attempt.timeSpent,
        rewards: attempt.rewards,
        speedBonusEarned: rewards.breakdown.speedBonus.coins > 0,
        completedAt: attempt.completedAt
      },
      message: 'Test submitted successfully'
    });

  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit test'
    });
  }
};

/**
 * Get test results
 * GET /api/test-taking/test-results/:attemptId
 */
export const getTestResults = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find attempt with populated data
    const attempt = await TestAttempt.findById(attemptId)
      .populate('testId', 'title subject chapter createdBy')
      .populate('testId.createdBy', 'name email profileImage')
      .populate('answers.questionId', 'question options correctAnswer explanation');

    if (!attempt || attempt.userId.toString() !== userId) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Test not completed' });
    }

    // Format questions with user answers
    const questions = attempt.answers.map(answer => ({
      id: answer.questionId._id,
      question: answer.questionId.question,
      options: answer.questionId.options,
      correctAnswer: answer.questionId.correctAnswer,
      userAnswer: answer.selectedAnswer,
      isCorrect: answer.isCorrect,
      explanation: answer.questionId.explanation,
      timeSpent: answer.timeSpent
    }));

    res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt._id,
          testId: attempt.testId._id,
          score: attempt.score,
          timeSpent: attempt.timeSpent,
          completedAt: attempt.completedAt,
          rewards: attempt.rewards
        },
        questions,
        test: {
          title: attempt.testId.title,
          subject: attempt.testId.subject,
          chapter: attempt.testId.chapter,
          createdBy: attempt.testId.createdBy
        }
      },
      message: 'Test results retrieved successfully'
    });

  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get test results'
    });
  }
};

/**
 * Get test details for test-taking
 * GET /api/test-taking/get-test-details/:testId
 */
export const getTestDetails = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find test by ID
    const test = await Test.findById(testId)
      .populate('createdBy', 'name email profileImage');

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Check access permissions and request status
    let hasAccess = true;
    let hasPendingRequest = false;

    if (!test.isPublic) {
      // For private tests, only allowed users or the creator can access
      hasAccess = test.allowedUsers.some(user => user._id.toString() === userId) ||
                  test.createdBy._id.toString() === userId;

      // Check if user has a pending request
      if (!hasAccess) {
        hasPendingRequest = test.pendingRequests.some(user => user.toString() === userId);
      }
    }

    // Return test data formatted for test-taking
    const testData = {
      _id: test._id,
      title: test.title,
      description: test.description,
      subject: test.subject,
      chapter: test.chapter,
      timeLimit: test.timeLimit,
      isPublic: test.isPublic,
      questionsCount: test.questions.length, // Get count without populating
      createdBy: test.createdBy,
      createdAt: test.createdAt,
      hasAccess: hasAccess,
      hasPendingRequest: hasPendingRequest,
      rewards: {
        perQuestion: {
          firstAttempt: REWARDS.QUESTION_CORRECT.FIRST_ATTEMPT,
          repeatAttempt: REWARDS.QUESTION_CORRECT.REPEAT_ATTEMPT
        },
        speedBonus: {
          under50PercentTime: REWARDS.SPEED_BONUS.UNDER_50_PERCENT_TIME,
          thresholdMinutes: Math.floor(test.timeLimit * 0.5) // 50% of time limit in minutes
        }
      }
    };

    res.status(200).json({
      success: true,
      data: testData,
      message: 'Test details retrieved successfully'
    });

  } catch (error) {
    console.error('Get test details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get test details' });
  }
};

/**
 * Get user attempts for a test
 * GET /api/test-taking/user-attempts/:testId
 */
export const getUserAttempts = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate access to test
    await validateTestAccess(userId, testId);

    // Get all attempts for this user and test
    const attempts = await TestAttempt.find({
      userId,
      testId,
      status: 'completed'
    })
    .select('attemptNumber score timeSpent completedAt rewards')
    .sort({ completedAt: -1 });

    // Calculate statistics
    const totalAttempts = attempts.length;
    const bestScore = totalAttempts > 0 ? Math.max(...attempts.map(a => a.score.percentage)) : 0;
    const averageScore = totalAttempts > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.score.percentage, 0) / totalAttempts)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        attempts: attempts.map(attempt => ({
          id: attempt._id,
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          timeSpent: attempt.timeSpent,
          completedAt: attempt.completedAt,
          rewards: attempt.rewards
        })),
        totalAttempts,
        bestScore,
        averageScore
      },
      message: 'User attempts retrieved successfully'
    });

  } catch (error) {
    console.error('Get user attempts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user attempts'
    });
  }
};