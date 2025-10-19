// src/services/image.service.ts
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

class ImageService {
  private uploadDir = path.join(__dirname, "../../uploads");

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

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

  async compressImage(
    inputBuffer: Buffer,
    filename: string,
    quality: number = 80
  ): Promise<Buffer> {
    return sharp(inputBuffer).webp({ quality }).toBuffer();
  }

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

  getImagePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}

export default new ImageService();
