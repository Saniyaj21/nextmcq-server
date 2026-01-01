// File: ./server/scripts/seedTests.js
import mongoose from 'mongoose';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper function to generate random number between min and max
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper function to generate random element from array
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Sample data for tests
const subjects = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 
  'History', 'Geography', 'Computer Science', 'Economics', 
  'Political Science', 'Hindi', 'Sanskrit', 'Commerce', 
  'Accountancy', 'Business Studies'
];

const chapters = {
  'Mathematics': [
    'Algebra', 'Geometry', 'Trigonometry', 'Calculus', 'Statistics', 
    'Probability', 'Vectors', 'Matrices', 'Linear Programming', 'Sets'
  ],
  'Physics': [
    'Mechanics', 'Thermodynamics', 'Optics', 'Electromagnetism', 
    'Modern Physics', 'Waves', 'Sound', 'Light', 'Electricity', 'Magnetism'
  ],
  'Chemistry': [
    'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 
    'Chemical Bonding', 'Atomic Structure', 'Periodic Table', 
    'Electrochemistry', 'Thermodynamics', 'Equilibrium', 'Solutions'
  ],
  'Biology': [
    'Cell Biology', 'Genetics', 'Evolution', 'Ecology', 'Human Physiology', 
    'Plant Physiology', 'Reproduction', 'Diversity', 'Biotechnology', 'Biomolecules'
  ],
  'Computer Science': [
    'Data Structures', 'Algorithms', 'Database Management', 'Programming', 
    'Operating Systems', 'Computer Networks', 'Software Engineering', 
    'Web Development', 'Object-Oriented Programming', 'Python Basics'
  ],
  'English': [
    'Grammar', 'Comprehension', 'Writing Skills', 'Literature', 'Poetry', 
    'Prose', 'Drama', 'Vocabulary', 'Essay Writing', 'Letter Writing'
  ],
  'History': [
    'Ancient History', 'Medieval History', 'Modern History', 'World Wars', 
    'Indian Independence', 'Mughal Empire', 'British Rule', 'Civilization', 
    'Renaissance', 'Industrial Revolution'
  ],
  'Geography': [
    'Physical Geography', 'Human Geography', 'Climate', 'Resources', 
    'Agriculture', 'Industries', 'Transportation', 'Population', 
    'Settlement', 'Map Reading'
  ],
  'Economics': [
    'Microeconomics', 'Macroeconomics', 'Demand and Supply', 'Market Structure',
    'National Income', 'Money and Banking', 'International Trade', 'Public Finance'
  ],
  'Political Science': [
    'Indian Constitution', 'Democracy', 'Political Theory', 'International Relations',
    'Governance', 'Rights and Duties', 'Elections', 'Parliament'
  ]
};

const testTitleTemplates = [
  '{subject} - {chapter} Quiz',
  '{chapter} Practice Test',
  '{subject} {chapter} Assessment',
  'Quick Test: {chapter}',
  '{chapter} Mock Test',
  '{subject} Chapter Test - {chapter}',
  '{chapter} Revision Quiz',
  'Master {chapter}',
  '{chapter} Challenge',
  '{subject} Final Test - {chapter}'
];

const descriptionTemplates = [
  'Test your knowledge of {chapter} in {subject}',
  'Comprehensive assessment covering all topics in {chapter}',
  'Practice questions to master {chapter} concepts',
  'Challenge yourself with this {chapter} test',
  'Review and practice {chapter} with this quiz',
  'Evaluate your understanding of {chapter}',
  'In-depth test on {chapter} topics',
  'Prepare for exams with this {chapter} practice test',
  'Master the fundamentals of {chapter}',
  'Complete assessment of {chapter} concepts'
];

// Sample question templates
const questionTemplates = {
  'Mathematics': [
    'What is the value of {variable}?',
    'Solve for x: {equation}',
    'What is the area of a {shape} with {dimension}?',
    'Calculate the {operation} of {numbers}',
    'What is the result of {expression}?'
  ],
  'Physics': [
    'What is the unit of {concept}?',
    'According to {law}, what happens when {condition}?',
    'Calculate the {quantity} when {parameters}',
    'What is the principle behind {phenomenon}?',
    'Define {term} in physics'
  ],
  'Chemistry': [
    'What is the chemical formula of {compound}?',
    'Which element has atomic number {number}?',
    'What type of reaction is {reaction}?',
    'What is the valency of {element}?',
    'Which of the following is a property of {substance}?'
  ],
  'Biology': [
    'What is the function of {organ}?',
    'Which process is responsible for {function}?',
    'What is the scientific name of {organism}?',
    'Which organelle is responsible for {process}?',
    'What is the main characteristic of {classification}?'
  ],
  'Computer Science': [
    'What is the time complexity of {algorithm}?',
    'Which data structure is best for {operation}?',
    'What does {acronym} stand for?',
    'Which programming paradigm focuses on {concept}?',
    'What is the output of the following code?'
  ],
  'English': [
    'What is the synonym of "{word}"?',
    'Identify the {grammatical_term} in the sentence',
    'What is the meaning of the idiom "{idiom}"?',
    'Which tense is used in: "{sentence}"?',
    'Who wrote "{literary_work}"?'
  ],
  'History': [
    'In which year did {event} occur?',
    'Who was the ruler during {period}?',
    'What was the main cause of {event}?',
    'Which empire was known for {achievement}?',
    'What was the significance of {historical_event}?'
  ],
  'Geography': [
    'What is the capital of {region}?',
    'Which river flows through {location}?',
    'What type of climate is found in {region}?',
    'Which is the largest {geographical_feature} in the world?',
    'What are the main crops grown in {region}?'
  ]
};

// Generate a question for a specific subject and chapter
const generateQuestion = (subject, chapter, createdBy) => {
  const templates = questionTemplates[subject] || [
    'What is the main concept of {topic}?',
    'Which of the following is true about {topic}?',
    'Define {term}',
    'What is the significance of {concept}?',
    'Which statement best describes {topic}?'
  ];
  
  const template = randomElement(templates);
  const questionText = template
    .replace('{topic}', chapter)
    .replace('{term}', chapter)
    .replace('{concept}', chapter)
    .replace('{subject}', subject)
    .replace('{chapter}', chapter);
  
  // Generate 4 options
  const options = [
    `Option A for ${chapter}`,
    `Option B for ${chapter}`,
    `Option C for ${chapter}`,
    `Option D for ${chapter}`
  ];
  
  const correctAnswer = randomInt(0, 3);
  
  const explanations = [
    `The correct answer is option ${String.fromCharCode(65 + correctAnswer)} because it accurately describes the concept in ${chapter}.`,
    `This is the correct choice as it aligns with the fundamental principles of ${chapter} in ${subject}.`,
    `Based on the theory of ${chapter}, this option provides the most accurate explanation.`,
    `This answer is correct because it follows the standard definition used in ${subject}.`
  ];
  
  return {
    question: questionText,
    options,
    correctAnswer,
    explanation: randomElement(explanations),
    createdBy,
    tests: []
  };
};

// Generate a random test
const generateTest = (teachers) => {
  const subject = randomElement(subjects);
  const chapterList = chapters[subject] || ['General'];
  const chapter = randomElement(chapterList);
  
  const titleTemplate = randomElement(testTitleTemplates);
  const title = titleTemplate
    .replace('{subject}', subject)
    .replace('{chapter}', chapter);
  
  const descTemplate = randomElement(descriptionTemplates);
  const description = descTemplate
    .replace('{subject}', subject)
    .replace('{chapter}', chapter);
  
  const isPublic = randomInt(1, 10) <= 7; // 70% public tests
  const createdBy = randomElement(teachers)._id;
  
  const test = {
    title,
    subject,
    chapter,
    description,
    timeLimit: randomInt(10, 60), // 10 to 60 minutes (system max)
    coinFee: randomInt(1, 10) <= 8 ? 0 : randomInt(10, 100), // 80% free, 20% paid
    isPublic,
    attemptsCount: randomInt(0, 500),
    rating: 0,
    averageRating: 0,
    totalRatings: 0,
    createdBy,
    attemptedBy: [],
    questions: [],
    allowedUsers: [],
    pendingRequests: []
  };
  
  return { test, subject, chapter, createdBy };
};

const seedTests = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextmcq';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get all teachers
    const teachers = await User.find({ role: 'teacher', isActive: true }).select('_id name email');
    
    if (teachers.length === 0) {
      console.error('❌ No teachers found in database. Please run seedUsers.js first.');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    console.log(`📚 Found ${teachers.length} teachers in database`);

    // Clear existing tests and questions
    const deletedTests = await Test.deleteMany({});
    const deletedQuestions = await Question.deleteMany({});
    console.log(`🗑️  Cleared ${deletedTests.deletedCount} existing tests`);
    console.log(`🗑️  Cleared ${deletedQuestions.deletedCount} existing questions`);

    const totalTests = 50;
    const minQuestionsPerTest = 10;
    const maxQuestionsPerTest = 25;

    console.log(`\n📝 Generating ${totalTests} tests with questions...\n`);

    let totalQuestionsCreated = 0;

    // Create tests one by one with their questions
    for (let i = 0; i < totalTests; i++) {
      const { test, subject, chapter, createdBy } = generateTest(teachers);
      
      // Create the test first
      const createdTest = await Test.create(test);
      
      // Generate questions for this test
      const numQuestions = randomInt(minQuestionsPerTest, maxQuestionsPerTest);
      const questions = [];
      
      for (let j = 0; j < numQuestions; j++) {
        const questionData = generateQuestion(subject, chapter, createdBy);
        questionData.tests = [createdTest._id];
        questions.push(questionData);
      }
      
      // Insert questions
      const createdQuestions = await Question.insertMany(questions);
      totalQuestionsCreated += createdQuestions.length;
      
      // Update test with question IDs
      createdTest.questions = createdQuestions.map(q => q._id);
      await createdTest.save();
      
      console.log(`✅ Test ${i + 1}/${totalTests}: "${createdTest.title}" with ${createdQuestions.length} questions`);
    }

    console.log(`\n✅ Successfully created ${totalTests} tests with ${totalQuestionsCreated} total questions`);

    // Get statistics
    const publicTests = await Test.countDocuments({ isPublic: true });
    const privateTests = await Test.countDocuments({ isPublic: false });
    const freeTests = await Test.countDocuments({ coinFee: 0 });
    const paidTests = await Test.countDocuments({ coinFee: { $gt: 0 } });
    
    // Subject distribution
    const subjectDistribution = await Test.aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Question count stats
    const avgQuestionsPerTest = Math.round(totalQuestionsCreated / totalTests);

    console.log('\n📊 Statistics:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Total Questions: ${totalQuestionsCreated}`);
    console.log(`   Avg Questions per Test: ${avgQuestionsPerTest}`);
    console.log(`   Public Tests: ${publicTests} (${Math.round(publicTests/totalTests*100)}%)`);
    console.log(`   Private Tests: ${privateTests} (${Math.round(privateTests/totalTests*100)}%)`);
    console.log(`   Free Tests: ${freeTests} (${Math.round(freeTests/totalTests*100)}%)`);
    console.log(`   Paid Tests: ${paidTests} (${Math.round(paidTests/totalTests*100)}%)`);
    
    console.log('\n📚 Top 5 Subjects:');
    subjectDistribution.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item._id}: ${item.count} tests`);
    });

    // Sample tests
    const sampleTests = await Test.find()
      .limit(5)
      .populate('createdBy', 'name email')
      .select('title subject chapter timeLimit coinFee isPublic questions createdBy');
    
    console.log('\n📝 Sample Tests:');
    sampleTests.forEach((test, index) => {
      const feeStr = test.coinFee > 0 ? `${test.coinFee} coins` : 'Free';
      const accessStr = test.isPublic ? 'Public' : 'Private';
      console.log(`   ${index + 1}. ${test.title}`);
      console.log(`      Subject: ${test.subject} | Chapter: ${test.chapter}`);
      console.log(`      Questions: ${test.questions.length} | Time: ${test.timeLimit}m`);
      console.log(`      Fee: ${feeStr} | Access: ${accessStr}`);
      console.log(`      Created by: ${test.createdBy.name}`);
      console.log('');
    });

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding tests:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seeder
seedTests();
