/**
 * Global Setup
 * Runs once before all tests
 * Ensures database is ready before any tests execute
 */
import "tsconfig-paths/register";
import { loadEnv } from "@/config/load-env"
import knex, { Knex } from "knex";

export default async function globalSetup() {
  console.log("🚀 Starting Jest Test Suite...\n");

  // Load test environment variables FIRST
  loadEnv()


  // Set Node environment
  process.env.NODE_ENV = "test";

  // Verify database connection settings
  console.log("📊 Database Configuration:");
  console.log(`   Host: ${process.env.DB_HOST || "127.0.0.1"}`);
  console.log(`   Port: ${process.env.DB_PORT || 3306}`);
  console.log(`   Database: ${process.env.DB_NAME || "aymen_test"}`);
  console.log(`   User: ${process.env.DB_USER || "root"}`);

  // CRITICAL: Test database connection before proceeding
  console.log("\n🔌 Testing database connection...");

  let testDb: Knex | null = null;

  try {
    // Create a temporary connection for testing
    testDb = knex({
      client: "mysql2",
      connection: {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "aymen_test",
      },
      pool: {
        min: 1,
        max: 3,
      },
    });

    // Test connection with timeout
    await Promise.race([
      testDb.raw("SELECT 1 as test"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout")), 10000)
      )
    ]);

    console.log("✅ Database connection successful\n");

    // Now we can safely register Knex extensions
    console.log("📦 Registering Knex extensions...");
    const { registerKnexExtensions } = await import("@/database/knex-extensions");
    registerKnexExtensions();

  } catch (error: any) {
    console.error("❌ Database connection failed:", error.message);
    console.error("\n⚠️  Please ensure:");
    console.error("   1. MySQL/MariaDB is running");
    console.error("   2. Database credentials in .env.test are correct");
    console.error("   3. Test database exists (run: npm run db:setup:test)");
    console.error(`   4. Try: mysql -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p ${process.env.DB_NAME}\n`);

    throw error; // Fail fast if DB not available
  } finally {
    // Clean up test connection
    if (testDb) {
      await testDb.destroy();
    }
  }

  console.log("✅ Global setup complete\n");
}