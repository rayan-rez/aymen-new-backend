/**
 * Test Setup
 * Global test configuration and utilities
 * Runs before each test file
 */
import "tsconfig-paths/register";
import db from "@/config/database";
import { registerKnexExtensions } from "@/database/knex-extensions";
import { uniqueEmail, uniqueSlug } from "./helpers";

// Increase timeout for all tests
jest.setTimeout(30000);

// Register Knex extensions BEFORE any database operations
registerKnexExtensions();

// Track if database has been initialized
let dbInitialized = false;
let dbAvailable = false;

// Global test utilities
declare global {
  var testUtils: {
    cleanupDatabase: () => Promise<void>;
    waitFor: (ms: number) => Promise<void>;
    uniqueSlug: (prefix: string) => string;
    uniqueEmail: (prefix: string) => string;
    isDatabaseAvailable: () => boolean;
  };
}

/**
 * Check if database is available
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw("SELECT 1");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Cleanup database tables in correct order
 */
async function cleanupDatabase(): Promise<void> {
  if (!dbAvailable) {
    console.warn("⚠️  Database not available, skipping cleanup");
    return;
  }

  const tables = [
    "page_views",
    "user_events",
    "property_interactions",
    "event_analytics",
    "event_influencers",
    "event_registrations",
    "lead_mirrors",
    "form_submissions",
    "user_sessions",
    "photos",
    "floor_plans",
    "blog_post_sections",
    "blog_posts",
    "trade_show_feedback",
    "customer_feedback",
    "apartments",
    "commercial_properties",
    "project_features",
    "project_media",
    "events",
    "projects",
    "features",
    "locations",
    "test_table",
    "test_polymorphic",
    "test_helpers_table",
  ];

  try {
    await db.raw("SELECT 1");
  } catch (error) {
    return;
  }

  await db.raw("SET FOREIGN_KEY_CHECKS = 0");

  for (const table of tables) {
    try {
      const tableExists = await db.schema.hasTable(table);
      if (tableExists) {
        await db(table).del();
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes("acquire a connection")) {
        console.warn(`Could not clean table ${table}:`, error.message);
      }
    }
  }

  await db.raw("SET FOREIGN_KEY_CHECKS = 1");
  await waitFor(100);
}

/**
 * Wait for specified milliseconds
 */
function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if database is available
 */
function isDatabaseAvailable(): boolean {
  return dbAvailable;
}

// Export global utilities
global.testUtils = {
  cleanupDatabase,
  waitFor,
  uniqueSlug,
  uniqueEmail,
  isDatabaseAvailable,
};

// Global beforeAll hook
beforeAll(async () => {
  if (!dbInitialized) {
    console.log("🔧 Setting up test environment...");

    try {
      // Check database availability
      dbAvailable = await checkDatabaseConnection();

      if (!dbAvailable) {
        console.warn("⚠️  Database not available - tests requiring DB will be skipped");
        dbInitialized = true;
        return;
      }

      // Create test_table with ALL required columns
      const testTableExists = await db.schema.hasTable("test_table");
      if (!testTableExists) {
        await db.schema.createTable("test_table", (table) => {
          table.increments("id").primary();
          table.string("name").notNullable();
          table.string("value").nullable();
          table.string("status").defaultTo("active");
          table.integer("priority").defaultTo(0);
          table.json("metadata").nullable();
          table.timestamps(true, true);
          table.timestamp("deleted_at").nullable();
        });
      } else {
        // Ensure all columns exist
        const hasStatus = await db.schema.hasColumn("test_table", "status");
        if (!hasStatus) {
          await db.schema.alterTable("test_table", (table) => {
            table.string("status").defaultTo("active");
          });
        }

        const hasPriority = await db.schema.hasColumn("test_table", "priority");
        if (!hasPriority) {
          await db.schema.alterTable("test_table", (table) => {
            table.integer("priority").defaultTo(0);
          });
        }

        const hasMetadata = await db.schema.hasColumn("test_table", "metadata");
        if (!hasMetadata) {
          await db.schema.alterTable("test_table", (table) => {
            table.json("metadata").nullable();
          });
        }
      }

      // Create test_polymorphic with correct column names
      const polymorphicTableExists = await db.schema.hasTable("test_polymorphic");
      if (polymorphicTableExists) {
        await db.schema.dropTable("test_polymorphic");
      }

      await db.schema.createTable("test_polymorphic", (table) => {
        table.increments("id").primary();
        table.string("testable_type").notNullable();
        table.integer("testable_id").notNullable();
        table.string("url").notNullable();
        table.text("caption").nullable();
        table.integer("display_order").defaultTo(0);
        table.timestamps(true, true);
        table.timestamp("deleted_at").nullable();

        table.index(["testable_type", "testable_id"]);
      });

      dbInitialized = true;
      console.log("✅ Test environment ready");
    } catch (error) {
      console.error("❌ Error during setup:", error);
      dbAvailable = false;
      dbInitialized = true;
    }
  }
});

// Global afterAll hook
afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");

  if (!dbAvailable) {
    console.log("⊗ Database not available, skipping cleanup");
    return;
  }

  try {
    // Clean database BEFORE destroying connection
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

    console.log("✅ Test cleanup complete");
  } catch (error) {
    if (error instanceof Error && !error.message.includes("acquire a connection")) {
      console.error("⚠️  Error during cleanup:", error.message);
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