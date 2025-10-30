import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Apartments
 * Migrates from old `appartements` table to new `apartments` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n🏠 Starting apartments migration...");
  console.log("====================================");

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

  try {
    // Clear existing data
    await SeederHelper.clearTable(trx, "apartments");
    console.log("  ✓ Cleared existing apartments");

    // Get project mapping from previous seeder
    const projectMapping = await SeederHelper.getMapping(trx, "temp_project_mapping");
    console.log(`  📊 Loaded ${projectMapping.size} project mappings`);

    // Fetch old apartments
    const oldApartments = await legacy_db("appartements").select("*");
    stats.total = oldApartments.length;
    console.log(`  📊 Found ${stats.total} old apartments to migrate`);

    if (stats.total === 0) {
      console.log("  ℹ️  No apartments to migrate");
      await trx.commit();
      return;
    }

    // Map old apartments to new
    const apartmentMap = new Map<number, number>();

    for (const apartment of oldApartments) {
      try {
        const newProjectId = projectMapping.get(apartment.projet_id);

        if (!newProjectId) {
          console.warn(`  ⚠️  Skipping ${apartment.nom_appartement || apartment.id} - project not found (projet_id: ${apartment.projet_id})`);
          stats.skipped++;
          continue;
        }

        // Map status (old DB might not have status field)
        let status = "available";
        if (apartment.statut === "reserve" || apartment.statut === "reserved") {
          status = "reserved";
        } else if (apartment.statut === "vendu" || apartment.statut === "sold") {
          status = "sold";
        }

        // Parse surface/area - might be string like "90 m²"
        let areaSqm = null;
        if (apartment.surface) {
          const surfaceMatch = String(apartment.surface).match(/(\d+\.?\d*)/);
          areaSqm = surfaceMatch ? parseFloat(surfaceMatch[1]) : null;
        }

        const insertData: any = {
          project_id: newProjectId,
          name: apartment.nom_appartement || `Appartement ${apartment.id}`,
          title: apartment.titre || null,
          subtitle: apartment.sous_titre || null,
          description: apartment.text || apartment.description || null,
          area_sqm: areaSqm,
          bedrooms: apartment.nombre_chambres || null,
          bathrooms: apartment.nombre_salles_bain || null,
          price: apartment.prix || null,
          status,
          is_model_unit: Boolean(apartment.is_temoin),
          virtual_tour_url: apartment.visite_virtuelle || null,
          created_at: apartment.created_at || trx.fn.now(),
          updated_at: apartment.updated_at || trx.fn.now(),
        };

        const [newApartmentId] = await trx("apartments").insert(insertData);

        apartmentMap.set(apartment.id, newApartmentId);
        stats.inserted++;
      } catch (error) {
        console.warn(`  ⚠️  Failed: ${apartment.nom_appartement || apartment.id}`, (error as Error).message);
        stats.failed++;
      }
    }

    // Store mapping
    await SeederHelper.storeMapping(trx, "temp_apartment_mapping", apartmentMap);

    await trx.commit();

    SeederHelper.logProgress("Apartments", stats, "🏠");
    console.log("✅ Apartments migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Apartments migration failed:", error);
    throw error;
  }
}