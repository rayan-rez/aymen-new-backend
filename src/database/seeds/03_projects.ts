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
        // FIX: Use correct field names from old database
        const projectName = project.nom_projet || project.nom || `Projet ${project.id}`;
        
        const slug = SeederHelper.generateSlug(
          projectName,
          `project-${project.id}`
        );

        // Map status
        let status = "planning";
        if (project.statut === "en_cours" || project.statut === "under_construction") {
          status = "under_construction";
        } else if (project.statut === "termine" || project.statut === "completed") {
          status = "completed";
        } else if (project.statut === "vendu" || project.statut === "sold_out") {
          status = "sold_out";
        }

        // Map location - try multiple possible field names
        let locationId = null;
        if (project.localite_id) {
          locationId = locationMapping.get(project.localite_id);
        } else if (project.location_id) {
          locationId = locationMapping.get(project.location_id);
        }

        // Build insert object with proper field mappings
        const insertData: any = {
          name: projectName,
          slug,
          description: project.description || null,
          description_secondary: project.description2 || project.description_secondary || null,
          address: project.adresse || "N/A",
          latitude: project.latitude || null,
          longitude: project.longitude || null,
          location_id: locationId,
          status,
          completion_percentage: project.etat_avance || project.completion_percentage || 0,
          total_blocks: project.blocs || project.total_blocks || null,
          main_photo_url: project.photo || project.main_photo_url || null,
          contact_form_script: project.script_form || project.contact_form_script || null,
          is_featured: false, // Default to false as old DB doesn't have this field
          created_at: project.created_at || trx.fn.now(),
          updated_at: project.updated_at || trx.fn.now(),
        };

        const [newProjectId] = await trx("projects").insert(insertData);

        projectMap.set(project.id, newProjectId);
        stats.inserted++;
        
        console.log(`  ✓ Inserted: ${projectName}`);
      } catch (error) {
        console.warn(`  ⚠️  Failed: ${project.nom_projet || project.nom || project.id}`, (error as Error).message);
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