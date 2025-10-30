import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Projects
 * Migrates from old `projets` table to new `projects` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n🏗️  Starting projects migration...");
  console.log("===================================");

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
    // Check if already seeded (idempotency)
    const existingCount = await trx("projects").count("* as count").first();
    if (existingCount && Number(existingCount.count) > 0) {
      console.log(`  ℹ️  Found ${existingCount.count} existing projects`);
      console.log("  ⚠️  Table already seeded. Skipping...");
      await trx.commit();
      return;
    }

    // Clear existing data (FK order matters!)
    await SeederHelper.clearTable(trx, "project_locations");
    await SeederHelper.clearTable(trx, "project_features");
    await SeederHelper.clearTable(trx, "projects");
    console.log("  ✓ Cleared existing projects");

    // Get location mapping from previous seeder
    const locationMapping = await SeederHelper.getMapping(trx, "temp_location_mapping");

    // Fetch old projects
    const oldProjects = await legacy_db("projets").select("*");
    stats.total = oldProjects.length;
    console.log(`  📊 Found ${stats.total} old projects to migrate`);

    if (stats.total === 0) {
      console.log("  ℹ️  No projects to migrate");
      await trx.commit();
      return;
    }

    // Map old projects to new
    const projectMap = new Map<number, number>();

    for (const project of oldProjects) {
      try {
        const slug = SeederHelper.generateSlug(
          project.nom,
          `project-${project.projet_id}`
        );

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
          slug,
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
        stats.inserted++;
      } catch (error) {
        console.warn(`  ⚠️  Failed: ${project.nom}`, (error as Error).message);
        stats.failed++;
      }
    }

    // Store mapping
    await SeederHelper.storeMapping(trx, "temp_project_mapping", projectMap);

    await trx.commit();

    SeederHelper.logProgress("Projects", stats, "🏗️");
    console.log("✅ Projects migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Projects migration failed:", error);
    throw error;
  }
}