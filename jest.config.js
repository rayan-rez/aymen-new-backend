// jest.config.js
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: "ts-jest",
  
  // Node environment for backend testing
  testEnvironment: "node",
  
  // Tell Jest where to find tests - both __tests__ and root level files
  roots: ["<rootDir>/__tests__", "<rootDir>"],
  
  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.spec.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  
  // File extensions Jest should look for
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  
  // CRITICAL: Path alias mapping - matches tsconfig.json paths
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@middlewares/(.*)$": "<rootDir>/src/middlewares/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@models/(.*)$": "<rootDir>/src/models/$1",
    "^@models$": "<rootDir>/src/models/index.ts",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@constants/(.*)$": "<rootDir>/src/constants/$1",
    "^@assets/(.*)$": "<rootDir>/src/assets/$1",
    "^@/types/(.*)$": "<rootDir>/src/types/$1",
    "^@tests/(.*)$": "<rootDir>/__tests__/$1",
  },
  
  // Coverage collection settings
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
  
  // Setup files
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  
  // IGNORE: Prevent test files in dist from being picked up
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/coverage/"],
  
  // Test reliability settings
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // CRITICAL: Run tests serially to prevent DB race conditions
  maxWorkers: 1,
  
  // Timeout for async operations
  testTimeout: 30000,
  
  // Error handling
  bail: false,
  errorOnDeprecated: true,
  
  // Global setup and teardown - these run in isolated Node processes
  globalSetup: "<rootDir>/__tests__/global-setup.ts",
  globalTeardown: "<rootDir>/__tests__/global-teardown.ts",
  
  // Memory and handle management
  detectOpenHandles: true,
  forceExit: true,
  detectLeaks: false, // Experimental feature, keep disabled
  
  // Module resolution
  moduleDirectories: ["node_modules", "src", "<rootDir>"],
  
  // Custom test sequencer for deterministic order
  testSequencer: "<rootDir>/__tests__/test-sequencer.js",
  
  // Console output
  silent: false,
};