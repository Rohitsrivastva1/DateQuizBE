# Local Development Setup

## Quick Start

### 1. Install PostgreSQL
Download and install PostgreSQL from: https://www.postgresql.org/download/

### 2. Create Database
```bash
# Create the database
createdb DateQuizDB

# Or using psql
psql -U postgres -c "CREATE DATABASE DateQuizDB;"
```

### 3. Set Environment Variables (Optional)
Create a `.env` file in the root directory:

```env
# Database Configuration (Optional - defaults are already set)
DB_URL=postgres://postgres:9695@localhost:5432/DateQuizDB

# Server Configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 4. Setup Database Tables
Run the migration script:
```bash
npm run migrate
```

### 5. Start Development Server
```bash
npm run dev
```

## Database Configuration

The application uses a simple connection string:

- **Connection String**: `postgres://postgres:9695@localhost:5432/DateQuizDB`
- **Database**: DateQuizDB
- **User**: postgres
- **Password**: 9695
- **SSL**: Disabled (for local development)

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run setup` - Show database setup instructions
- `npm run migrate` - Run database migrations
- `npm start` - Start production server

## Troubleshooting

### Database Connection Issues
1. Make sure PostgreSQL is running
2. Check if the database exists: `psql -l`
3. Verify the connection string in `.env` file
4. Try connecting manually: `psql -U postgres -d DateQuizDB`

### Port Issues
- Change PORT in `.env` if 5000 is already in use
- Make sure no other service is using the port

## API Endpoints

Once running, your API will be available at:
- **Base URL**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **API Docs**: Check `api.readme` for endpoint details 