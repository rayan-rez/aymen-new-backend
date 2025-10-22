// knexfile.js
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

module.exports = {
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
      directory: path.join(__dirname, "src", "database", "migrations"),
      extension: "ts",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: path.join(__dirname, "src", "database", "seeds"),
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
      directory: path.join(__dirname, "dist", "database", "migrations"),
      extension: "js",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: path.join(__dirname, "dist", "database", "seeds"),
      extension: "js",
    },
  },
};