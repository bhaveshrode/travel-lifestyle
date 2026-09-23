jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
  morganStream: { write: jest.fn() },
}));

jest.mock('../config/database', () => ({
  prisma: require('./helpers').prismaMock,
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../config/redis', () => ({
  redis: { on: jest.fn(), quit: jest.fn() },
  cache: require('./helpers').cacheMock,
  disconnectRedis: jest.fn(),
}));

jest.mock('../services/ethereum.service', () => ({
  __esModule: true,
  default: require('./helpers').ethereumMock,
}));

const { createApp } = require('../app');

export const app = createApp();
export {
  prismaMock,
  cacheMock,
  ethereumMock,
  authHeader,
  TEST_USER,
  mockCard,
  mockNft,
  mockPoints,
  mockTx,
} from './helpers';
