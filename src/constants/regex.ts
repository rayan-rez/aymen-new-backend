/**
 * Regular expressions for validation
 * Centralized regex patterns used throughout the application
 */

/**
 * Email validation regex
 * Validates standard email format
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone number validation regex
 * Allows digits, spaces, hyphens, plus signs, and parentheses
 */
export const PHONE_REGEX = /^[\d\s\+\-\(\)]+$/;

/**
 * URL slug validation regex
 * Allows alphanumeric, hyphens, and underscores
 */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/**
 * Strong password regex
 * Requires at least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
 */
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Alphanumeric only regex
 * Used for usernames, IDs, etc.
 */
export const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_-]+$/;
