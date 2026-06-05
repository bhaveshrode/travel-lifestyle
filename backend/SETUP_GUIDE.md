# Backend Setup Guide

Complete step-by-step guide to set up the Travel & Lifestyle backend API.

## Quick Start (Docker)

The fastest way to get started is using Docker Compose:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create .env file
cp .env.example .env

# 3. Edit .env and set required values (see below)
nano .env

# 4. Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# 5. Run database migrations
docker-compose exec backend npx prisma migrate deploy

# 6. Check logs
docker-compose logs -f backend
```

The API will be available at `http://localhost:3001`

## Manual Setup (Development)

### Step 1: Install Prerequisites

**Required:**
- Node.js 18+ ([download](https://nodejs.org/))
- PostgreSQL 14+ ([download](https://www.postgresql.org/download/))
- Redis 6+ ([download](https://redis.io/download))

**Verify installations:**
```bash
node --version   # Should be v18+
npm --version
psql --version   # Should be 14+
redis-server --version  # Should be 6+
```

### Step 2: PostgreSQL Setup

```bash
# Start PostgreSQL service
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Windows: Start PostgreSQL service from Services

# Create database
psql -U postgres
CREATE DATABASE travel_lifestyle;
\q
```

### Step 3: Redis Setup

```bash
# Start Redis service
# macOS: brew services start redis
# Linux: sudo systemctl start redis
# Windows: Start Redis service or run redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Step 4: Install Dependencies

```bash
cd backend
npm install
```

### Step 5: Environment Configuration

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Database Configuration (update credentials if needed)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/travel_lifestyle?schema=public"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration (generate a strong random secret!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Aptos Configuration (get this after deploying contracts)
APTOS_NETWORK=testnet
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com
APTOS_MODULE_ADDRESS=0x... # YOUR MODULE ADDRESS HERE
ADMIN_PRIVATE_KEY=0x...    # YOUR ADMIN PRIVATE KEY HERE

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**⚠️ IMPORTANT: Generate a Strong JWT Secret**

```bash
# Generate a random 64-character secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 6: Deploy Smart Contracts

Before running the backend, deploy the Move contracts to Aptos testnet:

```bash
# From project root
cd ..

# Install Aptos CLI (if not already installed)
# macOS/Linux: curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
# Or download from: https://github.com/aptos-labs/aptos-core/releases

# Initialize Aptos account (first time only)
aptos init --network testnet

# Compile Move contracts
aptos move compile

# Publish to testnet
aptos move publish --named-addresses travel_lifestyle=<YOUR_ACCOUNT_ADDRESS>

# Copy the module address and update .env
# APTOS_MODULE_ADDRESS=0x...
```

### Step 7: Database Migrations

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Verify database schema
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

### Step 8: Start Development Server

```bash
npm run dev
```

You should see:
```
🚀 Server is running on port 3001
📝 Environment: development
🌐 API URL: http://localhost:3001/api/v1
🏥 Health check: http://localhost:3001/health
Database connected successfully
Redis client connected
```

### Step 9: Test the API

```bash
# Health check
curl http://localhost:3001/health

# API info
curl http://localhost:3001/api/v1

# Register a user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "aptosAddress": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }'
```

## Common Issues & Solutions

### Issue: Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isadmin

# Check connection string
echo $DATABASE_URL

# Try connecting manually
psql "postgresql://postgres:postgres@localhost:5432/travel_lifestyle"
```

### Issue: Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Check Redis logs
# macOS: tail -f /usr/local/var/log/redis.log
# Linux: sudo journalctl -u redis -f
```

### Issue: Prisma Client Not Generated

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate
```

### Issue: Port Already in Use

```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
kill -9 $(lsof -ti:3001)

# Or change port in .env
PORT=3002
```

### Issue: Module Not Found Errors

```bash
# Clear TypeScript build cache
rm -rf dist/
npm run build

# Restart dev server
npm run dev
```

## Production Deployment

### Option 1: Docker Deployment

```bash
# Build image
docker build -t travel-lifestyle-backend .

# Run with environment variables
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_HOST="..." \
  -e JWT_SECRET="..." \
  -e APTOS_MODULE_ADDRESS="..." \
  --name travel-backend \
  travel-lifestyle-backend
```

### Option 2: Traditional Server

```bash
# Build TypeScript
npm run build

# Run migrations
npx prisma migrate deploy

# Start with PM2 (process manager)
npm install -g pm2
pm2 start dist/server.js --name travel-api

# View logs
pm2 logs travel-api

# Monitor
pm2 monit
```

### Option 3: Cloud Platforms

**Heroku:**
```bash
heroku create travel-lifestyle-api
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
git push heroku main
```

**Railway / Render / Fly.io:**
- Connect GitHub repository
- Set environment variables in dashboard
- Deploy automatically on push

## Environment Variables Checklist

Before deploying, ensure all these are set:

- [x] `NODE_ENV=production`
- [x] `DATABASE_URL` (production database)
- [x] `REDIS_HOST` and `REDIS_PASSWORD`
- [x] `JWT_SECRET` (strong random secret)
- [x] `APTOS_MODULE_ADDRESS` (mainnet address)
- [x] `APTOS_NETWORK=mainnet`
- [x] `CORS_ORIGIN` (production frontend URL)
- [x] `ADMIN_PRIVATE_KEY` (secure storage!)

## Database Backup

```bash
# Backup database
pg_dump -U postgres travel_lifestyle > backup.sql

# Restore database
psql -U postgres travel_lifestyle < backup.sql
```

## Monitoring & Logs

```bash
# View application logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log

# View with Docker
docker-compose logs -f backend
```

## Security Checklist

- [ ] Use strong JWT secret (64+ characters)
- [ ] Enable HTTPS in production
- [ ] Set proper CORS origin
- [ ] Enable rate limiting
- [ ] Keep dependencies updated
- [ ] Never commit `.env` file
- [ ] Use environment variables for secrets
- [ ] Enable database SSL in production
- [ ] Set up monitoring and alerts
- [ ] Regular security audits

## Next Steps

1. **Frontend Integration**: Connect React/Vue frontend to this API
2. **Testing**: Write unit and integration tests
3. **CI/CD**: Set up GitHub Actions for automated deployment
4. **Monitoring**: Add Sentry or similar for error tracking
5. **Documentation**: Generate API docs with Swagger/OpenAPI
6. **Performance**: Add database indexes, optimize queries
7. **Features**: Add NFT and Points Exchange endpoints

## Support

For issues or questions:
- Check logs: `npm run dev` or `docker-compose logs`
- Review [README.md](./README.md) for detailed docs
- Open GitHub issue with error details

## Useful Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript
npm start                # Start production server

# Database
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm test                 # Run tests

# Docker
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs
docker-compose ps        # Check status
```

## Architecture Overview

```
┌─────────────────────────────────────┐
│         Client (Frontend)           │
└──────────────┬──────────────────────┘
               │ HTTP/REST
┌──────────────▼──────────────────────┐
│      Express API Server (Port 3001) │
│  ┌────────────────────────────────┐ │
│  │ Routes (Auth, Cards, NFTs)     │ │
│  └───────────┬────────────────────┘ │
│  ┌───────────▼────────────────────┐ │
│  │ Middleware (Auth, Validation)  │ │
│  └───────────┬────────────────────┘ │
│  ┌───────────▼────────────────────┐ │
│  │ Services (Business Logic)      │ │
│  └─┬──────────────────────┬───────┘ │
└────┼──────────────────────┼─────────┘
     │                      │
┌────▼──────────┐    ┌─────▼──────────┐
│   PostgreSQL  │    │  Aptos Network │
│   (Database)  │    │  (Blockchain)  │
└───────────────┘    └────────────────┘
     │
┌────▼──────────┐
│     Redis     │
│    (Cache)    │
└───────────────┘
```

Happy coding! 🚀
