# Seed Users Script

This script generates 200 test users with realistic data for testing the leaderboard and ranking features.

## Features

- **200 Test Users**: Automatically generates 200 users
- **Role Distribution**: 70% students, 30% teachers
- **Realistic Data**:
  - Random levels (1-30)
  - Random XP (100-9000)
  - Random coins (50-4500)
  - Student stats (tests taken, accuracy, questions answered)
  - Teacher stats (tests created, students taught)
- **Institute Assignment**: Randomly assigns users to existing institutes
- **Safe Execution**: Prompts before deleting existing test users

## Usage

### Run the script:

```bash
cd server
npm run seed:users
```

### Test Credentials

All test users use the same password:
- **Email Format**: `[firstname].[lastname][number]@test.com`
- **Password**: `Test@123`

### Examples:
```
john.smith1@test.com / Test@123
jane.johnson5@test.com / Test@123
michael.williams10@test.com / Test@123
```

## Generated Data

### Students (~140 users)
- `totalTests`: 5-50
- `totalQuestions`: 50-1500
- `correctAnswers`: 40%-95% accuracy
- `averageAccuracy`: Calculated percentage

### Teachers (~60 users)
- `testsCreated`: 2-20
- `questionsCreated`: 20-200
- `studentsTaught`: 10-100
- `totalAttemptsOfStudents`: 50-500

### Rewards (All Users)
- `level`: 1-30
- `xp`: level * 100 to level * 300
- `coins`: level * 50 to level * 150

## Notes

- The script will prompt you to delete existing test users (emails ending with @test.com)
- If no institutes exist, users will be created without institute assignments
- All passwords are securely hashed using bcrypt

## Cleanup

To remove all test users, you can either:
1. Run the script again and choose "yes" when prompted
2. Manually delete from MongoDB: `db.users.deleteMany({ email: /@test\.com$/ })`

