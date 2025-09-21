# Admin API Documentation

## Overview
This document describes the admin panel API endpoints for the DateQuiz backend. The admin system provides comprehensive management capabilities for users, content, and system administration.

## Base URL
`/api/admin`

## Authentication
All admin endpoints (except login) require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <admin_jwt_token>
```

## Default Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`
- **Email:** `admin@datequiz.com`

---

## 🔐 Authentication Endpoints

### Admin Login
- **Endpoint:** `POST /api/admin/auth/login`
- **Description:** Authenticate admin user
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "jwt_token_here",
    "admin": {
      "id": 1,
      "username": "admin",
      "email": "admin@datequiz.com",
      "role": "super_admin",
      "permissions": {...}
    }
  }
  ```

### Get Admin Profile
- **Endpoint:** `GET /api/admin/auth/profile`
- **Authentication:** Required
- **Response:** Admin profile information

### Update Admin Profile
- **Endpoint:** `PUT /api/admin/auth/profile`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "full_name": "Admin Name",
    "email": "admin@example.com"
  }
  ```

### Change Password
- **Endpoint:** `PUT /api/admin/auth/change-password`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "current_password": "old_password",
    "new_password": "new_password"
  }
  ```

---

## 👥 User Management Endpoints

### Get All Users
- **Endpoint:** `GET /api/admin/users`
- **Authentication:** Required (users permission)
- **Query Parameters:**
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 20)
  - `search` (string): Search by username or email
  - `status` (string): Filter by user status
  - `city` (string): Filter by city
  - `age_min` (number): Minimum age filter
  - `age_max` (number): Maximum age filter
  - `sort_by` (string): Sort field
  - `sort_order` (string): ASC or DESC

### Get User by ID
- **Endpoint:** `GET /api/admin/users/:id`
- **Authentication:** Required (users permission)
- **Response:** Complete user information with insights

### Update User
- **Endpoint:** `PUT /api/admin/users/:id`
- **Authentication:** Required (users permission)
- **Request Body:**
  ```json
  {
    "username": "new_username",
    "email": "new_email@example.com",
    "age": 25,
    "city": "New York",
    "status": "active",
    "email_verified": true
  }
  ```

### Reset User Password
- **Endpoint:** `PUT /api/admin/users/:id/reset-password`
- **Authentication:** Required (users permission)
- **Request Body:**
  ```json
  {
    "new_password": "new_password123"
  }
  ```

### Delete User
- **Endpoint:** `DELETE /api/admin/users/:id`
- **Authentication:** Required (users permission)
- **Response:** Success message

### Get User Statistics
- **Endpoint:** `GET /api/admin/users/stats`
- **Authentication:** Required (users permission)
- **Response:** User analytics and demographics

### Get User Activity Logs
- **Endpoint:** `GET /api/admin/users/:id/activity`
- **Authentication:** Required (users permission)
- **Response:** User's activity history

---

## 📚 Content Management Endpoints

### Question Categories

#### Get All Categories
- **Endpoint:** `GET /api/admin/categories`
- **Authentication:** Required (categories permission)
- **Query Parameters:**
  - `page`, `limit`, `search`, `is_active`

#### Create Category
- **Endpoint:** `POST /api/admin/categories`
- **Authentication:** Required (categories permission)
- **Request Body:**
  ```json
  {
    "name": "Romance",
    "description": "Romantic questions",
    "color": "#FF6B6B",
    "icon": "💕",
    "sort_order": 1
  }
  ```

#### Update Category
- **Endpoint:** `PUT /api/admin/categories/:id`
- **Authentication:** Required (categories permission)

#### Delete Category
- **Endpoint:** `DELETE /api/admin/categories/:id`
- **Authentication:** Required (categories permission)

### Questions

#### Get All Questions
- **Endpoint:** `GET /api/admin/questions`
- **Authentication:** Required (questions permission)
- **Query Parameters:**
  - `page`, `limit`, `search`, `pack_id`, `category_id`, `is_active`, `is_premium`, `difficulty_level`

#### Get Question by ID
- **Endpoint:** `GET /api/admin/questions/:id`
- **Authentication:** Required (questions permission)

#### Create Question
- **Endpoint:** `POST /api/admin/questions`
- **Authentication:** Required (questions permission)
- **Request Body:**
  ```json
  {
    "pack_id": 1,
    "category_id": 1,
    "question_text": "What is your favorite date idea?",
    "question_type": "text",
    "difficulty_level": 2,
    "is_premium": false,
    "tags": ["romance", "dates"]
  }
  ```

#### Update Question
- **Endpoint:** `PUT /api/admin/questions/:id`
- **Authentication:** Required (questions permission)

#### Delete Question
- **Endpoint:** `DELETE /api/admin/questions/:id`
- **Authentication:** Required (questions permission)

---

## 📧 Email Management Endpoints

### Send Email to User
- **Endpoint:** `POST /api/admin/emails/send-user`
- **Authentication:** Required (emails permission)
- **Request Body:**
  ```json
  {
    "user_id": 123,
    "subject": "Welcome to DateQuiz!",
    "content": "<h1>Welcome!</h1><p>Thank you for joining us.</p>",
    "email_type": "announcement"
  }
  ```

### Send Bulk Email
- **Endpoint:** `POST /api/admin/emails/send-bulk`
- **Authentication:** Required (emails permission)
- **Request Body:**
  ```json
  {
    "subject": "App Update",
    "content": "<h1>New Features!</h1><p>Check out our latest updates.</p>",
    "email_type": "announcement",
    "target_audience": "all",
    "target_criteria": {
      "city": "New York",
      "age_min": 18,
      "age_max": 35
    }
  }
  ```

### Get Email Campaigns
- **Endpoint:** `GET /api/admin/emails/campaigns`
- **Authentication:** Required (emails permission)
- **Query Parameters:** `page`, `limit`, `status`, `email_type`

### Get Campaign Details
- **Endpoint:** `GET /api/admin/emails/campaigns/:id`
- **Authentication:** Required (emails permission)

### Delete Campaign
- **Endpoint:** `DELETE /api/admin/emails/campaigns/:id`
- **Authentication:** Required (emails permission)

---

## 📊 Analytics Endpoints

### Dashboard Analytics
- **Endpoint:** `GET /api/admin/analytics/dashboard`
- **Authentication:** Required (analytics permission)
- **Response:** Overall system statistics and trends

### User Insights
- **Endpoint:** `GET /api/admin/analytics/user-insights`
- **Authentication:** Required (analytics permission)
- **Response:** User engagement metrics and behavior analysis

---

## ⚙️ System Settings Endpoints

### Get System Settings
- **Endpoint:** `GET /api/admin/settings`
- **Authentication:** Required (settings permission)
- **Response:** All system configuration settings

### Update System Settings
- **Endpoint:** `PUT /api/admin/settings`
- **Authentication:** Required (settings permission)
- **Request Body:**
  ```json
  {
    "settings": {
      "app_name": "DateQuiz",
      "max_daily_questions": 1,
      "maintenance_mode": false
    }
  }
  ```

---

## 🔍 Activity Logs

### Get Admin Activity Logs
- **Endpoint:** `GET /api/admin/auth/activity-logs`
- **Authentication:** Required
- **Query Parameters:** `page`, `limit`, `admin_id`, `action`

---

## 🛡️ Permission System

### Admin Roles
- **super_admin:** Full access to all features
- **admin:** Standard admin access
- **moderator:** Limited access to content management

### Permissions
- **users:** User management
- **questions:** Question management
- **categories:** Category management
- **emails:** Email system
- **analytics:** Analytics and insights
- **settings:** System settings

---

## 📝 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes
- **200:** Success
- **201:** Created
- **400:** Bad Request
- **401:** Unauthorized
- **403:** Forbidden
- **404:** Not Found
- **409:** Conflict
- **500:** Internal Server Error

---

## 🚀 Getting Started

1. **Run Migration:**
   ```bash
   npm run migrate
   ```

2. **Start Server:**
   ```bash
   npm start
   ```

3. **Login as Admin:**
   ```bash
   curl -X POST http://localhost:5000/api/admin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

4. **Use Admin Token:**
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:5000/api/admin/users
   ```

---

## 🔧 Environment Variables

Add these to your `.env` file for email functionality:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@datequiz.com
```

---

## 📱 Frontend Integration

The admin panel is designed to work with any frontend framework. Key features for frontend implementation:

1. **Authentication Flow:** Login → Store token → Use in all requests
2. **Permission-based UI:** Show/hide features based on admin permissions
3. **Real-time Updates:** Use WebSocket or polling for live data
4. **File Uploads:** For question images and admin avatars
5. **Data Tables:** Pagination, sorting, filtering for all list views
6. **Charts:** For analytics and insights visualization

This admin system provides everything needed to manage your DateQuiz application effectively!

