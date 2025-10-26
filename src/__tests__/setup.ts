/**
 * Test Setup - IMPROVED VERSION
 * Global test configuration and utilities
 * Runs before each test file
 */

import db from "@/config/database";

// Increase timeout for all tests
jest.setTimeout(30000);

// Global test utilities
declare global {
  var testUtils: {
    cleanupDatabase: () => Promise<void>;
    waitFor: (ms: number) => Promise<void>;
    generateUniqueSlug: (prefix: string) => string;
    generateUniqueEmail: (prefix: string) => string;
  };
}

/**
 * Cleanup database tables in correct order
 * Respects foreign key constraints
 */
async function cleanupDatabase(): Promise<void> {
  const tables = [
    "photos",
    "floor_plans",
    "apartments",
    "commercial_properties",
    "blog_post_sections",
    "blog_posts",
    "project_features",
    "project_locations",
    "virtual_tours",
    "projects",
    "catalog_download_requests",
    "appointment_requests",
    "contact_form_submissions",
    "features",
    "locations",
    "test_table", // For base model tests
  ];

  for (const table of tables) {
    try {
      const tableExists = await db.schema.hasTable(table);
      if (tableExists) {
        await db(table).del();
      }
    } catch (error) {
      // Table might not exist, continue
      console.warn(`Could not clean table ${table}:`, error);
    }
  }

  // Small delay to ensure cleanup completes
  await waitFor(200);
}

/**
 * Wait for specified milliseconds
 */
function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate unique slug with timestamp and random string
 */
function generateUniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate unique email with timestamp
 */
function generateUniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.com`;
}

// Export global utilities
global.testUtils = {
  cleanupDatabase,
  waitFor,
  generateUniqueSlug,
  generateUniqueEmail,
};

// Global beforeAll hook
beforeAll(async () => {
  console.log("🔧 Setting up test environment...");
  
  // Ensure test table exists for base model tests
  const testTableExists = await db.schema.hasTable("test_table");
  if (!testTableExists) {
    await db.schema.createTable("test_table", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("value").nullable();
      table.timestamps(true, true);
      table.timestamp("deleted_at").nullable();
    });
  }
});

// Global afterAll hook
afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");
  
  try {
    await cleanupDatabase();
    await db.destroy();
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
});

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === "true") {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

export {};