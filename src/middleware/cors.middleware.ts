/**
 * CORS middleware
 * Handles Cross-Origin Resource Sharing configuration
 */

import { Request, Response, NextFunction } from "express";

/**
 * Custom CORS middleware
 * Handles preflight requests and CORS headers
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * @returns void
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
