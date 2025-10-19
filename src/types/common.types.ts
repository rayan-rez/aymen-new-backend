/**
 * Common TypeScript interfaces and types
 * Used across the entire application
 */

/**
 * Standard API response structure
 * All API responses follow this format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, any>;
  timestamp?: string;
}

/**
 * Paginated response structure
 * Used for list endpoints
 */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Custom application error
 * Extends native Error with HTTP status code
 */
export interface AppErrorInterface extends Error {
  statusCode: number;
  isOperational: boolean;
}

/**
 * Request validation options
 * Configuration for input validation
 */
export interface ValidationOptions {
  sanitize?: boolean;
  strict?: boolean;
}

/**
 * Logger service interface
 * Standardized logging across the application
 */
export interface ILogger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any): void;
  debug(message: string, data?: any): void;
}
