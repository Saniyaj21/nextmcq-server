import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';
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
      totalQuestions,
      averageAccuracy: ((correctAnswers / totalQuestions) * 100).toFixed(2)
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

// Main seed function
const seedUsers = async () => {
  try {
    console.log('🌱 Starting user seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nextmcq');
    console.log('✅ Connected to MongoDB');
    
    // Check if we should clear existing test users
    const existingTestUsers = await User.countDocuments({ email: /@test\.com$/ });
    if (existingTestUsers > 0) {
      console.log(`⚠️  Found ${existingTestUsers} existing test users`);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      await new Promise((resolve) => {
        rl.question('Delete existing test users? (yes/no): ', async (answer) => {
          if (answer.toLowerCase() === 'yes') {
            const deleted = await User.deleteMany({ email: /@test\.com$/ });
            console.log(`🗑️  Deleted ${deleted.deletedCount} test users`);
          }
          rl.close();
          resolve();
        });
      });
    }
    
    // Get all institutes
    const institutes = await Institute.find({});
    console.log(`📚 Found ${institutes.length} institutes`);
    
    if (institutes.length === 0) {
      console.log('⚠️  Warning: No institutes found. Users will be created without institutes.');
    }
    
    // Generate and insert users
    console.log('\n📝 Generating 200 users...');
    const users = [];
    
    for (let i = 1; i <= 200; i++) {
      const userData = generateUserData(i, institutes);
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
      
      users.push(userData);
      
      // Progress indicator
      if (i % 20 === 0) {
        console.log(`   Generated ${i}/200 users...`);
      }
    }
    
    // Bulk insert
    console.log('\n💾 Inserting users into database...');
    const insertedUsers = await User.insertMany(users);
    console.log(`✅ Successfully inserted ${insertedUsers.length} users!`);
    
    // Statistics
    const studentCount = insertedUsers.filter(u => u.role === 'student').length;
    const teacherCount = insertedUsers.filter(u => u.role === 'teacher').length;
    
    console.log('\n📊 Statistics:');
    console.log(`   👨‍🎓 Students: ${studentCount}`);
    console.log(`   👨‍🏫 Teachers: ${teacherCount}`);
    console.log(`   🏆 Level range: 1-30`);
    console.log(`   💰 Coins range: 50-4500`);
    console.log(`   ⭐ XP range: 100-9000`);
    
    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📧 Test credentials:');
    console.log('   Email: [firstname].[lastname][number]@test.com');
    console.log('   Password: Test@123');
    console.log('   Example: john.smith1@test.com / Test@123\n');
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seed function
seedUsers();
