import { Knex } from "knex";

/**
 * Seeder Helper Utilities
 * Shared functions for all seeders to reduce duplication
 */

export interface MigrationStats {
  total: number;
  inserted: number;
  skipped: number;
  failed: number;
}

export class SeederHelper {
  /**
   * Create or get mapping table for ID translation
   */
  static async ensureMappingTable(
    trx: Knex.Transaction,
    tableName: string
  ): Promise<void> {
    await trx.raw(`
      CREATE TEMPORARY TABLE IF NOT EXISTS ${tableName} (
        old_id INT PRIMARY KEY,
        new_id INT,
        INDEX idx_new_id (new_id)
      )
    `);
  }

  /**
   * Get ID mapping from temporary table
   */
  static async getMapping(
    trx: Knex.Transaction,
    tableName: string
  ): Promise<Map<number, number>> {
    const mapping = new Map<number, number>();
    try {
      const rows = await trx.raw(`SELECT old_id, new_id FROM ${tableName}`);
      const data = rows[0] || [];
      data.forEach((row: any) => {
        mapping.set(row.old_id, row.new_id);
      });
    } catch (error) {
      console.warn(`  ⚠️  Mapping table ${tableName} not found`);
    }
    return mapping;
  }

  /**
   * Store ID mapping in temporary table
   */
  static async storeMapping(
    trx: Knex.Transaction,
    tableName: string,
    mapping: Map<number, number>
  ): Promise<void> {
    await this.ensureMappingTable(trx, tableName);

    // Batch insert for better performance
    const batch = Array.from(mapping.entries()).map(([oldId, newId]) => ({
      old_id: oldId,
      new_id: newId,
    }));

    if (batch.length > 0) {
      // Insert in chunks of 1000
      for (let i = 0; i < batch.length; i += 1000) {
        const chunk = batch.slice(i, i + 1000);
        await trx.raw(
          `INSERT IGNORE INTO ${tableName} (old_id, new_id) VALUES ${chunk
            .map(() => "(?, ?)")
            .join(", ")}`,
          chunk.flatMap((item) => [item.old_id, item.new_id])
        );
      }
    }
  }

  /**
   * Generate URL-safe slug from text
   */
  static generateSlug(text: string, fallback?: string): string {
    if (!text) return fallback || "item";

    return (
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 200) ||
      fallback ||
      "item"
    );
  }

  /**
   * Log migration progress
   */
  static logProgress(
    entityName: string,
    stats: MigrationStats,
    emoji: string = "📦"
  ): void {
    console.log(`\n${emoji} ${entityName} Migration Summary:`);
    console.log(`  • Total: ${stats.total}`);
    console.log(`  ✓ Inserted: ${stats.inserted}`);
    if (stats.skipped > 0) {
      console.log(`  ⚠️  Skipped: ${stats.skipped}`);
    }
    if (stats.failed > 0) {
      console.log(`  ❌ Failed: ${stats.failed}`);
    }
  }

  /**
   * Check if table exists
   */
  static async tableExists(knex: Knex, tableName: string): Promise<boolean> {
    try {
      const result = await knex.raw(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = ?`,
        [tableName]
      );
      return result[0][0].count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clear table with CASCADE handling
   */
  static async clearTable(
    trx: Knex.Transaction,
    tableName: string
  ): Promise<void> {
    try {
      // Disable FK checks temporarily for cleanup
      await trx.raw("SET FOREIGN_KEY_CHECKS = 0");
      await trx(tableName).del();
      await trx.raw("SET FOREIGN_KEY_CHECKS = 1");
    } catch (error) {
      console.warn(`  ⚠️  Could not clear table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Parse JSON safely
   */
  static safeJsonParse<T = any>(json: string | null, defaultValue: T): T {
    if (!json) return defaultValue;
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Validate required environment variables
   */
  static validateLegacyDbConfig(): void {
    const required = ["OLD_DB_HOST", "OLD_DB_USER", "OLD_DB_NAME"];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing legacy database configuration: ${missing.join(", ")}\n` +
          `Please set these environment variables before running seeds.`
      );
    }
  }

  /**
   * Clean up temporary tables
   */
  static async cleanupTempTables(trx: Knex.Transaction): Promise<void> {
    const tempTables = [
      "temp_location_mapping",
      "temp_feature_mapping",
      "temp_project_mapping",
      "temp_apartment_mapping",
      "temp_blog_post_mapping",
      "temp_commercial_property_mapping",
    ];

    for (const table of tempTables) {
      try {
        await trx.raw(`DROP TEMPORARY TABLE IF EXISTS ${table}`);
      } catch {
        // Ignore errors - table might not exist
      }
    }
  }
}

export default SeederHelper;
