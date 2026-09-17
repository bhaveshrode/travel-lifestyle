import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../config/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        ethereumAddress: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = authService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // Token invalid, but continue without user
        logger.debug('Optional auth: invalid token, continuing without user');
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};
