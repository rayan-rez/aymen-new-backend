// src/database/seeds/apartments.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  cleanText,
  cleanUrl,
  parseBoolean,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyApartment {
  id: number;
  nom_appartement: string;
  surface: string | null;
  visite_virtuelle: string | null;
  projet_id: number;
  created_at: string;
  updated_at: string;
  text: string | null;
  titre: string | null;
  sous_titre: string | null;
  is_temoin: number;
}

interface NewApartment {
  id: number;
  project_id: number;
  name: string;
  unit_number: string | null;
  floor_number: number | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  area_sqm: number;
  bedrooms: number | null;
  bathrooms: number | null;
  price: number;
  living_rooms: number | null;
  kitchens: number | null;
  balconies: number | null;
  status: "available" | "reserved" | "sold";
  is_model_unit: boolean;
  is_published: boolean;
  virtual_visit_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AREA PARSING
// ============================================================================

/**
 * Parse area from legacy format: "de 55 à 77 m²" or "121 m²"
 * Returns average area
 */
function parseArea(surface: string | null): number | null {
  if (!surface) return null;

  // Remove non-numeric except spaces and hyphens
  const cleaned = surface.replace(/[^0-9\s-]/g, " ").trim();

  // Extract all numbers
  const numbers = cleaned.split(/\s+/).map((n) => parseFloat(n)).filter((n) => !isNaN(n));

  if (numbers.length === 0) return null;
  if (numbers.length === 1) return numbers[0];

  // Return average if range
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

// ============================================================================
// ROOM COUNT EXTRACTION
// ============================================================================

/**
 * Extract bedroom count from apartment name: "F2", "F3", "F4", etc.
 */
function extractBedrooms(name: string): number | null {
  const match = name.match(/F(\d+)/i);
  if (match) {
    const rooms = parseInt(match[1], 10);
    // F2 = 1 bedroom, F3 = 2 bedrooms, etc.
    return Math.max(0, rooms - 1);
  }
  return null;
}

/**
 * Estimate bathrooms based on bedrooms
 */
function estimateBathrooms(bedrooms: number | null): number | null {
  if (bedrooms === null) return 1;
  if (bedrooms === 0) return 1; // Studio
  if (bedrooms <= 2) return 1;
  if (bedrooms <= 3) return 2;
  return 2; // 2+ for larger apartments
}

// ============================================================================
// PRICE ESTIMATION
// ============================================================================

/**
 * Estimate price based on area and location
 * Prices in DZD (Algerian Dinar)
 */
function estimatePrice(areaSqm: number, projectId: number): number {
  // Base price per sqm in DZD
  const basePricePerSqm = 200000; // ~1500 USD/sqm

  // Adjust for specific projects (high-end projects)
  const premiumProjects = [2, 3, 13, 14]; // Corail, Béryl, Celestine, Coquelicot
  const multiplier = premiumProjects.includes(projectId) ? 1.3 : 1.0;

  return Math.round(areaSqm * basePricePerSqm * multiplier);
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformApartment(
  legacy: LegacyApartment
): Promise<TransformResult<NewApartment>> {
  try {
    // Clean name
    const name = cleanText(legacy.nom_appartement);
    if (!name) {
      return { data: null, skip: true, error: "Empty apartment name" };
    }

    // Parse area
    const areaSqm = parseArea(legacy.surface);
    if (!areaSqm || areaSqm < 10) {
      return {
        data: null,
        skip: true,
        error: `Invalid area: ${legacy.surface}`,
      };
    }

    // Extract room counts
    const bedrooms = extractBedrooms(name);
    const bathrooms = estimateBathrooms(bedrooms);
    const livingRooms = bedrooms && bedrooms > 0 ? 1 : null;
    const kitchens = 1;
    const balconies = bedrooms && bedrooms > 1 ? 1 : null;

    // Estimate price
    const price = estimatePrice(areaSqm, legacy.projet_id);

    // Clean description fields
    const title = cleanText(legacy.titre);
    const subtitle = cleanText(legacy.sous_titre);
    const description = cleanText(legacy.text);

    // Clean virtual visit URL
    const virtualVisitUrl = cleanUrl(legacy.visite_virtuelle);

    // Determine status
    const isModelUnit = parseBoolean(legacy.is_temoin);
    const isPublished = isModelUnit || !!description; // Publish if it's a model unit or has description

    return {
      data: {
        id: legacy.id,
        project_id: legacy.projet_id,
        name,
        unit_number: null,
        floor_number: null,
        title,
        subtitle,
        description,
        area_sqm: areaSqm,
        bedrooms,
        bathrooms,
        price,
        living_rooms: livingRooms,
        kitchens,
        balconies,
        status: "available",
        is_model_unit: isModelUnit,
        is_published: isPublished,
        virtual_visit_url: virtualVisitUrl,
        created_at: legacy.created_at,
        updated_at: legacy.updated_at,
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
  console.log("\n🏠 Starting Apartments Migration...\n");

  // Clear existing data
  await clearTable(knex, "apartments");
  console.log("✓ Cleared apartments table");

  // Fetch legacy apartments
  const legacyApartments = await fetchLegacyRecords<LegacyApartment>(
    "appartements",
    { orderBy: "projet_id" }
  );
  console.log(`✓ Fetched ${legacyApartments.length} legacy apartments\n`);

  if (legacyApartments.length === 0) {
    console.log("⊗ No legacy apartments found, skipping migration\n");
    return;
  }

  // Process and insert apartments
  const stats = await processBatch(
    legacyApartments,
    transformApartment,
    async (batch) => {
      await knex("apartments").insert(batch);
    },
    { batchSize: 50, tableName: "apartments" }
  );

  // Print statistics
  printMigrationStats(stats);

  // Update project total_units
  console.log("\n✓ Updating project total_units...");
  await knex.raw(`
    UPDATE projects p
    SET total_units = (
      SELECT COUNT(*) FROM apartments a
      WHERE a.project_id = p.id AND a.deleted_at IS NULL
    )
  `);

  // Verify migration
  const totalCount = await knex("apartments").count("* as count").first();
  console.log(
    `✓ Migration complete. Total apartments in new DB: ${totalCount?.count}\n`
  );

  // Show apartment distribution by project
  const distribution = await knex("apartments")
    .select("project_id")
    .count("* as count")
    .groupBy("project_id")
    .orderBy("count", "desc")
    .limit(10);

  console.log("Top 10 projects by apartment count:");
  distribution.forEach((row: any) => {
    console.log(`  Project ${row.project_id}: ${row.count} apartments`);
  });
  console.log("");
}