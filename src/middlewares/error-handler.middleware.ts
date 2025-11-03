/**
 * Error Handler Middleware
 * Central error handling for the application
 * 
 * @module middlewares/error-handler.middleware
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";

/**
 * Custom Application Error Class
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * Catches and formats all errors
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = "Internal server error";
  let errors: Record<string, any> | undefined;

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }
  // Handle validation errors from Joi or other libraries
  else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }
  // Handle database errors
  else if (err.name === "DatabaseError" || err.name === "SequelizeError") {
    statusCode = 500;
    message = "Database error occurred";
  }
  // Handle JWT errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }
  // Generic error
  else {
    message = err.message || message;
  }

  // Log error in development
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ Error:", {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  // Send error response
  ApiResponse.error(res, message, statusCode, errors);
};

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * 
 * @param fn - Async function to wrap
 * @returns Express middleware function
 * 
 * @example
 * router.get('/projects', asyncHandler(async (req, res) => {
 *   const projects = await ProjectModel.findAll();
 *   res.json(projects);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;