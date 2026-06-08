# Travel & Lifestyle - Blockchain Platform

A full-stack blockchain travel and lifestyle application built with **Ethereum/Solidity**, featuring digital travel cards, experience NFTs, and loyalty points exchange.

## 🌟 Features

- **Digital Travel Card**: Multi-currency wallet with crypto conversion (USD, EUR, GBP, JPY)
- **Experience NFTs**: ERC-721 tokenized travel experiences marketplace
- **Loyalty Points Exchange**: Swap points for crypto rewards (100:1 ratio)
- **Secure Backend API**: 41 REST endpoints with JWT authentication
- **Modern Frontend**: React + TypeScript responsive web application

## 🏗️ Technology Stack

### Blockchain
- **Ethereum** - Smart contract platform
- **Solidity 0.8.20** - Smart contract language
- **Hardhat** - Development environment
- **OpenZeppelin** - Security standards
- **ethers.js v6** - Ethereum library

### Backend
- **Node.js 18+** with TypeScript
- **Express.js** - Web framework
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Redis** - Caching layer
- **JWT** - Authentication

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Routing
- **Zustand** - State management
- **Axios** - HTTP client

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional for caching)

### 1. Clone Repository
```bash
git clone https://github.com/bhaveshrode/travel-lifestyle.git
cd travel-lifestyle
```

### 2. Setup Smart Contracts
```bash
cd contracts
npm install
npm run compile

# Start local blockchain (Terminal 1)
npm run node

# Deploy contracts (Terminal 2)
npm run deploy:localhost
```

### 3. Setup Backend
```bash
cd ../backend
npm install

# Setup environment
cp .env.example .env
# Edit .env with database credentials and contract addresses

# Setup database
npx prisma generate
npx prisma db push

# Start backend
npm run dev
```

### 4. Setup Frontend
```bash
cd ../frontend
npm install

# Start frontend
npm run dev
```

### 5. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/v1

## 📚 Documentation

- **[ETHEREUM_MIGRATION.md](./ETHEREUM_MIGRATION.md)** - Complete migration guide
- **[contracts/README.md](./contracts/README.md)** - Smart contract documentation
- **[backend/README.md](./backend/README.md)** - Backend API documentation
- **[frontend/README.md](./frontend/README.md)** - Frontend documentation
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide

## 🔐 Smart Contracts

### DigitalTravelCard.sol
- Multi-currency support (USD, EUR, GBP, JPY)
- Fiat to crypto conversion
- Load/withdraw funds
- OpenZeppelin security

### ExperienceNFTs.sol
- ERC-721 standard NFTs
- Marketplace with listing
- Two-step transfer mechanism
- Platform fees (2.5%)

### TravelPointsExchange.sol
- Loyalty points accounts
- Points to crypto swapping
- Transaction history
- Configurable exchange rates

## 🔧 Development

### Compile Contracts
```bash
cd contracts
npm run compile
```

### Run Tests
```bash
npm run test
```

### Deploy to Testnet
```bash
# Update .env with Sepolia RPC URL
npm run deploy:sepolia
```

### Verify on Etherscan
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 📊 API Endpoints

- **Auth**: 4 endpoints (register, login, refresh, logout)
- **Users**: 6 endpoints (profile, stats, etc.)
- **Travel Cards**: 4 endpoints (create, load, convert)
- **NFTs**: 8 endpoints (mint, list, transfer, marketplace)
- **Points**: 7 endpoints (create, add, swap, stats)
- **Transactions**: 8 endpoints (history, stats, export)

**Total: 41 REST API endpoints**

See [backend/API_REFERENCE.md](./backend/API_REFERENCE.md) for details.

## 🎨 Frontend Pages

- Landing Page - Marketing homepage
- Login/Register - User authentication
- Dashboard - Overview with statistics
- Travel Card - Card management
- NFTs - Marketplace and collection
- Points - Loyalty points exchange
- Transactions - History and analytics
- Profile - User settings

## 🔐 Security Features

- OpenZeppelin security standards
- Reentrancy protection
- Pausable contracts
- Owner-only admin functions
- JWT authentication
- Input validation
- Rate limiting
- SQL injection protection

## 📦 Project Structure

```
travel-lifestyle/
├── contracts/          # Ethereum smart contracts
│   ├── src/           # Solidity contracts
│   └── scripts/       # Deployment scripts
├── backend/           # Node.js API server
│   ├── src/          # TypeScript source
│   └── prisma/       # Database schema
├── frontend/          # React application
│   └── src/          # React components
└── docs/             # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache-2.0 License.

## 🆘 Support

For issues or questions:
- Check [ETHEREUM_MIGRATION.md](./ETHEREUM_MIGRATION.md)
- Review [contracts/README.md](./contracts/README.md)
- Open a GitHub issue
- Contact: bhaveshrode2004@gmail.com

## 🎉 Acknowledgments

- **OpenZeppelin** - Secure smart contract library
- **Hardhat** - Ethereum development environment
- **Prisma** - Modern database toolkit
- **React** - UI library
- **TailwindCSS** - Utility-first CSS

---

**Built with ❤️ using Ethereum, Solidity, and modern web technologies**
