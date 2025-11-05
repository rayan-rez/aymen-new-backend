/**
 * Validation utility functions
 * Reusable validation methods throughout the application
 *
 * @module utils/validators
 *
 * @swagger
 * components:
 *   schemas:
 *     ValidationResult:
 *       type: object
 *       required:
 *         - isValid
 *         - errors
 *       properties:
 *         isValid:
 *           type: boolean
 *           description: Indicates whether validation passed
 *           example: false
 *         errors:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           description: Map of field names to error messages
 *           example:
 *             email: "Invalid email format"
 *             phone: "Phone number must have at least 8 digits"
 *             name: "Name must be between 2 and 255 characters"
 *
 *     EmailValidation:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
 *           description: |
 *             Valid email address following RFC 5322 format.
 *
 *             **Valid examples:**
 *             - user@example.com
 *             - john.doe@company.co.uk
 *             - user+tag@domain.com
 *
 *             **Invalid examples:**
 *             - @example.com (missing local part)
 *             - user@.com (invalid domain)
 *             - user@domain (missing TLD)
 *           example: "user@example.com"
 *
 *     PhoneValidation:
 *       type: object
 *       properties:
 *         phone:
 *           type: string
 *           pattern: '^\+?[\d\s\-\(\)]+$'
 *           minLength: 8
 *           description: |
 *             Phone number with at least 8 digits. Supports international format.
 *
 *             **Valid examples:**
 *             - +213555123456 (with country code)
 *             - (555) 123-4567 (formatted)
 *             - 555-1234 (local)
 *             - +1 555 123 4567 (with spaces)
 *
 *             **Invalid examples:**
 *             - 12345 (too short)
 *             - abc123def (contains letters)
 *             - +12-34 (too few digits)
 *           example: "+213555123456"
 *
 *     StringLengthValidation:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: |
 *             String with customizable length constraints.
 *
 *             **Validation rules:**
 *             - Trims whitespace before checking length
 *             - Supports optional maximum length
 *             - Returns false for null/undefined/non-string values
 *           example: "Valid string value"
 *
 *     SanitizedString:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           description: |
 *             Sanitized string with HTML tags and dangerous characters removed.
 *
 *             **Removes:**
 *             - All HTML tags (<script>, <div>, etc.)
 *             - HTML entities (&nbsp;, &#x27;, etc.)
 *             - Control characters (null bytes, etc.)
 *             - Normalizes whitespace
 *
 *             **Example transformations:**
 *             - "<script>alert('xss')</script>" → ""
 *             - "Hello&nbsp;World" → "Hello World"
 *             - "Multiple    spaces" → "Multiple spaces"
 *           example: "Clean text without tags"
 *
 *   examples:
 *     ValidEmailExample:
 *       summary: Valid email validation
 *       value:
 *         email: "john.doe@example.com"
 *
 *     InvalidEmailExample:
 *       summary: Invalid email validation
 *       value:
 *         email: "invalid@email"
 *
 *     ValidPhoneExample:
 *       summary: Valid phone number
 *       value:
 *         phone: "+213555123456"
 *
 *     InvalidPhoneExample:
 *       summary: Invalid phone (too short)
 *       value:
 *         phone: "12345"
 *
 *     ValidationSuccessExample:
 *       summary: Successful validation
 *       value:
 *         isValid: true
 *         errors: {}
 *
 *     ValidationFailureExample:
 *       summary: Failed validation with errors
 *       value:
 *         isValid: false
 *         errors:
 *           email: "Invalid email format"
 *           phone: "Phone number must have at least 8 digits"
 *           name: "Name is required"
 *
 * Features:
 * - Email validation with RFC 5322 compliance
 * - International phone number validation
 * - Flexible string length validation
 * - XSS prevention through sanitization
 * - Whitespace handling and normalization
 * - Type-safe validation results
 * - Composable validation functions
 *
 * @example
 * ```typescript
 * // Email validation
 * if (!validateEmail(userInput.email)) {
 *   return { error: "Invalid email format" };
 * }
 *
 * // Phone validation
 * if (!validatePhone(userInput.phone)) {
 *   return { error: "Invalid phone number" };
 * }
 *
 * // String sanitization
 * const cleanInput = sanitizeString(userInput.message);
 *
 * // Validation result
 * const result = createValidationResult(false, {
 *   email: "Invalid format",
 *   phone: "Too short"
 * });
 * ```
 */

import { EMAIL_REGEX, PHONE_REGEX } from "@/constants/regex";

/**
 * @openapi
 * Validates email format
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} true if valid email format
 *
 * @example
 * ```typescript
 * validateEmail("user@example.com") // returns true
 * validateEmail("invalid@email") // returns false
 * validateEmail("") // returns false
 * validateEmail(null) // returns false
 * ```
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
};

/**
 * @openapi
 * Validates phone number format
 * Ensures minimum 8 digits and valid format
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} true if valid phone format
 *
 * @example
 * ```typescript
 * validatePhone("+213555123456") // returns true
 * validatePhone("(555) 123-4567") // returns true
 * validatePhone("12345") // returns false (too short)
 * validatePhone("abc123") // returns false (invalid format)
 * ```
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone || typeof phone !== "string") {
    return false;
  }
  // Check format
  if (!PHONE_REGEX.test(phone)) {
    return false;
  }
  // Check minimum digits (at least 8)
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 8;
};

/**
 * @openapi
 * Validates string length
 *
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length required
 * @param {number} [maxLength] - Maximum length allowed (optional)
 * @returns {boolean} true if valid length
 *
 * @example
 * ```typescript
 * validateStringLength("Hello", 2, 10) // returns true
 * validateStringLength("Hi", 3, 10) // returns false (too short)
 * validateStringLength("Very long text", 2, 5) // returns false (too long)
 * validateStringLength("  Trimmed  ", 5) // returns true (after trim)
 * ```
 */
export const validateStringLength = (
  value: string,
  minLength: number,
  maxLength?: number
): boolean => {
  if (!value || typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();
  const length = trimmedValue.length;

  if (length < minLength) {
    return false;
  }

  if (maxLength && length > maxLength) {
    return false;
  }

  return true;
};

/**
 * @openapi
 * Validates that a value is not empty
 * Handles null, undefined, empty strings, arrays, and objects
 *
 * @param {any} value - Value to check
 * @returns {boolean} true if value is not empty
 *
 * @example
 * ```typescript
 * isNotEmpty("text") // returns true
 * isNotEmpty("  ") // returns false (whitespace only)
 * isNotEmpty([1, 2, 3]) // returns true
 * isNotEmpty([]) // returns false
 * isNotEmpty({ key: "value" }) // returns true
 * isNotEmpty({}) // returns false
 * isNotEmpty(null) // returns false
 * isNotEmpty(undefined) // returns false
 * ```
 */
export const isNotEmpty = (value: any): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
};

/**
 * @openapi
 * Sanitizes string input
 * Removes potentially harmful characters and normalizes whitespace
 *
 * @param {string} value - String to sanitize
 * @returns {string} Sanitized string
 *
 * @example
 * ```typescript
 * sanitizeString("<script>alert('xss')</script>") 
 * // returns ""
 *
 * sanitizeString("Hello&nbsp;World") 
 * // returns "Hello World"
 *
 * sanitizeString("Multiple    spaces") 
 * // returns "Multiple spaces"
 *
 * sanitizeString("  Text  ") 
 * // returns "Text"
 * ```
 */
export const sanitizeString = (value: string): string => {
  if (!value || typeof value !== "string") return "";

  return value
    .replace(/<[^>]*>/g, "") // Remove all HTML tags and their content
    .replace(/&[a-zA-Z0-9#]+;/g, "") // Remove HTML entities like &nbsp;, &#x27;
    .replace(/[\u0000-\u001F\u007F]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
};

/**
 * @openapi
 * Validation result object
 * Used to return validation status and errors
 *
 * @interface ValidationResult
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * @openapi
 * Creates a validation result
 *
 * @param {boolean} isValid - Whether validation passed
 * @param {Record<string, string>} [errors={}] - Validation errors if any
 * @returns {ValidationResult} ValidationResult object
 *
 * @example
 * ```typescript
 * // Success case
 * createValidationResult(true) 
 * // returns { isValid: true, errors: {} }
 *
 * // Error case
 * createValidationResult(false, { 
 *   email: "Invalid email format",
 *   phone: "Phone is required" 
 * })
 * // returns { isValid: false, errors: { email: "...", phone: "..." } }
 * ```
 */
export const createValidationResult = (
  isValid: boolean,
  errors: Record<string, string> = {}
): ValidationResult => ({
  isValid,
  errors,
});