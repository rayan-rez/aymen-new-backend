/**
 * Jest Test Setup
 * Global configuration and utilities for all tests
 */

import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set test environment
process.env.NODE_ENV = "test";

// Mock console methods to reduce test output noise (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: jest.fn(), // Keep errors visible
};

// Increase test timeout for database operations
jest.setTimeout(30000);

// Global test utilities
export const mockRequest = (data: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...data,
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = () => jest.fn();
