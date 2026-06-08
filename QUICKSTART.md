# 🚀 Travel & Lifestyle - Quick Start Guide

Get your backend running in **5 minutes**!

---

## Prerequisites

Install these first:
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 14+](https://www.postgresql.org/download/)
- [Redis 6+](https://redis.io/download)

---

## Method 1: Docker (Easiest) 🐳

```bash
# 1. Navigate to backend
cd backend

# 2. Create environment file
cp .env.example .env

# 3. Edit .env - Set these REQUIRED values:
nano .env
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# - APTOS_MODULE_ADDRESS (your deployed contract address)
# - ADMIN_PRIVATE_KEY (your Aptos admin private key)

# 4. Start everything (PostgreSQL + Redis + Backend)
docker-compose up -d

# 5. Run database migrations
docker-compose exec backend npx prisma migrate deploy

# 6. Check if it's running
curl http://localhost:3001/health
```

**Done!** API is running at `http://localhost:3001`

---

## Method 2: Manual Setup 💻

```bash
# 1. Start PostgreSQL
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# 2. Start Redis
# macOS: brew services start redis
# Linux: sudo systemctl start redis

# 3. Create database
psql -U postgres -c "CREATE DATABASE travel_lifestyle;"

# 4. Navigate to backend
cd backend

# 5. Install dependencies
npm install

# 6. Configure environment
cp .env.example .env
nano .env  # Edit required values

# 7. Setup database
npm run db:generate
npm run db:migrate

# 8. Start server
npm run dev
```

**Done!** API is running at `http://localhost:3001`

---

## Required Environment Variables

Edit `backend/.env` and set these:

```env
# Database (default works for local PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/travel_lifestyle"

# JWT Secret (GENERATE A NEW ONE!)
JWT_SECRET=REPLACE_WITH_OUTPUT_FROM_COMMAND_BELOW

# Aptos (from your deployed contracts)
APTOS_MODULE_ADDRESS=0x...  # YOUR MODULE ADDRESS
ADMIN_PRIVATE_KEY=0x...     # YOUR PRIVATE KEY
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Deploy Smart Contracts First

Before running backend, deploy Move contracts:

```bash
# From project root
cd ..

# Install Aptos CLI (first time only)
# Download from: https://github.com/aptos-labs/aptos-core/releases

# Initialize account
aptos init --network testnet

# Compile contracts
aptos move compile

# Deploy to testnet
aptos move publish --named-addresses travel_lifestyle=<YOUR_ADDRESS>

# Copy the module address to .env
```

---

## Test the API

```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "aptosAddress": "0x123..."
  }'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## Troubleshooting

### Database connection failed?
```bash
# Check PostgreSQL is running
pg_isadmin

# Try manual connection
psql -U postgres -d travel_lifestyle
```

### Redis connection failed?
```bash
# Check Redis is running
redis-cli ping  # Should return PONG
```

### Port 3001 already in use?
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
```

### Module not found errors?
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## What You Get

- ✅ **Authentication** - Register, login, JWT tokens
- ✅ **Travel Cards** - Create, load funds, convert to crypto
- ✅ **Database** - PostgreSQL with Prisma ORM
- ✅ **Caching** - Redis for performance
- ✅ **Blockchain** - Aptos integration ready
- ✅ **Security** - Rate limiting, CORS, Helmet
- ✅ **Logging** - Winston with file rotation
- ✅ **Docker** - Ready for deployment

---

## API Endpoints

**Base URL:** `http://localhost:3001/api/v1`

### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Travel Cards
- `POST /cards` - Create travel card
- `GET /cards/my` - Get your card
- `POST /cards/load-funds` - Add funds
- `POST /cards/convert-to-crypto` - Convert to crypto

---

## View Logs

```bash
# Application logs
tail -f backend/logs/combined.log

# Error logs only
tail -f backend/logs/error.log

# Docker logs
docker-compose logs -f backend
```

---

## Database GUI

```bash
cd backend
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555`

---

## Stop Services

### Docker
```bash
docker-compose down
```

### Manual
```bash
# Stop dev server: Ctrl+C

# Stop PostgreSQL
brew services stop postgresql  # macOS
sudo systemctl stop postgresql # Linux

# Stop Redis
brew services stop redis       # macOS
sudo systemctl stop redis      # Linux
```

---

## Next Steps

1. ✅ Backend running - **YOU ARE HERE**
2. 📱 Build frontend (React/Vue/Next.js)
3. 🎨 Add NFT endpoints
4. 🎯 Add Points Exchange endpoints
5. 🧪 Write tests
6. 🚀 Deploy to production

---

## Documentation

- **Full API Docs:** `backend/README.md`
- **Setup Guide:** `backend/SETUP_GUIDE.md`
- **Backend Summary:** `BACKEND_SUMMARY.md`
- **Move Standards:** `CLAUDE.md`

---

## Need Help?

1. Check logs: `tail -f backend/logs/combined.log`
2. Read `backend/SETUP_GUIDE.md` for detailed troubleshooting
3. Open GitHub issue with error details

---

## Success Checklist

- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` configured
- [ ] Database migrated (`npm run db:migrate`)
- [ ] Smart contracts deployed
- [ ] Server started (`npm run dev`)
- [ ] Health check passes (`curl http://localhost:3001/health`)
- [ ] Can register user
- [ ] Can login

