import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { morganStream } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import cardsRoutes from './routes/cards.routes';
import nftsRoutes from './routes/nfts.routes';
import pointsRoutes from './routes/points.routes';
import transactionsRoutes from './routes/transactions.routes';
import usersRoutes from './routes/users.routes';

export function createApp(): Application {
  const app: Application = express();

  app.use(helmet());
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
  }));

  if (process.env.NODE_ENV !== 'test') {
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/', limiter);
  }

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: morganStream }));
  }

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Travel Lifestyle API is running',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  });

  const apiPrefix = `/api/${config.apiVersion}`;
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/cards`, cardsRoutes);
  app.use(`${apiPrefix}/nfts`, nftsRoutes);
  app.use(`${apiPrefix}/points`, pointsRoutes);
  app.use(`${apiPrefix}/transactions`, transactionsRoutes);
  app.use(`${apiPrefix}/users`, usersRoutes);

  app.get(`${apiPrefix}`, (_req, res) => {
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
          listForSale: `PUT ${apiPrefix}/nfts/:id/list`,
          purchase: `POST ${apiPrefix}/nfts/:id/purchase`,
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
