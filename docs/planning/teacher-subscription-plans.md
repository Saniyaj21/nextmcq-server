# Teacher Subscription Plans - Brainstorming Document

## 🎯 Overview

This document outlines the monthly subscription plan system for teachers to access premium features, particularly batch management with student limits.

---

## 💡 Core Concept

**Free Tier (Default):**
- 1 batch maximum
- 10 students per batch maximum
- Basic features

**Paid Plans:**
- Multiple batches
- More students per batch
- Premium features
- Paid using coins (monthly subscription)

---

## 📊 Proposed Plan Tiers

### **Plan 1: Free (Default)**
- **Price**: Free
- **Batches**: 1 batch
- **Students per Batch**: 10 students max
- **Total Students**: 10 students
- **Features**:
  - Basic test creation
  - Basic batch management
  - Standard analytics

### **Plan 2: Starter (Paid)**
- **Price**: 500 coins/month
- **Batches**: 3 batches
- **Students per Batch**: 25 students max
- **Total Students**: 75 students (3 × 25)
- **Features**:
  - All Free features
  - Advanced analytics
  - Batch export

### **Plan 3: Professional (Paid)**
- **Price**: 1,500 coins/month
- **Batches**: 10 batches
- **Students per Batch**: 50 students max
- **Total Students**: 500 students (10 × 50)
- **Features**:
  - All Starter features
  - Priority support
  - Custom branding
  - Bulk operations

### **Plan 4: Enterprise (Paid)**
- **Price**: 3,000 coins/month
- **Batches**: Unlimited batches
- **Students per Batch**: 100 students max
- **Total Students**: Unlimited
- **Features**:
  - All Professional features
  - API access
  - White-label options
  - Dedicated support

---

---

## 🎁 Premium Features (Beyond Batches)

Consider adding these premium features to paid plans:

1. **Advanced Analytics**
   - Detailed performance reports
   - Student progress tracking
   - Export data (CSV/PDF)
   - Historical trends

2. **Test Features**
   - Unlimited test(private) creation (vs. limited for free)
   - Advanced question types
   - Custom test branding
   - Scheduled test releases

3. **Communication**
   - Email notifications
   - Announcement system

4. **Customization**
   - Custom institute branding
   - Custom themes




---

## 🗄️ Database Schema Changes

### **New Model: SubscriptionPlan**

```javascript
{
  _id: ObjectId,
  name: String, // "Free", "Starter", "Professional", "Enterprise"
  tier: Number, // 1, 2, 3, 4 (for easy comparison)
  price: Number, // Monthly price in coins
  maxBatches: Number, // -1 for unlimited
  maxStudentsPerBatch: Number, // -1 for unlimited
  maxTotalStudents: Number, // -1 for unlimited
  features: [String], // ["advanced_analytics", "bulk_operations", etc.]
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### **New Model: TeacherSubscription**

```javascript
{
  _id: ObjectId,
  teacherId: ObjectId, // ref: 'User'
  planId: ObjectId, // ref: 'SubscriptionPlan'
  status: String, // 'active', 'expired', 'cancelled', 'pending_payment'
  startDate: Date,
  endDate: Date, // Calculated: startDate + 30 days
  autoRenew: Boolean, // Default: true
  coinsPaid: Number, // Amount paid for this subscription
  createdAt: Date,
  updatedAt: Date
}
```

### **User Model Updates**

Add to User model (for teachers):
```javascript
subscription: {
  currentPlan: ObjectId, // ref: 'SubscriptionPlan'
  subscriptionId: ObjectId, // ref: 'TeacherSubscription'
  expiresAt: Date,
  autoRenew: Boolean
}
```

---

## 🔐 Business Logic & Validation

### **Batch Creation Validation**

When creating a batch:
1. Check teacher's current subscription plan
2. Count existing batches for this teacher
3. Validate against `maxBatches` limit
4. If adding students, validate against `maxStudentsPerBatch`
5. If plan allows, deduct coins if needed (for pay-per-use models)

### **Student Addition Validation**

When adding students to a batch:
1. Check current student count in batch
2. Validate against `maxStudentsPerBatch` for teacher's plan
3. Check total students across all batches (if plan has `maxTotalStudents`)
4. Block or charge coins if limit exceeded

### **Subscription Renewal**

- Automatic renewal on `endDate`
- Check if teacher has sufficient coins
- If insufficient coins:
  - Send notification
  - Grace period (7 days?)
  - Then downgrade to Free plan

### **Subscription Upgrade/Downgrade**

- **Upgrade**: Immediate, prorated or full month?
- **Downgrade**: 
  - If current usage exceeds new plan limits:
    - Block new additions
    - Allow existing usage (grandfathered) OR
    - Force reduction to fit new plan
  - Effective next billing cycle or immediate?

---

## 💰 Payment Flow

### **Subscription Purchase**

1. Teacher selects plan
2. System checks coin balance
3. If sufficient:
   - Deduct coins
   - Create/update `TeacherSubscription`
   - Update User's subscription info
   - Set `endDate` = now + 30 days
4. If insufficient:
   - Show error with required coins
   - Suggest ways to earn coins

### **Auto-Renewal**

1. Daily cron job checks subscriptions expiring in 24 hours
2. For subscriptions with `autoRenew: true`:
   - Check coin balance
   - If sufficient: Renew automatically
   - If insufficient: Send notification
3. On expiration:
   - If not renewed: Downgrade to Free plan
   - Notify teacher

---

## 📱 API Endpoints Needed

### **Subscription Management**

```
GET    /api/subscriptions/plans          # Get all available plans
GET    /api/subscriptions/current        # Get teacher's current subscription
POST   /api/subscriptions/subscribe      # Subscribe to a plan
POST   /api/subscriptions/cancel         # Cancel subscription (no auto-renew)
POST   /api/subscriptions/upgrade        # Upgrade to higher plan
POST   /api/subscriptions/downgrade      # Downgrade to lower plan
GET    /api/subscriptions/history        # Get subscription history
```

### **Batch Limits Check**

```
GET    /api/batches/limits               # Get current usage vs limits
```

---

## 🎨 UI/UX Considerations

### **Subscription Page**

- Display all available plans in cards
- Highlight current plan
- Show "Upgrade" or "Downgrade" buttons
- Display usage stats (batches used, students used)
- Show renewal date and auto-renew status

### **Batch Creation/Edit**

- Show current limits prominently
- Warn when approaching limits
- Block creation/addition if limit exceeded
- Show upgrade prompt when limit reached

### **Dashboard**

- Display subscription status
- Show days until renewal
- Display usage vs limits (progress bars)
- Quick upgrade button if near limits

---

## 🔄 Migration Strategy

### **Existing Teachers**

- All existing teachers start on Free plan
- Existing batches:
  - If teacher has > 1 batch: Allow to keep, but block new batch creation
  - If batch has > 10 students: Allow to keep, but block new student additions
- Grace period: 30 days to upgrade or reduce usage

### **Data Migration**

1. Create default "Free" plan in database
2. Assign all teachers to Free plan
3. Create initial `TeacherSubscription` records
4. Validate existing batches against new limits

---

## ❓ Open Questions

1. **Pricing**: Which pricing model do you prefer? (Fixed tiers vs. pay-per-use)
2. **Overage**: Allow overage with charges or hard limits?
3. **Grace Period**: How long after expiration before downgrade?
4. **Proration**: Prorate upgrades/downgrades or full month only?
5. **Trial Period**: Offer free trial for paid plans?
6. **Student Limits**: Per batch limit only, or total students across all batches?
7. **Batch Limits**: Hard limit or allow overage with coin charges?
8. **Cancellation**: Immediate or end of billing period?
9. **Refunds**: Allow refunds for unused portion?
10. **Coins Source**: Can teachers buy coins with real money, or only earn them?

---

## 🚀 Implementation Phases

### **Phase 1: Core Infrastructure**
- Create SubscriptionPlan model
- Create TeacherSubscription model
- Update User model
- Create default plans (Free, Starter, Professional, Enterprise)

### **Phase 2: Validation Logic**
- Add batch creation limits
- Add student addition limits
- Create middleware/helpers for limit checking

### **Phase 3: Subscription Management**
- Create subscription API endpoints
- Implement purchase flow
- Implement auto-renewal logic

### **Phase 4: UI Integration**
- Create subscription management UI
- Add limit indicators in batch management
- Add upgrade prompts

### **Phase 5: Monitoring & Analytics**
- Track subscription metrics
- Monitor usage patterns
- Create admin dashboard for subscriptions

---

## 📝 Next Steps

1. **Decide on pricing model** (Fixed tiers recommended for simplicity)
2. **Finalize plan tiers and pricing** (coins/month)
3. **Decide on overage policy** (hard limits vs. charges)
4. **Define premium features** beyond batch limits
5. **Create database schema** and models
6. **Implement validation logic**
7. **Build API endpoints**
8. **Create UI components**

---

## 💭 Recommendations

1. **Start Simple**: Begin with fixed tiers (Free, Starter, Professional)
2. **Clear Limits**: Make limits very clear to teachers
3. **Fair Pricing**: Ensure teachers can earn enough coins through normal usage
4. **Grace Period**: 7-day grace period after expiration
5. **Usage Dashboard**: Show clear usage vs. limits
6. **Easy Upgrade**: Make upgrading seamless
7. **Value Proposition**: Ensure paid plans offer clear value

---

**Last Updated**: [Current Date]
**Status**: Brainstorming Phase

