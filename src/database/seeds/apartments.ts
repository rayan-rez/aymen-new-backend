import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";

/**
 * Seed: Apartments
 * Migrates from old `appartements` table to new `apartments` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("🏠 Starting apartments migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("apartments").del();
    console.log("  ✓ Cleared existing apartments");

    // Fetch old apartments
    const oldApartments = await legacy_db("appartements").select("*");
    console.log(`  📊 Found ${oldApartments.length} old apartments`);

    // Get project mapping
    const projectMapping = new Map<number, number>();
    const projectMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_project_mapping"
    );
    projectMappingRows[0].forEach((row: any) => {
      projectMapping.set(row.old_id, row.new_id);
    });

    // Map old apartments to new
    const apartmentMap = new Map<number, number>();
    let insertedCount = 0;
    let skippedCount = 0;

    for (const apartment of oldApartments) {
      try {
        const newProjectId = projectMapping.get(apartment.projet_id);

        if (!newProjectId) {
          console.warn(
            `  ⚠️  Skipping apartment ${apartment.nom} - project not found`
          );
          skippedCount++;
          continue;
        }

        // Map status
        let status = "available";
        if (apartment.statut === "reserve") status = "reserved";
        else if (apartment.statut === "vendu") status = "sold";

        const [newApartmentId] = await trx("apartments").insert({
          project_id: newProjectId,
          name: apartment.nom,
          title: apartment.titre || null,
          subtitle: apartment.sous_titre || null,
          description: apartment.description || null,
          area_sqm: apartment.superficie || null,
          bedrooms: apartment.nombre_chambres || null,
          bathrooms: apartment.nombre_salles_bain || null,
          price: apartment.prix || null,
          status,
          is_model_unit: Boolean(apartment.est_appartement_temoin),
          virtual_tour_url: apartment.url_visite_virtuelle || null,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

        apartmentMap.set(apartment.appartement_id, newApartmentId);
        insertedCount++;
      } catch (error) {
        console.warn(
          `  ⚠️  Failed to insert apartment: ${apartment.nom}`,
          error
        );
        skippedCount++;
      }
    }

    console.log(`  ✓ Inserted ${insertedCount} apartments`);
    if (skippedCount > 0) {
      console.log(`  ⚠️  Skipped ${skippedCount} apartments`);
    }

    // Store mapping for use in other seeders
    await trx.raw(`
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_apartment_mapping (
        old_id INT PRIMARY KEY,
        new_id INT
      )
    `);

    for (const [oldId, newId] of apartmentMap.entries()) {
      await trx.raw(
        "INSERT INTO temp_apartment_mapping (old_id, new_id) VALUES (?, ?)",
        [oldId, newId]
      );
    }

    await trx.commit();

    console.log("✅ Apartments migration completed successfully");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Apartments migration failed:", error);
    throw error;
  }
}