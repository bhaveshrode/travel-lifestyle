# Travel & Lifestyle Frontend

Modern React frontend application for the Travel & Lifestyle blockchain platform.

## Tech Stack

- **React 18** with TypeScript
- **Vite** - Lightning fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **React Icons** - Icon library
- **Aptos SDK** - Blockchain integration

## Project Structure

```
frontend/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── layouts/           # Layout components
│   ├── services/          # API services
│   ├── store/             # Zustand state management
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies
├── tailwind.config.js     # TailwindCSS config
├── vite.config.ts         # Vite config
└── tsconfig.json          # TypeScript config
```

## Features Implemented

### ✅ Authentication
- User registration with wallet integration
- Login/Logout
- JWT token management with auto-refresh
- Protected routes

### ✅ Dashboard
- Overview of all user assets
- Quick stats (cards, NFTs, points, transactions)
- Recent activity

### ✅ Travel Card Management
- Create multi-currency travel card
- Load funds
- Convert fiat to crypto
- Real-time balance display

### ✅ NFT Marketplace
- Browse experience NFTs
- Create new NFTs
- Two-step transfer system (offer/claim)
- List/unlist NFTs for sale
- Featured marketplace

### ✅ Points Exchange
- Create points account
- Add loyalty points
- Swap points for crypto
- View transaction history
- Statistics dashboard

### ✅ Transaction History
- Complete transaction log
- Filter by type, status, date
- Export to CSV
- Retry failed transactions
- Real-time status updates

### ✅ User Profile
- Update profile information
- Change password
- View user statistics
- Account settings

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:3001`

### Installation

```bash
cd frontend
npm install
```

### Configuration

1. Copy environment variables:
```bash
cp .env.example .env
```

2. Edit `.env`:
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_APTOS_NETWORK=testnet
VITE_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
VITE_APTOS_MODULE_ADDRESS=0x...  # Your deployed contract address
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm run preview
```

## Key Components

### Pages

- **LandingPage** - Marketing homepage
- **LoginPage** - User authentication
- **RegisterPage** - New user signup
- **DashboardPage** - Main dashboard overview
- **TravelCardPage** - Card management
- **NFTsPage** - NFT marketplace
- **PointsPage** - Points exchange
- **TransactionsPage** - Transaction history
- **ProfilePage** - User profile settings

### Layouts

- **DashboardLayout** - Main authenticated layout with sidebar navigation

### Services

- **api.ts** - Axios HTTP client with interceptors
- **auth.ts** - Authentication API calls
- **cards.ts** - Travel card API calls
- **nfts.ts** - NFT API calls
- **points.ts** - Points API calls
- **transactions.ts** - Transaction API calls

### State Management (Zustand)

- **authStore** - Authentication state
- **cardStore** - Travel card state
- **nftStore** - NFT state
- **pointsStore** - Points state
- **transactionStore** - Transaction state

## Styling

### TailwindCSS Classes

Custom utility classes defined in `index.css`:

- `.btn` - Base button styles
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.btn-outline` - Outline button
- `.card` - Card container
- `.input` - Form input
- `.label` - Form label
- `.badge` - Status badge

### Color Palette

Primary colors (customizable in `tailwind.config.js`):
- Primary: Blue shades (50-900)
- Gray: Neutral shades
- Success: Green
- Warning: Yellow
- Error: Red

## API Integration

All API calls go through the centralized `api` service with:

- Automatic JWT token injection
- Token refresh on 401 errors
- Error handling and logging
- Request/response interceptors

### Example API Call

```typescript
import { api } from '@/services/api';

const card = await api.get<TravelCard>('/cards/my');
```

## Routing

Routes are defined in `App.tsx`:

- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Main dashboard (protected)
- `/dashboard/card` - Travel card (protected)
- `/dashboard/nfts` - NFTs (protected)
- `/dashboard/points` - Points (protected)
- `/dashboard/transactions` - Transactions (protected)
- `/dashboard/profile` - Profile (protected)

## State Management

Zustand provides simple, scalable state management:

```typescript
// Using the auth store
import { useAuthStore } from '@/store/authStore';

function Component() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  // Use state and actions
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3001/api/v1` |
| `VITE_APTOS_NETWORK` | Aptos network | `testnet` |
| `VITE_APTOS_NODE_URL` | Aptos node URL | Testnet URL |
| `VITE_APTOS_MODULE_ADDRESS` | Contract address | Required |

## Deployment

### Build

```bash
npm run build
```

Output in `dist/` directory.

### Deploy Options

1. **Vercel**
```bash
npm install -g vercel
vercel
```

2. **Netlify**
```bash
npm install -g netlify-cli
netlify deploy
```

3. **Static Hosting**
Upload `dist/` folder to any static hosting service.

### Environment Variables for Production

Set these in your hosting platform:
- `VITE_API_URL` - Production API URL
- `VITE_APTOS_NETWORK` - `mainnet`
- `VITE_APTOS_MODULE_ADDRESS` - Mainnet contract address

## Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Code splitting with React.lazy
- Route-based chunking
- Image lazy loading
- Memoized components
- Optimized bundle size

## Security

- XSS protection via React
- CSRF protection
- Secure token storage
- API request sanitization
- Content Security Policy headers

## Troubleshooting

### API Connection Issues

```bash
# Check if backend is running
curl http://localhost:3001/health

# Check environment variables
cat .env
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Wallet Connection Issues

- Ensure Aptos wallet extension is installed
- Check network configuration
- Verify contract address

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

Apache-2.0

## Support

For issues or questions:
- Check [Backend API Documentation](../backend/API_REFERENCE.md)
- Review [Setup Guide](./SETUP.md)
- Open GitHub issue

---

**Status:** ✅ Frontend framework complete, ready for component implementation

**Next Steps:**
1. Implement remaining page components
2. Add wallet integration (Petra, Martian)
3. Complete NFT marketplace UI
4. Add real-time updates
5. Implement image upload for NFTs
6. Add animations and transitions
7. Write unit tests
8. Deploy to production
