import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Project Relations
 * Migrates project-feature and project-location relationships
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n🔗 Starting project relations migration...");
  console.log("===========================================");

  // Validate legacy DB config
  try {
    SeederHelper.validateLegacyDbConfig();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log("\nℹ️  Skipping seeder - legacy database not configured");
    return;
  }

  const trx = await knex.transaction();
  const featureStats: MigrationStats = { total: 0, inserted: 0, skipped: 0, failed: 0 };
  const locationStats: MigrationStats = { total: 0, inserted: 0, skipped: 0, failed: 0 };

  try {
    // Check if already seeded (idempotency)
    const existingFeatures = await trx("project_features").count("* as count").first();
    const existingLocations = await trx("project_locations").count("* as count").first();
    
    if (existingFeatures && Number(existingFeatures.count) > 0 && 
        existingLocations && Number(existingLocations.count) > 0) {
      console.log(`  ℹ️  Found ${existingFeatures.count} project-feature relations`);
      console.log(`  ℹ️  Found ${existingLocations.count} project-location relations`);
      console.log("  ⚠️  Tables already seeded. Skipping...");
      await trx.commit();
      return;
    }

    // Get mappings from previous seeders
    const projectMapping = await SeederHelper.getMapping(trx, "temp_project_mapping");
    const featureMapping = await SeederHelper.getMapping(trx, "temp_feature_mapping");
    const locationMapping = await SeederHelper.getMapping(trx, "temp_location_mapping");

    console.log(`  📊 Loaded ${projectMapping.size} project mappings`);
    console.log(`  📊 Loaded ${featureMapping.size} feature mappings`);
    console.log(`  📊 Loaded ${locationMapping.size} location mappings`);

    // ============================================
    // MIGRATE PROJECT FEATURES
    // ============================================
    console.log("\n  📦 Migrating project features...");
    const oldProjectFeatures = await legacy_db("projets_caracteristiques").select("*");
    featureStats.total = oldProjectFeatures.length;

    for (const pf of oldProjectFeatures) {
      const newProjectId = projectMapping.get(pf.projet_id);
      const newFeatureId = featureMapping.get(pf.caracteristique_id);

      if (!newProjectId || !newFeatureId) {
        featureStats.skipped++;
        continue;
      }

      try {
        await trx("project_features").insert({
          project_id: newProjectId,
          feature_id: newFeatureId,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
        featureStats.inserted++;
      } catch (error) {
        // Skip duplicates (unique constraint)
        featureStats.skipped++;
      }
    }

    console.log(`  ✓ Inserted ${featureStats.inserted} project-feature relations`);
    if (featureStats.skipped > 0) {
      console.log(`  ⚠️  Skipped ${featureStats.skipped} (missing refs or duplicates)`);
    }

    // ============================================
    // MIGRATE PROJECT LOCATIONS
    // ============================================
    console.log("\n  📍 Migrating project locations...");
    const oldProjectLocations = await legacy_db("localite_project").select("*");
    locationStats.total = oldProjectLocations.length;

    for (const pl of oldProjectLocations) {
      const newProjectId = projectMapping.get(pl.projet_id);
      const newLocationId = locationMapping.get(pl.localite_id);

      if (!newProjectId || !newLocationId) {
        locationStats.skipped++;
        continue;
      }

      try {
        await trx("project_locations").insert({
          project_id: newProjectId,
          location_id: newLocationId,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
        locationStats.inserted++;
      } catch (error) {
        // Skip duplicates (unique constraint)
        locationStats.skipped++;
      }
    }

    console.log(`  ✓ Inserted ${locationStats.inserted} project-location relations`);
    if (locationStats.skipped > 0) {
      console.log(`  ⚠️  Skipped ${locationStats.skipped} (missing refs or duplicates)`);
    }

    await trx.commit();

    console.log("\n✅ Project relations migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Project relations migration failed:", error);
    throw error;
  }
}