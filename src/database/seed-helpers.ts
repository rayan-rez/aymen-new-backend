// src/database/seeds/helpers/seed-helpers.ts

import { Knex } from "knex";
import legacyDb from "@/config/legacy-database";

/**
 * ETL Helper utilities for data migration
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MigrationStats {
  tableName: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  duration: number;
  errors: Array<{ record: any; error: string }>;
}

export interface TransformResult<T> {
  data: T | null;
  skip: boolean;
  error?: string;
}

// ============================================================================
// SLUG GENERATION
// ============================================================================

/**
 * Generate URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Normalize Unicode (handle accented chars)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Remove duplicate hyphens
}

/**
 * Ensure slug uniqueness in target table
 */
export async function ensureUniqueSlug(
  knex: Knex,
  tableName: string,
  baseSlug: string,
  excludeId?: number
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = knex(tableName).where("slug", slug);
    if (excludeId) query.whereNot("id", excludeId);

    const exists = await query.first();
    if (!exists) return slug;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// ============================================================================
// DATA CLEANING
// ============================================================================

/**
 * Clean and normalize text fields
 */
export function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.trim().replace(/\s+/g, " ") || null;
}

/**
 * Parse boolean from various formats (1, "1", true, "true", etc.)
 */
export function parseBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }
  return false;
}

/**
 * Parse decimal/float with fallback
 */
export function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse integer with fallback
 */
export function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Clean URL - ensure proper format
 */
export function cleanUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  if (!cleaned) return null;
  
  // If it's a relative path, keep as-is
  if (cleaned.startsWith("/") || cleaned.startsWith("images/")) {
    return cleaned;
  }
  
  // Ensure protocol for absolute URLs
  if (!cleaned.match(/^https?:\/\//i)) {
    return `https://${cleaned}`;
  }
  
  return cleaned;
}

// ============================================================================
// DATE HANDLING
// ============================================================================

/**
 * Parse date from various formats
 */
export function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format MySQL timestamp
 */
export function formatMySQLTimestamp(date: Date | string | null): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process records in batches with progress logging
 */
export async function processBatch<TSource, TTarget>(
  records: TSource[],
  transformFn: (record: TSource) => Promise<TransformResult<TTarget>>,
  insertFn: (batch: TTarget[]) => Promise<void>,
  options: {
    batchSize?: number;
    tableName: string;
  }
): Promise<MigrationStats> {
  const startTime = Date.now();
  const stats: MigrationStats = {
    tableName: options.tableName,
    totalRecords: records.length,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    duration: 0,
    errors: [],
  };

  const batchSize = options.batchSize || 100;
  let batch: TTarget[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      const result = await transformFn(record);

      if (result.skip) {
        stats.skippedCount++;
        continue;
      }

      if (result.error) {
        stats.errorCount++;
        stats.errors.push({ record, error: result.error });
        continue;
      }

      if (result.data) {
        batch.push(result.data);
        stats.successCount++;
      }

      // Insert batch when full
      if (batch.length >= batchSize) {
        await insertFn(batch);
        console.log(
          `✓ ${options.tableName}: Processed ${i + 1}/${records.length}`
        );
        batch = [];
      }
    } catch (error: any) {
      stats.errorCount++;
      stats.errors.push({ record, error: error.message });
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    await insertFn(batch);
  }

  stats.duration = Date.now() - startTime;
  return stats;
}

// ============================================================================
// LOOKUP CACHING
// ============================================================================

/**
 * Build lookup map for foreign key resolution
 */
export async function buildLookupMap<T = any>(
  knex: Knex,
  tableName: string,
  keyField: string,
  valueField: string = "id"
): Promise<Map<any, T>> {
  const records = await knex(tableName).select(keyField, valueField);
  return new Map(records.map((r) => [r[keyField], r[valueField]]));
}

/**
 * Build reverse lookup map (many-to-one relationships)
 */
export async function buildReverseLookupMap<T = any>(
  knex: Knex,
  tableName: string,
  keyField: string,
  valueField: string = "id"
): Promise<Map<any, T[]>> {
  const records = await knex(tableName).select(keyField, valueField);
  const map = new Map<any, T[]>();

  records.forEach((r) => {
    const key = r[keyField];
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(r[valueField]);
  });

  return map;
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Print migration statistics
 */
export function printMigrationStats(stats: MigrationStats): void {
  console.log("\n" + "=".repeat(60));
  console.log(`Migration Summary: ${stats.tableName}`);
  console.log("=".repeat(60));
  console.log(`Total Records:    ${stats.totalRecords}`);
  console.log(`✓ Success:        ${stats.successCount}`);
  console.log(`⊗ Skipped:        ${stats.skippedCount}`);
  console.log(`✗ Errors:         ${stats.errorCount}`);
  console.log(`Duration:         ${(stats.duration / 1000).toFixed(2)}s`);

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    stats.errors.slice(0, 10).forEach(({ record, error }, i) => {
      console.log(`  ${i + 1}. ${error}`);
      console.log(`     Record: ${JSON.stringify(record).slice(0, 100)}...`);
    });
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more errors`);
    }
  }
  console.log("=".repeat(60) + "\n");
}

// ============================================================================
// LEGACY DB HELPERS
// ============================================================================

/**
 * Fetch all records from legacy table
 */
export async function fetchLegacyRecords<T = any>(
  tableName: string,
  options?: {
    where?: Record<string, any>;
    orderBy?: string;
    limit?: number;
  }
): Promise<T[]> {
  let query = legacyDb(tableName);

  if (options?.where) {
    query = query.where(options.where);
  }

  if (options?.orderBy) {
    query = query.orderBy(options.orderBy);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return await query;
}

/**
 * Check if legacy table exists
 */
export async function legacyTableExists(tableName: string): Promise<boolean> {
  return await legacyDb.schema.hasTable(tableName);
}

// ============================================================================
// IDEMPOTENCY HELPERS
// ============================================================================

/**
 * Clear table before seeding (for idempotent seeds)
 */
export async function clearTable(
  knex: Knex,
  tableName: string,
  options?: { where?: Record<string, any> }
): Promise<number> {
  let query = knex(tableName);

  if (options?.where) {
    query = query.where(options.where);
  }

  return await query.del();
}

/**
 * Check if seeding is needed (table empty or specific condition)
 */
export async function shouldSeed(
  knex: Knex,
  tableName: string,
  options?: { minRecords?: number }
): Promise<boolean> {
  const count = await knex(tableName).count("* as count").first();
  const recordCount = count ? Number(count.count) : 0;
  
  if (options?.minRecords) {
    return recordCount < options.minRecords;
  }
  
  return recordCount === 0;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate required fields
 */
export function validateRequired(
  record: any,
  requiredFields: string[]
): string | null {
  for (const field of requiredFields) {
    if (!record[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Validate enum value
 */
export function validateEnum(
  value: any,
  allowedValues: any[],
  fieldName: string
): string | null {
  if (!allowedValues.includes(value)) {
    return `Invalid ${fieldName}: ${value}. Must be one of: ${allowedValues.join(", ")}`;
  }
  return null;
}