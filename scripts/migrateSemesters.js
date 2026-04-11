/**
 * Migration: Update semester values for class 12 users and tests
 *
 * Old system: semesters '1' and '2' for both class 11 and class 12
 * New system: semesters '1' and '2' for class 11, semesters '3' and '4' for class 12
 *
 * This script migrates existing class 12 records:
 *   semester '1' -> '3'
 *   semester '2' -> '4'
 *
 * Usage: node scripts/migrateSemesters.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function migrate() {
  if (!MONGO_URI) {
    console.error('No MONGO_URI found in environment');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');
  const tests = db.collection('tests');

  // --- Users ---
  const userSem1 = await users.updateMany(
    { class: '12', semester: '1' },
    { $set: { semester: '3' } }
  );
  console.log(`Users class 12 sem 1 -> 3: ${userSem1.modifiedCount} updated`);

  const userSem2 = await users.updateMany(
    { class: '12', semester: '2' },
    { $set: { semester: '4' } }
  );
  console.log(`Users class 12 sem 2 -> 4: ${userSem2.modifiedCount} updated`);

  // --- Tests ---
  const testSem1 = await tests.updateMany(
    { class: '12', semester: '1' },
    { $set: { semester: '3' } }
  );
  console.log(`Tests class 12 sem 1 -> 3: ${testSem1.modifiedCount} updated`);

  const testSem2 = await tests.updateMany(
    { class: '12', semester: '2' },
    { $set: { semester: '4' } }
  );
  console.log(`Tests class 12 sem 2 -> 4: ${testSem2.modifiedCount} updated`);

  console.log('Migration complete.');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
