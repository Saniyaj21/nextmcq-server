import Test from '../models/Test.js';

export const getTests = async (req, res) => {
  try {
    const userId = req?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get tests created by the authenticated user
    const tests = await Test.find({ createdBy: userId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, data: tests });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tests' });
  }
};

export const createTest = async (req, res) => {
  try {
    const { title, description, subject, chapter, difficulty, timeLimit, isPublic } = req.body;
    const createdBy = req?.userId; // Get user ID from request.
    
    if (!createdBy) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const test = await Test.create({ 
      title, 
      description, 
      subject, 
      chapter, 
      difficulty, 
      timeLimit, 
      isPublic, 
      createdBy 
    });
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    //console.log(error);
    res.status(500).json({ success: false, message: 'Failed to create test' });
  }
};

export const updateTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { title, description, subject, chapter, difficulty, timeLimit, isPublic } = req.body;
    const userId = req?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    // Find test and verify ownership
    const test = await Test.findOne({ _id: testId, createdBy: userId });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found or access denied' });
    }
    
    // Update test
    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      { 
        title, 
        description, 
        subject, 
        chapter, 
        difficulty, 
        timeLimit, 
        isPublic 
      },
      { new: true }
    );
    
    res.status(200).json({ success: true, data: updatedTest });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ success: false, message: 'Failed to update test' });
  }
};