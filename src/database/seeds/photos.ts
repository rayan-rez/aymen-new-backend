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
// TRANSFORM FUNCTIONS
// ============================================================================

async function transformProjectPhoto(
  legacy: LegacyProjectPhoto,
  displayOrder: number
): Promise<TransformResult<NewPhoto>> {
  try {
    const url = cleanUrl(legacy.url);
    if (!url) {
      return { data: null, skip: true, error: "Empty photo URL" };
    }

    return {
      data: {
        photoable_type: "project",
        photoable_id: legacy.projet_id,
        url,
        external_url: null,
        caption: null,
        display_order: displayOrder,
        is_cover: displayOrder === 0, // First photo is the cover
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
  displayOrder: number
): Promise<TransformResult<NewPhoto>> {
  try {
    const url = cleanUrl(legacy.url);
    if (!url) {
      return { data: null, skip: true, error: "Empty photo URL" };
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
        is_cover: displayOrder === 0, // First photo is the cover
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
  console.log("\n📸 Starting Photos Migration...\n");

  // Clear existing data
  await clearTable(knex, "photos");
  console.log("✓ Cleared photos table");


  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // ============================================================================
  // 1. MIGRATE PROJECT PHOTOS
  // ============================================================================
  console.log("\n--- Migrating Project Photos ---");

  const legacyProjectPhotos =
    await fetchLegacyRecords<LegacyProjectPhoto>("photos_projets");
  console.log(`✓ Fetched ${legacyProjectPhotos.length} project photos`);

  if (legacyProjectPhotos.length > 0) {
    // Group by project to assign display_order
    const photosByProject = new Map<number, LegacyProjectPhoto[]>();
    legacyProjectPhotos.forEach((photo) => {
      if (!photosByProject.has(photo.projet_id)) {
        photosByProject.set(photo.projet_id, []);
      }
      photosByProject.get(photo.projet_id)!.push(photo);
    });

    console.log(`✓ Grouped photos for ${photosByProject.size} projects`);

    // Flatten with display_order
    const photosWithOrder: Array<{
      photo: LegacyProjectPhoto;
      order: number;
    }> = [];
    
    photosByProject.forEach((photos) => {
      // Sort by ID to ensure consistent ordering
      photos.sort((a, b) => a.id - b.id);
      
      photos.forEach((photo, index) => {
        photosWithOrder.push({ photo, order: index });
      });
    });

    const projectPhotoStats = await processBatch(
      photosWithOrder,
      ({ photo, order }) => transformProjectPhoto(photo, order),
      async (batch) => {
        await knex("photos").insert(batch);
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
  console.log(`✓ Fetched ${legacyApartmentPhotos.length} apartment photos`);

  if (legacyApartmentPhotos.length > 0) {
    // Group by apartment
    const photosByApartment = new Map<number, LegacyApartmentPhoto[]>();
    legacyApartmentPhotos.forEach((photo) => {
      if (!photosByApartment.has(photo.appartement_id)) {
        photosByApartment.set(photo.appartement_id, []);
      }
      photosByApartment.get(photo.appartement_id)!.push(photo);
    });

    console.log(`✓ Grouped photos for ${photosByApartment.size} apartments`);

    // Flatten with display_order
    const photosWithOrder: Array<{
      photo: LegacyApartmentPhoto;
      order: number;
    }> = [];
    
    photosByApartment.forEach((photos) => {
      // Sort by ID to ensure consistent ordering
      photos.sort((a, b) => a.id - b.id);
      
      photos.forEach((photo, index) => {
        photosWithOrder.push({ photo, order: index });
      });
    });

    const apartmentPhotoStats = await processBatch(
      photosWithOrder,
      ({ photo, order }) => transformApartmentPhoto(photo, order),
      async (batch) => {
        await knex("photos").insert(batch);
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

  // Get first photo (cover photo) for each project
  const projectCoverPhotos = await knex("photos")
    .select("photoable_id", "url")
    .where({ photoable_type: "project", is_cover: true })
    .orderBy("photoable_id");

  let updatedProjects = 0;
  let publishedProjects = 0;

  for (const photo of projectCoverPhotos) {
    // Get project details to determine if it should be published
    const project = await knex("projects")
      .select("id", "status", "description")
      .where("id", photo.photoable_id)
      .first();

    if (!project) continue;

    // Determine if project should be published
    // Criteria: has description, has photo, and status is completed or under_construction
    const shouldPublish = 
      project.description && 
      photo.url && 
      (project.status === "completed" || project.status === "under_construction");

    // Update project with main_photo_url and publication status
    await knex("projects")
      .where("id", photo.photoable_id)
      .update({ 
        main_photo_url: photo.url,
        is_published: shouldPublish
      });

    updatedProjects++;
    if (shouldPublish) publishedProjects++;
  }

  console.log(`✓ Updated main_photo_url for ${updatedProjects} projects`);
  console.log(`✓ Published ${publishedProjects} projects (with photos + description)`);

  // ============================================================================
  // FINAL VERIFICATION
  // ============================================================================
  const photosByType = await knex("photos")
    .select("photoable_type")
    .count("* as count")
    .groupBy("photoable_type");

  const coverPhotos = await knex("photos")
    .where("is_cover", true)
    .count("* as count")
    .first();

  const publishedCount = await knex("projects")
    .where("is_published", true)
    .count("* as count")
    .first();

  const unpublishedCount = await knex("projects")
    .where("is_published", false)
    .count("* as count")
    .first();

  console.log("\n" + "=".repeat(70));
  console.log("📸 Photos Migration Complete");
  console.log("=".repeat(70));
  console.log(`Total photos inserted: ${totalInserted}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Cover photos set: ${coverPhotos?.count || 0}`);
  console.log("\nBreakdown by type:");
  photosByType.forEach((row: any) => {
    console.log(`  ${row.photoable_type}: ${row.count}`);
  });
  console.log("\nProject Publication Status:");
  console.log(`  Published: ${publishedCount?.count || 0}`);
  console.log(`  Unpublished: ${unpublishedCount?.count || 0} (no photos or description)`);
  console.log("=".repeat(70) + "\n");
}