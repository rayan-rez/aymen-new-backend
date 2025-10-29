import { Knex } from "knex";
import legacy_db from "@/config/legacy-database"
/**
 * Seed: Project Relations
 * Migrates project-feature and project-location relationships
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("🔗 Starting project relations migration...");

  const trx = await knex.transaction();

  try {

    // Get mappings
    const projectMapping = new Map<number, number>();
    const projectMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_project_mapping"
    );
    projectMappingRows[0].forEach((row: any) => {
      projectMapping.set(row.old_id, row.new_id);
    });

    const featureMapping = new Map<number, number>();
    const featureMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_feature_mapping"
    );
    featureMappingRows[0].forEach((row: any) => {
      featureMapping.set(row.old_id, row.new_id);
    });

    const locationMapping = new Map<number, number>();
    const locationMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_location_mapping"
    );
    locationMappingRows[0].forEach((row: any) => {
      locationMapping.set(row.old_id, row.new_id);
    });

    // ============================================
    // MIGRATE PROJECT FEATURES
    // ============================================
    console.log("  📦 Migrating project features...");
    const oldProjectFeatures = await legacy_db("projets_caracteristiques").select(
      "*"
    );

    let featureCount = 0;
    for (const pf of oldProjectFeatures) {
      const newProjectId = projectMapping.get(pf.projet_id);
      const newFeatureId = featureMapping.get(pf.caracteristique_id);

      if (newProjectId && newFeatureId) {
        try {
          await trx("project_features").insert({
            project_id: newProjectId,
            feature_id: newFeatureId,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
          featureCount++;
        } catch (error) {
          // Skip duplicates
        }
      }
    }
    console.log(`  ✓ Inserted ${featureCount} project-feature relations`);

    // ============================================
    // MIGRATE PROJECT LOCATIONS
    // ============================================
    console.log("  📍 Migrating project locations...");
    const oldProjectLocations = await legacy_db("projets_localites").select("*");

    let locationCount = 0;
    for (const pl of oldProjectLocations) {
      const newProjectId = projectMapping.get(pl.projet_id);
      const newLocationId = locationMapping.get(pl.localite_id);

      if (newProjectId && newLocationId) {
        try {
          await trx("project_locations").insert({
            project_id: newProjectId,
            location_id: newLocationId,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
          locationCount++;
        } catch (error) {
          // Skip duplicates
        }
      }
    }
    console.log(`  ✓ Inserted ${locationCount} project-location relations`);

    await trx.commit();

    console.log("✅ Project relations migration completed successfully");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Project relations migration failed:", error);
    throw error;
  }
}