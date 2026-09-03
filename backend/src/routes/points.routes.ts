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
      return res.status(400).json({
        success: false,
        error: 'Points account already exists',
      });
    }

    const account = await prisma.pointsAccount.create({
      data: {
        userId,
        ethereumAddress,
        points: BigInt(points),
        cryptoValue: BigInt(cryptoValue),
      },
    });

    let txHash = `pending-points-${account.id}`;
    let status: 'PENDING' | 'CONFIRMED' = 'PENDING';
    try {
      txHash = await ethereumService.createPointsAccount(ethereumAddress, Number(points));
      status = 'CONFIRMED';
    } catch (error) {
      // Keep pending if the chain is unavailable
    }

    await prisma.transaction.create({
      data: {
        userId,
        type: 'POINTS_CREATE',
        status,
        pointsAccountId: account.id,
        amount: BigInt(points),
        metadata: { cryptoValue },
        txHash,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        account: {
          ...account,
          points: account.points.toString(),
          cryptoValue: account.cryptoValue.toString(),
        },
        message: 'Points account created successfully.',
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
      return res.json({
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
      return res.status(404).json({
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
        cryptoValue: cryptoValue.toString(),
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
          cryptoValue: account.cryptoValue.toString(),
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
    const { pointsToAdd } = req.body;
    const { userId, ethereumAddress } = req.user!;

    const account = await prisma.pointsAccount.findUnique({
      where: { ethereumAddress },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Points account not found',
      });
    }

    let txHash = `pending-add-${account.id}-${Date.now()}`;
    let status: 'PENDING' | 'CONFIRMED' = 'PENDING';
    try {
      txHash = await ethereumService.addPoints(ethereumAddress, Number(pointsToAdd), 'api');
      status = 'CONFIRMED';
      await prisma.pointsAccount.update({
        where: { id: account.id },
        data: { points: account.points + BigInt(pointsToAdd), lastSyncAt: new Date() },
      });
    } catch (error) {
      // Keep pending if the chain is unavailable
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'POINTS_ADD',
        status,
        pointsAccountId: account.id,
        amount: BigInt(pointsToAdd),
        txHash,
      },
    });

    // Clear cache
    await cache.del(`points:${ethereumAddress}`);

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        message: 'Points addition initiated. Transaction will be processed on blockchain.',
      },
    });
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
      return res.status(404).json({
        success: false,
        error: 'Points account not found',
      });
    }

    if (account.points < BigInt(pointsToSwap)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient points balance',
      });
    }

    // Calculate crypto value (default rate: 100 points = 1 crypto)
    const cryptoEarned = Math.floor(pointsToSwap / 100);

    let txHash = `pending-swap-${account.id}-${Date.now()}`;
    let status: 'PENDING' | 'CONFIRMED' = 'PENDING';
    let earned = cryptoEarned;
    try {
      const swapped = await ethereumService.swapPoints(ethereumAddress, Number(pointsToSwap));
      txHash = swapped.txHash;
      const cryptoWei = BigInt(swapped.cryptoEarned || '0');
      earned = cryptoWei > BigInt(0) ? Number(cryptoWei / BigInt(1e18)) : cryptoEarned;
      status = 'CONFIRMED';
      await prisma.pointsAccount.update({
        where: { id: account.id },
        data: {
          points: account.points - BigInt(pointsToSwap),
          cryptoValue: account.cryptoValue + cryptoWei,
          lastSyncAt: new Date(),
        },
      });
    } catch (error) {
      // Keep pending if the chain is unavailable
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'POINTS_SWAP',
        status,
        pointsAccountId: account.id,
        amount: BigInt(pointsToSwap),
        metadata: {
          pointsSwapped: pointsToSwap,
          cryptoEarned: earned,
          exchangeRate: 100,
        },
        txHash,
      },
    });

    // Clear cache
    await cache.del(`points:${ethereumAddress}`);

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        pointsSwapped: pointsToSwap,
        cryptoEarned,
        exchangeRate: 100,
        message: 'Points swap initiated. Transaction will be processed on blockchain.',
      },
    });
  })
);

/**
 * GET /api/v1/points/exchange-rate
 * Get current exchange rate
 */
router.get(
  '/exchange-rate',
  asyncHandler(async (req, res) => {
    const { rateOwner } = req.query;

    // Try cache first
    const cacheKey = `exchange-rate:${rateOwner || 'default'}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    try {
      let rate;
      if (rateOwner) {
        rate = await ethereumService.getPointsBalance(rateOwner as string);
      } else {
        // Default rate
        rate = 100; // 100 points = 1 crypto unit
      }

      const result = {
        pointsPerCrypto: rate,
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
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const account = await prisma.pointsAccount.findUnique({
      where: { ethereumAddress },
    });

    if (!account) {
      return res.status(404).json({
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
      currentCryptoValue: account.cryptoValue.toString(),
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
