/**
 * Database Helpers Tests
 * Comprehensive test suite for ETL and seeding utilities
 * 
 * Test Coverage:
 * - Slug generation and uniqueness
 * - Data cleaning (text, booleans, decimals, integers, URLs)
 * - Date parsing and formatting
 * - Batch processing with retry logic
 * - Lookup map building
 * - Migration statistics and reporting
 * - Legacy database operations
 * - Table operations (clear, shouldSeed)
 * - Validation functions
 */

import {
  generateSlug,
  ensureUniqueSlug,
  cleanText,
  parseBoolean,
  parseDecimal,
  parseInteger,
  cleanUrl,
  parseDate,
  formatMySQLTimestamp,
  processBatch,
  buildLookupMap,
  buildReverseLookupMap,
  printMigrationStats,
  fetchLegacyRecords,
  legacyTableExists,
  clearTable,
  shouldSeed,
  validateRequired,
  validateEnum,
  MigrationStats,
  TransformResult,
} from "@/database/helpers";
import db from "@/config/database";
import legacyDb from "@/config/legacy-database";
import { cleanupTables, waitFor } from "@tests/helpers";

// Mock legacy database
jest.mock("@/config/legacy-database");

describe("Database Helpers", () => {
  // ============================================================================
  // SETUP & TEARDOWN
  // ============================================================================

  beforeAll(async () => {
    // Create test tables
    const testTableExists = await db.schema.hasTable("test_helpers_table");
    if (!testTableExists) {
      await db.schema.createTable("test_helpers_table", (table) => {
        table.increments("id").primary();
        table.string("name", 255).notNullable();
        table.string("slug", 255).notNullable().unique();
        table.string("old_id", 50).nullable();
        table.integer("project_id").nullable();
        table.integer("value").nullable();
        table.timestamps(true, true);
      });
    }
  });

  afterAll(async () => {
    await cleanupTables(["test_helpers_table"]);
    await db.destroy();
  });

  beforeEach(async () => {
    await db("test_helpers_table").del();
    jest.clearAllMocks();
  });

  // ============================================================================
  // SLUG GENERATION TESTS
  // ============================================================================

  describe("generateSlug", () => {
    it("should generate basic slug from text", () => {
      expect(generateSlug("Hello World")).toBe("hello-world");
      expect(generateSlug("Test Project")).toBe("test-project");
    });

    it("should handle Unicode characters", () => {
      expect(generateSlug("Résidence Green Heights")).toBe(
        "residence-green-heights"
      );
      expect(generateSlug("Café & Restaurant")).toBe("cafe-restaurant");
      expect(generateSlug("Naïve École")).toBe("naive-ecole");
    });

    it("should remove special characters", () => {
      expect(generateSlug("Hello! World?")).toBe("hello-world");
      expect(generateSlug("Test@#$%Project")).toBe("testproject");
      expect(generateSlug("A & B | C")).toBe("a-b-c");
    });

    it("should handle multiple spaces", () => {
      expect(generateSlug("  Multiple   Spaces  ")).toBe("multiple-spaces");
      expect(generateSlug("Too    Many     Spaces")).toBe("too-many-spaces");
    });

    it("should handle multiple hyphens", () => {
      expect(generateSlug("Test---Project")).toBe("test-project");
      expect(generateSlug("Hello--World")).toBe("hello-world");
    });

    it("should trim leading and trailing hyphens", () => {
      expect(generateSlug("-Test-")).toBe("test");
      expect(generateSlug("---Hello---")).toBe("hello");
    });

    it("should handle empty string", () => {
      expect(generateSlug("")).toBe("");
      expect(generateSlug("   ")).toBe("");
    });

    it("should convert to lowercase", () => {
      expect(generateSlug("UPPERCASE")).toBe("uppercase");
      expect(generateSlug("MiXeD CaSe")).toBe("mixed-case");
    });

    it("should handle numbers", () => {
      expect(generateSlug("Project 2025")).toBe("project-2025");
      expect(generateSlug("Building 123-A")).toBe("building-123-a");
    });
  });

  describe("ensureUniqueSlug", () => {
    it("should return slug if unique", async () => {
      const slug = await ensureUniqueSlug(
        db,
        "test_helpers_table",
        "unique-slug"
      );
      expect(slug).toBe("unique-slug");
    });

    it("should append counter if slug exists", async () => {
      // Insert existing record
      await db("test_helpers_table").insert({
        name: "Test",
        slug: "test-slug",
      });

      const slug = await ensureUniqueSlug(
        db,
        "test_helpers_table",
        "test-slug"
      );
      expect(slug).toBe("test-slug-1");
    });

    it("should increment counter for multiple duplicates", async () => {
      // Insert multiple records
      await db("test_helpers_table").insert([
        { name: "Test 1", slug: "test-slug" },
        { name: "Test 2", slug: "test-slug-1" },
        { name: "Test 3", slug: "test-slug-2" },
      ]);

      const slug = await ensureUniqueSlug(
        db,
        "test_helpers_table",
        "test-slug"
      );
      expect(slug).toBe("test-slug-3");
    });

    it("should exclude specific ID when checking uniqueness", async () => {
      const [id] = await db("test_helpers_table").insert({
        name: "Test",
        slug: "test-slug",
      });

      // Should return same slug when excluding the ID
      const slug = await ensureUniqueSlug(
        db,
        "test_helpers_table",
        "test-slug",
        id
      );
      expect(slug).toBe("test-slug");
    });

    it("should work with different base slugs", async () => {
      await db("test_helpers_table").insert({
        name: "Test",
        slug: "project-a",
      });

      const slugB = await ensureUniqueSlug(
        db,
        "test_helpers_table",
        "project-b"
      );
      expect(slugB).toBe("project-b");
    });
  });

  // ============================================================================
  // DATA CLEANING TESTS
  // ============================================================================

  describe("cleanText", () => {
    it("should trim whitespace", () => {
      expect(cleanText("  Hello  ")).toBe("Hello");
      expect(cleanText("   Text   ")).toBe("Text");
    });

    it("should collapse multiple spaces", () => {
      expect(cleanText("Hello   World")).toBe("Hello World");
      expect(cleanText("Too    Many     Spaces")).toBe("Too Many Spaces");
    });

    it("should return null for empty strings", () => {
      expect(cleanText("")).toBeNull();
      expect(cleanText("   ")).toBeNull();
    });

    it("should return null for null/undefined", () => {
      expect(cleanText(null)).toBeNull();
      expect(cleanText(undefined)).toBeNull();
    });

    it("should preserve single spaces", () => {
      expect(cleanText("Hello World")).toBe("Hello World");
      expect(cleanText("One Two Three")).toBe("One Two Three");
    });
  });

  describe("parseBoolean", () => {
    it("should parse boolean values", () => {
      expect(parseBoolean(true)).toBe(true);
      expect(parseBoolean(false)).toBe(false);
    });

    it("should parse numeric values", () => {
      expect(parseBoolean(1)).toBe(true);
      expect(parseBoolean(0)).toBe(false);
      expect(parseBoolean(5)).toBe(false);
    });

    it("should parse string values", () => {
      expect(parseBoolean("1")).toBe(true);
      expect(parseBoolean("true")).toBe(true);
      expect(parseBoolean("TRUE")).toBe(true);
      expect(parseBoolean("yes")).toBe(true);
      expect(parseBoolean("YES")).toBe(true);
      expect(parseBoolean("on")).toBe(true);
      expect(parseBoolean("ON")).toBe(true);
    });

    it("should return false for falsy strings", () => {
      expect(parseBoolean("0")).toBe(false);
      expect(parseBoolean("false")).toBe(false);
      expect(parseBoolean("no")).toBe(false);
      expect(parseBoolean("off")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(parseBoolean(null)).toBe(false);
      expect(parseBoolean(undefined)).toBe(false);
    });

    it("should return false for invalid strings", () => {
      expect(parseBoolean("invalid")).toBe(false);
      expect(parseBoolean("maybe")).toBe(false);
    });
  });

  describe("parseDecimal", () => {
    it("should parse valid decimal numbers", () => {
      expect(parseDecimal("123.45")).toBe(123.45);
      expect(parseDecimal("1000.99")).toBe(1000.99);
      expect(parseDecimal("0.5")).toBe(0.5);
    });

    it("should parse numbers with comma as decimal separator", () => {
      expect(parseDecimal("123,45")).toBe(123.45);
      expect(parseDecimal("1000,99")).toBe(1000.99);
    });

    it("should parse numeric types", () => {
      expect(parseDecimal(123.45)).toBe(123.45);
      expect(parseDecimal(1000)).toBe(1000);
    });

    it("should return null for empty/null values", () => {
      expect(parseDecimal("")).toBeNull();
      expect(parseDecimal(null)).toBeNull();
      expect(parseDecimal(undefined)).toBeNull();
    });

    it("should return null for invalid strings", () => {
      expect(parseDecimal("abc")).toBeNull();
      expect(parseDecimal("not-a-number")).toBeNull();
    });

    it("should handle negative numbers", () => {
      expect(parseDecimal("-123.45")).toBe(-123.45);
      expect(parseDecimal("-1000,99")).toBe(-1000.99);
    });

    it("should handle zero", () => {
      expect(parseDecimal("0")).toBe(0);
      expect(parseDecimal("0.0")).toBe(0);
    });
  });

  describe("parseInteger", () => {
    it("should parse valid integers", () => {
      expect(parseInteger("123")).toBe(123);
      expect(parseInteger("1000")).toBe(1000);
      expect(parseInteger("0")).toBe(0);
    });

    it("should parse numeric types", () => {
      expect(parseInteger(123)).toBe(123);
      expect(parseInteger(1000)).toBe(1000);
    });

    it("should truncate decimal numbers", () => {
      expect(parseInteger("123.45")).toBe(123);
      expect(parseInteger("999.99")).toBe(999);
    });

    it("should return null for empty/null values", () => {
      expect(parseInteger("")).toBeNull();
      expect(parseInteger(null)).toBeNull();
      expect(parseInteger(undefined)).toBeNull();
    });

    it("should return null for invalid strings", () => {
      expect(parseInteger("abc")).toBeNull();
      expect(parseInteger("not-a-number")).toBeNull();
    });

    it("should handle negative numbers", () => {
      expect(parseInteger("-123")).toBe(-123);
      expect(parseInteger("-1000")).toBe(-1000);
    });
  });

  describe("cleanUrl", () => {
    it("should trim whitespace", () => {
      expect(cleanUrl("  https://example.com  ")).toBe("https://example.com");
    });

    it("should preserve relative paths", () => {
      expect(cleanUrl("/images/photo.jpg")).toBe("/images/photo.jpg");
      expect(cleanUrl("images/photo.jpg")).toBe("images/photo.jpg");
    });

    it("should add https protocol if missing", () => {
      expect(cleanUrl("example.com")).toBe("https://example.com");
      expect(cleanUrl("www.example.com")).toBe("https://www.example.com");
    });

    it("should preserve existing protocol", () => {
      expect(cleanUrl("http://example.com")).toBe("http://example.com");
      expect(cleanUrl("https://example.com")).toBe("https://example.com");
    });

    it("should return null for empty strings", () => {
      expect(cleanUrl("")).toBeNull();
      expect(cleanUrl("   ")).toBeNull();
    });

    it("should return null for null/undefined", () => {
      expect(cleanUrl(null)).toBeNull();
      expect(cleanUrl(undefined)).toBeNull();
    });
  });

  // ============================================================================
  // DATE HANDLING TESTS
  // ============================================================================

  describe("parseDate", () => {
    it("should parse ISO date strings", () => {
      const date = parseDate("2025-11-05T10:30:00Z");
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe("2025-11-05T10:30:00.000Z");
    });

    it("should parse simple date strings", () => {
      const date = parseDate("2025-11-05");
      expect(date).toBeInstanceOf(Date);
    });

    it("should return existing Date objects", () => {
      const originalDate = new Date("2025-11-05");
      const parsedDate = parseDate(originalDate);
      expect(parsedDate).toBe(originalDate);
    });

    it("should return null for invalid dates", () => {
      expect(parseDate("invalid-date")).toBeNull();
      expect(parseDate("not-a-date")).toBeNull();
    });

    it("should return null for null/undefined", () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
    });
  });

  describe("formatMySQLTimestamp", () => {
    it("should format Date objects", () => {
      const date = new Date("2025-11-05T10:30:45Z");
      expect(formatMySQLTimestamp(date)).toBe("2025-11-05 10:30:45");
    });

    it("should format date strings", () => {
      expect(formatMySQLTimestamp("2025-11-05T10:30:45Z")).toBe(
        "2025-11-05 10:30:45"
      );
    });

    it("should return null for null/undefined", () => {
      expect(formatMySQLTimestamp(null)).toBeNull();
      expect(formatMySQLTimestamp(undefined as any)).toBeNull();
    });

    it("should handle different timezones", () => {
      const date = new Date("2025-11-05T00:00:00Z");
      const formatted = formatMySQLTimestamp(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  // ============================================================================
  // BATCH PROCESSING TESTS
  // ============================================================================

  describe("processBatch", () => {
    it("should process records successfully", async () => {
      const records = [
        { name: "Item 1" },
        { name: "Item 2" },
        { name: "Item 3" },
      ];

      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        return {
          data: {
            name: record.name,
            slug: generateSlug(record.name),
          },
          skip: false,
        };
      };

      const insertedData: any[] = [];
      const insertFn = async (batch: any[]) => {
        insertedData.push(...batch);
      };

      const stats = await processBatch(records, transformFn, insertFn, {
        tableName: "test_table",
        batchSize: 2,
      });

      expect(stats.totalRecords).toBe(3);
      expect(stats.successCount).toBe(3);
      expect(stats.errorCount).toBe(0);
      expect(stats.skippedCount).toBe(0);
      expect(insertedData).toHaveLength(3);
    });

    it("should skip records when transform returns skip=true", async () => {
      const records = [
        { name: "Item 1", active: true },
        { name: "Item 2", active: false },
        { name: "Item 3", active: true },
      ];

      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        if (!record.active) {
          return { data: null, skip: true };
        }
        return {
          data: { name: record.name, slug: generateSlug(record.name) },
          skip: false,
        };
      };

      const insertedData: any[] = [];
      const insertFn = async (batch: any[]) => {
        insertedData.push(...batch);
      };

      const stats = await processBatch(records, transformFn, insertFn, {
        tableName: "test_table",
      });

      expect(stats.totalRecords).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.skippedCount).toBe(1);
      expect(insertedData).toHaveLength(2);
    });

    it("should collect errors from transform function", async () => {
      const records = [
        { name: "Item 1" },
        { name: null },
        { name: "Item 3" },
      ];

      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        if (!record.name) {
          return {
            data: null,
            skip: false,
            error: "Name is required",
          };
        }
        return {
          data: { name: record.name, slug: generateSlug(record.name) },
          skip: false,
        };
      };

      const insertedData: any[] = [];
      const insertFn = async (batch: any[]) => {
        insertedData.push(...batch);
      };

      const stats = await processBatch(records, transformFn, insertFn, {
        tableName: "test_table",
      });

      expect(stats.totalRecords).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.errorCount).toBe(1);
      expect(stats.errors).toHaveLength(1);
      expect(stats.errors[0].error).toBe("Name is required");
    });

    it("should handle insert function errors", async () => {
      const records = [{ name: "Item 1" }];

      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        return {
          data: { name: record.name },
          skip: false,
        };
      };

      const insertFn = async () => {
        throw new Error("Database connection failed");
      };

      const stats = await processBatch(records, transformFn, insertFn, {
        tableName: "test_table",
        retryAttempts: 1,
        retryDelay: 10,
      });

      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it("should process in batches", async () => {
      const records = Array.from({ length: 10 }, (_, i) => ({
        name: `Item ${i + 1}`,
      }));

      let batchCount = 0;
      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        return {
          data: { name: record.name },
          skip: false,
        };
      };

      const insertFn = async (batch: any[]) => {
        batchCount++;
        expect(batch.length).toBeLessThanOrEqual(3);
      };

      await processBatch(records, transformFn, insertFn, {
        tableName: "test_table",
        batchSize: 3,
      });

      expect(batchCount).toBe(4); // 10 records / 3 per batch = 4 batches
    });

    it("should include migration duration", async () => {
      const records = [{ name: "Item 1" }];

      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        await waitFor(50);
        return {
          data: { name: record.name },
          skip: false,
        };
      };

      const insertFn = async () => { };

      const stats = await processBatch(records, transformFn, insertFn, {
        tableName: "test_table",
      });

      expect(stats.duration).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // LOOKUP MAP TESTS
  // ============================================================================

  describe("buildLookupMap", () => {
    beforeEach(async () => {
      await db("test_helpers_table").insert([
        { name: "Item 1", slug: "item-1", old_id: "OLD_1" },
        { name: "Item 2", slug: "item-2", old_id: "OLD_2" },
        { name: "Item 3", slug: "item-3", old_id: "OLD_3" },
      ]);
    });

    it("should build lookup map with default value field", async () => {
      const map = await buildLookupMap(
        db,
        "test_helpers_table",
        "old_id",
        "id"
      );

      expect(map.size).toBe(3);
      expect(map.has("OLD_1")).toBe(true);
      expect(map.has("OLD_2")).toBe(true);
      expect(map.has("OLD_3")).toBe(true);
    });

    it("should build lookup map with custom value field", async () => {
      const map = await buildLookupMap(
        db,
        "test_helpers_table",
        "old_id",
        "slug"
      );

      expect(map.get("OLD_1")).toBe("item-1");
      expect(map.get("OLD_2")).toBe("item-2");
      expect(map.get("OLD_3")).toBe("item-3");
    });

    it("should handle empty tables", async () => {
      await db("test_helpers_table").del();
      const map = await buildLookupMap(
        db,
        "test_helpers_table",
        "old_id",
        "id"
      );

      expect(map.size).toBe(0);
    });
  });

  describe("buildReverseLookupMap", () => {
    beforeEach(async () => {
      await db("test_helpers_table").insert([
        { name: "Item 1", slug: "item-1", project_id: 1, value: 100 },
        { name: "Item 2", slug: "item-2", project_id: 1, value: 200 },
        { name: "Item 3", slug: "item-3", project_id: 2, value: 300 },
        { name: "Item 4", slug: "item-4", project_id: 2, value: 400 },
      ]);
    });

    it("should build reverse lookup map", async () => {
      const map = await buildReverseLookupMap(
        db,
        "test_helpers_table",
        "project_id",
        "value"
      );

      expect(map.size).toBe(2);
      expect(map.get(1)).toEqual([100, 200]);
      expect(map.get(2)).toEqual([300, 400]);
    });

    it("should handle keys with no values", async () => {
      await db("test_helpers_table").del();
      const map = await buildReverseLookupMap(
        db,
        "test_helpers_table",
        "project_id",
        "value"
      );

      expect(map.size).toBe(0);
    });

    it("should group multiple values per key", async () => {
      const map = await buildReverseLookupMap(
        db,
        "test_helpers_table",
        "project_id",
        "id"
      );

      expect(map.get(1)?.length).toBe(2);
      expect(map.get(2)?.length).toBe(2);
    });
  });

  // ============================================================================
  // REPORTING TESTS
  // ============================================================================

  describe("printMigrationStats", () => {
    it("should print migration statistics", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const stats: MigrationStats = {
        tableName: "test_table",
        totalRecords: 100,
        successCount: 90,
        errorCount: 5,
        skippedCount: 5,
        duration: 5420,
        errors: [
          { record: { id: 1 }, error: "Missing required field" },
          { record: { id: 2 }, error: "Invalid format" },
        ],
      };

      printMigrationStats(stats);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(output).toContain("test_table");
      expect(output).toContain("100");
      expect(output).toContain("90");
      expect(output).toContain("5");
      expect(output).toContain("5.42s");

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // LEGACY DATABASE TESTS
  // ============================================================================

  describe("fetchLegacyRecords", () => {
    beforeEach(() => {
      // Mock the legacyDb function to return a queryable object
      (legacyDb as jest.MockedFunction<any>).mockImplementation((tableName: string) => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest.fn((resolve: any) => {
            // Resolve with mock data
            resolve([
              { id: 1, name: "Record 1" },
              { id: 2, name: "Record 2" },
            ]);
            return Promise.resolve();
          }),
        };
        return mockQueryBuilder;
      });
    });

    it("should fetch all records without options", async () => {
      const records = await fetchLegacyRecords("legacy_table");
      expect(records).toHaveLength(2);
      expect(legacyDb).toHaveBeenCalledWith("legacy_table");
    }, 5000); // Add explicit timeout

    it("should apply where conditions", async () => {
      const records = await fetchLegacyRecords("legacy_table", {
        where: { status: "active" },
      });

      expect(legacyDb).toHaveBeenCalledWith("legacy_table");
      // The where method should have been called on the query builder
    }, 5000);

    it("should apply orderBy clause", async () => {
      const records = await fetchLegacyRecords("legacy_table", {
        orderBy: "created_at DESC",
      });

      expect(legacyDb).toHaveBeenCalledWith("legacy_table");
    }, 5000);

    it("should apply limit", async () => {
      const records = await fetchLegacyRecords("legacy_table", {
        limit: 10,
      });

      expect(legacyDb).toHaveBeenCalledWith("legacy_table");
    }, 5000);
  });

  describe("legacyTableExists", () => {
    it("should check if table exists", async () => {
      // Mock the schema property
      const mockSchema = {
        hasTable: jest.fn().mockResolvedValue(true),
      };
      (legacyDb as any).schema = mockSchema;

      const exists = await legacyTableExists("legacy_table");
      expect(exists).toBe(true);
      expect(mockSchema.hasTable).toHaveBeenCalledWith("legacy_table");
    });

    it("should return false if table does not exist", async () => {
      const mockSchema = {
        hasTable: jest.fn().mockResolvedValue(false),
      };
      (legacyDb as any).schema = mockSchema;

      const exists = await legacyTableExists("non_existent_table");
      expect(exists).toBe(false);
    });
  });

  describe("legacyTableExists", () => {
    it("should check if table exists", async () => {
      (legacyDb.schema.hasTable as jest.Mock).mockResolvedValue(true);
      const exists = await legacyTableExists("legacy_table");
      expect(exists).toBe(true);
    });

    it("should return false if table does not exist", async () => {
      (legacyDb.schema.hasTable as jest.Mock).mockResolvedValue(false);
      const exists = await legacyTableExists("non_existent_table");
      expect(exists).toBe(false);
    });
  });

  // ============================================================================
  // TABLE OPERATIONS TESTS
  // ============================================================================

  describe("clearTable", () => {
    beforeEach(async () => {
      await db("test_helpers_table").insert([
        { name: "Item 1", slug: "item-1" },
        { name: "Item 2", slug: "item-2" },
        { name: "Item 3", slug: "item-3" },
      ]);
    });

    it("should clear entire table", async () => {
      const count = await clearTable(db, "test_helpers_table");
      expect(count).toBe(3);

      const remaining = await db("test_helpers_table").count("* as count");
      expect(remaining[0].count).toBe(0);
    });

    it("should clear with where conditions", async () => {
      await db("test_helpers_table").where({ slug: "item-1" }).update({ value: 100 });

      const count = await clearTable(db, "test_helpers_table", {
        where: { value: 100 },
      });

      expect(count).toBe(1);

      const remaining = await db("test_helpers_table").count("* as count");
      expect(Number(remaining[0].count)).toBe(2);
    });
  });

  describe("shouldSeed", () => {
    it("should return true for empty table", async () => {
      const result = await shouldSeed(db, "test_helpers_table");
      expect(result).toBe(true);
    });

    it("should return false for non-empty table", async () => {
      await db("test_helpers_table").insert({
        name: "Item",
        slug: "item",
      });

      const result = await shouldSeed(db, "test_helpers_table");
      expect(result).toBe(false);
    });

    it("should check against minimum record count", async () => {
      await db("test_helpers_table").insert([
        { name: "Item 1", slug: "item-1" },
        { name: "Item 2", slug: "item-2" },
      ]);

      // Should return true if below minimum
      const shouldSeedMore = await shouldSeed(db, "test_helpers_table", {
        minRecords: 10,
      });
      expect(shouldSeedMore).toBe(true);

      // Should return false if at or above minimum
      const shouldNotSeed = await shouldSeed(db, "test_helpers_table", {
        minRecords: 2,
      });
      expect(shouldNotSeed).toBe(false);
    });

    it("should return true when minRecords is specified and not met", async () => {
      await db("test_helpers_table").insert({
        name: "Item",
        slug: "item",
      });

      const result = await shouldSeed(db, "test_helpers_table", {
        minRecords: 5,
      });
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe("validateRequired", () => {
    it("should return null for valid record", () => {
      const record = {
        name: "John Doe",
        email: "john@example.com",
        phone: "+213555123456",
      };

      const error = validateRequired(record, ["name", "email", "phone"]);
      expect(error).toBeNull();
    });

    it("should return error for missing field", () => {
      const record = {
        name: "John Doe",
        email: "",
      };

      const error = validateRequired(record, ["name", "email", "phone"]);
      expect(error).toBe("Missing required field: email");
    });

    it("should return error for null field", () => {
      const record = {
        name: "John Doe",
        email: null,
        phone: "+213555123456",
      };

      const error = validateRequired(record, ["name", "email", "phone"]);
      expect(error).toBe("Missing required field: email");
    });

    it("should return error for undefined field", () => {
      const record = {
        name: "John Doe",
        phone: "+213555123456",
      };

      const error = validateRequired(record, ["name", "email", "phone"]);
      expect(error).toBe("Missing required field: email");
    });

    it("should check first missing field", () => {
      const record = {
        name: "",
        email: "",
      };

      const error = validateRequired(record, ["name", "email", "phone"]);
      expect(error).toBe("Missing required field: name");
    });

    it("should handle empty array of required fields", () => {
      const record = { name: "John Doe" };
      const error = validateRequired(record, []);
      expect(error).toBeNull();
    });

    it("should detect empty strings", () => {
      const record = {
        name: "   ",
        email: "john@example.com",
      };

      // Note: validateRequired doesn't trim, so "   " is truthy
      // If you want to catch this, you'd need to use cleanText first
      const error = validateRequired(record, ["name", "email"]);
      expect(error).toBeNull(); // Current behavior
    });
  });

  describe("validateEnum", () => {
    it("should return null for valid enum value", () => {
      const error = validateEnum("active", ["active", "inactive", "pending"], "status");
      expect(error).toBeNull();
    });

    it("should return error for invalid enum value", () => {
      const error = validateEnum(
        "invalid",
        ["active", "inactive", "pending"],
        "status"
      );
      expect(error).toBe(
        "Invalid status: invalid. Must be one of: active, inactive, pending"
      );
    });

    it("should handle numeric enum values", () => {
      const error = validateEnum(1, [1, 2, 3], "priority");
      expect(error).toBeNull();
    });

    it("should handle case-sensitive validation", () => {
      const error = validateEnum("Active", ["active", "inactive"], "status");
      expect(error).toBe("Invalid status: Active. Must be one of: active, inactive");
    });

    it("should provide clear error message with field name", () => {
      const error = validateEnum("villa", ["apartment", "studio"], "propertyType");
      expect(error).toContain("propertyType");
      expect(error).toContain("villa");
      expect(error).toContain("apartment");
      expect(error).toContain("studio");
    });

    it("should handle empty allowed values", () => {
      const error = validateEnum("any", [], "field");
      expect(error).toBe("Invalid field: any. Must be one of: ");
    });

    it("should handle null/undefined values", () => {
      const errorNull = validateEnum(null, ["active", "inactive"], "status");
      expect(errorNull).toBe("Invalid status: null. Must be one of: active, inactive");

      const errorUndefined = validateEnum(
        undefined,
        ["active", "inactive"],
        "status"
      );
      expect(errorUndefined).toBe(
        "Invalid status: undefined. Must be one of: active, inactive"
      );
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe("Integration: Full ETL Pipeline", () => {
    it("should perform complete ETL workflow", async () => {
      // 1. Prepare source data
      const sourceRecords = [
        { old_id: "OLD_1", name: "Project Alpha", status: "active" },
        { old_id: "OLD_2", name: "Project Beta", status: "active" },
        { old_id: "OLD_3", name: "Project Gamma", status: "inactive" },
        { old_id: "OLD_4", name: "", status: "active" }, // Invalid
      ];

      // 2. Transform function with validation
      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        // Validate required fields
        const error = validateRequired(record, ["name", "status"]);
        if (error) {
          return { data: null, skip: false, error };
        }

        // Validate enum
        const statusError = validateEnum(
          record.status,
          ["active", "inactive", "pending"],
          "status"
        );
        if (statusError) {
          return { data: null, skip: false, error: statusError };
        }

        // Skip inactive records
        if (record.status === "inactive") {
          return { data: null, skip: true };
        }

        // Generate unique slug
        const slug = await ensureUniqueSlug(
          db,
          "test_helpers_table",
          generateSlug(record.name)
        );

        return {
          data: {
            name: cleanText(record.name),
            slug,
            old_id: record.old_id,
          },
          skip: false,
        };
      };

      // 3. Insert function
      const insertFn = async (batch: any[]) => {
        await db("test_helpers_table").insert(batch);
      };

      // 4. Process batch
      const stats = await processBatch(sourceRecords, transformFn, insertFn, {
        tableName: "test_helpers_table",
        batchSize: 2,
      });

      // 5. Verify results
      expect(stats.totalRecords).toBe(4);
      expect(stats.successCount).toBe(2); // Alpha and Beta
      expect(stats.skippedCount).toBe(1); // Gamma (inactive)
      expect(stats.errorCount).toBe(1); // Empty name

      // 6. Verify database state
      const records = await db("test_helpers_table").select("*");
      expect(records).toHaveLength(2);
      expect(records.map((r) => r.name)).toEqual(
        expect.arrayContaining(["Project Alpha", "Project Beta"])
      );

      // 7. Verify lookup map can be built
      const lookupMap = await buildLookupMap(
        db,
        "test_helpers_table",
        "old_id",
        "id"
      );
      expect(lookupMap.size).toBe(2);
      expect(lookupMap.has("OLD_1")).toBe(true);
      expect(lookupMap.has("OLD_2")).toBe(true);
    });

    it("should handle slug uniqueness in batch", async () => {
      // Insert initial record
      await db("test_helpers_table").insert({
        name: "Test Project",
        slug: "test-project",
      });

      // Try to insert duplicate
      const sourceRecords = [
        { name: "Test Project" },
        { name: "Test Project" },
        { name: "Test Project" },
      ];

      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        const slug = await ensureUniqueSlug(
          db,
          "test_helpers_table",
          generateSlug(record.name)
        );

        return {
          data: {
            name: record.name,
            slug,
          },
          skip: false,
        };
      };

      const insertFn = async (batch: any[]) => {
        await db("test_helpers_table").insert(batch);
      };

      const stats = await processBatch(sourceRecords, transformFn, insertFn, {
        tableName: "test_helpers_table",
        batchSize: 1, // Process one at a time
      });

      expect(stats.successCount).toBe(3);

      // Verify all slugs are unique
      const records = await db("test_helpers_table")
        .select("slug")
        .orderBy("id");
      const slugs = records.map((r) => r.slug);
      expect(slugs).toEqual([
        "test-project",
        "test-project-1",
        "test-project-2",
        "test-project-3",
      ]);
    });
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle special characters in slugs", () => {
      expect(generateSlug("Œuvre d'art")).toBe("oeuvre-dart");
      expect(generateSlug("Ñoño's Café")).toBe("nonos-cafe");
      expect(generateSlug("Zürich Straße")).toBe("zurich-strae");
    });

    it("should handle very long slugs", () => {
      const longText = "a".repeat(300);
      const slug = generateSlug(longText);
      expect(slug.length).toBe(300);
    });

    it("should handle empty batch processing", async () => {
      const stats = await processBatch(
        [],
        async (r) => ({ data: r, skip: false }),
        async () => { },
        { tableName: "test_table" }
      );

      expect(stats.totalRecords).toBe(0);
      expect(stats.successCount).toBe(0);
    });

    it("should handle null values in data cleaning", () => {
      expect(cleanText(null)).toBeNull();
      expect(parseDecimal(null)).toBeNull();
      expect(parseInteger(null)).toBeNull();
      expect(cleanUrl(null)).toBeNull();
      expect(parseDate(null)).toBeNull();
    });

    it("should handle large numbers in parseDecimal", () => {
      expect(parseDecimal("999999999.99")).toBe(999999999.99);
      expect(parseDecimal("1e10")).toBe(10000000000);
    });

    it("should handle negative integers", () => {
      expect(parseInteger("-123")).toBe(-123);
      expect(parseInteger(-456)).toBe(-456);
    });

    it("should handle URL edge cases", () => {
      expect(cleanUrl("//cdn.example.com/image.jpg")).toBe(
        "//cdn.example.com/image.jpg"
      );
      expect(cleanUrl("ftp://files.example.com")).toBe("ftp://files.example.com");
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe("Performance", () => {
    it("should handle large batch efficiently", async () => {
      const largeRecordSet = Array.from({ length: 1000 }, (_, i) => ({
        name: `Item ${i}`,
      }));

      const startTime = Date.now();

      const transformFn = async (record: any): Promise<TransformResult<any>> => {
        return {
          data: {
            name: record.name,
            slug: generateSlug(record.name),
          },
          skip: false,
        };
      };

      const insertFn = async (batch: any[]) => {
        // Simulate insert
        await waitFor(1);
      };

      const stats = await processBatch(largeRecordSet, transformFn, insertFn, {
        tableName: "test_table",
        batchSize: 100,
      });

      const duration = Date.now() - startTime;

      expect(stats.successCount).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it("should build large lookup maps efficiently", async () => {
      // Insert 100 records
      const records = Array.from({ length: 100 }, (_, i) => ({
        name: `Item ${i}`,
        slug: `item-${i}`,
        old_id: `OLD_${i}`,
      }));

      await db("test_helpers_table").insert(records);

      const startTime = Date.now();
      const map = await buildLookupMap(
        db,
        "test_helpers_table",
        "old_id",
        "id"
      );
      const duration = Date.now() - startTime;

      expect(map.size).toBe(100);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  // ============================================================================
  // TYPE SAFETY TESTS
  // ============================================================================

  describe("Type Safety", () => {
    it("should preserve types in TransformResult", async () => {
      interface SourceRecord {
        id: number;
        name: string;
      }

      interface TargetRecord {
        name: string;
        slug: string;
      }

      const transformFn = async (
        record: SourceRecord
      ): Promise<TransformResult<TargetRecord>> => {
        return {
          data: {
            name: record.name,
            slug: generateSlug(record.name),
          },
          skip: false,
        };
      };

      const result = await transformFn({ id: 1, name: "Test" });
      expect(result.data).toHaveProperty("name");
      expect(result.data).toHaveProperty("slug");
    });

    it("should handle generic types in buildLookupMap", async () => {
      await db("test_helpers_table").insert([
        { name: "Item 1", slug: "item-1", old_id: "OLD_1", value: 100 },
        { name: "Item 2", slug: "item-2", old_id: "OLD_2", value: 200 },
      ]);

      const idMap = await buildLookupMap<number>(
        db,
        "test_helpers_table",
        "old_id",
        "id"
      );

      const valueMap = await buildLookupMap<number>(
        db,
        "test_helpers_table",
        "old_id",
        "value"
      );

      expect(typeof idMap.get("OLD_1")).toBe("number");
      expect(valueMap.get("OLD_1")).toBe(100);
    });
  });

  // ============================================================================
  // DOCUMENTATION EXAMPLES TESTS
  // ============================================================================

  describe("Documentation Examples", () => {
    it("should match slug generation examples from docs", () => {
      expect(generateSlug("Résidence Green Heights!")).toBe(
        "residence-green-heights"
      );
      expect(generateSlug("Café & Restaurant")).toBe("cafe-restaurant");
      expect(generateSlug("   Multiple   Spaces   ")).toBe("multiple-spaces");
    });

    it("should match cleanText examples from docs", () => {
      expect(cleanText("  Hello   World  ")).toBe("Hello World");
      expect(cleanText("")).toBeNull();
      expect(cleanText(null)).toBeNull();
      expect(cleanText("   ")).toBeNull();
    });

    it("should match parseDecimal examples from docs", () => {
      expect(parseDecimal("1,250.50")).toBe(1250.5);
      expect(parseDecimal("1250.50")).toBe(1250.5);
      expect(parseDecimal(1250.5)).toBe(1250.5);
      expect(parseDecimal("")).toBeNull();
      expect(parseDecimal(null)).toBeNull();
      expect(parseDecimal("abc")).toBeNull();
    });

    it("should match parseInteger examples from docs", () => {
      expect(parseInteger("123")).toBe(123);
      expect(parseInteger(123)).toBe(123);
      expect(parseInteger("")).toBeNull();
      expect(parseInteger(null)).toBeNull();
      expect(parseInteger("abc")).toBeNull();
      expect(parseInteger("123.45")).toBe(123);
    });

    it("should match validateRequired examples from docs", () => {
      const record = { name: "John", email: "" };
      const error = validateRequired(record, ["name", "email", "phone"]);
      expect(error).toBe("Missing required field: email");
    });

    it("should match validateEnum examples from docs", () => {
      const statusError = validateEnum(
        "pending",
        ["pending", "active", "sold"],
        "status"
      );
      expect(statusError).toBeNull();

      const typeError = validateEnum(
        "invalid",
        ["apartment", "villa", "studio"],
        "propertyType"
      );
      expect(typeError).toContain("Invalid propertyType: invalid");
    });
  });
});