// src/scripts/manage-partitions.ts
import knex from "../src/config/database";
import PartitionManager from "../src/services/partition.service";

/**
 * CLI Script: Partition Management
 * 
 * Usage:
 *   npm run partition:create     - Create future partitions (3 months ahead)
 *   npm run partition:drop       - Drop old partitions (12+ months old)
 *   npm run partition:stats      - Show partition statistics
 *   npm run partition:health     - Run health check
 *   npm run partition:optimize   - Optimize all partitions
 */

const partitionManager = new PartitionManager(knex);

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case "create":
        const monthsAhead = arg ? parseInt(arg) : 3;
        console.log(`🔮 Creating partitions ${monthsAhead} months ahead...\n`);
        await partitionManager.createFuturePartitions(monthsAhead);
        break;

      case "drop":
        const retentionMonths = arg ? parseInt(arg) : 12;
        console.log(`🗑️ Dropping partitions older than ${retentionMonths} months...\n`);
        await partitionManager.dropOldPartitions(retentionMonths);
        break;

      case "stats":
        console.log("📊 Fetching partition statistics...\n");
        const stats = await partitionManager.getPartitionStats();
        
        stats.forEach((tableStat: any) => {
          console.log(`\n📋 ${tableStat.table}`);
          console.log(`   Partitions: ${tableStat.partitionCount}`);
          console.log(`   Total Rows: ${tableStat.totalRows.toLocaleString()}`);
          console.log(`   Total Size: ${tableStat.totalSizeMB} MB`);
          
          if (tableStat.partitions.length <= 10) {
            console.log("   Partition Details:");
            tableStat.partitions.forEach((p: any) => {
              console.log(`     - ${p.name}: ${p.rows.toLocaleString()} rows, ${p.sizeMB} MB`);
            });
          } else {
            console.log(`   (${tableStat.partitions.length} partitions - use 'partition:stats --verbose' for details)`);
          }
        });
        break;

      case "health":
        console.log("🏥 Running partition health check...\n");
        const health = await partitionManager.healthCheck();
        
        if (!health.healthy) {
          console.log("\n⚠️ Recommendations:");
          health.issues
            .filter((i: any) => i.severity === "critical")
            .forEach((issue: any) => {
              console.log(`  🔴 ${issue.table}: ${issue.issue}`);
            });
          health.issues
            .filter((i: any) => i.severity === "warning")
            .forEach((issue: any) => {
              console.log(`  🟡 ${issue.table}: ${issue.issue}`);
            });
        }
        break;

      case "optimize":
        console.log("⚡ Optimizing partitions...\n");
        await partitionManager.optimizePartitions();
        break;

      case "auto-maintain":
        console.log("🤖 Running automatic partition maintenance...\n");
        
        // Create future partitions
        await partitionManager.createFuturePartitions(3);
        
        // Drop old partitions
        await partitionManager.dropOldPartitions(12);
        
        // Health check
        const autoHealth = await partitionManager.healthCheck();
        
        if (!autoHealth.healthy) {
          console.log("\n⚠️ Issues detected after maintenance");
          process.exit(1);
        }
        
        console.log("\n✅ Automatic maintenance completed successfully!");
        break;

      default:
        console.log("📚 Available commands:");
        console.log("  npm run partition:create [months]  - Create future partitions (default: 3)");
        console.log("  npm run partition:drop [months]    - Drop old partitions (default: 12)");
        console.log("  npm run partition:stats            - Show partition statistics");
        console.log("  npm run partition:health           - Run health check");
        console.log("  npm run partition:optimize         - Optimize all partitions");
        console.log("  npm run partition:auto-maintain    - Run automatic maintenance");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

main();