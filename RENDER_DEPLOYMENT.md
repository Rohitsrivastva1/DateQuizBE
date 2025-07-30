# DateQuiz Backend - Render + Supabase Deployment Guide

## Overview
This guide covers deploying the DateQuiz backend API to Render.com with Supabase PostgreSQL database.

## Prerequisites
- Render account
- Supabase account and project
- Git repository with your code

## Quick Deployment

### 1. Set Up Supabase Database

#### Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and region
4. Set database password
5. Wait for project to be ready

#### Get Database Credentials
1. Go to Settings → Database
2. Copy these values:
   - **Host**: `db.xxxxxxxxxxxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: Your database password

### 2. Deploy to Render

#### Connect Repository
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub/GitLab repository
4. Select the `DateQuizBE` directory

#### Configure Service
- **Name**: `datequiz-backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free (or paid for better performance)

#### Set Environment Variables
In Render dashboard → Environment:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment |
| `PORT` | `10000` | Render port |
| `SUPABASE_DB_HOST` | `db.xxxxxxxxxxxx.supabase.co` | Supabase host |
| `SUPABASE_DB_PORT` | `5432` | Database port |
| `SUPABASE_DB_NAME` | `postgres` | Database name |
| `SUPABASE_DB_USER` | `postgres` | Database user |
| `SUPABASE_DB_PASSWORD` | `your-db-password` | Database password |
| `SUPABASE_DB_CA` | `(optional)` | SSL certificate |
| `JWT_SECRET` | Auto-generated | JWT signing secret |
| `FRONTEND_URL` | Your frontend URL | CORS origin |

### 3. Database Migration
The `migrate.js` script will run automatically on deployment and:
1. Create database tables
2. Insert initial question data
3. Set up indexes

## Manual Setup

### 1. Supabase Database Setup

#### Create Tables
Run the SQL from `partner_turn_schema.sql` in Supabase SQL Editor:

```sql
-- Partner Turn Questions Table
CREATE TABLE IF NOT EXISTS partner_turn_questions (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    deck_id INTEGER NOT NULL REFERENCES packs(id),
    requester_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting_receiver' CHECK (status IN ('waiting_requester', 'waiting_receiver', 'complete')),
    answers JSONB NOT NULL DEFAULT '{}',
    notifications_sent JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_partner_turn_requester ON partner_turn_questions(requester_id);
CREATE INDEX IF NOT EXISTS idx_partner_turn_receiver ON partner_turn_questions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_partner_turn_status ON partner_turn_questions(status);
CREATE INDEX IF NOT EXISTS idx_partner_turn_created ON partner_turn_questions(created_at);
```

#### Insert Initial Data
Run the SQL from `partner_decks_data.sql` in Supabase SQL Editor.

### 2. Render Configuration

#### Environment Variables
Set these in Render dashboard:

```bash
NODE_ENV=production
PORT=10000
SUPABASE_DB_HOST=db.xxxxxxxxxxxx.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=https://your-frontend-app.onrender.com
```

## Verification

### 1. Check Deployment
```bash
# Your API will be available at:
https://your-app-name.onrender.com

# Health check:
https://your-app-name.onrender.com/health
```

### 2. Test Database Connection
```bash
# Check if migration ran successfully
# Look for these logs in Render dashboard:
# "Starting database migration for Supabase..."
# "Creating schema..."
# "Inserting initial data..."
# "✅ Migration completed successfully!"
```

### 3. Test Endpoints
```bash
# Health check
curl https://your-app-name.onrender.com/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-01-27T10:30:00Z",
  "environment": "production"
}
```

## Environment Variables Reference

### Required Supabase Variables
- `SUPABASE_DB_HOST`: Supabase database host
- `SUPABASE_DB_NAME`: Database name (usually `postgres`)
- `SUPABASE_DB_USER`: Database user (usually `postgres`)
- `SUPABASE_DB_PASSWORD`: Database password
- `JWT_SECRET`: JWT signing secret

### Optional Variables
- `SUPABASE_DB_PORT`: Port (default: 5432)
- `SUPABASE_DB_CA`: SSL certificate (optional)
- `NODE_ENV`: Environment (default: production)
- `PORT`: Port (default: 10000)
- `FRONTEND_URL`: Frontend domain for CORS

## Supabase Benefits

### Database Features
- **Real-time subscriptions** (if needed later)
- **Row Level Security** (RLS)
- **Automatic backups**
- **Point-in-time recovery**
- **Database logs**
- **Connection pooling**

### Security
- **SSL/TLS encryption**
- **Network isolation**
- **IP allowlisting**
- **Audit logs**

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check Supabase connection
# Verify credentials in Supabase dashboard
# Ensure SSL is enabled
# Check if database is active
```

#### 2. Migration Failures
```bash
# Check migrate.js logs in Render
# Verify SQL files are present
# Check database permissions
# Ensure tables don't already exist
```

#### 3. SSL Issues
```bash
# Supabase requires SSL
# Check SSL configuration in production.js
# Verify SSL certificate if using custom CA
```

### Debug Commands
```bash
# View Render logs
# Use Render dashboard → Logs

# Check Supabase logs
# Use Supabase dashboard → Logs

# Test database connection
# Use Supabase SQL Editor
```

## Performance Optimization

### Supabase Free Tier
- **500MB database**
- **2GB bandwidth**
- **50MB file storage**
- **2 million row reads/month**
- **50,000 row writes/month**

### Paid Plans
- **Unlimited database size**
- **Unlimited bandwidth**
- **Unlimited file storage**
- **Unlimited row operations**

## Security

### Supabase Security
- **Automatic SSL/TLS**
- **Network isolation**
- **IP allowlisting**
- **Audit logs**
- **Row Level Security**

### Application Security
- **Rate limiting**: 100 requests per 15 minutes
- **CORS**: Configured for your frontend
- **Helmet**: Security headers
- **JWT**: 7-day token expiration

## Monitoring

### Render Monitoring
- **Application logs**
- **Deployment history**
- **Health checks**
- **Performance metrics**

### Supabase Monitoring
- **Database logs**
- **Connection metrics**
- **Query performance**
- **Storage usage**

## Backup & Recovery

### Supabase Backups
- **Automatic daily backups**
- **Point-in-time recovery**
- **Manual backup export**
- **Cross-region replication** (paid)

### Application Backups
- **Git repository** serves as code backup
- **Environment variables** in Render
- **Database schema** in SQL files

## Next Steps

1. **Deploy to Render** with Supabase
2. **Update frontend** to use new API URL
3. **Test all endpoints**
4. **Set up monitoring**
5. **Configure custom domain** (optional)
6. **Set up Supabase real-time** (if needed) 