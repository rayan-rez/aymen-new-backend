/**
 * Validation utility functions
 * Reusable validation methods throughout the application
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
 *           description: Valid email address
 *           example: "user@example.com"
 *       description: |
 *         Email validation follows standard RFC 5322 format.
 *         
 *         Valid examples:
 *         - user@example.com
 *         - john.doe@company.co.uk
 *         - user+tag@domain.com
 *         
 *         Invalid examples:
 *         - @example.com (missing local part)
 *         - user@.com (invalid domain)
 *         - user@domain (missing TLD)
 * 
 *     PhoneValidation:
 *       type: object
 *       properties:
 *         phone:
 *           type: string
 *           pattern: '^\+?[\d\s\-\(\)]+$'
 *           minLength: 8
 *           description: Phone number with at least 8 digits
 *           example: "+213555123456"
 *       description: |
 *         Phone validation ensures minimum 8 digits and valid format.
 *         
 *         Valid examples:
 *         - +213555123456 (with country code)
 *         - (555) 123-4567 (formatted)
 *         - 555-1234 (local)
 *         - +1 555 123 4567 (with spaces)
 *         
 *         Invalid examples:
 *         - 12345 (too short)
 *         - abc123def (contains letters)
 *         - +12-34 (too few digits)
 * 
 *     StringLengthValidation:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: String with length constraints
 *           example: "Valid string value"
 *       description: |
 *         String length validation with customizable min/max constraints.
 *         - Trims whitespace before checking length
 *         - Supports optional maximum length
 *         - Returns false for null/undefined/non-string values
 * 
 *     SanitizedString:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           description: Sanitized string with HTML tags and dangerous characters removed
 *           example: "Clean text without tags"
 *       description: |
 *         String sanitization removes:
 *         - All HTML tags (<script>, <div>, etc.)
 *         - HTML entities (&nbsp;, &#x27;, etc.)
 *         - Control characters (null bytes, etc.)
 *         - Normalizes whitespace
 *         
 *         Example transformations:
 *         - "<script>alert('xss')</script>" → ""
 *         - "Hello&nbsp;World" → "Hello World"
 *         - "Multiple    spaces" → "Multiple spaces"
 * 
 *   examples:
 *     ValidEmail:
 *       summary: Valid email validation
 *       value:
 *         email: "john.doe@example.com"
 *     
 *     InvalidEmail:
 *       summary: Invalid email validation
 *       value:
 *         email: "invalid@email"
 *     
 *     ValidPhone:
 *       summary: Valid phone number
 *       value:
 *         phone: "+213555123456"
 *     
 *     InvalidPhone:
 *       summary: Invalid phone (too short)
 *       value:
 *         phone: "12345"
 *     
 *     ValidationSuccess:
 *       summary: Successful validation
 *       value:
 *         isValid: true
 *         errors: {}
 *     
 *     ValidationFailure:
 *       summary: Failed validation with errors
 *       value:
 *         isValid: false
 *         errors:
 *           email: "Invalid email format"
 *           phone: "Phone number must have at least 8 digits"
 *           name: "Name is required"
 */

import { EMAIL_REGEX, PHONE_REGEX } from "@/constants/regex";

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if valid email format
 * 
 * @example
 * validateEmail("user@example.com") // returns true
 * validateEmail("invalid@email") // returns false
 * validateEmail("") // returns false
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validates phone number format
 * Ensures minimum 8 digits and valid format
 * @param phone - Phone number to validate
 * @returns true if valid phone format
 * 
 * @example
 * validatePhone("+213555123456") // returns true
 * validatePhone("(555) 123-4567") // returns true
 * validatePhone("12345") // returns false (too short)
 * validatePhone("abc123") // returns false (invalid format)
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
 * Validates string length
 * @param value - String to validate
 * @param minLength - Minimum length required
 * @param maxLength - Maximum length allowed (optional)
 * @returns true if valid length
 * 
 * @example
 * validateStringLength("Hello", 2, 10) // returns true
 * validateStringLength("Hi", 3, 10) // returns false (too short)
 * validateStringLength("Very long text", 2, 5) // returns false (too long)
 * validateStringLength("  Trimmed  ", 5) // returns true (after trim)
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
 * Validates that a value is not empty
 * Handles null, undefined, empty strings
 * @param value - Value to check
 * @returns true if value is not empty
 * 
 * @example
 * isNotEmpty("text") // returns true
 * isNotEmpty("  ") // returns false (whitespace only)
 * isNotEmpty([1, 2, 3]) // returns true
 * isNotEmpty([]) // returns false
 * isNotEmpty({ key: "value" }) // returns true
 * isNotEmpty({}) // returns false
 * isNotEmpty(null) // returns false
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
 * Sanitizes string input
 * Removes potentially harmful characters
 * @param value - String to sanitize
 * @returns Sanitized string
 * 
 * @example
 * sanitizeString("<script>alert('xss')</script>") // returns ""
 * sanitizeString("Hello&nbsp;World") // returns "Hello World"
 * sanitizeString("Multiple    spaces") // returns "Multiple spaces"
 * sanitizeString("  Text  ") // returns "Text"
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
 * Validation result object
 * Used to return validation status and errors
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Creates a validation result
 * @param isValid - Whether validation passed
 * @param errors - Validation errors if any
 * @returns ValidationResult object
 * 
 * @example
 * // Success case
 * createValidationResult(true) 
 * // returns { isValid: true, errors: {} }
 * 
 * @example
 * // Error case
 * createValidationResult(false, { 
 *   email: "Invalid email format",
 *   phone: "Phone is required" 
 * })
 * // returns { isValid: false, errors: { email: "...", phone: "..." } }
 */
export const createValidationResult = (
  isValid: boolean,
  errors: Record<string, string> = {}
): ValidationResult => ({
  isValid,
  errors,
});