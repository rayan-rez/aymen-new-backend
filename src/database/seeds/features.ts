// src/database/seeds/features.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  generateSlug,
  cleanText,
  cleanUrl,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyFeature {
  id: number;
  nom_caracteristique: string;
  url: string | null;
  created_at: string;
  updated_at: string;
}

interface NewFeature {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  translations: Record<string, string> | null;
  category: "amenity" | "security" | "transport" | "leisure" | "other";
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FEATURE CATEGORIZATION
// ============================================================================

/**
 * Map legacy feature names to categories
 */
const FEATURE_CATEGORIES: Record<string, {
  category: "amenity" | "security" | "transport" | "leisure" | "other";
  icon?: string;
  translations?: Record<string, string>;
}> = {
  "climatisation-centralisee": {
    category: "amenity",
    icon: "air-vent",
    translations: {
      en: "Central Air Conditioning",
      fr: "Climatisation centralisée",
      ar: "تكييف مركزي",
    },
  },
  "chauffage-centralise": {
    category: "amenity",
    icon: "flame",
    translations: {
      en: "Central Heating",
      fr: "Chauffage centralisé",
      ar: "تدفئة مركزية",
    },
  },
  parking: {
    category: "transport",
    icon: "car",
    translations: {
      en: "Parking",
      fr: "Parking",
      ar: "موقف سيارات",
    },
  },
  "aire-de-jeux": {
    category: "leisure",
    icon: "baby",
    translations: {
      en: "Playground",
      fr: "Aire de jeux",
      ar: "ملعب أطفال",
    },
  },
  piscine: {
    category: "leisure",
    icon: "waves",
    translations: {
      en: "Swimming Pool",
      fr: "Piscine",
      ar: "مسبح",
    },
  },
  securite: {
    category: "security",
    icon: "shield-check",
    translations: {
      en: "24/7 Security",
      fr: "Sécurité 24/7",
      ar: "حراسة أمنية",
    },
  },
  ascenseur: {
    category: "amenity",
    icon: "arrow-up-down",
    translations: {
      en: "Elevator",
      fr: "Ascenseur",
      ar: "مصعد",
    },
  },
  jardin: {
    category: "amenity",
    icon: "trees",
    translations: {
      en: "Garden",
      fr: "Jardin",
      ar: "حديقة",
    },
  },
};

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformFeature(
  legacy: LegacyFeature,
  existingSlugs: Set<string>
): Promise<TransformResult<NewFeature>> {
  try {
    // Clean name
    const name = cleanText(legacy.nom_caracteristique);
    if (!name) {
      return { data: null, skip: true, error: "Empty feature name" };
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

    // Get category and icon
    const categoryInfo = FEATURE_CATEGORIES[slug] || {
      category: "other" as const,
      icon: null,
      translations: null,
    };

    // Clean icon URL (extract icon name if it's a path)
    let icon = cleanUrl(legacy.url);
    if (icon && icon.includes("/")) {
      const iconName = icon.split("/").pop()?.replace(/\.(png|jpg|svg)$/i, "");
      icon = iconName || categoryInfo.icon || null;
    } else {
      icon = categoryInfo.icon || null;
    }

    return {
      data: {
        id: legacy.id,
        name,
        slug,
        icon,
        translations: categoryInfo.translations || null,
        category: categoryInfo.category,
        display_order: 0,
        is_active: true,
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
  console.log("\n🎨 Starting Features Migration...\n");

  // Clear existing data
  await clearTable(knex, "features");
  console.log("✓ Cleared features table");

  // Fetch legacy features
  const legacyFeatures = await fetchLegacyRecords<LegacyFeature>(
    "caracteristiques_projets"
  );
  console.log(`✓ Fetched ${legacyFeatures.length} legacy features\n`);

  if (legacyFeatures.length === 0) {
    console.log("⊗ No legacy features found, skipping migration\n");
    return;
  }

  // Process and insert features
  const existingSlugs = new Set<string>();

  const stats = await processBatch(
    legacyFeatures,
    (record) => transformFeature(record, existingSlugs),
    async (batch) => {
      await knex("features").insert(batch);
    },
    { batchSize: 50, tableName: "features" }
  );

  // Print statistics
  printMigrationStats(stats);

  // Verify migration
  const totalCount = await knex("features").count("* as count").first();
  console.log(
    `✓ Migration complete. Total features in new DB: ${totalCount?.count}\n`
  );
}