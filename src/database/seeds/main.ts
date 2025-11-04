// src/database/seeds/main.ts

import { Knex } from "knex";

/**
 * Master Seeder Runner
 * 
 * Executes all seeders in the correct order to maintain referential integrity.
 * 
 * EXECUTION ORDER:
 * 1. Reference data (locations, features)
 * 2. Core entities (projects, apartments, commercial properties)
 * 3. Relationships (project_features)
 * 4. Media (photos, floor plans)
 * 5. Content (blog posts)
 * 
 * USAGE:
 * npx knex seed:run --specific=main.ts
 * 
 * or individually:
 * npx knex seed:run --specific=locations.ts
 */

export async function seed(knex: Knex): Promise<void> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(70));
  console.log("🚀 AYMEN PROMOTION DATABASE MIGRATION");
  console.log("=".repeat(70));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  // Track overall stats
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

  try {
    const commercialStart = Date.now();
    const { seed: commercialSeeder } = await import("./commercial_properties");
    await commercialSeeder(knex);
    migrationLog.push({
      seeder: "08_commercial_properties",
      duration: Date.now() - commercialStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "08_commercial_properties",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    throw error;
  }

  // ============================================================================
  // 3. RELATIONSHIPS
  // ============================================================================
  console.log("\n🔗 PHASE 3: Relationships\n");

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
    throw error;
  }

  // ============================================================================
  // 4. MEDIA
  // ============================================================================
  console.log("\n📸 PHASE 4: Media Assets\n");

  try {
    const photosStart = Date.now();
    const { seed: photosSeeder } = await import("./photos");
    await photosSeeder(knex);
    migrationLog.push({
      seeder: "06_photos",
      duration: Date.now() - photosStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "06_photos",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    // Don't throw - photos are non-critical
    console.warn("⚠️  Photos migration failed but continuing...");
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
      seeder: "07_blog_posts",
      duration: Date.now() - blogStart,
      status: "✓ SUCCESS",
    });
  } catch (error: any) {
    migrationLog.push({
      seeder: "07_blog_posts",
      duration: Date.now(),
      status: `✗ FAILED: ${error.message}`,
    });
    // Don't throw - blog is non-critical
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
    "commercial_properties",
    "project_features",
    "photos",
    "blog_posts",
    "blog_post_sections",
  ];

  for (const table of tables) {
    const count = await knex(table).count("* as count").first();
    console.log(`  ${table.padEnd(30)} ${count?.count} records`);
  }

  console.log("\n✅ Migration Complete!\n");
}