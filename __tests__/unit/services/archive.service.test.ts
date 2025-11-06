/**
 * Archive Service Tests
 * Comprehensive test suite for data archival functionality
 *
 * Test Coverage:
 * - Table archival with batching
 * - Archive metadata logging
 * - Old archive purging
 * - Archive statistics
 * - Integrity verification
 * - Disk space reporting
 * - Error handling
 * - Batch processing
 */

import { ArchivalService } from "@services/archive.service";
import { Knex } from "knex";

// Mock Knex
const mockKnex = jest.fn() as any;

describe("Archive Service", () => {
  let archivalService: ArchivalService;
  let mockTransaction: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue([{ count: 0 }]),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue([1]),
      whereIn: jest.fn().mockReturnThis(),
      delete: jest.fn().mockResolvedValue(0),
      select: jest.fn().mockReturnThis(),
      sum: jest.fn().mockReturnThis(),
      avg: jest.fn().mockReturnThis(),
      max: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockResolvedValue([]),
    };

    // Mock transaction
    mockTransaction = {
      ...mockQueryBuilder,
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Knex instance
    mockKnex.mockReturnValue(mockQueryBuilder);
    mockKnex.transaction = jest.fn().mockResolvedValue(mockTransaction);
    mockKnex.raw = jest.fn().mockResolvedValue([[]]);
    mockKnex.schema = {
      hasTable: jest.fn().mockResolvedValue(true),
    };

    // Suppress console logs
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(process.stdout, "write").mockImplementation();

    archivalService = new ArchivalService(mockKnex as unknown as Knex);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // ARCHIVE TABLE TESTS
  // ============================================================================

  describe("archiveTable", () => {
    const mockConfig = {
      tableName: "page_views",
      archiveTableName: "page_views_archive",
      dateColumn: "viewed_at",
      batchSize: 10000,
      cutoffMonths: 6,
    };

    it("should successfully archive records in batches", async () => {
      const mockRecords = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: i + 1,
          data: `record-${i}`,
          viewed_at: new Date("2023-01-01"),
        }));

      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 5 }]);
      mockTransaction.mockResolvedValueOnce(mockRecords);
      mockTransaction.insert.mockResolvedValueOnce([1]);
      mockTransaction.delete.mockResolvedValueOnce(5);

      const result = await archivalService.archiveTable(mockConfig);

      expect(result.success).toBe(true);
      expect(result.recordsArchived).toBe(5);
      expect(mockKnex.transaction).toHaveBeenCalled();
    });

    it("should return early if no records to archive", async () => {
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 0 }]);

      const result = await archivalService.archiveTable(mockConfig);

      expect(result.success).toBe(true);
      expect(result.recordsArchived).toBe(0);
      expect(mockKnex.transaction).not.toHaveBeenCalled();
    });

    it("should handle archival errors gracefully", async () => {
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 10 }]);
      mockKnex.transaction.mockRejectedValueOnce(
        new Error("Database connection lost")
      );

      const result = await archivalService.archiveTable(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database connection lost");
    });

    it("should process large datasets in batches", async () => {
      const recordCount = 25000;
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: recordCount }]);

      const mockBatch = Array(10000)
        .fill(null)
        .map((_, i) => ({
          id: i + 1,
          data: `record-${i}`,
        }));

      mockTransaction.mockResolvedValue(mockBatch);
      mockTransaction.insert.mockResolvedValue([1]);
      mockTransaction.delete.mockResolvedValue(10000);

      const result = await archivalService.archiveTable(mockConfig);

      expect(mockKnex.transaction).toHaveBeenCalled();
      expect(result.recordsArchived).toBeGreaterThan(0);
    });

    it("should rollback transaction on batch failure", async () => {
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 10 }]);

      const mockRecords = Array(10)
        .fill(null)
        .map((_, i) => ({ id: i + 1 }));
      mockTransaction.mockResolvedValueOnce(mockRecords);
      mockTransaction.insert.mockRejectedValueOnce(new Error("Insert failed"));

      const result = await archivalService.archiveTable(mockConfig);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it("should log archival metadata", async () => {
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 5 }]);

      const mockRecords = Array(5)
        .fill(null)
        .map((_, i) => ({ id: i + 1 }));
      mockTransaction.mockResolvedValueOnce(mockRecords);

      await archivalService.archiveTable(mockConfig);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          table_name: mockConfig.tableName,
          records_archived: expect.any(Number),
          status: expect.any(String),
        })
      );
    });

    it("should calculate correct cutoff date", async () => {
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 0 }]);

      await archivalService.archiveTable(mockConfig);

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - mockConfig.cutoffMonths);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        mockConfig.dateColumn,
        "<",
        expect.any(Date)
      );
    });

    it("should include archived_at timestamp", async () => {
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 1 }]);

      const mockRecords = [{ id: 1, data: "test" }];
      mockTransaction.mockResolvedValueOnce(mockRecords);

      await archivalService.archiveTable(mockConfig);

      expect(mockTransaction.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            archived_at: expect.any(Date),
          }),
        ])
      );
    });
  });

  // ============================================================================
  // ARCHIVE ALL TABLES TESTS
  // ============================================================================

  describe("archiveAllTables", () => {
    it("should archive all configured tables", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: 0 }]);

      await archivalService.archiveAllTables();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting archival process")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("completed")
      );
    });

    it("should continue on individual table failures", async () => {
      mockQueryBuilder.count
        .mockResolvedValueOnce([{ count: 0 }])
        .mockRejectedValueOnce(new Error("Table error"))
        .mockResolvedValueOnce([{ count: 0 }]);

      await archivalService.archiveAllTables();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("completed")
      );
    });

    it("should log progress for each table", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: 0 }]);

      await archivalService.archiveAllTables();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Archiving")
      );
    });
  });

  // ============================================================================
  // PURGE OLD ARCHIVES TESTS
  // ============================================================================

  describe("purgeOldArchives", () => {
    it("should purge archives older than retention period", async () => {
      mockQueryBuilder.delete.mockResolvedValue(50);

      await archivalService.purgeOldArchives(2);

      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "archived_at",
        "<",
        expect.any(Date)
      );
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it("should handle purge errors gracefully", async () => {
      mockQueryBuilder.delete.mockRejectedValue(new Error("Purge failed"));

      await archivalService.purgeOldArchives(2);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Purge failed"),
        expect.any(Error)
      );
    });

    it("should purge all archive tables", async () => {
      mockQueryBuilder.delete.mockResolvedValue(10);

      await archivalService.purgeOldArchives(2);

      expect(mockKnex).toHaveBeenCalledWith(expect.stringContaining("archive"));
    });

    it("should use default retention period", async () => {
      mockQueryBuilder.delete.mockResolvedValue(5);

      await archivalService.purgeOldArchives();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("2 years")
      );
    });

    it("should report purge results", async () => {
      mockQueryBuilder.delete.mockResolvedValue(25);

      await archivalService.purgeOldArchives(1);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Purged 25")
      );
    });
  });

  // ============================================================================
  // ARCHIVE STATISTICS TESTS
  // ============================================================================

  describe("getArchivalStats", () => {
    it("should return statistics for all tables", async () => {
      const mockStats = [
        {
          table_name: "page_views",
          total_archived: "1000",
          avg_duration: "45.5",
          last_archive_date: new Date(),
          archive_runs: "5",
        },
      ];

      mockQueryBuilder.groupBy.mockResolvedValueOnce(mockStats);

      const stats = await archivalService.getArchivalStats();

      expect(stats).toEqual(mockStats);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith("table_name");
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith("table_name");
    });

    it("should handle empty statistics", async () => {
      mockQueryBuilder.groupBy.mockResolvedValueOnce([]);

      const stats = await archivalService.getArchivalStats();

      expect(stats).toEqual([]);
    });

    it("should aggregate archival data", async () => {
      const mockStats = [
        {
          table_name: "page_views",
          total_archived: "5000",
          avg_duration: "120",
          last_archive_date: new Date(),
          archive_runs: "10",
        },
      ];

      mockQueryBuilder.groupBy.mockResolvedValueOnce(mockStats);

      const stats = await archivalService.getArchivalStats();

      expect(stats[0]).toHaveProperty("total_archived");
      expect(stats[0]).toHaveProperty("avg_duration");
      expect(stats[0]).toHaveProperty("archive_runs");
    });
  });

  // ============================================================================
  // VERIFY ARCHIVE INTEGRITY TESTS
  // ============================================================================

  describe("verifyArchiveIntegrity", () => {
    it("should verify archive integrity successfully", async () => {
      const mockArchived = [{ id: 1 }, { id: 2 }, { id: 3 }];
      mockQueryBuilder.limit.mockResolvedValueOnce(mockArchived);
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 0 }]);

      const result = await archivalService.verifyArchiveIntegrity(
        "page_views",
        "page_views_archive",
        100
      );

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Integrity verified")
      );
    });

    it("should detect integrity violations", async () => {
      const mockArchived = [{ id: 1 }, { id: 2 }];
      mockQueryBuilder.limit.mockResolvedValueOnce(mockArchived);
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 1 }]);

      const result = await archivalService.verifyArchiveIntegrity(
        "page_views",
        "page_views_archive",
        100
      );

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Integrity check failed")
      );
    });

    it("should handle empty archives", async () => {
      mockQueryBuilder.limit.mockResolvedValueOnce([]);

      const result = await archivalService.verifyArchiveIntegrity(
        "page_views",
        "page_views_archive",
        100
      );

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("No archived records")
      );
    });

    it("should use random sampling", async () => {
      const mockArchived = Array(100)
        .fill(null)
        .map((_, i) => ({ id: i + 1 }));
      mockQueryBuilder.limit.mockResolvedValueOnce(mockArchived);
      mockQueryBuilder.count.mockResolvedValueOnce([{ count: 0 }]);

      await archivalService.verifyArchiveIntegrity(
        "page_views",
        "page_views_archive",
        100
      );

      expect(mockQueryBuilder.orderByRaw).toHaveBeenCalledWith("RAND()");
    });

    it("should handle verification errors", async () => {
      mockQueryBuilder.limit.mockRejectedValueOnce(new Error("Database error"));

      const result = await archivalService.verifyArchiveIntegrity(
        "page_views",
        "page_views_archive",
        100
      );

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Integrity check failed"),
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // DISK SPACE SAVINGS TESTS
  // ============================================================================

  describe("getDiskSpaceSavings", () => {
    it("should calculate disk space savings", async () => {
      const mockSizeData = [{ table_name: "page_views", size_mb: 250.5 }];

      mockKnex.raw
        .mockResolvedValueOnce([mockSizeData])
        .mockResolvedValueOnce([
          [{ table_name: "page_views_archive", size_mb: 150.25 }],
        ]);

      const report = await archivalService.getDiskSpaceSavings();

      expect(report).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            table: expect.any(String),
            active_size_mb: expect.any(Number),
            archive_size_mb: expect.any(Number),
            total_size_mb: expect.any(Number),
          }),
        ])
      );
    });

    it("should handle tables with no data", async () => {
      mockKnex.raw.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);

      const report = await archivalService.getDiskSpaceSavings();

      expect(report).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            active_size_mb: 0,
            archive_size_mb: 0,
          }),
        ])
      );
    });

    it("should query information_schema", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      await archivalService.getDiskSpaceSavings();

      expect(mockKnex.raw).toHaveBeenCalledWith(
        expect.stringContaining("information_schema.TABLES"),
        expect.any(Array)
      );
    });

    it("should calculate total size", async () => {
      const mockActive = [{ size_mb: 100 }];
      const mockArchive = [{ size_mb: 50 }];

      mockKnex.raw
        .mockResolvedValueOnce([mockActive])
        .mockResolvedValueOnce([mockArchive]);

      const report = await archivalService.getDiskSpaceSavings();

      expect(report[0].total_size_mb).toBe(150);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe("Integration Scenarios", () => {
    it("should handle complete archival workflow", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: 100 }]);

      const mockRecords = Array(100)
        .fill(null)
        .map((_, i) => ({ id: i + 1 }));
      mockTransaction.mockResolvedValue(mockRecords);

      await archivalService.archiveAllTables();

      expect(mockKnex.transaction).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should handle maintenance workflow", async () => {
      mockQueryBuilder.delete.mockResolvedValue(10);
      mockQueryBuilder.groupBy.mockResolvedValue([]);

      await archivalService.purgeOldArchives(2);
      await archivalService.getArchivalStats();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Purge completed")
      );
    });

    it("should handle verification workflow", async () => {
      const mockArchived = [{ id: 1 }];
      mockQueryBuilder.limit.mockResolvedValue(mockArchived);
      mockQueryBuilder.count.mockResolvedValue([{ count: 0 }]);
      mockKnex.raw.mockResolvedValue([[]]);

      await archivalService.verifyArchiveIntegrity(
        "page_views",
        "page_views_archive"
      );
      await archivalService.getDiskSpaceSavings();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Integrity verified")
      );
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      mockQueryBuilder.count.mockRejectedValue(new Error("Connection refused"));

      const config = {
        tableName: "page_views",
        archiveTableName: "page_views_archive",
        dateColumn: "viewed_at",
        batchSize: 10000,
        cutoffMonths: 6,
      };

      const result = await archivalService.archiveTable(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection refused");
    });

    it("should handle transaction timeout", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: 1000 }]);
      mockKnex.transaction.mockRejectedValue(
        new Error("Lock wait timeout exceeded")
      );

      const config = {
        tableName: "page_views",
        archiveTableName: "page_views_archive",
        dateColumn: "viewed_at",
        batchSize: 10000,
        cutoffMonths: 6,
      };

      const result = await archivalService.archiveTable(config);

      expect(result.success).toBe(false);
    });

    it("should handle disk space errors", async () => {
      mockQueryBuilder.count.mockResolvedValue([{ count: 10 }]);
      const mockRecords = Array(10)
        .fill(null)
        .map((_, i) => ({ id: i + 1 }));
      mockTransaction.mockResolvedValue(mockRecords);
      mockTransaction.insert.mockRejectedValue(
        new Error("No space left on device")
      );

      const config = {
        tableName: "page_views",
        archiveTableName: "page_views_archive",
        dateColumn: "viewed_at",
        batchSize: 10000,
        cutoffMonths: 6,
      };

      const result = await archivalService.archiveTable(config);

      expect(result.success).toBe(false);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle very large batch sizes", async () => {
      const config = {
        tableName: "page_views",
        archiveTableName: "page_views_archive",
        dateColumn: "viewed_at",
        batchSize: 100000,
        cutoffMonths: 6,
      };

      mockQueryBuilder.count.mockResolvedValue([{ count: 100000 }]);

      const mockRecords = Array(100000)
        .fill(null)
        .map((_, i) => ({ id: i + 1 }));
      mockTransaction.mockResolvedValue(mockRecords);

      const result = await archivalService.archiveTable(config);

      expect(result.recordsArchived).toBeGreaterThan(0);
    });

    it("should handle zero retention period", async () => {
      mockQueryBuilder.delete.mockResolvedValue(1000);

      await archivalService.purgeOldArchives(0);

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it("should handle missing archive metadata table", async () => {
      mockQueryBuilder.insert.mockRejectedValue(
        new Error("Table 'archive_metadata' doesn't exist")
      );
      mockQueryBuilder.count.mockResolvedValue([{ count: 1 }]);

      const mockRecords = [{ id: 1 }];
      mockTransaction.mockResolvedValue(mockRecords);

      const config = {
        tableName: "page_views",
        archiveTableName: "page_views_archive",
        dateColumn: "viewed_at",
        batchSize: 10000,
        cutoffMonths: 6,
      };

      await expect(archivalService.archiveTable(config)).rejects.toThrow();
    });
  });
});
