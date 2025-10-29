import _knex, { Knex } from "knex";

/**
 * Seed: Locations
 * Migrates from old `localites` table to new `locations` table
 * Creates a hierarchical location structure
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("🌍 Starting locations migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("project_locations").del();
    await trx("locations").del();
    console.log("  ✓ Cleared existing locations");

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

    // Fetch old locations
    const oldLocalites = await oldDb("localites").select("*");
    console.log(`  📊 Found ${oldLocalites.length} old locations`);

    // Create Algeria as root location
    const [algeriaId] = await trx("locations").insert({
      name: "Algérie",
      slug: "algerie",
      parent_id: null,
      type: "country",
      display_order: 0,
      is_active: true,
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    });

    // Create Alger region
    const [algerRegionId] = await trx("locations").insert({
      name: "Alger",
      slug: "alger",
      parent_id: algeriaId,
      type: "region",
      display_order: 0,
      is_active: true,
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    });

    // Map old localites to new locations
    const locationMap = new Map<number, number>();
    let insertedCount = 0;

    for (const localite of oldLocalites) {
      try {
        // Generate slug from name
        const slug = localite.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        // Determine type (most are neighborhoods/cities)
        const locationType = "city"; // Default to city

        const [newLocationId] = await trx("locations").insert({
          name: localite.name,
          slug: slug || `location-${localite.localite_id}`,
          parent_id: algerRegionId, // All under Alger region
          type: locationType,
          display_order: insertedCount,
          is_active: true,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

        locationMap.set(localite.localite_id, newLocationId);
        insertedCount++;
      } catch (error) {
        console.warn(
          `  ⚠️  Failed to insert location: ${localite.name}`,
          error
        );
      }
    }

    console.log(`  ✓ Inserted ${insertedCount} locations`);

    // Store mapping for use in other seeders
    await trx.raw(`
      CREATE TEMPORARY TABLE IF NOT EXISTS temp_location_mapping (
        old_id INT PRIMARY KEY,
        new_id INT
      )
    `);

    for (const [oldId, newId] of locationMap.entries()) {
      await trx.raw(
        "INSERT INTO temp_location_mapping (old_id, new_id) VALUES (?, ?)",
        [oldId, newId]
      );
    }

    await oldDb.destroy();
    await trx.commit();

    console.log("✅ Locations migration completed successfully");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Locations migration failed:", error);
    throw error;
  }
}