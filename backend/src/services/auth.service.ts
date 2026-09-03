import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface JwtPayload {
  userId: string;
  ethereumAddress: string;
  email: string;
}

export class AuthService {
  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compare password
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  /**
   * Verify token
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Register new user
   */
  async register(data: {
    email: string;
    username: string;
    password: string;
    ethereumAddress: string;
  }) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            { username: data.username },
            { ethereumAddress: data.ethereumAddress },
          ],
        },
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash,
          ethereumAddress: data.ethereumAddress,
        },
        select: {
          id: true,
          email: true,
          username: true,
          ethereumAddress: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const payload: JwtPayload = {
        userId: user.id,
        ethereumAddress: user.ethereumAddress,
        email: user.email,
      };

      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      logger.info(`User registered: ${user.email}`);

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isValidPassword = await this.comparePassword(password, user.passwordHash);

      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate tokens
      const payload: JwtPayload = {
        userId: user.id,
        ethereumAddress: user.ethereumAddress,
        email: user.email,
      };

      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      logger.info(`User logged in: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          ethereumAddress: user.ethereumAddress,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.verifyToken(refreshToken);

      // Check if refresh token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const newPayload: JwtPayload = {
        userId: storedToken.user.id,
        ethereumAddress: storedToken.user.ethereumAddress,
        email: storedToken.user.email,
      };

      const accessToken = this.generateAccessToken(newPayload);

      return { accessToken };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string) {
    try {
      await prisma.refreshToken.delete({
        where: { token: refreshToken },
      });

      logger.info('User logged out');
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
