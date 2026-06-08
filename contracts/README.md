# Travel & Lifestyle - Ethereum Smart Contracts

Ethereum/Solidity smart contracts for the Travel & Lifestyle platform, migrated from Aptos Move.

## 📦 Contracts Overview

### 1. **DigitalTravelCard.sol**
Multi-currency digital travel wallet with crypto conversion.

**Features:**
- Create travel cards with multiple currencies (USD, EUR, GBP, JPY)
- Load fiat funds
- Convert fiat to crypto (configurable rate: default 1:10)
- Withdraw funds
- Change currency
- Activate/deactivate cards

**Key Functions:**
- `createCard(currency, initialBalance)` - Create new travel card
- `loadFunds(amount)` - Add funds to card
- `convertToCrypto(amount)` - Convert fiat to crypto
- `getBalance(user)` - Get fiat and crypto balances

### 2. **ExperienceNFTs.sol**
ERC-721 NFT marketplace for travel experiences with two-step transfer mechanism.

**Features:**
- Mint travel experience NFTs
- List/unlist NFTs for sale
- Purchase NFTs with ETH
- Two-step transfer system (offer → claim)
- Platform fees (2.5% default)
- Metadata management

**Key Functions:**
- `mintNFT(description, category, location, price, tokenURI)` - Mint new NFT
- `listNFT(tokenId, price)` - List for sale
- `purchaseNFT(tokenId)` - Buy listed NFT
- `offerNFTTransfer(tokenId, to)` - Offer transfer (step 1)
- `claimNFTTransfer(tokenId)` - Claim transfer (step 2)
- `getListedNFTs()` - Get all listed NFTs

### 3. **TravelPointsExchange.sol**
Loyalty points system with crypto conversion.

**Features:**
- Create points accounts
- Add loyalty points
- Swap points for crypto (configurable rate: default 100:1)
- Track transaction history
- Account statistics

**Key Functions:**
- `createAccount(initialPoints)` - Create points account
- `addPoints(amount, reason)` - Add loyalty points
- `swapPointsForCrypto(pointsToSwap)` - Swap for crypto
- `getAccountStats(user)` - Get account statistics

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to contracts directory
cd contracts

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

### Configuration

Edit `.env` file:
```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR-PROJECT-ID
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## 🔨 Development

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Run Local Hardhat Node

```bash
npm run node
```

In another terminal:
```bash
npm run deploy:localhost
```

## 🚢 Deployment

### Deploy to Sepolia Testnet

```bash
npm run deploy:sepolia
```

### Deploy to Mainnet

```bash
npm run deploy:mainnet
```

### Verify Contracts on Etherscan

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 📊 Contract Addresses

After deployment, contract addresses will be saved in:
- `deployments-localhost.json`
- `deployments-sepolia.json`
- `deployments-mainnet.json`

## 🔐 Security Features

### All Contracts Include:
- ✅ **Ownable** - Owner-only admin functions
- ✅ **ReentrancyGuard** - Protection against reentrancy attacks
- ✅ **Pausable** - Emergency pause functionality
- ✅ **OpenZeppelin** - Industry-standard secure contracts

### Specific Security:
- **DigitalTravelCard**: Overflow protection, input validation
- **ExperienceNFTs**: Two-step transfers, platform fees, ERC721 standard
- **TravelPointsExchange**: Minimum swap amounts, exchange rate limits

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Generate Coverage Report
```bash
npx hardhat coverage
```

### Gas Report
```bash
REPORT_GAS=true npm run test
```

## 📖 Usage Examples

### JavaScript/ethers.js

```javascript
const { ethers } = require("hardhat");

// Get contract instance
const travelCard = await ethers.getContractAt("DigitalTravelCard", contractAddress);

// Create a travel card
await travelCard.createCard("USD", ethers.parseEther("1000"));

// Load funds
await travelCard.loadFunds(ethers.parseEther("500"));

// Convert to crypto
await travelCard.convertToCrypto(ethers.parseEther("100"));

// Get balance
const [fiatBalance, cryptoBalance] = await travelCard.getBalance(userAddress);
console.log("Fiat:", ethers.formatEther(fiatBalance));
console.log("Crypto:", ethers.formatEther(cryptoBalance));
```

### Mint and List NFT

```javascript
const nfts = await ethers.getContractAt("ExperienceNFTs", nftContractAddress);

// Mint NFT
const tx = await nfts.mintNFT(
  "Amazing Paris Experience",
  "Cultural",
  "Paris, France",
  ethers.parseEther("0.1"),
  "ipfs://QmXxxxxxx"
);
await tx.wait();

// List NFT for sale
await nfts.listNFT(tokenId, ethers.parseEther("0.1"));
```

### Swap Points

```javascript
const points = await ethers.getContractAt("TravelPointsExchange", pointsAddress);

// Create account
await points.createAccount(1000);

// Add more points
await points.addPoints(500, "Flight booking");

// Swap points for crypto
await points.swapPointsForCrypto(1000); // 1000 points → 10 crypto
```

## 🔄 Migration from Aptos

### Key Changes:

| Aptos Move | Ethereum Solidity |
|------------|-------------------|
| `resource` | `struct` + `mapping` |
| `acquires` | Direct state access |
| `signer` | `msg.sender` |
| Native `move_to` | ERC721 `_safeMint` |
| Two-step transfer (custom) | Two-step transfer (custom) |
| APT token | ETH + Wei units |

### Address Format:
- **Aptos**: `0x1234...` (32 bytes)
- **Ethereum**: `0x1234...` (20 bytes)

### Units:
- All values use **wei** (1 ETH = 10^18 wei)
- Use `ethers.parseEther()` and `ethers.formatEther()`

## 🛠️ Backend Integration

Update `backend/src/services/ethereum.service.ts`:

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Get contract instance
const travelCard = new ethers.Contract(
  contractAddress,
  abi,
  wallet
);

// Call contract methods
const tx = await travelCard.createCard("USD", ethers.parseEther("1000"));
await tx.wait();
```

## 📚 Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Security Considerations

- **Never commit `.env` file** with real private keys
- **Always test on testnet first** before mainnet deployment
- **Audit contracts** before handling real funds
- **Use multisig wallets** for admin functions in production
- **Monitor contract events** for suspicious activity

## 🆘 Support

For issues or questions:
1. Check existing GitHub issues
2. Review documentation
3. Create new issue with details
4. Join community discussions

---

**Migrated from Aptos Move to Ethereum Solidity** ✅
