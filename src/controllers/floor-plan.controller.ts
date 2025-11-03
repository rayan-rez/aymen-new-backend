/**
 * Floor Plan Controller (Polymorphic)
 * Handles all floor plan-related HTTP requests across multiple entity types
 *
 * Supported entities: projects, apartments
 *
 * @module controllers/floor-plan.controller
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import FloorPlanModel, {
  PlannableType,
  FloorPlan,
} from "@models/floor-plan.model";
import { AppError } from "@/middlewares/error-handler.middleware";
import { Knex } from "knex";
import db from "@/config/database";

/**
 * Floor Plan Controller Class
 */
export class FloorPlanController {
  // ============================================================================
  // GENERIC CRUD OPERATIONS (Works for all entity types)
  // ============================================================================

  /**
   * Get all floor plans for a specific entity
   * GET /api/{entity-type}/{id}/floor-plans
   *
   * @example GET /api/projects/123/floor-plans
   * @example GET /api/apartments/456/floor-plans?hasPdf=true
   */
  async getFloorPlansForEntity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { hasPdf, searchName } = req.query;

      // Validate entity type
      const plannableType = this.validateAndMapEntityType(entityType);

      // Build query options
      const options: any = {
        polymorphicType: plannableType,
        polymorphicId: Number(id),
      };

      if (hasPdf !== undefined) options.hasPdf = hasPdf === "true";
      if (searchName) options.searchName = searchName as string;

      const floorPlans = await FloorPlanModel.findFloorPlans(options);

      ApiResponse.success(
        res,
        floorPlans,
        "Floor plans retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single floor plan by ID
   * GET /api/floor-plans/{floorPlanId}
   */
  async getFloorPlanById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;

      const floorPlan = await FloorPlanModel.findById(Number(floorPlanId));

      if (!floorPlan) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, floorPlan, "Floor plan retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get floor plan by name
   * GET /api/{entity-type}/{id}/floor-plans/by-name/{name}
   */
  async getFloorPlanByName(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id, name } = req.params;

      const plannableType = this.validateAndMapEntityType(entityType);
      const floorPlan = await FloorPlanModel.findByName(
        plannableType,
        Number(id),
        name
      );

      if (!floorPlan) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, floorPlan, "Floor plan retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add floor plans to entity
   * POST /api/{entity-type}/{id}/floor-plans
   *
   * Body: {
   *   floorPlans: [
   *     { name, imageUrl, pdfUrl?, displayOrder? }
   *   ]
   * }
   */
  async addFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { floorPlans } = req.body;

      if (
        !floorPlans ||
        !Array.isArray(floorPlans) ||
        floorPlans.length === 0
      ) {
        throw new AppError("floorPlans array is required", 400);
      }

      const plannableType = this.validateAndMapEntityType(entityType);
      const entityId = Number(id);

      // Validate entity exists
      await this.validateEntityExists(plannableType, entityId);

      // Create floor plans in transaction
      const trx = await db.transaction();

      try {
        const createdFloorPlans = await FloorPlanModel.createManyForEntity(
          plannableType,
          entityId,
          floorPlans,
          trx
        );

        await trx.commit();

        ApiResponse.created(
          res,
          createdFloorPlans,
          `${createdFloorPlans.length} floor plan(s) added successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update floor plan
   * PATCH /api/floor-plans/{floorPlanId}
   *
   * Body: { name?, imageUrl?, pdfUrl?, displayOrder? }
   */
  async updateFloorPlan(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        throw new AppError("No update data provided", 400);
      }

      const floorPlan = await FloorPlanModel.update(
        Number(floorPlanId),
        updateData
      );

      if (!floorPlan) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, floorPlan, "Floor plan updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update floor plan files (image and/or PDF)
   * PATCH /api/floor-plans/{floorPlanId}/files
   *
   * Body: { imageUrl?, pdfUrl? }
   */
  async updateFloorPlanFiles(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;
      const { imageUrl, pdfUrl } = req.body;

      if (!imageUrl && pdfUrl === undefined) {
        throw new AppError("imageUrl or pdfUrl is required", 400);
      }

      const files: any = {};
      if (imageUrl) files.imageUrl = imageUrl;
      if (pdfUrl !== undefined) files.pdfUrl = pdfUrl;

      const floorPlan = await FloorPlanModel.updateFiles(
        Number(floorPlanId),
        files
      );

      if (!floorPlan) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(
        res,
        floorPlan,
        "Floor plan files updated successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove PDF from floor plan
   * DELETE /api/floor-plans/{floorPlanId}/pdf
   */
  async removePdf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;

      const floorPlan = await FloorPlanModel.removePdf(Number(floorPlanId));

      if (!floorPlan) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, floorPlan, "PDF removed successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete floor plan
   * DELETE /api/floor-plans/{floorPlanId}
   */
  async deleteFloorPlan(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;

      const deleted = await FloorPlanModel.delete(Number(floorPlanId));

      if (!deleted) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, null, "Floor plan deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete multiple floor plans
   * DELETE /api/{entity-type}/{id}/floor-plans
   *
   * Body: { floorPlanIds?: number[] } (if empty, deletes all)
   */
  async deleteFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { floorPlanIds } = req.body;

      const plannableType = this.validateAndMapEntityType(entityType);
      const entityId = Number(id);

      const trx = await db.transaction();

      try {
        let deletedCount = 0;

        if (
          floorPlanIds &&
          Array.isArray(floorPlanIds) &&
          floorPlanIds.length > 0
        ) {
          // Delete specific floor plans
          deletedCount = Number(
            await FloorPlanModel.bulkDelete(floorPlanIds, {
              force: false,
            })
          );
        } else {
          // Delete all floor plans for entity
          const deleted = await FloorPlanModel.deleteForEntity(
            plannableType,
            entityId,
            false,
            trx
          );
          deletedCount = deleted ? 1 : 0;
        }

        await trx.commit();

        ApiResponse.success(
          res,
          { deleted: deletedCount },
          `${deletedCount} floor plan(s) deleted successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder floor plans for entity
   * POST /api/{entity-type}/{id}/floor-plans/reorder
   *
   * Body: { floorPlanIds: number[] }
   */
  async reorderFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { floorPlanIds } = req.body;

      if (
        !floorPlanIds ||
        !Array.isArray(floorPlanIds) ||
        floorPlanIds.length === 0
      ) {
        throw new AppError("floorPlanIds array is required", 400);
      }

      const plannableType = this.validateAndMapEntityType(entityType);
      const entityId = Number(id);

      await FloorPlanModel.reorder(plannableType, entityId, floorPlanIds);

      ApiResponse.success(res, null, "Floor plans reordered successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // SPECIALIZED OPERATIONS
  // ============================================================================

  /**
   * Get floor plans with PDF only
   * GET /api/{entity-type}/{id}/floor-plans/with-pdf
   */
  async getFloorPlansWithPdf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const plannableType = this.validateAndMapEntityType(entityType);
      const floorPlans = await FloorPlanModel.getFloorPlansWithPdf(
        plannableType,
        Number(id)
      );

      ApiResponse.success(
        res,
        floorPlans,
        "Floor plans with PDF retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search floor plans by name
   * GET /api/{entity-type}/{id}/floor-plans/search
   *
   * Query: { name: string }
   */
  async searchFloorPlansByName(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { name } = req.query;

      if (!name || typeof name !== "string") {
        throw new AppError("Search name is required", 400);
      }

      const plannableType = this.validateAndMapEntityType(entityType);
      const floorPlans = await FloorPlanModel.searchByName(
        plannableType,
        Number(id),
        name
      );

      ApiResponse.success(
        res,
        floorPlans,
        "Floor plans search results retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Duplicate floor plans from one entity to another
   * POST /api/floor-plans/duplicate
   *
   * Body: {
   *   sourceType: string,
   *   sourceId: number,
   *   targetType: string,
   *   targetId: number
   * }
   */
  async duplicateFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sourceType, sourceId, targetType, targetId } = req.body;

      if (!sourceType || !sourceId || !targetType || !targetId) {
        throw new AppError(
          "sourceType, sourceId, targetType, and targetId are required",
          400
        );
      }

      const sourcePlannableType = this.validateAndMapEntityType(sourceType);
      const targetPlannableType = this.validateAndMapEntityType(targetType);

      // Validate both entities exist
      await Promise.all([
        this.validateEntityExists(sourcePlannableType, Number(sourceId)),
        this.validateEntityExists(targetPlannableType, Number(targetId)),
      ]);

      const trx = await db.transaction();

      try {
        const duplicatedFloorPlans = await FloorPlanModel.duplicateFloorPlans(
          sourcePlannableType,
          Number(sourceId),
          targetPlannableType,
          Number(targetId),
          trx
        );

        await trx.commit();

        ApiResponse.created(
          res,
          duplicatedFloorPlans,
          `${duplicatedFloorPlans.length} floor plan(s) duplicated successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get floor plan statistics for entity
   * GET /api/{entity-type}/{id}/floor-plans/statistics
   */
  async getStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const plannableType = this.validateAndMapEntityType(entityType);
      const stats = await FloorPlanModel.getStatistics(
        plannableType,
        Number(id)
      );

      ApiResponse.success(
        res,
        stats,
        "Floor plan statistics retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Count floor plans for entity
   * GET /api/{entity-type}/{id}/floor-plans/count
   */
  async countFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const plannableType = this.validateAndMapEntityType(entityType);
      const count = await FloorPlanModel.countForEntity(
        plannableType,
        Number(id)
      );

      ApiResponse.success(
        res,
        { count },
        "Floor plan count retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if entity has floor plans
   * GET /api/{entity-type}/{id}/floor-plans/has-floor-plans
   */
  async hasFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const plannableType = this.validateAndMapEntityType(entityType);
      const hasFloorPlans = await FloorPlanModel.hasRecordsForEntity(
        plannableType,
        Number(id)
      );

      ApiResponse.success(
        res,
        { hasFloorPlans },
        hasFloorPlans ? "Entity has floor plans" : "Entity has no floor plans"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get floor plans grouped by entity type
   * GET /api/floor-plans/grouped
   *
   * Query: { entityType?, entityIds? }
   */
  async getFloorPlansGroupedByType(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, entityIds } = req.query;

      const options: any = {};

      if (entityType) {
        const plannableType = this.validateAndMapEntityType(
          entityType as string
        );
        options.polymorphicType = plannableType;
      }

      if (entityIds) {
        const ids = (entityIds as string).split(",").map(Number);
        options.polymorphicId = ids;
      }

      const grouped = await FloorPlanModel.groupByType(options);

      ApiResponse.success(
        res,
        grouped,
        "Floor plans grouped by type retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get floor plan count by entity type
   * GET /api/floor-plans/count-by-type
   */
  async getCountByType(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const counts = await FloorPlanModel.countByType();

      ApiResponse.success(
        res,
        counts,
        "Floor plan counts by type retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk update floor plans
   * PATCH /api/floor-plans/bulk
   *
   * Body: {
   *   updates: [
   *     { id: number, data: UpdateFloorPlanDto }
   *   ]
   * }
   */
  async bulkUpdateFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        throw new AppError("Updates array is required", 400);
      }

      const trx = await db.transaction();

      try {
        const result = await FloorPlanModel.bulkUpdate(updates, {}, trx);

        await trx.commit();

        ApiResponse.success(
          res,
          result,
          `${result.processed} floor plan(s) updated successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk delete floor plans by IDs
   * DELETE /api/floor-plans/bulk
   *
   * Body: { floorPlanIds: number[], force?: boolean }
   */
  async bulkDeleteFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanIds, force = false } = req.body;

      if (
        !floorPlanIds ||
        !Array.isArray(floorPlanIds) ||
        floorPlanIds.length === 0
      ) {
        throw new AppError("floorPlanIds array is required", 400);
      }

      const result = await FloorPlanModel.bulkDelete(floorPlanIds, { force });

      ApiResponse.success(
        res,
        result,
        `${result.processed} floor plan(s) deleted successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // VALIDATION & HELPER METHODS
  // ============================================================================

  /**
   * Validates and maps entity type to PlannableType
   */
  private validateAndMapEntityType(entityType: string): PlannableType {
    const typeMap: Record<string, PlannableType> = {
      projects: PlannableType.PROJECT,
      project: PlannableType.PROJECT,
      apartments: PlannableType.APARTMENT,
      apartment: PlannableType.APARTMENT,
    };

    const mappedType = typeMap[entityType.toLowerCase()];

    if (!mappedType) {
      throw new AppError(
        `Invalid entity type: ${entityType}. Valid types: projects, apartments`,
        400
      );
    }

    return mappedType;
  }

  /**
   * Validates that entity exists
   */
  private async validateEntityExists(
    entityType: PlannableType,
    entityId: number
  ): Promise<void> {
    const tableMap: Record<PlannableType, string> = {
      [PlannableType.PROJECT]: "projects",
      [PlannableType.APARTMENT]: "apartments",
    };

    const tableName = tableMap[entityType];

    const exists = await db(tableName)
      .where({ id: entityId })
      .whereNull("deleted_at")
      .first();

    if (!exists) {
      throw new AppError(`${entityType} with ID ${entityId} not found`, 404);
    }
  }
}

// Export singleton instance
export default new FloorPlanController();
