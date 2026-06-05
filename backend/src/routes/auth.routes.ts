import { Router } from 'express';
import { authService } from '../services/auth.service';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  validate(schemas.register),
  asyncHandler(async (req, res) => {
    const { email, username, password, aptosAddress } = req.body;

    const result = await authService.register({
      email,
      username,
      password,
      aptosAddress,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post(
  '/login',
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  validate(schemas.refreshToken),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/auth/logout
 * Logout user
 */
router.post(
  '/logout',
  validate(schemas.refreshToken),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

export default router;
