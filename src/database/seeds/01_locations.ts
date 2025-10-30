import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Locations
 * Migrates from old `localites` table to new `locations` table
 * Creates hierarchical location structure: Country > Region > City
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n🌍 Starting locations migration...");
  console.log("=====================================");

  // Validate legacy DB config
  try {
    SeederHelper.validateLegacyDbConfig();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log("\nℹ️  Skipping seeder - legacy database not configured");
    return;
  }

  const trx = await knex.transaction();
  const stats: MigrationStats = {
    total: 0,
    inserted: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // Check if already seeded (idempotency)
    const existingCount = await trx("locations").count("* as count").first();
    if (existingCount && Number(existingCount.count) > 0) {
      console.log(`  ℹ️  Found ${existingCount.count} existing locations`);
      console.log("  ⚠️  Table already seeded. Skipping...");
      console.log("  💡 To reseed: delete existing data first");
      await trx.commit();
      return;
    }

    // Clear existing data (if re-running)
    await SeederHelper.clearTable(trx, "project_locations");
    await SeederHelper.clearTable(trx, "locations");
    console.log("  ✓ Cleared existing locations");

    // Fetch old locations
    const oldLocalites = await legacy_db("localites").select("*");
    stats.total = oldLocalites.length;
    console.log(`  📊 Found ${stats.total} old locations to migrate`);

    if (stats.total === 0) {
      console.log("  ℹ️  No locations to migrate");
      await trx.commit();
      return;
    }

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
    console.log("  ✓ Created root location: Algérie");

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
    console.log("  ✓ Created Alger region");

    // Map old localites to new locations
    const locationMap = new Map<number, number>();

    for (const localite of oldLocalites) {
      try {
        const slug = SeederHelper.generateSlug(
          localite.name,
          `location-${localite.localite_id}`
        );

        const [newLocationId] = await trx("locations").insert({
          name: localite.name,
          slug,
          parent_id: algerRegionId,
          type: "city",
          display_order: stats.inserted,
          is_active: true,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

        locationMap.set(localite.localite_id, newLocationId);
        stats.inserted++;
      } catch (error) {
        console.warn(
          `  ⚠️  Failed: ${localite.name}`,
          (error as Error).message
        );
        stats.failed++;
      }
    }

    // Store mapping for use in other seeders
    await SeederHelper.storeMapping(trx, "temp_location_mapping", locationMap);

    await trx.commit();

    SeederHelper.logProgress("Locations", stats, "🌍");
    console.log("✅ Locations migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Locations migration failed:", error);
    throw error;
  }
}
