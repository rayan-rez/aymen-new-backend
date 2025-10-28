// src/database/knex-extensions.ts
import { Knex } from "knex";

/**
 * Knex TableBuilder Extensions
 * 
 * This module extends Knex's TableBuilder with custom chainable methods
 * for common database patterns used throughout the application.
 * 
 * Usage in migrations:
 * ```typescript
 * table.increments('id').primary();
 * table.string('name', 100).notNullable();
 * table.withTimestamps();
 * table.withSoftDeletes();
 * table.withForeignKey('user_id', 'users');
 * ```
 */

declare module "knex" {
  namespace Knex {
    interface TableBuilder {
      /**
       * Adds created_at and updated_at timestamp columns
       * Both columns are automatically managed by the database
       */
      withTimestamps(): Knex.TableBuilder;

      /**
       * Adds deleted_at timestamp column for soft delete pattern
       * Includes an index for efficient soft-delete filtering queries
       */
      withSoftDeletes(): Knex.TableBuilder;

      /**
       * Adds complete audit trail: created_at, updated_at, and deleted_at
       * Combines withTimestamps() and withSoftDeletes()
       */
      withAuditTrail(): Knex.TableBuilder;

      /**
       * Adds UTM tracking columns for marketing attribution
       * Includes composite index on utm_source, utm_medium, and utm_campaign
       * 
       * Columns: utm_source, utm_medium, utm_campaign, utm_term, utm_content
       */
      withUtmTracking(): Knex.TableBuilder;

      /**
       * Adds referrer tracking columns
       * Useful for understanding traffic sources
       * 
       * Columns: referrer, source_page
       */
      withReferrerTracking(): Knex.TableBuilder;

      /**
       * Adds a foreign key column with proper indexing and constraints
       * 
       * @param columnName - Name of the foreign key column (e.g., 'user_id')
       * @param referencedTable - Table being referenced (e.g., 'users')
       * @param referencedColumn - Column in referenced table (default: 'id')
       * @param onDeleteAction - ON DELETE behavior (default: 'CASCADE')
       * 
       * @example
       * table.withForeignKey('project_id', 'projects', 'id', 'SET NULL');
       */
      withForeignKey(
        columnName: string,
        referencedTable: string,
        referencedColumn?: string,
        onDeleteAction?: string
      ): Knex.TableBuilder;

      /**
       * Adds a standard email column with proper constraints and indexing
       * 
       * @param options.required - Whether email is required (default: true)
       * @param options.unique - Whether email must be unique (default: false)
       * @param options.maxLength - Maximum email length (default: 255)
       * 
       * @example
       * table.withEmailColumn({ required: true, unique: true });
       */
      withEmailColumn(options?: {
        required?: boolean;
        unique?: boolean;
        maxLength?: number;
      }): Knex.TableBuilder;

      /**
       * Adds a status enum column with proper indexing
       * 
       * @param statuses - Array of allowed status values
       * @param options.defaultStatus - Default status value
       * @param options.columnName - Name of the status column (default: 'status')
       * 
       * @example
       * table.withStatusEnum(['active', 'inactive', 'pending'], { defaultStatus: 'pending' });
       */
      withStatusEnum(
        statuses: string[],
        options?: {
          defaultStatus?: string;
          columnName?: string;
        }
      ): Knex.TableBuilder;

      /**
       * Adds geographic coordinate columns (latitude, longitude)
       * Includes composite index for location-based queries
       * 
       * @param options.precision - Decimal precision (default: [10, 8] for lat, [11, 8] for lng)
       * @param options.required - Whether coordinates are required (default: false)
       * 
       * @example
       * table.withCoordinates({ required: false });
       */
      withCoordinates(options?: {
        precision?: { latitude: [number, number]; longitude: [number, number] };
        required?: boolean;
      }): Knex.TableBuilder;

      /**
       * Adds a JSON metadata column with proper type
       * Useful for flexible, schemaless data storage
       * 
       * @param columnName - Name of the JSON column (default: 'metadata')
       * 
       * @example
       * table.withJsonMetadata('settings');
       */
      withJsonMetadata(columnName?: string): Knex.TableBuilder;
    }
  }
}

// Track whether extensions have been registered
let extensionsRegistered = false;

/**
 * Register all custom Knex extensions
 * Must be called once during application initialization
 */
export function registerKnexExtensions(): void {
  // Prevent double registration
  if (extensionsRegistered) {
    return;
  }

  // Dynamically require Knex to ensure it's loaded
  const knex = require('knex');
  
  // Access the TableBuilder prototype
  const TableBuilder = knex.TableBuilder?.prototype;
  
  if (!TableBuilder) {
    console.warn('Warning: Knex TableBuilder not found. Extensions not registered.');
    return;
  }

  // =================================================================
  // TIMESTAMP EXTENSIONS
  // =================================================================

  TableBuilder.withTimestamps = function (): Knex.TableBuilder {
    // Use Knex's built-in timestamps method
    // First param: use timestamps, second param: default to now()
    this.timestamps(true, true);
    return this;
  };

  TableBuilder.withSoftDeletes = function (): Knex.TableBuilder {
    this.timestamp("deleted_at").nullable();
    this.index("deleted_at", "idx_deleted_at");
    return this;
  };

  TableBuilder.withAuditTrail = function (): Knex.TableBuilder {
    this.withTimestamps();
    this.withSoftDeletes();
    return this;
  };

  // =================================================================
  // MARKETING & TRACKING EXTENSIONS
  // =================================================================

  TableBuilder.withUtmTracking = function (): Knex.TableBuilder {
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

  TableBuilder.withReferrerTracking = function (): Knex.TableBuilder {
    this.string("referrer", 500).nullable();
    this.string("source_page", 500).nullable();
    return this;
  };

  // =================================================================
  // RELATIONSHIP EXTENSIONS
  // =================================================================

  TableBuilder.withForeignKey = function (
    columnName: string,
    referencedTable: string,
    referencedColumn: string = "id",
    onDeleteAction: string = "CASCADE"
  ): Knex.TableBuilder {
    // Create the foreign key column
    this.integer(columnName)
      .unsigned()
      .nullable()
      .references(referencedColumn)
      .inTable(referencedTable)
      .onDelete(onDeleteAction);

    // Add index for foreign key lookups
    this.index(columnName, `idx_${columnName}`);
    return this;
  };

  // =================================================================
  // DATA TYPE EXTENSIONS
  // =================================================================

  TableBuilder.withEmailColumn = function (
    options: {
      required?: boolean;
      unique?: boolean;
      maxLength?: number;
    } = {}
  ): Knex.TableBuilder {
    const {
      required = true,
      unique = false,
      maxLength = 255,
    } = options;

    const column = this.string("email", maxLength);

    if (required) {
      column.notNullable();
    } else {
      column.nullable();
    }

    if (unique) {
      column.unique();
    }

    // Always index email for lookup performance
    if (!unique) {
      this.index("email", "idx_email");
    }

    return this;
  };

  TableBuilder.withStatusEnum = function (
    statuses: string[],
    options: {
      defaultStatus?: string;
      columnName?: string;
    } = {}
  ): Knex.TableBuilder {
    const { defaultStatus, columnName = "status" } = options;

    const column = this.enum(columnName, statuses).notNullable();

    if (defaultStatus) {
      column.defaultTo(defaultStatus);
    }

    // Index status for filtering queries
    this.index(columnName, `idx_${columnName}`);
    return this;
  };

  TableBuilder.withCoordinates = function (
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
    } else {
      latColumn.nullable();
      lngColumn.nullable();
    }

    // Composite index for location-based queries
    this.index(["latitude", "longitude"], "idx_coordinates");
    return this;
  };

  TableBuilder.withJsonMetadata = function (
    columnName: string = "metadata"
  ): Knex.TableBuilder {
    this.json(columnName).nullable();
    return this;
  };

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
  await knex.raw(`
    ALTER TABLE ?? 
    ADD CONSTRAINT ?? 
    CHECK (${condition})
  `, [tableName, constraintName]);
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
  await knex.raw(`
    ALTER TABLE ?? 
    DROP CONSTRAINT IF EXISTS ??
  `, [tableName, constraintName]);
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
 *   configureTableDefaults(table);
 * });
 */
export function configureTableDefaults(
  schema: Knex.CreateTableBuilder
): void {
  schema
    .charset("utf8mb4")
    .collate("utf8mb4_unicode_ci")
    .engine("InnoDB");
}