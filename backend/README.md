# Travel & Lifestyle Backend API

Backend API server for the Travel & Lifestyle blockchain application built with Node.js, Express, TypeScript, Prisma, and ethers.js.

## Features

- 🔐 **Authentication**: JWT-based authentication with refresh tokens
- 💳 **Travel Cards**: Multi-currency digital travel cards with crypto conversion
- 🎨 **NFTs**: Experience NFTs with two-step transfer mechanism
- 🎯 **Points Exchange**: Loyalty points to cryptocurrency conversion
- 📊 **Database**: PostgreSQL with Prisma ORM
- ⚡ **Caching**: Redis for performance optimization
- 🔒 **Security**: Helmet, CORS, rate limiting
- 📝 **Logging**: Winston logger with file rotation
- 🚀 **Blockchain**: Ethereum blockchain integration

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+
- Hardhat (for smart contract deployment)

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/travel_lifestyle"

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Ethereum Configuration
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY  # Or your preferred RPC
CONTRACT_ADDRESS=0x...        # Your deployed contract address
ADMIN_PRIVATE_KEY=0x...       # Admin account private key (keep secure!)

# Redis (if using non-default settings)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Open Prisma Studio to view database
npm run db:studio
```

### 4. Deploy Smart Contracts

Before running the backend, ensure the Solidity smart contracts are deployed to Ethereum:

```bash
# From project root
cd ../contracts  # or wherever your Solidity contracts are located

# Install Hardhat dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet (or your preferred network)
npx hardhat run scripts/deploy.ts --network sepolia

# Verify contract on Etherscan (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

Update `CONTRACT_ADDRESS` in `.env` with your deployed address.

## Running the Server

### Development Mode

```bash
npm run dev
```

Server will run on `http://localhost:3001` with hot-reloading enabled.

### Production Mode

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API Documentation

### Base URL

```
http://localhost:3001/api/v1
```

### Authentication Endpoints

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "ethereumAddress": "0x1234..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "ethereumAddress": "0x1234..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Logout
```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Travel Card Endpoints

All card endpoints require authentication (Bearer token in Authorization header).

#### Create Travel Card
```http
POST /api/v1/cards
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "initialBalance": 1000,
  "currency": "USD"
}
```

#### Get My Card
```http
GET /api/v1/cards/my
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "balance": "1000",
    "cryptoBalance": "0",
    "currency": "USD",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Load Funds
```http
POST /api/v1/cards/load-funds
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 500
}
```

#### Convert to Crypto
```http
POST /api/v1/cards/convert-to-crypto
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 100
}
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Travel Lifestyle API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.ts      # Main config
│   │   ├── database.ts   # Prisma client
│   │   ├── redis.ts      # Redis client
│   │   └── logger.ts     # Winston logger
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/           # API routes
│   │   ├── auth.routes.ts
│   │   └── cards.routes.ts
│   ├── services/         # Business logic
│   │   ├── auth.service.ts
│   │   └── ethereum.service.ts
│   └── server.ts         # Express server entry point
├── prisma/
│   └── schema.prisma     # Database schema
├── logs/                 # Log files (auto-generated)
├── .env                  # Environment variables
├── .env.example          # Example environment file
├── package.json
├── tsconfig.json
└── README.md
```

## Database Schema

### Users
- User accounts with authentication
- Linked to Ethereum addresses

### TravelCard
- Multi-currency digital wallet
- Fiat and crypto balances
- One card per user

### NFT
- Experience NFTs
- Metadata and ownership tracking
- Pending transfer support

### PointsAccount
- Loyalty points exchange
- Points and crypto balances

### Transaction
- Blockchain transaction history
- Status tracking
- Indexed for queries

## Caching Strategy

Redis is used to cache:
- User travel card data (1 minute TTL)
- NFT metadata (5 minute TTL)
- Points balances (1 minute TTL)
- API responses for read-heavy endpoints

Cache keys follow the pattern: `{resource}:{identifier}`

Examples:
- `card:0x1234...`
- `nft:0x1234...:42`
- `points:0x1234...`

## Security Best Practices

1. **JWT Tokens**: Short-lived access tokens (7 days) with refresh tokens (30 days)
2. **Password Hashing**: bcrypt with salt rounds = 10
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **CORS**: Configured for specific origins
5. **Helmet**: Security headers enabled
6. **Input Validation**: Joi schemas for all endpoints
7. **SQL Injection**: Prisma ORM prevents injection attacks
8. **Private Keys**: Never commit `.env` file, use environment variables

## Error Handling

All errors return a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [/* optional validation details */]
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console - Colored output in development

Log levels: error, warn, info, http, debug

## Development Tools

### Prisma Studio
Visual database browser:
```bash
npm run db:studio
```

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

## Testing

```bash
npm test
```

## Deployment

### Using Docker

```dockerfile
# Build image
docker build -t travel-lifestyle-backend .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL="..." \
  -e REDIS_HOST="..." \
  travel-lifestyle-backend
```

### Environment Variables for Production

Ensure these are set in production:
- `NODE_ENV=production`
- `DATABASE_URL` - Production PostgreSQL connection
- `REDIS_HOST` / `REDIS_PASSWORD` - Production Redis
- `JWT_SECRET` - Strong random secret (generate new one!)
- `ETHEREUM_RPC_URL` - Mainnet RPC endpoint (Infura/Alchemy/etc)
- `CONTRACT_ADDRESS` - Mainnet contract address
- `CORS_ORIGIN` - Production frontend URL

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
psql -U postgres -l

# Test connection
npx prisma db pull
```

### Redis Connection Issues
```bash
# Test Redis connection
redis-cli ping
```

### Prisma Client Issues
```bash
# Regenerate Prisma client
npm run db:generate
```

## Contributing

1. Follow TypeScript best practices
2. Use Prettier for code formatting
3. Write meaningful commit messages
4. Test all endpoints before committing
5. Update documentation for new features

## License

Apache-2.0

## Support

For issues or questions, please open an issue on GitHub.
