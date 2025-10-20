/**
 * Validation middleware
 * Handles request payload validation and sanitization
 * Fixes TypeScript error: "Not all code paths return a value"
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@utils/response.util";
import {
  validateEmail,
  validatePhone,
  validateStringLength,
  sanitizeString,
} from "@utils/validators.util";

/**
 * Validates contact form submission
 * Ensures all required fields are present and valid
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * @returns void - Calls next() on success, sends error response on failure
 */
export const validateContactForm = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, email, phone, message } = req.body;

  // Initialize errors object
  const errors: Record<string, string> = {};

  // Validate name
  if (!validateStringLength(name, 2, 100)) {
    errors.name = "Name must be between 2 and 100 characters";
  }

  // Validate email
  if (!validateEmail(email)) {
    errors.email = "Valid email address is required";
  }

  // Validate phone
  if (!validatePhone(phone)) {
    errors.phone =
      "Valid phone number is required (minimum 8 digits, alphanumeric format)";
  }

  // Validate message
  if (!validateStringLength(message, 10, 5000)) {
    errors.message = "Message must be between 10 and 5000 characters";
  }

  // If validation failed, return error response
  if (Object.keys(errors).length > 0) {
    ApiResponse.badRequest(res, "Validation failed", errors);
    return; // Explicitly return to satisfy TypeScript
  }

  // Validation passed, proceed to next middleware
  next();
};

/**
 * Sanitizes contact form input
 * Removes potentially harmful characters from user input
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * @returns void - Always calls next() after sanitizing
 */
export const sanitizeContactForm = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, email, phone, message } = req.body;

  // Sanitize string fields
  if (name) {
    req.body.name = sanitizeString(name);
  }

  if (email) {
    req.body.email = sanitizeString(email).toLowerCase();
  }

  if (phone) {
    req.body.phone = sanitizeString(phone);
  }

  if (message) {
    req.body.message = sanitizeString(message);
  }

  // Always proceed to next middleware
  next();
};

/**
 * Generic validation middleware factory
 * Creates validation middleware for different request types
 *
 * @param validationFn - Validation function to apply
 * @returns Middleware function
 *
 * @example
 * const validateUser = createValidationMiddleware(validateUserInput);
 * router.post("/users", validateUser, userController.create);
 */
export const createValidationMiddleware =
  (
    validationFn: (data: any) => {
      isValid: boolean;
      errors: Record<string, string>;
    }
  ) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const validationResult = validationFn(req.body);

    if (!validationResult.isValid) {
      ApiResponse.badRequest(res, "Validation failed", validationResult.errors);
      return; // Explicitly return
    }

    next();
  };
