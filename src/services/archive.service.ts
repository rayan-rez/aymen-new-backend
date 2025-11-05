// src/services/ArchivalService.ts
import { Knex } from "knex";

/**
 * ArchivalService - Manages data archival for analytics tables
 * 
 * ARCHIVAL POLICY:
 * - Data older than 6 months → Archive tables
 * - Archive retention: 2 years
 * - Data older than 2 years → Purged
 * 
 * PROCESS:
 * 1. Identify records older than cutoff date
 * 2. Copy to archive table in batches
 * 3. Verify copy success
 * 4. Delete from active table
 * 5. Log metadata
 * 
 * USAGE:
 * - Run as scheduled job (cron/task scheduler)
 * - Recommended: Run monthly during low-traffic hours
 * - Monitor archive_metadata table for status
 */

interface ArchivalConfig {
  tableName: string;
  archiveTableName: string;
  dateColumn: string;
  batchSize: number;
  cutoffMonths: number;
}

interface ArchivalResult {
  success: boolean;
  recordsArchived: number;
  durationSeconds: number;
  error?: string;
}

export class ArchivalService {
  private knex: Knex;

  // Archival configurations for each table
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

  constructor(knex: Knex) {
    this.knex = knex;
  }

  /**
   * Archive all tables according to configuration
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
   * Archive a single table
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
      const [{ count:_count }] = await this.knex(config.tableName)
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
          const progress = Math.min(100, Number(((totalArchived / count) * 100).toFixed(1)));
          process.stdout.write(`\r📈 Progress: ${progress}% (${totalArchived}/${count} records)`);
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
   * Purge archived data older than retention period
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
   * Log archival metadata
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
   * Get archival statistics
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
   * Verify archive integrity
   * Checks if archived records match source records
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

      console.log(`✅ Integrity verified: Sample of ${archivedIds.length} records OK`);
      return true;
    } catch (error) {
      console.error("❌ Integrity check failed:", error);
      return false;
    }
  }

  /**
   * Get disk space savings report
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
      const [activeSize] = await this.knex.raw(`
        SELECT 
          table_name,
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
        FROM information_schema.TABLES
        WHERE table_schema = DATABASE()
        AND table_name = ?
      `, [table]);

      const [archiveSize] = await this.knex.raw(`
        SELECT 
          table_name,
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
        FROM information_schema.TABLES
        WHERE table_schema = DATABASE()
        AND table_name = ?
      `, [`${table}_archive`]);

      report.push({
        table: table,
        active_size_mb: activeSize[0]?.size_mb || 0,
        archive_size_mb: archiveSize[0]?.size_mb || 0,
        total_size_mb: (activeSize[0]?.size_mb || 0) + (archiveSize[0]?.size_mb || 0),
      });
    }

    return report;
  }
}

export default ArchivalService;