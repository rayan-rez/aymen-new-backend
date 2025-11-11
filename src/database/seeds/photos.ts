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
// VALIDATION
// ============================================================================

async function buildIdMaps(knex: Knex) {
  console.log("  Building parent ID validation maps...");

  const projectIds = await knex("projects").pluck("id");
  const apartmentIds = await knex("apartments").pluck("id");

  console.log(`  ✓ Found ${projectIds.length} valid projects`);
  console.log(`  ✓ Found ${apartmentIds.length} valid apartments`);

  return {
    projectIds: new Set(projectIds),
    apartmentIds: new Set(apartmentIds),
  };
}

// ============================================================================
// TRANSFORM FUNCTIONS
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
// SEED FUNCTION
// ============================================================================

export async function seed(knex: Knex): Promise<void> {
  console.log("\n📸 Starting Photos Migration...\n");

  await clearTable(knex, "photos");
  console.log("✓ Cleared photos table");

  const { projectIds, apartmentIds } = await buildIdMaps(knex);
  console.log("");

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // ============================================================================
  // 1. MIGRATE PROJECT PHOTOS
  // ============================================================================
  console.log("--- Migrating Project Photos ---\n");

  let legacyProjectPhotos: LegacyProjectPhoto[] = [];
  
  try {
    legacyProjectPhotos = await fetchLegacyRecords<LegacyProjectPhoto>("photos_projets");
    console.log(`✓ Fetched ${legacyProjectPhotos.length} legacy project photos`);
  } catch (error: any) {
    console.log(`⚠️  Could not fetch from photos_projets: ${error.message}`);
    console.log("   Skipping project photos migration\n");
  }

  if (legacyProjectPhotos.length > 0) {
    // Filter only photos for projects that exist in new DB
    const validPhotos = legacyProjectPhotos.filter(p => projectIds.has(p.projet_id));
    console.log(`✓ Found ${validPhotos.length} photos for valid projects`);
    
    if (validPhotos.length !== legacyProjectPhotos.length) {
      console.log(`⚠️  Skipping ${legacyProjectPhotos.length - validPhotos.length} photos for non-existent projects`);
    }

    // Group by project and assign display_order
    const photosByProject = new Map<number, LegacyProjectPhoto[]>();
    validPhotos.forEach((photo) => {
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
        if (batch.length > 0) {
          await knex("photos").insert(batch).onConflict().ignore();
        }
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
  console.log("\n--- Migrating Apartment Photos ---\n");

  let legacyApartmentPhotos: LegacyApartmentPhoto[] = [];
  
  try {
    legacyApartmentPhotos = await fetchLegacyRecords<LegacyApartmentPhoto>("photos_appartements");
    console.log(`✓ Fetched ${legacyApartmentPhotos.length} legacy apartment photos`);
  } catch (error: any) {
    console.log(`⚠️  Could not fetch from photos_appartements: ${error.message}`);
    console.log("   Skipping apartment photos migration\n");
  }

  if (legacyApartmentPhotos.length > 0) {
    const validPhotos = legacyApartmentPhotos.filter(p => apartmentIds.has(p.appartement_id));
    console.log(`✓ Found ${validPhotos.length} photos for valid apartments`);
    
    if (validPhotos.length !== legacyApartmentPhotos.length) {
      console.log(`⚠️  Skipping ${legacyApartmentPhotos.length - validPhotos.length} photos for non-existent apartments`);
    }

    const photosByApartment = new Map<number, LegacyApartmentPhoto[]>();
    validPhotos.forEach((photo) => {
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
        if (batch.length > 0) {
          await knex("photos").insert(batch).onConflict().ignore();
        }
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
  console.log("\n--- Updating Projects with Cover Photos & Publishing ---\n");

  // Update main_photo_url from cover photos
  const updateResult = await knex.raw(`
    UPDATE projects p
    INNER JOIN photos ph ON ph.photoable_id = p.id 
      AND ph.photoable_type = 'project' 
      AND ph.is_cover = true
    SET 
      p.main_photo_url = ph.url,
      p.is_published = CASE
        WHEN p.description IS NOT NULL 
          AND ph.url IS NOT NULL 
          AND p.status IN ('completed', 'under_construction')
        THEN true
        ELSE false
      END
  `);

  console.log(`✓ Updated projects with cover photos`);

  // Count published projects
  const publishedProjects = await knex("projects")
    .where("is_published", true)
    .count("* as count")
    .first();

  console.log(`✓ Published ${publishedProjects?.count || 0} projects with photos and descriptions`);

  // ============================================================================
  // FINAL VERIFICATION
  // ============================================================================
  const stats = await knex("photos")
    .select("photoable_type")
    .count("* as count")
    .groupBy("photoable_type");

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