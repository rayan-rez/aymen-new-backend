/**
 * Validation utility functions
 * Reusable validation methods throughout the application
 */

import { EMAIL_REGEX, PHONE_REGEX } from "@/constants/regex";

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if valid email format
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
 */
export const createValidationResult = (
  isValid: boolean,
  errors: Record<string, string> = {}
): ValidationResult => ({
  isValid,
  errors,
});
