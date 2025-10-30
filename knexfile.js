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
      // CRITICAL: Explicit seed order to respect FK dependencies
      specific: [
        "01_locations.ts",
        "02_features.ts",
        "03_projects.ts",
        "04_project_relations.ts",
        "05_apartments.ts",
        "06_photos.ts",
        "07_floor_plans.ts",
        "08_virtual_tours.ts",
        "09_blog_posts.ts",
        "10_commercial_properties.ts",
      ],
    },
    pool: {
      min: 2,
      max: 10,
      afterCreate: (conn, done) => {
        // Ensure proper charset
        conn.query('SET NAMES utf8mb4', (err) => {
          done(err, conn);
        });
      },
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
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10,
      afterCreate: (conn, done) => {
        conn.query('SET NAMES utf8mb4', (err) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: path.join(__dirname, "dist", "database", "migrations"),
      extension: "js",
      tableName: "knex_migrations",
      loadExtensions: [".js"],
    },
    seeds: {
      directory: path.join(__dirname, "dist", "database", "seeds"),
      extension: "js",
      loadExtensions: [".js"],
      specific: [
        "01_locations.js",
        "02_features.js",
        "03_projects.js",
        "04_project_relations.js",
        "05_apartments.js",
        "06_photos.js",
        "07_floor_plans.js",
        "08_virtual_tours.js",
        "09_blog_posts.js",
        "10_commercial_properties.js",
      ],
    },
  },

  // Legacy database connection (for migration only)
  legacy: {
    client: "mysql2",
    connection: {
      host: process.env.OLD_DB_HOST || "127.0.0.1",
      port: Number(process.env.OLD_DB_PORT) || 3306,
      user: process.env.OLD_DB_USER || "root",
      password: process.env.OLD_DB_PASSWORD || "",
      database: process.env.OLD_DB_NAME || "aymen-database",
    },
    pool: { min: 1, max: 3 },
  },
};