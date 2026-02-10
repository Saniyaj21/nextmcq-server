/**
 * Seed Admin Script
 * Usage: node scripts/seedAdmin.js admin@example.com
 *
 * Finds a user by email and sets their role to 'admin'
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/seedAdmin.js <email>');
  process.exit(1);
}

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nextmcq');
    console.log('Connected to MongoDB');

    const User = (await import('../models/User.js')).default;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }

    user.role = 'admin';
    await user.save();

    console.log(`Successfully set ${user.name || user.email} (${user.email}) as admin`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedAdmin();
