/**
 * Image Upload Helper for Database Seeders
 * 
 * Handles migrating images from legacy database to new upload system
 * with compression, WebP conversion, and proper file organization.
 * 
 * @module database/seeds/helpers/image-upload
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { constants as fsConstants } from "fs";
import crypto from "crypto";

// ============================================================================
// CONFIGURATION
// ============================================================================

const LEGACY_IMAGES_DIR = path.join(process.cwd(), "legacy_images");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const IMAGE_CONFIG = {
    quality: 85,
    format: "webp" as const,
    thumbnailWidth: 400,
    thumbnailHeight: 300,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ImageUploadResult {
    success: boolean;
    url: string | null;
    thumbnailUrl: string | null;
    originalPath: string;
    newPath: string | null;
    error?: string;
}

export interface BatchUploadResult {
    successful: ImageUploadResult[];
    failed: ImageUploadResult[];
    totalProcessed: number;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Ensures all required upload directories exist
 */
export async function initializeUploadDirectories(): Promise<void> {
    const directories = [
        path.join(UPLOADS_DIR, "images"),
        path.join(UPLOADS_DIR, "images", "projects"),
        path.join(UPLOADS_DIR, "images", "projects", "thumbnails"),
        path.join(UPLOADS_DIR, "images", "apartments"),
        path.join(UPLOADS_DIR, "images", "apartments", "thumbnails"),
        path.join(UPLOADS_DIR, "images", "blog"),
        path.join(UPLOADS_DIR, "images", "blog", "thumbnails"),
    ];

    for (const dir of directories) {
        try {
            await fs.access(dir, fsConstants.R_OK | fsConstants.W_OK);
        } catch {
            await fs.mkdir(dir, { recursive: true });
            console.log(`  ✓ Created directory: ${path.relative(process.cwd(), dir)}`);
        }
    }
}

// ============================================================================
// FILENAME GENERATION
// ============================================================================

/**
 * Generates a random filename
 */
function generateRandomFilename(extension: string = "webp"): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString("hex");
    return `${timestamp}_${randomBytes}.${extension}`;
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Processes and converts an image to WebP format
 */
async function processImage(
    inputPath: string,
    outputPath: string,
    options: {
        width?: number;
        height?: number;
        quality?: number;
        fit?: "cover" | "contain" | "inside";
    } = {}
): Promise<void> {
    const {
        width,
        height,
        quality = IMAGE_CONFIG.quality,
        fit = "inside",
    } = options;

    let image = sharp(inputPath);

    // Get original metadata
    const metadata = await image.metadata();

    // Resize if dimensions provided
    if (width || height) {
        image = image.resize(width, height, { fit });
    }

    // Convert to WebP
    image = image.webp({ quality });

    // Save processed image
    await image.toFile(outputPath);
}

/**
 * Creates a thumbnail version of an image
 */
async function createThumbnail(
    inputPath: string,
    outputPath: string
): Promise<void> {
    await sharp(inputPath)
        .resize(IMAGE_CONFIG.thumbnailWidth, IMAGE_CONFIG.thumbnailHeight, {
            fit: "cover",
        })
        .webp({ quality: 75 })
        .toFile(outputPath);
}

// ============================================================================
// PATH RESOLUTION
// ============================================================================

/**
 * Resolves legacy image path to actual file system path
 * Handles "images/*" prefix and converts to "legacy_images/*"
 */
function resolveLegacyImagePath(legacyUrl: string | null): string | null {
    if (!legacyUrl) return null;

    // Clean the URL
    let cleanPath = legacyUrl.trim();

    // Remove domain if present
    cleanPath = cleanPath.replace(/^https?:\/\/[^\/]+\//, "");

    // Remove leading slash
    cleanPath = cleanPath.replace(/^\/+/, "");

    // Replace "images/" with "legacy_images/"
    if (cleanPath.startsWith("images/")) {
        cleanPath = cleanPath.replace(/^images\//, "legacy_images/");
    } else if (!cleanPath.startsWith("legacy_images/")) {
        // If doesn't start with either, prepend legacy_images/
        cleanPath = `legacy_images/${cleanPath}`;
    }

    return path.join(process.cwd(), cleanPath);
}

/**
 * Checks if a legacy image file exists
 */
async function legacyImageExists(legacyUrl: string | null): Promise<boolean> {
    const imagePath = resolveLegacyImagePath(legacyUrl);
    if (!imagePath) return false;

    try {
        await fs.access(imagePath, fsConstants.R_OK);
        return true;
    } catch {
        return false;
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Uploads a single image from legacy database
 * 
 * @param legacyUrl - Legacy image URL (e.g., "images/projects/photo.jpg")
 * @param category - Upload category ("projects", "apartments", "blog")
 * @param generateThumbnail - Whether to generate thumbnail
 * @returns Upload result with new URLs
 * 
 * @example
 * const result = await uploadLegacyImage(
 *   "images/projects/photo.jpg",
 *   "projects",
 *   true
 * );
 * 
 * if (result.success) {
 *   console.log("New URL:", result.url);
 *   console.log("Thumbnail:", result.thumbnailUrl);
 * }
 */
export async function uploadLegacyImage(
    legacyUrl: string | null,
    category: "projects" | "apartments" | "blog",
    generateThumbnail: boolean = true
): Promise<ImageUploadResult> {
    const originalPath = legacyUrl || "";

    try {
        // Validate input
        if (!legacyUrl || legacyUrl.trim().length === 0) {
            return {
                success: false,
                url: null,
                thumbnailUrl: null,
                originalPath,
                newPath: null,
                error: "Empty image URL",
            };
        }

        // Resolve legacy image path
        const legacyImagePath = resolveLegacyImagePath(legacyUrl);
        if (!legacyImagePath) {
            return {
                success: false,
                url: null,
                thumbnailUrl: null,
                originalPath,
                newPath: null,
                error: "Could not resolve image path",
            };
        }

        // Check if file exists
        const exists = await legacyImageExists(legacyUrl);
        if (!exists) {
            return {
                success: false,
                url: null,
                thumbnailUrl: null,
                originalPath,
                newPath: null,
                error: `Image file not found: ${legacyImagePath}`,
            };
        }

        // Generate new filename
        const filename = generateRandomFilename("webp");
        const newImagePath = path.join(
            UPLOADS_DIR,
            "images",
            category,
            filename
        );

        // Process and save image
        await processImage(legacyImagePath, newImagePath, {
            width: 1920, // Max width
            quality: IMAGE_CONFIG.quality,
        });

        // Generate thumbnail if requested
        let thumbnailUrl: string | null = null;
        if (generateThumbnail) {
            const thumbnailFilename = `thumb_${filename}`;
            const thumbnailPath = path.join(
                UPLOADS_DIR,
                "images",
                category,
                "thumbnails",
                thumbnailFilename
            );

            await createThumbnail(legacyImagePath, thumbnailPath);
            thumbnailUrl = `/uploads/images/${category}/thumbnails/${thumbnailFilename}`;
        }

        const newUrl = `/uploads/images/${category}/${filename}`;

        return {
            success: true,
            url: newUrl,
            thumbnailUrl,
            originalPath,
            newPath: newImagePath,
        };
    } catch (error: any) {
        console.error(`Failed to upload image: ${legacyUrl}`, error.message);
        return {
            success: false,
            url: null,
            thumbnailUrl: null,
            originalPath,
            newPath: null,
            error: error.message,
        };
    }
}

/**
 * Uploads multiple images in batch
 * 
 * @param legacyUrls - Array of legacy image URLs
 * @param category - Upload category
 * @param generateThumbnails - Whether to generate thumbnails
 * @returns Batch upload result
 * 
 * @example
 * const result = await uploadLegacyImagesBatch(
 *   ["images/photo1.jpg", "images/photo2.jpg"],
 *   "projects",
 *   true
 * );
 * 
 * console.log(`Uploaded ${result.successful.length} images`);
 * console.log(`Failed: ${result.failed.length}`);
 */
export async function uploadLegacyImagesBatch(
    legacyUrls: (string | null)[],
    category: "projects" | "apartments" | "blog",
    generateThumbnails: boolean = true
): Promise<BatchUploadResult> {
    const successful: ImageUploadResult[] = [];
    const failed: ImageUploadResult[] = [];

    for (const url of legacyUrls) {
        const result = await uploadLegacyImage(url, category, generateThumbnails);

        if (result.success) {
            successful.push(result);
        } else {
            failed.push(result);
        }
    }

    return {
        successful,
        failed,
        totalProcessed: legacyUrls.length,
    };
}

/**
 * Uploads a blog post featured image
 * 
 * @param legacyUrl - Legacy featured image URL
 * @returns New URL or null
 */
export async function uploadBlogFeaturedImage(
    legacyUrl: string | null
): Promise<string | null> {
    if (!legacyUrl) return null;

    const result = await uploadLegacyImage(legacyUrl, "blog", true);
    return result.success ? result.url : null;
}

/**
 * Uploads a blog section image
 * 
 * @param legacyUrl - Legacy section image URL
 * @returns New URL or null
 */
export async function uploadBlogSectionImage(
    legacyUrl: string | null
): Promise<string | null> {
    if (!legacyUrl) return null;

    const result = await uploadLegacyImage(legacyUrl, "blog", false);
    return result.success ? result.url : null;
}

/**
 * Uploads a project photo
 * 
 * @param legacyUrl - Legacy photo URL
 * @param isCover - Whether this is a cover photo
 * @returns New URL or null
 */
export async function uploadProjectPhoto(
    legacyUrl: string | null,
    isCover: boolean = false
): Promise<string | null> {
    if (!legacyUrl) return null;

    const result = await uploadLegacyImage(legacyUrl, "projects", isCover);
    return result.success ? result.url : null;
}

/**
 * Uploads an apartment photo
 * 
 * @param legacyUrl - Legacy photo URL
 * @returns New URL or null
 */
export async function uploadApartmentPhoto(
    legacyUrl: string | null
): Promise<string | null> {
    if (!legacyUrl) return null;

    const result = await uploadLegacyImage(legacyUrl, "apartments", true);
    return result.success ? result.url : null;
}

/**
 * Cleans up uploaded files (useful for rollback)
 * 
 * @param uploadResults - Array of upload results to clean up
 */
export async function cleanupUploadedFiles(
    uploadResults: ImageUploadResult[]
): Promise<void> {
    for (const result of uploadResults) {
        if (result.success && result.newPath) {
            try {
                await fs.unlink(result.newPath);
                console.log(`  Cleaned up: ${result.newPath}`);
            } catch (error: any) {
                console.error(`  Failed to cleanup: ${result.newPath}`, error.message);
            }
        }
    }
}

/**
 * Gets statistics about legacy images
 * 
 * @param legacyUrls - Array of legacy URLs to check
 * @returns Statistics object
 */
export async function getLegacyImageStats(
    legacyUrls: (string | null)[]
): Promise<{
    total: number;
    existing: number;
    missing: number;
    missingUrls: string[];
}> {
    const validUrls = legacyUrls.filter((url): url is string => !!url);
    let existing = 0;
    const missingUrls: string[] = [];

    for (const url of validUrls) {
        const exists = await legacyImageExists(url);
        if (exists) {
            existing++;
        } else {
            missingUrls.push(url);
        }
    }

    return {
        total: validUrls.length,
        existing,
        missing: missingUrls.length,
        missingUrls,
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    initializeUploadDirectories,
    uploadLegacyImage,
    uploadLegacyImagesBatch,
    uploadBlogFeaturedImage,
    uploadBlogSectionImage,
    uploadProjectPhoto,
    uploadApartmentPhoto,
    cleanupUploadedFiles,
    getLegacyImageStats,
    legacyImageExists,
};