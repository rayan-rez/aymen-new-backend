/**
 * ArchivalService - Manages data archival for analytics tables
 * 
 * @module services/archive
 * 
 * @swagger
 * components:
 *   schemas:
 *     ArchivalConfig:
 *       type: object
 *       required:
 *         - tableName
 *         - archiveTableName
 *         - dateColumn
 *         - batchSize
 *         - cutoffMonths
 *       properties:
 *         tableName:
 *           type: string
 *           description: Name of the active table to archive
 *           example: "page_views"
 *         archiveTableName:
 *           type: string
 *           description: Name of the archive table
 *           example: "page_views_archive"
 *         dateColumn:
 *           type: string
 *           description: Column name used for date-based archival
 *           example: "viewed_at"
 *         batchSize:
 *           type: integer
 *           minimum: 100
 *           maximum: 50000
 *           description: Number of records to process in each batch
 *           example: 10000
 *         cutoffMonths:
 *           type: integer
 *           minimum: 1
 *           maximum: 24
 *           description: Age in months after which data should be archived
 *           example: 6
 * 
 *     ArchivalResult:
 *       type: object
 *       required:
 *         - success
 *         - recordsArchived
 *         - durationSeconds
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the archival operation completed successfully
 *           example: true
 *         recordsArchived:
 *           type: integer
 *           description: Total number of records archived
 *           example: 15420
 *         durationSeconds:
 *           type: integer
 *           description: Time taken to complete archival in seconds
 *           example: 127
 *         error:
 *           type: string
 *           description: Error message if archival failed
 *           example: "Failed at offset 10000: Connection timeout"
 * 
 *     ArchivalMetadata:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique metadata record ID
 *           example: 1
 *         tableName:
 *           type: string
 *           description: Table that was archived
 *           example: "page_views"
 *         archiveDate:
 *           type: string
 *           format: date-time
 *           description: Cutoff date for archived records
 *           example: "2024-05-05T00:00:00.000Z"
 *         recordsArchived:
 *           type: integer
 *           description: Number of records archived in this run
 *           example: 15420
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: When archival started
 *           example: "2025-11-05T10:30:00.000Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: When archival completed
 *           example: "2025-11-05T10:32:07.000Z"
 *         durationSeconds:
 *           type: integer
 *           description: Total duration in seconds
 *           example: 127
 *         status:
 *           type: string
 *           enum: [success, failed, partial]
 *           description: Archival operation status
 *           example: "success"
 *         errorMessage:
 *           type: string
 *           nullable: true
 *           description: Error details if operation failed
 *           example: null
 * 
 *     ArchivalStats:
 *       type: object
 *       properties:
 *         tableName:
 *           type: string
 *           description: Table name
 *           example: "page_views"
 *         totalArchived:
 *           type: integer
 *           description: Total records archived across all runs
 *           example: 125340
 *         avgDuration:
 *           type: number
 *           format: double
 *           description: Average duration in seconds
 *           example: 142.5
 *         lastArchiveDate:
 *           type: string
 *           format: date-time
 *           description: Most recent archive cutoff date
 *           example: "2024-05-05T00:00:00.000Z"
 *         archiveRuns:
 *           type: integer
 *           description: Total number of archival runs
 *           example: 8
 * 
 *     IntegrityCheckResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether integrity check passed
 *           example: true
 *         message:
 *           type: string
 *           description: Result message
 *           example: "Integrity verified: Sample of 100 records OK"
 *         tableName:
 *           type: string
 *           description: Table that was verified
 *           example: "page_views"
 *         sampleSize:
 *           type: integer
 *           description: Number of records sampled
 *           example: 100
 *         issuesFound:
 *           type: integer
 *           description: Number of integrity issues found
 *           example: 0
 * 
 *     DiskSpaceReport:
 *       type: object
 *       properties:
 *         table:
 *           type: string
 *           description: Table name
 *           example: "page_views"
 *         activeSizeMb:
 *           type: number
 *           format: double
 *           description: Active table size in megabytes
 *           example: 245.67
 *         archiveSizeMb:
 *           type: number
 *           format: double
 *           description: Archive table size in megabytes
 *           example: 1823.45
 *         totalSizeMb:
 *           type: number
 *           format: double
 *           description: Combined size in megabytes
 *           example: 2069.12
 * 
 *     PurgeResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether purge completed successfully
 *           example: true
 *         tablesPurged:
 *           type: integer
 *           description: Number of archive tables purged
 *           example: 4
 *         totalRecordsDeleted:
 *           type: integer
 *           description: Total records deleted across all tables
 *           example: 45320
 *         retentionYears:
 *           type: integer
 *           description: Retention period used
 *           example: 2
 * 
 *     ArchivalJobRequest:
 *       type: object
 *       properties:
 *         tables:
 *           type: array
 *           items:
 *             type: string
 *           description: Specific tables to archive (empty for all)
 *           example: ["page_views", "user_events"]
 *         dryRun:
 *           type: boolean
 *           default: false
 *           description: Perform dry run without actual archival
 *           example: false
 * 
 *     ArchivalJobResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Archival process completed successfully"
 *         data:
 *           type: object
 *           properties:
 *             results:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ArchivalResult'
 *             totalRecordsArchived:
 *               type: integer
 *               example: 45320
 *             totalDurationSeconds:
 *               type: integer
 *               example: 456
 *         timestamp:
 *           type: string
 *           format: date-time
 * 
 *   examples:
 *     SuccessfulArchivalExample:
 *       summary: Successful archival operation
 *       value:
 *         success: true
 *         recordsArchived: 15420
 *         durationSeconds: 127
 * 
 *     FailedArchivalExample:
 *       summary: Failed archival operation
 *       value:
 *         success: false
 *         recordsArchived: 8500
 *         durationSeconds: 65
 *         error: "Failed at offset 10000: Connection timeout"
 * 
 *     ArchivalConfigExample:
 *       summary: Standard archival configuration
 *       value:
 *         tableName: "page_views"
 *         archiveTableName: "page_views_archive"
 *         dateColumn: "viewed_at"
 *         batchSize: 10000
 *         cutoffMonths: 6
 * 
 *     ArchivalStatsExample:
 *       summary: Archival statistics
 *       value:
 *         tableName: "page_views"
 *         totalArchived: 125340
 *         avgDuration: 142.5
 *         lastArchiveDate: "2024-05-05T00:00:00.000Z"
 *         archiveRuns: 8
 * 
 *     DiskSpaceReportExample:
 *       summary: Disk space savings report
 *       value:
 *         - table: "page_views"
 *           activeSizeMb: 245.67
 *           archiveSizeMb: 1823.45
 *           totalSizeMb: 2069.12
 *         - table: "user_events"
 *           activeSizeMb: 156.23
 *           archiveSizeMb: 987.54
 *           totalSizeMb: 1143.77
 * 
 * Features:
 * - Automated data archival based on age
 * - Batch processing for large datasets
 * - Transaction-safe operations
 * - Progress tracking and reporting
 * - Archive integrity verification
 * - Configurable retention policies
 * - Disk space savings analysis
 * - Comprehensive logging and metadata
 * - Purge old archives automatically
 * - Multiple table support
 * - Error recovery with partial success tracking
 * 
 * Archival Policy:
 * - **Active Data**: Recent records (default: last 6 months)
 * - **Archive Data**: Older records (6 months to 2 years)
 * - **Purged Data**: Very old records (older than 2 years)
 * 
 * Process Flow:
 * 1. Identify records older than cutoff date
 * 2. Copy to archive table in batches
 * 3. Verify copy success with transaction
 * 4. Delete from active table
 * 5. Log metadata for auditing
 * 6. Track progress and performance
 * 
 * Recommended Usage:
 * - Run as scheduled job (cron/task scheduler)
 * - Execute monthly during low-traffic hours
 * - Monitor archive_metadata table for status
 * - Verify integrity after major archival operations
 * 
 * Tables Managed:
 * - page_views → page_views_archive
 * - user_events → user_events_archive
 * - property_interactions → property_interactions_archive
 * - event_analytics → event_analytics_archive
 * 
 * @example
 * ```typescript
 * // Initialize service
 * const archivalService = new ArchivalService(knex);
 * 
 * // Archive all tables
 * await archivalService.archiveAllTables();
 * 
 * // Archive specific table
 * const result = await archivalService.archiveTable({
 *   tableName: "page_views",
 *   archiveTableName: "page_views_archive",
 *   dateColumn: "viewed_at",
 *   batchSize: 10000,
 *   cutoffMonths: 6
 * });
 * 
 * // Purge old archives
 * await archivalService.purgeOldArchives(2);
 * 
 * // Verify integrity
 * const isValid = await archivalService.verifyArchiveIntegrity(
 *   "page_views",
 *   "page_views_archive"
 * );
 * 
 * // Get statistics
 * const stats = await archivalService.getArchivalStats();
 * const diskReport = await archivalService.getDiskSpaceSavings();
 * ```
 */

import { Knex } from "knex";

/**
 * @openapi
 * Archival configuration interface
 * Defines settings for table archival operations
 * 
 * @interface ArchivalConfig
 */
interface ArchivalConfig {
  tableName: string;
  archiveTableName: string;
  dateColumn: string;
  batchSize: number;
  cutoffMonths: number;
}

/**
 * @openapi
 * Archival operation result
 * Contains metrics and status of archival process
 * 
 * @interface ArchivalResult
 */
interface ArchivalResult {
  success: boolean;
  recordsArchived: number;
  durationSeconds: number;
  error?: string;
}

/**
 * @openapi
 * ArchivalService class
 * Manages automated data archival for analytics and logging tables
 * 
 * @class ArchivalService
 */
export class ArchivalService {
  private knex: Knex;

  /**
   * @openapi
   * Archival configurations for each table
   * Defines which tables to archive and their settings
   * 
   * @private
   * @readonly
   */
  private readonly ARCHIVAL_CONFIGS: ArchivalConfig[] = [
    {
      tableName: "page_views",
      archiveTableName: "page_views_archive",
      dateColumn: "viewed_at",
      batchSize: 10000,
      cutoffMonths: 6,
    },
    {
      tableName: "user_events",
      archiveTableName: "user_events_archive",
      dateColumn: "event_ts",
      batchSize: 10000,
      cutoffMonths: 6,
    },
    {
      tableName: "property_interactions",
      archiveTableName: "property_interactions_archive",
      dateColumn: "interaction_ts",
      batchSize: 10000,
      cutoffMonths: 6,
    },
    {
      tableName: "event_analytics",
      archiveTableName: "event_analytics_archive",
      dateColumn: "event_ts",
      batchSize: 10000,
      cutoffMonths: 6,
    },
  ];

  /**
   * @openapi
   * Initializes the Archival Service
   * 
   * @constructor
   * @param {Knex} knex - Knex database connection instance
   * 
   * @example
   * ```typescript
   * import knex from './config/database';
   * const archivalService = new ArchivalService(knex);
   * ```
   */
  constructor(knex: Knex) {
    this.knex = knex;
  }

  /**
   * @openapi
   * Archive all tables according to configuration
   * Processes each configured table sequentially
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * ```typescript
   * // Run complete archival process
   * await archivalService.archiveAllTables();
   * 
   * // Typical output:
   * // 🗄️ Starting archival process for all tables...
   * // 📦 Archiving page_views...
   * // ✅ page_views: Archived 15420 records in 127s
   * // 📦 Archiving user_events...
   * // ✅ user_events: Archived 8934 records in 89s
   * // ✅ Archival process completed!
   * ```
   */
  async archiveAllTables(): Promise<void> {
    console.log("🗄️ Starting archival process for all tables...");

    for (const config of this.ARCHIVAL_CONFIGS) {
      try {
        console.log(`\n📦 Archiving ${config.tableName}...`);
        const result = await this.archiveTable(config);

        if (result.success) {
          console.log(
            `✅ ${config.tableName}: Archived ${result.recordsArchived} records in ${result.durationSeconds}s`
          );
        } else {
          console.error(
            `❌ ${config.tableName}: Archival failed - ${result.error}`
          );
        }
      } catch (error) {
        console.error(`❌ ${config.tableName}: Unexpected error`, error);
      }
    }

    console.log("\n✅ Archival process completed!");
  }

  /**
   * @openapi
   * Archive a single table
   * Moves old records to archive table in batches with transaction safety
   * 
   * @param {ArchivalConfig} config - Archival configuration
   * @returns {Promise<ArchivalResult>} Operation result with metrics
   * 
   * @example
   * ```typescript
   * // Archive specific table
   * const result = await archivalService.archiveTable({
   *   tableName: "page_views",
   *   archiveTableName: "page_views_archive",
   *   dateColumn: "viewed_at",
   *   batchSize: 10000,
   *   cutoffMonths: 6
   * });
   * 
   * if (result.success) {
   *   console.log(`Archived ${result.recordsArchived} records`);
   * }
   * ```
   */
  async archiveTable(config: ArchivalConfig): Promise<ArchivalResult> {
    const startTime = Date.now();
    let totalArchived = 0;
    let status: "success" | "failed" | "partial" = "success";
    let errorMessage: string | undefined;

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - config.cutoffMonths);

      // Count records to archive
      const [{ count: _count }] = await this.knex(config.tableName)
        .where(config.dateColumn, "<", cutoffDate)
        .count("* as count");

      const count = Number(_count);
      if (count === 0) {
        console.log(`ℹ️ No records to archive for ${config.tableName}`);
        return {
          success: true,
          recordsArchived: 0,
          durationSeconds: 0,
        };
      }

      console.log(`📊 Found ${count} records to archive`);

      // Archive in batches
      let offset = 0;
      while (offset < count) {
        const trx = await this.knex.transaction();

        try {
          // Fetch batch
          const records = await trx(config.tableName)
            .where(config.dateColumn, "<", cutoffDate)
            .orderBy("id")
            .limit(config.batchSize)
            .offset(offset);

          if (records.length === 0) break;

          // Insert into archive table
          await trx(config.archiveTableName).insert(
            records.map((record) => ({
              ...record,
              archived_at: new Date(),
            }))
          );

          // Delete from active table
          const recordIds = records.map((r) => r.id);
          await trx(config.tableName).whereIn("id", recordIds).delete();

          await trx.commit();

          totalArchived += records.length;
          offset += config.batchSize;

          // Progress indicator
          const progress = Math.min(
            100,
            Number(((totalArchived / count) * 100).toFixed(1))
          );
          process.stdout.write(
            `\r📈 Progress: ${progress}% (${totalArchived}/${count} records)`
          );
        } catch (error) {
          await trx.rollback();
          console.error(`\n❌ Batch failed at offset ${offset}:`, error);
          status = "partial";
          errorMessage = `Failed at offset ${offset}: ${error}`;
          break;
        }
      }

      console.log(); // New line after progress

      const durationSeconds = Math.round((Date.now() - startTime) / 1000);

      // Log metadata
      await this.logArchivalMetadata({
        tableName: config.tableName,
        archiveDate: cutoffDate,
        recordsArchived: totalArchived,
        startTime: new Date(startTime),
        endTime: new Date(),
        durationSeconds,
        status,
        errorMessage,
      });

      return {
        success: status === "success",
        recordsArchived: totalArchived,
        durationSeconds,
        error: errorMessage,
      };
    } catch (error) {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      errorMessage = error instanceof Error ? error.message : String(error);

      await this.logArchivalMetadata({
        tableName: config.tableName,
        archiveDate: new Date(),
        recordsArchived: totalArchived,
        startTime: new Date(startTime),
        endTime: new Date(),
        durationSeconds,
        status: "failed",
        errorMessage,
      });

      return {
        success: false,
        recordsArchived: totalArchived,
        durationSeconds,
        error: errorMessage,
      };
    }
  }

  /**
   * @openapi
   * Purge archived data older than retention period
   * Permanently deletes very old archived records
   * 
   * @param {number} [retentionYears=2] - Number of years to retain archives
   * @returns {Promise<void>}
   * 
   * @example
   * ```typescript
   * // Purge archives older than 2 years (default)
   * await archivalService.purgeOldArchives();
   * 
   * // Purge archives older than 3 years
   * await archivalService.purgeOldArchives(3);
   * 
   * // Typical output:
   * // 🗑️ Purging archives older than 2 years...
   * // ✅ page_views_archive: Purged 5420 old records
   * // ✅ user_events_archive: Purged 3210 old records
   * // ✅ Purge completed!
   * ```
   */
  async purgeOldArchives(retentionYears: number = 2): Promise<void> {
    console.log(`\n🗑️ Purging archives older than ${retentionYears} years...`);

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

    const archiveTables = [
      "page_views_archive",
      "user_events_archive",
      "property_interactions_archive",
      "event_analytics_archive",
    ];

    for (const table of archiveTables) {
      try {
        const deleted = await this.knex(table)
          .where("archived_at", "<", cutoffDate)
          .delete();

        console.log(`✅ ${table}: Purged ${deleted} old records`);
      } catch (error) {
        console.error(`❌ ${table}: Purge failed`, error);
      }
    }

    console.log("✅ Purge completed!");
  }

  /**
   * @openapi
   * Log archival metadata
   * Records archival operation details for auditing and monitoring
   * 
   * @private
   * @param {Object} metadata - Archival metadata
   * @returns {Promise<void>}
   */
  private async logArchivalMetadata(metadata: {
    tableName: string;
    archiveDate: Date;
    recordsArchived: number;
    startTime: Date;
    endTime: Date;
    durationSeconds: number;
    status: "success" | "failed" | "partial";
    errorMessage?: string;
  }): Promise<void> {
    await this.knex("archive_metadata").insert({
      table_name: metadata.tableName,
      archive_date: metadata.archiveDate,
      records_archived: metadata.recordsArchived,
      started_at: metadata.startTime,
      completed_at: metadata.endTime,
      duration_seconds: metadata.durationSeconds,
      status: metadata.status,
      error_message: metadata.errorMessage || null,
    });
  }

  /**
   * @openapi
   * Get archival statistics
   * Returns aggregated metrics for all archival operations
   * 
   * @returns {Promise<any>} Archival statistics by table
   * 
   * @example
   * ```typescript
   * const stats = await archivalService.getArchivalStats();
   * 
   * // Example output:
   * // [
   * //   {
   * //     tableName: "page_views",
   * //     totalArchived: 125340,
   * //     avgDuration: 142.5,
   * //     lastArchiveDate: "2024-05-05T00:00:00.000Z",
   * //     archiveRuns: 8
   * //   },
   * //   ...
   * // ]
   * ```
   */
  async getArchivalStats(): Promise<any> {
    const stats = await this.knex("archive_metadata")
      .select("table_name")
      .sum("records_archived as total_archived")
      .avg("duration_seconds as avg_duration")
      .max("archive_date as last_archive_date")
      .count("* as archive_runs")
      .groupBy("table_name");

    return stats;
  }

  /**
   * @openapi
   * Verify archive integrity
   * Checks if archived records match source records
   * 
   * @param {string} tableName - Active table name
   * @param {string} archiveTableName - Archive table name
   * @param {number} [sampleSize=100] - Number of records to sample
   * @returns {Promise<boolean>} True if integrity check passes
   * 
   * @example
   * ```typescript
   * // Verify archive integrity with default sample
   * const isValid = await archivalService.verifyArchiveIntegrity(
   *   "page_views",
   *   "page_views_archive"
   * );
   * 
   * if (isValid) {
   *   console.log("Archive integrity verified");
   * }
   * 
   * // Check larger sample
   * const isValid = await archivalService.verifyArchiveIntegrity(
   *   "page_views",
   *   "page_views_archive",
   *   500
   * );
   * ```
   */
  async verifyArchiveIntegrity(
    tableName: string,
    archiveTableName: string,
    sampleSize: number = 100
  ): Promise<boolean> {
    console.log(`\n🔍 Verifying archive integrity for ${tableName}...`);

    try {
      // Get sample of archived IDs
      const archivedRecords = await this.knex(archiveTableName)
        .select("id")
        .orderByRaw("RAND()")
        .limit(sampleSize);

      if (archivedRecords.length === 0) {
        console.log("ℹ️ No archived records to verify");
        return true;
      }

      const archivedIds = archivedRecords.map((r) => r.id);

      // Check if these IDs still exist in active table
      const stillInActive = await this.knex(tableName)
        .whereIn("id", archivedIds)
        .count("* as count");

      if (Number(stillInActive[0].count) > 0) {
        console.error(
          `❌ Integrity check failed: ${stillInActive[0].count} records still in active table`
        );
        return false;
      }

      console.log(
        `✅ Integrity verified: Sample of ${archivedIds.length} records OK`
      );
      return true;
    } catch (error) {
      console.error("❌ Integrity check failed:", error);
      return false;
    }
  }

  /**
   * @openapi
   * Get disk space savings report
   * Analyzes table sizes to show archival efficiency
   * 
   * @returns {Promise<any>} Disk space report for all tables
   * 
   * @example
   * ```typescript
   * const report = await archivalService.getDiskSpaceSavings();
   * 
   * // Example output:
   * // [
   * //   {
   * //     table: "page_views",
   * //     active_size_mb: 245.67,
   * //     archive_size_mb: 1823.45,
   * //     total_size_mb: 2069.12
   * //   },
   * //   {
   * //     table: "user_events",
   * //     active_size_mb: 156.23,
   * //     archive_size_mb: 987.54,
   * //     total_size_mb: 1143.77
   * //   }
   * // ]
   * 
   * console.table(report);
   * ```
   */
  async getDiskSpaceSavings(): Promise<any> {
    const tables = [
      "page_views",
      "user_events",
      "property_interactions",
      "event_analytics",
    ];

    const report: any[] = [];

    for (const table of tables) {
      const [activeSize] = await this.knex.raw(
        `
        SELECT 
          table_name,
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
        FROM information_schema.TABLES
        WHERE table_schema = DATABASE()
        AND table_name = ?
      `,
        [table]
      );

      const [archiveSize] = await this.knex.raw(
        `
        SELECT 
          table_name,
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
        FROM information_schema.TABLES
        WHERE table_schema = DATABASE()
        AND table_name = ?
      `,
        [`${table}_archive`]
      );

      report.push({
        table: table,
        active_size_mb: activeSize[0]?.size_mb || 0,
        archive_size_mb: archiveSize[0]?.size_mb || 0,
        total_size_mb:
          (activeSize[0]?.size_mb || 0) + (archiveSize[0]?.size_mb || 0),
      });
    }

    return report;
  }
}

export default ArchivalService;