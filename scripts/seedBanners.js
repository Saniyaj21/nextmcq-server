// File: ./server/scripts/seedBanners.js
import mongoose from 'mongoose';
import Banner from '../models/Banner.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const banners = [
  {
    title: 'Welcome to NextMCQ',
    imageURL: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Test Your Knowledge',
    imageURL: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Learn and Grow',
    imageURL: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Challenge Yourself',
    imageURL: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Master Every Subject',
    imageURL: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Compete with Friends',
    imageURL: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Track Your Progress',
    imageURL: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Join the Community',
    imageURL: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Earn Rewards',
    imageURL: 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=1200&h=400&fit=crop',
    isActive: true
  },
  {
    title: 'Achievement Unlocked',
    imageURL: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1200&h=400&fit=crop',
    isActive: true
  }
];

const seedBanners = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextmcq';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Clear existing banners
    await Banner.deleteMany({});
    console.log('🗑️  Cleared existing banners');

    // Insert new banners
    const createdBanners = await Banner.insertMany(banners);
    console.log(`✅ Successfully created ${createdBanners.length} banners`);
    
    // Display created banners
    console.log('\n📋 Created Banners:');
    createdBanners.forEach((banner, index) => {
      console.log(`${index + 1}. ${banner.title} (${banner._id})`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding banners:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seeder
seedBanners();

