import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';

/**
 * Middleware to validate request body
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error:', { errors, body: req.body });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validation schemas
 */
export const schemas = {
  // Auth schemas
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required(),
    ethereumAddress: Joi.string().required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  // Travel Card schemas
  createTravelCard: Joi.object({
    initialBalance: Joi.number().min(0).required(),
    currency: Joi.string().length(3).uppercase().required(),
  }),

  loadFunds: Joi.object({
    amount: Joi.number().min(1).required(),
  }),

  convertToCrypto: Joi.object({
    amount: Joi.number().min(1).required(),
  }),

  // NFT schemas
  createNFT: Joi.object({
    description: Joi.string().min(1).max(1000).required(),
    price: Joi.number().min(0).required(),
    imageUrl: Joi.string().uri().optional(),
    category: Joi.string().optional(),
    location: Joi.string().optional(),
  }),

  offerNFT: Joi.object({
    recipientAddress: Joi.string().required(),
    nftId: Joi.number().integer().min(0).required(),
  }),

  claimNFT: Joi.object({
    fromAddress: Joi.string().required(),
    nftId: Joi.number().integer().min(0).required(),
  }),

  // Points schemas
  createPointsExchange: Joi.object({
    points: Joi.number().integer().min(1).required(),
    cryptoValue: Joi.number().min(0).required(),
  }),

  swapPoints: Joi.object({
    pointsToSwap: Joi.number().integer().min(1).required(),
  }),

  addPoints: Joi.object({
    pointsToAdd: Joi.number().integer().min(1).required(),
  }),
};
