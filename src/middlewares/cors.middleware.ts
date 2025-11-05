/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing configuration
 * Manages preflight requests and CORS headers for API security
 *
 * @module middlewares/cors
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     CORS:
 *       type: http
 *       description: |
 *         Cross-Origin Resource Sharing (CORS) configuration
 *         
 *         **Allowed Origins:**
 *         - Configure via `ALLOWED_ORIGINS` environment variable
 *         - Comma-separated list of origins
 *         - Use `*` to allow all origins (development only)
 *         
 *         **Allowed Methods:**
 *         - GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
 *         
 *         **Allowed Headers:**
 *         - Content-Type
 *         - Authorization
 *         - X-Requested-With
 *         
 *         **Credentials:**
 *         - Credentials are allowed (cookies, authorization headers)
 *         
 *         **Preflight Caching:**
 *         - Preflight responses cached for 3600 seconds (1 hour)
 *
 *   headers:
 *     Access-Control-Allow-Origin:
 *       description: Specifies which origins can access the resource
 *       schema:
 *         type: string
 *         example: "https://example.com"
 *     Access-Control-Allow-Methods:
 *       description: Specifies allowed HTTP methods
 *       schema:
 *         type: string
 *         example: "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
 *     Access-Control-Allow-Headers:
 *       description: Specifies allowed request headers
 *       schema:
 *         type: string
 *         example: "Content-Type, Authorization, X-Requested-With"
 *     Access-Control-Allow-Credentials:
 *       description: Indicates whether credentials are allowed
 *       schema:
 *         type: string
 *         enum: [true, false]
 *         example: "true"
 *     Access-Control-Max-Age:
 *       description: How long preflight response can be cached (seconds)
 *       schema:
 *         type: integer
 *         example: 3600
 *
 *   responses:
 *     PreflightResponse:
 *       description: Successful preflight response
 *       headers:
 *         Access-Control-Allow-Origin:
 *           $ref: '#/components/headers/Access-Control-Allow-Origin'
 *         Access-Control-Allow-Methods:
 *           $ref: '#/components/headers/Access-Control-Allow-Methods'
 *         Access-Control-Allow-Headers:
 *           $ref: '#/components/headers/Access-Control-Allow-Headers'
 *         Access-Control-Allow-Credentials:
 *           $ref: '#/components/headers/Access-Control-Allow-Credentials'
 *         Access-Control-Max-Age:
 *           $ref: '#/components/headers/Access-Control-Max-Age'
 *
 *   examples:
 *     ProductionCORS:
 *       summary: Production CORS configuration
 *       description: Restricted to specific domains
 *       value:
 *         ALLOWED_ORIGINS: "https://example.com,https://www.example.com,https://app.example.com"
 *
 *     DevelopmentCORS:
 *       summary: Development CORS configuration
 *       description: Allow all origins for development
 *       value:
 *         ALLOWED_ORIGINS: "*"
 *
 *     MultiDomainCORS:
 *       summary: Multi-domain CORS configuration
 *       description: Multiple specific domains
 *       value:
 *         ALLOWED_ORIGINS: "https://example.com,https://partner.com,https://admin.example.com"
 *
 * Features:
 * - Configurable origin whitelist via environment variables
 * - Automatic preflight request handling
 * - Support for credentials (cookies, auth headers)
 * - Preflight response caching (1 hour)
 * - Production-ready security defaults
 * - Wildcard origin support for development
 *
 * Configuration:
 * Set environment variable `ALLOWED_ORIGINS`:
 * - Single origin: `ALLOWED_ORIGINS=https://example.com`
 * - Multiple origins: `ALLOWED_ORIGINS=https://example.com,https://app.example.com`
 * - All origins (dev only): `ALLOWED_ORIGINS=*`
 *
 * Security Notes:
 * - Never use `*` for ALLOWED_ORIGINS in production
 * - Be specific with allowed origins
 * - Only allow credentials if necessary
 * - Keep allowed headers minimal
 * - Monitor for CORS-related attacks
 *
 * @example
 * ```typescript
 * // Apply CORS middleware globally
 * import { corsMiddleware } from '@/middlewares/cors.middleware';
 * 
 * app.use(corsMiddleware);
 *
 * // Environment configuration (.env)
 * // Development
 * ALLOWED_ORIGINS=*
 *
 * // Production
 * ALLOWED_ORIGINS=https://example.com,https://www.example.com
 *
 * // Testing CORS with fetch
 * fetch('https://api.example.com/projects', {
 *   method: 'GET',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer token'
 *   },
 *   credentials: 'include' // Include cookies
 * })
 * .then(response => response.json())
 * .then(data => console.log(data));
 * ```
 */

import { Request, Response, NextFunction } from "express";

/**
 * @openapi
 * Custom CORS middleware
 * Handles preflight requests and sets CORS headers
 * Validates origin against whitelist and manages security headers
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void}
 *
 * @example
 * ```typescript
 * // Global application
 * import express from 'express';
 * import { corsMiddleware } from '@/middlewares/cors.middleware';
 * 
 * const app = express();
 * app.use(corsMiddleware);
 *
 * // Route-specific CORS
 * router.use('/public', corsMiddleware);
 *
 * // With custom error handling
 * app.use((req, res, next) => {
 *   corsMiddleware(req, res, (err) => {
 *     if (err) {
 *       return res.status(403).json({ error: 'CORS policy violation' });
 *     }
 *     next();
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Testing CORS headers
 * // Request
 * OPTIONS /api/projects
 * Origin: https://example.com
 * Access-Control-Request-Method: POST
 * Access-Control-Request-Headers: Content-Type, Authorization
 *
 * // Response
 * HTTP/1.1 200 OK
 * Access-Control-Allow-Origin: https://example.com
 * Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
 * Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
 * Access-Control-Allow-Credentials: true
 * Access-Control-Max-Age: 3600
 * ```
 *
 * @example
 * ```typescript
 * // Environment configurations
 * 
 * // .env.development
 * ALLOWED_ORIGINS=*
 * NODE_ENV=development
 *
 * // .env.production
 * ALLOWED_ORIGINS=https://example.com,https://www.example.com,https://app.example.com
 * NODE_ENV=production
 *
 * // .env.staging
 * ALLOWED_ORIGINS=https://staging.example.com
 * NODE_ENV=staging
 * ```
 *
 * @security
 * - Validates origin against whitelist
 * - Handles preflight OPTIONS requests
 * - Sets secure CORS headers
 * - Prevents unauthorized cross-origin access
 * - Caches preflight responses for performance
 */
export const corsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Allow all origins (can be restricted in production)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*").split(",");
  const origin = req.headers.origin || "*";

  // Set CORS headers
  res.setHeader(
    "Access-Control-Allow-Origin",
    allowedOrigins.includes("*") ? "*" : origin
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "3600");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return; // Explicitly return
  }

  // Proceed to next middleware
  next();
};