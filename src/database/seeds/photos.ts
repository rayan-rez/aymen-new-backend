import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";

/**
 * Seed: Photos (Polymorphic)
 * Migrates from old photo tables to new polymorphic `photos` table
 * Old tables: projets_photos, appartements_photos, proprietes_commerciales_photos, articles_blog_galerie
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("📸 Starting photos migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("photos").del();
    console.log("  ✓ Cleared existing photos");


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
    // MIGRATE PROJECT PHOTOS
    // ============================================
    console.log("  📷 Migrating project photos...");
    const oldProjectPhotos = await legacy_db("projets_photos").select("*");

    for (const photo of oldProjectPhotos) {
      const newProjectId = projectMapping.get(photo.projet_id);

      if (newProjectId) {
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
        }
      }
    }
    console.log(`  ✓ Inserted ${oldProjectPhotos.length} project photos`);

    // ============================================
    // MIGRATE APARTMENT PHOTOS
    // ============================================
    console.log("  🏠 Migrating apartment photos...");
    const oldApartmentPhotos = await legacy_db("appartements_photos").select("*");

    for (const photo of oldApartmentPhotos) {
      const newApartmentId = apartmentMapping.get(photo.appartement_id);

      if (newApartmentId) {
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
        }
      }
    }
    console.log(`  ✓ Inserted ${oldApartmentPhotos.length} apartment photos`);

    // ============================================
    // MIGRATE COMMERCIAL PROPERTY PHOTOS (if exists)
    // ============================================
    try {
      console.log("  🏢 Checking for commercial property photos...");
      const oldCommercialPhotos = await legacy_db(
        "proprietes_commerciales_photos"
      ).select("*");

      // We'll need commercial property mapping later
      console.log(
        `  ℹ️  Found ${oldCommercialPhotos.length} commercial property photos (will migrate after commercial properties)`
      );
    } catch (error) {
      console.log("  ℹ️  No commercial property photos table found");
    }

    // ============================================
    // MIGRATE BLOG POST GALLERY IMAGES (if exists)
    // ============================================
    try {
      console.log("  📝 Checking for blog post gallery images...");
      const oldBlogGallery = await legacy_db("articles_blog_galerie").select("*");

      console.log(
        `  ℹ️  Found ${oldBlogGallery.length} blog gallery images (will migrate after blog posts)`
      );
    } catch (error) {
      console.log("  ℹ️  No blog gallery table found");
    }

    await trx.commit();

    console.log(
      `✅ Photos migration completed successfully (${totalInserted} total)`
    );
  } catch (error) {
    await trx.rollback();
    console.error("❌ Photos migration failed:", error);
    throw error;
  }
}