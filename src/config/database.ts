// src/config/database.ts
import knex, { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config();

// Helper function to get database connection config
export const getDatabaseConnection = () => ({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "aymen_db",
});

const config: Knex.Config = {
  client: "mysql2",
  connection: getDatabaseConnection(),
  pool: {
    min: 2,
    max: 10,
    afterCreate: (conn: any, done: any) => {
      // Ensure proper charset
      conn.query('SET NAMES utf8mb4', (err: any) => {
        done(err, conn);
      });
    },
  },
  migrations: {
    directory: "./src/database/migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./src/database/seeds",
    extension: "ts",
  },
};

const db = knex(config);

export default db;
export { config };