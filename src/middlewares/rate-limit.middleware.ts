/**
 * Rate Limiting Middleware
 * Protects API from abuse using express-rate-limit
 * Implements various rate limiting strategies for different endpoints
 *
 * Install: npm install express-rate-limit
 *
 * @module middlewares/rate-limit
 *
 * @swagger
 * components:
 *   schemas:
 *     RateLimitError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Too many requests, please try again later"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *   headers:
 *     RateLimit-Limit:
 *       description: Maximum number of requests allowed in the time window
 *       schema:
 *         type: integer
 *         example: 300
 *     RateLimit-Remaining:
 *       description: Number of requests remaining in current window
 *       schema:
 *         type: integer
 *         example: 245
 *     RateLimit-Reset:
 *       description: Unix timestamp when the rate limit resets
 *       schema:
 *         type: integer
 *         example: 1699876543
 *     Retry-After:
 *       description: Seconds to wait before making another request
 *       schema:
 *         type: integer
 *         example: 900
 *
 *   responses:
 *     TooManyRequests:
 *       description: Rate limit exceeded
 *       headers:
 *         RateLimit-Limit:
 *           $ref: '#/components/headers/RateLimit-Limit'
 *         RateLimit-Remaining:
 *           $ref: '#/components/headers/RateLimit-Remaining'
 *         RateLimit-Reset:
 *           $ref: '#/components/headers/RateLimit-Reset'
 *         Retry-After:
 *           $ref: '#/components/headers/Retry-After'
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RateLimitError'
 *           examples:
 *             apiRateLimit:
 *               summary: API rate limit exceeded
 *               value:
 *                 success: false
 *                 message: "Too many requests from this IP, please try again later"
 *                 timestamp: "2025-11-05T10:30:00.000Z"
 *             authRateLimit:
 *               summary: Auth rate limit exceeded
 *               value:
 *                 success: false
 *                 message: "Too many authentication attempts, please try again later"
 *                 timestamp: "2025-11-05T10:30:00.000Z"
 *
 *   examples:
 *     ApiLimiterConfig:
 *       summary: General API rate limiter
 *       description: 300 requests per 15 minutes
 *       value:
 *         windowMs: 900000
 *         max: 300
 *         message: "Too many requests from this IP, please try again later"
 *
 *     AuthLimiterConfig:
 *       summary: Authentication rate limiter
 *       description: 5 attempts per 15 minutes
 *       value:
 *         windowMs: 900000
 *         max: 5
 *         message: "Too many authentication attempts, please try again later"
 *         skipSuccessfulRequests: true
 *
 *     FormLimiterConfig:
 *       summary: Form submission rate limiter
 *       description: 10 submissions per hour
 *       value:
 *         windowMs: 3600000
 *         max: 10
 *         message: "Too many form submissions, please try again later"
 *
 * Features:
 * - Multiple pre-configured rate limiters
 * - IP-based rate limiting
 * - Custom key generation (email, user ID)
 * - Standard rate limit headers (RateLimit-*)
 * - Consistent error responses
 * - Skip successful requests option
 * - Factory function for custom limiters
 *
 * Available Rate Limiters:
 * 1. **apiLimiter**: 300 requests per 15 minutes (general API)
 * 2. **authLimiter**: 5 requests per 15 minutes (authentication)
 * 3. **formLimiter**: 10 requests per hour (form submissions)
 * 4. **searchLimiter**: 30 requests per minute (search endpoints)
 * 5. **downloadLimiter**: 20 requests per hour (file downloads)
 * 6. **strictLimiter**: 3 requests per 5 minutes (sensitive endpoints)
 *
 * Security Benefits:
 * - Prevents brute force attacks
 * - Mitigates DDoS attacks
 * - Prevents API abuse
 * - Protects against credential stuffing
 * - Rate limits spam submissions
 * - Reduces server load
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import {
 *   apiLimiter,
 *   authLimiter,
 *   formLimiter,
 *   searchLimiter,
 *   downloadLimiter,
 *   strictLimiter,
 *   createRateLimiter
 * } from '@/middlewares/rate-limit.middleware';
 *
 * const app = express();
 *
 * // Apply general rate limiter to all routes
 * app.use('/api', apiLimiter);
 *
 * // Apply strict limiter to authentication routes
 * app.post('/api/auth/login', authLimiter, loginController);
 * app.post('/api/auth/register', authLimiter, registerController);
 *
 * // Apply form limiter to contact form
 * app.post('/api/contact', formLimiter, contactController);
 *
 * // Apply search limiter to search endpoint
 * app.get('/api/search', searchLimiter, searchController);
 *
 * // Apply download limiter to file downloads
 * app.get('/api/downloads/:id', downloadLimiter, downloadController);
 *
 * // Create custom rate limiter
 * const customLimiter = createRateLimiter(
 *   60000,  // 1 minute
 *   100,    // 100 requests
 *   "Custom rate limit exceeded"
 * );
 * app.use('/api/custom', customLimiter);
 *
 * // Multiple limiters on single route
 * app.post('/api/sensitive',
 *   apiLimiter,      // General limit
 *   strictLimiter,   // Strict limit
 *   sensitiveController
 * );
 * ```
 */

import rateLimit, {
  RateLimitRequestHandler,
} from "express-rate-limit";
import { ApiResponse } from "@/utils/response.util";
import { Request, Response } from "express";

/**
 * @openapi
 * Custom rate limit handler
 * Provides consistent error responses when rate limit is exceeded
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {void}
 *
 * @example
 * ```typescript
 * // Response when rate limit exceeded
 * {
 *   success: false,
 *   message: "Too many requests, please try again later",
 *   timestamp: "2025-11-05T10:30:00.000Z"
 * }
 *
 * // Response headers include:
 * RateLimit-Limit: 300
 * RateLimit-Remaining: 0
 * RateLimit-Reset: 1699876543
 * Retry-After: 900
 * ```
 */
const rateLimitHandler = (req: Request, res: Response): void => {
  ApiResponse.error(res, "Too many requests, please try again later", 429);
};

/**
 * @openapi
 * General API rate limiter
 * Protects general API endpoints from excessive requests
 * 
 * Configuration:
 * - Window: 15 minutes
 * - Limit: 300 requests per IP
 * - Headers: Standard RateLimit-* headers
 *
 * @type {RateLimitRequestHandler}
 *
 * @example
 * ```typescript
 * import { apiLimiter } from '@/middlewares/rate-limit.middleware';
 *
 * // Apply to all API routes
 * app.use('/api', apiLimiter);
 *
 * // Apply to specific router
 * const projectRouter = express.Router();
 * projectRouter.use(apiLimiter);
 *
 * // Response headers example
 * // GET /api/projects
 * // Headers:
 * // RateLimit-Limit: 300
 * // RateLimit-Remaining: 245
 * // RateLimit-Reset: 1699876543
 * ```
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
 * @openapi
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/registration
 * 
 * Configuration:
 * - Window: 15 minutes
 * - Limit: 5 requests per IP
 * - Skip successful requests: Yes
 * - Use case: Login, register, password reset
 *
 * @type {RateLimitRequestHandler}
 *
 * @example
 * ```typescript
 * import { authLimiter } from '@/middlewares/rate-limit.middleware';
 *
 * // Protect login endpoint
 * router.post('/auth/login', authLimiter, async (req, res) => {
 *   // Only failed login attempts count toward limit
 *   const user = await authenticate(req.body);
 *   res.json({ token: generateToken(user) });
 * });
 *
 * // Protect registration
 * router.post('/auth/register', authLimiter, async (req, res) => {
 *   const user = await createUser(req.body);
 *   res.json({ user });
 * });
 *
 * // Protect password reset
 * router.post('/auth/reset-password', authLimiter, async (req, res) => {
 *   await sendPasswordResetEmail(req.body.email);
 *   res.json({ message: 'Reset email sent' });
 * });
 *
 * // Failed attempts are counted
 * // After 5 failed attempts in 15 minutes:
 * // {
 * //   success: false,
 * //   message: "Too many authentication attempts, please try again later"
 * // }
 * ```
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
 * @openapi
 * Form submission rate limiter
 * Prevents spam on contact forms and other submissions
 * 
 * Configuration:
 * - Window: 1 hour
 * - Limit: 10 submissions per email/IP
 * - Key: Email or IP address
 * - Use case: Contact forms, newsletter signups, feedback
 *
 * @type {RateLimitRequestHandler}
 *
 * @example
 * ```typescript
 * import { formLimiter } from '@/middlewares/rate-limit.middleware';
 *
 * // Protect contact form
 * router.post('/contact', formLimiter, async (req, res) => {
 *   await sendContactEmail(req.body);
 *   res.json({ message: 'Message sent' });
 * });
 *
 * // Protect newsletter signup
 * router.post('/newsletter/subscribe', formLimiter, async (req, res) => {
 *   await subscribeToNewsletter(req.body.email);
 *   res.json({ message: 'Subscribed successfully' });
 * });
 *
 * // Protect feedback form
 * router.post('/feedback', formLimiter, async (req, res) => {
 *   await saveFeedback(req.body);
 *   res.json({ message: 'Thank you for your feedback' });
 * });
 *
 * // Rate limit is per email address
 * // POST /contact with email: user@example.com (1st time) ✓
 * // POST /contact with email: user@example.com (11th time) ✗
 * // Response: "Too many form submissions, please try again later"
 * ```
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
 * @openapi
 * Search rate limiter
 * Prevents search endpoint abuse
 * 
 * Configuration:
 * - Window: 1 minute
 * - Limit: 30 searches per IP
 * - Use case: Search, autocomplete, typeahead
 *
 * @type {RateLimitRequestHandler}
 *
 * @example
 * ```typescript
 * import { searchLimiter } from '@/middlewares/rate-limit.middleware';
 *
 * // Protect search endpoint
 * router.get('/search', searchLimiter, async (req, res) => {
 *   const results = await searchProjects(req.query.q);
 *   res.json(results);
 * });
 *
 * // Protect autocomplete
 * router.get('/autocomplete', searchLimiter, async (req, res) => {
 *   const suggestions = await getAutocompleteSuggestions(req.query.term);
 *   res.json(suggestions);
 * });
 *
 * // Protect typeahead
 * router.get('/typeahead', searchLimiter, async (req, res) => {
 *   const matches = await getTypeaheadMatches(req.query.input);
 *   res.json(matches);
 * });
 *
 * // Allows rapid searching but prevents abuse
 * // 30 searches per minute = 1 every 2 seconds
 * ```
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
 * @openapi
 * Download rate limiter
 * Prevents excessive file downloads
 * 
 * Configuration:
 * - Window: 1 hour
 * - Limit: 20 downloads per IP
 * - Use case: PDFs, floor plans, brochures, documents
 *
 * @type {RateLimitRequestHandler}
 *
 * @example
 * ```typescript
 * import { downloadLimiter } from '@/middlewares/rate-limit.middleware';
 *
 * // Protect PDF downloads
 * router.get('/downloads/brochure/:id', downloadLimiter, async (req, res) => {
 *   const file = await getBrochure(req.params.id);
 *   res.download(file.path);
 * });
 *
 * // Protect floor plan downloads
 * router.get('/floor-plans/:id/pdf', downloadLimiter, async (req, res) => {
 *   const plan = await getFloorPlan(req.params.id);
 *   res.download(plan.pdfUrl);
 * });
 *
 * // Protect document exports
 * router.get('/projects/:id/export', downloadLimiter, async (req, res) => {
 *   const pdf = await generateProjectPDF(req.params.id);
 *   res.download(pdf);
 * });
 *
 * // After 20 downloads in 1 hour:
 * // Response: "Too many download requests, please try again later"
 * ```
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
 * @openapi
 * Aggressive rate limiter for sensitive endpoints
 * Maximum protection for critical operations
 * 
 * Configuration:
 * - Window: 5 minutes
 * - Limit: 3 requests per IP
 * - Use case: Admin actions, delete operations, payment processing
 *
 * @type {RateLimitRequestHandler}
 *
 * @example
 * ```typescript
 * import { strictLimiter } from '@/middlewares/rate-limit.middleware';
 *
 * // Protect delete operations
 * router.delete('/projects/:id', strictLimiter, async (req, res) => {
 *   await deleteProject(req.params.id);
 *   res.json({ message: 'Project deleted' });
 * });
 *
 * // Protect admin actions
 * router.post('/admin/users/:id/ban', strictLimiter, async (req, res) => {
 *   await banUser(req.params.id);
 *   res.json({ message: 'User banned' });
 * });
 *
 * // Protect payment processing
 * router.post('/payments/process', strictLimiter, async (req, res) => {
 *   const result = await processPayment(req.body);
 *   res.json(result);
 * });
 *
 * // Very restrictive: only 3 requests per 5 minutes
 * ```
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
 * @openapi
 * Create custom rate limiter
 * Factory function for creating rate limiters with custom configuration
 *
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum number of requests
 * @param {string} [message="Too many requests"] - Error message
 * @returns {RateLimitRequestHandler} Configured rate limiter middleware
 *
 * @example
 * ```typescript
 * import { createRateLimiter } from '@/middlewares/rate-limit.middleware';
 *
 * // Custom limiter: 50 requests per 30 seconds
 * const customLimiter = createRateLimiter(
 *   30000,  // 30 seconds
 *   50,     // 50 requests
 *   "Custom rate limit exceeded"
 * );
 * router.use('/api/custom', customLimiter);
 *
 * // Video upload limiter: 5 per 10 minutes
 * const videoUploadLimiter = createRateLimiter(
 *   10 * 60 * 1000,  // 10 minutes
 *   5,               // 5 uploads
 *   "Too many video uploads, please wait"
 * );
 * router.post('/upload/video', videoUploadLimiter, uploadController);
 *
 * // API key generation: 1 per day
 * const apiKeyLimiter = createRateLimiter(
 *   24 * 60 * 60 * 1000,  // 24 hours
 *   1,                     // 1 request
 *   "You can only generate one API key per day"
 * );
 * router.post('/api-keys/generate', apiKeyLimiter, generateKeyController);
 *
 * // Webhook: 100 per hour
 * const webhookLimiter = createRateLimiter(
 *   60 * 60 * 1000,  // 1 hour
 *   100,             // 100 requests
 *   "Webhook rate limit exceeded"
 * );
 * router.post('/webhooks/:id', webhookLimiter, webhookController);
 * ```
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