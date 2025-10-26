// jest.config.js - IMPROVED VERSION
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@middlewares/(.*)$": "<rootDir>/src/middlewares/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@models/(.*)$": "<rootDir>/src/models/$1",
    "^@models$": "<rootDir>/src/models/index.ts",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@constants/(.*)$": "<rootDir>/src/constants/$1",
    "^@/types/(.*)$": "<rootDir>/src/types/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/index.ts",
    "!src/database/migrations/**",
    "!src/database/seeds/**",
    "!src/types/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "json", "html"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],

  // IMPROVED: Better test isolation and reliability
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // CRITICAL: Run tests serially to prevent race conditions
  maxWorkers: 1,

  // Increase timeout for database operations
  testTimeout: 30000,

  // IMPROVED: Better error reporting
  bail: false, // Continue running tests even if some fail
  errorOnDeprecated: true,

  // IMPROVED: Global setup and teardown
  globalSetup: "<rootDir>/src/__tests__/global-setup.ts",
  globalTeardown: "<rootDir>/src/__tests__/global-teardown.ts",

  // IMPROVED: Detect async operations that weren't stopped
  detectOpenHandles: false, // Set to true for debugging
  forceExit: true, // Force exit after tests complete

  // IMPROVED: Better module resolution
  moduleDirectories: ["node_modules", "src"],

  // IMPROVED: Test sequencer for deterministic order
  testSequencer: "<rootDir>/src/__tests__/test-sequencer.js",
};
