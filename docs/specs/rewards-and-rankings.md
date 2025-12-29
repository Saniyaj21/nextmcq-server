# NextMCQ Rewards & Rankings System

## 💰 Currency System

### **🪙 Coins (Primary Currency)**
- **Purpose**: Main transactional currency for app features
- **Earning Methods**: 
  - Test completion
  - Referral rewards
  - Ranking rewards
- **Usage**:
  - Unlock premium tests

- **Display**: Gold coin icon with numerical value

### **⭐ XP (Experience Points)**
- **Purpose**: Character progression and feature unlocking
- **Earning Methods**:
  - Test attempts (regardless of score)
  - Correct answers
  - Profile completion
- **Usage**:
  - Level progression 
  - Unlock app features
  - Determine user titles
- **Display**: Blue star icon with XP amount

## 📈 Level Progression System

### **Level Structure**
- **Range**: Level 1-unlimited
- **XP Requirements**: Increase 20% per level
  ```
  Level 1: 100 XP
  Level 2: 120 XP (100 + 20%)
  Level 3: 144 XP (120 + 20%)
  Level N: Previous Level XP × 1.2
  ```

### **Level Benefits**
- Every 5 levels unlock new features
- Higher levels get coin bonuses on rewards

## 🎯 Reward Earning Mechanisms

### **Test-Based Rewards**

#### **Test Completion**
| Attempt Type | Coins | XP |
|--------------|-------|-----|
| First Attempt (any test) | 50 | 100 |
| Repeat Attempts | 10 | 20 |

#### **Accuracy Bonuses**
| Accuracy Range | Coin Multiplier | Bonus XP |
|----------------|----------------|----------|
| 90-100% | 2.0x | +50 XP |
| 80-89% | 1.5x | +30 XP |
| 70-79% | 1.2x | +15 XP |
| 60-69% | 1.0x | +5 XP |
| Below 60% | 1.0x | 0 XP |


### **Daily Activities**
| Activity | Coins | XP |
|----------|-------|-----|
| Daily Login | 5 | 10 |
| First Test of Day | 15 | 20 |

### **Referral Rewards**
| Event | Referrer | Referee |
|-------|----------|---------|
| Successful Signup | 150 coins, 75 XP | 75 coins, 40 XP |

### **Teacher-Specific Rewards**
| Activity | Coins | XP |
|----------|-------|-----|
| Create Test | 50 | 75 |
| Student Attempt | 10 | 10 |
## 🏆 Ranking System

### **Ranking Categories**
1. **Global Rankings** - All users worldwide
2. **Institute Rankings** - Per school/college
3. **Role Rankings** - Students vs Teachers separate



### **Ranking Score Formula**

#### **For Students**
```
Ranking Score = (Total Tests × 15) + (Correct Answers × 1)

Example:
- Student with 50 tests and 500 correct answers = (50 × 15) + (500 × 1) = 1,250 points
- Student with 100 tests and 800 correct answers = (100 × 15) + (800 × 1) = 2,300 points
```

**Design Rationale:**
- **Fast Performance**: No division or rounding operations - only simple multiplication and addition
- **Meaningful Ranking**: Rewards both participation (tests completed) and quality (correct answers)
- **Fair & Balanced**: Naturally balances consistency (more tests) with skill (more correct answers)
- **Scalable**: Efficient calculation even with millions of users

#### **For Teachers**
```
Ranking Score = Total Attempts of Students × 1

Example:
- Teacher with 1,000 total student attempts = 1,000 × 1 = 1,000 points
```

### **Ranking Rewards**

#### **Monthly Rankings**
| Position | Coins | Badge |
|----------|-------|-------|
| #1 | 1000 | Monthly Champion |
| Top 10 | 500 | Monthly Elite |
| Top 50 | 200 | Monthly Achiever |
| Top 100 | 100 | Monthly Performer |

## 💳 Coin Spending Options

### **Premium Features**
| Item | Cost | Description |
|------|------|-------------|
| Premium Test Access | 100 coins | Unlock exclusive test sets |

## 📊 Implementation Notes

### **Database Schema Changes**
```javascript
// Add to User model
{
  rewards: {
    coins: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalTests: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    lastLoginDate: Date,
  },
  referredBy: { type: ObjectId, ref: 'User' },
  referralCode: { type: String, unique: true }
}
```

### **Key Functions**
- `calculateUserLevel(xp)` - Determine level from XP
- `calculateRankingScore()` - Calculate ranking score based on role (Students: tests + correctAnswers, Teachers: totalAttemptsOfStudents)
- `awardRewards(userId, coins, xp, source)` - Add rewards to user
- `updateLeaderboard()` - Monthly leaderboard calculation

### **Performance Notes**
- Cache leaderboard results
- Batch process reward calculations
- Index on ranking score fields
