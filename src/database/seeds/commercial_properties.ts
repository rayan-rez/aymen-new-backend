import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";

/**
 * Seed: Commercial Properties
 * Migrates from old `proprietes_commerciales` table to new `commercial_properties` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("🏢 Starting commercial properties migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("commercial_properties").del();
    console.log("  ✓ Cleared existing commercial properties");


    // Get location mapping
    const locationMapping = new Map<number, number>();
    const locationMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_location_mapping"
    );
    locationMappingRows[0].forEach((row: any) => {
      locationMapping.set(row.old_id, row.new_id);
    });

    // Fetch old commercial properties
    try {
      const oldCommercialProperties = await legacy_db(
        "proprietes_commerciales"
      ).select("*");
      console.log(
        `  📊 Found ${oldCommercialProperties.length} old commercial properties`
      );

      const commercialPropertyMap = new Map<number, number>();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const property of oldCommercialProperties) {
        try {
          // Generate slug
          const slug = property.titre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          // Map property type
          let propertyType = "office";
          if (property.type_propriete === "boutique") propertyType = "shop";
          else if (property.type_propriete === "entrepot")
            propertyType = "warehouse";
          else if (property.type_propriete === "showroom")
            propertyType = "showroom";
          else if (property.type_propriete === "restaurant")
            propertyType = "restaurant";
          else if (property.type_propriete === "mixte")
            propertyType = "mixed_use";

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
            slug: slug || `property-${property.propriete_id}`,
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
          insertedCount++;
        } catch (error) {
          console.warn(
            `  ⚠️  Failed to insert commercial property: ${property.titre}`,
            error
          );
          skippedCount++;
        }
      }

      console.log(`  ✓ Inserted ${insertedCount} commercial properties`);
      if (skippedCount > 0) {
        console.log(`  ⚠️  Skipped ${skippedCount} commercial properties`);
      }

      // ============================================
      // MIGRATE COMMERCIAL PROPERTY PHOTOS
      // ============================================
      try {
        const oldCommercialPhotos = await legacy_db(
          "proprietes_commerciales_photos"
        ).select("*");
        console.log(
          `  📷 Found ${oldCommercialPhotos.length} commercial property photos`
        );

        let photoCount = 0;
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
              console.warn(
                `  ⚠️  Failed to insert commercial property photo`,
                error
              );
            }
          }
        }
        console.log(`  ✓ Inserted ${photoCount} commercial property photos`);
      } catch (error) {
        console.log("  ℹ️  No commercial property photos table found");
      }

      // Store mapping
      await trx.raw(`
        CREATE TEMPORARY TABLE IF NOT EXISTS temp_commercial_property_mapping (
          old_id INT PRIMARY KEY,
          new_id INT
        )
      `);

      for (const [oldId, newId] of commercialPropertyMap.entries()) {
        await trx.raw(
          "INSERT INTO temp_commercial_property_mapping (old_id, new_id) VALUES (?, ?)",
          [oldId, newId]
        );
      }
    } catch (error) {
      console.log(
        "  ℹ️  No commercial properties table found in old database"
      );
    }

    await trx.commit();

    console.log("✅ Commercial properties migration completed successfully");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Commercial properties migration failed:", error);
    throw error;
  }
}