// Script to create 50 tests with dummy questions
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nextmcq');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample subjects and chapters
const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'History', 'Geography',
  'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Social Studies'
];

const CHAPTERS = {
  'Mathematics': ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'],
  'Science': ['Physics Basics', 'Chemistry Fundamentals', 'Biology Concepts', 'Earth Science'],
  'English': ['Grammar', 'Literature', 'Composition', 'Vocabulary'],
  'History': ['World History', 'Indian History', 'Ancient Civilizations', 'Modern Era'],
  'Geography': ['Physical Geography', 'Human Geography', 'Countries & Capitals', 'Climate'],
  'Computer Science': ['Programming', 'Data Structures', 'Algorithms', 'Web Development'],
  'Physics': ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics'],
  'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry'],
  'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Anatomy'],
  'Social Studies': ['Civics', 'Economics', 'Sociology', 'Political Science']
};

// Generate dummy questions for a test
const generateDummyQuestions = (subject, chapter, numQuestions, creatorId) => {
  const questions = [];
  
  const questionTemplates = [
    {
      question: `What is a key concept in ${chapter}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 1
    },
    {
      question: `Which principle is fundamental to ${subject}?`,
      options: ['First Principle', 'Second Principle', 'Third Principle', 'Fourth Principle'],
      correctAnswer: 0
    },
    {
      question: `In ${subject}, what does the term "concept" refer to?`,
      options: ['Basic idea', 'Complex theory', 'Practical application', 'Historical context'],
      correctAnswer: 0
    },
    {
      question: `What is the main focus of ${chapter} in ${subject}?`,
      options: ['Theoretical knowledge', 'Practical skills', 'Historical development', 'Future applications'],
      correctAnswer: 1
    },
    {
      question: `Which of the following is NOT related to ${subject}?`,
      options: ['Relevant Topic A', 'Relevant Topic B', 'Unrelated Topic', 'Relevant Topic C'],
      correctAnswer: 2
    },
    {
      question: `How does ${chapter} relate to ${subject}?`,
      options: ['As a core component', 'As an optional topic', 'As a historical reference', 'As a future trend'],
      correctAnswer: 0
    },
    {
      question: `What is the significance of studying ${chapter}?`,
      options: ['To understand fundamentals', 'To pass exams', 'For general knowledge', 'All of the above'],
      correctAnswer: 3
    },
    {
      question: `Which method is commonly used in ${subject}?`,
      options: ['Method A', 'Method B', 'Method C', 'All methods'],
      correctAnswer: 3
    },
    {
      question: `What problem does ${chapter} solve?`,
      options: ['Problem A', 'Problem B', 'Problem C', 'Problem D'],
      correctAnswer: 1
    },
    {
      question: `In the context of ${subject}, what is essential?`,
      options: ['Understanding basics', 'Memorizing facts', 'Practical experience', 'All of the above'],
      correctAnswer: 3
    }
  ];

  for (let i = 0; i < numQuestions; i++) {
    const template = questionTemplates[i % questionTemplates.length];
    questions.push({
      question: `${template.question} (Question ${i + 1})`,
      options: template.options.map((opt, idx) => `${opt} - Test ${i + 1}`),
      correctAnswer: template.correctAnswer,
      explanation: `This question is related to ${chapter} in ${subject}. The correct answer provides fundamental understanding of the topic.`,
      createdBy: creatorId
    });
  }

  return questions;
};

// Generate a test with questions
const createTestWithQuestions = async (testNumber, creatorId) => {
  try {
    // Select random subject and chapter
    const subject = SUBJECTS[testNumber % SUBJECTS.length];
    const chapters = CHAPTERS[subject] || ['Chapter 1', 'Chapter 2', 'Chapter 3'];
    const chapter = chapters[testNumber % chapters.length];
    
    // Generate random number of questions (5-15 per test)
    const numQuestions = 5 + (testNumber % 11);
    
    // Generate dummy questions
    const questionData = generateDummyQuestions(subject, chapter, numQuestions, creatorId);
    
    // Create questions in database
    const createdQuestions = [];
    for (const qData of questionData) {
      const question = new Question(qData);
      await question.save();
      createdQuestions.push(question._id);
    }

    // Create test
    const test = new Test({
      title: `Test ${testNumber + 1}: ${subject} - ${chapter}`,
      description: `This is a sample test about ${chapter} in ${subject}. It contains ${numQuestions} questions to test your knowledge.`,
      subject: subject,
      chapter: chapter,
      timeLimit: 10 + (testNumber % 20), // Random time limit between 10-29 minutes
      isPublic: true, // Make all tests public for easy access
      questions: createdQuestions,
      createdBy: creatorId,
      attemptsCount: 0
    });

    await test.save();
    
    // Update question tests array to link back to test
    for (const questionId of createdQuestions) {
      await Question.findByIdAndUpdate(questionId, {
        $addToSet: { tests: test._id }
      });
    }

    return { test, questionCount: numQuestions };
  } catch (error) {
    console.error(`Error creating test ${testNumber + 1}:`, error.message);
    throw error;
  }
};

// Main function
const createTests = async () => {
  try {
    await connectDB();

    // Find or create a teacher user
    let creator = await User.findOne({ role: 'teacher' });
    if (!creator) {
      // If no teacher exists, create one or use first user
      creator = await User.findOne();
      if (!creator) {
        creator = new User({
          name: 'Test Teacher',
          email: `teacher${Date.now()}@test.com`,
          role: 'teacher',
          isEmailVerified: true
        });
        await creator.save();
        console.log('✅ Created new teacher user');
      } else {
        console.log(`✅ Using existing user: ${creator.email}`);
      }
    } else {
      console.log(`✅ Using existing teacher: ${creator.email}`);
    }

    console.log(`\n🚀 Starting to create 50 tests...\n`);

    const results = [];
    for (let i = 0; i < 50; i++) {
      const result = await createTestWithQuestions(i, creator._id);
      results.push(result);
      console.log(`✅ Created Test ${i + 1}/50: "${result.test.title}" (${result.questionCount} questions)`);
    }

    console.log(`\n✨ Successfully created 50 tests!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total tests: ${results.length}`);
    console.log(`   - Total questions: ${results.reduce((sum, r) => sum + r.questionCount, 0)}`);
    console.log(`   - Creator: ${creator.name} (${creator.email})`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tests:', error);
    process.exit(1);
  }
};

// Run the script
createTests().catch(console.error);

