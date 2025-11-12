/**
 * Multer Upload Configuration
 * 
 * Centralized configuration for file uploads using Multer middleware.
 * Provides pre-configured upload handlers for different scenarios.
 * 
 * Features:
 * - Memory storage for processing before saving
 * - File type validation
 * - Size limits
 * - Multiple file upload support
 * - Custom error handling
 * 
 * @module config/multer
 */

import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import path from "path";
import crypto from "crypto";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Multer file type for TypeScript
 */
export interface MulterFile extends Express.Multer.File { }

/**
 * Upload configuration options
 */
export interface UploadConfigOptions {
    maxFileSize?: number;
    allowedMimeTypes?: string[];
    maxFiles?: number;
}

// ============================================================================
// MIME TYPE COLLECTIONS
// ============================================================================

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_MIMES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
];

/**
 * Allowed document MIME types
 */
export const ALLOWED_DOCUMENT_MIMES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
];

/**
 * All allowed media types (images + documents)
 */
export const ALLOWED_MEDIA_MIMES = [
    ...ALLOWED_IMAGE_MIMES,
    ...ALLOWED_DOCUMENT_MIMES,
];

// ============================================================================
// FILE FILTER FUNCTIONS
// ============================================================================

/**
 * Creates a file filter function for Multer
 * 
 * @param allowedMimeTypes - Array of allowed MIME types
 * @returns Multer file filter function
 */
function createFileFilter(allowedMimeTypes: string[]) {
    return (
        req: Request,
        file: Express.Multer.File,
        callback: FileFilterCallback
    ) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(
                new Error(
                    `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`
                )
            );
        }
    };
}

// ============================================================================
// MULTER CONFIGURATIONS
// ============================================================================

/**
 * Base Multer configuration using memory storage
 * Files are stored in memory as Buffer for processing before saving
 */
const baseConfig: multer.Options = {
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB default
    },
};

/**
 * Configuration for image uploads only
 * Accepts: JPEG, PNG, WebP, GIF, SVG
 * Max size: 10MB
 */
export const imageUploadConfig = multer({
    ...baseConfig,
    fileFilter: createFileFilter(ALLOWED_IMAGE_MIMES),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

/**
 * Configuration for document uploads only
 * Accepts: PDF, Word, Excel, Text, CSV
 * Max size: 20MB
 */
export const documentUploadConfig = multer({
    ...baseConfig,
    fileFilter: createFileFilter(ALLOWED_DOCUMENT_MIMES),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
    },
});

/**
 * Configuration for mixed media uploads (images + documents)
 * Accepts: All images and documents
 * Max size: 20MB
 */
export const mediaUploadConfig = multer({
    ...baseConfig,
    fileFilter: createFileFilter(ALLOWED_MEDIA_MIMES),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
    },
});

/**
 * Configuration for any file type
 * No restrictions on file type
 * Max size: 50MB
 */
export const anyFileUploadConfig = multer({
    ...baseConfig,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
});

// ============================================================================
// CUSTOM UPLOAD CONFIGURATIONS
// ============================================================================

/**
 * Creates a custom Multer configuration
 * 
 * @param options - Upload configuration options
 * @returns Configured Multer instance
 * 
 * @example
 * const upload = createUploadConfig({
 *   maxFileSize: 5 * 1024 * 1024,
 *   allowedMimeTypes: ALLOWED_IMAGE_MIMES,
 *   maxFiles: 10
 * });
 */
export function createUploadConfig(
    options: UploadConfigOptions = {}
): multer.Multer {
    const config: multer.Options = {
        storage: multer.memoryStorage(),
        limits: {
            fileSize: options.maxFileSize || 10 * 1024 * 1024,
            files: options.maxFiles,
        },
    };

    if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
        config.fileFilter = createFileFilter(options.allowedMimeTypes);
    }

    return multer(config);
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Single image upload middleware
 * 
 * @param fieldName - Form field name for the file
 * @returns Multer middleware
 * 
 * @example
 * router.post('/upload', uploadSingleImage('photo'), controller.handleUpload);
 */
export function uploadSingleImage(fieldName: string = "image") {
    return imageUploadConfig.single(fieldName);
}

/**
 * Multiple images upload middleware
 * 
 * @param fieldName - Form field name for the files
 * @param maxCount - Maximum number of files (default: 10)
 * @returns Multer middleware
 * 
 * @example
 * router.post('/upload', uploadMultipleImages('photos', 20), controller.handleUpload);
 */
export function uploadMultipleImages(
    fieldName: string = "images",
    maxCount: number = 10
) {
    return imageUploadConfig.array(fieldName, maxCount);
}

/**
 * Single document upload middleware
 * 
 * @param fieldName - Form field name for the file
 * @returns Multer middleware
 * 
 * @example
 * router.post('/upload', uploadSingleDocument('pdf'), controller.handleUpload);
 */
export function uploadSingleDocument(fieldName: string = "document") {
    return documentUploadConfig.single(fieldName);
}

/**
 * Multiple documents upload middleware
 * 
 * @param fieldName - Form field name for the files
 * @param maxCount - Maximum number of files (default: 5)
 * @returns Multer middleware
 * 
 * @example
 * router.post('/upload', uploadMultipleDocuments('files', 10), controller.handleUpload);
 */
export function uploadMultipleDocuments(
    fieldName: string = "documents",
    maxCount: number = 5
) {
    return documentUploadConfig.array(fieldName, maxCount);
}

/**
 * Mixed media upload middleware (images + documents)
 * 
 * @param fieldName - Form field name for the files
 * @param maxCount - Maximum number of files (default: 15)
 * @returns Multer middleware
 * 
 * @example
 * router.post('/upload', uploadMixedMedia('files', 20), controller.handleUpload);
 */
export function uploadMixedMedia(
    fieldName: string = "files",
    maxCount: number = 15
) {
    return mediaUploadConfig.array(fieldName, maxCount);
}

/**
 * Multiple field upload middleware
 * Useful when uploading different types of files in one request
 * 
 * @param fields - Array of field configurations
 * @returns Multer middleware
 * 
 * @example
 * router.post('/upload', uploadFields([
 *   { name: 'photos', maxCount: 10 },
 *   { name: 'documents', maxCount: 5 }
 * ]), controller.handleUpload);
 */
export function uploadFields(
    fields: Array<{ name: string; maxCount: number }>
) {
    return mediaUploadConfig.fields(fields);
}

/**
 * Floor plan upload middleware (image + optional PDF)
 * 
 * @returns Multer middleware configured for floor plans
 * 
 * @example
 * router.post('/floor-plans', uploadFloorPlan(), controller.handleFloorPlan);
 */
export function uploadFloorPlan() {
    return mediaUploadConfig.fields([
        { name: "image", maxCount: 1 },
        { name: "pdf", maxCount: 1 },
    ]);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if a file is an image
 * 
 * @param file - Multer file object
 * @returns boolean
 */
export function isImageFile(file: MulterFile): boolean {
    return ALLOWED_IMAGE_MIMES.includes(file.mimetype);
}

/**
 * Validates if a file is a document
 * 
 * @param file - Multer file object
 * @returns boolean
 */
export function isDocumentFile(file: MulterFile): boolean {
    return ALLOWED_DOCUMENT_MIMES.includes(file.mimetype);
}

/**
 * Gets file extension from Multer file
 * 
 * @param file - Multer file object
 * @returns File extension
 */
export function getFileExtension(file: MulterFile): string {
    return path.extname(file.originalname).substring(1).toLowerCase();
}

/**
 * Generates a safe filename from original filename
 * 
 * @param originalName - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);

    return basename
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .toLowerCase()
        .substring(0, 50) + ext;
}

/**
 * Generates a unique filename with timestamp and hash
 * 
 * @param originalName - Original filename
 * @returns Unique filename
 */
export function generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(6).toString("hex");
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);

    const sanitized = basename
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .toLowerCase()
        .substring(0, 30);

    return `${timestamp}_${randomHash}_${sanitized}${ext}`;
}

/**
 * Converts file size to human readable format
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Multer error handler middleware
 * Converts Multer errors to user-friendly messages
 * 
 * @param error - Error object
 * @returns Formatted error message
 */
export function handleMulterError(error: any): string {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case "LIMIT_FILE_SIZE":
                return "File size exceeds maximum allowed size";
            case "LIMIT_FILE_COUNT":
                return "Too many files uploaded";
            case "LIMIT_UNEXPECTED_FILE":
                return "Unexpected field name in form";
            case "LIMIT_PART_COUNT":
                return "Too many parts in multipart form";
            default:
                return `Upload error: ${error.message}`;
        }
    }

    return error.message || "File upload failed";
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    imageUploadConfig,
    documentUploadConfig,
    mediaUploadConfig,
    anyFileUploadConfig,
    createUploadConfig,
    uploadSingleImage,
    uploadMultipleImages,
    uploadSingleDocument,
    uploadMultipleDocuments,
    uploadMixedMedia,
    uploadFields,
    uploadFloorPlan,
    isImageFile,
    isDocumentFile,
    getFileExtension,
    sanitizeFilename,
    generateUniqueFilename,
    formatFileSize,
    handleMulterError,
};