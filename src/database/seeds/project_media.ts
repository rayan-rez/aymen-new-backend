// src/database/seeds/project_media.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  cleanUrl,
  cleanText,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyProjectMedia {
  id: number;
  projet_id: number;
  url: string;
  type?: string; // If your legacy DB has media type
  titre?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface NewProjectMedia {
  project_id: number;
  media_url: string;
  thumbnail_url: string | null;
  media_type: "image" | "video" | "virtual_visit" | "floor_plan" | "brochure" | "document";
  title: string | null;
  description: string | null;
  alt_text: string | null;
  display_order: number;
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MEDIA TYPE DETECTION
// ============================================================================

function detectMediaType(
  url: string,
  type?: string
): "image" | "video" | "virtual_visit" | "floor_plan" | "brochure" | "document" {
  const urlLower = url.toLowerCase();
  const typeLower = type?.toLowerCase() || "";

  // Video detection
  if (
    urlLower.includes("youtube") ||
    urlLower.includes("vimeo") ||
    urlLower.includes(".mp4") ||
    urlLower.includes(".webm") ||
    typeLower.includes("video")
  ) {
    return "video";
  }

  // Virtual visit detection
  if (
    urlLower.includes("matterport") ||
    urlLower.includes("360") ||
    urlLower.includes("virtual") ||
    typeLower.includes("virtual")
  ) {
    return "virtual_visit";
  }

  // Floor plan detection
  if (
    urlLower.includes("plan") ||
    urlLower.includes("floor") ||
    typeLower.includes("plan")
  ) {
    return "floor_plan";
  }

  // Brochure/PDF detection
  if (
    urlLower.includes("brochure") ||
    urlLower.includes(".pdf") ||
    typeLower.includes("brochure")
  ) {
    return "brochure";
  }

  // Document detection
  if (
    urlLower.includes(".doc") ||
    urlLower.includes(".xls") ||
    typeLower.includes("document")
  ) {
    return "document";
  }

  // Default to image
  return "image";
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformProjectMedia(
  legacy: LegacyProjectMedia,
  displayOrder: number
): Promise<TransformResult<NewProjectMedia>> {
  try {
    const mediaUrl = cleanUrl(legacy.url);
    if (!mediaUrl) {
      return { data: null, skip: true, error: "Empty media URL" };
    }

    const mediaType = detectMediaType(mediaUrl, legacy.type);
    const title = cleanText(legacy.titre);
    const description = cleanText(legacy.description);

    return {
      data: {
        project_id: legacy.projet_id,
        media_url: mediaUrl,
        thumbnail_url: null, // Can be generated later
        media_type: mediaType,
        title,
        description,
        alt_text: title,
        display_order: displayOrder,
        is_featured: displayOrder === 0 && mediaType === "image",
        is_public: true,
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
  console.log("\n🎬 Starting Project Media Migration...\n");

  // Clear existing data
  await clearTable(knex, "project_media");
  console.log("✓ Cleared project_media table");

  // Fetch legacy media
  // ADJUST TABLE NAME based on your legacy database
  const legacyMedia = await fetchLegacyRecords<LegacyProjectMedia>(
    "photos_projets" // Or whatever your legacy table name is
  );
  console.log(`✓ Fetched ${legacyMedia.length} legacy media items`);

  if (legacyMedia.length === 0) {
    console.log("⊗ No legacy media found, skipping migration\n");
    return;
  }

  // Group by project to assign display_order
  const mediaByProject = new Map<number, LegacyProjectMedia[]>();
  legacyMedia.forEach((media) => {
    if (!mediaByProject.has(media.projet_id)) {
      mediaByProject.set(media.projet_id, []);
    }
    mediaByProject.get(media.projet_id)!.push(media);
  });

  // Flatten with display_order
  const mediaWithOrder: Array<{ media: LegacyProjectMedia; order: number }> = [];
  mediaByProject.forEach((mediaItems) => {
    mediaItems.forEach((media, index) => {
      mediaWithOrder.push({ media, order: index });
    });
  });

  // Process and insert
  const stats = await processBatch(
    mediaWithOrder,
    ({ media, order }) => transformProjectMedia(media, order),
    async (batch) => {
      await knex("project_media").insert(batch);
    },
    { batchSize: 100, tableName: "project_media" }
  );

  printMigrationStats(stats);

  // Verify migration
  const totalMedia = await knex("project_media").count("* as count").first();
  const mediaByType = await knex("project_media")
    .select("media_type")
    .count("* as count")
    .groupBy("media_type");

  console.log("\n" + "=".repeat(60));
  console.log("Project Media Migration Complete");
  console.log("=".repeat(60));
  console.log(`Total media items: ${totalMedia?.count}`);
  console.log("\nBreakdown by type:");
  mediaByType.forEach((row: any) => {
    console.log(`  ${row.media_type}: ${row.count}`);
  });
  console.log("=".repeat(60) + "\n");
}