// src/database/seeds/projects.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  generateSlug,
  cleanText,
  cleanUrl,
  parseDecimal,
  parseInteger,
  parseBoolean,
  buildLookupMap,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyProject {
  id: number;
  nom_projet: string;
  description: string | null;
  adresse: string;
  localisation: string | null;
  statut: string;
  created_at: string;
  updated_at: string;
  description2: string | null;
  photo: string | null;
  slug: string | null;
  script_form: string | null;
  localite: string | null;
  longitude: number | null;
  latitude: number | null;
  blocs: number | null;
  etat_avance: number;
  projet_id: number;
}

interface NewProject {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  description_secondary: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  location_id: number | null;
  project_type: "residential" | "commercial" | "mixed_use" | "luxury" | "affordable";
  status: "planning" | "under_construction" | "completed" | "sold_out";
  completion_percentage: number;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  total_blocks: number | null;
  total_units: number | null;
  main_photo_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STATUS MAPPING
// ============================================================================

function mapProjectStatus(
  legacyStatus: string
): "planning" | "under_construction" | "completed" | "sold_out" {
  const status = legacyStatus.toLowerCase().trim();

  if (status.includes("fini") || status.includes("completed")) {
    return "completed";
  }
  if (status.includes("cours") || status.includes("construction")) {
    return "under_construction";
  }
  if (status.includes("vendu") || status.includes("sold")) {
    return "sold_out";
  }

  return "planning";
}

// ============================================================================
// PROJECT TYPE DETECTION
// ============================================================================

function detectProjectType(
  name: string,
  description: string | null
): "residential" | "commercial" | "mixed_use" | "luxury" | "affordable" {
  const text = `${name} ${description || ""}`.toLowerCase();

  if (text.includes("luxury") || text.includes("luxe") || text.includes("haut standing")) {
    return "luxury";
  }
  if (text.includes("commercial") || text.includes("bureaux")) {
    return "commercial";
  }
  if (text.includes("mixte") || text.includes("mixed")) {
    return "mixed_use";
  }
  if (text.includes("social") || text.includes("affordable")) {
    return "affordable";
  }

  return "residential";
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformProject(
  legacy: LegacyProject,
  locationMap: Map<string, number>,
  existingSlugs: Set<string>
): Promise<TransformResult<NewProject>> {
  try {
    // Clean name
    const name = cleanText(legacy.nom_projet);
    if (!name) {
      return { data: null, skip: true, error: "Empty project name" };
    }

    // Generate slug
    let slug = legacy.slug ? generateSlug(legacy.slug) : generateSlug(name);
    let baseSlug = slug;
    let counter = 1;

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    existingSlugs.add(slug);

    // Map status
    const status = mapProjectStatus(legacy.statut);

    // Detect project type
    const projectType = detectProjectType(name, legacy.description);

    // Clean description
    const description = cleanText(legacy.description);
    const descriptionSecondary = cleanText(legacy.description2);

    // Parse coordinates
    const latitude = parseDecimal(legacy.latitude);
    const longitude = parseDecimal(legacy.longitude);

    // Resolve location
    let locationId: number | null = null;
    if (legacy.localite) {
      const locationSlug = generateSlug(legacy.localite);
      locationId = locationMap.get(locationSlug) || null;
    }

    // Parse numeric fields
    const totalBlocks = parseInteger(legacy.blocs);
    const completionPercentage = Math.min(100, Math.max(0, legacy.etat_avance || 0));

    // Clean photo URL
    const mainPhotoUrl = cleanUrl(legacy.photo);

    // Determine publishing status
    const isPublished = status === "completed" || status === "under_construction";
    const isFeatured = completionPercentage === 100;

    // SEO metadata
    const metaTitle = name;
    const metaDescription = description
      ? description.substring(0, 160)
      : `Découvrez ${name} - Projet immobilier de qualité`;

    return {
      data: {
        id: legacy.projet_id,
        name,
        slug,
        description,
        description_secondary: descriptionSecondary,
        address: legacy.adresse,
        latitude,
        longitude,
        location_id: locationId,
        project_type: projectType,
        status,
        completion_percentage: completionPercentage,
        estimated_completion_date: null,
        actual_completion_date: status === "completed" ? new Date().toISOString().slice(0, 10) : null,
        total_blocks: totalBlocks,
        total_units: null, // Will be calculated from apartments
        main_photo_url: mainPhotoUrl,
        is_featured: isFeatured,
        is_published: isPublished,
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
  console.log("\n🏗️  Starting Projects Migration...\n");

  // Clear existing data (cascade deletes will handle related records)
  await clearTable(knex, "projects");
  console.log("✓ Cleared projects table");

  // Build location lookup map
  const locationMap = await buildLookupMap(knex, "locations", "slug", "id");
  console.log(`✓ Built location lookup map (${locationMap.size} locations)`);

  // Fetch legacy projects from projet_filtre table
  const legacyProjects = await fetchLegacyRecords<LegacyProject>(
    "projet_filtre",
    { orderBy: "projet_id" }
  );
  console.log(`✓ Fetched ${legacyProjects.length} legacy projects\n`);

  if (legacyProjects.length === 0) {
    console.log("⊗ No legacy projects found, skipping migration\n");
    return;
  }

  // Process and insert projects
  const existingSlugs = new Set<string>();

  const stats = await processBatch(
    legacyProjects,
    (record) => transformProject(record, locationMap, existingSlugs),
    async (batch) => {
      await knex("projects").insert(batch);
    },
    { batchSize: 20, tableName: "projects" }
  );

  // Print statistics
  printMigrationStats(stats);

  // Verify migration
  const totalCount = await knex("projects").count("* as count").first();
  console.log(
    `✓ Migration complete. Total projects in new DB: ${totalCount?.count}\n`
  );
}