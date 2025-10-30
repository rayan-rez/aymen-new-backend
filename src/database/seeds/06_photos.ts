import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper } from "../seed-helpers";

/**
 * Seed: Photos (Polymorphic)
 * Migrates from old photo tables to new polymorphic `photos` table
 * Old tables: projets_photos, appartements_photos
 * Note: Commercial property and blog photos migrated in their respective seeders
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n📸 Starting photos migration...");
  console.log("=================================");

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
    const existingCount = await trx("photos")
      .whereIn("photoable_type", ["project", "apartment"])
      .count("* as count")
      .first();
    
    if (existingCount && Number(existingCount.count) > 0) {
      console.log(`  ℹ️  Found ${existingCount.count} existing project/apartment photos`);
      console.log("  ⚠️  Table already seeded. Skipping...");
      await trx.commit();
      return;
    }

    // Get mappings from previous seeders
    const projectMapping = await SeederHelper.getMapping(trx, "temp_project_mapping");
    const apartmentMapping = await SeederHelper.getMapping(trx, "temp_apartment_mapping");

    console.log(`  📊 Loaded ${projectMapping.size} project mappings`);
    console.log(`  📊 Loaded ${apartmentMapping.size} apartment mappings`);

    // ============================================
    // MIGRATE PROJECT PHOTOS
    // ============================================
    console.log("\n  📷 Migrating project photos...");
    const oldProjectPhotos = await legacy_db("photos_projets").select("*");
    console.log(`  📊 Found ${oldProjectPhotos.length} old project photos`);

    for (const photo of oldProjectPhotos) {
      const newProjectId = projectMapping.get(photo.projet_id);

      if (!newProjectId) {
        totalSkipped++;
        continue;
      }

      try {
        await trx("photos").insert({
          photoable_type: "project",
          photoable_id: newProjectId,
          url: photo.url,
          external_url: photo.url_externe || null,
          caption: photo.legende || null,
          display_order: photo.ordre_affichage || 0,
          is_cover: Boolean(photo.est_photo_couverture),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
        totalInserted++;
      } catch (error) {
        console.warn(`  ⚠️  Failed to insert project photo`, error);
        totalSkipped++;
      }
    }
    console.log(`  ✓ Inserted ${oldProjectPhotos.length - totalSkipped} project photos`);

    // ============================================
    // MIGRATE APARTMENT PHOTOS
    // ============================================
    console.log("\n  🏠 Migrating apartment photos...");
    const oldApartmentPhotos = await legacy_db("photos_appartements").select("*");
    console.log(`  📊 Found ${oldApartmentPhotos.length} old apartment photos`);

    const apartmentPhotoStart = totalInserted;
    for (const photo of oldApartmentPhotos) {
      const newApartmentId = apartmentMapping.get(photo.appartement_id);

      if (!newApartmentId) {
        totalSkipped++;
        continue;
      }

      try {
        await trx("photos").insert({
          photoable_type: "apartment",
          photoable_id: newApartmentId,
          url: photo.url,
          external_url: photo.url_externe || null,
          caption: photo.legende || null,
          display_order: photo.ordre_affichage || 0,
          is_cover: Boolean(photo.est_photo_couverture),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
        totalInserted++;
      } catch (error) {
        console.warn(`  ⚠️  Failed to insert apartment photo`, error);
        totalSkipped++;
      }
    }
    console.log(`  ✓ Inserted ${totalInserted - apartmentPhotoStart} apartment photos`);

    await trx.commit();

    console.log(`\n📸 Photos Migration Summary:`);
    console.log(`  • Total inserted: ${totalInserted}`);
    if (totalSkipped > 0) {
      console.log(`  ⚠️  Skipped: ${totalSkipped}`);
    }
    console.log("✅ Photos migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Photos migration failed:", error);
    throw error;
  }
}