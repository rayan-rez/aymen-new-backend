// jest.config.js
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "babel-jest", // Use babel-jest for TS/JS files (relies on your babel.config.json for TS support)
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverage: true, // Enable coverage reports
  coverageDirectory: "coverage", // Output dir for coverage
  coverageReporters: ["text", "lcov", "json"], // Report formats
  coverageThreshold: { // Optional: Set minimum coverage (adjust as needed)
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};