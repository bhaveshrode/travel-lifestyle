import { Router } from 'express';
import ethereumService from '../services/ethereum.service';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { cache } from '../config/redis';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/points
 * Create a new points exchange account
 */
router.post(
  '/',
  validate(schemas.createPointsExchange),
  asyncHandler(async (req, res) => {
    const { points, cryptoValue } = req.body;
    const { userId, ethereumAddress } = req.user!;

    // Check if user already has a points account
    const existingAccount = await prisma.pointsAccount.findUnique({
      where: { ethereumAddress },
    });

    if (existingAccount) {
      return void res.status(400).json({
        success: false,
        error: 'Points account already exists',
      });
    }

    let txHash: string;
    try {
      txHash = await ethereumService.createPointsAccount(ethereumAddress, points);
    } catch (error: any) {
      return void res.status(502).json({
        success: false,
        error: error.message || 'Blockchain account creation failed',
      });
    }

    const chainPoints = await ethereumService.getPointsBalance(ethereumAddress);
    const chainCrypto = await ethereumService.getPointsCryptoValue(ethereumAddress);

    const account = await prisma.pointsAccount.create({
      data: {
        userId,
        ethereumAddress,
        points: BigInt(chainPoints),
        cryptoValue: BigInt(chainCrypto),
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: 'POINTS_CREATE',
        status: 'CONFIRMED',
        pointsAccountId: account.id,
        amount: BigInt(points),
        metadata: { cryptoValue },
        txHash,
        blockTimestamp: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        account: {
          ...account,
          points: account.points.toString(),
          cryptoValue: ethereumService.fromWei(account.cryptoValue),
        },
        txHash,
        message: 'Points account created on blockchain.',
      },
    });
  })
);

/**
 * GET /api/v1/points/my
 * Get user's points account
 */
router.get(
  '/my',
  asyncHandler(async (req, res) => {
    const { ethereumAddress } = req.user!;

    // Try cache first
    const cacheKey = `points:${ethereumAddress}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return void res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Get from database
    const account = await prisma.pointsAccount.findUnique({
      where: { ethereumAddress },
    });

    if (!account) {
      return void res.status(404).json({
        success: false,
        error: 'Points account not found',
      });
    }

    // Sync with blockchain
    try {
      const points = await ethereumService.getPointsBalance(ethereumAddress);
      const cryptoValue = await ethereumService.getPointsCryptoValue(ethereumAddress);

      // Update database
      await prisma.pointsAccount.update({
        where: { id: account.id },
        data: {
          points: BigInt(points),
          cryptoValue: BigInt(cryptoValue),
          lastSyncAt: new Date(),
        },
      });

      const result = {
        ...account,
        points: points.toString(),
        cryptoValue: ethereumService.fromWei(BigInt(cryptoValue)),
      };

      // Cache for 1 minute
      await cache.set(cacheKey, result, 60);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      // Return database data if blockchain sync fails
      res.json({
        success: true,
        data: {
          ...account,
          points: account.points.toString(),
          cryptoValue: ethereumService.fromWei(account.cryptoValue),
        },
        warning: 'Could not sync with blockchain, showing cached data',
      });
    }
  })
);

/**
 * POST /api/v1/points/add
 * Add loyalty points to account
 */
router.post(
  '/add',
  validate(schemas.addPoints),
  asyncHandler(async (req, res) => {
    const { pointsToAdd, points: pointsBody, reason } = req.body;
    const pointsAmount = pointsToAdd ?? pointsBody;
    const { userId, ethereumAddress } = req.user!;

    const account = await prisma.pointsAccount.findUnique({
      where: { ethereumAddress },
    });

    if (!account) {
      return void res.status(404).json({
        success: false,
        error: 'Points account not found',
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'POINTS_ADD',
        status: 'PENDING',
        pointsAccountId: account.id,
        amount: BigInt(pointsAmount),
        txHash: `pending-points-${account.id}-${Date.now()}`,
      },
    });

    try {
      const txHash = await ethereumService.addPoints(
        ethereumAddress,
        pointsAmount,
        reason || ''
      );
      const [chainPoints, chainCrypto] = await Promise.all([
        ethereumService.getPointsBalance(ethereumAddress),
        ethereumService.getPointsCryptoValue(ethereumAddress),
      ]);
      await prisma.pointsAccount.update({
        where: { id: account.id },
        data: {
          points: BigInt(chainPoints),
          cryptoValue: BigInt(chainCrypto),
          lastSyncAt: new Date(),
        },
      });
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'CONFIRMED', txHash, blockTimestamp: new Date() },
      });
      await cache.del(`points:${ethereumAddress}`);

      return void res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          txHash,
          message: 'Points added on blockchain.',
        },
      });
    } catch (error: any) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED', errorMessage: error.message },
      });
      return void res.status(502).json({
        success: false,
        error: error.message || 'Blockchain transaction failed',
      });
    }
  })
);

/**
 * POST /api/v1/points/swap
 * Swap loyalty points for cryptocurrency
 */
router.post(
  '/swap',
  validate(schemas.swapPoints),
  asyncHandler(async (req, res) => {
    const { pointsToSwap } = req.body;
    const { userId, ethereumAddress } = req.user!;

    const account = await prisma.pointsAccount.findUnique({
      where: { ethereumAddress },
    });

    if (!account) {
      return void res.status(404).json({
        success: false,
        error: 'Points account not found',
      });
    }

    if (account.points < BigInt(pointsToSwap)) {
      return void res.status(400).json({
        success: false,
        error: 'Insufficient points balance',
      });
    }

    // Resolve the on-chain exchange rate (points per 1 crypto). Falls back to the
    // contract default of 100 when the chain cannot be reached.
    let exchangeRate = 100;
    try {
      const chainRate = Number(await ethereumService.getExchangeRate());
      if (Number.isFinite(chainRate) && chainRate > 0) {
        exchangeRate = chainRate;
      }
    } catch {
      exchangeRate = 100;
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'POINTS_SWAP',
        status: 'PENDING',
        pointsAccountId: account.id,
        amount: BigInt(pointsToSwap),
        metadata: {
          pointsSwapped: pointsToSwap,
          exchangeRate,
        },
        txHash: `pending-swap-${account.id}-${Date.now()}`,
      },
    });

    try {
      const swap = await ethereumService.swapPoints(ethereumAddress, pointsToSwap);
      const [chainPoints, chainCrypto] = await Promise.all([
        ethereumService.getPointsBalance(ethereumAddress),
        ethereumService.getPointsCryptoValue(ethereumAddress),
      ]);
      // On-chain amount is denominated in wei; expose it as whole crypto units.
      const cryptoEarned = ethereumService.fromWei(BigInt(swap.cryptoEarned));
      await prisma.pointsAccount.update({
        where: { id: account.id },
        data: {
          points: BigInt(chainPoints),
          cryptoValue: BigInt(chainCrypto),
          lastSyncAt: new Date(),
        },
      });
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CONFIRMED',
          txHash: swap.txHash,
          blockTimestamp: new Date(),
          metadata: {
            pointsSwapped: pointsToSwap,
            cryptoEarned,
            exchangeRate,
          },
        },
      });
      await cache.del(`points:${ethereumAddress}`);

      return void res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          txHash: swap.txHash,
          pointsSwapped: pointsToSwap,
          cryptoEarned,
          exchangeRate,
          message: 'Points swapped on blockchain.',
        },
      });
    } catch (error: any) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED', errorMessage: error.message },
      });
      return void res.status(502).json({
        success: false,
        error: error.message || 'Blockchain transaction failed',
      });
    }
  })
);

/**
 * GET /api/v1/points/exchange-rate
 * Get current exchange rate
 */
router.get(
  '/exchange-rate',
  asyncHandler(async (_req, res) => {
    const cacheKey = 'exchange-rate:default';
    const cached = await cache.get(cacheKey);

    if (cached) {
      return void res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    try {
      const rate = await ethereumService.getExchangeRate();

      const result = {
        pointsPerCrypto: Number(rate),
        description: `${rate} points = 1 crypto unit`,
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, result, 300);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      // Return default rate if blockchain query fails
      res.json({
        success: true,
        data: {
          pointsPerCrypto: 100,
          description: '100 points = 1 crypto unit (default rate)',
        },
      });
    }
  })
);

/**
 * GET /api/v1/points/history
 * Get points transaction history
 */
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;
    const { userId } = req.user!;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {
      userId,
      type: {
        in: ['POINTS_CREATE', 'POINTS_ADD', 'POINTS_SWAP'],
      },
    };

    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          txHash: true,
          type: true,
          status: true,
          amount: true,
          metadata: true,
          createdAt: true,
          blockTimestamp: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map((tx) => ({
          ...tx,
          amount: tx.amount?.toString(),
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  })
);

/**
 * GET /api/v1/points/stats
 * Get points account statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { userId, ethereumAddress } = req.user!;

    // Try cache first
    const cacheKey = `points-stats:${ethereumAddress}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return void res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const account = await prisma.pointsAccount.findUnique({
      where: { ethereumAddress },
    });

    if (!account) {
      return void res.status(404).json({
        success: false,
        error: 'Points account not found',
      });
    }

    // Get statistics
    const [totalAdded, totalSwapped, transactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'POINTS_ADD',
          status: 'CONFIRMED',
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'POINTS_SWAP',
          status: 'CONFIRMED',
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: {
          userId,
          type: { in: ['POINTS_ADD', 'POINTS_SWAP'] },
        },
      }),
    ]);

    const result = {
      currentPoints: account.points.toString(),
      currentCryptoValue: ethereumService.fromWei(account.cryptoValue),
      totalPointsAdded: totalAdded._sum.amount?.toString() || '0',
      totalPointsSwapped: totalSwapped._sum.amount?.toString() || '0',
      transactionCount,
      accountCreatedAt: account.createdAt,
      lastSyncAt: account.lastSyncAt,
    };

    // Cache for 2 minutes
    await cache.set(cacheKey, result, 120);

    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;
