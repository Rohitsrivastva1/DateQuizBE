# Development Setup Guide

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Local PostgreSQL Database

#### Option A: Using Docker
```bash
# Start PostgreSQL with Docker
docker run --name datequiz-db \
  -e POSTGRES_DB=datequiz \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15

# Wait for database to be ready
sleep 10
```

#### Option B: Install PostgreSQL Locally
1. Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
2. Create a database named `datequiz`
3. Set up a user with appropriate permissions

### 3. Create .env File
Create a `.env` file in the root directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=datequiz
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 4. Set Up Database Schema
```bash
# Run the migration script
npm run migrate
```

Or manually run the SQL files in your PostgreSQL client:
1. Run `partner_turn_schema.sql`
2. Run `partner_decks_data.sql`

### 5. Start Development Server
```bash
# Start with nodemon (auto-restart on changes)
npm run dev

# Or start normally
npm start
```

### 6. Test the API
```bash
# Health check
curl http://localhost:5000/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-01-27T10:30:00Z",
  "environment": "development"
}
```

## Troubleshooting

### Database Connection Issues
1. **Check if PostgreSQL is running:**
   ```bash
   # On Windows
   net start postgresql-x64-15
   
   # On macOS
   brew services start postgresql
   
   # On Linux
   sudo systemctl start postgresql
   ```

2. **Verify database credentials:**
   ```bash
   psql -h localhost -U postgres -d datequiz
   ```

3. **Check environment variables:**
   ```bash
   # Make sure .env file exists and has correct values
   cat .env
   ```

### Common Issues

#### 1. "client password must be a string"
- **Solution**: Check your `.env` file and ensure `DB_PASSWORD` is set correctly
- **Fix**: Make sure the password is a string, not undefined

#### 2. "connection refused"
- **Solution**: PostgreSQL is not running
- **Fix**: Start PostgreSQL service

#### 3. "database does not exist"
- **Solution**: Create the database
- **Fix**: `createdb -U postgres datequiz`

#### 4. "permission denied"
- **Solution**: User doesn't have proper permissions
- **Fix**: Grant permissions: `GRANT ALL PRIVILEGES ON DATABASE datequiz TO postgres;`

## Development vs Production

### Development (Local)
- Uses local PostgreSQL
- No SSL required
- Environment variables from `.env` file
- Debug logging enabled

### Production (Render + Supabase)
- Uses Supabase PostgreSQL
- SSL required
- Environment variables from Render dashboard
- Minimal logging

## API Endpoints for Testing

### Authentication
```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"testuser","email":"test@example.com","password":"password123","age":25,"city":"New York"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

### Packs
```bash
# Get all packs
curl http://localhost:5000/api/packs

# Get questions by pack
curl http://localhost:5000/api/packs/1/questions
```

### Partner Features
```bash
# Get partner decks (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/partner-turn/decks
```

## Next Steps

1. **Set up your local database**
2. **Create the `.env` file**
3. **Run the migration**
4. **Start the development server**
5. **Test the endpoints**
6. **Connect your frontend**

## Production Deployment

When ready for production:
1. **Deploy to Render** (see `RENDER_DEPLOYMENT.md`)
2. **Set up Supabase database**
3. **Configure environment variables in Render**
4. **Update frontend to use production API URL** 