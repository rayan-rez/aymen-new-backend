/**
 * Legacy Database Configuration
 * Establishes connection to the old MySQL database for data migration
 * Uses Knex.js query builder for database operations
 *
 * @module config/legacy-database
 *
 * @swagger
 * components:
 *   schemas:
 *     LegacyDatabaseConfig:
 *       type: object
 *       description: Configuration for legacy MySQL database connection
 *       properties:
 *         client:
 *           type: string
 *           enum: [mysql2]
 *           description: Database client type
 *           example: "mysql2"
 *         connection:
 *           type: object
 *           properties:
 *             host:
 *               type: string
 *               description: Database host address
 *               default: "127.0.0.1"
 *               example: "127.0.0.1"
 *             port:
 *               type: integer
 *               description: Database port number
 *               default: 3306
 *               example: 3306
 *             user:
 *               type: string
 *               description: Database username
 *               default: "root"
 *               example: "root"
 *             password:
 *               type: string
 *               format: password
 *               description: Database password
 *               example: "your_password"
 *             database:
 *               type: string
 *               description: Database name
 *               default: "aymen-database"
 *               example: "aymen-database"
 *         pool:
 *           type: object
 *           description: Connection pool configuration
 *           properties:
 *             min:
 *               type: integer
 *               description: Minimum number of connections in pool
 *               default: 1
 *               example: 1
 *             max:
 *               type: integer
 *               description: Maximum number of connections in pool
 *               default: 3
 *               example: 3
 *
 *     LegacyConnectionStatus:
 *       type: object
 *       description: Legacy database connection status
 *       properties:
 *         connected:
 *           type: boolean
 *           description: Whether connection is established
 *           example: true
 *         database:
 *           type: string
 *           description: Connected database name
 *           example: "aymen-database"
 *         host:
 *           type: string
 *           description: Connected host
 *           example: "127.0.0.1"
 *         poolSize:
 *           type: object
 *           properties:
 *             min:
 *               type: integer
 *               example: 1
 *             max:
 *               type: integer
 *               example: 3
 *
 * @description
 * Environment Variables Required:
 * - `OLD_DB_HOST`: Legacy database host (default: 127.0.0.1)
 * - `OLD_DB_PORT`: Legacy database port (default: 3306)
 * - `OLD_DB_USER`: Legacy database user (default: root)
 * - `OLD_DB_PASSWORD`: Legacy database password (required)
 * - `OLD_DB_NAME`: Legacy database name (default: aymen-database)
 *
 * @security
 * - Uses environment variables for sensitive credentials
 * - Limited connection pool (1-3 connections) for read-only operations
 * - Recommended for ETL/migration operations only
 *
 * @performance
 * - Connection pooling enabled (min: 1, max: 3)
 * - Optimized for periodic batch operations
 * - Not recommended for high-traffic real-time operations
 *
 * @example
 * ```typescript
 * import legacyDb from '@/config/legacy-database';
 *
 * // Query legacy data
 * const oldProjects = await legacyDb('old_projects').select('*');
 *
 * // Use in migrations
 * const records = await legacyDb('legacy_table')
 *   .where('status', 'active')
 *   .orderBy('created_at', 'desc')
 *   .limit(100);
 *
 * // Test connection
 * try {
 *   await legacyDb.raw('SELECT 1');
 *   console.log('Legacy DB connected');
 * } catch (error) {
 *   console.error('Legacy DB connection failed:', error);
 * }
 * ```
 *
 * @see {@link https://knexjs.org/guide/|Knex.js Documentation}
 *
 * @important
 * This connection is intended for:
 * - Data migration scripts
 * - ETL operations
 * - Read-only data extraction
 * 
 * Do NOT use for:
 * - Production application queries
 * - Real-time user-facing operations
 * - Write operations (use with caution)
 */

import knex, { Knex } from "knex";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Knex configuration object for legacy MySQL database
 * 
 * @type {Knex.Config}
 * @constant
 */
const config: Knex.Config = {
  client: "mysql2",
  connection: {
    host: process.env.OLD_DB_HOST || "127.0.0.1",
    port: Number(process.env.OLD_DB_PORT) || 3306,
    user: process.env.OLD_DB_USER || "root",
    password: process.env.OLD_DB_PASSWORD || "",
    database: process.env.OLD_DB_NAME || "aymen-database",
  },
  pool: {
    min: 1,
    max: 3,
  },
};

/**
 * Legacy database instance
 * Singleton Knex connection to the old MySQL database
 * 
 * @type {Knex}
 * @constant
 * @default
 * 
 * @example
 * ```typescript
 * // Fetch all records from a legacy table
 * const records = await legacyDb('old_table').select('*');
 * 
 * // Query with conditions
 * const activeUsers = await legacyDb('users')
 *   .where('status', 'active')
 *   .andWhere('created_at', '>', '2020-01-01');
 * 
 * // Join operations
 * const projectsWithLocations = await legacyDb('projects as p')
 *   .join('locations as l', 'p.location_id', 'l.id')
 *   .select('p.*', 'l.name as location_name');
 * ```
 */
const legacyDb = knex(config);

/**
 * Export legacy database instance and configuration
 * 
 * @exports legacyDb - Main Knex instance for legacy database queries
 * @exports config - Configuration object for testing/debugging
 */
export default legacyDb;
export { config };