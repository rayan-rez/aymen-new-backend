/**
 * API Response utility class
 * Provides consistent response formatting throughout the application
 * All API responses should use this class
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
 */

import { Response } from "express";
import { ApiResponse as ApiResponseInterface } from "@/types/common.types";

/**
 * ApiResponse utility class
 * Standardizes all API responses for consistency
 *
 * @example
 * // Success response
 * ApiResponse.success(res, data, "User created successfully", 201);
 *
 * @example
 * // Error response
 * ApiResponse.error(res, "User not found", 404);
 *
 * @example
 * // Bad request with validation errors
 * ApiResponse.badRequest(res, "Validation failed", { email: "Invalid email" });
 */
export class ApiResponse {
  /**
   * Sends a success response
   *
   * @param res - Express response object
   * @param data - Response data payload
   * @param message - Success message
   * @param statusCode - HTTP status code (default: 200)
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
   * Sends a created (201) response
   * Used for POST requests that create new resources
   *
   * @param res - Express response object
   * @param data - Created resource data
   * @param message - Success message (default: "Resource created successfully")
   */
  static created(
    res: Response,
    data: any,
    message: string = "Resource created successfully"
  ): void {
    this.success(res, data, message, 201);
  }

  /**
   * Sends an error response
   *
   * @param res - Express response object
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 500)
   * @param errors - Additional error details (optional)
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
   * Sends a not found (404) response
   *
   * @param res - Express response object
   * @param message - Not found message
   */
  static notFound(res: Response, message: string = "Resource not found"): void {
    this.error(res, message, 404);
  }

  /**
   * Sends a bad request (400) response
   * Used for validation errors and malformed requests
   *
   * @param res - Express response object
   * @param message - Error message
   * @param errors - Validation errors object
   */
  static badRequest(
    res: Response,
    message: string = "Bad request",
    errors?: Record<string, any>
  ): void {
    this.error(res, message, 400, errors);
  }

  /**
   * Sends an unauthorized (401) response
   *
   * @param res - Express response object
   * @param message - Error message
   */
  static unauthorized(
    res: Response,
    message: string = "Unauthorized access"
  ): void {
    this.error(res, message, 401);
  }

  /**
   * Sends a forbidden (403) response
   *
   * @param res - Express response object
   * @param message - Error message
   */
  static forbidden(res: Response, message: string = "Access forbidden"): void {
    this.error(res, message, 403);
  }

  /**
   * Sends a conflict (409) response
   * Used for duplicate resources or state conflicts
   *
   * @param res - Express response object
   * @param message - Error message
   */
  static conflict(res: Response, message: string = "Resource conflict"): void {
    this.error(res, message, 409);
  }

  /**
   * Sends an unprocessable entity (422) response
   * Used when validation passes but data cannot be processed
   *
   * @param res - Express response object
   * @param message - Error message
   * @param errors - Detailed error information
   */
  static unprocessable(
    res: Response,
    message: string = "Unable to process request",
    errors?: Record<string, any>
  ): void {
    this.error(res, message, 422, errors);
  }
}