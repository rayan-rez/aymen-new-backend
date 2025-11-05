/**
 * Image Service
 * Handles image processing, conversion, and optimization
 * Uses Sharp library for high-performance image manipulation
 *
 * @module services/image
 *
 * @swagger
 * components:
 *   schemas:
 *     ImageProcessingOptions:
 *       type: object
 *       properties:
 *         width:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *           description: Target width in pixels
 *           example: 1920
 *         height:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *           description: Target height in pixels
 *           example: 1080
 *         quality:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 80
 *           description: Output quality (1-100, higher is better)
 *           example: 80
 *         fit:
 *           type: string
 *           enum: [cover, contain, fill, inside, outside]
 *           default: cover
 *           description: |
 *             How the image should be resized to fit dimensions:
 *             - **cover**: Crop to cover both dimensions (default)
 *             - **contain**: Contain within both dimensions (letterbox)
 *             - **fill**: Ignore aspect ratio, stretch to fill
 *             - **inside**: Resize to fit inside dimensions
 *             - **outside**: Resize to fit outside dimensions
 *           example: "cover"
 *
 *     ImageUploadRequest:
 *       type: object
 *       required:
 *         - file
 *       properties:
 *         file:
 *           type: string
 *           format: binary
 *           description: Image file to upload (JPEG, PNG, WebP, GIF, TIFF, SVG)
 *         width:
 *           type: integer
 *           description: Optional resize width
 *           example: 1920
 *         height:
 *           type: integer
 *           description: Optional resize height
 *           example: 1080
 *         quality:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 80
 *           description: WebP quality (1-100)
 *           example: 80
 *         fit:
 *           type: string
 *           enum: [cover, contain, fill, inside, outside]
 *           default: cover
 *           description: Resize fit mode
 *           example: "cover"
 *
 *     ImageUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Image processed successfully"
 *         data:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               description: Generated filename with timestamp
 *               example: "1699876543210_project-photo.webp"
 *             url:
 *               type: string
 *               format: uri
 *               description: Full URL to access the image
 *               example: "https://api.example.com/uploads/1699876543210_project-photo.webp"
 *             path:
 *               type: string
 *               description: Server file path
 *               example: "/var/www/uploads/1699876543210_project-photo.webp"
 *             originalName:
 *               type: string
 *               description: Original uploaded filename
 *               example: "project-photo.jpg"
 *             format:
 *               type: string
 *               example: "webp"
 *               description: Output image format
 *             size:
 *               type: integer
 *               description: File size in bytes
 *               example: 125000
 *             dimensions:
 *               type: object
 *               properties:
 *                 width:
 *                   type: integer
 *                   example: 1920
 *                 height:
 *                   type: integer
 *                   example: 1080
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     ImageDeleteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Image deleted successfully"
 *         data:
 *           type: object
 *           properties:
 *             deleted:
 *               type: boolean
 *               example: true
 *             filename:
 *               type: string
 *               example: "1699876543210_project-photo.webp"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     ImageProcessingError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Image processing failed"
 *         errors:
 *           type: object
 *           properties:
 *             reason:
 *               type: string
 *               example: "Unsupported image format"
 *             supportedFormats:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["jpeg", "png", "webp", "gif", "tiff", "svg"]
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *   examples:
 *     StandardImageProcessing:
 *       summary: Standard image processing with quality optimization
 *       description: Convert and resize image to 1920x1080 WebP with 80% quality
 *       value:
 *         width: 1920
 *         height: 1080
 *         quality: 80
 *         fit: "cover"
 *
 *     ThumbnailGeneration:
 *       summary: Generate thumbnail
 *       description: Create a thumbnail that fills 300x200 dimensions
 *       value:
 *         width: 300
 *         height: 200
 *         quality: 70
 *         fit: "cover"
 *
 *     HighQualityPreservation:
 *       summary: High quality with minimal compression
 *       description: Preserve high quality for 4K displays
 *       value:
 *         width: 3840
 *         height: 2160
 *         quality: 95
 *         fit: "inside"
 *
 *     ResponsiveImageSet:
 *       summary: Multiple sizes for responsive design
 *       description: Generate multiple image sizes for srcset
 *       value:
 *         sizes:
 *           - width: 320
 *             quality: 70
 *           - width: 640
 *             quality: 75
 *           - width: 1024
 *             quality: 80
 *           - width: 1920
 *             quality: 85
 *
 *     ImageUploadSuccess:
 *       summary: Successful image upload and processing
 *       value:
 *         success: true
 *         message: "Image processed successfully"
 *         data:
 *           filename: "1699876543210_project-photo.webp"
 *           url: "https://api.example.com/uploads/1699876543210_project-photo.webp"
 *           format: "webp"
 *           size: 125000
 *           dimensions:
 *             width: 1920
 *             height: 1080
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *   requestBodies:
 *     ImageUpload:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ImageUploadRequest'
 *           examples:
 *             standardUpload:
 *               $ref: '#/components/examples/StandardImageProcessing'
 *             thumbnailUpload:
 *               $ref: '#/components/examples/ThumbnailGeneration'
 *
 * Features:
 * - WebP conversion for optimal web performance
 * - Dynamic resizing with aspect ratio preservation
 * - Quality optimization
 * - Multiple fit modes (cover, contain, fill, inside, outside)
 * - Automatic upload directory management
 * - File cleanup and deletion
 * - In-memory compression for streaming
 * - Support for multiple input formats
 *
 * Supported input formats:
 * - JPEG/JPG
 * - PNG
 * - WebP
 * - GIF
 * - TIFF
 * - SVG
 *
 * Output format: WebP (optimized for web)
 *
 * @example
 * ```typescript
 * // Basic conversion
 * const filename = await imageService.processAndConvertToWebP(
 *   buffer,
 *   "photo.jpg"
 * );
 *
 * // With resizing
 * const filename = await imageService.processAndConvertToWebP(
 *   buffer,
 *   "photo.jpg",
 *   { width: 1920, height: 1080, quality: 85, fit: "cover" }
 * );
 *
 * // Generate thumbnail
 * const thumbnail = await imageService.processAndConvertToWebP(
 *   buffer,
 *   "photo.jpg",
 *   { width: 300, height: 200, quality: 70 }
 * );
 * ```
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

/**
 * @openapi
 * Image processing options interface
 * Defines parameters for image manipulation
 *
 * @interface ImageProcessingOptions
 */
interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

/**
 * @openapi
 * Image Service class
 * Provides image processing, conversion, and management functionality
 *
 * @class ImageService
 */
class ImageService {
  private uploadDir = path.join(__dirname, "../../uploads");

  constructor() {
    this.ensureUploadDir();
  }

  /**
   * @openapi
   * Ensures upload directory exists
   * Creates the directory if it doesn't exist
   *
   * @private
   * @returns {Promise<void>}
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * @openapi
   * Processes an image and converts it to WebP format
   * Applies resizing and quality optimization
   *
   * @param {Buffer} inputBuffer - Raw image buffer from upload
   * @param {string} filename - Original filename
   * @param {ImageProcessingOptions} [options={}] - Processing options
   * @returns {Promise<string>} Generated filename
   * @throws {Error} If image processing fails
   *
   * @example
   * ```typescript
   * // Basic conversion
   * const filename = await imageService.processAndConvertToWebP(
   *   buffer,
   *   "photo.jpg"
   * );
   *
   * // With resizing and quality options
   * const filename = await imageService.processAndConvertToWebP(
   *   buffer,
   *   "photo.jpg",
   *   { width: 1920, height: 1080, quality: 85, fit: "cover" }
   * );
   *
   * // Generate thumbnail
   * const thumbnail = await imageService.processAndConvertToWebP(
   *   buffer,
   *   "photo.jpg",
   *   { width: 300, height: 200, quality: 70, fit: "cover" }
   * );
   * ```
   */
  async processAndConvertToWebP(
    inputBuffer: Buffer,
    filename: string,
    options: ImageProcessingOptions = {}
  ): Promise<string> {
    const { width, height, quality = 80, fit = "cover" } = options;

    const outputFilename = `${Date.now()}_${filename.replace(
      /\.[^/.]+$/,
      ""
    )}.webp`;
    const outputPath = path.join(this.uploadDir, outputFilename);

    let image = sharp(inputBuffer);

    if (width || height) {
      image = image.resize(width, height, { fit });
    }

    await image.webp({ quality }).toFile(outputPath);

    return outputFilename;
  }

  /**
   * @openapi
   * Compresses an image and returns the buffer
   * Does not save to disk, useful for streaming or temporary processing
   *
   * @param {Buffer} inputBuffer - Raw image buffer
   * @param {string} filename - Original filename (for context)
   * @param {number} [quality=80] - WebP quality (1-100)
   * @returns {Promise<Buffer>} Compressed image buffer
   * @throws {Error} If compression fails
   *
   * @example
   * ```typescript
   * // Compress to 80% quality
   * const compressed = await imageService.compressImage(buffer, "photo.jpg");
   *
   * // High compression for thumbnails
   * const thumbnail = await imageService.compressImage(buffer, "photo.jpg", 60);
   *
   * // Minimal compression for quality preservation
   * const highQuality = await imageService.compressImage(buffer, "photo.jpg", 95);
   * ```
   */
  async compressImage(
    inputBuffer: Buffer,
    filename: string,
    quality: number = 80
  ): Promise<Buffer> {
    return sharp(inputBuffer).webp({ quality }).toBuffer();
  }

  /**
   * @openapi
   * Deletes an image file from the upload directory
   *
   * @param {string} filename - Name of the file to delete
   * @returns {Promise<boolean>} True if deleted successfully, false otherwise
   *
   * @example
   * ```typescript
   * // Delete a processed image
   * const deleted = await imageService.deleteImage("1699876543210_photo.webp");
   * if (deleted) {
   *   console.log("Image deleted successfully");
   * }
   *
   * // Handle deletion in cleanup routine
   * const oldImages = ["image1.webp", "image2.webp", "image3.webp"];
   * for (const img of oldImages) {
   *   await imageService.deleteImage(img);
   * }
   * ```
   */
  async deleteImage(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      return false;
    }
  }

  /**
   * @openapi
   * Gets the full file system path for an image
   *
   * @param {string} filename - Image filename
   * @returns {string} Full file system path
   *
   * @example
   * ```typescript
   * // Get path for serving files
   * const filePath = imageService.getImagePath("1699876543210_photo.webp");
   * res.sendFile(filePath);
   *
   * // Check if file exists
   * const filePath = imageService.getImagePath("photo.webp");
   * const exists = await fs.access(filePath)
   *   .then(() => true)
   *   .catch(() => false);
   * ```
   */
  getImagePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}

export default new ImageService();