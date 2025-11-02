import Question from '../models/Question.js';
import Test from '../models/Test.js';

/**
 * Get all questions created by the authenticated user
 */
export const getQuestions = async (req, res) => {
  try {
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get questions created by the authenticated user
    const questions = await Question.find({ createdBy: userId })
      .populate('createdBy', 'name email')
      .populate('tests', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get questions' });
  }
};

/**
 * Create a new question
 */
export const createQuestion = async (req, res) => {
  try {
    const { question, options, correctAnswer, explanation, tests } = req.body;
    const createdBy = req?.userId;

    if (!createdBy) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate required fields
    if (!question || !options || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Question, options, and correctAnswer are required'
      });
    }

    // Validate options array
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Exactly 4 options are required'
      });
    }

    // Validate correct answer
    if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer > 3) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must be a number between 0 and 3'
      });
    }

    // Validate tests array if provided
    let validTests = [];
    if (tests && Array.isArray(tests)) {
      // Verify that all test IDs exist and belong to the user
      for (const testId of tests) {
        const test = await Test.findOne({ _id: testId, createdBy });
        if (!test) {
          return res.status(400).json({
            success: false,
            message: `Test with ID ${testId} not found or access denied`
          });
        }
        validTests.push(testId);
      }
    }

    // Create the question
    const newQuestion = await Question.create({
      question,
      options,
      correctAnswer,
      explanation,
      tests: validTests,
      createdBy
    });

    // Update the tests to include this question
    if (validTests.length > 0) {
      await Test.updateMany(
        { _id: { $in: validTests } },
        { $push: { questions: newQuestion._id } }
      );
    }

    // Populate the response
    const populatedQuestion = await Question.findById(newQuestion._id)
      .populate('createdBy', 'name email')
      .populate('tests', 'title');

    res.status(201).json({
      success: true,
      data: populatedQuestion,
      message: 'Question created successfully'
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ success: false, message: 'Failed to create question' });
  }
};

/**
 * Get a single question by ID
 */
export const getQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const question = await Question.findOne({ _id: questionId, createdBy: userId })
      .populate('createdBy', 'name email')
      .populate('tests', 'title');

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found or access denied' });
    }

    res.status(200).json({ success: true, data: question });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ success: false, message: 'Failed to get question' });
  }
};

/**
 * Update a question
 */
export const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { question, options, correctAnswer, explanation, tests } = req.body;
    const userId = req?.userId;

    console.log('🔄 Update question request received:', {
      questionId,
      userId,
      requestData: {
        question: question?.substring(0, 50) + (question?.length > 50 ? '...' : ''),
        options: options?.map(opt => opt?.substring(0, 20) + (opt?.length > 20 ? '...' : '')),
        correctAnswer,
        explanation: explanation?.substring(0, 30) + (explanation?.length > 30 ? '...' : ''),
        tests: tests
      }
    });

    if (!userId) {
      console.log('❌ Update question failed: User not authenticated');
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find question and verify ownership
    const existingQuestion = await Question.findOne({ _id: questionId, createdBy: userId });
    if (!existingQuestion) {
      console.log('❌ Update question failed: Question not found or access denied', { questionId, userId });
      return res.status(404).json({ success: false, message: 'Question not found or access denied' });
    }

    console.log('✅ Found existing question:', {
      questionId: existingQuestion._id,
      currentQuestion: existingQuestion.question?.substring(0, 50) + '...',
      currentTests: existingQuestion.tests?.length || 0
    });

    // Validate options array if provided
    if (options && (!Array.isArray(options) || options.length !== 4)) {
      return res.status(400).json({
        success: false,
        message: 'Exactly 4 options are required'
      });
    }

    // Validate correct answer if provided
    if (correctAnswer !== undefined && (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer > 3)) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must be a number between 0 and 3'
      });
    }

    // Validate tests array if provided
    let validTests = [];
    if (tests && Array.isArray(tests)) {
      for (const testId of tests) {
        const test = await Test.findOne({ _id: testId, createdBy: userId });
        if (!test) {
          return res.status(400).json({
            success: false,
            message: `Test with ID ${testId} not found or access denied`
          });
        }
        validTests.push(testId);
      }
    }

    // Get previous tests to remove question from them if needed
    const previousTests = existingQuestion.tests || [];

    // Update the question
    console.log('💾 Updating question in database:', {
      questionId,
      updateData: {
        question: question?.substring(0, 50) + '...',
        optionsCount: options?.length,
        correctAnswer,
        explanation: explanation ? 'provided' : 'none',
        testsCount: validTests.length
      }
    });

    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      {
        question,
        options,
        correctAnswer,
        explanation,
        tests: validTests
      },
      { new: true }
    ).populate('createdBy', 'name email')
     .populate('tests', 'title');

    console.log('✅ Question updated successfully:', {
      questionId: updatedQuestion._id,
      updatedQuestion: updatedQuestion.question?.substring(0, 50) + '...',
      testsCount: updatedQuestion.tests?.length || 0
    });

    // Update test relationships
    // Convert previousTests ObjectIds to strings for proper comparison
    const previousTestIds = previousTests.map(testId => testId.toString());
    const newTests = validTests; // Already strings
    
    const testsToAdd = newTests.filter(testId => !previousTestIds.includes(testId));
    const testsToRemove = previousTestIds.filter(testId => !newTests.includes(testId));

    console.log('🔗 Updating test relationships:', {
      previousTests: previousTests.length,
      previousTestIds,
      newTests: newTests.length,
      newTestIds: newTests,
      testsToAdd: testsToAdd.length,
      testsToAddIds: testsToAdd,
      testsToRemove: testsToRemove.length,
      testsToRemoveIds: testsToRemove
    });

    // Add question to new tests
    if (testsToAdd.length > 0) {
      console.log('➕ Adding question to new tests:', testsToAdd);
      await Test.updateMany(
        { _id: { $in: testsToAdd } },
        { $addToSet: { questions: questionId } }
      );
    }

    // Remove question from old tests
    if (testsToRemove.length > 0) {
      console.log('➖ Removing question from old tests:', testsToRemove);
      await Test.updateMany(
        { _id: { $in: testsToRemove } },
        { $pull: { questions: questionId } }
      );
    }

    console.log('🎉 Question update completed successfully');
    res.status(200).json({
      success: true,
      data: updatedQuestion,
      message: 'Question updated successfully'
    });
  } catch (error) {
    console.error('❌ Update question error:', error);
    res.status(500).json({ success: false, message: 'Failed to update question' });
  }
};

/**
 * Delete a question
 */
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find question and verify ownership
    const question = await Question.findOne({ _id: questionId, createdBy: userId });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found or access denied' });
    }

    // Remove question from all associated tests
    if (question.tests && question.tests.length > 0) {
      await Test.updateMany(
        { _id: { $in: question.tests } },
        { $pull: { questions: questionId } }
      );
    }

    // Delete the question
    await Question.findByIdAndDelete(questionId);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
      data: { deletedQuestionId: questionId }
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
};
