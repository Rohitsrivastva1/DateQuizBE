# DateQuiz Backend - Production Deployment Guide

## Overview
This guide covers deploying the DateQuiz backend API to production servers.

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: 20GB+ available space
- **CPU**: 2+ cores recommended

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl (for health checks)

## Quick Deployment

### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd DateQuizBE

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh production
```

### 2. Verify Deployment
```bash
# Check if containers are running
docker-compose ps

# Check application health
curl http://localhost:5000/health

# View logs
docker-compose logs -f
```

## Manual Deployment

### 1. Environment Setup
```bash
# Create environment file
cat > .env << EOF
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=datequiz_prod
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
JWT_SECRET=your_super_secret_jwt_key_change_in_production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
EOF
```

### 2. Start Services
```bash
# Build and start containers
docker-compose up -d --build

# Check status
docker-compose ps
```

### 3. Database Migration
The database schema and initial data will be automatically loaded from:
- `partner_turn_schema.sql` - Database schema
- `partner_decks_data.sql` - Initial question data

## Production Configuration

### Security Settings
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for your frontend domain
- **Helmet**: Security headers enabled
- **JWT**: 7-day token expiration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment | Yes | production |
| `DB_HOST` | Database host | Yes | postgres |
| `DB_PORT` | Database port | No | 5432 |
| `DB_NAME` | Database name | Yes | datequiz_prod |
| `DB_USER` | Database user | Yes | postgres |
| `DB_PASSWORD` | Database password | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `PORT` | Application port | No | 5000 |
| `FRONTEND_URL` | Frontend domain | No | - |

## Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl http://your-domain:5000/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-01-27T10:30:00Z",
  "environment": "production"
}
```

### Logs
```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres

# View all logs
docker-compose logs -f
```

### Backup Database
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres datequiz_prod > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres datequiz_prod < backup.sql
```

### Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Common Issues

#### 1. Application won't start
```bash
# Check logs
docker-compose logs app

# Check if database is ready
docker-compose logs postgres
```

#### 2. Database connection issues
```bash
# Check database status
docker-compose exec postgres psql -U postgres -c "SELECT version();"

# Check database exists
docker-compose exec postgres psql -U postgres -l
```

#### 3. Port conflicts
```bash
# Check what's using port 5000
sudo netstat -tulpn | grep :5000

# Change port in docker-compose.yml if needed
```

### Performance Tuning

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_partner_turn_answers ON partner_turn_questions USING GIN (answers);
CREATE INDEX CONCURRENTLY idx_partner_turn_created_at ON partner_turn_questions (created_at);
```

#### Application Optimization
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=2048"`
- Enable PM2 for process management
- Use Redis for caching (optional)

## SSL/HTTPS Setup

### Using Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Scaling

### Horizontal Scaling
```bash
# Scale application containers
docker-compose up -d --scale app=3

# Use load balancer (nginx/haproxy) in front
```

### Database Scaling
- Use PostgreSQL read replicas
- Implement connection pooling
- Consider managed database services

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong JWT secret
- [ ] Configure firewall rules
- [ ] Enable SSL/HTTPS
- [ ] Set up monitoring
- [ ] Regular security updates
- [ ] Database backups
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers enabled

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify health: `curl http://localhost:5000/health`
3. Check container status: `docker-compose ps`
4. Review this documentation
5. Contact development team 