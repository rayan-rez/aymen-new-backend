// knexfile.ts
import type { Knex } from "knex";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "aymen_db",
    },
    migrations: {
      directory: path.join(__dirname, "src/database/migrations"),
      extension: "ts",
    },
    seeds: {
      directory: path.join(__dirname, "src/database/seeds"),
      extension: "ts",
    },
  },
  production: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: "./dist/database/migrations",
      extension: "js",
    },
    seeds: {
      directory: "./dist/database/seeds",
      extension: "js",
    },
  },
};

export default config;