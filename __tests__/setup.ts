/**
 * Test Setup
 * Global test configuration and utilities
 * Runs before each test file
 */
import "tsconfig-paths/register";
import { uniqueEmail, uniqueSlug, waitFor } from "./helpers";

// Increase timeout for all tests
jest.setTimeout(3000);

// Import database AFTER environment is loaded
let db: any = null;
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
    getDb: () => any;
  };
}

/**
 * Get database instance lazily
 */
function getDb() {
  if (!db) {
    db = require("@/config/database").default;
  }
  return db;
}

/**
 * Check if database is available
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const database = getDb();
    await database.raw("SELECT 1");
    return true;
  } catch (error) {
    console.error("❌ Database connection check failed:", error instanceof Error ? error.message : error);
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
    const database = getDb();
    await database.raw("SELECT 1");
  } catch (error) {
    return;
  }

  const database = getDb();
  await database.raw("SET FOREIGN_KEY_CHECKS = 0");

  for (const table of tables) {
    try {
      const tableExists = await database.schema.hasTable(table);
      if (tableExists) {
        await database(table).del();
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes("acquire a connection")) {
        console.warn(`Could not clean table ${table}:`, error.message);
      }
    }
  }

  await database.raw("SET FOREIGN_KEY_CHECKS = 1");
  await waitFor(100);
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
  getDb,
};

// Global beforeAll hook
beforeAll(async () => {
  if (!dbInitialized) {
    console.log("🔧 Setting up test environment...");

    try {
      // Check database availability - DON'T THROW if unavailable
      dbAvailable = await checkDatabaseConnection();

      if (!dbAvailable) {
        console.error("❌ Database not available");
        console.error("📋 To fix this:");
        console.error("   1. Ensure MySQL/MariaDB is running: sudo systemctl start mysql");
        console.error("   2. Check credentials in .env.test");
        console.error("   3. Run: npm run db:setup:test");
        console.error("");
        console.error("⚠️  Tests requiring database will be skipped");
        dbInitialized = true;
        // DON'T throw - let tests handle unavailable database
        return;
      }

      const database = getDb();

      // Create test_table with ALL required columns
      const testTableExists = await database.schema.hasTable("test_table");
      if (!testTableExists) {
        await database.schema.createTable("test_table", (table: any) => {
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
        const hasStatus = await database.schema.hasColumn("test_table", "status");
        if (!hasStatus) {
          await database.schema.alterTable("test_table", (table: any) => {
            table.string("status").defaultTo("active");
          });
        }

        const hasPriority = await database.schema.hasColumn("test_table", "priority");
        if (!hasPriority) {
          await database.schema.alterTable("test_table", (table: any) => {
            table.integer("priority").defaultTo(0);
          });
        }

        const hasMetadata = await database.schema.hasColumn("test_table", "metadata");
        if (!hasMetadata) {
          await database.schema.alterTable("test_table", (table: any) => {
            table.json("metadata").nullable();
          });
        }
      }

      // Create test_polymorphic with correct column names
      const polymorphicTableExists = await database.schema.hasTable("test_polymorphic");
      if (polymorphicTableExists) {
        await database.schema.dropTable("test_polymorphic");
      }

      await database.schema.createTable("test_polymorphic", (table: any) => {
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

      // Create photos table (polymorphic for apartments, projects, etc.)
      const photosTableExists = await database.schema.hasTable("photos");
      if (!photosTableExists) {
        await database.schema.createTable("photos", (table: any) => {
          table.increments("id").primary();
          table.string("photoable_type").notNullable(); // 'project', 'apartment', etc.
          table.integer("photoable_id").notNullable();
          table.string("url").notNullable();
          table.text("caption").nullable();
          table.boolean("is_cover").defaultTo(false);
          table.integer("display_order").defaultTo(0);
          table.timestamps(true, true);
          table.timestamp("deleted_at").nullable();

          table.index(["photoable_type", "photoable_id"]);
        });
      }

      // Create floor_plans table (polymorphic for apartments, projects, etc.)
      const floorPlansTableExists = await database.schema.hasTable("floor_plans");
      if (!floorPlansTableExists) {
        await database.schema.createTable("floor_plans", (table: any) => {
          table.increments("id").primary();
          table.string("plannable_type").notNullable(); // 'project', 'apartment', etc.
          table.integer("plannable_id").notNullable();
          table.string("url").notNullable();
          table.text("caption").nullable();
          table.integer("display_order").defaultTo(0);
          table.timestamps(true, true);
          table.timestamp("deleted_at").nullable();

          table.index(["plannable_type", "plannable_id"]);
        });
      }

      dbInitialized = true;
      console.log("✅ Test environment ready");
    } catch (error) {
      console.error("❌ Error during setup:", error);
      dbAvailable = false;
      dbInitialized = true;
      // DON'T throw - let tests handle the error
      console.error("⚠️  Tests requiring database will be skipped");
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
    const database = getDb();
    await database.destroy();

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