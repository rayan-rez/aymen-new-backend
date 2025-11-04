// src/database/seeds/project_features.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  buildLookupMap,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../seed-helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyProjectFeature {
  projet_id: number;
  caracteristique_id: number;
}

interface NewProjectFeature {
  project_id: number;
  feature_id: number;
  feature_value: string | null;
  display_order: number;
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformProjectFeature(
  legacy: LegacyProjectFeature,
  projectIdMap: Map<number, number>,
  featureIdMap: Map<number, number>
): Promise<TransformResult<NewProjectFeature>> {
  try {
    // Map IDs to new system
    const projectId = projectIdMap.get(legacy.projet_id);
    const featureId = featureIdMap.get(legacy.caracteristique_id);

    // Skip if either ID doesn't exist in new system
    if (!projectId) {
      return {
        data: null,
        skip: true,
        error: `Project ID ${legacy.projet_id} not found in new system`,
      };
    }

    if (!featureId) {
      return {
        data: null,
        skip: true,
        error: `Feature ID ${legacy.caracteristique_id} not found in new system`,
      };
    }

    return {
      data: {
        project_id: projectId,
        feature_id: featureId,
        feature_value: null,
        display_order: 0,
      },
      skip: false,
    };
  } catch (error: any) {
    return {
      data: null,
      skip: false,
      error: `Transform failed: ${error.message}`,
    };
  }
}

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seed(knex: Knex): Promise<void> {
  console.log("\n🔗 Starting Project Features Junction Migration...\n");

  // Clear existing data
  await clearTable(knex, "project_features");
  console.log("✓ Cleared project_features table");

  // Build ID mapping lookups
  // Map legacy IDs to new IDs
  const projectIdMap = await buildLookupMap(knex, "projects", "id", "id");
  const featureIdMap = await buildLookupMap(knex, "features", "id", "id");

  console.log(`✓ Built project ID map (${projectIdMap.size} projects)`);
  console.log(`✓ Built feature ID map (${featureIdMap.size} features)`);

  // Fetch legacy project-feature relationships
  const legacyRelations = await fetchLegacyRecords<LegacyProjectFeature>(
    "projets_caracteristiques"
  );
  console.log(`✓ Fetched ${legacyRelations.length} legacy relationships\n`);

  if (legacyRelations.length === 0) {
    console.log("⊗ No legacy relationships found, skipping migration\n");
    return;
  }

  // Process and insert relationships
  const stats = await processBatch(
    legacyRelations,
    (record) => transformProjectFeature(record, projectIdMap, featureIdMap),
    async (batch) => {
      // Use INSERT IGNORE to avoid duplicate key errors
      if (batch.length > 0) {
        await knex("project_features")
          .insert(batch)
          .onConflict(["project_id", "feature_id"])
          .ignore();
      }
    },
    { batchSize: 100, tableName: "project_features" }
  );

  // Print statistics
  printMigrationStats(stats);

  // Verify migration
  const totalCount = await knex("project_features")
    .count("* as count")
    .first();
  console.log(
    `✓ Migration complete. Total relationships in new DB: ${totalCount?.count}\n`
  );

  // Show feature distribution
  const topFeatures = await knex("project_features as pf")
    .join("features as f", "pf.feature_id", "f.id")
    .select("f.name")
    .count("* as count")
    .groupBy("f.id", "f.name")
    .orderBy("count", "desc")
    .limit(10);

  console.log("Top 10 most used features:");
  topFeatures.forEach((row: any) => {
    console.log(`  ${row.name}: ${row.count} projects`);
  });
  console.log("");
}