// src/scripts/archive-data.ts
import knex from "../src/config/database";
import ArchivalService from "../src/services/archive.service";

/**
 * CLI Script: Data Archival
 * 
 * Usage:
 *   npm run archive:all          - Archive all tables
 *   npm run archive:table page_views - Archive specific table
 *   npm run archive:purge        - Purge old archives (2+ years)
 *   npm run archive:verify       - Verify archive integrity
 *   npm run archive:stats        - Show archival statistics
 */

const archivalService = new ArchivalService(knex);

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case "all":
        console.log("🚀 Starting full archival process...\n");
        await archivalService.archiveAllTables();
        break;

      case "table":
        if (!arg) {
          console.error("❌ Please specify table name");
          console.log("Usage: npm run archive:table <table_name>");
          process.exit(1);
        }
        console.log(`🚀 Archiving ${arg}...\n`);
        const config = {
          tableName: arg,
          archiveTableName: `${arg}_archive`,
          dateColumn: getDateColumn(arg),
          batchSize: 10000,
          cutoffMonths: 6,
        };
        await archivalService.archiveTable(config);
        break;

      case "purge":
        const years = arg ? parseInt(arg) : 2;
        console.log(`🚀 Purging archives older than ${years} years...\n`);
        await archivalService.purgeOldArchives(years);
        break;

      case "verify":
        console.log("🚀 Verifying archive integrity...\n");
        const tables = [
          { active: "page_views", archive: "page_views_archive" },
          { active: "user_events", archive: "user_events_archive" },
          { active: "property_interactions", archive: "property_interactions_archive" },
          { active: "event_analytics", archive: "event_analytics_archive" },
        ];
        
        for (const table of tables) {
          await archivalService.verifyArchiveIntegrity(
            table.active,
            table.archive,
            100
          );
        }
        break;

      case "stats":
        console.log("📊 Fetching archival statistics...\n");
        const stats = await archivalService.getArchivalStats();
        console.table(stats);
        
        console.log("\n💾 Disk space report:\n");
        const diskReport = await archivalService.getDiskSpaceSavings();
        console.table(diskReport);
        break;

      default:
        console.log("📚 Available commands:");
        console.log("  npm run archive:all          - Archive all tables");
        console.log("  npm run archive:table <name> - Archive specific table");
        console.log("  npm run archive:purge [years]- Purge old archives (default: 2 years)");
        console.log("  npm run archive:verify       - Verify archive integrity");
        console.log("  npm run archive:stats        - Show statistics");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

function getDateColumn(tableName: string): string {
  const mapping: { [key: string]: string } = {
    page_views: "viewed_at",
    user_events: "event_ts",
    property_interactions: "interaction_ts",
    event_analytics: "event_ts",
  };
  return mapping[tableName] || "created_at";
}

main();