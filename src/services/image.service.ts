
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

/**
 * Image Service class
 * Provides image processing, conversion, and management functionality
 * 
 * Features:
 * - WebP conversion for optimal web performance
 * - Dynamic resizing with aspect ratio preservation
 * - Quality optimization
 * - Automatic upload directory management
 * - File cleanup and deletion
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
 */
class ImageService {
  private uploadDir = path.join(__dirname, "../../uploads");

  constructor() {
    this.ensureUploadDir();
  }

  /**
   * Ensures upload directory exists
   * Creates the directory if it doesn't exist
   * @private
   */
  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Processes an image and converts it to WebP format
   * Applies resizing and quality optimization
   * 
   * @param inputBuffer - Raw image buffer from upload
   * @param filename - Original filename
   * @param options - Processing options (width, height, quality, fit)
   * @returns Promise<string> - Generated filename
   * @throws Error - If image processing fails
   * 
   * @example
   * // Basic conversion
   * const filename = await imageService.processAndConvertToWebP(
   *   buffer,
   *   "photo.jpg"
   * );
   * 
   * @example
   * // With resizing and quality options
   * const filename = await imageService.processAndConvertToWebP(
   *   buffer,
   *   "photo.jpg",
   *   { width: 1920, height: 1080, quality: 85, fit: "cover" }
   * );
   * 
   * @example
   * // Generate thumbnail
   * const thumbnail = await imageService.processAndConvertToWebP(
   *   buffer,
   *   "photo.jpg",
   *   { width: 300, height: 200, quality: 70, fit: "cover" }
   * );
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
   * Compresses an image and returns the buffer
   * Does not save to disk, useful for streaming or temporary processing
   * 
   * @param inputBuffer - Raw image buffer
   * @param filename - Original filename (for context)
   * @param quality - WebP quality (1-100, default: 80)
   * @returns Promise<Buffer> - Compressed image buffer
   * @throws Error - If compression fails
   * 
   * @example
   * // Compress to 80% quality
   * const compressed = await imageService.compressImage(buffer, "photo.jpg");
   * 
   * @example
   * // High compression for thumbnails
   * const thumbnail = await imageService.compressImage(buffer, "photo.jpg", 60);
   * 
   * @example
   * // Minimal compression for quality preservation
   * const highQuality = await imageService.compressImage(buffer, "photo.jpg", 95);
   */
  async compressImage(
    inputBuffer: Buffer,
    filename: string,
    quality: number = 80
  ): Promise<Buffer> {
    return sharp(inputBuffer).webp({ quality }).toBuffer();
  }

  /**
   * Deletes an image file from the upload directory
   * 
   * @param filename - Name of the file to delete
   * @returns Promise<boolean> - True if deleted successfully, false otherwise
   * 
   * @example
   * // Delete a processed image
   * const deleted = await imageService.deleteImage("1699876543210_photo.webp");
   * if (deleted) {
   *   console.log("Image deleted successfully");
   * }
   * 
   * @example
   * // Handle deletion in cleanup routine
   * const oldImages = ["image1.webp", "image2.webp", "image3.webp"];
   * for (const img of oldImages) {
   *   await imageService.deleteImage(img);
   * }
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
   * Gets the full file system path for an image
   * 
   * @param filename - Image filename
   * @returns string - Full file system path
   * 
   * @example
   * // Get path for serving files
   * const filePath = imageService.getImagePath("1699876543210_photo.webp");
   * res.sendFile(filePath);
   * 
   * @example
   * // Check if file exists
   * const filePath = imageService.getImagePath("photo.webp");
   * const exists = await fs.access(filePath).then(() => true).catch(() => false);
   */
  getImagePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}

export default new ImageService();