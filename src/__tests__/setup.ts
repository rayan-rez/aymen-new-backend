/**
 * Test Setup
 * Global test configuration and utilities
 * Runs before each test file
 */

import db from "@/config/database";

// Increase timeout for all tests
jest.setTimeout(30000);

// Track if database has been initialized
let dbInitialized = false;

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
    "test_table",
  ];

  // Check if connection is still available
  try {
    await db.raw("SELECT 1");
  } catch (error) {
    // Connection is already closed, skip cleanup
    return;
  }

  for (const table of tables) {
    try {
      const tableExists = await db.schema.hasTable(table);
      if (tableExists) {
        await db(table).del();
      }
    } catch (error) {
      // Only log if it's not a connection error
      if (
        error instanceof Error &&
        !error.message.includes("acquire a connection")
      ) {
        console.warn(`Could not clean table ${table}:`, error.message);
      }
    }
  }

  // Small delay to ensure cleanup completes
  await waitFor(100);
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
  if (!dbInitialized) {
    console.log("🔧 Setting up test environment...");

    try {
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
      dbInitialized = true;
    } catch (error) {
      console.error("Error during setup:", error);
    }
  }
});

// Global afterAll hook - FIXED to prevent memory leaks
afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");

  try {
    // CRITICAL: Clean database BEFORE destroying connection
    await cleanupDatabase();

    // Give a moment for cleanup to complete
    await waitFor(500);

    // Now safely destroy the connection
    await db.destroy();
    
    // Clear any timers or intervals
    jest.clearAllTimers();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  } catch (error) {
    // Silently handle cleanup errors since tests are done
    if (
      error instanceof Error &&
      !error.message.includes("acquire a connection")
    ) {
      console.error("Error during cleanup:", error.message);
    }
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