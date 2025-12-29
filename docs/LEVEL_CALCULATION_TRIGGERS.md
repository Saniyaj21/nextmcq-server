# Level Calculation Triggers

This document describes when and where user level calculations happen in the NextMCQ system.

## Overview

Level calculation happens automatically when XP changes. Levels are determined by the user's total XP using an exponential progression formula (20% increase per level).

## Calculation Methods

### 1. `addRewards()` Method (Automatic)
**Location**: `server/models/User.js`

```javascript
userSchema.methods.addRewards = function (coins = 0, xp = 0, source = 'unknown') {
  this.rewards.coins += coins;
  this.rewards.xp += xp;
  
  // Update level based on new XP
  const newLevel = this.calculateLevel();
  this.rewards.level = newLevel;
  
  return this.save();
};
```

**When it triggers**: Automatically updates level whenever this method is called.

---

## Level Calculation Triggers

### 1. ✅ Student Test Completion
**Location**: `server/controllers/testTakingController.js` - `submitTest()`

**When**: After a student completes a test

**Code**:
```javascript
// Use addRewards() method for consistency - automatically updates level
await userToUpdate.addRewards(rewards.coins, rewards.xp, 'test_completion');
```

**Status**: ✅ **CORRECT** - Uses `addRewards()` method for consistency

---

### 2. ✅ Teacher Test Creation
**Location**: `server/controllers/testController.js` - `createTest()`

**When**: After a teacher creates a new test

**Code**:
```javascript
const teacher = await User.findById(createdBy);

if (teacher) {
  // Update teacher stats
  teacher.teacher.testsCreated = (teacher.teacher.testsCreated || 0) + 1;

  // Use addRewards() method for consistency - automatically updates level
  await teacher.addRewards(teacherReward.coins, teacherReward.xp, 'test_creation');
}
```

**Status**: ✅ **CORRECT** - Uses `addRewards()` method for consistency

---

### 3. ✅ Teacher Student Attempt Rewards
**Location**: `server/controllers/testTakingController.js` - `distributeTeacherRewards()`

**When**: When a student completes a teacher's test

**Code**:
```javascript
const teacher = await User.findById(test.createdBy._id);

if (!teacher) {
  console.error('Teacher not found for rewards distribution');
  return;
}

// Update teacher stats
teacher.teacher.totalAttemptsOfStudents = (teacher.teacher.totalAttemptsOfStudents || 0) + 1;

// Use addRewards() method for consistency - automatically updates level
await teacher.addRewards(teacherReward.coins, teacherReward.xp, 'student_attempt');
```

**Status**: ✅ **CORRECT** - Uses `addRewards()` method for consistency (bug fixed)

---

### 4. ✅ Referral Rewards
**Location**: `server/controllers/authController.js` - `completeOnboarding()`

**When**: During user onboarding when a referral code is used

**Code**:
```javascript
// For referrer
await referrer.addRewards(
  referrerRewards.coins,
  referrerRewards.xp,
  'referral_referrer'
);

// For referee (new user)
await updatedUser.addRewards(
  refereeRewards.coins,
  refereeRewards.xp,
  'referral_referee'
);
```

**Status**: ✅ **CORRECT** - Uses `addRewards()` method which automatically updates level

---

### 5. ✅ Monthly Ranking Rewards
**Location**: `server/controllers/monthlyRewardsController.js` - `awardSingleReward()`

**When**: When monthly ranking rewards are distributed

**Code**:
```javascript
// Add badge first
userDoc.badges.push({...});

// Add coins (no XP for ranking rewards) - use addRewards() for consistency
await userDoc.addRewards(coins, 0, 'monthly_ranking_reward');
```

**Status**: ✅ **CORRECT** - Uses `addRewards()` method for consistency (coins only, no XP)

---

### 6. ✅ On-the-Fly Calculations (Display Only)
**Location**: Various controllers (authController, rankingController, userController)

**When**: When sending user data to frontend (doesn't update database, just for display)

**Examples**:
- `authController.js` - `verifyOTP()`: `level: updatedUser.calculateLevel()`
- `authController.js` - `getProfile()`: `level: user.calculateLevel()`
- `rankingController.js` - `getUserRank()`: `level: currentUser.calculateLevel()`

**Status**: ✅ **CORRECT** - These are for display purposes only, not database updates

---

## Summary

| Event | Location | Method | Level Updated? | Status |
|-------|----------|--------|----------------|--------|
| Student completes test | testTakingController | addRewards() | ✅ Yes | ✅ Correct |
| Teacher creates test | testController | addRewards() | ✅ Yes | ✅ Correct |
| Teacher student attempt | testTakingController | addRewards() | ✅ Yes | ✅ Correct (fixed) |
| Monthly ranking rewards | monthlyRewardsController | addRewards() | ✅ Yes | ✅ Correct |
| Referral rewards | authController | addRewards() | ✅ Yes | ✅ Correct |
| Display purposes | Multiple | calculateLevel() | N/A | ✅ Correct |

## Summary

✅ **All reward distributions now use the `addRewards()` method for consistency!**

This ensures:
- Level is always calculated and updated correctly
- Consistent code patterns across the codebase
- No race conditions or missing level updates
- Automatic level recalculation whenever XP changes

