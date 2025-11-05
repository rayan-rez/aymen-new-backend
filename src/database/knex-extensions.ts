/**
 * Knex TableBuilder Extensions
 * Custom chainable methods for common database patterns
 * Simplifies migration writing with reusable database patterns
 *
 * @module database/knex-extensions
 *
 * @swagger
 * components:
 *   schemas:
 *     TimestampColumns:
 *       type: object
 *       description: Standard timestamp columns added by withTimestamps()
 *       properties:
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Record creation timestamp
 *           example: "2025-11-05T10:30:00.000Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Record last update timestamp
 *           example: "2025-11-05T15:45:00.000Z"
 *
 *     SoftDeleteColumns:
 *       type: object
 *       description: Soft delete column added by withSoftDeletes()
 *       properties:
 *         deleted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Record deletion timestamp (null if not deleted)
 *           example: null
 *
 *     AuditTrailColumns:
 *       allOf:
 *         - $ref: '#/components/schemas/TimestampColumns'
 *         - $ref: '#/components/schemas/SoftDeleteColumns'
 *       description: Complete audit trail with timestamps and soft delete
 *
 *     UtmTrackingColumns:
 *       type: object
 *       description: UTM tracking columns for marketing attribution
 *       properties:
 *         utm_source:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *           description: Traffic source (e.g., google, facebook, newsletter)
 *           example: "google"
 *         utm_medium:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *           description: Marketing medium (e.g., cpc, email, social)
 *           example: "cpc"
 *         utm_campaign:
 *           type: string
 *           maxLength: 150
 *           nullable: true
 *           description: Campaign name
 *           example: "summer_sale_2025"
 *         utm_term:
 *           type: string
 *           maxLength: 150
 *           nullable: true
 *           description: Paid search keywords
 *           example: "luxury apartments"
 *         utm_content:
 *           type: string
 *           maxLength: 150
 *           nullable: true
 *           description: Content differentiation (A/B testing)
 *           example: "banner_v2"
 *
 *     ReferrerTrackingColumns:
 *       type: object
 *       description: Referrer tracking columns
 *       properties:
 *         referrer:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: HTTP referer URL
 *           example: "https://google.com/search?q=apartments"
 *         source_page:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: Source page URL
 *           example: "/projects/luxury-towers"
 *
 *     CoordinateColumns:
 *       type: object
 *       description: Geographic coordinate columns
 *       properties:
 *         latitude:
 *           type: number
 *           format: decimal
 *           minimum: -90
 *           maximum: 90
 *           description: Latitude coordinate
 *           example: 36.7538
 *         longitude:
 *           type: number
 *           format: decimal
 *           minimum: -180
 *           maximum: 180
 *           description: Longitude coordinate
 *           example: 3.0588
 *
 *     ExtensionOptions:
 *       type: object
 *       description: Configuration options for extensions
 *
 *     EmailColumnOptions:
 *       type: object
 *       properties:
 *         required:
 *           type: boolean
 *           default: true
 *           description: Whether email is required
 *         unique:
 *           type: boolean
 *           default: false
 *           description: Whether email must be unique
 *         maxLength:
 *           type: integer
 *           default: 255
 *           description: Maximum email length
 *
 *     StatusEnumOptions:
 *       type: object
 *       properties:
 *         defaultStatus:
 *           type: string
 *           description: Default status value
 *           example: "pending"
 *         columnName:
 *           type: string
 *           default: "status"
 *           description: Name of the status column
 *
 *     CoordinatesOptions:
 *       type: object
 *       properties:
 *         precision:
 *           type: object
 *           properties:
 *             latitude:
 *               type: array
 *               items:
 *                 type: integer
 *               example: [10, 8]
 *             longitude:
 *               type: array
 *               items:
 *                 type: integer
 *               example: [11, 8]
 *         required:
 *           type: boolean
 *           default: false
 *
 *   examples:
 *     BasicTableWithTimestamps:
 *       summary: Basic table with timestamps
 *       description: Common pattern for most tables
 *       value:
 *         sql: |
 *           CREATE TABLE users (
 *             id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 *             name VARCHAR(100) NOT NULL,
 *             email VARCHAR(255) NOT NULL UNIQUE,
 *             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 *           )
 *
 *     TableWithSoftDeletes:
 *       summary: Table with soft delete support
 *       description: Allows logical deletion without removing records
 *       value:
 *         sql: |
 *           CREATE TABLE projects (
 *             id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 *             name VARCHAR(200) NOT NULL,
 *             status ENUM('draft', 'published', 'archived') NOT NULL,
 *             deleted_at TIMESTAMP NULL,
 *             INDEX idx_deleted_at (deleted_at)
 *           )
 *
 *     TableWithUtmTracking:
 *       summary: Table with UTM tracking
 *       description: Track marketing campaign performance
 *       value:
 *         sql: |
 *           CREATE TABLE leads (
 *             id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 *             email VARCHAR(255) NOT NULL,
 *             utm_source VARCHAR(100),
 *             utm_medium VARCHAR(100),
 *             utm_campaign VARCHAR(150),
 *             INDEX idx_utm_tracking (utm_source, utm_medium, utm_campaign)
 *           )
 *
 * Features:
 * - Timestamp management (created_at, updated_at)
 * - Soft delete pattern (deleted_at)
 * - UTM campaign tracking
 * - Referrer tracking
 * - Foreign key helpers with proper indexing
 * - Email column with validation
 * - Status enum with indexing
 * - Geographic coordinates
 * - JSON metadata columns
 * - Automatic index creation
 * - Consistent naming conventions
 *
 * Extension Methods:
 * - withTimestamps() - Adds created_at and updated_at
 * - withSoftDeletes() - Adds deleted_at with index
 * - withAuditTrail() - Combines timestamps and soft deletes
 * - withUtmTracking() - Adds UTM parameters
 * - withReferrerTracking() - Adds referrer columns
 * - withForeignKey() - Adds foreign key with constraints
 * - withEmailColumn() - Adds email column with validation
 * - withStatusEnum() - Adds status enum with index
 * - withCoordinates() - Adds lat/lng columns
 * - withJsonMetadata() - Adds JSON column
 *
 * Helper Functions:
 * - registerKnexExtensions() - Initialize extensions
 * - addCheckConstraint() - Add CHECK constraint
 * - dropCheckConstraint() - Drop CHECK constraint
 * - configureTableEngine() - Set table engine
 *
 * @example
 * ```typescript
 * // Initialize extensions (app.ts)
 * import { registerKnexExtensions } from '@/database/knex-extensions';
 * registerKnexExtensions();
 *
 * // Use in migrations
 * export async function up(knex: Knex): Promise<void> {
 *   await knex.schema.createTable('projects', (table) => {
 *     table.increments('id').primary();
 *     table.string('name', 200).notNullable();
 *     table.text('description').notNullable();
 *     table.decimal('price', 12, 2).notNullable();
 *
 *     // Add timestamps
 *     table.withTimestamps();
 *
 *     // Add soft deletes
 *     table.withSoftDeletes();
 *
 *     // Add status enum
 *     table.withStatusEnum(['draft', 'published', 'archived'], {
 *       defaultStatus: 'draft'
 *     });
 *
 *     // Add coordinates
 *     table.withCoordinates({ required: false });
 *   });
 * }
 *
 * // Complete example with all features
 * export async function up(knex: Knex): Promise<void> {
 *   await knex.schema.createTable('leads', (table) => {
 *     table.increments('id').primary();
 *
 *     // Basic info
 *     table.string('name', 100).notNullable();
 *     table.withEmailColumn({ required: true, unique: true });
 *     table.string('phone', 20).nullable();
 *
 *     // Foreign key
 *     table.withForeignKey('project_id', 'projects', 'id', 'CASCADE');
 *
 *     // Marketing tracking
 *     table.withUtmTracking();
 *     table.withReferrerTracking();
 *
 *     // Metadata
 *     table.withJsonMetadata('preferences');
 *
 *     // Audit trail
 *     table.withAuditTrail();
 *   });
 * }
 * ```
 */

// src/database/knex-extensions.ts
import { Knex } from "knex";

/**
 * @openapi
 * Knex TableBuilder type extensions
 * Extends Knex's TableBuilder interface with custom methods
 */
declare module "knex" {
  namespace Knex {
    interface TableBuilder {
      /**
       * @openapi
       * Adds created_at and updated_at timestamp columns
       * Both columns are automatically managed by the database
       *
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Simple usage
       * table.withTimestamps();
       *
       * // Results in:
       * // created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       * // updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
       *
       * // Full example
       * await knex.schema.createTable('users', (table) => {
       *   table.increments('id');
       *   table.string('name').notNullable();
       *   table.withTimestamps();
       * });
       * ```
       */
      withTimestamps(): Knex.TableBuilder;

      /**
       * @openapi
       * Adds deleted_at timestamp column for soft delete pattern
       * Includes an index for efficient soft-delete filtering queries
       *
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Add soft delete support
       * table.withSoftDeletes();
       *
       * // Results in:
       * // deleted_at TIMESTAMP NULL
       * // INDEX idx_deleted_at (deleted_at)
       *
       * // Query active records
       * const active = await knex('users')
       *   .whereNull('deleted_at');
       *
       * // Soft delete
       * await knex('users')
       *   .where({ id: 1 })
       *   .update({ deleted_at: knex.fn.now() });
       *
       * // Restore
       * await knex('users')
       *   .where({ id: 1 })
       *   .update({ deleted_at: null });
       * ```
       */
      withSoftDeletes(): Knex.TableBuilder;

      /**
       * @openapi
       * Adds complete audit trail: created_at, updated_at, and deleted_at
       * Combines withTimestamps() and withSoftDeletes()
       *
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Add full audit trail
       * table.withAuditTrail();
       *
       * // Equivalent to:
       * table.withTimestamps();
       * table.withSoftDeletes();
       *
       * // Full example
       * await knex.schema.createTable('projects', (table) => {
       *   table.increments('id');
       *   table.string('name').notNullable();
       *   table.withAuditTrail();
       * });
       * ```
       */
      withAuditTrail(): Knex.TableBuilder;

      /**
       * @openapi
       * Adds UTM tracking columns for marketing attribution
       * Includes composite index on utm_source, utm_medium, and utm_campaign
       *
       * Columns: utm_source, utm_medium, utm_campaign, utm_term, utm_content
       *
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Add UTM tracking
       * table.withUtmTracking();
       *
       * // Results in:
       * // utm_source VARCHAR(100) NULL
       * // utm_medium VARCHAR(100) NULL
       * // utm_campaign VARCHAR(150) NULL
       * // utm_term VARCHAR(150) NULL
       * // utm_content VARCHAR(150) NULL
       * // INDEX idx_utm_tracking (utm_source, utm_medium, utm_campaign)
       *
       * // Use in leads table
       * await knex.schema.createTable('leads', (table) => {
       *   table.increments('id');
       *   table.string('email').notNullable();
       *   table.withUtmTracking();
       *   table.withTimestamps();
       * });
       *
       * // Insert lead with UTM data
       * await knex('leads').insert({
       *   email: 'user@example.com',
       *   utm_source: 'google',
       *   utm_medium: 'cpc',
       *   utm_campaign: 'summer_sale_2025',
       *   utm_term: 'luxury apartments',
       *   utm_content: 'ad_variant_a'
       * });
       *
       * // Query by campaign
       * const campaignLeads = await knex('leads')
       *   .where({
       *     utm_source: 'google',
       *     utm_campaign: 'summer_sale_2025'
       *   });
       * ```
       */
      withUtmTracking(): Knex.TableBuilder;

      /**
       * @openapi
       * Adds referrer tracking columns
       * Useful for understanding traffic sources
       *
       * Columns: referrer, source_page
       *
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Add referrer tracking
       * table.withReferrerTracking();
       *
       * // Results in:
       * // referrer VARCHAR(500) NULL
       * // source_page VARCHAR(500) NULL
       *
       * // Use in analytics table
       * await knex.schema.createTable('page_views', (table) => {
       *   table.increments('id');
       *   table.string('page_url', 500).notNullable();
       *   table.withReferrerTracking();
       *   table.withTimestamps();
       * });
       *
       * // Insert page view
       * await knex('page_views').insert({
       *   page_url: '/projects/luxury-towers',
       *   referrer: 'https://google.com/search?q=apartments',
       *   source_page: '/home'
       * });
       * ```
       */
      withReferrerTracking(): Knex.TableBuilder;

      /**
       * @openapi
       * Adds a foreign key column with proper indexing and constraints
       *
       * @param {string} columnName - Name of the foreign key column (e.g., 'user_id')
       * @param {string} referencedTable - Table being referenced (e.g., 'users')
       * @param {string} [referencedColumn='id'] - Column in referenced table
       * @param {string} [onDeleteAction='CASCADE'] - ON DELETE behavior
       * @param {string} [onUpdateAction='CASCADE'] - ON UPDATE behavior
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Basic foreign key with CASCADE
       * table.withForeignKey('user_id', 'users');
       *
       * // Results in:
       * // user_id INT UNSIGNED NULL
       * // FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
       * // INDEX idx_user_id (user_id)
       *
       * // Foreign key with SET NULL on delete
       * table.withForeignKey('author_id', 'users', 'id', 'SET NULL');
       *
       * // Foreign key with NO ACTION
       * table.withForeignKey('category_id', 'categories', 'id', 'NO ACTION');
       *
       * // Complete example
       * await knex.schema.createTable('posts', (table) => {
       *   table.increments('id');
       *   table.string('title').notNullable();
       *   table.withForeignKey('author_id', 'users', 'id', 'SET NULL');
       *   table.withForeignKey('category_id', 'categories', 'id', 'CASCADE');
       *   table.withTimestamps();
       * });
       * ```
       */
      withForeignKey(
        columnName: string,
        referencedTable: string,
        referencedColumn?: string,
        onDeleteAction?: string,
        onUpdateAction?: string
      ): Knex.TableBuilder;

      /**
       * @openapi
       * Adds a standard email column with proper constraints and indexing
       *
       * @param {Object} [options] - Email column options
       * @param {boolean} [options.required=true] - Whether email is required
       * @param {boolean} [options.unique=false] - Whether email must be unique
       * @param {number} [options.maxLength=255] - Maximum email length
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Required, unique email
       * table.withEmailColumn({ required: true, unique: true });
       *
       * // Results in:
       * // email VARCHAR(255) NOT NULL UNIQUE
       *
       * // Optional email with index
       * table.withEmailColumn({ required: false, unique: false });
       *
       * // Results in:
       * // email VARCHAR(255) NULL
       * // INDEX idx_email (email)
       *
       * // Custom length
       * table.withEmailColumn({ maxLength: 320 });
       *
       * // Full examples
       * await knex.schema.createTable('users', (table) => {
       *   table.increments('id');
       *   table.string('name').notNullable();
       *   table.withEmailColumn({ required: true, unique: true });
       *   table.withTimestamps();
       * });
       *
       * await knex.schema.createTable('contacts', (table) => {
       *   table.increments('id');
       *   table.withEmailColumn({ required: false });
       *   table.string('phone', 20).nullable();
       * });
       * ```
       */
      withEmailColumn(options?: {
        required?: boolean;
        unique?: boolean;
        maxLength?: number;
      }): Knex.TableBuilder;

      /**
       * @openapi
       * Adds a status enum column with proper indexing
       *
       * @param {string[]} statuses - Array of allowed status values
       * @param {Object} [options] - Status options
       * @param {string} [options.defaultStatus] - Default status value
       * @param {string} [options.columnName='status'] - Name of the status column
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Basic status enum
       * table.withStatusEnum(['active', 'inactive', 'pending']);
       *
       * // Results in:
       * // status ENUM('active', 'inactive', 'pending') NOT NULL
       * // INDEX idx_status (status)
       *
       * // With default value
       * table.withStatusEnum(
       *   ['draft', 'published', 'archived'],
       *   { defaultStatus: 'draft' }
       * );
       *
       * // Custom column name
       * table.withStatusEnum(
       *   ['new', 'processing', 'completed', 'failed'],
       *   { columnName: 'job_status', defaultStatus: 'new' }
       * );
       *
       * // Full examples
       * await knex.schema.createTable('projects', (table) => {
       *   table.increments('id');
       *   table.string('name').notNullable();
       *   table.withStatusEnum(['draft', 'published', 'archived'], {
       *     defaultStatus: 'draft'
       *   });
       *   table.withTimestamps();
       * });
       *
       * // Query by status
       * const published = await knex('projects')
       *   .where({ status: 'published' });
       * ```
       */
      withStatusEnum(
        statuses: string[],
        options?: {
          defaultStatus?: string;
          columnName?: string;
        }
      ): Knex.TableBuilder;

      /**
       * @openapi
       * Adds geographic coordinate columns (latitude, longitude)
       * Includes composite index for location-based queries
       *
       * @param {Object} [options] - Coordinate options
       * @param {Object} [options.precision] - Decimal precision for lat/lng
       * @param {boolean} [options.required=false] - Whether coordinates are required
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Optional coordinates (default)
       * table.withCoordinates();
       *
       * // Results in:
       * // latitude DECIMAL(10,8) NULL
       * // longitude DECIMAL(11,8) NULL
       * // INDEX idx_coordinates (latitude, longitude)
       *
       * // Required coordinates
       * table.withCoordinates({ required: true });
       *
       * // Custom precision
       * table.withCoordinates({
       *   precision: {
       *     latitude: [12, 10],
       *     longitude: [13, 10]
       *   }
       * });
       *
       * // Full example
       * await knex.schema.createTable('properties', (table) => {
       *   table.increments('id');
       *   table.string('name').notNullable();
       *   table.string('address').notNullable();
       *   table.withCoordinates({ required: false });
       *   table.withTimestamps();
       * });
       *
       * // Insert property with coordinates
       * await knex('properties').insert({
       *   name: 'Luxury Towers',
       *   address: '123 Main St',
       *   latitude: 36.7538,
       *   longitude: 3.0588
       * });
       *
       * // Find nearby properties (using Haversine formula)
       * const nearby = await knex.raw(`
       *   SELECT *,
       *     (6371 * acos(cos(radians(?)) * cos(radians(latitude)) *
       *     cos(radians(longitude) - radians(?)) +
       *     sin(radians(?)) * sin(radians(latitude)))) AS distance
       *   FROM properties
       *   HAVING distance < 10
       *   ORDER BY distance
       * `, [userLat, userLng, userLat]);
       * ```
       */
      withCoordinates(options?: {
        precision?: { latitude: [number, number]; longitude: [number, number] };
        required?: boolean;
      }): Knex.TableBuilder;

      /**
       * @openapi
       * Adds a JSON metadata column with proper type
       * Useful for flexible, schemaless data storage
       *
       * @param {string} [columnName='metadata'] - Name of the JSON column
       * @returns {Knex.TableBuilder} TableBuilder for chaining
       *
       * @example
       * ```typescript
       * // Default metadata column
       * table.withJsonMetadata();
       *
       * // Results in:
       * // metadata JSON NULL
       *
       * // Custom column name
       * table.withJsonMetadata('settings');
       * table.withJsonMetadata('preferences');
       * table.withJsonMetadata('extra_data');
       *
       * // Full example
       * await knex.schema.createTable('users', (table) => {
       *   table.increments('id');
       *   table.string('name').notNullable();
       *   table.withEmailColumn({ unique: true });
       *   table.withJsonMetadata('preferences');
       *   table.withJsonMetadata('settings');
       *   table.withTimestamps();
       * });
       *
       * // Insert with JSON data
       * await knex('users').insert({
       *   name: 'John Doe',
       *   email: 'john@example.com',
       *   preferences: JSON.stringify({
       *     theme: 'dark',
       *     language: 'en',
       *     notifications: true
       *   }),
       *   settings: JSON.stringify({
       *     privacy: 'public',
       *     newsletter: true
       *   })
       * });
       *
       * // Query JSON data (MySQL 5.7+)
       * const darkThemeUsers = await knex('users')
       *   .whereRaw("JSON_EXTRACT(preferences, '$.theme') = ?", ['dark']);
       * ```
       */
      withJsonMetadata(columnName?: string): Knex.TableBuilder;
    }
  }
}

// Track whether extensions have been registered
let extensionsRegistered = false;

/**
 * @openapi
 * Register all custom Knex extensions (safe for Knex v3+)
 * Must be called once during application initialization
 *
 * @returns {void}
 *
 * @example
 * ```typescript
 * // app.ts or server.ts
 * import { registerKnexExtensions } from '@/database/knex-extensions';
 *
 * // Register extensions before using migrations
 * registerKnexExtensions();
 *
 * // Now extensions are available in all migrations
 * // migrations/20250101_create_users.ts
 * export async function up(knex: Knex): Promise<void> {
 *   await knex.schema.createTable('users', (table) => {
 *     table.increments('id');
 *     table.withTimestamps(); // Extension available
 *   });
 * }
 * ```
 */
export function registerKnexExtensions(): void {
  if (extensionsRegistered) return;

  // Try to locate the TableBuilder prototype safely
  let TableBuilder: any = null;
  try {
    const knex = require("knex");
    TableBuilder =
      knex.Client?.prototype?.constructor?.prototype?.schemaBuilder?.client
        ?.TableBuilder ||
      require("knex/lib/schema/tablebuilder.js") ||
      null;
  } catch {
    console.warn("⚠️ Could not resolve TableBuilder from knex internals.");
  }

  if (!TableBuilder || !TableBuilder.prototype) {
    console.warn(
      "⚠️ TableBuilder prototype not found — skipping custom extensions."
    );
    return;
  }

  // =================================================================
  // TIMESTAMP & AUDIT TRAIL EXTENSIONS
  // =================================================================

  if (!TableBuilder.prototype.withTimestamps) {
    TableBuilder.prototype.withTimestamps = function (): Knex.TableBuilder {
      this.timestamps(true, true);
      return this;
    };
  }

  if (!TableBuilder.prototype.withSoftDeletes) {
    TableBuilder.prototype.withSoftDeletes = function (): Knex.TableBuilder {
      this.timestamp("deleted_at").nullable();
      this.index("deleted_at", "idx_deleted_at");
      return this;
    };
  }

  if (!TableBuilder.prototype.withAuditTrail) {
    TableBuilder.prototype.withAuditTrail = function (): Knex.TableBuilder {
      this.withTimestamps();
      this.withSoftDeletes();
      return this;
    };
  }

  // =================================================================
  // ENUM & STATUS HELPERS
  // =================================================================

  if (!TableBuilder.prototype.withStatusEnum) {
    TableBuilder.prototype.withStatusEnum = function (
      statuses: string[],
      options: { defaultStatus?: string; columnName?: string } = {}
    ): Knex.TableBuilder {
      const { defaultStatus, columnName = "status" } = options;
      const column = this.enu(columnName, statuses).notNullable();
      if (defaultStatus) column.defaultTo(defaultStatus);
      this.index(columnName, `idx_${columnName}`);
      return this;
    };
  }

  // =================================================================
  // MARKETING & TRACKING EXTENSIONS
  // =================================================================

  if (!TableBuilder.prototype.withUtmTracking) {
    TableBuilder.prototype.withUtmTracking = function (): Knex.TableBuilder {
      this.string("utm_source", 100).nullable();
      this.string("utm_medium", 100).nullable();
      this.string("utm_campaign", 150).nullable();
      this.string("utm_term", 150).nullable();
      this.string("utm_content", 150).nullable();

      // Composite index for campaign analysis queries
      this.index(
        ["utm_source", "utm_medium", "utm_campaign"],
        "idx_utm_tracking"
      );
      return this;
    };
  }

  if (!TableBuilder.prototype.withReferrerTracking) {
    TableBuilder.prototype.withReferrerTracking =
      function (): Knex.TableBuilder {
        this.string("referrer", 500).nullable();
        this.string("source_page", 500).nullable();
        return this;
      };
  }

  // =================================================================
  // RELATIONSHIP EXTENSIONS
  // =================================================================

  if (!TableBuilder.prototype.withForeignKey) {
    TableBuilder.prototype.withForeignKey = function (
      columnName: string,
      referencedTable: string,
      referencedColumn: string = "id",
      onDeleteAction: string = "CASCADE",
      onUpdateAction: string = "CASCADE"
    ): Knex.TableBuilder {
      this.integer(columnName)
        .unsigned()
        .nullable()
        .references(referencedColumn)
        .inTable(referencedTable)
        .onDelete(onDeleteAction)
        .onUpdate(onUpdateAction);

      this.index(columnName, `idx_${columnName}`);
      return this;
    };
  }

  // =================================================================
  // EMAIL COLUMN EXTENSION
  // =================================================================

  if (!TableBuilder.prototype.withEmailColumn) {
    TableBuilder.prototype.withEmailColumn = function (
      options: {
        required?: boolean;
        unique?: boolean;
        maxLength?: number;
      } = {}
    ): Knex.TableBuilder {
      const { required = true, unique = false, maxLength = 255 } = options;
      const column = this.string("email", maxLength);

      if (required) column.notNullable();
      else column.nullable();

      if (unique) column.unique();
      else this.index("email", "idx_email");

      return this;
    };
  }

  // =================================================================
  // COORDINATES EXTENSION
  // =================================================================

  if (!TableBuilder.prototype.withCoordinates) {
    TableBuilder.prototype.withCoordinates = function (
      options: {
        precision?: {
          latitude: [number, number];
          longitude: [number, number];
        };
        required?: boolean;
      } = {}
    ): Knex.TableBuilder {
      const {
        precision = {
          latitude: [10, 8],
          longitude: [11, 8],
        },
        required = false,
      } = options;

      const latColumn = this.decimal(
        "latitude",
        precision.latitude[0],
        precision.latitude[1]
      );
      const lngColumn = this.decimal(
        "longitude",
        precision.longitude[0],
        precision.longitude[1]
      );

      if (required) {
        latColumn.notNullable();
        lngColumn.notNullable();
      }

      this.index(["latitude", "longitude"], "idx_coordinates");
      return this;
    };
  }

  // =================================================================
  // JSON METADATA EXTENSION
  // =================================================================

  if (!TableBuilder.prototype.withJsonMetadata) {
    TableBuilder.prototype.withJsonMetadata = function (
      columnName: string = "metadata"
    ): Knex.TableBuilder {
      this.json(columnName).nullable();
      return this;
    };
  }

  // =================================================================
  // LOG
  // =================================================================

  console.log("✅ Custom Knex extensions registered successfully!");
  extensionsRegistered = true;
}
// =================================================================
// HELPER FUNCTIONS FOR MIGRATIONS
// =================================================================

/**
 * Adds a CHECK constraint to an existing table (MySQL 8.0+)
 *
 * @param knex - Knex instance
 * @param tableName - Name of the table
 * @param constraintName - Name of the constraint
 * @param condition - SQL condition for the CHECK constraint
 *
 * @example
 * await addCheckConstraint(
 *   knex,
 *   'users',
 *   'users_age_check',
 *   'age >= 18 AND age <= 120'
 * );
 */
export async function addCheckConstraint(
  knex: Knex,
  tableName: string,
  constraintName: string,
  condition: string
): Promise<void> {
  await knex.raw(
    `
    ALTER TABLE ?? 
    ADD CONSTRAINT ?? 
    CHECK (${condition})
  `,
    [tableName, constraintName]
  );
}

/**
 * Safely drops a CHECK constraint if it exists
 *
 * @param knex - Knex instance
 * @param tableName - Name of the table
 * @param constraintName - Name of the constraint to drop
 */
export async function dropCheckConstraint(
  knex: Knex,
  tableName: string,
  constraintName: string
): Promise<void> {
  await knex.raw(
    `
    ALTER TABLE ?? 
    DROP CONSTRAINT IF EXISTS ??
  `,
    [tableName, constraintName]
  );
}

/**
 * Configures table defaults for consistent schema
 * Sets charset, collation, and engine for MySQL/MariaDB
 *
 * @param schema - Knex CreateTableBuilder
 *
 * @example
 * await knex.schema.createTable('users', (table) => {
 *   table.increments('id').primary();
 *   configureTableEngine(table);
 * });
 */
export function configureTableEngine(schema: Knex.CreateTableBuilder): void {
  schema.engine("InnoDB");
}
