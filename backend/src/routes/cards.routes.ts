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
 * POST /api/v1/cards
 * Create a new travel card
 */
router.post(
  '/',
  validate(schemas.createTravelCard),
  asyncHandler(async (req, res) => {
    const { initialBalance, currency } = req.body;
    const { userId, ethereumAddress } = req.user!;

    // Check if user already has a card
    const existingCard = await prisma.travelCard.findUnique({
      where: { ethereumAddress },
    });

    if (existingCard) {
      return res.status(400).json({
        success: false,
        error: 'User already has a travel card',
      });
    }

    // Create card in database
    const card = await prisma.travelCard.create({
      data: {
        userId,
        ethereumAddress,
        balance: BigInt(initialBalance),
        currency,
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        type: 'CARD_CREATE',
        status: 'PENDING',
        travelCardId: card.id,
        amount: BigInt(initialBalance),
        metadata: { currency },
        txHash: 'pending',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        card: {
          ...card,
          balance: card.balance.toString(),
          cryptoBalance: card.cryptoBalance.toString(),
        },
        message: 'Travel card created successfully. Transaction will be processed on blockchain.',
      },
    });
  })
);

/**
 * GET /api/v1/cards/my
 * Get user's travel card
 */
router.get(
  '/my',
  asyncHandler(async (req, res) => {
    const { ethereumAddress } = req.user!;

    // Try cache first
    const cacheKey = `card:${ethereumAddress}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Get from database
    const card = await prisma.travelCard.findUnique({
      where: { ethereumAddress },
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Travel card not found',
      });
    }

    // Sync with blockchain
    try {
      const balance = await ethereumService.getTravelCardBalance(ethereumAddress);
      const cryptoBalance = await ethereumService.getCryptoBalance(ethereumAddress);

      // Update database
      await prisma.travelCard.update({
        where: { id: card.id },
        data: {
          balance: BigInt(balance),
          cryptoBalance: BigInt(cryptoBalance),
          lastSyncAt: new Date(),
        },
      });

      const result = {
        ...card,
        balance: balance.toString(),
        cryptoBalance: cryptoBalance.toString(),
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
          ...card,
          balance: card.balance.toString(),
          cryptoBalance: card.cryptoBalance.toString(),
        },
        warning: 'Could not sync with blockchain, showing cached data',
      });
    }
  })
);

/**
 * POST /api/v1/cards/load-funds
 * Load funds to travel card
 */
router.post(
  '/load-funds',
  validate(schemas.loadFunds),
  asyncHandler(async (req, res) => {
    const { amount } = req.body;
    const { userId, ethereumAddress } = req.user!;

    const card = await prisma.travelCard.findUnique({
      where: { ethereumAddress },
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Travel card not found',
      });
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'CARD_LOAD_FUNDS',
        status: 'PENDING',
        travelCardId: card.id,
        amount: BigInt(amount),
        txHash: 'pending',
      },
    });

    // Clear cache
    await cache.del(`card:${ethereumAddress}`);

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        message: 'Funds loading initiated. Transaction will be processed on blockchain.',
      },
    });
  })
);

/**
 * POST /api/v1/cards/convert-to-crypto
 * Convert fiat to crypto
 */
router.post(
  '/convert-to-crypto',
  validate(schemas.convertToCrypto),
  asyncHandler(async (req, res) => {
    const { amount } = req.body;
    const { userId, ethereumAddress } = req.user!;

    const card = await prisma.travelCard.findUnique({
      where: { ethereumAddress },
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Travel card not found',
      });
    }

    if (card.balance < BigInt(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'CARD_CONVERT_CRYPTO',
        status: 'PENDING',
        travelCardId: card.id,
        amount: BigInt(amount),
        txHash: 'pending',
      },
    });

    // Clear cache
    await cache.del(`card:${ethereumAddress}`);

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        message: 'Conversion initiated. Transaction will be processed on blockchain.',
      },
    });
  })
);

export default router;
