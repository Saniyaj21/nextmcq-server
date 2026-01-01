// File: ./server/scripts/seedUsers.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper function to generate random number between min and max
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper function to generate random element from array
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Sample data
const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan',
  'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari', 'Navya', 'Kiara', 'Mira', 'Sara', 'Riya',
  'Rohan', 'Reyansh', 'Atharv', 'Kabir', 'Pranav', 'Shaurya', 'Vedant', 'Yash', 'Advait', 'Dhruv',
  'Aditi', 'Anvi', 'Ishita', 'Jiya', 'Myra', 'Prisha', 'Shanaya', 'Tara', 'Vanya', 'Zara',
  'Aadhav', 'Aarush', 'Abhay', 'Akarsh', 'Amir', 'Aryan', 'Dev', 'Eshaan', 'Harsh', 'Ishan'
];

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Rao', 'Joshi', 'Desai',
  'Mehta', 'Shah', 'Nair', 'Menon', 'Iyer', 'Agarwal', 'Banerjee', 'Chatterjee', 'Das', 'Ghosh',
  'Khan', 'Ali', 'Malik', 'Hussain', 'Ahmed', 'Chopra', 'Kapoor', 'Bhatia', 'Malhotra', 'Sethi',
  'Thakur', 'Pandey', 'Mishra', 'Tiwari', 'Dubey', 'Saxena', 'Sinha', 'Roy', 'Bose', 'Mukherjee'
];

const subjects = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 
  'Geography', 'Computer Science', 'Economics', 'Political Science', 
  'Hindi', 'Sanskrit', 'Commerce', 'Accountancy', 'Business Studies'
];

const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

// Generate a random user
const generateUser = (index) => {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const name = `${firstName} ${lastName}`;
  const role = randomInt(1, 10) <= 7 ? 'student' : 'teacher'; // 70% students, 30% teachers
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@${randomElement(domains)}`;
  
  const user = {
    name,
    email,
    role,
    isActive: true,
    isProfileComplete: randomInt(1, 10) <= 8, // 80% complete profiles
    isEmailVerified: randomInt(1, 10) <= 9, // 90% verified
    subjects: [],
    rewards: {
      coins: randomInt(0, 5000),
      xp: randomInt(0, 50000),
      level: randomInt(1, 20)
    }
  };

  // Add subjects (1-3 random subjects)
  const numSubjects = randomInt(1, 3);
  const selectedSubjects = [];
  for (let i = 0; i < numSubjects; i++) {
    const subject = randomElement(subjects);
    if (!selectedSubjects.includes(subject)) {
      selectedSubjects.push(subject);
    }
  }
  user.subjects = selectedSubjects;

  // Add role-specific data
  if (role === 'student') {
    const totalTests = randomInt(0, 100);
    const totalQuestions = totalTests * randomInt(10, 30);
    const correctAnswers = Math.floor(totalQuestions * (randomInt(30, 95) / 100));
    
    user.student = {
      totalTests,
      correctAnswers,
      totalQuestions,
      attemptedTests: []
    };
  } else {
    user.teacher = {
      testsCreated: randomInt(0, 50),
      questionsCreated: randomInt(0, 500),
      studentsTaught: randomInt(0, 200),
      totalAttemptsOfStudents: randomInt(0, 1000)
    };
  }

  // Some users have lastLoginAt
  if (randomInt(1, 10) <= 7) { // 70% have logged in recently
    const daysAgo = randomInt(0, 90);
    user.lastLoginAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  }

  return user;
};

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextmcq';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    const deletedCount = await User.deleteMany({});
    console.log(`🗑️  Cleared ${deletedCount.deletedCount} existing users`);

    const totalUsers = 500;
    const batchSize = 50;
    let createdCount = 0;

    console.log(`\n📝 Starting to create ${totalUsers} users in batches of ${batchSize}...\n`);

    // Create users in batches
    for (let i = 0; i < totalUsers; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, totalUsers - i);
      
      // Generate batch of users
      for (let j = 0; j < currentBatchSize; j++) {
        batch.push(generateUser(i + j + 1));
      }

      // Insert batch
      try {
        const insertedUsers = await User.insertMany(batch, { ordered: false });
        createdCount += insertedUsers.length;
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalUsers / batchSize)}: Created ${insertedUsers.length} users (Total: ${createdCount}/${totalUsers})`);
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error - some emails might conflict
          console.log(`⚠️  Batch ${Math.floor(i / batchSize) + 1}: Some users skipped due to duplicate emails`);
          // Count how many were actually inserted
          const insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
          createdCount += insertedCount;
        } else {
          throw error;
        }
      }
    }

    // Get statistics
    const studentCount = await User.countDocuments({ role: 'student' });
    const teacherCount = await User.countDocuments({ role: 'teacher' });
    const verifiedCount = await User.countDocuments({ isEmailVerified: true });
    
    console.log('\n📊 Statistics:');
    console.log(`   Total Users: ${createdCount}`);
    console.log(`   Students: ${studentCount} (${Math.round(studentCount/createdCount*100)}%)`);
    console.log(`   Teachers: ${teacherCount} (${Math.round(teacherCount/createdCount*100)}%)`);
    console.log(`   Verified: ${verifiedCount} (${Math.round(verifiedCount/createdCount*100)}%)`);

    // Sample users
    const sampleUsers = await User.find().limit(5).select('name email role rewards.level');
    console.log('\n👥 Sample Users:');
    sampleUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role} - Level ${user.rewards.level}`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seeder
seedUsers();
