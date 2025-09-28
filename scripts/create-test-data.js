// Script to create test data for testing the take-test flow
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nextmcq');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createSingleQuestionTest = async () => {
  try {
    console.log('Creating single question test for quick testing...');

    // Find an existing user to be the test creator (create one if none exists)
    let creator = await User.findOne();
    if (!creator) {
      creator = new User({
        name: 'Test Teacher',
        email: 'teacher@test.com',
        role: 'teacher'
      });
      await creator.save();
      console.log('Created test teacher:', creator._id);
    }

    // Create a single sample question
    const question = new Question({
      question: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2,
      explanation: 'Paris is the capital and most populous city of France.',
      createdBy: creator._id
    });

    await question.save();
    console.log('Created question:', question.question);

    // Create a public test with just one question for easy testing
    const test = new Test({
      title: 'Quick Test - Single Question',
      description: 'A simple test with just one question for quick testing purposes.',
      subject: 'Geography',
      chapter: 'Capitals',
      timeLimit: 5, // 5 minutes
      isPublic: true, // Public test for easy access
      questions: [question._id],
      createdBy: creator._id,
      attemptsCount: 0
    });

    await test.save();

    console.log('\n✅ Single question test created successfully!');
    console.log('📋 Test Details:');
    console.log('   Title:', test.title);
    console.log('   ID:', test._id);
    console.log('   Questions: 1');
    console.log('   Time Limit:', test.timeLimit, 'minutes');
    console.log('   Public Access: Yes');
    console.log('   Created by:', creator.name);
    console.log('   Question:', question.question);
    console.log('   Correct Answer:', question.options[question.correctAnswer]);

    console.log('\n🚀 Ready for quick testing!');
    console.log('You can now quickly test the take-test flow with just one question.');

  } catch (error) {
    console.error('Error creating single question test:', error);
  }
};

const createAnotherTest = async () => {
  try {
    console.log('Creating another single question test...');

    // Find the existing user
    const creator = await User.findOne({ role: 'teacher' });
    if (!creator) {
      console.log('No teacher found, skipping additional test creation');
      return;
    }

    // Create another sample question
    const question = new Question({
      question: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctAnswer: 1,
      explanation: 'Mars is called the Red Planet because of its reddish appearance due to iron oxide (rust) on its surface.',
      createdBy: creator._id
    });

    await question.save();
    console.log('Created question:', question.question);

    // Create another public test
    const test = new Test({
      title: 'Quick Test - Mars Question',
      description: 'Another simple test with one question about our solar system.',
      subject: 'Science',
      chapter: 'Planets',
      timeLimit: 3, // 3 minutes - shorter for quicker testing
      isPublic: true,
      questions: [question._id],
      createdBy: creator._id,
      attemptsCount: 0
    });

    await test.save();

    console.log('\n✅ Second single question test created successfully!');
    console.log('📋 Test Details:');
    console.log('   Title:', test.title);
    console.log('   ID:', test._id);
    console.log('   Questions: 1');
    console.log('   Time Limit:', test.timeLimit, 'minutes');
    console.log('   Public Access: Yes');
    console.log('   Created by:', creator.name);
    console.log('   Question:', question.question);
    console.log('   Correct Answer:', question.options[question.correctAnswer]);

  } catch (error) {
    console.error('Error creating another test:', error);
  }
};

const createTestData = async () => {
  try {
    console.log('Creating test data for testing...');

    // Find an existing user to be the test creator (create one if none exists)
    let creator = await User.findOne();
    if (!creator) {
      creator = new User({
        name: 'Test Teacher',
        email: 'teacher@test.com',
        role: 'teacher'
      });
      await creator.save();
      console.log('Created test teacher:', creator._id);
    }

    // Create sample questions
    const questions = [
      {
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 2,
        createdBy: creator._id
      },
      {
        question: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correctAnswer: 1,
        createdBy: creator._id
      },
      {
        question: 'What is 2 + 2 × 3?',
        options: ['8', '12', '6', '10'],
        correctAnswer: 0,
        explanation: 'According to PEMDAS (order of operations), multiplication comes before addition: 2 + (2 × 3) = 2 + 6 = 8',
        createdBy: creator._id
      },
      {
        question: 'Which programming language is used for React Native?',
        options: ['Python', 'JavaScript', 'Java', 'C++'],
        correctAnswer: 1,
        explanation: 'React Native uses JavaScript and JSX for building native mobile applications.',
        createdBy: creator._id
      },
      {
        question: 'What does HTML stand for?',
        options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Management Language', 'Hyperlink and Text Management Language'],
        correctAnswer: 0,
        explanation: 'HTML stands for Hyper Text Markup Language, which is the standard markup language for creating web pages.',
        createdBy: creator._id
      },
      {
        question: 'Which of these is NOT a JavaScript data type?',
        options: ['String', 'Boolean', 'Integer', 'Undefined'],
        correctAnswer: 2,
        explanation: 'JavaScript has 7 primitive data types: String, Number, Boolean, Undefined, Null, Symbol, and BigInt. "Integer" is not a separate data type - numbers in JavaScript are all of type "Number".',
        createdBy: creator._id
      },
      {
        question: 'What year was the first iPhone released?',
        options: ['2005', '2006', '2007', '2008'],
        correctAnswer: 2,
        explanation: 'The first iPhone was announced by Steve Jobs on January 9, 2007, and released on June 29, 2007.',
        createdBy: creator._id
      },
      {
        question: 'Which company developed the Android operating system?',
        options: ['Apple', 'Microsoft', 'Google', 'Samsung'],
        correctAnswer: 2,
        explanation: 'Android was developed by Google and later the Open Handset Alliance. It was first released in 2008.',
        createdBy: creator._id
      }
    ];

    const createdQuestions = [];
    for (const qData of questions) {
      const question = new Question(qData);
      await question.save();
      createdQuestions.push(question._id);
      console.log('Created question:', question.question.substring(0, 50) + '...');
    }

    // Create a public test for easy testing
    const test = new Test({
      title: 'General Knowledge Quiz',
      description: 'A comprehensive quiz covering various topics including geography, science, technology, and general knowledge.',
      subject: 'General Knowledge',
      chapter: 'Mixed Topics',
      timeLimit: 15, // 15 minutes
      isPublic: true, // Public test for easy access
      questions: createdQuestions,
      createdBy: creator._id,
      attemptsCount: 0
    });

    await test.save();

    console.log('\n✅ Test created successfully!');
    console.log('📋 Test Details:');
    console.log('   Title:', test.title);
    console.log('   ID:', test._id);
    console.log('   Questions:', createdQuestions.length);
    console.log('   Time Limit:', test.timeLimit, 'minutes');
    console.log('   Public Access: Yes');
    console.log('   Created by:', creator.name);

    console.log('\n🚀 Ready for testing!');
    console.log('You can now navigate to the test in the mobile app and test the complete take-test flow.');

  } catch (error) {
    console.error('Error creating test data:', error);
  }
};

// Run the script
const run = async () => {
  await connectDB();

  // Create single question test for quick testing
  await createSingleQuestionTest();

  // Create an additional test for more testing options
  await createAnotherTest();

  // Uncomment to also create full test data
  // await createTestData();

  process.exit(0);
};

run().catch(console.error);
