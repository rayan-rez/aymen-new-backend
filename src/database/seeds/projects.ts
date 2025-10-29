import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";


/**
 * Seed: Projects
 * Migrates from old `projets` table to new `projects` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("🏗️  Starting projects migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("project_locations").del();
    await trx("project_features").del();
    await trx("projects").del();
    console.log("  ✓ Cleared existing projects");


    // Fetch old projects
    const oldProjects = await legacy_db("projets").select("*");
    console.log(`  📊 Found ${oldProjects.length} old projects`);

    // Get location mapping
    const locationMapping = new Map<number, number>();
    const locationMappingRows = await trx.raw(
      "SELECT old_id, new_id FROM temp_location_mapping"
    );
    locationMappingRows[0].forEach((row: any) => {
      locationMapping.set(row.old_id, row.new_id);
    });

    // Map old projects to new
    const projectMap = new Map<number, number>();
    let insertedCount = 0;
    let skippedCount = 0;

    for (const project of oldProjects) {
      try {
        // Generate slug from name
        const slug = project.nom
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        // Map status
        let status = "planning";
        if (project.statut === "en_cours") status = "under_construction";
        else if (project.statut === "termine") status = "completed";
        else if (project.statut === "vendu") status = "sold_out";

        // Map location
        const locationId = project.localite_id
          ? locationMapping.get(project.localite_id)
          : null;

        const [newProjectId] = await trx("projects").insert({
          name: project.nom,
          slug: slug || `project-${project.projet_id}`,
          description: project.description || null,
          description_secondary: project.description_secondaire || null,
          address: project.adresse || "N/A",
          map_embed_code: project.code_iframe_maps || null,
          latitude: project.latitude || null,
          longitude: project.longitude || null,
          location_id: locationId,
          status,
          completion_percentage: project.pourcentage_avancement || 0,
          total_blocks: project.nombre_blocs || null,
          main_photo_url: project.photo_principale_url || null,
          contact_form_script: project.script_formulaire_contact || null,
          is_featured: Boolean(project.est_en_vedette),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

        projectMap.set(project.projet_id, newProjectId);
        insertedCount++;
      } catch (error) {
        console.warn(
          `  ⚠️  Failed to insert project: ${project.nom}`,
          error
        );
        skippedCount++;
      }
    }

    console.log(`  ✓ Inserted ${insertedCount} projects`);
    if (skippedCount > 0) {
      console.log(`  ⚠️  Skipped ${skippedCount} projects`);
    }

    // Store mapping for use in other seeders
    await trx.raw(`
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_project_mapping (
        old_id INT PRIMARY KEY,
        new_id INT
      )
    `);

    for (const [oldId, newId] of projectMap.entries()) {
      await trx.raw(
        "INSERT INTO temp_project_mapping (old_id, new_id) VALUES (?, ?)",
        [oldId, newId]
      );
    }

    await trx.commit();

    console.log("✅ Projects migration completed successfully");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Projects migration failed:", error);
    throw error;
  }
}