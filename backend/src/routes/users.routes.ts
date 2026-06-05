import { Router } from 'express';
import { prisma } from '../config/database';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import Joi from 'joi';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        aptosAddress: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * PUT /api/v1/users/me
 * Update user profile
 */
router.put(
  '/me',
  validate(
    Joi.object({
      firstName: Joi.string().min(1).max(50).optional(),
      lastName: Joi.string().min(1).max(50).optional(),
      avatar: Joi.string().uri().optional(),
      bio: Joi.string().max(500).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;
    const { firstName, lastName, avatar, bio } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        avatar,
        bio,
      },
      select: {
        id: true,
        email: true,
        username: true,
        aptosAddress: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
      },
    });

    res.json({
      success: true,
      data: updatedUser,
    });
  })
);

/**
 * PUT /api/v1/users/me/password
 * Change user password
 */
router.put(
  '/me/password',
  validate(
    Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(8).required(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;
    const { currentPassword, newPassword } = req.body;

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    const isValid = await authService.comparePassword(
      currentPassword,
      user.passwordHash
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const newPasswordHash = await authService.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    res.json({
      success: true,
      data: {
        message: 'Password updated successfully',
      },
    });
  })
);

/**
 * GET /api/v1/users/me/stats
 * Get user statistics
 */
router.get(
  '/me/stats',
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;

    const [
      travelCard,
      nftCount,
      pointsAccount,
      transactionCount,
      confirmedTransactions,
    ] = await Promise.all([
      prisma.travelCard.findFirst({
        where: { userId },
        select: {
          balance: true,
          cryptoBalance: true,
          currency: true,
        },
      }),
      prisma.nFT.count({ where: { userId } }),
      prisma.pointsAccount.findFirst({
        where: { userId },
        select: {
          points: true,
          cryptoValue: true,
        },
      }),
      prisma.transaction.count({ where: { userId } }),
      prisma.transaction.count({
        where: { userId, status: 'CONFIRMED' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        travelCard: travelCard
          ? {
              balance: travelCard.balance.toString(),
              cryptoBalance: travelCard.cryptoBalance.toString(),
              currency: travelCard.currency,
            }
          : null,
        nfts: {
          total: nftCount,
        },
        points: pointsAccount
          ? {
              points: pointsAccount.points.toString(),
              cryptoValue: pointsAccount.cryptoValue.toString(),
            }
          : null,
        transactions: {
          total: transactionCount,
          confirmed: confirmedTransactions,
        },
      },
    });
  })
);

/**
 * GET /api/v1/users/:username
 * Get public user profile by username
 */
router.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        aptosAddress: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get public stats
    const [nftCount, listedNFTs] = await Promise.all([
      prisma.nFT.count({
        where: { userId: user.id },
      }),
      prisma.nFT.findMany({
        where: {
          userId: user.id,
          isListed: true,
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nftId: true,
          description: true,
          price: true,
          imageUrl: true,
          category: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        profile: user,
        stats: {
          nftCount,
        },
        listedNFTs: listedNFTs.map((nft) => ({
          ...nft,
          nftId: nft.nftId.toString(),
          price: nft.price.toString(),
        })),
      },
    });
  })
);

/**
 * DELETE /api/v1/users/me
 * Delete user account
 */
router.delete(
  '/me',
  validate(
    Joi.object({
      password: Joi.string().required(),
      confirmation: Joi.string().valid('DELETE').required(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { userId } = req.user!;
    const { password } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify password
    const isValid = await authService.comparePassword(password, user.passwordHash);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password is incorrect',
      });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      data: {
        message: 'Account deleted successfully',
      },
    });
  })
);

export default router;
