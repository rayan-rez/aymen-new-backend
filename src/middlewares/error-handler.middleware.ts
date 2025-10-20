/**
 * Error handling middleware
 * Centralized error handling for the entire application
 * Catches and formats errors consistently
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@utils/response.util";

/**
 * Custom application error class
 * Extends native Error with HTTP status code
 *
 * @example
 * throw new AppError("Resource not found", 404);
 * throw new AppError("Unauthorized access", 401);
 */
export class AppError extends Error {
  /** HTTP status code */
  public readonly statusCode: number;

  /** Whether the error is operational (expected) or programming error */
  public readonly isOperational: boolean;

  /**
   * Creates an AppError instance
   * @param message - Error message to display
   * @param statusCode - HTTP status code (default: 500)
   * @param isOperational - Whether error is operational (default: true)
   */
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Capture stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Should be the last middleware mounted in the application
 *
 * @param err - Error object (can be AppError or native Error)
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function (for compatibility)
 *
 * @example
 * app.use(errorHandler); // Mount as last middleware
 */
export const errorHandler = (
  err: AppError | Error | any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Determine status code and message
  let statusCode = 500;
  let message = "Internal server error";
  let isOperational = false;

  if (err instanceof AppError) {
    // Handle custom AppError instances
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err instanceof Error) {
    // Handle native Error instances
    message = err.message;
  }

  // Log error for debugging
  const errorLog = {
    timestamp: new Date().toISOString(),
    statusCode,
    message,
    isOperational,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  };

  console.error("Error:", errorLog);

  // Send error response
  ApiResponse.error(res, message, statusCode);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 *
 * @param fn - Async route handler function
 * @returns Wrapped function that catches errors
 *
 * @example
 * router.get("/users", asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   ApiResponse.success(res, users);
 * }));
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Not found middleware
 * Handles requests to non-existent routes
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponse.notFound(res, `Route ${req.path} not found`);
};
