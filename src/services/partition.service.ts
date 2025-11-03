// src/services/partition.service.ts
import { Knex } from "knex";

/**
 * PartitionManager - Automated partition management
 * 
 * Automatically creates future partitions and drops old ones.
 * Prevents "no partition for value" errors and manages disk space.
 * 
 * FEATURES:
 * - Auto-create future partitions (3 months ahead)
 * - Drop partitions older than retention period
 * - Partition health monitoring
 * - Size and row count reporting
 * 
 * USAGE:
 * Run as scheduled job (monthly recommended)
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

export class PartitionManager {
  private knex: Knex;

  // Tables with monthly partitioning
  private readonly MONTHLY_PARTITIONED_TABLES = [
    "page_views",
    "user_events",
    "event_analytics",
  ];

  // Tables with quarterly partitioning
  private readonly QUARTERLY_PARTITIONED_TABLES = ["property_interactions"];

  constructor(knex: Knex) {
    this.knex = knex;
  }

  /**
   * Create future partitions for all partitioned tables
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
   * Create monthly partitions
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
        console.log(`ℹ️ Partition ${partitionName} already exists for ${tableName}`);
      }
    }
  }

  /**
   * Create quarterly partitions
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
   * Drop old partitions
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
   * Check if a partition exists
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
   * Get list of partitions for a table
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
   * Determine if partition should be dropped
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
   * Get partition statistics
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
   * Optimize all partitions
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
   * Health check for partitioned tables
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