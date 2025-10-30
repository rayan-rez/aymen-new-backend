import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Commercial Properties
 * Migrates from old `locaux` table (not proprietes_commerciales!)
 * to new `commercial_properties` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n🏢 Starting commercial properties migration...");
  console.log("===============================================");

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
  let photoCount = 0;

  try {
    // Clear existing data
    await SeederHelper.clearTable(trx, "commercial_properties");
    console.log("  ✓ Cleared existing commercial properties");

    // Get location mapping from previous seeder
    const locationMapping = await SeederHelper.getMapping(trx, "temp_location_mapping");
    console.log(`  📊 Loaded ${locationMapping.size} location mappings`);

    // ============================================
    // MIGRATE FROM `locaux` TABLE
    // ============================================
    try {
      const oldLocaux = await legacy_db("locaux").select("*");
      stats.total = oldLocaux.length;
      console.log(`  📊 Found ${stats.total} old commercial properties (locaux) to migrate`);

      if (stats.total === 0) {
        console.log("  ℹ️  No commercial properties to migrate");
        await trx.commit();
        return;
      }

      const commercialPropertyMap = new Map<number, number>();

      for (const local of oldLocaux) {
        try {
          const slug = local.slug || SeederHelper.generateSlug(
            local.titre,
            `property-${local.id}`
          );

          // Determine property type (default to office)
          let propertyType = "office";
          const titre = (local.titre || "").toLowerCase();
          if (titre.includes("boutique") || titre.includes("commerce")) {
            propertyType = "shop";
          } else if (titre.includes("entrepôt") || titre.includes("depot")) {
            propertyType = "warehouse";
          } else if (titre.includes("showroom")) {
            propertyType = "showroom";
          }

          // Parse surface/area - might be string like "90 m²"
          let areaSqm = null;
          if (local.surface) {
            const surfaceMatch = String(local.surface).match(/(\d+\.?\d*)/);
            areaSqm = surfaceMatch ? parseFloat(surfaceMatch[1]) : null;
          }

          // Map location - old table doesn't have location_id, so skip
          let locationId = null;

          const [newPropertyId] = await trx("commercial_properties").insert({
            title: local.titre || `Local ${local.id}`,
            slug,
            subtitle: local.sous_titre || null,
            description: local.description || "Commercial property",
            card_description: local.desc_card || null,
            address: local.adresse || "N/A",
            latitude: local.latitude || null,
            longitude: local.longitude || null,
            location_id: locationId,
            property_type: propertyType,
            area_sqm: areaSqm,
            price: null, // Old table doesn't have price
            status: "available",
            main_image_url: local.image_path || null,
            contact_form_id: local.formId || null,
            is_featured: false,
            created_at: local.created_at || trx.fn.now(),
            updated_at: local.updated_at || trx.fn.now(),
          });

          commercialPropertyMap.set(local.id, newPropertyId);
          stats.inserted++;
        } catch (error) {
          console.warn(`  ⚠️  Failed: ${local.titre || local.id}`, (error as Error).message);
          stats.failed++;
        }
      }

      console.log(`  ✓ Inserted ${stats.inserted} commercial properties`);

      // ============================================
      // MIGRATE COMMERCIAL PROPERTY PHOTOS FROM `photos_locaux`
      // ============================================
      console.log("\n  📷 Migrating commercial property photos...");
      try {
        const oldLocalPhotos = await legacy_db("photos_locaux").select("*");
        console.log(`  📊 Found ${oldLocalPhotos.length} commercial property photos`);

        for (const photo of oldLocalPhotos) {
          const newPropertyId = commercialPropertyMap.get(photo.local_id);

          if (newPropertyId && photo.url) {
            try {
              await trx("photos").insert({
                photoable_type: "commercial_property",
                photoable_id: newPropertyId,
                url: photo.url,
                external_url: null,
                caption: null,
                display_order: 0,
                is_cover: false,
                created_at: photo.created_at || trx.fn.now(),
                updated_at: photo.updated_at || trx.fn.now(),
              });
              photoCount++;
            } catch (error) {
              console.warn(`  ⚠️  Failed to insert commercial property photo`, error);
            }
          }
        }
        console.log(`  ✓ Inserted ${photoCount} commercial property photos`);
      } catch (error) {
        console.log("  ℹ️  No commercial property photos table found");
      }

      // Store mapping
      await SeederHelper.storeMapping(
        trx,
        "temp_commercial_property_mapping",
        commercialPropertyMap
      );
    } catch (error) {
      console.log("  ℹ️  No locaux table found in old database");
    }

    await trx.commit();

    console.log(`\n🏢 Commercial Properties Migration Summary:`);
    console.log(`  • Properties: ${stats.inserted}`);
    console.log(`  • Photos: ${photoCount}`);
    if (stats.failed > 0) {
      console.log(`  ⚠️  Failed: ${stats.failed}`);
    }
    console.log("✅ Commercial properties migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Commercial properties migration failed:", error);
    throw error;
  } finally {
    // Cleanup: Destroy legacy DB connection
    await legacy_db.destroy();
  }
}