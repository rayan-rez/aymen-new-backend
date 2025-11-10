// src/database/seeds/main.ts

import { Knex } from "knex";

/**
 * Master Seeder Runner (REFINED)
 * 
 * Executes seeders in correct order for referential integrity.
 * 
 * EXECUTION ORDER:
 * 1. Reference data (locations, features)
 * 2. Core entities (projects, apartments)
 * 3. Relationships (project_features, project_media)
 * 4. Media (photos, floor_plans)
 * 5. Content (blog posts)
 * 
 * USAGE:
 * npx knex seed:run --specific=main.ts
 */

export async function seed(knex: Knex): Promise<void> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(70));
  console.log("🚀 AYMEN PROMOTION DATABASE MIGRATION");
  console.log("=".repeat(70));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const migrationLog: Array<{ seeder: string; duration: number; status: string }> = [];

  // ============================================================================
  // 1. REFERENCE DATA
  // ============================================================================
  console.log("\n📋 PHASE 1: Reference Data\n");

  try {
    const locationsStart = Date.now();
    const { seed: locationsSeeder } = await import("./locations");
    await locationsSeeder(knex);
    migrationLog.push({
      seeder: "01_locations",
      duration: Date.now() - locationsStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "01_locations",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    throw error;
  }

  try {
    const featuresStart = Date.now();
    const { seed: featuresSeeder } = await import("./features");
    await featuresSeeder(knex);
    migrationLog.push({
      seeder: "02_features",
      duration: Date.now() - featuresStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "02_features",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    throw error;
  }

  // ============================================================================
  // 2. CORE ENTITIES
  // ============================================================================
  console.log("\n🏗️  PHASE 2: Core Entities\n");

  try {
    const projectsStart = Date.now();
    const { seed: projectsSeeder } = await import("./projects");
    await projectsSeeder(knex);
    migrationLog.push({
      seeder: "03_projects",
      duration: Date.now() - projectsStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "03_projects",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    throw error;
  }

  try {
    const apartmentsStart = Date.now();
    const { seed: apartmentsSeeder } = await import("./apartments");
    await apartmentsSeeder(knex);
    migrationLog.push({
      seeder: "04_apartments",
      duration: Date.now() - apartmentsStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "04_apartments",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    throw error;
  }

  // ============================================================================
  // 3. RELATIONSHIPS & MEDIA
  // ============================================================================
  console.log("\n🔗 PHASE 3: Relationships & Media\n");

  try {
    const featuresStart = Date.now();
    const { seed: projectFeaturesSeeder } = await import("./project_features");
    await projectFeaturesSeeder(knex);
    migrationLog.push({
      seeder: "05_project_features",
      duration: Date.now() - featuresStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "05_project_features",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    // Don't throw - relationships are recoverable
    console.warn("⚠️  Project features migration failed but continuing...");
  }

  try {
    const mediaStart = Date.now();
    const { seed: projectMediaSeeder } = await import("./project_media");
    await projectMediaSeeder(knex);
    migrationLog.push({
      seeder: "06_project_media",
      duration: Date.now() - mediaStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "06_project_media",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    console.warn("⚠️  Project media migration failed but continuing...");
  }

  // ============================================================================
  // 4. POLYMORPHIC MEDIA
  // ============================================================================
  console.log("\n📸 PHASE 4: Polymorphic Media\n");

  try {
    const photosStart = Date.now();
    const { seed: photosSeeder } = await import("./photos");
    await photosSeeder(knex);
    migrationLog.push({
      seeder: "07_photos",
      duration: Date.now() - photosStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "07_photos",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    console.warn("⚠️  Photos migration failed but continuing...");
  }

  try {
    const floorPlansStart = Date.now();
    const { seed: floorPlansSeeder } = await import("./floor_plans");
    await floorPlansSeeder(knex);
    migrationLog.push({
      seeder: "08_floor_plans",
      duration: Date.now() - floorPlansStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "08_floor_plans",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    console.warn("⚠️  Floor plans migration failed but continuing...");
  }

  // ============================================================================
  // 5. CONTENT
  // ============================================================================
  console.log("\n📝 PHASE 5: Content\n");

  try {
    const blogStart = Date.now();
    const { seed: blogSeeder } = await import("./blog_posts");
    await blogSeeder(knex);
    migrationLog.push({
      seeder: "09_blog_posts",
      duration: Date.now() - blogStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "09_blog_posts",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    console.warn("⚠️  Blog posts migration failed but continuing...");
  }

  // ============================================================================
  // FINAL REPORT
  // ============================================================================
  const totalDuration = Date.now() - startTime;

  console.log("\n" + "=".repeat(70));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(70));

  migrationLog.forEach((log) => {
    console.log(
      `${log.status.padEnd(10)} ${log.seeder.padEnd(30)} ${(log.duration / 1000).toFixed(2)}s`
    );
  });

  console.log("=".repeat(70));
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log("=".repeat(70) + "\n");

  // ============================================================================
  // VERIFICATION QUERIES
  // ============================================================================
  console.log("\n📈 DATABASE VERIFICATION\n");

  const tables = [
    "locations",
    "features",
    "projects",
    "apartments",
    "project_features",
    "project_media",
    "photos",
    "floor_plans",
    "blog_posts",
    "blog_post_sections",
  ];

  for (const table of tables) {
    try {
      const count = await knex(table).count("* as count").first();
      console.log(`  ${table.padEnd(30)} ${count?.count || 0} records`);
    } catch (error) {
      console.log(`  ${table.padEnd(30)} ⚠️  Table not found`);
    }
  }

  console.log("\n✅ Migration Complete!\n");
}