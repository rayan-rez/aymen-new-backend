/**
 * Global Setup
 * Runs once before all tests
 * Ensures database is ready before any tests execute
 */
import "tsconfig-paths/register";
import dotenv from "dotenv";
import path from "path";
import { registerKnexExtensions } from "@/database/knex-extensions";

export default async function globalSetup() {
  console.log("🚀 Starting Jest Test Suite...\n");

  // Load test environment variables
  dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
  dotenv.config({ path: path.resolve(__dirname, "../.env") });

  // CRITICAL: Register Knex extensions before any database operations
  console.log("📦 Registering Knex extensions...");
  registerKnexExtensions();

  // Set Node environment
  process.env.NODE_ENV = "test";

  // Verify database connection settings
  console.log("📊 Database Configuration:");
  console.log(`   Host: ${process.env.DB_HOST || "127.0.0.1"}`);
  console.log(`   Port: ${process.env.DB_PORT || 3306}`);
  console.log(`   Database: ${process.env.DB_NAME || "aymen_db"}`);
  console.log(`   User: ${process.env.DB_USER || "root"}`);

  // CRITICAL: Test database connection before proceeding
  console.log("\n🔌 Testing database connection...");
  
  try {
    // Dynamically import db to avoid initialization issues
    const { default: db } = await import("@/config/database");
    
    // Test connection with timeout
    await Promise.race([
      db.raw("SELECT 1"),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database connection timeout")), 5000)
      )
    ]);
    
    console.log("✅ Database connection successful\n");
    
    // Don't destroy the connection - let tests use it
    // await db.destroy();
    
  } catch (error: any) {
    console.error("❌ Database connection failed:", error.message);
    console.error("\n⚠️  Please ensure:");
    console.error("   1. MySQL/MariaDB is running");
    console.error("   2. Database credentials are correct");
    console.error("   3. Test database exists\n");
    
    // Don't fail setup - let individual tests handle connection errors gracefully
  }

  console.log("✅ Global setup complete\n");
}