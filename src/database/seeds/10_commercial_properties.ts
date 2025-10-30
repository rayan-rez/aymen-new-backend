import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Commercial Properties
 * Migrates from old `proprietes_commerciales` table to new `commercial_properties` table
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
    // Check if already seeded (idempotency)
    const existingCount = await trx("commercial_properties").count("* as count").first();
    if (existingCount && Number(existingCount.count) > 0) {
      console.log(`  ℹ️  Found ${existingCount.count} existing commercial properties`);
      console.log("  ⚠️  Table already seeded. Skipping...");
      await trx.commit();
      return;
    }

    // Clear existing data
    await SeederHelper.clearTable(trx, "commercial_properties");
    console.log("  ✓ Cleared existing commercial properties");

    // Get location mapping from previous seeder
    const locationMapping = await SeederHelper.getMapping(trx, "temp_location_mapping");
    console.log(`  📊 Loaded ${locationMapping.size} location mappings`);

    // Fetch old commercial properties
    try {
      const oldCommercialProperties = await legacy_db("proprietes_commerciales").select("*");
      stats.total = oldCommercialProperties.length;
      console.log(`  📊 Found ${stats.total} old commercial properties to migrate`);

      if (stats.total === 0) {
        console.log("  ℹ️  No commercial properties to migrate");
        await trx.commit();
        return;
      }

      const commercialPropertyMap = new Map<number, number>();

      for (const property of oldCommercialProperties) {
        try {
          const slug = SeederHelper.generateSlug(
            property.titre,
            `property-${property.propriete_id}`
          );

          // Map property type
          let propertyType = "office";
          const typeMap: Record<string, string> = {
            boutique: "shop",
            entrepot: "warehouse",
            showroom: "showroom",
            restaurant: "shop", // Map restaurant to shop
            mixte: "mixed_use",
          };
          propertyType = typeMap[property.type_propriete] || "office";

          // Map status
          let status = "available";
          if (property.statut === "loue") status = "rented";
          else if (property.statut === "vendu") status = "sold";

          // Map location
          const locationId = property.localite_id
            ? locationMapping.get(property.localite_id)
            : null;

          const [newPropertyId] = await trx("commercial_properties").insert({
            title: property.titre,
            slug,
            subtitle: property.sous_titre || null,
            description: property.description,
            card_description: property.description_carte || null,
            address: property.adresse || "N/A",
            latitude: property.latitude || null,
            longitude: property.longitude || null,
            location_id: locationId,
            property_type: propertyType,
            area_sqm: property.superficie || null,
            price: property.prix || null,
            status,
            main_image_url: property.url_image_principale || null,
            contact_form_id: property.id_formulaire_contact || null,
            is_featured: Boolean(property.est_en_vedette),
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });

          commercialPropertyMap.set(property.propriete_id, newPropertyId);
          stats.inserted++;
        } catch (error) {
          console.warn(`  ⚠️  Failed: ${property.titre}`, (error as Error).message);
          stats.failed++;
        }
      }

      console.log(`  ✓ Inserted ${stats.inserted} commercial properties`);

      // ============================================
      // MIGRATE COMMERCIAL PROPERTY PHOTOS
      // ============================================
      console.log("\n  📷 Migrating commercial property photos...");
      try {
        const oldCommercialPhotos = await legacy_db("proprietes_commerciales_photos").select("*");
        console.log(`  📊 Found ${oldCommercialPhotos.length} commercial property photos`);

        for (const photo of oldCommercialPhotos) {
          const newPropertyId = commercialPropertyMap.get(photo.propriete_id);

          if (newPropertyId) {
            try {
              await trx("photos").insert({
                photoable_type: "commercial_property",
                photoable_id: newPropertyId,
                url: photo.url,
                external_url: photo.url_externe || null,
                caption: photo.legende || null,
                display_order: photo.ordre_affichage || 0,
                is_cover: Boolean(photo.est_photo_couverture),
                created_at: trx.fn.now(),
                updated_at: trx.fn.now(),
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
      console.log("  ℹ️  No commercial properties table found in old database");
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