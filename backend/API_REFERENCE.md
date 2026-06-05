# Travel & Lifestyle API Reference

Complete API documentation for all endpoints.

**Base URL:** `http://localhost:3001/api/v1`

**Authentication:** Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Travel Cards](#travel-cards)
4. [NFTs](#nfts)
5. [Points](#points)
6. [Transactions](#transactions)
7. [Error Codes](#error-codes)

---

## Authentication

### Register User
Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "aptosAddress": "0x1234567890abcdef..."
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "aptosAddress": "0x1234...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Login
Authenticate user and get tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "aptosAddress": "0x1234..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Refresh Token
Get a new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Logout
Invalidate refresh token.

**Endpoint:** `POST /auth/logout`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Users

### Get Current User
Get authenticated user's profile.

**Endpoint:** `GET /users/me`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "aptosAddress": "0x1234...",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "Travel enthusiast",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLoginAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Update Profile
Update user profile information.

**Endpoint:** `PUT /users/me`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://example.com/avatar.jpg",
  "bio": "Travel enthusiast and NFT collector"
}
```

**Response:** `200 OK`

---

### Change Password
Change user password.

**Endpoint:** `PUT /users/me/password`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Response:** `200 OK`

---

### Get User Stats
Get user statistics (cards, NFTs, points, transactions).

**Endpoint:** `GET /users/me/stats`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "travelCard": {
      "balance": "1000",
      "cryptoBalance": "50",
      "currency": "USD"
    },
    "nfts": {
      "total": 5
    },
    "points": {
      "points": "10000",
      "cryptoValue": "100"
    },
    "transactions": {
      "total": 25,
      "confirmed": 23
    }
  }
}
```

---

### Get Public Profile
Get public profile by username.

**Endpoint:** `GET /users/:username`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "profile": {
      "username": "johndoe",
      "aptosAddress": "0x1234...",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "Travel enthusiast",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "stats": {
      "nftCount": 5
    },
    "listedNFTs": [...]
  }
}
```

---

## Travel Cards

### Create Travel Card
Create a new travel card.

**Endpoint:** `POST /cards`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "initialBalance": 1000,
  "currency": "USD"
}
```

**Response:** `201 Created`

---

### Get My Card
Get user's travel card with blockchain sync.

**Endpoint:** `GET /cards/my`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "balance": "1000",
    "cryptoBalance": "50",
    "currency": "USD",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSyncAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Load Funds
Add funds to travel card.

**Endpoint:** `POST /cards/load-funds`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 500
}
```

**Response:** `200 OK`

---

### Convert to Crypto
Convert fiat balance to cryptocurrency.

**Endpoint:** `POST /cards/convert-to-crypto`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 100
}
```

**Response:** `200 OK`

---

## NFTs

### Create NFT
Create a new experience NFT.

**Endpoint:** `POST /nfts`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "description": "Skydiving in Dubai",
  "price": 1000,
  "imageUrl": "https://example.com/image.jpg",
  "category": "Adventure",
  "location": "Dubai, UAE"
}
```

**Response:** `201 Created`

---

### List NFTs
Get all NFTs for current user.

**Endpoint:** `GET /nfts`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `category` (string, optional)
- `listed` (boolean, optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "nfts": [
      {
        "id": "uuid",
        "nftId": "0",
        "description": "Skydiving in Dubai",
        "price": "1000",
        "imageUrl": "https://example.com/image.jpg",
        "category": "Adventure",
        "location": "Dubai, UAE",
        "isListed": false,
        "isPendingTransfer": false,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### Get NFT Details
Get specific NFT by ID.

**Endpoint:** `GET /nfts/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Offer NFT
Offer NFT for transfer to another user.

**Endpoint:** `POST /nfts/:id/offer`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipientAddress": "0xabcd..."
}
```

**Response:** `200 OK`

---

### Claim NFT
Claim an NFT offered to you.

**Endpoint:** `POST /nfts/:id/claim`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "fromAddress": "0x1234..."
}
```

**Response:** `200 OK`

---

### Cancel Transfer
Cancel a pending NFT transfer.

**Endpoint:** `POST /nfts/:id/cancel`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### List/Unlist NFT
List or unlist NFT for sale.

**Endpoint:** `PUT /nfts/:id/list`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "isListed": true
}
```

**Response:** `200 OK`

---

### Marketplace Featured
Get featured NFTs from marketplace (public).

**Endpoint:** `GET /nfts/marketplace/featured`

**Query Parameters:**
- `limit` (number, default: 10)

**Response:** `200 OK`

---

## Points

### Create Points Account
Create a new points exchange account.

**Endpoint:** `POST /points`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "points": 1000,
  "cryptoValue": 0
}
```

**Response:** `201 Created`

---

### Get My Points
Get user's points account with blockchain sync.

**Endpoint:** `GET /points/my`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "points": "10000",
    "cryptoValue": "100",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSyncAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Add Points
Add loyalty points to account.

**Endpoint:** `POST /points/add`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "pointsToAdd": 500
}
```

**Response:** `200 OK`

---

### Swap Points
Swap loyalty points for cryptocurrency.

**Endpoint:** `POST /points/swap`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "pointsToSwap": 1000
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "pointsSwapped": 1000,
    "cryptoEarned": 10,
    "exchangeRate": 100,
    "message": "Points swap initiated..."
  }
}
```

---

### Get Exchange Rate
Get current exchange rate.

**Endpoint:** `GET /points/exchange-rate`

**Query Parameters:**
- `rateOwner` (string, optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "pointsPerCrypto": 100,
    "description": "100 points = 1 crypto unit"
  }
}
```

---

### Points History
Get points transaction history.

**Endpoint:** `GET /points/history`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `type` (string, optional)

**Response:** `200 OK`

---

### Points Stats
Get points account statistics.

**Endpoint:** `GET /points/stats`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "currentPoints": "10000",
    "currentCryptoValue": "100",
    "totalPointsAdded": "15000",
    "totalPointsSwapped": "5000",
    "transactionCount": 25,
    "accountCreatedAt": "2024-01-01T00:00:00.000Z",
    "lastSyncAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Transactions

### List Transactions
Get user's transaction history.

**Endpoint:** `GET /transactions`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `type` (string, optional)
- `status` (string, optional: PENDING, CONFIRMED, FAILED)
- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "txHash": "0xabc...",
        "type": "CARD_LOAD_FUNDS",
        "status": "CONFIRMED",
        "amount": "500",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "blockTimestamp": "2024-01-01T00:00:05.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

---

### Get Transaction
Get specific transaction details.

**Endpoint:** `GET /transactions/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Pending Transactions
Get all pending transactions.

**Endpoint:** `GET /transactions/pending`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Transaction Stats
Get transaction statistics summary.

**Endpoint:** `GET /transactions/stats/summary`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 50,
      "pending": 5,
      "confirmed": 42,
      "failed": 3
    },
    "byType": {
      "CARD_CREATE": 1,
      "CARD_LOAD_FUNDS": 10,
      "NFT_CREATE": 5,
      "POINTS_SWAP": 8
    },
    "recent": [...]
  }
}
```

---

### Transaction Chart Data
Get transaction data for charts (last N days).

**Endpoint:** `GET /transactions/stats/chart`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `days` (number, default: 30)

**Response:** `200 OK`

---

### Retry Transaction
Retry a failed transaction.

**Endpoint:** `POST /transactions/:id/retry`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Export Transactions
Export transactions as CSV.

**Endpoint:** `GET /transactions/export`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)

**Response:** `200 OK` (CSV file download)

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Response when exceeded:**
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Pagination

Standard pagination parameters:
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)

Pagination response format:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## Testing with cURL

### Register and Login
```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "aptosAddress": "0x1234..."
  }'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Save the access token
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

### Create Travel Card
```bash
curl -X POST http://localhost:3001/api/v1/cards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "initialBalance": 1000,
    "currency": "USD"
  }'
```

### Get My Card
```bash
curl http://localhost:3001/api/v1/cards/my \
  -H "Authorization: Bearer $TOKEN"
```

---

For more information, see the [README.md](./README.md) and [SETUP_GUIDE.md](./SETUP_GUIDE.md).
