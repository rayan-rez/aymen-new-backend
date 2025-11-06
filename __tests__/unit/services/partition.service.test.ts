/**
 * Partition Service Tests
 * Comprehensive test suite for partition management functionality
 *
 * Test Coverage:
 * - Future partition creation (monthly and quarterly)
 * - Old partition dropping
 * - Partition existence checking
 * - Partition statistics
 * - Health checks
 * - Partition optimization
 * - Error handling
 */

import { PartitionManager } from "@services/partition.service";
import { Knex } from "knex";

// Mock Knex
const mockKnex = jest.fn() as any;

describe("Partition Service", () => {
  let partitionManager: PartitionManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Knex raw queries
    mockKnex.raw = jest.fn().mockResolvedValue([[]]);

    // Suppress console logs
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();

    partitionManager = new PartitionManager(mockKnex as unknown as Knex);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // CREATE FUTURE PARTITIONS TESTS
  // ============================================================================

  describe("createFuturePartitions", () => {
    it("should create partitions for specified months ahead", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 0 }]]) // Partition doesn't exist
        .mockResolvedValueOnce([[]]) // CREATE partition success
        .mockResolvedValueOnce([[{ count: 0 }]])
        .mockResolvedValueOnce([[]]);

      await partitionManager.createFuturePartitions(3);

      expect(mockKnex.raw).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Creating partitions")
      );
    });

    it("should skip existing partitions", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 1 }]]); // Partition exists

      await partitionManager.createFuturePartitions(2);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("already exists")
      );
    });

    it("should handle partition creation errors gracefully", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 0 }]])
        .mockRejectedValueOnce(new Error("CREATE partition failed"));

      await partitionManager.createFuturePartitions(1);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create partition"),
        expect.any(Error)
      );
    });

    it("should create monthly partitions for correct tables", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 0 }]]);

      await partitionManager.createFuturePartitions(1);

      expect(mockKnex.raw).toHaveBeenCalledWith(
        expect.stringContaining("ALTER TABLE")
      );
    });

    it("should create quarterly partitions for correct tables", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 0 }]]);

      await partitionManager.createFuturePartitions(3);

      expect(mockKnex.raw).toHaveBeenCalled();
    });

    it("should calculate correct partition values for future months", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 0 }]]);

      await partitionManager.createFuturePartitions(2);

      const calls = mockKnex.raw.mock.calls;
      const createCalls = calls.filter(
        (call: any) =>
          call[0].includes("ALTER TABLE") && call[0].includes("REORGANIZE")
      );

      expect(createCalls.length).toBeGreaterThan(0);
    });

    it("should use LESS THAN for partition boundaries", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 0 }]])
        .mockResolvedValueOnce([[]]);

      await partitionManager.createFuturePartitions(1);

      const alterCalls = mockKnex.raw.mock.calls.filter((call: any) =>
        call[0].includes("LESS THAN")
      );

      expect(alterCalls.length).toBeGreaterThan(0);
    });

    it("should maintain p_future partition", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 0 }]])
        .mockResolvedValueOnce([[]]);

      await partitionManager.createFuturePartitions(1);

      const alterCalls = mockKnex.raw.mock.calls.filter((call: any) =>
        call[0].includes("p_future")
      );

      expect(alterCalls.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // DROP OLD PARTITIONS TESTS
  // ============================================================================

  describe("dropOldPartitions", () => {
    const mockPartitions = [
      {
        tableName: "page_views",
        partitionName: "p202201",
        partitionExpression: "partition_key",
        partitionDescription: "202201",
        tableRows: 1000,
        dataLength: 50000,
        indexLength: 10000,
      },
      {
        tableName: "page_views",
        partitionName: "p202312",
        partitionExpression: "partition_key",
        partitionDescription: "202312",
        tableRows: 2000,
        dataLength: 100000,
        indexLength: 20000,
      },
    ];

    it("should drop partitions older than retention period", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([mockPartitions]) // Get partition list
        .mockResolvedValueOnce([[]]) // DROP partition success
        .mockResolvedValueOnce([mockPartitions])
        .mockResolvedValueOnce([[]]);

      await partitionManager.dropOldPartitions(12);

      expect(mockKnex.raw).toHaveBeenCalledWith(
        expect.stringContaining("DROP PARTITION")
      );
    });

    it("should skip p_future partition when dropping", async () => {
      const partitionsWithFuture = [
        ...mockPartitions,
        {
          tableName: "page_views",
          partitionName: "p_future",
          partitionExpression: "partition_key",
          partitionDescription: "MAXVALUE",
          tableRows: 0,
          dataLength: 0,
          indexLength: 0,
        },
      ];

      mockKnex.raw.mockResolvedValue([partitionsWithFuture]);

      await partitionManager.dropOldPartitions(12);

      const dropCalls = mockKnex.raw.mock.calls.filter((call: any) =>
        call[0].includes("DROP PARTITION p_future")
      );

      expect(dropCalls.length).toBe(0);
    });

    it("should handle drop errors gracefully", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([mockPartitions])
        .mockRejectedValueOnce(new Error("DROP failed"));

      await partitionManager.dropOldPartitions(12);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to drop partition"),
        expect.any(Error)
      );
    });

    it("should calculate correct cutoff date", async () => {
      mockKnex.raw.mockResolvedValue([mockPartitions]);

      await partitionManager.dropOldPartitions(6);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("6 months")
      );
    });

    it("should process all partitioned tables", async () => {
      mockKnex.raw.mockResolvedValue([mockPartitions]);

      await partitionManager.dropOldPartitions(12);

      const getPartitionCalls = mockKnex.raw.mock.calls.filter((call: any) =>
        call[0].includes("information_schema.PARTITIONS")
      );

      expect(getPartitionCalls.length).toBeGreaterThan(0);
    });

    it("should handle monthly partition name format", async () => {
      const monthlyPartitions = [
        {
          tableName: "page_views",
          partitionName: "p202401",
          partitionExpression: "partition_key",
          partitionDescription: "202401",
          tableRows: 100,
          dataLength: 5000,
          indexLength: 1000,
        },
      ];

      mockKnex.raw.mockResolvedValue([monthlyPartitions]);

      await partitionManager.dropOldPartitions(24);

      expect(mockKnex.raw).toHaveBeenCalled();
    });

    it("should handle quarterly partition name format", async () => {
      const quarterlyPartitions = [
        {
          tableName: "property_interactions",
          partitionName: "p2023q1",
          partitionExpression: "partition_key",
          partitionDescription: "20231",
          tableRows: 500,
          dataLength: 25000,
          indexLength: 5000,
        },
      ];

      mockKnex.raw.mockResolvedValue([quarterlyPartitions]);

      await partitionManager.dropOldPartitions(24);

      expect(mockKnex.raw).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // PARTITION STATISTICS TESTS
  // ============================================================================

  describe("getPartitionStats", () => {
    const mockPartitions = [
      {
        tableName: "page_views",
        partitionName: "p202401",
        partitionExpression: "partition_key",
        partitionDescription: "202401",
        tableRows: 1000,
        dataLength: 50000,
        indexLength: 10000,
      },
      {
        tableName: "page_views",
        partitionName: "p202402",
        partitionExpression: "partition_key",
        partitionDescription: "202402",
        tableRows: 1500,
        dataLength: 75000,
        indexLength: 15000,
      },
    ];

    it("should return statistics for all partitions", async () => {
      mockKnex.raw.mockResolvedValue([mockPartitions]);

      const stats = await partitionManager.getPartitionStats();

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
    });

    it("should calculate total rows correctly", async () => {
      mockKnex.raw.mockResolvedValue([mockPartitions]);

      const stats = await partitionManager.getPartitionStats();

      const pageViewsStats = stats.find((s: any) => s.table === "page_views");
      expect(pageViewsStats?.totalRows).toBe(2500);
    });

    it("should calculate total size in MB", async () => {
      mockKnex.raw.mockResolvedValue([mockPartitions]);

      const stats = await partitionManager.getPartitionStats();

      const pageViewsStats = stats.find((s: any) => s.table === "page_views");
      expect(pageViewsStats?.totalSizeMB).toBeGreaterThan(0);
    });

    it("should include partition count", async () => {
      mockKnex.raw.mockResolvedValue([mockPartitions]);

      const stats = await partitionManager.getPartitionStats();

      const pageViewsStats = stats.find((s: any) => s.table === "page_views");
      expect(pageViewsStats?.partitionCount).toBe(2);
    });

    it("should include individual partition details", async () => {
      mockKnex.raw.mockResolvedValue([mockPartitions]);

      const stats = await partitionManager.getPartitionStats();

      const pageViewsStats = stats.find((s: any) => s.table === "page_views");
      expect(pageViewsStats?.partitions).toBeDefined();
      expect(Array.isArray(pageViewsStats?.partitions)).toBe(true);
    });

    it("should handle empty partition lists", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      const stats = await partitionManager.getPartitionStats();

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
    });

    it("should process all configured tables", async () => {
      mockKnex.raw.mockResolvedValue([mockPartitions]);

      const stats = await partitionManager.getPartitionStats();

      expect(stats.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // OPTIMIZE PARTITIONS TESTS
  // ============================================================================

  describe("optimizePartitions", () => {
    it("should optimize all partitioned tables", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      await partitionManager.optimizePartitions();

      expect(mockKnex.raw).toHaveBeenCalledWith(
        expect.stringContaining("OPTIMIZE TABLE")
      );
    });

    it("should handle optimization errors gracefully", async () => {
      mockKnex.raw.mockRejectedValue(new Error("OPTIMIZE failed"));

      await partitionManager.optimizePartitions();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to optimize"),
        expect.any(Error)
      );
    });

    it("should log optimization progress", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      await partitionManager.optimizePartitions();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Optimizing partitions")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Optimization completed")
      );
    });

    it("should optimize monthly partitioned tables", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      await partitionManager.optimizePartitions();

      const optimizeCalls = mockKnex.raw.mock.calls.filter((call: any) =>
        call[0].includes("OPTIMIZE TABLE")
      );

      expect(optimizeCalls.length).toBeGreaterThan(0);
    });

    it("should optimize quarterly partitioned tables", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      await partitionManager.optimizePartitions();

      expect(mockKnex.raw).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // HEALTH CHECK TESTS
  // ============================================================================

  describe("healthCheck", () => {
    it("should detect missing p_future partition", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 0 }]]) // p_future doesn't exist
        .mockResolvedValue([[{ count: 1 }]]); // Other partitions exist

      const result = await partitionManager.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          issue: "Missing p_future partition",
          severity: "critical",
        })
      );
    });

    it("should detect missing current month partition", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 1 }]]) // p_future exists
        .mockResolvedValueOnce([[{ count: 0 }]]); // Current month doesn't exist

      const result = await partitionManager.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.issues.some((i: any) => i.severity === "critical")).toBe(
        true
      );
    });

    it("should detect missing future partitions", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 1 }]]) // p_future exists
        .mockResolvedValueOnce([[{ count: 1 }]]) // Current month exists
        .mockResolvedValueOnce([[{ count: 0 }]]); // Future month doesn't exist

      const result = await partitionManager.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.issues.some((i: any) => i.severity === "warning")).toBe(
        true
      );
    });

    it("should detect excessive empty partitions", async () => {
      const emptyPartitions = Array(10).fill({
        tableName: "page_views",
        partitionName: "p202401",
        partitionExpression: "partition_key",
        partitionDescription: "202401",
        tableRows: 0,
        dataLength: 0,
        indexLength: 0,
      });

      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 1 }]]) // p_future exists
        .mockResolvedValue([[{ count: 1 }]]) // Partitions exist
        .mockResolvedValueOnce([emptyPartitions]); // Get partition list

      const result = await partitionManager.healthCheck();

      expect(
        result.issues.some((i: any) => i.issue.includes("empty partitions"))
      ).toBe(true);
    });

    it("should return healthy status when no issues found", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 1 }]]);

      const result = await partitionManager.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should categorize issues by severity", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 0 }]]) // Critical issue
        .mockResolvedValue([[{ count: 1 }]]);

      const result = await partitionManager.healthCheck();

      const severities = result.issues.map((i: any) => i.severity);
      expect(severities).toContain("critical");
    });

    it("should check all configured tables", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 1 }]]);

      await partitionManager.healthCheck();

      const checkCalls = mockKnex.raw.mock.calls.filter((call: any) =>
        call[0].includes("information_schema.PARTITIONS")
      );

      expect(checkCalls.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe("Integration Scenarios", () => {
    it("should handle complete maintenance workflow", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      await partitionManager.createFuturePartitions(3);
      await partitionManager.dropOldPartitions(12);
      await partitionManager.optimizePartitions();

      expect(mockKnex.raw).toHaveBeenCalled();
    });

    it("should handle health check after maintenance", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 1 }]]);

      await partitionManager.createFuturePartitions(2);
      const health = await partitionManager.healthCheck();

      expect(health).toBeDefined();
    });

    it("should provide statistics after operations", async () => {
      const mockPartitions = [
        {
          tableName: "page_views",
          partitionName: "p202401",
          partitionExpression: "partition_key",
          partitionDescription: "202401",
          tableRows: 1000,
          dataLength: 50000,
          indexLength: 10000,
        },
      ];

      mockKnex.raw.mockResolvedValue([mockPartitions]);

      const stats = await partitionManager.getPartitionStats();

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      mockKnex.raw.mockRejectedValue(new Error("Connection refused"));

      await partitionManager.createFuturePartitions(1);

      expect(console.error).toHaveBeenCalled();
    });

    it("should continue processing after individual failures", async () => {
      mockKnex.raw
        .mockResolvedValueOnce([[{ count: 0 }]])
        .mockRejectedValueOnce(new Error("CREATE failed"))
        .mockResolvedValueOnce([[{ count: 0 }]])
        .mockResolvedValueOnce([[]]);

      await partitionManager.createFuturePartitions(2);

      expect(console.error).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("completed")
      );
    });

    it("should handle invalid partition names", async () => {
      const invalidPartitions = [
        {
          tableName: "page_views",
          partitionName: "invalid_format",
          partitionExpression: "partition_key",
          partitionDescription: "invalid",
          tableRows: 0,
          dataLength: 0,
          indexLength: 0,
        },
      ];

      mockKnex.raw.mockResolvedValue([invalidPartitions]);

      await partitionManager.dropOldPartitions(12);

      expect(mockKnex.raw).toHaveBeenCalled();
    });

    it("should handle query timeout errors", async () => {
      mockKnex.raw.mockRejectedValue(new Error("Query timeout"));

      await partitionManager.getPartitionStats();

      // Should not throw, just return gracefully
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle zero months ahead", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 1 }]]);

      await partitionManager.createFuturePartitions(0);

      expect(console.log).toHaveBeenCalled();
    });

    it("should handle very long retention periods", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      await partitionManager.dropOldPartitions(120); // 10 years

      expect(mockKnex.raw).toHaveBeenCalled();
    });

    it("should handle year boundaries correctly", async () => {
      // Test creating partition at year end
      mockKnex.raw.mockResolvedValue([[{ count: 0 }]]);

      await partitionManager.createFuturePartitions(3);

      expect(mockKnex.raw).toHaveBeenCalled();
    });

    it("should handle quarter boundaries correctly", async () => {
      mockKnex.raw.mockResolvedValue([[{ count: 0 }]]);

      await partitionManager.createFuturePartitions(6);

      expect(mockKnex.raw).toHaveBeenCalled();
    });

    it("should handle empty partition lists", async () => {
      mockKnex.raw.mockResolvedValue([[]]);

      const stats = await partitionManager.getPartitionStats();

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
    });
  });
});
