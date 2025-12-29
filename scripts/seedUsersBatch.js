// Script to create 200 test users in 4 batches (50 users per batch)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Institute from '../models/Institute.js';

dotenv.config();

// Sample data
const firstNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Emily', 'Robert', 'Olivia',
  'William', 'Sophia', 'Richard', 'Ava', 'Joseph', 'Isabella', 'Thomas', 'Mia', 'Charles', 'Charlotte',
  'Daniel', 'Amelia', 'Matthew', 'Harper', 'Anthony', 'Evelyn', 'Mark', 'Abigail', 'Donald', 'Elizabeth',
  'Steven', 'Sofia', 'Paul', 'Avery', 'Andrew', 'Ella', 'Joshua', 'Scarlett', 'Kenneth', 'Grace',
  'Kevin', 'Chloe', 'Brian', 'Victoria', 'George', 'Riley', 'Timothy', 'Aria', 'Ronald', 'Lily'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

// Helper functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);

// Generate random user data
const generateUserData = (index, institutes) => {
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@test.com`;
  const role = Math.random() > 0.3 ? 'student' : 'teacher'; // 70% students, 30% teachers
  
  // Random rewards
  const level = getRandomInt(1, 30);
  const xp = getRandomInt(level * 100, level * 300);
  const coins = getRandomInt(level * 50, level * 150);
  
  // Random institute
  const institute = institutes.length > 0 ? getRandomElement(institutes)._id : null;
  
  const userData = {
    name: `${firstName} ${lastName}`,
    email,
    password: 'Test@123', // Will be hashed
    role,
    isActive: true,
    isEmailVerified: true,
    rewards: {
      coins,
      xp,
      level
    },
    institute
  };
  
  // Add role-specific data
  if (role === 'student') {
    const totalTests = getRandomInt(5, 50);
    const totalQuestions = totalTests * getRandomInt(10, 30);
    const correctAnswers = Math.floor(totalQuestions * parseFloat(getRandomFloat(0.4, 0.95)));
    
    userData.student = {
      totalTests,
      correctAnswers,
      totalQuestions
    };
  } else {
    userData.teacher = {
      testsCreated: getRandomInt(2, 20),
      questionsCreated: getRandomInt(20, 200),
      studentsTaught: getRandomInt(10, 100),
      totalAttemptsOfStudents: getRandomInt(50, 500)
    };
  }
  
  return userData;
};

// Main seed function - creates 50 users in a batch
const seedUsersBatch = async (batchNumber, startIndex) => {
  try {
    console.log(`\n🚀 Starting Batch ${batchNumber}/4 (Users ${startIndex} to ${startIndex + 49})...\n`);

    // Get all institutes
    const institutes = await Institute.find({});
    
    // Generate users for this batch
    const users = [];
    
    for (let i = startIndex; i < startIndex + 50; i++) {
      const userData = generateUserData(i, institutes);
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
      
      users.push(userData);
    }
    
    // Bulk insert
    const insertedUsers = await User.insertMany(users);
    
    // Count by role
    const students = insertedUsers.filter(u => u.role === 'student').length;
    const teachers = insertedUsers.filter(u => u.role === 'teacher').length;
    
    console.log(`✅ Batch ${batchNumber}/4 completed!`);
    console.log(`   - Created: ${insertedUsers.length} users`);
    console.log(`   - Students: ${students}, Teachers: ${teachers}`);
    
    return insertedUsers.length;
  } catch (error) {
    console.error(`❌ Error in batch ${batchNumber}:`, error.message);
    throw error;
  }
};

// Main function to create all 200 users in 4 batches
const create200Users = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/nextmcq');
    console.log('✅ Connected to MongoDB\n');

    // Check existing test users
    const existingTestUsers = await User.countDocuments({ email: /@test\.com$/ });
    if (existingTestUsers > 0) {
      console.log(`⚠️  Found ${existingTestUsers} existing test users`);
      console.log('   Continuing to add 200 more users...\n');
    }

    let totalCreated = 0;
    
    // Create 4 batches of 50 users each
    for (let batch = 1; batch <= 4; batch++) {
      const startIndex = (batch - 1) * 50 + 1;
      const created = await seedUsersBatch(batch, startIndex);
      totalCreated += created;
      
      // Small delay between batches to avoid overwhelming the database
      if (batch < 4) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n✨ Successfully created ${totalCreated} users in 4 batches!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total users created: ${totalCreated}`);
    console.log(`   - Batches: 4 (50 users per batch)`);
    
    const finalCount = await User.countDocuments({ email: /@test\.com$/ });
    console.log(`   - Total test users in database: ${finalCount}`);

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the seed function
create200Users();

