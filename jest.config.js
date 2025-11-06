// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
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
    "^@tests/(.*)$": "<rootDir>/__tests__/$1",
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
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],

  // Better test isolation and reliability
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // CRITICAL: Run tests serially to prevent race conditions
  maxWorkers: 1,

  // Increase timeout for database operations
  testTimeout: 30000,

  // Better error reporting
  bail: false,
  errorOnDeprecated: true,

  // Global setup and teardown
  globalSetup: "<rootDir>/__tests__/global-setup.ts",
  globalTeardown: "<rootDir>/__tests__/global-teardown.ts",

  // FIXED: Properly handle async operations and prevent memory leaks
  detectOpenHandles: true,
  forceExit: true,
  detectLeaks: false, // Disable leak detection as it's experimental

  // Better module resolution
  moduleDirectories: ["node_modules", "src"],

  // Test sequencer for deterministic order
  testSequencer: "<rootDir>/__tests__/test-sequencer.js",

  // Reduce console noise
  silent: false,
};
