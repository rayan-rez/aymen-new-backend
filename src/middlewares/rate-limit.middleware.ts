/**
 * Rate Limiting Middleware
 * Protects API from abuse using express-rate-limit
 *
 * Install: npm install express-rate-limit
 *
 * @module middlewares/rate-limit.middleware
 */

import rateLimit, {
  RateLimitRequestHandler,
} from "express-rate-limit";
import { ApiResponse } from "@/utils/response.util";
import { Request, Response } from "express";

/**
 * Custom rate limit handler
 */
const rateLimitHandler = (req: Request, res: Response): void => {
  ApiResponse.error(res, "Too many requests, please try again later", 429);
};

/**
 * General API rate limiter
 * 300 requests per 15 minutes per IP
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for certain conditions (e.g., admin endpoints)
    return false;
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Form submission rate limiter
 * 10 requests per hour per IP
 */
export const formLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 form submissions per hour
  message: "Too many form submissions, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Use email or IP for rate limiting
    return req.body.email || req.ip || "unknown";
  },
});

/**
 * Search rate limiter
 * 30 requests per minute per IP
 */
export const searchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: "Too many search requests, please slow down",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Download rate limiter
 * 20 downloads per hour per IP
 */
export const downloadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 downloads per hour
  message: "Too many download requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Aggressive rate limiter for sensitive endpoints
 * 3 requests per 5 minutes per IP
 */
export const strictLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each IP to 3 requests per 5 minutes
  message: "Too many requests, please wait before trying again",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Create custom rate limiter
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests
 * @param message - Error message
 * @returns Rate limiter middleware
 *
 * @example
 * const customLimiter = createRateLimiter(60000, 50, "Custom rate limit exceeded");
 * router.use('/custom', customLimiter);
 */
export const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string = "Too many requests"
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
};

export default {
  apiLimiter,
  authLimiter,
  formLimiter,
  searchLimiter,
  downloadLimiter,
  strictLimiter,
  createRateLimiter,
};
