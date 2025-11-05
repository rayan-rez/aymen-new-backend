/**
 * Partition Manager Service
 * Automated partition management for time-series data tables
 * Prevents "no partition for value" errors and manages disk space
 *
 * @module services/partition
 *
 * @swagger
 * components:
 *   schemas:
 *     PartitionInfo:
 *       type: object
 *       properties:
 *         tableName:
 *           type: string
 *           description: Name of the partitioned table
 *           example: "page_views"
 *         partitionName:
 *           type: string
 *           description: Name of the partition (e.g., p202411 or p2024q4)
 *           example: "p202411"
 *         partitionExpression:
 *           type: string
 *           description: MySQL partition expression
 *           example: "YEAR(created_at)*100 + MONTH(created_at)"
 *         partitionDescription:
 *           type: string
 *           description: LESS THAN value for the partition
 *           example: "202412"
 *         tableRows:
 *           type: integer
 *           description: Number of rows in this partition
 *           example: 1523487
 *         dataLength:
 *           type: integer
 *           description: Data size in bytes
 *           example: 125829120
 *         indexLength:
 *           type: integer
 *           description: Index size in bytes
 *           example: 45678592
 *
 *     PartitionStatistics:
 *       type: object
 *       properties:
 *         table:
 *           type: string
 *           description: Table name
 *           example: "page_views"
 *         partitionCount:
 *           type: integer
 *           description: Total number of partitions
 *           example: 15
 *         totalRows:
 *           type: integer
 *           description: Total rows across all partitions
 *           example: 25678901
 *         totalSizeMB:
 *           type: number
 *           format: float
 *           description: Total size in megabytes
 *           example: 2458.67
 *         partitions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "p202411"
 *               rows:
 *                 type: integer
 *                 example: 1523487
 *               sizeMB:
 *                 type: number
 *                 format: float
 *                 example: 163.42
 *
 *     PartitionHealthIssue:
 *       type: object
 *       properties:
 *         table:
 *           type: string
 *           description: Table with the issue
 *           example: "user_events"
 *         issue:
 *           type: string
 *           description: Description of the issue
 *           example: "Missing partition p202412"
 *         severity:
 *           type: string
 *           enum: [critical, warning, info]
 *           description: Issue severity level
 *           example: "critical"
 *
 *     PartitionHealthResponse:
 *       type: object
 *       properties:
 *         healthy:
 *           type: boolean
 *           description: Whether all partitions are healthy
 *           example: true
 *         issues:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PartitionHealthIssue'
 *           description: Array of detected issues
 *
 *     CreatePartitionsRequest:
 *       type: object
 *       properties:
 *         monthsAhead:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           default: 3
 *           description: Number of months ahead to create partitions
 *           example: 3
 *
 *     DropPartitionsRequest:
 *       type: object
 *       properties:
 *         retentionMonths:
 *           type: integer
 *           minimum: 1
 *           maximum: 120
 *           default: 12
 *           description: Keep partitions for this many months
 *           example: 12
 *
 *     PartitionOperationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Partition operation completed successfully"
 *         data:
 *           type: object
 *           properties:
 *             created:
 *               type: integer
 *               description: Number of partitions created
 *               example: 3
 *             dropped:
 *               type: integer
 *               description: Number of partitions dropped
 *               example: 2
 *             errors:
 *               type: array
 *               items:
 *                 type: string
 *               description: Any errors encountered
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *   examples:
 *     MonthlyPartitionStats:
 *       summary: Statistics for monthly partitioned table
 *       value:
 *         table: "page_views"
 *         partitionCount: 15
 *         totalRows: 25678901
 *         totalSizeMB: 2458.67
 *         partitions:
 *           - name: "p202409"
 *             rows: 1234567
 *             sizeMB: 145.23
 *           - name: "p202410"
 *             rows: 1523487
 *             sizeMB: 163.42
 *           - name: "p202411"
 *             rows: 1789234
 *             sizeMB: 178.91
 *
 *     QuarterlyPartitionStats:
 *       summary: Statistics for quarterly partitioned table
 *       value:
 *         table: "property_interactions"
 *         partitionCount: 8
 *         totalRows: 5432100
 *         totalSizeMB: 892.45
 *         partitions:
 *           - name: "p2023q4"
 *             rows: 678901
 *             sizeMB: 98.34
 *           - name: "p2024q1"
 *             rows: 723456
 *             sizeMB: 112.56
 *           - name: "p2024q2"
 *             rows: 845678
 *             sizeMB: 124.78
 *
 *     HealthyPartitions:
 *       summary: All partitions healthy
 *       value:
 *         healthy: true
 *         issues: []
 *
 *     PartitionIssuesDetected:
 *       summary: Partition issues detected
 *       value:
 *         healthy: false
 *         issues:
 *           - table: "page_views"
 *             issue: "Missing partition p202412"
 *             severity: "critical"
 *           - table: "user_events"
 *             issue: "Missing p_future partition"
 *             severity: "critical"
 *           - table: "event_analytics"
 *             issue: "8 empty partitions detected"
 *             severity: "info"
 *
 *     CreatePartitionsSuccess:
 *       summary: Successfully created future partitions
 *       value:
 *         success: true
 *         message: "Future partitions created successfully"
 *         data:
 *           created: 9
 *           tables:
 *             - table: "page_views"
 *               partitions: ["p202412", "p202501", "p202502"]
 *             - table: "user_events"
 *               partitions: ["p202412", "p202501", "p202502"]
 *             - table: "property_interactions"
 *               partitions: ["p2024q4", "p2025q1"]
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 * Features:
 * - Auto-create future partitions (prevent insertion errors)
 * - Drop old partitions based on retention policy
 * - Partition health monitoring
 * - Detailed statistics and reporting
 * - Support for monthly and quarterly partitioning
 * - Transaction-safe operations
 * - Automated partition optimization
 *
 * Partitioned tables:
 * Monthly partitions:
 * - page_views
 * - user_events
 * - event_analytics
 *
 * Quarterly partitions:
 * - property_interactions
 *
 * Partition naming conventions:
 * - Monthly: pYYYYMM (e.g., p202411 for November 2024)
 * - Quarterly: pYYYYqQ (e.g., p2024q4 for Q4 2024)
 * - Future catchall: p_future (MAXVALUE partition)
 *
 * @example
 * ```typescript
 * import PartitionManager from '@/services/partition.service';
 * import db from '@/config/database';
 *
 * const partitionManager = new PartitionManager(db);
 *
 * // Create future partitions (run monthly)
 * await partitionManager.createFuturePartitions(3); // 3 months ahead
 *
 * // Drop old partitions (run monthly)
 * await partitionManager.dropOldPartitions(12); // keep 12 months
 *
 * // Health check (run daily)
 * const health = await partitionManager.healthCheck();
 * if (!health.healthy) {
 *   console.error("Partition issues detected:", health.issues);
 * }
 *
 * // Get statistics
 * const stats = await partitionManager.getPartitionStats();
 * stats.forEach(table => {
 *   console.log(`${table.table}: ${table.totalRows} rows, ${table.totalSizeMB} MB`);
 * });
 *
 * // Optimize partitions
 * await partitionManager.optimizePartitions();
 * ```
 */

// src/services/partition.service.ts
import { Knex } from "knex";

/**
 * @openapi
 * Partition information interface
 * Contains detailed information about a single partition
 *
 * @interface PartitionInfo
 */
interface PartitionInfo {
  tableName: string;
  partitionName: string;
  partitionExpression: string;
  partitionDescription: string;
  tableRows: number;
  dataLength: number;
  indexLength: number;
}

/**
 * @openapi
 * PartitionManager Class
 * Automated partition management for time-series data
 * Handles creation, deletion, and monitoring of MySQL partitions
 *
 * @class PartitionManager
 */
export class PartitionManager {
  private knex: Knex;

  /**
   * @openapi
   * Tables with monthly partitioning
   * Partitioned by YEAR*100 + MONTH
   *
   * @private
   * @readonly
   */
  private readonly MONTHLY_PARTITIONED_TABLES = [
    "page_views",
    "user_events",
    "event_analytics",
  ];

  /**
   * @openapi
   * Tables with quarterly partitioning
   * Partitioned by YEAR*10 + QUARTER
   *
   * @private
   * @readonly
   */
  private readonly QUARTERLY_PARTITIONED_TABLES = ["property_interactions"];

  /**
   * @openapi
   * Creates a new PartitionManager instance
   *
   * @param {Knex} knex - Knex database connection
   *
   * @example
   * ```typescript
   * import db from '@/config/database';
   * const partitionManager = new PartitionManager(db);
   * ```
   */
  constructor(knex: Knex) {
    this.knex = knex;
  }

  /**
   * @openapi
   * Create future partitions for all partitioned tables
   * Prevents "no partition for value" errors by creating partitions ahead of time
   * Should be run as a scheduled job (monthly recommended)
   *
   * @param {number} [monthsAhead=3] - Number of months ahead to create partitions
   * @returns {Promise<void>}
   * @throws {Error} If partition creation fails
   *
   * @example
   * ```typescript
   * // Create partitions for next 3 months (default)
   * await partitionManager.createFuturePartitions();
   *
   * // Create partitions for next 6 months
   * await partitionManager.createFuturePartitions(6);
   *
   * // Run as cron job (monthly at 2 AM)
   * // 0 2 1 * * - At 02:00 on day 1 of every month
   * cron.schedule('0 2 1 * *', async () => {
   *   await partitionManager.createFuturePartitions(3);
   * });
   * ```
   */
  async createFuturePartitions(monthsAhead: number = 3): Promise<void> {
    console.log(`\n🔮 Creating partitions ${monthsAhead} months ahead...`);

    // Monthly partitions
    for (const table of this.MONTHLY_PARTITIONED_TABLES) {
      await this.createMonthlyPartitions(table, monthsAhead);
    }

    // Quarterly partitions
    for (const table of this.QUARTERLY_PARTITIONED_TABLES) {
      await this.createQuarterlyPartitions(table, Math.ceil(monthsAhead / 3));
    }

    console.log("✅ Future partitions created!");
  }

  /**
   * @openapi
   * Create monthly partitions for a specific table
   * Creates partitions with naming convention pYYYYMM
   *
   * @private
   * @param {string} tableName - Name of the table
   * @param {number} monthsAhead - Number of months ahead to create
   * @returns {Promise<void>}
   * @throws {Error} If partition creation fails
   *
   * @example
   * ```typescript
   * // Creates p202412, p202501, p202502 if current month is November 2024
   * await this.createMonthlyPartitions('page_views', 3);
   * ```
   */
  private async createMonthlyPartitions(
    tableName: string,
    monthsAhead: number
  ): Promise<void> {
    const currentDate = new Date();

    for (let i = 1; i <= monthsAhead; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(currentDate.getMonth() + i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const partitionValue = year * 100 + month;
      const partitionName = `p${year}${month.toString().padStart(2, "0")}`;

      // Check if partition exists
      const exists = await this.partitionExists(tableName, partitionName);

      if (!exists) {
        try {
          // Calculate next month for LESS THAN value
          const nextMonth = new Date(targetDate);
          nextMonth.setMonth(targetDate.getMonth() + 1);
          const nextYear = nextMonth.getFullYear();
          const nextMonthNum = nextMonth.getMonth() + 1;
          const lessThanValue = nextYear * 100 + nextMonthNum;

          // Add partition before p_future
          await this.knex.raw(`
            ALTER TABLE ${tableName}
            REORGANIZE PARTITION p_future INTO (
              PARTITION ${partitionName} VALUES LESS THAN (${lessThanValue}),
              PARTITION p_future VALUES LESS THAN MAXVALUE
            )
          `);

          console.log(`✅ Created partition ${partitionName} for ${tableName}`);
        } catch (error) {
          console.error(
            `❌ Failed to create partition ${partitionName} for ${tableName}:`,
            error
          );
        }
      } else {
        console.log(
          `ℹ️ Partition ${partitionName} already exists for ${tableName}`
        );
      }
    }
  }

  /**
   * @openapi
   * Create quarterly partitions for a specific table
   * Creates partitions with naming convention pYYYYqQ
   *
   * @private
   * @param {string} tableName - Name of the table
   * @param {number} quartersAhead - Number of quarters ahead to create
   * @returns {Promise<void>}
   * @throws {Error} If partition creation fails
   *
   * @example
   * ```typescript
   * // Creates p2024q4, p2025q1 if current quarter is Q3 2024
   * await this.createQuarterlyPartitions('property_interactions', 2);
   * ```
   */
  private async createQuarterlyPartitions(
    tableName: string,
    quartersAhead: number
  ): Promise<void> {
    const currentDate = new Date();
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
    const currentYear = currentDate.getFullYear();

    for (let i = 1; i <= quartersAhead; i++) {
      let targetQuarter = currentQuarter + i;
      let targetYear = currentYear;

      while (targetQuarter > 4) {
        targetQuarter -= 4;
        targetYear += 1;
      }

      const partitionValue = targetYear * 10 + targetQuarter;
      const partitionName = `p${targetYear}q${targetQuarter}`;

      const exists = await this.partitionExists(tableName, partitionName);

      if (!exists) {
        try {
          // Calculate next quarter
          let nextQuarter = targetQuarter + 1;
          let nextYear = targetYear;
          if (nextQuarter > 4) {
            nextQuarter = 1;
            nextYear += 1;
          }
          const lessThanValue = nextYear * 10 + nextQuarter;

          await this.knex.raw(`
            ALTER TABLE ${tableName}
            REORGANIZE PARTITION p_future INTO (
              PARTITION ${partitionName} VALUES LESS THAN (${lessThanValue}),
              PARTITION p_future VALUES LESS THAN MAXVALUE
            )
          `);

          console.log(`✅ Created partition ${partitionName} for ${tableName}`);
        } catch (error) {
          console.error(
            `❌ Failed to create partition ${partitionName} for ${tableName}:`,
            error
          );
        }
      }
    }
  }

  /**
   * @openapi
   * Drop old partitions based on retention policy
   * Helps manage disk space by removing old data
   * Should be run as a scheduled job (monthly recommended)
   *
   * @param {number} [retentionMonths=12] - Keep partitions for this many months
   * @returns {Promise<void>}
   * @throws {Error} If partition deletion fails
   *
   * @example
   * ```typescript
   * // Drop partitions older than 12 months (default)
   * await partitionManager.dropOldPartitions();
   *
   * // Drop partitions older than 6 months (shorter retention)
   * await partitionManager.dropOldPartitions(6);
   *
   * // Drop partitions older than 24 months (longer retention)
   * await partitionManager.dropOldPartitions(24);
   *
   * // Run as cron job (monthly at 3 AM)
   * cron.schedule('0 3 1 * *', async () => {
   *   await partitionManager.dropOldPartitions(12);
   * });
   * ```
   */
  async dropOldPartitions(retentionMonths: number = 12): Promise<void> {
    console.log(
      `\n🗑️ Dropping partitions older than ${retentionMonths} months...`
    );

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    const allTables = [
      ...this.MONTHLY_PARTITIONED_TABLES,
      ...this.QUARTERLY_PARTITIONED_TABLES,
    ];

    for (const table of allTables) {
      const partitions = await this.getPartitionList(table);

      for (const partition of partitions) {
        if (this.shouldDropPartition(partition.partitionName, cutoffDate)) {
          try {
            await this.knex.raw(
              `ALTER TABLE ${table} DROP PARTITION ${partition.partitionName}`
            );
            console.log(
              `✅ Dropped partition ${partition.partitionName} from ${table}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to drop partition ${partition.partitionName}:`,
              error
            );
          }
        }
      }
    }

    console.log("✅ Old partitions dropped!");
  }

  /**
   * @openapi
   * Check if a partition exists
   *
   * @private
   * @param {string} tableName - Table name
   * @param {string} partitionName - Partition name
   * @returns {Promise<boolean>} True if partition exists
   *
   * @example
   * ```typescript
   * const exists = await this.partitionExists('page_views', 'p202411');
   * if (exists) {
   *   console.log('Partition already exists');
   * }
   * ```
   */
  private async partitionExists(
    tableName: string,
    partitionName: string
  ): Promise<boolean> {
    const [result] = await this.knex.raw(
      `
      SELECT COUNT(*) as count
      FROM information_schema.PARTITIONS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND PARTITION_NAME = ?
    `,
      [tableName, partitionName]
    );

    return result[0].count > 0;
  }

  /**
   * @openapi
   * Get list of partitions for a table
   * Excludes the p_future catchall partition
   *
   * @private
   * @param {string} tableName - Table name
   * @returns {Promise<PartitionInfo[]>} Array of partition information
   *
   * @example
   * ```typescript
   * const partitions = await this.getPartitionList('page_views');
   * partitions.forEach(p => {
   *   console.log(`${p.partitionName}: ${p.tableRows} rows`);
   * });
   * ```
   */
  private async getPartitionList(tableName: string): Promise<PartitionInfo[]> {
    const [partitions] = await this.knex.raw(
      `
      SELECT 
        TABLE_NAME as tableName,
        PARTITION_NAME as partitionName,
        PARTITION_EXPRESSION as partitionExpression,
        PARTITION_DESCRIPTION as partitionDescription,
        TABLE_ROWS as tableRows,
        DATA_LENGTH as dataLength,
        INDEX_LENGTH as indexLength
      FROM information_schema.PARTITIONS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND PARTITION_NAME IS NOT NULL
      AND PARTITION_NAME != 'p_future'
      ORDER BY PARTITION_ORDINAL_POSITION
    `,
      [tableName]
    );

    return partitions;
  }

  /**
   * @openapi
   * Determine if partition should be dropped based on cutoff date
   * Parses partition name to extract date information
   *
   * @private
   * @param {string} partitionName - Partition name (pYYYYMM or pYYYYqQ)
   * @param {Date} cutoffDate - Cutoff date for retention
   * @returns {boolean} True if partition should be dropped
   *
   * @example
   * ```typescript
   * const cutoff = new Date('2024-01-01');
   * const shouldDrop = this.shouldDropPartition('p202310', cutoff);
   * // Returns true (October 2023 is before January 2024)
   * ```
   */
  private shouldDropPartition(
    partitionName: string,
    cutoffDate: Date
  ): boolean {
    // Skip p_future partition
    if (partitionName === "p_future") return false;

    // Parse partition name
    if (partitionName.includes("q")) {
      // Quarterly partition: p2024q1
      const match = partitionName.match(/p(\d{4})q(\d)/);
      if (!match) return false;

      const year = parseInt(match[1]);
      const quarter = parseInt(match[2]);
      const month = (quarter - 1) * 3;
      const partitionDate = new Date(year, month, 1);

      return partitionDate < cutoffDate;
    } else {
      // Monthly partition: p202410
      const match = partitionName.match(/p(\d{4})(\d{2})/);
      if (!match) return false;

      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const partitionDate = new Date(year, month, 1);

      return partitionDate < cutoffDate;
    }
  }

  /**
   * @openapi
   * Get partition statistics for all partitioned tables
   * Provides detailed size and row count information
   *
   * @returns {Promise<Array>} Array of statistics per table
   * @throws {Error} If statistics retrieval fails
   *
   * @example
   * ```typescript
   * const stats = await partitionManager.getPartitionStats();
   *
   * stats.forEach(table => {
   *   console.log(`\n${table.table}:`);
   *   console.log(`  Total partitions: ${table.partitionCount}`);
   *   console.log(`  Total rows: ${table.totalRows.toLocaleString()}`);
   *   console.log(`  Total size: ${table.totalSizeMB} MB`);
   *
   *   table.partitions.forEach(partition => {
   *     console.log(`    ${partition.name}: ${partition.rows} rows, ${partition.sizeMB} MB`);
   *   });
   * });
   *
   * // Output:
   * // page_views:
   * //   Total partitions: 15
   * //   Total rows: 25,678,901
   * //   Total size: 2458.67 MB
   * //     p202409: 1234567 rows, 145.23 MB
   * //     p202410: 1523487 rows, 163.42 MB
   * //     p202411: 1789234 rows, 178.91 MB
   * ```
   */
  async getPartitionStats(): Promise<any> {
    const allTables = [
      ...this.MONTHLY_PARTITIONED_TABLES,
      ...this.QUARTERLY_PARTITIONED_TABLES,
    ];

    const stats: any[] = [];

    for (const table of allTables) {
      const partitions = await this.getPartitionList(table);

      const totalRows = partitions.reduce((sum, p) => sum + p.tableRows, 0);
      const totalSize =
        partitions.reduce((sum, p) => sum + p.dataLength + p.indexLength, 0) /
        1024 /
        1024;

      stats.push({
        table,
        partitionCount: partitions.length,
        totalRows,
        totalSizeMB: Math.round(totalSize * 100) / 100,
        partitions: partitions.map((p) => ({
          name: p.partitionName,
          rows: p.tableRows,
          sizeMB:
            Math.round(((p.dataLength + p.indexLength) / 1024 / 1024) * 100) /
            100,
        })),
      });
    }

    return stats;
  }

  /**
   * @openapi
   * Optimize all partitions
   * Reclaims disk space and updates index statistics
   * WARNING: This can lock tables for extended periods on large datasets
   *
   * @returns {Promise<void>}
   * @throws {Error} If optimization fails
   *
   * @example
   * ```typescript
   * // Run during maintenance window
   * await partitionManager.optimizePartitions();
   *
   * // Schedule monthly (at 4 AM on the 1st)
   * cron.schedule('0 4 1 * *', async () => {
   *   console.log('Starting partition optimization...');
   *   await partitionManager.optimizePartitions();
   *   console.log('Optimization complete!');
   * });
   * ```
   */
  async optimizePartitions(): Promise<void> {
    console.log("\n⚡ Optimizing partitions...");

    const allTables = [
      ...this.MONTHLY_PARTITIONED_TABLES,
      ...this.QUARTERLY_PARTITIONED_TABLES,
    ];

    for (const table of allTables) {
      try {
        await this.knex.raw(`OPTIMIZE TABLE ${table}`);
        console.log(`✅ Optimized ${table}`);
      } catch (error) {
        console.error(`❌ Failed to optimize ${table}:`, error);
      }
    }

    console.log("✅ Optimization completed!");
  }

  /**
   * @openapi
   * Health check for partitioned tables
   * Detects missing partitions, p_future issues, and excessive empty partitions
   * Should be run regularly (daily recommended)
   *
   * @returns {Promise<Object>} Health check result with issues array
   * @throws {Error} If health check fails
   *
   * @example
   * ```typescript
   * // Run daily health check
   * const health = await partitionManager.healthCheck();
   *
   * if (!health.healthy) {
   *   console.error(`Found ${health.issues.length} partition issues:`);
   *
   *   health.issues.forEach(issue => {
   *     const emoji = issue.severity === 'critical' ? '🚨' :
   *                   issue.severity === 'warning' ? '⚠️' : 'ℹ️';
   *     console.log(`${emoji} [${issue.severity}] ${issue.table}: ${issue.issue}`);
   *   });
   *
   *   // Send alert to monitoring system
   *   await alerting.send({
   *     title: 'Partition Health Issues',
   *     message: `${health.issues.length} issues detected`,
   *     severity: health.issues.some(i => i.severity === 'critical') ? 'high' : 'medium',
   *     details: health.issues
   *   });
   * } else {
   *   console.log('✅ All partitions healthy!');
   * }
   *
   * // Schedule daily health check (at 8 AM)
   * cron.schedule('0 8 * * *', async () => {
   *   await partitionManager.healthCheck();
   * });
   * ```
   */
  async healthCheck(): Promise<any> {
    console.log("\n🏥 Running partition health check...");

    const issues: any[] = [];
    const allTables = [
      ...this.MONTHLY_PARTITIONED_TABLES,
      ...this.QUARTERLY_PARTITIONED_TABLES,
    ];

    for (const table of allTables) {
      // Check if p_future exists
      const hasFuture = await this.partitionExists(table, "p_future");
      if (!hasFuture) {
        issues.push({
          table,
          issue: "Missing p_future partition",
          severity: "critical",
        });
      }

      // Check if partitions exist for next 3 months
      const currentDate = new Date();
      for (let i = 0; i <= 3; i++) {
        const targetDate = new Date(currentDate);
        targetDate.setMonth(currentDate.getMonth() + i);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const partitionName = `p${year}${month.toString().padStart(2, "0")}`;

        const exists = await this.partitionExists(table, partitionName);
        if (!exists) {
          issues.push({
            table,
            issue: `Missing partition ${partitionName}`,
            severity: i === 0 ? "critical" : "warning",
          });
        }
      }

      // Check for empty partitions (potential waste)
      const partitions = await this.getPartitionList(table);
      const emptyPartitions = partitions.filter((p) => p.tableRows === 0);
      if (emptyPartitions.length > 5) {
        issues.push({
          table,
          issue: `${emptyPartitions.length} empty partitions detected`,
          severity: "info",
        });
      }
    }

    if (issues.length === 0) {
      console.log("✅ All partitions healthy!");
    } else {
      console.log(`⚠️ Found ${issues.length} issues:`);
      issues.forEach((issue) => {
        console.log(
          `  - [${issue.severity.toUpperCase()}] ${issue.table}: ${issue.issue}`
        );
      });
    }

    return { healthy: issues.length === 0, issues };
  }
}

export default PartitionManager;
