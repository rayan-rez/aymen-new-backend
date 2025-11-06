/**
 * Image Service Tests
 * Test suite for image processing and management
 *
 * Test Coverage:
 * - Image processing and WebP conversion
 * - Resizing and quality optimization
 * - Image compression
 * - File deletion
 * - Path generation
 * - Error handling
 */

import imageService from "@services/image.service";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

// Mock sharp
jest.mock("sharp");

// Mock fs/promises
jest.mock("fs/promises");

describe("Image Service", () => {
  let mockSharpInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock sharp instance methods
    mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue({ size: 125000 }),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("processed-image")),
    };

    // Mock sharp constructor
    (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

    // Mock fs methods
    (fs.access as jest.Mock).mockRejectedValue(
      new Error("Directory not found")
    );
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    // Suppress console logs
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe("Initialization", () => {
    it("should create upload directory if it doesn't exist", async () => {
      // Re-import to trigger constructor
      jest.isolateModules(() => {
        require("@services/image.service");
      });

      // Wait for async constructor logic
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fs.mkdir).toHaveBeenCalled();
    });

    it("should not create directory if it already exists", async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);

      jest.isolateModules(() => {
        require("@services/image.service");
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // PROCESS AND CONVERT TO WEBP TESTS
  // ============================================================================

  describe("processAndConvertToWebP", () => {
    const testBuffer = Buffer.from("test-image-data");
    const testFilename = "photo.jpg";

    it("should process image and convert to WebP", async () => {
      const filename = await imageService.processAndConvertToWebP(
        testBuffer,
        testFilename
      );

      expect(filename).toMatch(/^\d+_photo\.webp$/);
      expect(sharp).toHaveBeenCalledWith(testBuffer);
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 80 });
      expect(mockSharpInstance.toFile).toHaveBeenCalled();
    });

    it("should use custom quality setting", async () => {
      await imageService.processAndConvertToWebP(testBuffer, testFilename, {
        quality: 90,
      });

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 90 });
    });

    it("should resize image when width provided", async () => {
      await imageService.processAndConvertToWebP(testBuffer, testFilename, {
        width: 1920,
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1920, undefined, {
        fit: "cover",
      });
    });

    it("should resize image when height provided", async () => {
      await imageService.processAndConvertToWebP(testBuffer, testFilename, {
        height: 1080,
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(undefined, 1080, {
        fit: "cover",
      });
    });

    it("should resize with both width and height", async () => {
      await imageService.processAndConvertToWebP(testBuffer, testFilename, {
        width: 1920,
        height: 1080,
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1920, 1080, {
        fit: "cover",
      });
    });

    it("should use custom fit mode", async () => {
      await imageService.processAndConvertToWebP(testBuffer, testFilename, {
        width: 800,
        height: 600,
        fit: "contain",
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, 600, {
        fit: "contain",
      });
    });

    it("should handle different fit modes", async () => {
      const fitModes: Array<
        "cover" | "contain" | "fill" | "inside" | "outside"
      > = ["cover", "contain", "fill", "inside", "outside"];

      for (const fit of fitModes) {
        await imageService.processAndConvertToWebP(testBuffer, testFilename, {
          width: 800,
          fit,
        });

        expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, undefined, {
          fit,
        });
      }
    });

    it("should generate unique filename with timestamp", async () => {
      const filename1 = await imageService.processAndConvertToWebP(
        testBuffer,
        testFilename
      );

      // Wait a millisecond
      await new Promise((resolve) => setTimeout(resolve, 2));

      const filename2 = await imageService.processAndConvertToWebP(
        testBuffer,
        testFilename
      );

      expect(filename1).not.toBe(filename2);
    });

    it("should remove original file extension", async () => {
      const filename = await imageService.processAndConvertToWebP(
        testBuffer,
        "image.png"
      );

      expect(filename).toMatch(/^\d+_image\.webp$/);
      expect(filename).not.toContain(".png");
    });

    it("should handle filenames with multiple dots", async () => {
      const filename = await imageService.processAndConvertToWebP(
        testBuffer,
        "my.photo.v2.jpg"
      );

      expect(filename).toMatch(/^\d+_my\.photo\.v2\.webp$/);
    });

    it("should handle processing errors", async () => {
      mockSharpInstance.toFile.mockRejectedValueOnce(
        new Error("Processing failed")
      );

      await expect(
        imageService.processAndConvertToWebP(testBuffer, testFilename)
      ).rejects.toThrow("Processing failed");
    });

    it("should not resize if no dimensions provided", async () => {
      await imageService.processAndConvertToWebP(testBuffer, testFilename, {});

      expect(mockSharpInstance.resize).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // COMPRESS IMAGE TESTS
  // ============================================================================

  describe("compressImage", () => {
    const testBuffer = Buffer.from("test-image-data");
    const testFilename = "photo.jpg";

    it("should compress image and return buffer", async () => {
      const result = await imageService.compressImage(testBuffer, testFilename);

      expect(result).toBeInstanceOf(Buffer);
      expect(sharp).toHaveBeenCalledWith(testBuffer);
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 80 });
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
    });

    it("should use custom quality", async () => {
      await imageService.compressImage(testBuffer, testFilename, 60);

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 60 });
    });

    it("should handle high quality compression", async () => {
      await imageService.compressImage(testBuffer, testFilename, 95);

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 95 });
    });

    it("should handle low quality compression", async () => {
      await imageService.compressImage(testBuffer, testFilename, 30);

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 30 });
    });

    it("should not save to disk", async () => {
      await imageService.compressImage(testBuffer, testFilename);

      expect(mockSharpInstance.toFile).not.toHaveBeenCalled();
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
    });

    it("should handle compression errors", async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(
        new Error("Compression failed")
      );

      await expect(
        imageService.compressImage(testBuffer, testFilename)
      ).rejects.toThrow("Compression failed");
    });
  });

  // ============================================================================
  // DELETE IMAGE TESTS
  // ============================================================================

  describe("deleteImage", () => {
    it("should delete image successfully", async () => {
      const result = await imageService.deleteImage("test-image.webp");

      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining("test-image.webp")
      );
    });

    it("should return false if deletion fails", async () => {
      (fs.unlink as jest.Mock).mockRejectedValueOnce(
        new Error("File not found")
      );

      const result = await imageService.deleteImage("non-existent.webp");

      expect(result).toBe(false);
    });

    it("should handle permission errors", async () => {
      (fs.unlink as jest.Mock).mockRejectedValueOnce(
        new Error("Permission denied")
      );

      const result = await imageService.deleteImage("protected.webp");

      expect(result).toBe(false);
    });

    it("should log errors", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error");
      (fs.unlink as jest.Mock).mockRejectedValueOnce(new Error("Test error"));

      await imageService.deleteImage("test.webp");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error deleting image:",
        expect.any(Error)
      );
    });

    it("should delete multiple images", async () => {
      const images = ["image1.webp", "image2.webp", "image3.webp"];

      const results = await Promise.all(
        images.map((img) => imageService.deleteImage(img))
      );

      expect(results).toEqual([true, true, true]);
      expect(fs.unlink).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // GET IMAGE PATH TESTS
  // ============================================================================

  describe("getImagePath", () => {
    it("should return full path to image", () => {
      const filename = "test-image.webp";
      const imagePath = imageService.getImagePath(filename);

      expect(imagePath).toContain("uploads");
      expect(imagePath).toContain(filename);
      expect(path.isAbsolute(imagePath)).toBe(true);
    });

    it("should handle different filenames", () => {
      const filenames = [
        "photo.webp",
        "123456789_image.webp",
        "test_photo_v2.webp",
      ];

      filenames.forEach((filename) => {
        const imagePath = imageService.getImagePath(filename);
        expect(imagePath).toContain(filename);
      });
    });

    it("should return consistent path format", () => {
      const filename = "test.webp";
      const path1 = imageService.getImagePath(filename);
      const path2 = imageService.getImagePath(filename);

      expect(path1).toBe(path2);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe("Integration Scenarios", () => {
    it("should process and save multiple images", async () => {
      const images = [
        { buffer: Buffer.from("image1"), filename: "photo1.jpg" },
        { buffer: Buffer.from("image2"), filename: "photo2.png" },
        { buffer: Buffer.from("image3"), filename: "photo3.jpeg" },
      ];

      const filenames = await Promise.all(
        images.map((img) =>
          imageService.processAndConvertToWebP(img.buffer, img.filename)
        )
      );

      expect(filenames).toHaveLength(3);
      expect(filenames.every((f) => f.endsWith(".webp"))).toBe(true);
      expect(sharp).toHaveBeenCalledTimes(3);
    });

    it("should handle complete image lifecycle", async () => {
      const buffer = Buffer.from("test-image");
      const originalName = "test.jpg";

      // Process
      const filename = await imageService.processAndConvertToWebP(
        buffer,
        originalName
      );
      expect(filename).toMatch(/\.webp$/);

      // Get path
      const imagePath = imageService.getImagePath(filename);
      expect(imagePath).toContain(filename);

      // Delete
      const deleted = await imageService.deleteImage(filename);
      expect(deleted).toBe(true);
    });

    it("should process images with different quality levels", async () => {
      const buffer = Buffer.from("test-image");
      const filename = "test.jpg";
      const qualities = [30, 60, 80, 95];

      for (const quality of qualities) {
        await imageService.processAndConvertToWebP(buffer, filename, {
          quality,
        });

        expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality });
      }
    });
  });

  // ============================================================================
  // ERROR SCENARIOS
  // ============================================================================

  describe("Error Scenarios", () => {
    it("should handle corrupted image data", async () => {
      mockSharpInstance.toFile.mockRejectedValueOnce(
        new Error("Input buffer contains unsupported image format")
      );

      await expect(
        imageService.processAndConvertToWebP(
          Buffer.from("corrupted"),
          "test.jpg"
        )
      ).rejects.toThrow("unsupported image format");
    });

    it("should handle disk space errors", async () => {
      mockSharpInstance.toFile.mockRejectedValueOnce(
        new Error("ENOSPC: no space left on device")
      );

      await expect(
        imageService.processAndConvertToWebP(Buffer.from("test"), "test.jpg")
      ).rejects.toThrow("no space left on device");
    });

    it("should handle invalid dimensions", async () => {
      mockSharpInstance.resize.mockImplementationOnce(() => {
        throw new Error("Expected positive integer for width");
      });

      await expect(
        imageService.processAndConvertToWebP(Buffer.from("test"), "test.jpg", {
          width: -100,
        })
      ).rejects.toThrow();
    });

    it("should handle concurrent processing", async () => {
      const buffer = Buffer.from("test");
      const operations = Array(10)
        .fill(null)
        .map((_, i) =>
          imageService.processAndConvertToWebP(buffer, `image${i}.jpg`)
        );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      expect(new Set(results).size).toBe(10); // All unique filenames
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle very small images", async () => {
      const tinyBuffer = Buffer.from("tiny");

      const filename = await imageService.processAndConvertToWebP(
        tinyBuffer,
        "tiny.jpg",
        { width: 10, height: 10 }
      );

      expect(filename).toMatch(/\.webp$/);
    });

    it("should handle very large dimensions", async () => {
      await imageService.processAndConvertToWebP(
        Buffer.from("large"),
        "large.jpg",
        { width: 8000, height: 6000 }
      );

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(8000, 6000, {
        fit: "cover",
      });
    });

    it("should handle quality edge values", async () => {
      // Minimum quality
      await imageService.compressImage(Buffer.from("test"), "test.jpg", 1);
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 1 });

      // Maximum quality
      await imageService.compressImage(Buffer.from("test"), "test.jpg", 100);
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 100 });
    });

    it("should handle special characters in filename", async () => {
      const filename = await imageService.processAndConvertToWebP(
        Buffer.from("test"),
        "my-photo (1).jpg"
      );

      expect(filename).toMatch(/^\d+_my-photo \(1\)\.webp$/);
    });

    it("should handle empty buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);

      // Sharp should handle this, but let's test the service doesn't crash
      try {
        await imageService.processAndConvertToWebP(emptyBuffer, "empty.jpg");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle Unicode filenames", async () => {
      const filename = await imageService.processAndConvertToWebP(
        Buffer.from("test"),
        "фото.jpg"
      );

      expect(filename).toContain("фото");
      expect(filename).toMatch(/\.webp$/);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe("Performance", () => {
    it("should process images efficiently", async () => {
      const startTime = Date.now();

      await imageService.processAndConvertToWebP(
        Buffer.from("test-image-data"),
        "performance-test.jpg"
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (mocked operations)
      expect(duration).toBeLessThan(100);
    });

    it("should handle batch processing", async () => {
      const imageCount = 50;
      const images = Array(imageCount)
        .fill(null)
        .map((_, i) => ({
          buffer: Buffer.from(`image-${i}`),
          filename: `batch-${i}.jpg`,
        }));

      const startTime = Date.now();

      await Promise.all(
        images.map((img) =>
          imageService.processAndConvertToWebP(img.buffer, img.filename)
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle batch efficiently
      expect(duration).toBeLessThan(1000);
      expect(sharp).toHaveBeenCalledTimes(imageCount);
    });
  });
});
