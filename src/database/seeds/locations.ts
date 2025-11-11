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

  // Clear existing data
  await clearTable(knex, "locations");
  console.log("✓ Cleared locations table");

  // 1. Create root country (Algeria) - WITHOUT TRIGGER
  // We'll set path manually to avoid trigger execution during insert
  await knex.raw(`SET @disable_triggers = 1`);

  const [algeriaResult] = await knex("locations").insert({
    name: "Algeria",
    slug: "algeria",
    parent_id: null,
    path: null, // Will be set by trigger
    depth: 0,
    type: "country",
    display_order: 0,
    is_active: true,
  });

  // Extract the actual ID (Knex returns array with insertId)
  const algeriaId =
    typeof algeriaResult === "number"
      ? algeriaResult
      : (algeriaResult as any).insertId || 1;

  // Update path manually for root node
  await knex("locations")
    .where("id", algeriaId)
    .update({ path: `/${algeriaId}/` });

  console.log(`✓ Created root location: Algeria (ID: ${algeriaId})`);

  // 2. Create Algiers region
  const [algiersResult] = await knex("locations").insert({
    name: "Algiers",
    slug: "algiers",
    parent_id: algeriaId,
    path: null, // Will be set by trigger
    depth: 1,
    type: "region",
    display_order: 0,
    is_active: true,
  });

  const algiersRegionId =
    typeof algiersResult === "number"
      ? algiersResult
      : (algiersResult as any).insertId || 2;

  // Update path manually
  await knex("locations")
    .where("id", algiersRegionId)
    .update({ path: `/${algeriaId}/${algiersRegionId}/` });

  console.log(`✓ Created region: Algiers (ID: ${algiersRegionId})`);

  await knex.raw(`SET @disable_triggers = 0`);

  // 3. Fetch legacy locations
  const legacyLocations = await fetchLegacyRecords<LegacyLocation>("localites");
  console.log(`✓ Fetched ${legacyLocations.length} legacy locations\n`);

  if (legacyLocations.length === 0) {
    console.log("⊗ No legacy locations found, skipping migration\n");
    return;
  }

  // 4. Process and insert locations
  const existingSlugs = new Set<string>(["algeria", "algiers"]);

  const stats = await processBatch(
    legacyLocations,
    (record) => transformLocation(record, algiersRegionId, existingSlugs),
    async (batch) => {
      if (batch.length > 0) {
        await knex("locations").insert(batch);
      }
    },
    { batchSize: 50, tableName: "locations" }
  );

  // 5. Print statistics
  printMigrationStats(stats);

  // 6. Verify migration
  const totalCount = await knex("locations").count("* as count").first();
  console.log(
    `✓ Migration complete. Total locations in new DB: ${totalCount?.count}\n`
  );

  // 7. Show location hierarchy
  const hierarchy = await knex("locations")
    .select("id", "name", "type", "depth", "path")
    .orderBy("depth")
    .orderBy("name")
    .limit(10);

  console.log("Location hierarchy (first 10):");
  hierarchy.forEach((loc: any) => {
    const indent = "  ".repeat(loc.depth);
    console.log(`${indent}${loc.name} (${loc.type}) - ${loc.path}`);
  });
  console.log("");
}
