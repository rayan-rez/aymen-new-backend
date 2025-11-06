/**
 * Global Setup
 * Runs once before all tests
 */
import "tsconfig-paths/register"
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

  // Verify database connection settings
  console.log("📊 Database Configuration:");
  console.log(`   Host: ${process.env.DB_HOST || "127.0.0.1"}`);
  console.log(`   Port: ${process.env.DB_PORT || 3306}`);
  console.log(`   Database: ${process.env.DB_NAME || "aymen_db"}`);
  console.log(`   User: ${process.env.DB_USER || "root"}\n`);

  // Set Node environment
  process.env.NODE_ENV = "test";

  console.log("✅ Global setup complete\n");
}