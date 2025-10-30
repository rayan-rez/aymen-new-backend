import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Floor Plans (Polymorphic)
 * Migrates from old `plan` table to new polymorphic `floor_plans` table
 * Note: Old table is just `plan`, not `projets_plans` or `appartements_plans`
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n📐 Starting floor plans migration...");
  console.log("=====================================");

  // Validate legacy DB config
  try {
    SeederHelper.validateLegacyDbConfig();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log("\nℹ️  Skipping seeder - legacy database not configured");
    return;
  }

  const trx = await knex.transaction();
  let totalInserted = 0;
  let totalSkipped = 0;

  try {
    // Clear existing data
    await SeederHelper.clearTable(trx, "floor_plans");
    console.log("  ✓ Cleared existing floor plans");

    // Get mappings from previous seeders
    const projectMapping = await SeederHelper.getMapping(trx, "temp_project_mapping");
    const apartmentMapping = await SeederHelper.getMapping(trx, "temp_apartment_mapping");

    console.log(`  📊 Loaded ${projectMapping.size} project mappings`);
    console.log(`  📊 Loaded ${apartmentMapping.size} apartment mappings`);

    // ============================================
    // MIGRATE FLOOR PLANS FROM `plan` TABLE
    // ============================================
    console.log("\n  📋 Migrating floor plans...");
    try {
      const oldPlans = await legacy_db("plan").select("*");
      console.log(`  📊 Found ${oldPlans.length} old floor plans`);

      if (oldPlans.length === 0) {
        console.log("  ℹ️  No floor plans to migrate");
        await trx.commit();
        return;
      }

      for (const plan of oldPlans) {
        try {
          // The old `plan` table doesn't have project/apartment references
          // So we'll skip plans without proper URLs
          if (!plan.url_photo && !plan.photo_plan) {
            totalSkipped++;
            continue;
          }

          const imageUrl = plan.photo_plan || plan.url_photo;
          const planName = plan.nom_plan || `Plan ${plan.id}`;

          // Since old table doesn't have FK to projects/apartments,
          // we'll create them as orphaned plans or skip them
          // For now, let's skip them as they don't have proper references
          console.log(`  ⚠️  Skipping plan "${planName}" - no project/apartment reference in old schema`);
          totalSkipped++;

          // If you want to create them anyway, uncomment this:
          /*
          await trx("floor_plans").insert({
            plannable_type: "project", // Default to project
            plannable_id: 1, // Default to first project
            name: planName,
            image_url: imageUrl,
            pdf_url: null,
            display_order: 0,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
          totalInserted++;
          */
        } catch (error) {
          console.warn(`  ⚠️  Failed to insert floor plan`, error);
          totalSkipped++;
        }
      }

      console.log(`  ℹ️  Old floor plans don't have project/apartment references`);
      console.log(`  💡 Consider manually mapping floor plans to projects/apartments`);
    } catch (error) {
      console.log("  ℹ️  No floor plans table found");
    }

    await trx.commit();

    console.log(`\n📐 Floor Plans Migration Summary:`);
    console.log(`  • Total inserted: ${totalInserted}`);
    if (totalSkipped > 0) {
      console.log(`  ⚠️  Skipped: ${totalSkipped} (no project/apartment references)`);
    }
    console.log("✅ Floor plans migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Floor plans migration failed:", error);
    throw error;
  }
}