import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Virtual Tours
 * Migrates from old `visit_virtuel` table (not projets_visites_virtuelles!)
 * to new `virtual_tours` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n🎥 Starting virtual tours migration...");
  console.log("=======================================");

  // Validate legacy DB config
  try {
    SeederHelper.validateLegacyDbConfig();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log("\nℹ️  Skipping seeder - legacy database not configured");
    return;
  }

  const trx = await knex.transaction();
  const stats: MigrationStats = { total: 0, inserted: 0, skipped: 0, failed: 0 };

  try {
    // Clear existing data
    await SeederHelper.clearTable(trx, "virtual_tours");
    console.log("  ✓ Cleared existing virtual tours");

    // Get project mapping from previous seeder
    const projectMapping = await SeederHelper.getMapping(trx, "temp_project_mapping");
    console.log(`  📊 Loaded ${projectMapping.size} project mappings`);

    // ============================================
    // MIGRATE FROM `visit_virtuel` TABLE
    // ============================================
    try {
      const oldVirtualTours = await legacy_db("visit_virtuel").select("*");
      stats.total = oldVirtualTours.length;
      console.log(`  📊 Found ${stats.total} old virtual tours to migrate`);

      if (stats.total === 0) {
        console.log("  ℹ️  No virtual tours to migrate");
        await trx.commit();
        return;
      }

      for (const tour of oldVirtualTours) {
        const newProjectId = projectMapping.get(tour.projet_id);

        if (!newProjectId) {
          console.warn(`  ⚠️  Skipping virtual tour - project not found (projet_id: ${tour.projet_id})`);
          stats.skipped++;
          continue;
        }

        try {
          await trx("virtual_tours").insert({
            project_id: newProjectId,
            url: tour.url,
            description: tour.descriptionV || null,
            thumbnail_url: null, // Old table doesn't have thumbnail
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
          stats.inserted++;
        } catch (error) {
          console.warn(`  ⚠️  Failed to insert virtual tour`, error);
          stats.failed++;
        }
      }
    } catch (error) {
      console.log("  ℹ️  No virtual tours table found in old database");
    }

    await trx.commit();

    SeederHelper.logProgress("Virtual Tours", stats, "🎥");
    console.log("✅ Virtual tours migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Virtual tours migration failed:", error);
    throw error;
  }
}