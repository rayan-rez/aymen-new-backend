import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";

/**
 * Seed: Floor Plans (Polymorphic)
 * Migrates from old floor plan tables to new polymorphic `floor_plans` table
 * Old tables: projets_plans, appartements_plans
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("📐 Starting floor plans migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("floor_plans").del();
    console.log("  ✓ Cleared existing floor plans");


    // Get mappings
    const projectMapping = new Map<number, number>();
    const projectMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_project_mapping"
    );
    projectMappingRows[0].forEach((row: any) => {
      projectMapping.set(row.old_id, row.new_id);
    });

    const apartmentMapping = new Map<number, number>();
    const apartmentMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_apartment_mapping"
    );
    apartmentMappingRows[0].forEach((row: any) => {
      apartmentMapping.set(row.old_id, row.new_id);
    });

    let totalInserted = 0;

    // ============================================
    // MIGRATE PROJECT FLOOR PLANS
    // ============================================
    console.log("  📋 Migrating project floor plans...");
    try {
      const oldProjectPlans = await legacy_db("projets_plans").select("*");

      for (const plan of oldProjectPlans) {
        const newProjectId = projectMapping.get(plan.projet_id);

        if (newProjectId) {
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
          }
        }
      }
      console.log(`  ✓ Inserted ${oldProjectPlans.length} project floor plans`);
    } catch (error) {
      console.log("  ℹ️  No project floor plans table found");
    }

    // ============================================
    // MIGRATE APARTMENT FLOOR PLANS
    // ============================================
    console.log("  🏠 Migrating apartment floor plans...");
    try {
      const oldApartmentPlans = await legacy_db("appartements_plans").select("*");

      for (const plan of oldApartmentPlans) {
        const newApartmentId = apartmentMapping.get(plan.appartement_id);

        if (newApartmentId) {
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
          }
        }
      }
      console.log(
        `  ✓ Inserted ${oldApartmentPlans.length} apartment floor plans`
      );
    } catch (error) {
      console.log("  ℹ️  No apartment floor plans table found");
    }

    await trx.commit();

    console.log(
      `✅ Floor plans migration completed successfully (${totalInserted} total)`
    );
  } catch (error) {
    await trx.rollback();
    console.error("❌ Floor plans migration failed:", error);
    throw error;
  }
}