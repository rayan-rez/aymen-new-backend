/**
 * Enhanced Upload Service with Multer Integration
 * 
 * Unified service for handling all file uploads in the application.
 * Works seamlessly with Multer middleware for Express.js.
 * 
 * Features:
 * - Multer file processing
 * - Multi-format image processing (JPEG, PNG, WebP, etc.)
 * - Automatic WebP conversion for images
 * - Document handling (PDF, Word, Excel)
 * - File validation (type, size, dimensions)
 * - Thumbnail generation
 * - Optimized storage structure
 * - Cleanup and deletion
 * 
 * @module services/upload.service
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { constants as fsConstants } from "fs";
import crypto from "crypto";
import type { MulterFile } from "@/config/multer";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Supported file types
 */
export enum FileType {
  IMAGE = "image",
  DOCUMENT = "document",
  VIDEO = "video",
  OTHER = "other",
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  format?: "webp" | "jpeg" | "png";
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

/**
 * Upload configuration
 */
export interface UploadConfig {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  preserveOriginal?: boolean;
  uploadSubdir?: string;
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  filename: string;
  originalFilename: string;
  url: string;
  path: string;
  fileType: FileType;
  mimeType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnail?: {
    filename: string;
    url: string;
    path: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const DEFAULT_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  imageQuality: 85,
  thumbnailWidth: 300,
  thumbnailHeight: 300,
  preserveOriginal: false,
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/svg+xml",
];

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
];

// ============================================================================
// UPLOAD SERVICE CLASS
// ============================================================================

export class UploadService {
  private baseUploadDir: string;
  private uploadsUrl: string;

  constructor(baseUploadDir?: string, uploadsUrl?: string) {
    this.baseUploadDir = baseUploadDir || path.join(process.cwd(), "uploads");
    this.uploadsUrl = uploadsUrl || "/uploads";
    this.initializeDirectories();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize upload directory structure
   */
  private async initializeDirectories(): Promise<void> {
    const directories = [
      this.baseUploadDir,
      path.join(this.baseUploadDir, "images"),
      path.join(this.baseUploadDir, "images", "thumbnails"),
      path.join(this.baseUploadDir, "images", "originals"),
      path.join(this.baseUploadDir, "documents"),
      path.join(this.baseUploadDir, "videos"),
      path.join(this.baseUploadDir, "temp"),
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir, fsConstants.R_OK | fsConstants.W_OK);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    }
  }

  // ==========================================================================
  // FILE TYPE DETECTION
  // ==========================================================================

  /**
   * Determines file type from MIME type
   */
  private getFileType(mimeType: string): FileType {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return FileType.IMAGE;
    }
    if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
      return FileType.DOCUMENT;
    }
    if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      return FileType.VIDEO;
    }
    return FileType.OTHER;
  }

  /**
   * Gets file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/tiff": "tiff",
      "image/svg+xml": "svg",
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "xlsx",
      "text/plain": "txt",
      "text/csv": "csv",
      "video/mp4": "mp4",
      "video/mpeg": "mpeg",
      "video/quicktime": "mov",
      "video/webm": "webm",
    };

    return mimeToExt[mimeType] || "bin";
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validates file before upload
   */
  private validateFile(
    buffer: Buffer,
    mimeType: string,
    config: UploadConfig
  ): ValidationResult {
    const errors: string[] = [];

    const maxSize = config.maxFileSize || DEFAULT_CONFIG.maxFileSize;
    if (buffer.length > maxSize) {
      errors.push(
        `File size ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`
      );
    }

    if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
      if (!config.allowedMimeTypes.includes(mimeType)) {
        errors.push(
          `File type ${mimeType} not allowed. Allowed: ${config.allowedMimeTypes.join(", ")}`
        );
      }
    } else {
      const allAllowedTypes = [
        ...ALLOWED_IMAGE_TYPES,
        ...ALLOWED_DOCUMENT_TYPES,
        ...ALLOWED_VIDEO_TYPES,
      ];
      if (!allAllowedTypes.includes(mimeType)) {
        errors.push(`Unsupported file type: ${mimeType}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ==========================================================================
  // FILENAME GENERATION
  // ==========================================================================

  /**
   * Generates a unique filename
   */
  private generateUniqueFilename(
    originalFilename: string,
    extension?: string
  ): string {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString("hex");
    const sanitizedName = originalFilename
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase()
      .substring(0, 50);

    const ext = extension || path.extname(originalFilename).substring(1);
    return `${timestamp}_${randomHash}_${sanitizedName}.${ext}`;
  }

  /**
   * Generates thumbnail filename
   */
  private getThumbnailFilename(filename: string): string {
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    return `${basename}_thumb${ext}`;
  }

  // ==========================================================================
  // IMAGE PROCESSING
  // ==========================================================================

  /**
   * Processes and optimizes an image
   */
  private async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<{ buffer: Buffer; metadata: any }> {
    const {
      width,
      height,
      quality = DEFAULT_CONFIG.imageQuality,
      fit = "cover",
      format = "webp",
    } = options;

    let image = sharp(buffer);
    const originalMetadata = await image.metadata();

    if (width || height) {
      image = image.resize(width, height, { fit });
    }

    switch (format) {
      case "webp":
        image = image.webp({ quality });
        break;
      case "jpeg":
        image = image.jpeg({ quality, mozjpeg: true });
        break;
      case "png":
        image = image.png({ quality, compressionLevel: 9 });
        break;
    }

    const processedBuffer = await image.toBuffer();
    const processedMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      metadata: {
        original: {
          width: originalMetadata.width,
          height: originalMetadata.height,
          format: originalMetadata.format,
          size: buffer.length,
        },
        processed: {
          width: processedMetadata.width,
          height: processedMetadata.height,
          format: processedMetadata.format,
          size: processedBuffer.length,
        },
      },
    };
  }

  /**
   * Generates a thumbnail
   */
  private async generateThumbnail(
    buffer: Buffer,
    width: number = DEFAULT_CONFIG.thumbnailWidth,
    height: number = DEFAULT_CONFIG.thumbnailHeight
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(width, height, { fit: "cover" })
      .webp({ quality: 75 })
      .toBuffer();
  }

  // ==========================================================================
  // FILE OPERATIONS
  // ==========================================================================

  /**
   * Saves a file to disk
   */
  private async saveFile(
    buffer: Buffer,
    filename: string,
    subdir: string
  ): Promise<string> {
    const filePath = path.join(this.baseUploadDir, subdir, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  /**
   * Deletes a file from disk
   */
  private async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete file: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Checks if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // PUBLIC API - MULTER FILE UPLOAD
  // ==========================================================================

  /**
   * Uploads a Multer file
   * 
   * Main method for handling Multer file uploads with processing
   * 
   * @param file - Multer file object from req.file or req.files
   * @param config - Upload configuration
   * @param imageOptions - Image processing options
   * @returns Promise<UploadResult>
   * 
   * @example
   * // In Express route with Multer
   * router.post('/upload', uploadSingleImage('photo'), async (req, res) => {
   *   const result = await UploadService.uploadMulterFile(
   *     req.file,
   *     {},
   *     { width: 1920, quality: 85, generateThumbnail: true }
   *   );
   *   res.json(result);
   * });
   */
  async uploadMulterFile(
    file: MulterFile,
    config: UploadConfig = {},
    imageOptions: ImageProcessingOptions = {}
  ): Promise<UploadResult> {
    return this.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      config,
      imageOptions
    );
  }

  /**
   * Uploads multiple Multer files
   * 
   * @param files - Array of Multer files
   * @param config - Upload configuration
   * @param imageOptions - Image processing options
   * @returns Promise<UploadResult[]>
   * 
   * @example
   * router.post('/upload', uploadMultipleImages('photos'), async (req, res) => {
   *   const results = await UploadService.uploadMulterFiles(
   *     req.files as MulterFile[],
   *     {},
   *     { width: 1920, quality: 85 }
   *   );
   *   res.json(results);
   * });
   */
  async uploadMulterFiles(
    files: MulterFile[],
    config: UploadConfig = {},
    imageOptions: ImageProcessingOptions = {}
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadMulterFile(file, config, imageOptions);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.originalname}:`, error);
      }
    }

    return results;
  }

  // ==========================================================================
  // PUBLIC API - BUFFER UPLOAD
  // ==========================================================================

  /**
   * Uploads and processes a file from buffer
   * 
   * @param buffer - File buffer
   * @param originalFilename - Original filename
   * @param mimeType - File MIME type
   * @param config - Upload configuration
   * @param imageOptions - Image processing options
   * @returns Promise<UploadResult>
   */
  async upload(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    config: UploadConfig = {},
    imageOptions: ImageProcessingOptions = {}
  ): Promise<UploadResult> {
    try {
      const validation = this.validateFile(buffer, mimeType, config);
      if (!validation.valid) {
        throw new Error(
          `File validation failed: ${validation.errors.join(", ")}`
        );
      }

      const fileType = this.getFileType(mimeType);
      let processedBuffer = buffer;
      let metadata: any = {};
      let dimensions: { width: number; height: number } | undefined;
      let thumbnail:
        | { filename: string; url: string; path: string }
        | undefined;

      if (fileType === FileType.IMAGE) {
        const processed = await this.processImage(buffer, imageOptions);
        processedBuffer = processed.buffer;
        metadata = processed.metadata;
        dimensions = {
          width: processed.metadata.processed.width,
          height: processed.metadata.processed.height,
        };

        if (imageOptions.generateThumbnail) {
          const thumbnailBuffer = await this.generateThumbnail(
            buffer,
            imageOptions.thumbnailWidth,
            imageOptions.thumbnailHeight
          );

          const thumbnailFilename = this.getThumbnailFilename(
            this.generateUniqueFilename(
              originalFilename,
              imageOptions.format || "webp"
            )
          );

          const thumbnailPath = await this.saveFile(
            thumbnailBuffer,
            thumbnailFilename,
            "images/thumbnails"
          );

          thumbnail = {
            filename: thumbnailFilename,
            url: `${this.uploadsUrl}/images/thumbnails/${thumbnailFilename}`,
            path: thumbnailPath,
          };
        }

        if (config.preserveOriginal) {
          const originalName = this.generateUniqueFilename(
            originalFilename,
            this.getExtensionFromMimeType(mimeType)
          );
          await this.saveFile(buffer, originalName, "images/originals");
        }
      }

      const extension =
        fileType === FileType.IMAGE
          ? imageOptions.format || "webp"
          : this.getExtensionFromMimeType(mimeType);
      const filename = this.generateUniqueFilename(originalFilename, extension);

      let subdir: string;
      switch (fileType) {
        case FileType.IMAGE:
          subdir = "images";
          break;
        case FileType.DOCUMENT:
          subdir = "documents";
          break;
        case FileType.VIDEO:
          subdir = "videos";
          break;
        default:
          subdir = config.uploadSubdir || "temp";
      }

      const filePath = await this.saveFile(processedBuffer, filename, subdir);

      const result: UploadResult = {
        success: true,
        filename,
        originalFilename,
        url: `${this.uploadsUrl}/${subdir}/${filename}`,
        path: filePath,
        fileType,
        mimeType,
        size: processedBuffer.length,
        dimensions,
        thumbnail,
        metadata,
      };

      console.log(`✅ File uploaded: ${filename}`);
      return result;
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // ==========================================================================
  // PUBLIC API - DELETE
  // ==========================================================================

  /**
   * Deletes a file and associated files
   */
  async delete(
    filename: string,
    fileType: FileType,
    deleteThumbnail: boolean = true,
    deleteOriginal: boolean = true
  ): Promise<boolean> {
    try {
      let deleted = false;

      let subdir: string;
      switch (fileType) {
        case FileType.IMAGE:
          subdir = "images";
          break;
        case FileType.DOCUMENT:
          subdir = "documents";
          break;
        case FileType.VIDEO:
          subdir = "videos";
          break;
        default:
          subdir = "temp";
      }

      const mainPath = path.join(this.baseUploadDir, subdir, filename);
      deleted = await this.deleteFile(mainPath);

      if (fileType === FileType.IMAGE && deleteThumbnail) {
        const thumbnailName = this.getThumbnailFilename(filename);
        const thumbnailPath = path.join(
          this.baseUploadDir,
          "images",
          "thumbnails",
          thumbnailName
        );
        await this.deleteFile(thumbnailPath);
      }

      if (fileType === FileType.IMAGE && deleteOriginal) {
        const originalPath = path.join(
          this.baseUploadDir,
          "images",
          "originals",
          filename
        );
        await this.deleteFile(originalPath);
      }

      if (deleted) {
        console.log(`✅ File deleted: ${filename}`);
      }

      return deleted;
    } catch (error) {
      console.error(`Failed to delete file ${filename}:`, error);
      return false;
    }
  }

  /**
   * Deletes multiple files
   */
  async deleteMultiple(
    files: Array<{ filename: string; fileType: FileType }>
  ): Promise<boolean[]> {
    const results: boolean[] = [];

    for (const file of files) {
      const result = await this.delete(file.filename, file.fileType);
      results.push(result);
    }

    return results;
  }

  // ==========================================================================
  // PUBLIC API - UTILITIES
  // ==========================================================================

  /**
   * Gets file path
   */
  getFilePath(filename: string, fileType: FileType): string {
    let subdir: string;
    switch (fileType) {
      case FileType.IMAGE:
        subdir = "images";
        break;
      case FileType.DOCUMENT:
        subdir = "documents";
        break;
      case FileType.VIDEO:
        subdir = "videos";
        break;
      default:
        subdir = "temp";
    }

    return path.join(this.baseUploadDir, subdir, filename);
  }

  /**
   * Gets file URL
   */
  getFileUrl(filename: string, fileType: FileType): string {
    let subdir: string;
    switch (fileType) {
      case FileType.IMAGE:
        subdir = "images";
        break;
      case FileType.DOCUMENT:
        subdir = "documents";
        break;
      case FileType.VIDEO:
        subdir = "videos";
        break;
      default:
        subdir = "temp";
    }

    return `${this.uploadsUrl}/${subdir}/${filename}`;
  }

  /**
   * Checks if file exists
   */
  async exists(filename: string, fileType: FileType): Promise<boolean> {
    const filePath = this.getFilePath(filename, fileType);
    return this.fileExists(filePath);
  }

  /**
   * Gets file metadata
   */
  async getMetadata(
    filename: string,
    fileType: FileType
  ): Promise<any | null> {
    try {
      const filePath = this.getFilePath(filename, fileType);
      const exists = await this.fileExists(filePath);

      if (!exists) return null;

      const stats = await fs.stat(filePath);
      const metadata: any = {
        filename,
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };

      if (fileType === FileType.IMAGE) {
        const buffer = await fs.readFile(filePath);
        const imageMetadata = await sharp(buffer).metadata();
        metadata.dimensions = {
          width: imageMetadata.width,
          height: imageMetadata.height,
        };
        metadata.format = imageMetadata.format;
      }

      return metadata;
    } catch (error) {
      console.error(`Failed to get metadata for ${filename}:`, error);
      return null;
    }
  }

  /**
   * Cleans up temporary files
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
    try {
      const tempDir = path.join(this.baseUploadDir, "temp");
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const maxAge = olderThanHours * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await this.deleteFile(filePath);
          deletedCount++;
        }
      }

      console.log(`✅ Cleaned up ${deletedCount} temporary file(s)`);
      return deletedCount;
    } catch (error) {
      console.error("Failed to cleanup temp files:", error);
      return 0;
    }
  }
}

export default new UploadService();