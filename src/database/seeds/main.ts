// src/database/seeds/main.ts

import { Knex } from "knex";

/**
 * Master Seeder Runner (REFACTORED)
 * 
 * Executes seeders in correct order for referential integrity.
 * 
 * EXECUTION ORDER:
 * 1. Reference data (locations, features)
 * 2. Core entities (projects, apartments)
 * 3. Relationships (project_features)
 * 4. Polymorphic media (photos, floor_plans)
 * 5. Content (blog posts)
 * 
 * CHANGES:
 * - Removed project_media seeder (replaced by polymorphic photos table)
 * 
 * USAGE:
 * npx knex seed:run --specific=main.ts
 */

export async function seed(knex: Knex): Promise<void> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(70));
  console.log("🚀 AYMEN PROMOTION DATABASE MIGRATION");
  console.log("=".repeat(70));
  console.log(`Database: ${knex.client.config.connection.database}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const migrationLog: Array<{
    seeder: string;
    duration: number;
    status: string;
    records?: number;
  }> = [];

  // Phase definitions for better structure
  const phases = [
    {
      name: "Reference Data",
      seeders: ["locations", "features"],
    },
    {
      name: "Core Entities",
      seeders: ["projects", "apartments"],
    },
    {
      name: "Relationships",
      seeders: ["project_features"],
    },
    {
      name: "Polymorphic Media",
      seeders: ["photos", "floor_plans"],
    },
    {
      name: "Content",
      seeders: ["blog_posts"],
    },
  ];

  for (const phase of phases) {
    console.log(`\n📋 PHASE: ${phase.name}\n`);

    for (const seederName of phase.seeders) {
      const seederStart = Date.now();
      try {
        const { seed } = await import(`./${seederName}`);
        await seed(knex);
        
        // Get record count
        const tableName = seederName.replace('_', ''); // Simple mapping
        const count = await knex(tableName).count("* as count").first();
        
        migrationLog.push({
          seeder: seederName,
          duration: Date.now() - seederStart,
          status: "✓ SUCCESS",
          records: count?.count as number,
        });
      } catch (error: any) {
        migrationLog.push({
          seeder: seederName,
          duration: Date.now() - seederStart,
          status: `✗ FAILED`,
        });
        console.error(`\n❌ Seeder ${seederName} failed:`, error.message);
        throw error; // Stop on first failure
      }
    }
  }

  // Final report
  const totalDuration = Date.now() - startTime;
  console.log("\n" + "=".repeat(70));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(70));

  migrationLog.forEach((log) => {
    const duration = (log.duration / 1000).toFixed(2);
    const records = log.records ? `(${log.records} records)` : "";
    console.log(`${log.status.padEnd(10)} ${log.seeder.padEnd(30)} ${duration}s ${records}`);
  });

  console.log("=".repeat(70));
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log("=".repeat(70) + "\n");

  // Final verification
  await runVerification(knex);
}

async function runVerification(knex: Knex) {
  console.log("\n📈 DATABASE VERIFICATION\n");

  const tables = [
    "locations",
    "features",
    "projects",
    "apartments",
    "project_features",
    "photos",
    "floor_plans",
    "blog_posts",
    "blog_post_sections",
  ];

  const verification: Array<{ table: string; count: number; status: string }> = [];

  for (const table of tables) {
    try {
      const result = await knex(table).count("* as count").first();
      const count = result?.count as number;
      const expectedMin = table === "features" ? 5 : 0; // Adjust based on expectations
      const status = count > expectedMin ? "✓" : "⚠️";
      verification.push({ table, count, status });
    } catch (error) {
      verification.push({ table, count: 0, status: "❌" });
    }
  }

  verification.forEach(({ table, count, status }) => {
    console.log(`  ${status} ${table.padEnd(30)} ${count} records`);
  });

  // Check for potential issues
  console.log("\n🔍 Issue Detection:");
  
  const orphanPhotos = await knex("photos")
    .leftJoin("projects", function() {
      this.on("photos.photoable_id", "=", "projects.id")
        .andOn("photos.photoable_type", "=", knex.raw("?", ["project"]));
    })
    .leftJoin("apartments", function() {
      this.on("photos.photoable_id", "=", "apartments.id")
        .andOn("photos.photoable_type", "=", knex.raw("?", ["apartment"]));
    })
    .whereNull("projects.id")
    .whereNull("apartments.id")
    .count("* as count")
    .first();

  if ((orphanPhotos?.count as number) > 0) {
    console.log(`  ⚠️  Found ${orphanPhotos?.count} orphan photos`);
  }

  console.log("\n✅ Migration Complete!\n");
}