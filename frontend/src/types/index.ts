// User types
export interface User {
  id: string;
  email: string;
  username: string;
  aptosAddress: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Travel Card types
export interface TravelCard {
  id: string;
  balance: string;
  cryptoBalance: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  lastSyncAt: string;
}

// NFT types
export interface NFT {
  id: string;
  nftId: string;
  description: string;
  price: string;
  imageUrl?: string;
  metadataUrl?: string;
  category?: string;
  location?: string;
  isListed: boolean;
  isPendingTransfer: boolean;
  pendingTo?: string;
  createdAt: string;
  user?: {
    username: string;
    avatar?: string;
  };
}

export interface NFTList {
  nfts: NFT[];
  pagination: Pagination;
}

// Points types
export interface PointsAccount {
  id: string;
  points: string;
  cryptoValue: string;
  createdAt: string;
  lastSyncAt: string;
}

export interface ExchangeRate {
  pointsPerCrypto: number;
  description: string;
}

// Transaction types
export enum TransactionType {
  CARD_CREATE = 'CARD_CREATE',
  CARD_LOAD_FUNDS = 'CARD_LOAD_FUNDS',
  CARD_CONVERT_CRYPTO = 'CARD_CONVERT_CRYPTO',
  NFT_CREATE = 'NFT_CREATE',
  NFT_OFFER = 'NFT_OFFER',
  NFT_CLAIM = 'NFT_CLAIM',
  NFT_CANCEL = 'NFT_CANCEL',
  POINTS_CREATE = 'POINTS_CREATE',
  POINTS_ADD = 'POINTS_ADD',
  POINTS_SWAP = 'POINTS_SWAP',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export interface Transaction {
  id: string;
  txHash: string;
  type: TransactionType;
  status: TransactionStatus;
  amount?: string;
  fromAddress?: string;
  toAddress?: string;
  metadata?: any;
  errorMessage?: string;
  createdAt: string;
  blockTimestamp?: string;
  travelCard?: {
    currency: string;
  };
  nft?: {
    nftId: string;
    description: string;
  };
}

export interface TransactionList {
  transactions: Transaction[];
  pagination: Pagination;
}

export interface TransactionStats {
  overview: {
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
  };
  byType: Record<string, number>;
  recent: Transaction[];
}

// User Stats types
export interface UserStats {
  travelCard: {
    balance: string;
    cryptoBalance: string;
    currency: string;
  } | null;
  nfts: {
    total: number;
  };
  points: {
    points: string;
    cryptoValue: string;
  } | null;
  transactions: {
    total: number;
    confirmed: number;
  };
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  cached?: boolean;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  username: string;
  password: string;
  aptosAddress: string;
}

export interface CreateCardForm {
  initialBalance: number;
  currency: string;
}

export interface LoadFundsForm {
  amount: number;
}

export interface CreateNFTForm {
  description: string;
  price: number;
  imageUrl?: string;
  category?: string;
  location?: string;
}

export interface CreatePointsForm {
  points: number;
  cryptoValue: number;
}

export interface UpdateProfileForm {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
}
