import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Floor Plans (Polymorphic)
 * Migrates from old floor plan tables to new polymorphic `floor_plans` table
 * Old tables: projets_plans, appartements_plans
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
    // Check if already seeded (idempotency)
    const existingCount = await trx("floor_plans").count("* as count").first();
    if (existingCount && Number(existingCount.count) > 0) {
      console.log(`  ℹ️  Found ${existingCount.count} existing floor plans`);
      console.log("  ⚠️  Table already seeded. Skipping...");
      await trx.commit();
      return;
    }

    // Clear existing data
    await SeederHelper.clearTable(trx, "floor_plans");
    console.log("  ✓ Cleared existing floor plans");

    // Get mappings from previous seeders
    const projectMapping = await SeederHelper.getMapping(trx, "temp_project_mapping");
    const apartmentMapping = await SeederHelper.getMapping(trx, "temp_apartment_mapping");

    console.log(`  📊 Loaded ${projectMapping.size} project mappings`);
    console.log(`  📊 Loaded ${apartmentMapping.size} apartment mappings`);

    // ============================================
    // MIGRATE PROJECT FLOOR PLANS
    // ============================================
    console.log("\n  📋 Migrating project floor plans...");
    try {
      const oldProjectPlans = await legacy_db("projets_plans").select("*");
      console.log(`  📊 Found ${oldProjectPlans.length} old project floor plans`);

      for (const plan of oldProjectPlans) {
        const newProjectId = projectMapping.get(plan.projet_id);

        if (!newProjectId) {
          totalSkipped++;
          continue;
        }

        try {
          await trx("floor_plans").insert({
            plannable_type: "project",
            plannable_id: newProjectId,
            name: plan.nom || `Plan ${plan.plan_id}`,
            image_url: plan.url_image,
            pdf_url: plan.url_pdf || null,
            display_order: plan.ordre_affichage || 0,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
          totalInserted++;
        } catch (error) {
          console.warn(`  ⚠️  Failed to insert project floor plan`, error);
          totalSkipped++;
        }
      }
      console.log(`  ✓ Inserted ${oldProjectPlans.length - totalSkipped} project floor plans`);
    } catch (error) {
      console.log("  ℹ️  No project floor plans table found");
    }

    // ============================================
    // MIGRATE APARTMENT FLOOR PLANS
    // ============================================
    console.log("\n  🏠 Migrating apartment floor plans...");
    try {
      const oldApartmentPlans = await legacy_db("appartements_plans").select("*");
      console.log(`  📊 Found ${oldApartmentPlans.length} old apartment floor plans`);

      const apartmentPlanStart = totalInserted;
      for (const plan of oldApartmentPlans) {
        const newApartmentId = apartmentMapping.get(plan.appartement_id);

        if (!newApartmentId) {
          totalSkipped++;
          continue;
        }

        try {
          await trx("floor_plans").insert({
            plannable_type: "apartment",
            plannable_id: newApartmentId,
            name: plan.nom || `Plan ${plan.plan_id}`,
            image_url: plan.url_image,
            pdf_url: plan.url_pdf || null,
            display_order: plan.ordre_affichage || 0,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
          totalInserted++;
        } catch (error) {
          console.warn(`  ⚠️  Failed to insert apartment floor plan`, error);
          totalSkipped++;
        }
      }
      console.log(`  ✓ Inserted ${totalInserted - apartmentPlanStart} apartment floor plans`);
    } catch (error) {
      console.log("  ℹ️  No apartment floor plans table found");
    }

    await trx.commit();

    console.log(`\n📐 Floor Plans Migration Summary:`);
    console.log(`  • Total inserted: ${totalInserted}`);
    if (totalSkipped > 0) {
      console.log(`  ⚠️  Skipped: ${totalSkipped}`);
    }
    console.log("✅ Floor plans migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Floor plans migration failed:", error);
    throw error;
  }
}