// knexfile.ts
import dotenv from "dotenv";
import path from "path";

dotenv.config();

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
module.exports = {
  // =================================================================
  // DEVELOPMENT ENVIRONMENT
  // =================================================================
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "aymen_db",
      charset: "utf8mb4",
      timezone: "UTC+1",
    },
    pool: {
      min: 2,
      max: 10,
      // Test connection on checkout from pool
      afterCreate: (conn: any, done: any) => {
        conn.query('SET sql_mode="TRADITIONAL"', (err: any) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: path.join(__dirname, "src", "database", "migrations"),
      tableName: "knex_migrations",
      extension: "ts",
      loadExtensions: [".ts"],
    },
    seeds: {
      directory: path.join(__dirname, "src", "database", "seeds"),
      extension: "ts",
      loadExtensions: [".ts"],
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
  },

  // =================================================================
  // STAGING ENVIRONMENT
  // =================================================================
  staging: {
    client: "mysql2",
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
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/database/seeds",
    },
    debug: false,
  },

  // =================================================================
  // PRODUCTION ENVIRONMENT
  // =================================================================
  production: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: "utf8mb4",
      timezone: "UTC+1",
      ssl: {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA, // SSL certificate
      },
    },
    pool: {
      min: 5,
      max: 50,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
      // Production-specific pool settings
      propagateCreateError: false,
    },
    migrations: {
      directory: path.join(__dirname, "dist", "database", "migrations"),
      extension: "js",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: path.join(__dirname, "dist", "database", "seeds"),
      extension: "js",
    },
    // No seeds in production for safety
    debug: false,
    // Additional production settings
    acquireConnectionTimeout: 60000,
  },

  // =================================================================
  // TEST ENVIRONMENT
  // =================================================================
  test: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "real_estate_test",
      charset: "utf8mb4",
      timezone: "UTC+1",
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/database/seeds/test",
    },
    debug: false,
  },
};