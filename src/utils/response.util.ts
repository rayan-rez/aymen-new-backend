/**
 * API Response utility class
 * Provides consistent response formatting throughout the application
 * All API responses should use this class
 *
 * @module utils/response
 *
 * @swagger
 * components:
 *   schemas:
 *     ApiSuccessResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - timestamp
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *           description: Indicates successful operation
 *         message:
 *           type: string
 *           example: "Operation completed successfully"
 *           description: Human-readable success message
 *         data:
 *           type: object
 *           nullable: true
 *           description: Response payload data (can be any type)
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2025-11-05T10:30:00.000Z"
 *           description: ISO 8601 timestamp of the response
 *
 *     ApiErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - timestamp
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *           description: Indicates failed operation
 *         message:
 *           type: string
 *           example: "An error occurred"
 *           description: Human-readable error message
 *         errors:
 *           type: object
 *           additionalProperties: true
 *           description: Detailed error information (validation errors, etc.)
 *           example:
 *             email: "Invalid email format"
 *             phone: "Phone number is required"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2025-11-05T10:30:00.000Z"
 *           description: ISO 8601 timestamp of the response
 *
 *   responses:
 *     Success200:
 *       description: Successful operation
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiSuccessResponse'
 *           example:
 *             success: true
 *             message: "Operation completed successfully"
 *             data: null
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     Created201:
 *       description: Resource created successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiSuccessResponse'
 *           example:
 *             success: true
 *             message: "Resource created successfully"
 *             data:
 *               id: 1
 *               name: "Example Resource"
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     BadRequest400:
 *       description: Bad request - validation error or malformed request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiErrorResponse'
 *           example:
 *             success: false
 *             message: "Validation failed"
 *             errors:
 *               email: "Invalid email format"
 *               name: "Name must be at least 2 characters long"
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     Unauthorized401:
 *       description: Unauthorized - authentication required or invalid credentials
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiErrorResponse'
 *           example:
 *             success: false
 *             message: "Unauthorized access"
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     Forbidden403:
 *       description: Forbidden - insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiErrorResponse'
 *           example:
 *             success: false
 *             message: "Access forbidden"
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     NotFound404:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiErrorResponse'
 *           example:
 *             success: false
 *             message: "Resource not found"
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     Conflict409:
 *       description: Conflict - duplicate resource or state conflict
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiErrorResponse'
 *           example:
 *             success: false
 *             message: "Resource already exists"
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     UnprocessableEntity422:
 *       description: Unprocessable entity - validation passed but data cannot be processed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiErrorResponse'
 *           example:
 *             success: false
 *             message: "Unable to process request"
 *             errors:
 *               reason: "Date must be in the future"
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     InternalServerError500:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiErrorResponse'
 *           example:
 *             success: false
 *             message: "Internal server error"
 *             timestamp: "2025-11-05T10:30:00.000Z"
 *
 * Features:
 * - Consistent response structure across all endpoints
 * - Automatic timestamp generation
 * - Type-safe response methods
 * - Support for detailed error messages
 * - HTTP status code abstraction
 * - Chainable API design
 *
 * @example
 * ```typescript
 * // Success response
 * ApiResponse.success(res, { user: data }, "User created successfully", 201);
 *
 * // Error response
 * ApiResponse.error(res, "User not found", 404);
 *
 * // Validation errors
 * ApiResponse.badRequest(res, "Validation failed", {
 *   email: "Invalid email format",
 *   password: "Password too short"
 * });
 * ```
 */

import { Response } from "express";
import { ApiResponse as ApiResponseInterface } from "@/types/common.types";

/**
 * @openapi
 * ApiResponse utility class
 * Standardizes all API responses for consistency
 *
 * @class ApiResponse
 * @static
 */
export class ApiResponse {
  /**
   * @openapi
   * Sends a success response
   *
   * @param {Response} res - Express response object
   * @param {any} [data=null] - Response data payload
   * @param {string} [message="Success"] - Success message
   * @param {number} [statusCode=200] - HTTP status code
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Simple success
   * ApiResponse.success(res);
   *
   * // With data
   * ApiResponse.success(res, { id: 1, name: "John" }, "User retrieved");
   *
   * // Custom status code
   * ApiResponse.success(res, userData, "User created", 201);
   * ```
   */
  static success(
    res: Response,
    data: any = null,
    message: string = "Success",
    statusCode: number = 200
  ): void {
    const response: ApiResponseInterface = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * @openapi
   * Sends a created (201) response
   * Used for POST requests that create new resources
   *
   * @param {Response} res - Express response object
   * @param {any} data - Created resource data
   * @param {string} [message="Resource created successfully"] - Success message
   * @returns {void}
   *
   * @example
   * ```typescript
   * ApiResponse.created(res, newUser, "User created successfully");
   * ```
   */
  static created(
    res: Response,
    data: any,
    message: string = "Resource created successfully"
  ): void {
    this.success(res, data, message, 201);
  }

  /**
   * @openapi
   * Sends an error response
   *
   * @param {Response} res - Express response object
   * @param {string} [message="Internal server error"] - Error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {Record<string, any>} [errors] - Additional error details
   * @returns {void}
   *
   * @example
   * ```typescript
   * ApiResponse.error(res, "Database connection failed", 500);
   * ```
   */
  static error(
    res: Response,
    message: string = "Internal server error",
    statusCode: number = 500,
    errors?: Record<string, any>
  ): void {
    const response: ApiResponseInterface = {
      success: false,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * @openapi
   * Sends a not found (404) response
   *
   * @param {Response} res - Express response object
   * @param {string} [message="Resource not found"] - Not found message
   * @returns {void}
   *
   * @example
   * ```typescript
   * ApiResponse.notFound(res, "User not found");
   * ```
   */
  static notFound(res: Response, message: string = "Resource not found"): void {
    this.error(res, message, 404);
  }

  /**
   * @openapi
   * Sends a bad request (400) response
   * Used for validation errors and malformed requests
   *
   * @param {Response} res - Express response object
   * @param {string} [message="Bad request"] - Error message
   * @param {Record<string, any>} [errors] - Validation errors object
   * @returns {void}
   *
   * @example
   * ```typescript
   * ApiResponse.badRequest(res, "Validation failed", {
   *   email: "Invalid email format",
   *   password: "Password must be at least 8 characters"
   * });
   * ```
   */
  static badRequest(
    res: Response,
    message: string = "Bad request",
    errors?: Record<string, any>
  ): void {
    this.error(res, message, 400, errors);
  }

  /**
   * @openapi
   * Sends an unauthorized (401) response
   *
   * @param {Response} res - Express response object
   * @param {string} [message="Unauthorized access"] - Error message
   * @returns {void}
   *
   * @example
   * ```typescript
   * ApiResponse.unauthorized(res, "Invalid credentials");
   * ```
   */
  static unauthorized(
    res: Response,
    message: string = "Unauthorized access"
  ): void {
    this.error(res, message, 401);
  }

  /**
   * @openapi
   * Sends a forbidden (403) response
   *
   * @param {Response} res - Express response object
   * @param {string} [message="Access forbidden"] - Error message
   * @returns {void}
   *
   * @example
   * ```typescript
   * ApiResponse.forbidden(res, "Admin access required");
   * ```
   */
  static forbidden(res: Response, message: string = "Access forbidden"): void {
    this.error(res, message, 403);
  }

  /**
   * @openapi
   * Sends a conflict (409) response
   * Used for duplicate resources or state conflicts
   *
   * @param {Response} res - Express response object
   * @param {string} [message="Resource conflict"] - Error message
   * @returns {void}
   *
   * @example
   * ```typescript
   * ApiResponse.conflict(res, "Email already exists");
   * ```
   */
  static conflict(res: Response, message: string = "Resource conflict"): void {
    this.error(res, message, 409);
  }

  /**
   * @openapi
   * Sends an unprocessable entity (422) response
   * Used when validation passes but data cannot be processed
   *
   * @param {Response} res - Express response object
   * @param {string} [message="Unable to process request"] - Error message
   * @param {Record<string, any>} [errors] - Detailed error information
   * @returns {void}
   *
   * @example
   * ```typescript
   * ApiResponse.unprocessable(res, "Invalid date range", {
   *   startDate: "Start date must be before end date"
   * });
   * ```
   */
  static unprocessable(
    res: Response,
    message: string = "Unable to process request",
    errors?: Record<string, any>
  ): void {
    this.error(res, message, 422, errors);
  }
}
