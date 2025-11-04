// src/database/seeds/locations.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  generateSlug,
  ensureUniqueSlug,
  cleanText,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../seed-helpers";

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
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  path: string;
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
  knex: Knex,
  algeriaId: number,
  algiersRegionId: number,
  existingSlugs: Set<string>
): Promise<TransformResult<NewLocation>> {
  try {
    // Clean name
    const name = cleanText(legacy.name);
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
    const parentId =
      type === "city" ? algiersRegionId : type === "region" ? algeriaId : null;
    const depth = type === "city" ? 2 : type === "region" ? 1 : 0;

    return {
      data: {
        id: legacy.localite_id,
        name,
        slug,
        parent_id: parentId,
        path: "", // Will be set by trigger
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

  // 1. Create root country (Algeria)
  const [algeriaId] = await knex("locations").insert({
    name: "Algeria",
    slug: "algeria",
    parent_id: null,
    path: "/1/",
    depth: 0,
    type: "country",
    display_order: 0,
    is_active: true,
  });
  console.log(`✓ Created root location: Algeria (ID: ${algeriaId})`);

  // 2. Create Algiers region
  const [algiersRegionId] = await knex("locations").insert({
    name: "Algiers",
    slug: "algiers",
    parent_id: algeriaId,
    path: `/1/${algeriaId + 1}/`,
    depth: 1,
    type: "region",
    display_order: 0,
    is_active: true,
  });
  console.log(`✓ Created region: Algiers (ID: ${algiersRegionId})`);

  // 3. Fetch legacy locations
  const legacyLocations = await fetchLegacyRecords<LegacyLocation>(
    "localites"
  );
  console.log(`✓ Fetched ${legacyLocations.length} legacy locations\n`);

  if (legacyLocations.length === 0) {
    console.log("⊗ No legacy locations found, skipping migration\n");
    return;
  }

  // 4. Process and insert locations
  const existingSlugs = new Set<string>(["algeria", "algiers"]);

  const stats = await processBatch(
    legacyLocations,
    (record) =>
      transformLocation(
        record,
        knex,
        algeriaId,
        algiersRegionId,
        existingSlugs
      ),
    async (batch) => {
      await knex("locations").insert(batch);
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
}