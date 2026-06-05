import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { cache } from '../config/redis';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/transactions
 * Get user's transaction history
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate,
    } = req.query;

    const { userId } = req.user!;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // Try cache for first page with no filters
    const cacheKey = `transactions:${userId}:${pageNum}:${limitNum}:${type || 'all'}:${status || 'all'}`;
    if (pageNum === 1 && !startDate && !endDate) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          travelCard: {
            select: {
              id: true,
              currency: true,
            },
          },
          nft: {
            select: {
              id: true,
              nftId: true,
              description: true,
            },
          },
          pointsAccount: {
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const result = {
      transactions: transactions.map((tx) => ({
        ...tx,
        amount: tx.amount?.toString(),
        nft: tx.nft
          ? {
              ...tx.nft,
              nftId: tx.nft.nftId.toString(),
            }
          : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };

    // Cache first page for 30 seconds
    if (pageNum === 1 && !startDate && !endDate) {
      await cache.set(cacheKey, result, 30);
    }

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/transactions/:id
 * Get specific transaction details
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user!;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        travelCard: {
          select: {
            id: true,
            aptosAddress: true,
            balance: true,
            cryptoBalance: true,
            currency: true,
          },
        },
        nft: {
          select: {
            id: true,
            nftId: true,
            description: true,
            price: true,
            imageUrl: true,
          },
        },
        pointsAccount: {
          select: {
            id: true,
            aptosAddress: true,
            points: true,
            cryptoValue: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...transaction,
        amount: transaction.amount?.toString(),
        travelCard: transaction.travelCard
          ? {
              ...transaction.travelCard,
              balance: transaction.travelCard.balance.toString(),
              cryptoBalance: transaction.travelCard.cryptoBalance.toString(),
            }
          : null,
        nft: transaction.nft
          ? {
              ...transaction.nft,
              nftId: transaction.nft.nftId.toString(),
              price: transaction.nft.price.toString(),
            }
          : null,
        pointsAccount: transaction.pointsAccount
          ? {
              ...transaction.pointsAccount,
              points: transaction.pointsAccount.points.toString(),
              cryptoValue: transaction.pointsAccount.cryptoValue.toString(),
            }
          : null,
      },
    });
  })
);

/**
 * GET /api/v1/transactions/stats/summary
 * Get transaction statistics summary
 */
router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;

    // Try cache first
    const cacheKey = `transaction-stats:${userId}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Get overall statistics
    const [
      totalTransactions,
      pendingCount,
      confirmedCount,
      failedCount,
      recentTransactions,
      transactionsByType,
    ] = await Promise.all([
      prisma.transaction.count({ where: { userId } }),
      prisma.transaction.count({ where: { userId, status: 'PENDING' } }),
      prisma.transaction.count({ where: { userId, status: 'CONFIRMED' } }),
      prisma.transaction.count({ where: { userId, status: 'FAILED' } }),
      prisma.transaction.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          createdAt: true,
        },
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        where: { userId },
        _count: true,
      }),
    ]);

    const result = {
      overview: {
        total: totalTransactions,
        pending: pendingCount,
        confirmed: confirmedCount,
        failed: failedCount,
      },
      byType: transactionsByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      recent: recentTransactions.map((tx) => ({
        ...tx,
        amount: tx.amount?.toString(),
      })),
    };

    // Cache for 1 minute
    await cache.set(cacheKey, result, 60);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/transactions/stats/chart
 * Get transaction data for charts (last 30 days)
 */
router.get(
  '/stats/chart',
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;
    const { days = 30 } = req.query;

    const daysNum = parseInt(days as string, 10);

    // Try cache first
    const cacheKey = `transaction-chart:${userId}:${daysNum}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get transactions grouped by date
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        type: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const chartData: Record<string, any> = {};

    transactions.forEach((tx) => {
      const date = tx.createdAt.toISOString().split('T')[0];

      if (!chartData[date]) {
        chartData[date] = {
          date,
          total: 0,
          confirmed: 0,
          pending: 0,
          failed: 0,
          byType: {},
        };
      }

      chartData[date].total++;
      chartData[date][tx.status.toLowerCase()]++;

      if (!chartData[date].byType[tx.type]) {
        chartData[date].byType[tx.type] = 0;
      }
      chartData[date].byType[tx.type]++;
    });

    const result = Object.values(chartData);

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/transactions/pending
 * Get all pending transactions
 */
router.get(
  '/pending',
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        travelCard: {
          select: {
            currency: true,
          },
        },
        nft: {
          select: {
            nftId: true,
            description: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.map((tx) => ({
          ...tx,
          amount: tx.amount?.toString(),
          nft: tx.nft
            ? {
                ...tx.nft,
                nftId: tx.nft.nftId.toString(),
              }
            : null,
        })),
        count: transactions.length,
      },
    });
  })
);

/**
 * POST /api/v1/transactions/:id/retry
 * Retry a failed transaction
 */
router.post(
  '/:id/retry',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user!;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId,
        status: 'FAILED',
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or cannot be retried',
      });
    }

    // Update transaction status to pending
    await prisma.transaction.update({
      where: { id },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Transaction retry initiated. It will be processed on blockchain.',
      },
    });
  })
);

/**
 * GET /api/v1/transactions/export
 * Export transactions as CSV
 */
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;
    const { startDate, endDate } = req.query;

    // Build filters
    const where: any = { userId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        txHash: true,
        type: true,
        status: true,
        amount: true,
        fromAddress: true,
        toAddress: true,
        createdAt: true,
        blockTimestamp: true,
      },
    });

    // Convert to CSV
    const headers = [
      'Transaction Hash',
      'Type',
      'Status',
      'Amount',
      'From',
      'To',
      'Created At',
      'Block Time',
    ];

    const csv = [
      headers.join(','),
      ...transactions.map((tx) =>
        [
          tx.txHash,
          tx.type,
          tx.status,
          tx.amount?.toString() || '0',
          tx.fromAddress || '',
          tx.toAddress || '',
          tx.createdAt.toISOString(),
          tx.blockTimestamp?.toISOString() || '',
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transactions-${new Date().toISOString()}.csv`
    );
    res.send(csv);
  })
);

export default router;
