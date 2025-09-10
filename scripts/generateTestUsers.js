import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Sample data for generating realistic test users
const firstNames = [
  'John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa', 'Tom', 'Anna',
  'Alex', 'Maria', 'James', 'Laura', 'Kevin', 'Emma', 'Ryan', 'Sophie', 'Daniel', 'Amy',
  'Mark', 'Jessica', 'Brian', 'Rachel', 'Andrew', 'Hannah', 'Steven', 'Nicole', 'Eric', 'Kate',
  'Michael', 'Ashley', 'Robert', 'Michelle', 'Jason', 'Jennifer', 'William', 'Amanda', 'Richard', 'Stephanie',
  'Joseph', 'Rebecca', 'Thomas', 'Elizabeth', 'Charles', 'Sharon', 'Christopher', 'Sandra', 'Matthew', 'Donna'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const subjects = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 
  'Computer Science', 'Economics', 'Psychology', 'Philosophy', 'Art', 'Music', 'Literature'
];

const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'test.com'];

// Helper function to generate random number between min and max
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to pick random item from array
function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to pick multiple random items from array
function randomPickMultiple(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Generate a realistic test user
function generateTestUser(index) {
  const firstName = randomPick(firstNames);
  const lastName = randomPick(lastNames);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${randomPick(domains)}`;
  const role = Math.random() < 0.85 ? 'student' : 'teacher'; // 85% students, 15% teachers
  
  // Generate realistic test and accuracy data
  const totalTests = randomBetween(0, 50);
  const totalQuestions = totalTests * randomBetween(5, 20); // 5-20 questions per test
  const accuracyPercent = randomBetween(30, 95);
  const correctAnswers = Math.floor((totalQuestions * accuracyPercent) / 100);
  
  // Generate XP and coins based on performance
  const baseXP = totalTests * randomBetween(80, 120);
  const bonusXP = Math.floor(correctAnswers * 0.5);
  const totalXP = baseXP + bonusXP;
  
  const baseCoins = totalTests * randomBetween(40, 80);
  const bonusCoins = Math.floor(correctAnswers * 0.3);
  const totalCoins = baseCoins + bonusCoins;
  
  // Calculate level based on XP (simplified version)
  const level = Math.max(1, Math.floor(totalXP / 100) + 1);
  
  // Generate login streak
  const loginStreak = randomBetween(0, 30);
  
  // Generate subjects (1-3 subjects per user)
  const userSubjects = randomPickMultiple(subjects, randomBetween(1, 3));
  
  return {
    name: `${firstName} ${lastName}`,
    email: email,
    role: role,
    subjects: userSubjects,
    isActive: true,
    isEmailVerified: true,
    isProfileComplete: true,
    lastLoginAt: new Date(Date.now() - randomBetween(0, 30) * 24 * 60 * 60 * 1000), // Random last login within 30 days
    rewards: {
      coins: totalCoins,
      xp: totalXP,
      level: level,
      totalTests: totalTests,
      correctAnswers: correctAnswers,
      totalQuestions: totalQuestions,
      loginStreak: loginStreak,
      lastLoginDate: new Date(Date.now() - randomBetween(0, 7) * 24 * 60 * 60 * 1000) // Random within 7 days
    }
  };
}

// Generate referral code for user
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateTestUsers() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDB();
    
    console.log('🧹 Clearing existing test users...');
    // Only remove users with test email domains to avoid deleting real users
    await User.deleteMany({
      $and: [
        { email: { $regex: /@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|test\.com)$/ } },
        { email: { $regex: /\d+@/ } } // Contains numbers before @
      ]
    });
    
    console.log('👥 Generating 200 test users...');
    const users = [];
    const usedEmails = new Set();
    const usedReferralCodes = new Set();
    
    for (let i = 1; i <= 200; i++) {
      let user = generateTestUser(i);
      
      // Ensure unique email
      while (usedEmails.has(user.email)) {
        user = generateTestUser(i + 1000);
      }
      usedEmails.add(user.email);
      
      // Generate unique referral code
      let referralCode = generateReferralCode();
      while (usedReferralCodes.has(referralCode)) {
        referralCode = generateReferralCode();
      }
      usedReferralCodes.add(referralCode);
      user.referralCode = referralCode;
      
      users.push(user);
      
      if (i % 50 === 0) {
        console.log(`📝 Generated ${i}/200 users...`);
      }
    }
    
    console.log('💾 Inserting users into database...');
    await User.insertMany(users);
    
    console.log('📊 Generating statistics...');
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    
    console.log('\n✅ Test data generation completed!');
    console.log(`📈 Statistics:`);
    console.log(`   • Total users: ${totalUsers}`);
    console.log(`   • Students: ${totalStudents}`);
    console.log(`   • Teachers: ${totalTeachers}`);
    console.log(`   • New test users added: 200`);
    
    // Show some sample users for verification
    console.log('\n🔍 Sample generated users:');
    const sampleUsers = await User.find({})
      .sort({ 'rewards.totalTests': -1 })
      .limit(5)
      .select('name email role rewards.totalTests rewards.xp rewards.level');
    
    sampleUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.role}) - Level ${user.rewards.level}, ${user.rewards.totalTests} tests, ${user.rewards.xp} XP`);
    });
    
    console.log('\n🎯 You can now test the ranking system with realistic data!');
    
  } catch (error) {
    console.error('❌ Error generating test users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the script
generateTestUsers();
