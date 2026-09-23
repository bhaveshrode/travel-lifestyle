import jwt from 'jsonwebtoken';
import { config } from '../config';

export const TEST_USER = {
  userId: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  ethereumAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
};

export function authHeader(overrides: Partial<typeof TEST_USER> = {}) {
  const payload = {
    userId: overrides.userId || TEST_USER.userId,
    ethereumAddress: overrides.ethereumAddress || TEST_USER.ethereumAddress,
    email: overrides.email || TEST_USER.email,
  };
  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

export const prismaMock = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  travelCard: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  nFT: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  pointsAccount: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
};

export const cacheMock = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
};

export const ethereumMock = {
  createTravelCard: jest.fn(),
  loadFunds: jest.fn(),
  convertToCrypto: jest.fn(),
  getTravelCardBalance: jest.fn(),
  getCryptoBalance: jest.fn(),
  mintNFT: jest.fn(),
  listNFT: jest.fn(),
  unlistNFT: jest.fn(),
  purchaseNFT: jest.fn(),
  offerNFTTransfer: jest.fn(),
  claimNFTTransfer: jest.fn(),
  cancelNFTTransfer: jest.fn(),
  createPointsAccount: jest.fn(),
  addPoints: jest.fn(),
  swapPoints: jest.fn(),
  getPointsBalance: jest.fn(),
  getPointsCryptoValue: jest.fn(),
  getExchangeRate: jest.fn(),
  fromWei: jest.fn((value: bigint | string) => {
    const asString = typeof value === 'bigint' ? value.toString() : String(value);
    if (asString === '0') return '0';
    return asString.length > 18 ? asString.slice(0, -18) : '0';
  }),
};

export function mockCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'card-1',
    userId: TEST_USER.userId,
    ethereumAddress: TEST_USER.ethereumAddress,
    balance: 1000n,
    cryptoBalance: 0n,
    currency: 'USD',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastSyncAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function mockNft(overrides: Record<string, unknown> = {}) {
  return {
    id: 'nft-1',
    userId: TEST_USER.userId,
    ethereumAddress: TEST_USER.ethereumAddress,
    nftId: 0n,
    description: 'Kyoto temple tour',
    price: 100n,
    imageUrl: null,
    metadataUrl: null,
    category: 'culture',
    location: 'Kyoto',
    isListed: false,
    isPendingTransfer: false,
    pendingTo: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastSyncAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function mockPoints(overrides: Record<string, unknown> = {}) {
  return {
    id: 'points-1',
    userId: TEST_USER.userId,
    ethereumAddress: TEST_USER.ethereumAddress,
    points: 250n,
    cryptoValue: 0n,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastSyncAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function mockTx(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    userId: TEST_USER.userId,
    txHash: 'pending-tx',
    type: 'CARD_CREATE',
    status: 'PENDING',
    amount: 100n,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
