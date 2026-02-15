// File: ./scripts/seedSettings.js
// Seeds default settings into AppConfig collection.
// Only creates if key doesn't exist (won't overwrite admin changes).
// Usage: node server/scripts/seedSettings.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import AppConfig from '../models/AppConfig.js';

const DEFAULT_SETTINGS = [
  // ==========================================
  // REWARDS — Question-Based
  // ==========================================
  { key: 'rewards.question_correct.first_attempt.coins', value: 10, description: 'Coins per correct answer (first attempt)', category: 'rewards' },
  { key: 'rewards.question_correct.first_attempt.xp', value: 10, description: 'XP per correct answer (first attempt)', category: 'rewards' },
  { key: 'rewards.question_correct.repeat_attempt.coins', value: 2, description: 'Coins per correct answer (repeat attempt)', category: 'rewards' },
  { key: 'rewards.question_correct.repeat_attempt.xp', value: 2, description: 'XP per correct answer (repeat attempt)', category: 'rewards' },

  // ==========================================
  // REWARDS — Speed Bonus
  // ==========================================
  { key: 'rewards.speed_bonus.coins', value: 15, description: 'Speed bonus coins (under 50% time, 90%+ accuracy)', category: 'rewards' },
  { key: 'rewards.speed_bonus.xp', value: 15, description: 'Speed bonus XP (under 50% time, 90%+ accuracy)', category: 'rewards' },

  // ==========================================
  // REWARDS — Referral
  // ==========================================
  { key: 'rewards.referral.referrer.coins', value: 150, description: 'Coins awarded to referrer on successful signup', category: 'rewards' },
  { key: 'rewards.referral.referrer.xp', value: 75, description: 'XP awarded to referrer on successful signup', category: 'rewards' },
  { key: 'rewards.referral.referee.coins', value: 75, description: 'Coins awarded to referee on successful signup', category: 'rewards' },
  { key: 'rewards.referral.referee.xp', value: 40, description: 'XP awarded to referee on successful signup', category: 'rewards' },

  // ==========================================
  // REWARDS — Teacher
  // ==========================================
  { key: 'rewards.teacher.create_test.coins', value: 50, description: 'Coins awarded to teacher for creating a test', category: 'rewards' },
  { key: 'rewards.teacher.create_test.xp', value: 75, description: 'XP awarded to teacher for creating a test', category: 'rewards' },
  { key: 'rewards.teacher.student_attempt.coins', value: 10, description: 'Coins awarded to teacher per student attempt', category: 'rewards' },
  { key: 'rewards.teacher.student_attempt.xp', value: 10, description: 'XP awarded to teacher per student attempt', category: 'rewards' },

  // ==========================================
  // REWARDS — Monthly Rankings
  // ==========================================
  { key: 'ranking.monthly.champion.coins', value: 1000, description: 'Monthly champion coins (#1)', category: 'rewards' },
  { key: 'ranking.monthly.champion.xp', value: 500, description: 'Monthly champion XP (#1)', category: 'rewards' },
  { key: 'ranking.monthly.champion.badge', value: 'Monthly Champion', description: 'Monthly champion badge name (#1)', category: 'rewards' },

  { key: 'ranking.monthly.elite.coins', value: 500, description: 'Monthly elite coins (Top 10)', category: 'rewards' },
  { key: 'ranking.monthly.elite.xp', value: 400, description: 'Monthly elite XP (Top 10)', category: 'rewards' },
  { key: 'ranking.monthly.elite.badge', value: 'Monthly Elite', description: 'Monthly elite badge name (Top 10)', category: 'rewards' },

  { key: 'ranking.monthly.achiever.coins', value: 200, description: 'Monthly achiever coins (Top 50)', category: 'rewards' },
  { key: 'ranking.monthly.achiever.xp', value: 300, description: 'Monthly achiever XP (Top 50)', category: 'rewards' },
  { key: 'ranking.monthly.achiever.badge', value: 'Monthly Achiever', description: 'Monthly achiever badge name (Top 50)', category: 'rewards' },

  { key: 'ranking.monthly.performer.coins', value: 100, description: 'Monthly performer coins (Top 100)', category: 'rewards' },
  { key: 'ranking.monthly.performer.xp', value: 200, description: 'Monthly performer XP (Top 100)', category: 'rewards' },
  { key: 'ranking.monthly.performer.badge', value: 'Monthly Performer', description: 'Monthly performer badge name (Top 100)', category: 'rewards' },

  { key: 'ranking.monthly.unplaced.coins', value: 10, description: 'Monthly unplaced coins (101+)', category: 'rewards' },
  { key: 'ranking.monthly.unplaced.xp', value: 100, description: 'Monthly unplaced XP (101+)', category: 'rewards' },
  { key: 'ranking.monthly.unplaced.badge', value: 'Monthly Unplaced', description: 'Monthly unplaced badge name (101+)', category: 'rewards' },

  // ==========================================
  // SYSTEM — Level System
  // ==========================================
  { key: 'level_system.base_xp', value: 100, description: 'Base XP required for level 2', category: 'system' },
  { key: 'level_system.xp_multiplier', value: 1.2, description: 'XP requirement multiplier per level (1.2 = 20% increase)', category: 'system' },

  // ==========================================
  // SYSTEM — Ranking Score Weights
  // ==========================================
  { key: 'ranking.score.tests_weight', value: 15, description: 'Points per test completed (student ranking)', category: 'system' },
  { key: 'ranking.score.correct_answers_weight', value: 1, description: 'Points per correct answer (student ranking)', category: 'system' },

  // ==========================================
  // SYSTEM — Revenue Share
  // ==========================================
  { key: 'revenue_share.teacher_share', value: 0.8, description: 'Teacher share of coin fees (0.8 = 80%)', category: 'system' },
  { key: 'revenue_share.platform_share', value: 0.2, description: 'Platform share of coin fees (0.2 = 20%)', category: 'system' },

  // ==========================================
  // LIMITS
  // ==========================================
  { key: 'limits.max_daily_coins', value: 1000, description: 'Maximum coins a user can earn per day', category: 'limits' },
  { key: 'limits.max_daily_xp', value: 2000, description: 'Maximum XP a user can earn per day', category: 'limits' },
  { key: 'limits.max_test_attempts_per_day', value: 50, description: 'Maximum test attempts per user per day', category: 'limits' },
  { key: 'limits.test_time.min', value: 1, description: 'Minimum test time limit (minutes)', category: 'limits' },
  { key: 'limits.test_time.max', value: 60, description: 'Maximum test time limit (minutes)', category: 'limits' },
  { key: 'limits.test_time.default', value: 30, description: 'Default test time limit (minutes)', category: 'limits' },
  { key: 'limits.max_referrals_per_day', value: 10, description: 'Maximum referral rewards per day', category: 'limits' },
];

async function seedSettings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[SeedSettings] Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const setting of DEFAULT_SETTINGS) {
      const exists = await AppConfig.findOne({ key: setting.key });
      if (exists) {
        skipped++;
        continue;
      }
      await AppConfig.create(setting);
      created++;
    }

    console.log(`[SeedSettings] Done: ${created} created, ${skipped} skipped (already exist)`);
    console.log(`[SeedSettings] Total settings in DB: ${await AppConfig.countDocuments()}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[SeedSettings] Error:', error);
    process.exit(1);
  }
}

seedSettings();
