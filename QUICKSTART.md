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
# - ETHEREUM_RPC_URL (Hardhat: http://127.0.0.1:8545)
# - TRAVEL_CARD_ADDRESS, NFTS_ADDRESS, POINTS_ADDRESS
# - PRIVATE_KEY (Hardhat account 0 for local dev)

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

# Ethereum (from your deployed contracts)
ETHEREUM_RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
TRAVEL_CARD_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NFTS_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
POINTS_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Deploy Smart Contracts First

Before running backend, deploy Solidity contracts:

```bash
# From project root
cd ..

# Navigate to contracts directory (create if needed)
mkdir -p contracts
cd contracts

# Install Hardhat (first time only)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialize Hardhat project (if not already initialized)
npx hardhat init

# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Verify contract on Etherscan (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# Copy the contract address to backend/.env
```

**Configure Hardhat Networks:**

Edit `hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.ETHEREUM_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};

export default config;
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
    "ethereumAddress": "0x123..."
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
- ✅ **Blockchain** - Ethereum integration ready
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

1. Backend running
2. Frontend running (`cd frontend && npm run dev`)
3. Contract tests (`cd contracts && npm test`)
4. Backend tests (`cd backend && npm test`)
5. Frontend tests (not added yet)
6. Deploy to production

---

## Documentation

- **Full API Docs:** `backend/README.md`
- **Setup Guide:** `backend/SETUP_GUIDE.md`
- **Backend Summary:** `BACKEND_SUMMARY.md`
- **Contracts:** `contracts/README.md`
- **Migration notes:** `ETHEREUM_MIGRATION.md`

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
- [ ] Smart contracts deployed (Hardhat)
- [ ] Server started (`npm run dev`)
- [ ] Health check passes (`curl http://localhost:3001/health`)
- [ ] Can register user
- [ ] Can login
