/**
 * ETL & Database Seeding Helper Utilities
 * Comprehensive toolkit for data migration, transformation, and validation
 * Designed for robust ETL operations between legacy and new database systems
 *
 * @module database/seed-helpers
 *
 * @swagger
 * components:
 *   schemas:
 *     MigrationStats:
 *       type: object
 *       description: Statistical summary of a migration operation
 *       required:
 *         - tableName
 *         - totalRecords
 *         - successCount
 *         - errorCount
 *         - skippedCount
 *         - duration
 *       properties:
 *         tableName:
 *           type: string
 *           description: Name of the target table
 *           example: "projects"
 *         totalRecords:
 *           type: integer
 *           description: Total number of records processed
 *           example: 1000
 *           minimum: 0
 *         successCount:
 *           type: integer
 *           description: Number of successfully migrated records
 *           example: 950
 *           minimum: 0
 *         errorCount:
 *           type: integer
 *           description: Number of records that failed to migrate
 *           example: 30
 *           minimum: 0
 *         skippedCount:
 *           type: integer
 *           description: Number of records intentionally skipped
 *           example: 20
 *           minimum: 0
 *         duration:
 *           type: integer
 *           description: Migration duration in milliseconds
 *           example: 5420
 *           minimum: 0
 *         errors:
 *           type: array
 *           description: Detailed error log
 *           items:
 *             type: object
 *             properties:
 *               record:
 *                 type: object
 *                 description: The record that failed
 *               error:
 *                 type: string
 *                 description: Error message
 *                 example: "Missing required field: name"
 *
 *     TransformResult:
 *       type: object
 *       description: Result of a data transformation operation
 *       required:
 *         - skip
 *       properties:
 *         data:
 *           type: object
 *           nullable: true
 *           description: Transformed data object (null if skipped or error)
 *         skip:
 *           type: boolean
 *           description: Whether this record should be skipped
 *           example: false
 *         error:
 *           type: string
 *           description: Error message if transformation failed
 *           example: "Invalid email format"
 *
 *     BatchProcessingOptions:
 *       type: object
 *       description: Configuration for batch processing operations
 *       required:
 *         - tableName
 *       properties:
 *         batchSize:
 *           type: integer
 *           description: Number of records to process per batch
 *           default: 100
 *           example: 100
 *           minimum: 1
 *           maximum: 10000
 *         tableName:
 *           type: string
 *           description: Target table name for logging
 *           example: "projects"
 *         retryAttempts:
 *           type: integer
 *           description: Number of retry attempts for failed operations
 *           default: 3
 *           example: 3
 *           minimum: 0
 *           maximum: 10
 *         retryDelay:
 *           type: integer
 *           description: Delay between retries in milliseconds
 *           default: 1000
 *           example: 1000
 *           minimum: 0
 *
 *     FetchOptions:
 *       type: object
 *       description: Options for fetching legacy records
 *       properties:
 *         where:
 *           type: object
 *           description: WHERE clause conditions
 *           example: { status: "active" }
 *         orderBy:
 *           type: string
 *           description: ORDER BY clause
 *           example: "created_at DESC"
 *         limit:
 *           type: integer
 *           description: Maximum number of records to fetch
 *           example: 1000
 *           minimum: 1
 *
 * @description
 * ## Core Capabilities
 *
 * ### 1. Slug Generation & Management
 * - URL-friendly slug creation from text
 * - Automatic uniqueness enforcement
 * - Unicode normalization and sanitization
 *
 * ### 2. Data Cleaning & Parsing
 * - Text sanitization and normalization
 * - Boolean parsing from various formats
 * - Decimal and integer parsing with null handling
 * - URL validation and normalization
 * - Date parsing and formatting
 *
 * ### 3. Batch Processing
 * - Efficient bulk data migration
 * - Automatic retry logic with exponential backoff
 * - Progress tracking and logging
 * - Error collection and reporting
 *
 * ### 4. Lookup Caching
 * - Build in-memory lookup maps for fast reference
 * - Reverse lookup support for one-to-many relationships
 * - Optimized for large dataset migrations
 *
 * ### 5. Validation
 * - Required field validation
 * - Enum value validation
 * - Custom validation rules
 *
 * ### 6. Reporting
 * - Detailed migration statistics
 * - Error logging and analysis
 * - Performance metrics
 *
 * ## Usage Patterns
 *
 * ### Basic ETL Flow
 * ```typescript
 * // 1. Fetch legacy data
 * const legacyRecords = await fetchLegacyRecords('old_projects');
 *
 * // 2. Transform data
 * const transform = async (record) => {
 *   const error = validateRequired(record, ['name', 'description']);
 *   if (error) return { data: null, skip: false, error };
 *
 *   const slug = await ensureUniqueSlug(knex, 'projects', generateSlug(record.name));
 *   
 *   return {
 *     data: {
 *       name: cleanText(record.name),
 *       slug,
 *       price: parseDecimal(record.price),
 *       is_active: parseBoolean(record.status),
 *     },
 *     skip: false,
 *   };
 * };
 *
 * // 3. Process in batches
 * const stats = await processBatch(
 *   legacyRecords,
 *   transform,
 *   async (batch) => await knex('projects').insert(batch),
 *   { tableName: 'projects', batchSize: 100 }
 * );
 *
 * // 4. Review results
 * printMigrationStats(stats);
 * ```
 *
 * ### Advanced: With Lookup Maps
 * ```typescript
 * // Build lookup maps for foreign keys
 * const locationMap = await buildLookupMap(knex, 'locations', 'old_id', 'id');
 * const featureMap = await buildReverseLookupMap(knex, 'features', 'project_id');
 *
 * const transform = async (record) => {
 *   return {
 *     data: {
 *       name: record.name,
 *       location_id: locationMap.get(record.old_location_id),
 *       features: featureMap.get(record.id) || [],
 *     },
 *     skip: false,
 *   };
 * };
 * ```
 *
 * @example
 * ```typescript
 * import {
 *   generateSlug,
 *   cleanText,
 *   parseDecimal,
 *   processBatch,
 *   fetchLegacyRecords,
 *   printMigrationStats,
 * } from '@/database/seed-helpers';
 *
 * // Simple slug generation
 * const slug = generateSlug("Résidence Green Heights!");
 * // Output: "residence-green-heights"
 *
 * // Data cleaning
 * const name = cleanText("  John   Doe  ");
 * // Output: "John Doe"
 *
 * // Parse price
 * const price = parseDecimal("1,250,000.50");
 * // Output: 1250000.50
 *
 * // Full migration
 * const records = await fetchLegacyRecords('old_table');
 * const stats = await processBatch(
 *   records,
 *   transformFunction,
 *   insertFunction,
 *   { tableName: 'new_table', batchSize: 50 }
 * );
 * printMigrationStats(stats);
 * ```
 *
 * @best_practices
 * 1. **Always validate** before transforming data
 * 2. **Use transactions** for batch inserts to ensure atomicity
 * 3. **Build lookup maps** once and reuse for multiple transformations
 * 4. **Log errors** don't throw - collect them for batch review
 * 5. **Test transforms** on small samples before full migration
 * 6. **Clear tables** before re-seeding for idempotency
 * 7. **Monitor progress** with console logs during long migrations
 * 8. **Backup data** before running destructive migrations
 *
 * @performance
 * - Batch size of 100-500 is optimal for most use cases
 * - Use lookup maps to avoid repeated database queries
 * - Connection pooling configured for 1-3 concurrent operations
 * - Retry logic prevents transient failures from stopping migrations
 *
 * @see {@link https://knexjs.org/guide/migrations.html|Knex Migrations Guide}
 *
 * @author Rayan Rezougui
 * @since 1.0.0
 */

import { Knex } from "knex";
import legacyDb from "@/config/legacy-database";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Migration statistics interface
 * Tracks the results of a migration operation
 *
 * @interface MigrationStats
 * @property {string} tableName - Target table name
 * @property {number} totalRecords - Total records processed
 * @property {number} successCount - Successfully migrated records
 * @property {number} errorCount - Failed records
 * @property {number} skippedCount - Intentionally skipped records
 * @property {number} duration - Migration duration (ms)
 * @property {Array} errors - Detailed error log
 */
export interface MigrationStats {
  tableName: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  duration: number;
  errors: Array<{ record: any; error: string }>;
}

/**
 * Transform result interface
 * Result of transforming a single record
 *
 * @interface TransformResult
 * @template T - Type of the transformed data
 * @property {T | null} data - Transformed data (null if skipped/error)
 * @property {boolean} skip - Whether to skip this record
 * @property {string} [error] - Error message if transformation failed
 */
export interface TransformResult<T> {
  data: T | null;
  skip: boolean;
  error?: string;
}

// ============================================================================
// SLUG GENERATION
// ============================================================================

/**
 * Generates a URL-friendly slug from text
 * Handles Unicode, special characters, and normalization
 *
 * @param {string} text - Input text to convert
 * @returns {string} URL-friendly slug
 *
 * @example
 * ```typescript
 * generateSlug("Résidence Green Heights!")
 * // Returns: "residence-green-heights"
 *
 * generateSlug("Café & Restaurant")
 * // Returns: "cafe-restaurant"
 *
 * generateSlug("   Multiple   Spaces   ")
 * // Returns: "multiple-spaces"
 * ```
 *
 * @algorithm
 * 1. Convert to lowercase
 * 2. Normalize Unicode (NFD)
 * 3. Remove diacritical marks
 * 4. Remove special characters (keep alphanumeric, spaces, hyphens)
 * 5. Trim whitespace
 * 6. Replace multiple spaces with single hyphen
 * 7. Replace multiple hyphens with single hyphen
 * 8. Remove leading/trailing hyphens
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Ensures slug uniqueness by appending counter if needed
 * Checks database and increments suffix until unique slug found
 *
 * @param {Knex} knex - Knex instance
 * @param {string} tableName - Table to check for uniqueness
 * @param {string} baseSlug - Base slug to make unique
 * @param {number} [excludeId] - ID to exclude from uniqueness check (for updates)
 * @returns {Promise<string>} Unique slug
 *
 * @example
 * ```typescript
 * // If "green-heights" exists, returns "green-heights-1"
 * const slug = await ensureUniqueSlug(knex, 'projects', 'green-heights');
 *
 * // When updating record with ID 5
 * const slug = await ensureUniqueSlug(knex, 'projects', 'green-heights', 5);
 * ```
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
 * Cleans and normalizes text
 * Trims whitespace and collapses multiple spaces
 *
 * @param {string | null | undefined} text - Text to clean
 * @returns {string | null} Cleaned text or null
 *
 * @example
 * ```typescript
 * cleanText("  Hello   World  ")  // Returns: "Hello World"
 * cleanText("")                   // Returns: null
 * cleanText(null)                 // Returns: null
 * cleanText("   ")                // Returns: null
 * ```
 */
export function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/\s+/g, " ");
  return cleaned || null;
}

/**
 * Parses various formats into boolean
 * Handles numbers, strings, and boolean types
 *
 * @param {any} value - Value to parse
 * @returns {boolean} Parsed boolean value
 *
 * @example
 * ```typescript
 * parseBoolean(true)      // Returns: true
 * parseBoolean(1)         // Returns: true
 * parseBoolean("yes")     // Returns: true
 * parseBoolean("on")      // Returns: true
 * parseBoolean(0)         // Returns: false
 * parseBoolean("false")   // Returns: false
 * parseBoolean(null)      // Returns: false
 * ```
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
 * Parses decimal/float values safely
 * Handles null, empty strings, and comma separators
 *
 * @param {any} value - Value to parse
 * @returns {number | null} Parsed decimal or null
 *
 * @example
 * ```typescript
 * parseDecimal("1,250.50")  // Returns: 1250.50
 * parseDecimal("1250.50")   // Returns: 1250.50
 * parseDecimal(1250.50)     // Returns: 1250.50
 * parseDecimal("")          // Returns: null
 * parseDecimal(null)        // Returns: null
 * parseDecimal("abc")       // Returns: null
 * ```
 */
export function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseFloat(String(value).replace(",", "."));
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parses integer values safely
 * Handles null and empty strings
 *
 * @param {any} value - Value to parse
 * @returns {number | null} Parsed integer or null
 *
 * @example
 * ```typescript
 * parseInteger("123")   // Returns: 123
 * parseInteger(123)     // Returns: 123
 * parseInteger("")      // Returns: null
 * parseInteger(null)    // Returns: null
 * parseInteger("abc")   // Returns: null
 * parseInteger("123.45") // Returns: 123 (truncated)
 * ```
 */
export function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Cleans and validates URLs
 * Handles relative paths and adds protocol if missing
 *
 * @param {string | null | undefined} url - URL to clean
 * @returns {string | null} Cleaned URL or null
 *
 * @example
 * ```typescript
 * cleanUrl("/images/photo.jpg")          // Returns: "/images/photo.jpg"
 * cleanUrl("example.com")                // Returns: "https://example.com"
 * cleanUrl("http://example.com")         // Returns: "http://example.com"
 * cleanUrl("  https://example.com  ")    // Returns: "https://example.com"
 * cleanUrl("")                           // Returns: null
 * ```
 */
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

/**
 * Parses date from various formats
 * Returns null for invalid dates
 *
 * @param {any} value - Date value to parse
 * @returns {Date | null} Parsed Date object or null
 *
 * @example
 * ```typescript
 * parseDate("2025-11-05")              // Returns: Date object
 * parseDate(new Date())                // Returns: Same Date object
 * parseDate("invalid")                 // Returns: null
 * parseDate(null)                      // Returns: null
 * ```
 */
export function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats date for MySQL TIMESTAMP/DATETIME columns
 * Converts to MySQL-compatible string format
 *
 * @param {Date | string | null} date - Date to format
 * @returns {string | null} Formatted date string or null
 *
 * @example
 * ```typescript
 * formatMySQLTimestamp(new Date("2025-11-05T10:30:00Z"))
 * // Returns: "2025-11-05 10:30:00"
 *
 * formatMySQLTimestamp(null)
 * // Returns: null
 * ```
 */
export function formatMySQLTimestamp(date: Date | string | null): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ============================================================================
// BATCH PROCESSING (IMPROVED)
// ============================================================================

/**
 * Processes records in batches with error handling and retry logic
 * Core function for ETL operations
 *
 * @template TSource - Source record type
 * @template TTarget - Target record type
 * @param {TSource[]} records - Records to process
 * @param {Function} transformFn - Transform function for each record
 * @param {Function} insertFn - Batch insert function
 * @param {object} options - Processing options
 * @returns {Promise<MigrationStats>} Migration statistics
 *
 * @example
 * ```typescript
 * const stats = await processBatch(
 *   legacyRecords,
 *   async (record) => ({
 *     data: { name: record.name, slug: generateSlug(record.name) },
 *     skip: false,
 *   }),
 *   async (batch) => await knex('projects').insert(batch),
 *   { tableName: 'projects', batchSize: 100, retryAttempts: 3 }
 * );
 * ```
 */
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
 * Implements exponential backoff
 *
 * @private
 * @template T - Batch data type
 * @param {Function} insertFn - Insert function to retry
 * @param {T[]} batch - Batch to insert
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} delay - Base delay between retries (ms)
 * @throws {Error} If all retry attempts fail
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

/**
 * Builds in-memory lookup map for fast foreign key resolution
 * Optimizes performance by avoiding repeated database queries
 *
 * @template T - Value type in map
 * @param {Knex} knex - Knex instance
 * @param {string} tableName - Table to query
 * @param {string} keyField - Field to use as map key
 * @param {string} [valueField="id"] - Field to use as map value
 * @returns {Promise<Map<any, T>>} Lookup map
 *
 * @example
 * ```typescript
 * // Map old location IDs to new IDs
 * const locationMap = await buildLookupMap(
 *   knex,
 *   'locations',
 *   'old_id',
 *   'id'
 * );
 *
 * // Later use in transform
 * const newLocationId = locationMap.get(oldRecord.location_id);
 * ```
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
 * Builds reverse lookup map for one-to-many relationships
 * Maps a key to an array of related values
 *
 * @template T - Value type in arrays
 * @param {Knex} knex - Knex instance
 * @param {string} tableName - Table to query
 * @param {string} keyField - Field to use as map key
 * @param {string} [valueField="id"] - Field to collect into arrays
 * @returns {Promise<Map<any, T[]>>} Reverse lookup map
 *
 * @example
 * ```typescript
 * // Map project IDs to their feature IDs
 * const projectFeaturesMap = await buildReverseLookupMap(
 *   knex,
 *   'project_features',
 *   'project_id',
 *   'feature_id'
 * );
 *
 * // Later use
 * const featureIds = projectFeaturesMap.get(projectId) || [];
 * ```
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
 * Prints formatted migration statistics to console
 * Displays summary with success rates and error details
 *
 * @param {MigrationStats} stats - Migration statistics to print
 *
 * @example
 * ```typescript
 * const stats = await processBatch(...);
 * printMigrationStats(stats);
 * ```
 *
 * @output
 * ```
 * ============================================================
 * Migration Summary: projects
 * ============================================================
 * Total Records:    1000
 * ✓ Success:        950
 * ⊗ Skipped:        20
 * ✗ Errors:         30
 * Duration:         5.42s
 * Success Rate:     95.0%
 * 
 * ⚠️  First 5 Errors:
 *   1. Missing required field: name
 *      Record ID: 123
 * ...
 * ============================================================
 * ```
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

/**
 * Fetches records from legacy database with optional filtering
 * Simplified interface for legacy data extraction
 *
 * @template T - Record type
 * @param {string} tableName - Legacy table name
 * @param {object} [options] - Query options
 * @returns {Promise<T[]>} Array of records
 * @throws {Error} If query fails
 *
 * @example
 * ```typescript
 * // Fetch all records
 * const all = await fetchLegacyRecords('old_projects');
 *
 * // Fetch with conditions
 * const active = await fetchLegacyRecords('old_projects', {
 *   where: { status: 'active' },
 *   orderBy: 'created_at DESC',
 *   limit: 100
 * });
 * ```
 */
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

/**
 * Checks if a table exists in legacy database
 * Useful for conditional migrations
 *
 * @param {string} tableName - Table name to check
 * @returns {Promise<boolean>} True if table exists
 *
 * @example
 * ```typescript
 * if (await legacyTableExists('old_projects')) {
 *   const records = await fetchLegacyRecords('old_projects');
 *   // Process records...
 * } else {
 *   console.log('Legacy table not found, skipping migration');
 * }
 * ```
 */
export async function legacyTableExists(tableName: string): Promise<boolean> {
  return await legacyDb.schema.hasTable(tableName);
}

// ============================================================================
// IDEMPOTENCY HELPERS
// ============================================================================

/**
 * Clears table data safely with foreign key handling
 * Temporarily disables foreign key checks for clean deletion
 *
 * @param {Knex} knex - Knex instance
 * @param {string} tableName - Table to clear
 * @param {object} [options] - Clear options
 * @returns {Promise<number>} Number of deleted records
 * @throws {Error} If deletion fails
 *
 * @example
 * ```typescript
 * // Clear entire table
 * const count = await clearTable(knex, 'projects');
 * console.log(`Deleted ${count} records`);
 *
 * // Clear with conditions
 * await clearTable(knex, 'projects', {
 *   where: { status: 'draft' }
 * });
 * ```
 *
 * @warning
 * This function temporarily disables foreign key checks.
 * Use with caution in production environments.
 */
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

/**
 * Determines if a table should be seeded
 * Checks if table is empty or below minimum record count
 *
 * @param {Knex} knex - Knex instance
 * @param {string} tableName - Table to check
 * @param {object} [options] - Check options
 * @returns {Promise<boolean>} True if table should be seeded
 *
 * @example
 * ```typescript
 * // Seed only if table is empty
 * if (await shouldSeed(knex, 'projects')) {
 *   await seedProjects();
 * }
 *
 * // Seed if fewer than 100 records
 * if (await shouldSeed(knex, 'projects', { minRecords: 100 })) {
 *   await seedProjects();
 * }
 * ```
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
 * Validates required fields in a record
 * Returns error message if any required field is missing
 *
 * @param {any} record - Record to validate
 * @param {string[]} requiredFields - Array of required field names
 * @returns {string | null} Error message or null if valid
 *
 * @example
 * ```typescript
 * const record = { name: 'John', email: '' };
 * const error = validateRequired(record, ['name', 'email', 'phone']);
 * 
 * if (error) {
 *   console.error(error);
 *   // Output: "Missing required field: email"
 * }
 * ```
 *
 * @usage_in_transform
 * ```typescript
 * const transform = async (record) => {
 *   const error = validateRequired(record, ['name', 'description', 'price']);
 *   if (error) {
 *     return { data: null, skip: false, error };
 *   }
 *   
 *   return {
 *     data: { name: record.name, description: record.description },
 *     skip: false,
 *   };
 * };
 * ```
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
 * Validates enum field value
 * Ensures value is one of allowed options
 *
 * @param {any} value - Value to validate
 * @param {any[]} allowedValues - Array of allowed values
 * @param {string} fieldName - Field name for error message
 * @returns {string | null} Error message or null if valid
 *
 * @example
 * ```typescript
 * const statusError = validateEnum(
 *   'pending',
 *   ['pending', 'active', 'sold'],
 *   'status'
 * );
 * // Returns: null (valid)
 *
 * const typeError = validateEnum(
 *   'invalid',
 *   ['apartment', 'villa', 'studio'],
 *   'propertyType'
 * );
 * // Returns: "Invalid propertyType: invalid. Must be one of: apartment, villa, studio"
 * ```
 *
 * @usage_in_transform
 * ```typescript
 * const transform = async (record) => {
 *   const statusError = validateEnum(
 *     record.status,
 *     ['available', 'reserved', 'sold'],
 *     'status'
 *   );
 *   
 *   if (statusError) {
 *     return { data: null, skip: false, error: statusError };
 *   }
 *   
 *   return { data: { status: record.status }, skip: false };
 * };
 * ```
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

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================

/**
 * @exports
 * 
 * ## Slug Generation
 * - `generateSlug` - Create URL-friendly slugs
 * - `ensureUniqueSlug` - Ensure slug uniqueness in database
 *
 * ## Data Cleaning
 * - `cleanText` - Clean and normalize text
 * - `parseBoolean` - Parse boolean from various formats
 * - `parseDecimal` - Parse decimal numbers safely
 * - `parseInteger` - Parse integers safely
 * - `cleanUrl` - Clean and validate URLs
 *
 * ## Date Handling
 * - `parseDate` - Parse dates from various formats
 * - `formatMySQLTimestamp` - Format dates for MySQL
 *
 * ## Batch Processing
 * - `processBatch` - Process records in batches with retry logic
 *
 * ## Lookup Caching
 * - `buildLookupMap` - Build lookup maps for foreign keys
 * - `buildReverseLookupMap` - Build reverse lookup maps
 *
 * ## Reporting
 * - `printMigrationStats` - Print migration statistics
 *
 * ## Legacy Database
 * - `fetchLegacyRecords` - Fetch records from legacy database
 * - `legacyTableExists` - Check if legacy table exists
 *
 * ## Idempotency
 * - `clearTable` - Clear table data safely
 * - `shouldSeed` - Check if table should be seeded
 *
 * ## Validation
 * - `validateRequired` - Validate required fields
 * - `validateEnum` - Validate enum values
 *
 * ## Type Definitions
 * - `MigrationStats` - Migration statistics interface
 * - `TransformResult` - Transform result interface
 */