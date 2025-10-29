import _knex, { Knex } from "knex";

/**
 * Seed: Features
 * Migrates from old `caracteristiques_projets` table to new `features` table
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("🎯 Starting features migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("project_features").del();
    await trx("features").del();
    console.log("  ✓ Cleared existing features");

    // Connect to old database
    const oldDb = _knex({
      client: "mysql2",
      connection: {
        host: process.env.OLD_DB_HOST || "127.0.0.1",
        port: Number(process.env.OLD_DB_PORT) || 3306,
        user: process.env.OLD_DB_USER || "root",
        password: process.env.OLD_DB_PASSWORD || "",
        database: process.env.OLD_DB_NAME || "aymen-database",
      },
    });

    // Fetch old features
    const oldFeatures = await oldDb("caracteristiques_projets").select("*");
    console.log(`  📊 Found ${oldFeatures.length} old features`);

    // Category mapping helper
    const categorizeFeature = (name: string): string => {
      const lowerName = name.toLowerCase();
      if (
        lowerName.includes("piscine") ||
        lowerName.includes("gym") ||
        lowerName.includes("spa") ||
        lowerName.includes("jardin")
      ) {
        return "leisure";
      }
      if (
        lowerName.includes("sécurité") ||
        lowerName.includes("gardien") ||
        lowerName.includes("surveillance")
      ) {
        return "security";
      }
      if (
        lowerName.includes("parking") ||
        lowerName.includes("transport") ||
        lowerName.includes("métro")
      ) {
        return "transport";
      }
      return "amenity";
    };

    // Map old features to new
    const featureMap = new Map<number, number>();
    let insertedCount = 0;

    for (const feature of oldFeatures) {
      try {
        // Generate slug
        const slug = feature.nom_caracteristique
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        const category = categorizeFeature(feature.nom_caracteristique);

        const [newFeatureId] = await trx("features").insert({
          name: feature.nom_caracteristique,
          slug: slug || `feature-${feature.id}`,
          icon: feature.url || null,
          category,
          display_order: insertedCount,
          is_active: true,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

        featureMap.set(feature.id, newFeatureId);
        insertedCount++;
      } catch (error) {
        console.warn(
          `  ⚠️  Failed to insert feature: ${feature.nom_caracteristique}`,
          error
        );
      }
    }

    console.log(`  ✓ Inserted ${insertedCount} features`);

    // Store mapping
    await trx.raw(`
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_feature_mapping (
        old_id INT PRIMARY KEY,
        new_id INT
      )
    `);

    for (const [oldId, newId] of featureMap.entries()) {
      await trx.raw(
        "INSERT INTO temp_feature_mapping (old_id, new_id) VALUES (?, ?)",
        [oldId, newId]
      );
    }

    await oldDb.destroy();
    await trx.commit();

    console.log("✅ Features migration completed successfully");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Features migration failed:", error);
    throw error;
  }
}
