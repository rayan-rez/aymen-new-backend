import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Features
 * Migrates from old `caracteristiques_projets` table to new `features` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n🎯 Starting features migration...");
  console.log("====================================");

  // Validate legacy DB config
  try {
    SeederHelper.validateLegacyDbConfig();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log("\nℹ️  Skipping seeder - legacy database not configured");
    return;
  }

  const trx = await knex.transaction();
  const stats: MigrationStats = {
    total: 0,
    inserted: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // Check if already seeded (idempotency)
    const existingCount = await trx("features").count("* as count").first();
    if (existingCount && Number(existingCount.count) > 0) {
      console.log(`  ℹ️  Found ${existingCount.count} existing features`);
      console.log("  ⚠️  Table already seeded. Skipping...");
      await trx.commit();
      return;
    }

    // Clear existing data
    await SeederHelper.clearTable(trx, "project_features");
    await SeederHelper.clearTable(trx, "features");
    console.log("  ✓ Cleared existing features");

    // Fetch old features
    const oldFeatures = await legacy_db("caracteristiques_projets").select("*");
    stats.total = oldFeatures.length;
    console.log(`  📊 Found ${stats.total} old features to migrate`);

    if (stats.total === 0) {
      console.log("  ℹ️  No features to migrate");
      await trx.commit();
      return;
    }

    // Category mapping helper
    const categorizeFeature = (name: string): string => {
      const lowerName = name.toLowerCase();
      if (
        lowerName.includes("piscine") ||
        lowerName.includes("gym") ||
        lowerName.includes("spa") ||
        lowerName.includes("jardin")
      ) {
        return "leisure";
      }
      if (
        lowerName.includes("sécurité") ||
        lowerName.includes("gardien") ||
        lowerName.includes("surveillance")
      ) {
        return "security";
      }
      if (
        lowerName.includes("parking") ||
        lowerName.includes("transport") ||
        lowerName.includes("métro")
      ) {
        return "transport";
      }
      return "amenity";
    };

    // Map old features to new
    const featureMap = new Map<number, number>();

    for (const feature of oldFeatures) {
      try {
        const slug = SeederHelper.generateSlug(
          feature.nom_caracteristique,
          `feature-${feature.id}`
        );

        const category = categorizeFeature(feature.nom_caracteristique);

        const [newFeatureId] = await trx("features").insert({
          name: feature.nom_caracteristique,
          slug,
          icon: feature.url || null,
          category,
          display_order: stats.inserted,
          is_active: true,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

        featureMap.set(feature.id, newFeatureId);
        stats.inserted++;
      } catch (error) {
        console.warn(
          `  ⚠️  Failed: ${feature.nom_caracteristique}`,
          (error as Error).message
        );
        stats.failed++;
      }
    }

    // Store mapping
    await SeederHelper.storeMapping(trx, "temp_feature_mapping", featureMap);

    await trx.commit();

    SeederHelper.logProgress("Features", stats, "🎯");
    console.log("✅ Features migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Features migration failed:", error);
    throw error;
  }
}
