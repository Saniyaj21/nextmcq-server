import Test from '../models/Test.js';

export const getTests = async (req, res) => {
  try {
    const tests = await Test.find({ isPublic: true });
    res.status(200).json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get tests' });
  }
};

export const createTest = async (req, res) => {
  try {
    const { title, description, subject, chapter, difficulty, timeLimit, isPublic } = req.body;
    const test = await Test.create({ title, description, subject, chapter, difficulty, timeLimit, isPublic });
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    //console.log(error);
    res.status(500).json({ success: false, message: 'Failed to create test' });
  }
};