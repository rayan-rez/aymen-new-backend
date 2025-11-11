// src/database/seeds/photos.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  cleanUrl,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyProjectPhoto {
  id: number;
  url: string;
  projet_id: number;
  created_at: string;
  updated_at: string;
}

interface LegacyApartmentPhoto {
  id: number;
  url: string;
  appartement_id: number;
  url_ext: string | null;
  created_at: string;
  updated_at: string;
}

interface NewPhoto {
  photoable_type: "project" | "apartment" | "commercial_property" | "blog_post";
  photoable_id: number;
  url: string;
  external_url: string | null;
  caption: string | null;
  display_order: number;
  is_cover: boolean;
  created_at: string;
  updated_at: string;
}


// ============================================================================
// SEED FUNCTION
// ============================================================================

// ============================================================================
// VALIDATION QUERY BUILDER
// ============================================================================

async function buildIdMaps(knex: Knex) {
  console.log("  Building parent ID validation maps...");

  // Get all valid project and apartment IDs from NEW database
  const projectIds = await knex("projects").pluck("id");
  const apartmentIds = await knex("apartments").pluck("id");

  return {
    projectIds: new Set(projectIds),
    apartmentIds: new Set(apartmentIds),
  };
}

// ============================================================================
// ENHANCED TRANSFORM FUNCTIONS
// ============================================================================

async function transformProjectPhoto(
  legacy: LegacyProjectPhoto,
  displayOrder: number,
  validProjectIds: Set<number>
): Promise<TransformResult<NewPhoto>> {
  try {
    const url = cleanUrl(legacy.url);
    if (!url) {
      return { data: null, skip: true, error: "Empty photo URL" };
    }

    // CRITICAL: Validate parent exists
    if (!validProjectIds.has(legacy.projet_id)) {
      return {
        data: null,
        skip: true,
        error: `Project ID ${legacy.projet_id} not found in new database`,
      };
    }

    return {
      data: {
        photoable_type: "project",
        photoable_id: legacy.projet_id,
        url,
        external_url: null,
        caption: null,
        display_order: displayOrder,
        is_cover: displayOrder === 0,
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

async function transformApartmentPhoto(
  legacy: LegacyApartmentPhoto,
  displayOrder: number,
  validApartmentIds: Set<number>
): Promise<TransformResult<NewPhoto>> {
  try {
    const url = cleanUrl(legacy.url);
    if (!url) {
      return { data: null, skip: true, error: "Empty photo URL" };
    }

    // CRITICAL: Validate parent exists
    if (!validApartmentIds.has(legacy.appartement_id)) {
      return {
        data: null,
        skip: true,
        error: `Apartment ID ${legacy.appartement_id} not found in new database`,
      };
    }

    const externalUrl = cleanUrl(legacy.url_ext);

    return {
      data: {
        photoable_type: "apartment",
        photoable_id: legacy.appartement_id,
        url,
        external_url: externalUrl,
        caption: null,
        display_order: displayOrder,
        is_cover: displayOrder === 0,
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
// SEED FUNCTION WITH VALIDATION
// ============================================================================

export async function seed(knex: Knex): Promise<void> {
  console.log("\n📸 Starting Photos Migration...\n");

  // Clear existing data
  await clearTable(knex, "photos");
  console.log("✓ Cleared photos table");

  // Build validation maps first
  const { projectIds, apartmentIds } = await buildIdMaps(knex);
  console.log(`✓ Validated ${projectIds.size} projects and ${apartmentIds.size} apartments\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // ============================================================================
  // 1. MIGRATE PROJECT PHOTOS
  // ============================================================================
  console.log("\n--- Migrating Project Photos ---");

  const legacyProjectPhotos = await fetchLegacyRecords<LegacyProjectPhoto>("photos_projets");
  console.log(`✓ Fetched ${legacyProjectPhotos.length} legacy project photos`);

  if (legacyProjectPhotos.length > 0) {
    // Group and sort by project
    const photosByProject = new Map<number, LegacyProjectPhoto[]>();
    legacyProjectPhotos.forEach((photo) => {
      if (!photosByProject.has(photo.projet_id)) {
        photosByProject.set(photo.projet_id, []);
      }
      photosByProject.get(photo.projet_id)!.push(photo);
    });

    console.log(`  Grouped photos for ${photosByProject.size} projects`);

    const photosWithOrder = Array.from(photosByProject.entries()).flatMap(
      ([projectId, photos]) => {
        photos.sort((a, b) => a.id - b.id);
        return photos.map((photo, index) => ({
          photo,
          order: index,
          projectId,
        }));
      }
    );

    const projectPhotoStats = await processBatch(
      photosWithOrder,
      ({ photo, order }) => transformProjectPhoto(photo, order, projectIds),
      async (batch) => {
        // CRITICAL: Use INSERT IGNORE to prevent FK errors from stopping batch
        await knex("photos").insert(batch).onConflict().ignore();
      },
      { batchSize: 100, tableName: "photos (projects)" }
    );

    printMigrationStats(projectPhotoStats);
    totalInserted += projectPhotoStats.successCount;
    totalSkipped += projectPhotoStats.skippedCount;
    totalErrors += projectPhotoStats.errorCount;
  }

  // ============================================================================
  // 2. MIGRATE APARTMENT PHOTOS
  // ============================================================================
  console.log("\n--- Migrating Apartment Photos ---");

  const legacyApartmentPhotos = await fetchLegacyRecords<LegacyApartmentPhoto>(
    "photos_appartements"
  );
  console.log(`✓ Fetched ${legacyApartmentPhotos.length} legacy apartment photos`);

  if (legacyApartmentPhotos.length > 0) {
    const photosByApartment = new Map<number, LegacyApartmentPhoto[]>();
    legacyApartmentPhotos.forEach((photo) => {
      if (!photosByApartment.has(photo.appartement_id)) {
        photosByApartment.set(photo.appartement_id, []);
      }
      photosByApartment.get(photo.appartement_id)!.push(photo);
    });

    console.log(`  Grouped photos for ${photosByApartment.size} apartments`);

    const photosWithOrder = Array.from(photosByApartment.entries()).flatMap(
      ([apartmentId, photos]) => {
        photos.sort((a, b) => a.id - b.id);
        return photos.map((photo, index) => ({
          photo,
          order: index,
          apartmentId,
        }));
      }
    );

    const apartmentPhotoStats = await processBatch(
      photosWithOrder,
      ({ photo, order }) => transformApartmentPhoto(photo, order, apartmentIds),
      async (batch) => {
        await knex("photos").insert(batch).onConflict().ignore();
      },
      { batchSize: 100, tableName: "photos (apartments)" }
    );

    printMigrationStats(apartmentPhotoStats);
    totalInserted += apartmentPhotoStats.successCount;
    totalSkipped += apartmentPhotoStats.skippedCount;
    totalErrors += apartmentPhotoStats.errorCount;
  }

  // ============================================================================
  // 3. UPDATE PROJECT MAIN_PHOTO_URL & PUBLISH STATUS
  // ============================================================================
  console.log("\n--- Updating Projects with Cover Photos & Publishing ---");

  const updatedProjects = await knex("projects")
    .join("photos", function () {
      this.on("photos.photoable_id", "=", "projects.id")
        .andOn("photos.photoable_type", "=", knex.raw("?", ["project"]))
        .andOn("photos.is_cover", "=", knex.raw("?", [true]));
    })
    .update({
      main_photo_url: knex.raw("photos.url"),
      is_published: knex.raw(
        "projects.description IS NOT NULL AND photos.url IS NOT NULL AND projects.status IN ('completed', 'under_construction')"
      ),
    });

  console.log(`✓ Updated ${updatedProjects} projects with cover photos`);

  // ============================================================================
  // FINAL VERIFICATION
  // ============================================================================
  const stats = await knex("photos")
    .select("photoable_type")
    .count("* as count")
    .groupBy("photoable_type");

  const publishedProjects = await knex("projects")
    .where("is_published", true)
    .count("* as count")
    .first();

  console.log("\n" + "=".repeat(70));
  console.log("📸 Photos Migration Complete");
  console.log("=".repeat(70));
  console.log(`Total photos processed: ${totalInserted + totalSkipped + totalErrors}`);
  console.log(`✓ Successfully inserted: ${totalInserted}`);
  console.log(`⊗ Skipped: ${totalSkipped}`);
  console.log(`✗ Errors: ${totalErrors}`);
  console.log("\nBreakdown by type:");
  stats.forEach((row: any) => {
    console.log(`  ${row.photoable_type}: ${row.count} photos`);
  });
  console.log(`\nPublished projects: ${publishedProjects?.count || 0}`);
  console.log("=".repeat(70) + "\n");
}