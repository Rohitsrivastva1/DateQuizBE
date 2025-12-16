# Daily Questions System Improvements

## Overview

This document outlines the improvements made to the Daily Questions System as part of Phase 1.1 of the Strategic Next Plan. These changes fix database schema issues and add advanced features including question history, analytics, and partner answer comparison views.

---

## 🔧 Database Schema Fixes

### Issues Fixed

1. **Column Name Mismatches**
   - `daily_questions.question` → `daily_questions.question_text`
   - `user_daily_answers.answer` → `user_daily_answers.answer_text`

2. **Missing Column**
   - Ensured `question_date` column exists in `daily_questions` table

3. **Missing Indexes**
   - Added performance indexes for better query performance

### Running the Fix Script

```bash
cd DateQuizBE
node fix-daily-questions-schema.js
```

The script will:
- ✅ Check current schema
- ✅ Rename columns if needed
- ✅ Add missing columns
- ✅ Create/update indexes
- ✅ Verify the final schema

**Note**: This script is safe to run multiple times. It checks for existing columns before making changes.

---

## ✨ New Features Added

### 1. Enhanced Question History

**Endpoint**: `GET /api/daily-questions/history`

**Query Parameters**:
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page

**Response**:
```json
{
  "success": true,
  "history": [
    {
      "questionId": 1,
      "text": "What is your biggest dream?",
      "category": "deep",
      "date": "2025-01-15",
      "userAnswer": {
        "text": "To travel the world together",
        "answeredAt": "2025-01-15T10:30:00Z"
      },
      "partnerAnswer": {
        "text": "To build a home together",
        "answeredAt": "2025-01-15T11:00:00Z"
      },
      "bothAnswered": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Improvements**:
- ✅ Proper partner lookup (handles users without partners)
- ✅ Pagination support
- ✅ Both answers included when available
- ✅ Better structured response format

---

### 2. Partner Answer Comparison

**Endpoint**: `GET /api/daily-questions/comparison/:questionId`

**Response**:
```json
{
  "success": true,
  "question": {
    "id": 1,
    "text": "What is your biggest dream?",
    "category": "deep",
    "date": "2025-01-15"
  },
  "answers": {
    "user": {
      "username": "user1",
      "answer": "To travel the world together",
      "answeredAt": "2025-01-15T10:30:00Z"
    },
    "partner": {
      "username": "user2",
      "answer": "To build a home together",
      "answeredAt": "2025-01-15T11:00:00Z"
    },
    "timeDifference": {
      "seconds": 1800,
      "minutes": 30,
      "hours": 0,
      "answeredFirst": "user"
    },
    "bothAnswered": true
  }
}
```

**Features**:
- ✅ Side-by-side comparison of both answers
- ✅ Time difference calculation
- ✅ Shows who answered first
- ✅ Works only for users with partners

---

### 3. Daily Questions Analytics

**Endpoint**: `GET /api/daily-questions/analytics`

**Query Parameters**:
- `days` (optional, default: 30) - Number of days to analyze

**Response**:
```json
{
  "success": true,
  "period": {
    "days": 30,
    "startDate": "2024-12-16",
    "endDate": "2025-01-15"
  },
  "overall": {
    "totalQuestions": 30,
    "userAnswered": 25,
    "partnerAnswered": 24,
    "bothAnswered": 23,
    "userAnswerRate": "83.3",
    "partnerAnswerRate": "80.0",
    "completionRate": "76.7"
  },
  "byCategory": [
    {
      "category": "deep",
      "totalQuestions": 10,
      "answeredCount": 8,
      "answerRate": "80.0"
    }
  ],
  "dailyActivity": [
    {
      "date": "2025-01-15",
      "questionsAvailable": 1,
      "userAnswered": 1,
      "partnerAnswered": 1
    }
  ],
  "answerTiming": [
    {
      "hour": 9,
      "answerCount": 5
    }
  ],
  "hasPartner": true
}
```

**Features**:
- ✅ Overall statistics (answer rates, completion rates)
- ✅ Category breakdown
- ✅ Daily activity for last 7 days
- ✅ Answer timing analysis (hour of day)
- ✅ Works with or without partner

---

## 📊 Database Schema

### `daily_questions` Table

```sql
CREATE TABLE daily_questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,           -- Fixed: was 'question'
    category VARCHAR(50) DEFAULT 'general',
    question_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- Ensured exists
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `user_daily_answers` Table

```sql
CREATE TABLE user_daily_answers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_text TEXT NOT NULL,            -- Fixed: was 'answer'
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES daily_questions(id) ON DELETE CASCADE,
    UNIQUE(user_id, question_id)
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_daily_questions_date ON daily_questions(question_date, is_active);
CREATE INDEX idx_daily_questions_category ON daily_questions(category);
CREATE INDEX idx_user_daily_answers_user_id ON user_daily_answers(user_id);
CREATE INDEX idx_user_daily_answers_question_id ON user_daily_answers(question_id);
CREATE INDEX idx_user_daily_answers_answered_at ON user_daily_answers(answered_at);
CREATE INDEX idx_user_daily_answers_user_question ON user_daily_answers(user_id, question_id);
```

---

## 🧪 Testing

### Test Schema Fix

```bash
cd DateQuizBE
node fix-daily-questions-schema.js
```

### Test API Endpoints

1. **Test Question History**:
```bash
curl -X GET "http://localhost:5000/api/daily-questions/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Test Partner Comparison**:
```bash
curl -X GET "http://localhost:5000/api/daily-questions/comparison/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Test Analytics**:
```bash
curl -X GET "http://localhost:5000/api/daily-questions/analytics?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Implementation Checklist

- [x] Fix database schema column mismatches
- [x] Add question_date column support
- [x] Create schema fix script
- [x] Enhance question history endpoint
- [x] Add partner answer comparison endpoint
- [x] Add analytics endpoint
- [x] Update routes
- [x] Test all endpoints
- [ ] Update frontend to use new endpoints
- [ ] Add UI for analytics dashboard
- [ ] Add UI for partner comparison view

---

## 🚀 Next Steps

1. **Frontend Integration**
   - Update daily questions page to use enhanced history
   - Add analytics dashboard component
   - Add partner comparison view component

2. **Advanced Features** (Future)
   - Scheduled questions system
   - Fallback question system (if no question for today)
   - Question recommendations based on history
   - Export analytics as PDF/CSV

3. **Performance Optimization**
   - Add caching for analytics queries
   - Optimize partner lookup queries
   - Add database query monitoring

---

## 📚 Related Documentation

- [Strategic Next Plan](../datequiz-web/STRATEGIC_NEXT_PLAN.md)
- [Daily Question Feature Docs](../docs/technical/DAILY_QUESTION_FEATURE.md)
- [API Documentation](../docs/api/)

---

**Last Updated**: 2025  
**Status**: ✅ Schema fixes complete, new endpoints added

