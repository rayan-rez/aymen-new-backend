import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";

/**
 * Seed: Virtual Tours
 * Migrates from old `projets_visites_virtuelles` table to new `virtual_tours` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("🎥 Starting virtual tours migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("virtual_tours").del();
    console.log("  ✓ Cleared existing virtual tours");


    // Get project mapping
    const projectMapping = new Map<number, number>();
    const projectMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_project_mapping"
    );
    projectMappingRows[0].forEach((row: any) => {
      projectMapping.set(row.old_id, row.new_id);
    });

    // Fetch old virtual tours
    try {
      const oldVirtualTours = await legacy_db("projets_visites_virtuelles").select(
        "*"
      );
      console.log(`  📊 Found ${oldVirtualTours.length} old virtual tours`);

      let insertedCount = 0;
      let skippedCount = 0;

      for (const tour of oldVirtualTours) {
        const newProjectId = projectMapping.get(tour.projet_id);

        if (!newProjectId) {
          skippedCount++;
          continue;
        }

        try {
          await trx("virtual_tours").insert({
            project_id: newProjectId,
            url: tour.url,
            description: tour.description || null,
            thumbnail_url: tour.url_miniature || null,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
          insertedCount++;
        } catch (error) {
          console.warn(`  ⚠️  Failed to insert virtual tour`, error);
          skippedCount++;
        }
      }

      console.log(`  ✓ Inserted ${insertedCount} virtual tours`);
      if (skippedCount > 0) {
        console.log(`  ⚠️  Skipped ${skippedCount} virtual tours`);
      }
    } catch (error) {
      console.log("  ℹ️  No virtual tours table found in old database");
    }

    await trx.commit();

    console.log("✅ Virtual tours migration completed successfully");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Virtual tours migration failed:", error);
    throw error;
  }
}