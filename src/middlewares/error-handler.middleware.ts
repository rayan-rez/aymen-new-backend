/**
 * Error Handler Middleware
 * Central error handling for the application
 * Provides consistent error responses and logging
 *
 * @module middlewares/error-handler
 *
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *           description: Always false for error responses
 *         message:
 *           type: string
 *           example: "Validation failed"
 *           description: Human-readable error message
 *         errors:
 *           type: object
 *           additionalProperties: true
 *           description: Detailed error information
 *           example:
 *             email: "Email is required"
 *             password: "Password must be at least 8 characters"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2025-11-05T10:30:00.000Z"
 *         stack:
 *           type: string
 *           description: Error stack trace (development only)
 *           example: "Error: Validation failed\n    at validate..."
 *
 *     ValidationErrorResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             message:
 *               example: "Validation failed"
 *             errors:
 *               type: object
 *               example:
 *                 name: "Name is required"
 *                 email: "Invalid email format"
 *
 *     AuthenticationErrorResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             message:
 *               example: "Invalid token"
 *
 *     NotFoundErrorResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             message:
 *               example: "Route GET /api/projects/999 not found"
 *
 *     DatabaseErrorResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             message:
 *               example: "Database error occurred"
 *
 *     InternalServerErrorResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             message:
 *               example: "Internal server error"
 *
 *   responses:
 *     BadRequest:
 *       description: Bad request - validation failed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidationErrorResponse'
 *           examples:
 *             validationError:
 *               $ref: '#/components/examples/ValidationError'
 *
 *     Unauthorized:
 *       description: Unauthorized - authentication required
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthenticationErrorResponse'
 *           examples:
 *             invalidToken:
 *               $ref: '#/components/examples/InvalidToken'
 *             expiredToken:
 *               $ref: '#/components/examples/ExpiredToken'
 *
 *     NotFound:
 *       description: Not found - resource does not exist
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotFoundErrorResponse'
 *           examples:
 *             routeNotFound:
 *               $ref: '#/components/examples/RouteNotFound'
 *
 *     InternalServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InternalServerErrorResponse'
 *           examples:
 *             serverError:
 *               $ref: '#/components/examples/ServerError'
 *
 *   examples:
 *     ValidationError:
 *       summary: Validation error example
 *       value:
 *         success: false
 *         message: "Validation failed"
 *         errors:
 *           name: "Name is required"
 *           email: "Invalid email format"
 *           price: "Price must be a positive number"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     InvalidToken:
 *       summary: Invalid JWT token
 *       value:
 *         success: false
 *         message: "Invalid token"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     ExpiredToken:
 *       summary: Expired JWT token
 *       value:
 *         success: false
 *         message: "Token expired"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     RouteNotFound:
 *       summary: Route not found
 *       value:
 *         success: false
 *         message: "Route GET /api/projects/999 not found"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     ServerError:
 *       summary: Internal server error
 *       value:
 *         success: false
 *         message: "Internal server error"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     DatabaseError:
 *       summary: Database error
 *       value:
 *         success: false
 *         message: "Database error occurred"
 *         errors:
 *           detail: "Connection timeout"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 * Features:
 * - Centralized error handling
 * - Consistent error response format
 * - Custom AppError class for operational errors
 * - Automatic error type detection (Validation, JWT, Database)
 * - Stack trace in development mode
 * - 404 handler for undefined routes
 * - Async error wrapper utility
 * - Operational vs programming error distinction
 *
 * Error Types Handled:
 * - AppError (custom application errors)
 * - ValidationError (Joi, class-validator)
 * - DatabaseError (Knex, Sequelize)
 * - JsonWebTokenError (JWT)
 * - TokenExpiredError (JWT)
 * - Generic JavaScript errors
 *
 * @example
 * ```typescript
 * // Setup error handling in Express app
 * import express from 'express';
 * import { errorHandler, notFoundHandler } from '@/middlewares/error-handler.middleware';
 * 
 * const app = express();
 * 
 * // ... routes ...
 * 
 * // 404 handler (must be after all routes)
 * app.use(notFoundHandler);
 * 
 * // Error handler (must be last)
 * app.use(errorHandler);
 *
 * // Throwing custom errors in controllers
 * import { AppError } from '@/middlewares/error-handler.middleware';
 * 
 * const getProjectById = async (req, res, next) => {
 *   const project = await ProjectModel.findById(req.params.id);
 *   
 *   if (!project) {
 *     throw new AppError('Project not found', 404);
 *   }
 *   
 *   res.json(project);
 * };
 *
 * // Using asyncHandler
 * import { asyncHandler } from '@/middlewares/error-handler.middleware';
 * 
 * router.get('/projects', asyncHandler(async (req, res) => {
 *   const projects = await ProjectModel.findAll();
 *   res.json(projects);
 * }));
 *
 * // Throwing validation errors
 * if (!req.body.email) {
 *   throw new AppError('Validation failed', 400, true, {
 *     email: 'Email is required'
 *   });
 * }
 * ```
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";

/**
 * @openapi
 * Custom Application Error Class
 * Extends native Error with additional properties for better error handling
 *
 * @class AppError
 * @extends Error
 *
 * @property {number} statusCode - HTTP status code
 * @property {boolean} isOperational - Whether error is operational (vs programming error)
 * @property {Record<string, any>} [errors] - Additional error details
 *
 * @example
 * ```typescript
 * // Throw a 404 error
 * throw new AppError('Project not found', 404);
 *
 * // Throw validation error with details
 * throw new AppError('Validation failed', 400, true, {
 *   email: 'Invalid email format',
 *   password: 'Password too short'
 * });
 *
 * // Throw server error (non-operational)
 * throw new AppError('Critical system failure', 500, false);
 *
 * // Use in async functions
 * const deleteProject = async (id: number) => {
 *   const project = await db('projects').where({ id }).first();
 *   
 *   if (!project) {
 *     throw new AppError('Project not found', 404);
 *   }
 *   
 *   if (project.status === 'published') {
 *     throw new AppError('Cannot delete published project', 403);
 *   }
 *   
 *   await db('projects').where({ id }).del();
 * };
 * ```
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: Record<string, any>;

  /**
   * @openapi
   * Creates an AppError instance
   *
   * @param {string} message - Error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {boolean} [isOperational=true] - Whether error is operational
   * @param {Record<string, any>} [errors] - Additional error details
   *
   * @example
   * ```typescript
   * // Simple error
   * new AppError('Not found', 404);
   *
   * // With validation details
   * new AppError('Validation failed', 400, true, {
   *   name: 'Name is required',
   *   email: 'Invalid email'
   * });
   * ```
   */
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
 * @openapi
 * Error handler middleware
 * Catches and formats all errors into consistent API responses
 * Automatically detects error types and sets appropriate status codes
 *
 * @param {Error | AppError} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 *
 * @example
 * ```typescript
 * // Application setup
 * import { errorHandler } from '@/middlewares/error-handler.middleware';
 * 
 * // Must be last middleware
 * app.use(errorHandler);
 *
 * // Error will be caught and formatted
 * router.post('/projects', async (req, res, next) => {
 *   try {
 *     const project = await ProjectModel.create(req.body);
 *     res.json(project);
 *   } catch (error) {
 *     next(error); // Passes to error handler
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Different error types are handled automatically
 * 
 * // AppError -> Custom status and message
 * throw new AppError('Unauthorized', 401);
 * // Response: { success: false, message: 'Unauthorized' }
 *
 * // ValidationError -> 400 status
 * const schema = Joi.object({ email: Joi.string().required() });
 * schema.validate({}); // Throws ValidationError
 * // Response: { success: false, message: 'Validation failed' }
 *
 * // JsonWebTokenError -> 401 status
 * jwt.verify(invalidToken, secret); // Throws JsonWebTokenError
 * // Response: { success: false, message: 'Invalid token' }
 *
 * // Generic Error -> 500 status
 * throw new Error('Something went wrong');
 * // Response: { success: false, message: 'Something went wrong' }
 * ```
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
 * @openapi
 * 404 Not Found handler
 * Catches requests to undefined routes
 * Should be placed after all route definitions
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 *
 * @example
 * ```typescript
 * import { notFoundHandler, errorHandler } from '@/middlewares/error-handler.middleware';
 * 
 * // Define all routes first
 * app.use('/api/projects', projectRoutes);
 * app.use('/api/users', userRoutes);
 * 
 * // 404 handler (after all routes)
 * app.use(notFoundHandler);
 * 
 * // Error handler (last)
 * app.use(errorHandler);
 *
 * // Any undefined route will return 404
 * // GET /api/undefined-route
 * // Response: {
 * //   success: false,
 * //   message: 'Route GET /api/undefined-route not found'
 * // }
 * ```
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
 * @openapi
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 * Eliminates need for try-catch blocks in every async handler
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 *
 * @example
 * ```typescript
 * import { asyncHandler } from '@/middlewares/error-handler.middleware';
 * 
 * // Without asyncHandler (verbose)
 * router.get('/projects', async (req, res, next) => {
 *   try {
 *     const projects = await ProjectModel.findAll();
 *     res.json(projects);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * // With asyncHandler (clean)
 * router.get('/projects', asyncHandler(async (req, res) => {
 *   const projects = await ProjectModel.findAll();
 *   res.json(projects);
 * }));
 *
 * // Errors are automatically caught and passed to error handler
 * router.get('/projects/:id', asyncHandler(async (req, res) => {
 *   const project = await ProjectModel.findById(req.params.id);
 *   
 *   if (!project) {
 *     throw new AppError('Project not found', 404);
 *   }
 *   
 *   res.json(project);
 * }));
 *
 * // Works with validation
 * router.post('/projects', asyncHandler(async (req, res) => {
 *   if (!req.body.name) {
 *     throw new AppError('Name is required', 400);
 *   }
 *   
 *   const project = await ProjectModel.create(req.body);
 *   res.json(project);
 * }));
 * ```
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;