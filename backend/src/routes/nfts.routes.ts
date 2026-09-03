import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { cache } from '../config/redis';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/nfts
 * Create a new experience NFT
 */
router.post(
  '/',
  validate(schemas.createNFT),
  asyncHandler(async (req, res) => {
    const { description, price, imageUrl, category, location } = req.body;
    const { userId, ethereumAddress } = req.user!;

    // Check if collection is initialized
    const existingNFTs = await prisma.nFT.findFirst({
      where: { ethereumAddress },
    });

    // Get next NFT ID
    const nftCount = await prisma.nFT.count({
      where: { ethereumAddress },
    });
    const nextNftId = nftCount;

    // Create NFT in database
    const nft = await prisma.nFT.create({
      data: {
        userId,
        ethereumAddress,
        nftId: BigInt(nextNftId),
        description,
        price: BigInt(price),
        imageUrl,
        category,
        location,
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        type: 'NFT_CREATE',
        status: 'PENDING',
        nftId: nft.id,
        amount: BigInt(price),
        metadata: {
          description,
          imageUrl,
          category,
          location,
        },
        txHash: 'pending',
      },
    });

    // Clear cache
    await cache.delPattern(`nfts:${ethereumAddress}*`);

    res.status(201).json({
      success: true,
      data: {
        nft: {
          ...nft,
          nftId: nft.nftId.toString(),
          price: nft.price.toString(),
        },
        message: 'NFT creation initiated. Transaction will be processed on blockchain.',
      },
    });
  })
);

/**
 * GET /api/v1/nfts
 * Get all NFTs for current user
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { ethereumAddress } = req.user!;
    const { page = 1, limit = 20, category, listed } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = { ethereumAddress };
    if (category) {
      where.category = category;
    }
    if (listed !== undefined) {
      where.isListed = listed === 'true';
    }

    // Try cache first
    const cacheKey = `nfts:${ethereumAddress}:${pageNum}:${limitNum}:${category || 'all'}:${listed || 'all'}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Get from database
    const [nfts, total] = await Promise.all([
      prisma.nFT.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.nFT.count({ where }),
    ]);

    const result = {
      nfts: nfts.map((nft) => ({
        ...nft,
        nftId: nft.nftId.toString(),
        price: nft.price.toString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/nfts/:id
 * Get specific NFT details
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { ethereumAddress } = req.user!;

    const nft = await prisma.nFT.findFirst({
      where: {
        id,
        ethereumAddress,
      },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...nft,
        nftId: nft.nftId.toString(),
        price: nft.price.toString(),
      },
    });
  })
);

/**
 * POST /api/v1/nfts/:id/offer
 * Offer NFT for transfer to another user
 */
router.post(
  '/:id/offer',
  validate(schemas.offerNFT),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { recipientAddress } = req.body;
    const { userId, ethereumAddress } = req.user!;

    // Validate NFT ownership
    const nft = await prisma.nFT.findFirst({
      where: {
        id,
        ethereumAddress,
      },
    });

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found or you do not own this NFT',
      });
    }

    if (nft.isPendingTransfer) {
      return res.status(400).json({
        success: false,
        error: 'NFT already has a pending transfer',
      });
    }

    if (recipientAddress === ethereumAddress) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer NFT to yourself',
      });
    }

    // Update NFT status
    await prisma.nFT.update({
      where: { id },
      data: {
        isPendingTransfer: true,
        pendingTo: recipientAddress,
      },
    });

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'NFT_OFFER',
        status: 'PENDING',
        nftId: nft.id,
        fromAddress: ethereumAddress,
        toAddress: recipientAddress,
        metadata: {
          nftId: nft.nftId.toString(),
          description: nft.description,
        },
        txHash: 'pending',
      },
    });

    // Clear cache
    await cache.delPattern(`nfts:${ethereumAddress}*`);

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        message: 'NFT transfer offer initiated. Recipient can now claim the NFT.',
      },
    });
  })
);

/**
 * POST /api/v1/nfts/:id/claim
 * Claim an NFT that was offered to you
 */
router.post(
  '/:id/claim',
  validate(schemas.claimNFT),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fromAddress } = req.body;
    const { userId, ethereumAddress } = req.user!;

    // Find NFT offered to this user
    const nft = await prisma.nFT.findFirst({
      where: {
        id,
        ethereumAddress: fromAddress,
        isPendingTransfer: true,
        pendingTo: ethereumAddress,
      },
    });

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found or not offered to you',
      });
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'NFT_CLAIM',
        status: 'PENDING',
        nftId: nft.id,
        fromAddress,
        toAddress: ethereumAddress,
        metadata: {
          nftId: nft.nftId.toString(),
          description: nft.description,
        },
        txHash: 'pending',
      },
    });

    // Clear cache
    await cache.delPattern(`nfts:${fromAddress}*`);
    await cache.delPattern(`nfts:${ethereumAddress}*`);

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        message: 'NFT claim initiated. Transaction will be processed on blockchain.',
      },
    });
  })
);

/**
 * POST /api/v1/nfts/:id/cancel
 * Cancel a pending NFT transfer offer
 */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId, ethereumAddress } = req.user!;

    // Validate NFT ownership
    const nft = await prisma.nFT.findFirst({
      where: {
        id,
        ethereumAddress,
        isPendingTransfer: true,
      },
    });

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found or no pending transfer',
      });
    }

    // Update NFT status
    await prisma.nFT.update({
      where: { id },
      data: {
        isPendingTransfer: false,
        pendingTo: null,
      },
    });

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'NFT_CANCEL',
        status: 'PENDING',
        nftId: nft.id,
        metadata: {
          nftId: nft.nftId.toString(),
          cancelledTo: nft.pendingTo,
        },
        txHash: 'pending',
      },
    });

    // Clear cache
    await cache.delPattern(`nfts:${ethereumAddress}*`);

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        message: 'NFT transfer cancelled successfully.',
      },
    });
  })
);

/**
 * PUT /api/v1/nfts/:id/list
 * List or unlist NFT for sale
 */
router.put(
  '/:id/list',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isListed } = req.body;
    const { ethereumAddress } = req.user!;

    const nft = await prisma.nFT.findFirst({
      where: {
        id,
        ethereumAddress,
      },
    });

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found',
      });
    }

    if (nft.isPendingTransfer) {
      return res.status(400).json({
        success: false,
        error: 'Cannot list NFT with pending transfer',
      });
    }

    await prisma.nFT.update({
      where: { id },
      data: { isListed },
    });

    // Clear cache
    await cache.delPattern(`nfts:${ethereumAddress}*`);

    res.json({
      success: true,
      data: {
        message: `NFT ${isListed ? 'listed' : 'unlisted'} successfully`,
      },
    });
  })
);

/**
 * GET /api/v1/nfts/marketplace/featured
 * Get featured NFTs from marketplace (public)
 */
router.get(
  '/marketplace/featured',
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Cache key for featured NFTs
    const cacheKey = `marketplace:featured:${limitNum}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const nfts = await prisma.nFT.findMany({
      where: {
        isListed: true,
        isPendingTransfer: false,
      },
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
          },
        },
      },
    });

    const result = nfts.map((nft) => ({
      ...nft,
      nftId: nft.nftId.toString(),
      price: nft.price.toString(),
    }));

    // Cache for 2 minutes
    await cache.set(cacheKey, result, 120);

    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;
