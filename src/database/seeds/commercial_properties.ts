// src/database/seeds/commercial_properties.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  generateSlug,
  cleanText,
  cleanUrl,
  parseDecimal,
  buildLookupMap,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../seed-helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyCommercialProperty {
  id: number;
  titre: string;
  adresse: string;
  sous_titre: string | null;
  description: string;
  desc_card: string | null;
  surface: string | null;
  created_at: string;
  updated_at: string;
  image_path: string | null;
  slug: string | null;
  localisation: string | null;
  formId: string | null;
  longitude: number | null;
  latitude: number | null;
}

interface NewCommercialProperty {
  id: number;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  card_description: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  location_id: number | null;
  property_type: "office" | "shop" | "warehouse" | "showroom" | "restaurant" | "mixed_use";
  area_sqm: number | null;
  price: number | null;
  status: "available" | "rented" | "sold";
  main_image_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROPERTY TYPE DETECTION
// ============================================================================

function detectPropertyType(
  title: string,
  description: string
): "office" | "shop" | "warehouse" | "showroom" | "restaurant" | "mixed_use" {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes("bureau") || text.includes("office")) {
    return "office";
  }
  if (text.includes("boutique") || text.includes("shop") || text.includes("magasin")) {
    return "shop";
  }
  if (text.includes("entrep") || text.includes("warehouse") || text.includes("stockage")) {
    return "warehouse";
  }
  if (text.includes("showroom") || text.includes("salle d'exposition")) {
    return "showroom";
  }
  if (text.includes("restaurant") || text.includes("cafe") || text.includes("café")) {
    return "restaurant";
  }
  if (text.includes("mixte") || text.includes("mixed")) {
    return "mixed_use";
  }

  // Default to shop for commercial properties
  return "shop";
}

// ============================================================================
// AREA PARSING
// ============================================================================

function parseCommercialArea(surface: string | null): number | null {
  if (!surface) return null;

  // Extract numbers from string
  const match = surface.match(/(\d+(?:[.,]\d+)?)/);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }

  return null;
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformCommercialProperty(
  legacy: LegacyCommercialProperty,
  locationMap: Map<string, number>,
  existingSlugs: Set<string>
): Promise<TransformResult<NewCommercialProperty>> {
  try {
    // Clean title
    const title = cleanText(legacy.titre);
    if (!title) {
      return { data: null, skip: true, error: "Empty property title" };
    }

    // Generate slug
    let slug = legacy.slug ? generateSlug(legacy.slug) : generateSlug(title);
    let baseSlug = slug;
    let counter = 1;

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    existingSlugs.add(slug);

    // Clean description fields
    const description = cleanText(legacy.description) || "";
    const subtitle = cleanText(legacy.sous_titre);
    const cardDescription = cleanText(legacy.desc_card);

    // Detect property type
    const propertyType = detectPropertyType(title, description);

    // Parse area
    const areaSqm = parseCommercialArea(legacy.surface);

    // Parse coordinates
    const latitude = parseDecimal(legacy.latitude);
    const longitude = parseDecimal(legacy.longitude);

    // Resolve location (extract from address if needed)
    let locationId: number | null = null;
    const addressLower = legacy.adresse.toLowerCase();
    for (const [locationSlug, locId] of locationMap) {
      if (addressLower.includes(locationSlug.replace(/-/g, " "))) {
        locationId = locId;
        break;
      }
    }

    // Clean image URL
    const mainImageUrl = cleanUrl(legacy.image_path);

    // Set reasonable defaults
    const isPublished = !!mainImageUrl && !!description;
    const isFeatured = false;
    const status = "available" as const;

    // SEO metadata
    const metaTitle = title;
    const metaDescription = cardDescription || description.substring(0, 160);

    return {
      data: {
        id: legacy.id,
        title,
        slug,
        subtitle,
        description,
        card_description: cardDescription,
        address: legacy.adresse,
        latitude,
        longitude,
        location_id: locationId,
        property_type: propertyType,
        area_sqm: areaSqm,
        price: null, // Price not in legacy data
        status,
        main_image_url: mainImageUrl,
        is_featured: isFeatured,
        is_published: isPublished,
        meta_title: metaTitle,
        meta_description: metaDescription,
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
  console.log("\n🏢 Starting Commercial Properties Migration...\n");

  // Clear existing data
  await clearTable(knex, "commercial_properties");
  console.log("✓ Cleared commercial_properties table");

  // Build location lookup map
  const locationMap = await buildLookupMap(knex, "locations", "slug", "id");
  console.log(`✓ Built location lookup map (${locationMap.size} locations)`);

  // Fetch legacy commercial properties
  const legacyProperties =
    await fetchLegacyRecords<LegacyCommercialProperty>("locaux");
  console.log(
    `✓ Fetched ${legacyProperties.length} legacy commercial properties\n`
  );

  if (legacyProperties.length === 0) {
    console.log("⊗ No legacy commercial properties found, skipping migration\n");
    return;
  }

  // Process and insert properties
  const existingSlugs = new Set<string>();

  const stats = await processBatch(
    legacyProperties,
    (record) =>
      transformCommercialProperty(record, locationMap, existingSlugs),
    async (batch) => {
      await knex("commercial_properties").insert(batch);
    },
    { batchSize: 20, tableName: "commercial_properties" }
  );

  // Print statistics
  printMigrationStats(stats);

  // Verify migration
  const totalCount = await knex("commercial_properties")
    .count("* as count")
    .first();
  const byType = await knex("commercial_properties")
    .select("property_type")
    .count("* as count")
    .groupBy("property_type");

  console.log("\n" + "=".repeat(60));
  console.log("Commercial Properties Migration Complete");
  console.log("=".repeat(60));
  console.log(`Total properties: ${totalCount?.count}`);
  console.log("\nBreakdown by type:");
  byType.forEach((row: any) => {
    console.log(`  ${row.property_type}: ${row.count}`);
  });
  console.log("=".repeat(60) + "\n");
}