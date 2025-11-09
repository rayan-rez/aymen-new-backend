// src/config/database.ts
import knex, { Knex } from "knex";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const config: Knex.Config = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "aymen_db",
  },
  pool: {
    min: 2,
    max: 10,
    // Add connection timeout
    acquireTimeoutMillis: 30000,
    // Add idle timeout
    idleTimeoutMillis: 30000,
  },
  migrations: {
    directory: "./src/database/migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./src/database/seeds",
    extension: "ts",
  },
  // Suppress warnings in test environment
  debug: false,
};

let db: Knex;

try {
  db = knex(config);
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  // Create a dummy connection that will fail gracefully
  db = knex({
    client: "mysql2",
    connection: {
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "",
      database: "aymen_db",
    },
  });
}

export default db;
export { config };