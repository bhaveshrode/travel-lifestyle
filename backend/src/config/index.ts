import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Aptos
  aptos: {
    network: (process.env.APTOS_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'devnet',
    nodeUrl: process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1',
    faucetUrl: process.env.APTOS_FAUCET_URL || 'https://faucet.testnet.aptoslabs.com',
    moduleAddress: process.env.APTOS_MODULE_ADDRESS || '',
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // External APIs
  externalApis: {
    coingecko: process.env.COINGECKO_API_KEY || '',
    currency: process.env.CURRENCY_API_KEY || '',
  },

  // IPFS
  ipfs: {
    gateway: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    pinataApiKey: process.env.PINATA_API_KEY || '',
    pinataSecretKey: process.env.PINATA_SECRET_KEY || '',
  },
};

// Validate required configuration
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'APTOS_MODULE_ADDRESS',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and fill in the required values.'
    );
  }
}
