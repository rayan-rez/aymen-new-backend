// src/database/seeds/locations.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  generateSlug,
  sanitizeString,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyLocation {
  localite_id: number;
  name: string;
  localite_description: string | null;
  localisation: string | null;
  form: string | null;
}

interface NewLocation {
  name: string;
  slug: string;
  parent_id: number | null;
  depth: number;
  type: "country" | "region" | "city" | "neighborhood";
  display_order: number;
  is_active: boolean;
}

// ============================================================================
// LOCATION MAPPING
// ============================================================================

/**
 * Map legacy location names to hierarchical structure
 * Algiers → Algeria > Algiers Region > City
 */
const LOCATION_HIERARCHY: Record<
  string,
  { type: "region" | "city"; parentName?: string }
> = {
  hydra: { type: "city", parentName: "Algiers" },
  birkhadem: { type: "city", parentName: "Algiers" },
  "dely-ibrahim": { type: "city", parentName: "Algiers" },
  "el-achour": { type: "city", parentName: "Algiers" },
  draria: { type: "city", parentName: "Algiers" },
  "dar-el-beida": { type: "city", parentName: "Algiers" },
  "oued-romane": { type: "city", parentName: "Algiers" },
  sebala: { type: "city", parentName: "Algiers" },
};

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformLocation(
  legacy: LegacyLocation,
  algiersRegionId: number,
  existingSlugs: Set<string>
): Promise<TransformResult<NewLocation>> {
  try {
    // Clean name
    const name = sanitizeString(legacy.name);
    if (!name) {
      return { data: null, skip: true, error: "Empty location name" };
    }

    // Generate slug
    let baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    existingSlugs.add(slug);

    // Determine hierarchy
    const hierarchyInfo = LOCATION_HIERARCHY[slug];
    const type = hierarchyInfo?.type || "city";
    const parentId = type === "city" ? algiersRegionId : null;
    const depth = type === "city" ? 2 : type === "region" ? 1 : 0;

    return {
      data: {
        name,
        slug,
        parent_id: parentId,
        depth,
        type,
        display_order: 0,
        is_active: true,
      },
      skip: false,
    };
  } catch (error: any) {
    return {
      data: null,
      skip: false,
      error: `Transform failed: ${error.message}`,
    };
  }
}

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seed(knex: Knex): Promise<void> {
  console.log("\n🌍 Starting Locations Migration...\n");

  // CRITICAL FIX: Temporarily drop trigger to prevent interference
  await knex.raw('DROP TRIGGER IF EXISTS trg_locations_path_consistency');
  console.log("✓ Temporarily dropped path consistency trigger");

  await clearTable(knex, "locations");
  console.log("✓ Cleared locations table");

  // Create hierarchy manually without trigger
  await knex.raw(`SET @disable_triggers = 1`);

  const [algeriaResult] = await knex("locations").insert({
    name: "Algeria",
    slug: "algeria",
    parent_id: null,
    path: '/1/',
    depth: 0,
    type: "country",
    display_order: 0,
    is_active: true,
  });
  const algeriaId = typeof algeriaResult === "number" ? algeriaResult : (algeriaResult as any).insertId || 1;

  const [algiersResult] = await knex("locations").insert({
    name: "Algiers",
    slug: "algiers",
    parent_id: algeriaId,
    path: `/${algeriaId}/2/`,
    depth: 1,
    type: "region",
    display_order: 0,
    is_active: true,
  });
  const algiersRegionId = typeof algiersResult === "number" ? algiersResult : (algiersResult as any).insertId || 2;

  await knex.raw(`SET @disable_triggers = 0`);
  console.log(`✓ Created root location: Algeria (ID: ${algeriaId})`);
  console.log(`✓ Created region: Algiers (ID: ${algiersRegionId})`);

  // Process legacy locations
  const legacyLocations = await fetchLegacyRecords<LegacyLocation>("localites");
  console.log(`✓ Fetched ${legacyLocations.length} legacy locations\n`);

  if (legacyLocations.length === 0) {
    console.log("⊗ No legacy locations found, skipping migration\n");
    await recreateTrigger(knex);
    return;
  }

  const existingSlugs = new Set<string>(["algeria", "algiers"]);
  const stats = await processBatch(
    legacyLocations,
    (record) => transformLocation(record, algiersRegionId, existingSlugs),
    async (batch) => {
      await knex("locations").insert(batch);
    },
    { batchSize: 50, tableName: "locations" }
  );

  printMigrationStats(stats);

  // CRITICAL FIX: Recreate trigger for normal operation
  await recreateTrigger(knex);
  console.log("✓ Recreated path consistency trigger\n");

  const totalCount = await knex("locations").count("* as count").first();
  console.log(`✓ Migration complete. Total locations: ${totalCount?.count}\n`);
}

// Helper to recreate trigger after seeding
async function recreateTrigger(knex: Knex) {
  await knex.raw(`
    CREATE TRIGGER trg_locations_path_consistency
    BEFORE INSERT ON locations
    FOR EACH ROW
    BEGIN
      IF @disable_triggers = 1 THEN
        SET NEW.path = IFNULL(NEW.path, '/');
      ELSEIF NEW.parent_id IS NOT NULL THEN
        SET NEW.path = CONCAT(
          (SELECT path FROM locations WHERE id = NEW.parent_id),
          NEW.id,
          '/'
        );
        SET NEW.depth = (SELECT depth + 1 FROM locations WHERE id = NEW.parent_id);
      ELSE
        SET NEW.path = CONCAT('/', NEW.id, '/');
        SET NEW.depth = 0;
      END IF;
    END;
  `);
}
