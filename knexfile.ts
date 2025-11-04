// knexfile.ts
import dotenv from "dotenv";
import path from "path";
import { registerKnexExtensions } from "./src/database/knex-extensions";
import { Knex } from "knex";

dotenv.config();

registerKnexExtensions();

/**
 * Helper function to convert MySQL datetime/timestamp fields to Date objects
 * Automatically processes created_at, updated_at, deleted_at, and other timestamp fields
 */
function convertTimestamps(row: any): any {
  const timestampFields = [
    "created_at",
    "updated_at",
    "deleted_at",
    "submitted_at",
    "start_time",
    "end_time",
    "event_ts",
    "interaction_ts",
    "assigned_at",
    "published_at",
    "downloaded_at",
    "estimated_completion_date",
    "actual_completion_date",
  ];

  const converted = { ...row };

  for (const field of timestampFields) {
    if (converted[field] && typeof converted[field] === "string") {
      converted[field] = new Date(converted[field]);
    }
  }

  return converted;
}

// Base configuration shared across environments
const baseConfig: Partial<Knex.Config> = {
  client: "mysql2",
  migrations: {
    directory: "./src/database/migrations",
    extension: "ts",
    tableName: "knex_migrations",
    loadExtensions: [".ts"],
  },
  seeds: {
    directory: "./src/database/seeds",
    extension: "ts",
    loadExtensions: [".ts"],
  },
  pool: {
    min: 2,
    max: 10,
    // Add connection validation
    afterCreate: (conn: any, done: any) => {
      conn.query("SELECT 1", (err: any) => {
        if (err) {
          console.error("❌ Database connection failed:", err.message);
        }
        done(err, conn);
      });
    },
  },
};

// =================================================================
// PRODUCTION ENVIRONMENT
// =================================================================
const production: Knex.Config = {
  ...baseConfig,
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "aymen_db",
    charset: "utf8mb4",
    timezone: "UTC+1",
    // SSL configuration for production
    ssl:
      process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  },
  pool: {
    min: 2,
    max: 20,
  },
  debug: false,
};

// =================================================================
// DEVELOPMENT ENVIRONMENT
// =================================================================
const development: Knex.Config = {
  ...baseConfig,
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "aymen_db",
    charset: "utf8mb4",
    timezone: "UTC+1",
  },
  debug: true, // Enable query logging in development
  // Convert MySQL datetime/timestamp to JavaScript Date objects
  wrapIdentifier: (value: string, origImpl: any) => origImpl(value),
  postProcessResponse: (result: any) => {
    // Handle timestamp conversion for datetime fields
    if (Array.isArray(result)) {
      return result.map(convertTimestamps);
    } else if (result && typeof result === "object") {
      return convertTimestamps(result);
    }
    return result;
  },
};

// =================================================================
// TEST ENVIRONMENT
// =================================================================
const test: Knex.Config = {
  ...baseConfig,
  connection: {
    host: process.env.TEST_DB_HOST || "127.0.0.1",
    port: Number(process.env.TEST_DB_PORT) || 3306,
    user: process.env.TEST_DB_USER || "root",
    password: process.env.TEST_DB_PASSWORD || "",
    database: process.env.TEST_DB_NAME || "aymen_test_db",
    charset: "utf8mb4",
    timezone: "UTC+1",
  },
  pool: {
    min: 1,
    max: 5,
  },
};

// =================================================================
// STAGING ENVIRONMENT
// =================================================================
const staging: Knex.Config = {
  ...baseConfig,
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",

    timezone: "UTC+1",
    ssl: {
      rejectUnauthorized: false,
    },
  },
  debug: false,
};

/**
 * Knex Database Configuration
 *
 * Supports multiple environments: development, staging, production
 *
 * Features:
 * - Connection pooling with configurable limits
 * - Automatic timestamp conversion to JavaScript Date objects
 * - Migration and seed directories
 * - Debug logging in development
 * - SSL support for production
 */
const config: { [key: string]: Knex.Config } = {
  development,
  production,
  staging,
  test,
};

export default config;
