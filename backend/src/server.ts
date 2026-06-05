import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config';
import { logger, morganStream } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { disconnectRedis } from './config/redis';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import cardsRoutes from './routes/cards.routes';
import nftsRoutes from './routes/nfts.routes';
import pointsRoutes from './routes/points.routes';
import transactionsRoutes from './routes/transactions.routes';
import usersRoutes from './routes/users.routes';

// Validate configuration
try {
  validateConfig();
} catch (error) {
  logger.error('Configuration validation failed:', error);
  process.exit(1);
}

// Create Express application
const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', { stream: morganStream }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Travel Lifestyle API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
const apiPrefix = `/api/${config.apiVersion}`;
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/cards`, cardsRoutes);
app.use(`${apiPrefix}/nfts`, nftsRoutes);
app.use(`${apiPrefix}/points`, pointsRoutes);
app.use(`${apiPrefix}/transactions`, transactionsRoutes);
app.use(`${apiPrefix}/users`, usersRoutes);

// API documentation endpoint
app.get(`${apiPrefix}`, (req, res) => {
  res.json({
    success: true,
    message: 'Travel & Lifestyle API',
    version: config.apiVersion,
    endpoints: {
      auth: {
        register: `POST ${apiPrefix}/auth/register`,
        login: `POST ${apiPrefix}/auth/login`,
        refresh: `POST ${apiPrefix}/auth/refresh`,
        logout: `POST ${apiPrefix}/auth/logout`,
      },
      cards: {
        create: `POST ${apiPrefix}/cards`,
        getMy: `GET ${apiPrefix}/cards/my`,
        loadFunds: `POST ${apiPrefix}/cards/load-funds`,
        convertToCrypto: `POST ${apiPrefix}/cards/convert-to-crypto`,
      },
      nfts: {
        create: `POST ${apiPrefix}/nfts`,
        list: `GET ${apiPrefix}/nfts`,
        getById: `GET ${apiPrefix}/nfts/:id`,
        offer: `POST ${apiPrefix}/nfts/:id/offer`,
        claim: `POST ${apiPrefix}/nfts/:id/claim`,
        cancel: `POST ${apiPrefix}/nfts/:id/cancel`,
        marketplace: `GET ${apiPrefix}/nfts/marketplace/featured`,
      },
      points: {
        create: `POST ${apiPrefix}/points`,
        getMy: `GET ${apiPrefix}/points/my`,
        add: `POST ${apiPrefix}/points/add`,
        swap: `POST ${apiPrefix}/points/swap`,
        history: `GET ${apiPrefix}/points/history`,
        stats: `GET ${apiPrefix}/points/stats`,
        exchangeRate: `GET ${apiPrefix}/points/exchange-rate`,
      },
      transactions: {
        list: `GET ${apiPrefix}/transactions`,
        getById: `GET ${apiPrefix}/transactions/:id`,
        pending: `GET ${apiPrefix}/transactions/pending`,
        stats: `GET ${apiPrefix}/transactions/stats/summary`,
        chart: `GET ${apiPrefix}/transactions/stats/chart`,
        export: `GET ${apiPrefix}/transactions/export`,
        retry: `POST ${apiPrefix}/transactions/:id/retry`,
      },
      users: {
        getMe: `GET ${apiPrefix}/users/me`,
        updateMe: `PUT ${apiPrefix}/users/me`,
        changePassword: `PUT ${apiPrefix}/users/me/password`,
        getStats: `GET ${apiPrefix}/users/me/stats`,
        getByUsername: `GET ${apiPrefix}/users/:username`,
        deleteAccount: `DELETE ${apiPrefix}/users/me`,
      },
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.port;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 API URL: http://localhost:${PORT}${apiPrefix}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;
