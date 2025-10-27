// src/database/migrations/helpers.ts
import type { Knex } from "knex";

/**
 * Adds standard timestamp columns (created_at, updated_at)
 * Centralizes timestamp logic across all tables
 */
export function addTimestamps(table: Knex.CreateTableBuilder): void {
  table.timestamps(true, true);
}

/**
 * Adds soft delete support (deleted_at)
 * Standardizes soft delete across all tables
 */
export function addSoftDelete(table: Knex.CreateTableBuilder): void {
  table.timestamp("deleted_at").nullable();
  table.index("deleted_at");
}

/**
 * Adds full audit trail (created_at, updated_at, deleted_at)
 */
export function addAuditFields(table: Knex.CreateTableBuilder): void {
  addTimestamps(table);
  addSoftDelete(table);
}

/**
 * Adds UTM tracking columns for marketing attribution
 */
export function addUtmTracking(table: Knex.CreateTableBuilder): void {
  table.string("utm_source", 100).nullable();
  table.string("utm_medium", 100).nullable();
  table.string("utm_campaign", 150).nullable();
  table.string("utm_term", 150).nullable();
  table.string("utm_content", 150).nullable();
  
  // Composite index for campaign analysis
  table.index(["utm_source", "utm_medium", "utm_campaign"], "idx_utm_tracking");
}

/**
 * Adds referrer tracking columns
 */
export function addReferrerTracking(table: Knex.CreateTableBuilder): void {
  table.string("referrer", 500).nullable();
  table.string("source_page", 500).nullable();
}

/**
 * Adds foreign key with standard naming convention
 */
export function addForeignKey(
  table: Knex.CreateTableBuilder,
  column: string,
  refTable: string,
  refColumn: string = "id",
  onDelete: string = "CASCADE"
): void {
  table
    .integer(column)
    .unsigned()
    .nullable()
    .references(refColumn)
    .inTable(refTable)
    .onDelete(onDelete);
  
  table.index(column);
}

/**
 * Adds polymorphic relationship columns
 */
export function addPolymorphic(
  table: Knex.CreateTableBuilder,
  prefix: string,
  types: string[]
): void {
  table.string(`${prefix}_type`, 50).notNullable();
  table.integer(`${prefix}_id`).unsigned().notNullable();
  
  // Composite index for polymorphic queries
  table.index([`${prefix}_type`, `${prefix}_id`], `idx_${prefix}`);
  
  // Additional index with display_order if needed

  // Error here: Element implicitly has an 'any' type because expression of type '"_single"' can't be used to index type 'CreateTableBuilder'.
  // Property '_single' does not exist on type 'CreateTableBuilder'.ts(7053)
  if (table['_single'] && table['_single'].display_order) {
    table.index(
      [`${prefix}_type`, `${prefix}_id`, "display_order"],
      `idx_${prefix}_ordered`
    );
  }
}

/**
 * Adds CHECK constraint safely (MySQL 8.0+)
 */
export async function addCheckConstraint(
  knex: Knex,
  tableName: string,
  constraintName: string,
  condition: string
): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${tableName} 
    ADD CONSTRAINT ${constraintName} 
    CHECK (${condition})
  `);
}

/**
 * Adds standard email column with index
 */
export function addEmailColumn(
  table: Knex.CreateTableBuilder,
  required: boolean = true
): void {
  const col = table.string("email", 255);
  if (required) {
    col.notNullable();
  } else {
    col.nullable();
  }
  table.index("email");
}

/**
 * Adds status enum with index
 */
export function addStatusEnum(
  table: Knex.CreateTableBuilder,
  statuses: string[],
  defaultStatus?: string
): void {
  const col = table.enum("status", statuses).notNullable();
  if (defaultStatus) {
    col.defaultTo(defaultStatus);
  }
  table.index("status");
}