/**
 * Feature Controllers
 * Handles feature management
 *
 * @module controllers/feature.controllers
 */

import FeatureModel, { FeatureCategory } from "@models/feature.model";
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import { AppError } from "@/middlewares/error-handler.middleware";
/**
 * Feature Controller Class
 */
export class FeatureController {
  /**
   * Get all features
   * GET /api/features
   */
  async getFeatures(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { category, isActive, page, limit } = req.query;

      const options: any = {};
      if (category) options.category = category;
      if (isActive !== undefined) options.isActive = isActive === "true";

      if (page && limit) {
        options.page = Number(page);
        options.limit = Number(limit);
        const result = await FeatureModel.paginateFeatures(options);
        ApiResponse.success(res, result, "Features retrieved successfully");
      } else {
        const features = await FeatureModel.findFeatures(options);
        ApiResponse.success(res, features, "Features retrieved successfully");
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active features only
   * GET /api/features/active
   */
  async getActiveFeatures(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const features = await FeatureModel.findActive();
      ApiResponse.success(
        res,
        features,
        "Active features retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get features by category
   * GET /api/features/category/:category
   */
  async getFeaturesByCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { category } = req.params;
      const features = await FeatureModel.findByCategory(
        category as FeatureCategory
      );
      ApiResponse.success(res, features, "Features retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feature by ID
   * GET /api/features/:id
   */
  async getFeatureById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { includeUsage } = req.query;

      if (includeUsage === "true") {
        const feature = await FeatureModel.getWithUsage(Number(id));
        if (!feature) {
          throw new AppError("Feature not found", 404);
        }
        ApiResponse.success(
          res,
          feature,
          "Feature with usage retrieved successfully"
        );
      } else {
        const feature = await FeatureModel.findById(Number(id));
        if (!feature) {
          throw new AppError("Feature not found", 404);
        }
        ApiResponse.success(res, feature, "Feature retrieved successfully");
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get most popular features
   * GET /api/features/popular
   */
  async getPopularFeatures(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      const features = await FeatureModel.getMostPopular(Number(limit));
      ApiResponse.success(
        res,
        features,
        "Popular features retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create feature
   * POST /api/features
   */
  async createFeature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const feature = await FeatureModel.create(req.body);
      ApiResponse.created(res, feature, "Feature created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update feature
   * PUT /api/features/:id
   */
  async updateFeature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const feature = await FeatureModel.update(Number(id), req.body);
      if (!feature) {
        throw new AppError("Feature not found", 404);
      }
      ApiResponse.success(res, feature, "Feature updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete feature
   * DELETE /api/features/:id
   */
  async deleteFeature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await FeatureModel.delete(Number(id));
      if (!deleted) {
        throw new AppError("Feature not found", 404);
      }
      ApiResponse.success(res, null, "Feature deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update feature translations
   * PATCH /api/features/:id/translations
   */
  async updateTranslations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { translations, merge = true } = req.body;

      const feature = await FeatureModel.updateTranslations(
        Number(id),
        translations,
        merge === true
      );

      if (!feature) {
        throw new AppError("Feature not found", 404);
      }

      ApiResponse.success(res, feature, "Translations updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feature statistics
   * GET /api/features/statistics
   */
  async getStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await FeatureModel.getStatistics();
      ApiResponse.success(res, stats, "Statistics retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk create features
   * POST /api/features/bulk
   */
  async bulkCreateFeatures(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { features } = req.body;

      if (!Array.isArray(features) || features.length === 0) {
        throw new AppError("Features array is required", 400);
      }

      const created = [];
      for (const featureData of features) {
        const feature = await FeatureModel.create(featureData);
        created.push(feature);
      }

      ApiResponse.created(res, created, `${created.length} feature(s) created`);
    } catch (error) {
      next(error);
    }
  }

}

export default new FeatureController();
