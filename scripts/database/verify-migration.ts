// src/scripts/verify-migration.ts

import db from "@/config/database";
import legacyDb from "@/config/legacy-database";

interface TableStats {
  table: string;
  newCount: number;
  legacyCount: number;
  difference: number;
  status: "✓" | "⚠️" | "✗";
}

/**
 * Verify data migration completeness
 */
async function verifyMigration() {
  console.log("\n" + "=".repeat(70));
  console.log("📊 DATABASE MIGRATION VERIFICATION");
  console.log("=".repeat(70) + "\n");

  const tables: Array<{
    newTable: string;
    legacyTable: string;
    description: string;
  }> = [
    {
      newTable: "locations",
      legacyTable: "localites",
      description: "Geographic locations",
    },
    {
      newTable: "features",
      legacyTable: "caracteristiques_projets",
      description: "Project features/amenities",
    },
    {
      newTable: "projects",
      legacyTable: "projet_filtre",
      description: "Real estate projects",
    },
    {
      newTable: "apartments",
      legacyTable: "appartements",
      description: "Apartment units",
    },
    {
      newTable: "commercial_properties",
      legacyTable: "locaux",
      description: "Commercial properties",
    },
    {
      newTable: "blog_posts",
      legacyTable: "blog",
      description: "Blog articles",
    },
    {
      newTable: "photos",
      legacyTable: "photos_projets",
      description: "Project photos",
    },
  ];

  const stats: TableStats[] = [];

  for (const { newTable, legacyTable, description } of tables) {
    try {
      // Count records in new database
      const newResult = await db(newTable).count("* as count").first();
      const newCount = newResult ? Number(newResult.count) : 0;

      // Count records in legacy database
      let legacyCount = 0;
      try {
        const legacyResult = await legacyDb(legacyTable)
          .count("* as count")
          .first();
        legacyCount = legacyResult ? Number(legacyResult.count) : 0;
      } catch (error) {
        console.warn(
          `⚠️  Could not access legacy table ${legacyTable}: ${error}`
        );
      }

      const difference = newCount - legacyCount;
      let status: "✓" | "⚠️" | "✗";

      if (difference === 0) {
        status = "✓"; // Perfect match
      } else if (Math.abs(difference) <= legacyCount * 0.05) {
        status = "⚠️"; // Within 5% tolerance (acceptable for data cleaning)
      } else {
        status = "✗"; // Significant difference
      }

      stats.push({
        table: `${newTable} ← ${legacyTable}`,
        newCount,
        legacyCount,
        difference,
        status,
      });
    } catch (error: any) {
      console.error(`❌ Error verifying ${newTable}:`, error.message);
    }
  }

  // Print results
  console.log("Table Comparison:");
  console.log("-".repeat(70));
  console.log(
    `${"Status".padEnd(8)} ${"Table".padEnd(40)} ${"New".padEnd(
      8
    )} ${"Legacy".padEnd(8)} ${"Diff".padEnd(8)}`
  );
  console.log("-".repeat(70));

  stats.forEach((stat) => {
    const diffStr =
      stat.difference > 0 ? `+${stat.difference}` : stat.difference.toString();
    console.log(
      `${stat.status.padEnd(8)} ${stat.table.padEnd(40)} ${String(
        stat.newCount
      ).padEnd(8)} ${String(stat.legacyCount).padEnd(8)} ${diffStr.padEnd(8)}`
    );
  });

  console.log("-".repeat(70));

  // Summary
  const perfect = stats.filter((s) => s.status === "✓").length;
  const warnings = stats.filter((s) => s.status === "⚠️").length;
  const errors = stats.filter((s) => s.status === "✗").length;

  console.log(`\nSummary:`);
  console.log(`  ✓ Perfect matches: ${perfect}`);
  console.log(`  ⚠️  Within tolerance: ${warnings}`);
  console.log(`  ✗ Significant differences: ${errors}`);

  // Additional checks
  console.log("\n" + "=".repeat(70));
  console.log("🔍 ADDITIONAL CHECKS");
  console.log("=".repeat(70) + "\n");

  // Check referential integrity
  await checkReferentialIntegrity();

  // Check for orphaned records
  await checkOrphanedRecords();

  // Check data quality
  await checkDataQuality();

  console.log("\n✅ Verification complete!\n");

  // Close connections
  await db.destroy();
  await legacyDb.destroy();
}

/**
 * Check referential integrity
 */
async function checkReferentialIntegrity() {
  console.log("Referential Integrity:");

  // Check projects with invalid location_id
  const invalidProjects = await db("projects")
    .leftJoin("locations", "projects.location_id", "locations.id")
    .whereNotNull("projects.location_id")
    .whereNull("locations.id")
    .count("* as count")
    .first();

  console.log(
    `  Projects with invalid location_id: ${invalidProjects?.count || 0}`
  );

  // Check apartments with invalid project_id
  const invalidApartments = await db("apartments")
    .leftJoin("projects", "apartments.project_id", "projects.id")
    .whereNull("projects.id")
    .count("* as count")
    .first();

  console.log(
    `  Apartments with invalid project_id: ${invalidApartments?.count || 0}`
  );

  // Check project_features with invalid references
  const invalidFeatures = await db("project_features")
    .leftJoin("projects", "project_features.project_id", "projects.id")
    .leftJoin("features", "project_features.feature_id", "features.id")
    .where((builder) => {
      builder.whereNull("projects.id").orWhereNull("features.id");
    })
    .count("* as count")
    .first();

  console.log(
    `  Project features with invalid refs: ${invalidFeatures?.count || 0}`
  );
}

/**
 * Check for orphaned records
 */
async function checkOrphanedRecords() {
  console.log("\nOrphaned Records:");

  // Apartments without a project
  const orphanedApartments = await db("apartments")
    .leftJoin("projects", "apartments.project_id", "projects.id")
    .whereNull("projects.id")
    .count("* as count")
    .first();

  console.log(
    `  Apartments without project: ${orphanedApartments?.count || 0}`
  );

  // Photos without a parent entity
  const orphanedPhotos = await db.raw(`
    SELECT COUNT(*) as count 
    FROM photos p
    WHERE (
      p.photoable_type = 'project' AND NOT EXISTS (
        SELECT 1 FROM projects WHERE id = p.photoable_id
      )
    ) OR (
      p.photoable_type = 'apartment' AND NOT EXISTS (
        SELECT 1 FROM apartments WHERE id = p.photoable_id
      )
    )
  `);

  console.log(`  Orphaned photos: ${orphanedPhotos[0][0].count}`);
}

/**
 * Check data quality
 */
async function checkDataQuality() {
  console.log("\nData Quality:");

  // Projects without required fields
  const incompleteProjects = await db("projects")
    .where((builder) => {
      builder.whereNull("name").orWhereNull("address").orWhereNull("slug");
    })
    .count("* as count")
    .first();

  console.log(
    `  Projects missing required fields: ${incompleteProjects?.count || 0}`
  );

  // Apartments with invalid prices
  const invalidPrices = await db("apartments")
    .where("price", "<=", 0)
    .orWhereNull("price")
    .count("* as count")
    .first();

  console.log(`  Apartments with invalid prices: ${invalidPrices?.count || 0}`);

  // Apartments with invalid area
  const invalidArea = await db("apartments")
    .where("area_sqm", "<=", 0)
    .orWhereNull("area_sqm")
    .count("* as count")
    .first();

  console.log(`  Apartments with invalid area: ${invalidArea?.count || 0}`);

  // Duplicate slugs
  const duplicateSlugs = await db.raw(`
    SELECT COUNT(*) as count FROM (
      SELECT slug FROM projects GROUP BY slug HAVING COUNT(*) > 1
      UNION ALL
      SELECT slug FROM blog_posts GROUP BY slug HAVING COUNT(*) > 1
    ) as dups
  `);

  console.log(`  Duplicate slugs found: ${duplicateSlugs[0][0].count}`);
}

// Run verification
verifyMigration()
  .then(() => {
    console.log("Verification completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
