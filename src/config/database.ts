// src/config/database.ts
import knex, { Knex } from "knex";
import { loadEnv } from "@/config/load-env"

loadEnv();

const config: Knex.Config = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "aymen_db",
    // Add these options for better connection handling
    charset: "utf8mb4",
    timezone: "+00:00",
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    // Add reaping interval to clean up dead connections
    reapIntervalMillis: 1000,
    // Create test connection on pool initialization
    createTimeoutMillis: 30000,
  },
  migrations: {
    directory: "./src/database/migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./src/database/seeds",
    extension: "ts",
  },
  debug: false,
  // Add this to ensure connections are returned to pool
  asyncStackTraces: process.env.NODE_ENV === "development",
};

// Create the database instance
const db = knex(config);
console.log("[ENV]: ",process.env.NODE_ENV)

// Add connection validation
if (process.env.NODE_ENV !== "test") {
  // Only validate in non-test environment (test validates in setup)
  db.raw("SELECT 1")
    .then(() => {
      console.log("✅ Database connected successfully");
    })
    .catch((error) => {
      console.error("❌ Database connection failed:", error.message);
    });
}

export default db;
export { config };