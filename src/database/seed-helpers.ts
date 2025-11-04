// src/database/seed-helpers.ts

import { Knex } from "knex";
import legacyDb from "@/config/legacy-database";

/**
 * ETL Helper utilities for data migration
 * IMPROVED: Better error handling, retry logic, and logging
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

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

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

export function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/\s+/g, " ");
  return cleaned || null;
}

export function parseBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }
  return false;
}

export function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseFloat(String(value).replace(",", "."));
  return isNaN(parsed) ? null : parsed;
}

export function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? null : parsed;
}

export function cleanUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  if (!cleaned) return null;
  
  if (cleaned.startsWith("/") || cleaned.startsWith("images/")) {
    return cleaned;
  }
  
  if (!cleaned.match(/^https?:\/\//i)) {
    return `https://${cleaned}`;
  }
  
  return cleaned;
}

// ============================================================================
// DATE HANDLING
// ============================================================================

export function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatMySQLTimestamp(date: Date | string | null): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ============================================================================
// BATCH PROCESSING (IMPROVED)
// ============================================================================

export async function processBatch<TSource, TTarget>(
  records: TSource[],
  transformFn: (record: TSource) => Promise<TransformResult<TTarget>>,
  insertFn: (batch: TTarget[]) => Promise<void>,
  options: {
    batchSize?: number;
    tableName: string;
    retryAttempts?: number;
    retryDelay?: number;
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
  const retryAttempts = options.retryAttempts || 3;
  const retryDelay = options.retryDelay || 1000;
  
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
        await insertWithRetry(insertFn, batch, retryAttempts, retryDelay);
        console.log(
          `✓ ${options.tableName}: Processed ${i + 1}/${records.length}`
        );
        batch = [];
      }
    } catch (error: any) {
      stats.errorCount++;
      stats.errors.push({ record, error: error.message });
      console.error(`✗ Error processing record ${i + 1}:`, error.message);
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    await insertWithRetry(insertFn, batch, retryAttempts, retryDelay);
  }

  stats.duration = Date.now() - startTime;
  return stats;
}

/**
 * Retry logic for database operations
 */
async function insertWithRetry<T>(
  insertFn: (batch: T[]) => Promise<void>,
  batch: T[],
  maxAttempts: number,
  delay: number
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await insertFn(batch);
      return; // Success
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️  Insert attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// LOOKUP CACHING
// ============================================================================

export async function buildLookupMap<T = any>(
  knex: Knex,
  tableName: string,
  keyField: string,
  valueField: string = "id"
): Promise<Map<any, T>> {
  const records = await knex(tableName).select(keyField, valueField);
  return new Map(records.map((r) => [r[keyField], r[valueField]]));
}

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

export function printMigrationStats(stats: MigrationStats): void {
  console.log("\n" + "=".repeat(60));
  console.log(`Migration Summary: ${stats.tableName}`);
  console.log("=".repeat(60));
  console.log(`Total Records:    ${stats.totalRecords}`);
  console.log(`✓ Success:        ${stats.successCount}`);
  console.log(`⊗ Skipped:        ${stats.skippedCount}`);
  console.log(`✗ Errors:         ${stats.errorCount}`);
  console.log(`Duration:         ${(stats.duration / 1000).toFixed(2)}s`);
  console.log(`Success Rate:     ${((stats.successCount / stats.totalRecords) * 100).toFixed(1)}%`);

  if (stats.errors.length > 0) {
    console.log("\n⚠️  First 5 Errors:");
    stats.errors.slice(0, 5).forEach(({ record, error }, i) => {
      console.log(`  ${i + 1}. ${error}`);
      console.log(`     Record ID: ${record.id || 'N/A'}`);
    });
    if (stats.errors.length > 5) {
      console.log(`  ... and ${stats.errors.length - 5} more errors`);
    }
  }
  console.log("=".repeat(60) + "\n");
}

// ============================================================================
// LEGACY DB HELPERS
// ============================================================================

export async function fetchLegacyRecords<T = any>(
  tableName: string,
  options?: {
    where?: Record<string, any>;
    orderBy?: string;
    limit?: number;
  }
): Promise<T[]> {
  try {
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
  } catch (error: any) {
    console.error(`❌ Failed to fetch from legacy table ${tableName}:`, error.message);
    throw error;
  }
}

export async function legacyTableExists(tableName: string): Promise<boolean> {
  return await legacyDb.schema.hasTable(tableName);
}

// ============================================================================
// IDEMPOTENCY HELPERS
// ============================================================================

export async function clearTable(
  knex: Knex,
  tableName: string,
  options?: { where?: Record<string, any> }
): Promise<number> {
  try {
    // Disable foreign key checks temporarily
    await knex.raw("SET FOREIGN_KEY_CHECKS = 0");
    
    let query = knex(tableName);

    if (options?.where) {
      query = query.where(options.where);
    }

    const count = await query.del();
    
    // Re-enable foreign key checks
    await knex.raw("SET FOREIGN_KEY_CHECKS = 1");
    
    return count;
  } catch (error: any) {
    console.error(`❌ Failed to clear table ${tableName}:`, error.message);
    throw error;
  }
}

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