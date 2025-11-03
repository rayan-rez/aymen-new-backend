/**
 * Apartment Controller
 * Handles all apartment-related HTTP requests
 * 
 * @module controllers/apartment.controller
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import ApartmentModel, { 
  ApartmentStatus, 
  ApartmentQueryOptions 
} from "@models/apartment.model";
import { AppError } from "@/middlewares/error-handler.middleware";

/**
 * Apartment Controller Class
 */
export class ApartmentController {
  /**
   * Get all apartments with filtering and pagination
   * GET /api/apartments
   */
  async getApartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        projectId,
        status,
        isPublished,
        minPrice,
        maxPrice,
        bedrooms,
        bathrooms,
        minArea,
        maxArea,
        floorNumber,
        search,
        sortBy = "unit_number",
        sortOrder = "asc",
      } = req.query;

      const options: ApartmentQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      // Apply filters
      if (projectId) options.projectId = Number(projectId);
      if (status) options.status = status as ApartmentStatus;
      if (isPublished !== undefined) options.isPublished = isPublished === "true";
      if (minPrice) options.minPrice = Number(minPrice);
      if (maxPrice) options.maxPrice = Number(maxPrice);
      if (bedrooms) options.bedrooms = Number(bedrooms);
      if (bathrooms) options.bathrooms = Number(bathrooms);
      if (minArea) options.minArea = Number(minArea);
      if (maxArea) options.maxArea = Number(maxArea);
      if (floorNumber) options.floorNumber = Number(floorNumber);
      if (search) options.search = search as string;

      const result = await ApartmentModel.paginateApartments(options);

      ApiResponse.success(res, result, "Apartments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get apartment by ID
   * GET /api/apartments/:id
   */
  async getApartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { relations } = req.query;

      const relationsList = relations 
        ? (relations as string).split(",") 
        : ["project"];

      const apartment = await ApartmentModel.findById(
        Number(id),
        { relations: relationsList }
      );

      if (!apartment) {
        throw new AppError("Apartment not found", 404);
      }

      ApiResponse.success(res, apartment, "Apartment retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get apartments by project
   * GET /api/apartments/project/:projectId
   */
  async getApartmentsByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const { status, minPrice, maxPrice, bedrooms } = req.query;

      const options: ApartmentQueryOptions = {};
      if (status) options.status = status as ApartmentStatus;
      if (minPrice) options.minPrice = Number(minPrice);
      if (maxPrice) options.maxPrice = Number(maxPrice);
      if (bedrooms) options.bedrooms = Number(bedrooms);

      const apartments = await ApartmentModel.findByProject(Number(projectId), options);

      ApiResponse.success(res, apartments, "Apartments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available apartments
   * GET /api/apartments/available
   */
  async getAvailableApartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, page = 1, limit = 10 } = req.query;

      const options: ApartmentQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
      };

      const result = await ApartmentModel.paginateApartments({
        ...options,
        status: ApartmentStatus.AVAILABLE,
        isPublished: true,
        ...(projectId && { projectId: Number(projectId) }),
      });

      ApiResponse.success(res, result, "Available apartments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get model units
   * GET /api/apartments/model-units
   */
  async getModelUnits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.query;

      const apartments = await ApartmentModel.findModelUnits(
        projectId ? Number(projectId) : undefined
      );

      ApiResponse.success(res, apartments, "Model units retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get apartments by floor
   * GET /api/apartments/floor
   */
  async getApartmentsByFloor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, floorNumber } = req.query;

      if (!projectId || !floorNumber) {
        throw new AppError("projectId and floorNumber are required", 400);
      }

      const apartments = await ApartmentModel.findByFloor(
        Number(projectId),
        Number(floorNumber)
      );

      ApiResponse.success(res, apartments, "Apartments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get apartment availability summary for project
   * GET /api/apartments/availability/:projectId
   */
  async getAvailabilitySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;

      const summary = await ApartmentModel.getAvailabilitySummary(Number(projectId));

      ApiResponse.success(res, summary, "Availability summary retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project statistics
   * GET /api/apartments/statistics/:projectId
   */
  async getProjectStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;

      const statistics = await ApartmentModel.getProjectStatistics(Number(projectId));

      ApiResponse.success(res, statistics, "Statistics retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get floor distribution
   * GET /api/apartments/distribution/floors/:projectId
   */
  async getFloorDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;

      const distribution = await ApartmentModel.getFloorDistribution(Number(projectId));

      ApiResponse.success(res, distribution, "Floor distribution retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bedroom distribution
   * GET /api/apartments/distribution/bedrooms/:projectId
   */
  async getBedroomDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;

      const distribution = await ApartmentModel.getBedroomDistribution(Number(projectId));

      ApiResponse.success(res, distribution, "Bedroom distribution retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new apartment
   * POST /api/apartments
   */
  async createApartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartment = await ApartmentModel.create(req.body);

      ApiResponse.created(res, apartment, "Apartment created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update apartment
   * PUT /api/apartments/:id
   */
  async updateApartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const apartment = await ApartmentModel.update(Number(id), req.body);

      if (!apartment) {
        throw new AppError("Apartment not found", 404);
      }

      ApiResponse.success(res, apartment, "Apartment updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete apartment
   * DELETE /api/apartments/:id
   */
  async deleteApartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await ApartmentModel.delete(Number(id));

      if (!deleted) {
        throw new AppError("Apartment not found", 404);
      }

      ApiResponse.success(res, null, "Apartment deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update apartment status
   * PATCH /api/apartments/:id/status
   * 
   * Body: { status: ApartmentStatus }
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(ApartmentStatus).includes(status)) {
        throw new AppError("Invalid status", 400);
      }

      const apartment = await ApartmentModel.updateStatus(Number(id), status);

      if (!apartment) {
        throw new AppError("Apartment not found", 404);
      }

      ApiResponse.success(res, apartment, "Status updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark apartment as sold
   * PATCH /api/apartments/:id/sold
   */
  async markAsSold(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const apartment = await ApartmentModel.markAsSold(Number(id));

      if (!apartment) {
        throw new AppError("Apartment not found", 404);
      }

      ApiResponse.success(res, apartment, "Apartment marked as sold");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark apartment as reserved
   * PATCH /api/apartments/:id/reserved
   */
  async markAsReserved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const apartment = await ApartmentModel.markAsReserved(Number(id));

      if (!apartment) {
        throw new AppError("Apartment not found", 404);
      }

      ApiResponse.success(res, apartment, "Apartment marked as reserved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark apartment as available
   * PATCH /api/apartments/:id/available
   */
  async markAsAvailable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const apartment = await ApartmentModel.markAsAvailable(Number(id));

      if (!apartment) {
        throw new AppError("Apartment not found", 404);
      }

      ApiResponse.success(res, apartment, "Apartment marked as available");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update status
   * PATCH /api/apartments/bulk/status
   * 
   * Body: { ids: number[], status: ApartmentStatus }
   */
  async bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids, status } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError("ids must be a non-empty array", 400);
      }

      if (!Object.values(ApartmentStatus).includes(status)) {
        throw new AppError("Invalid status", 400);
      }

      const count = await ApartmentModel.bulkUpdateStatus(ids, status);

      ApiResponse.success(
        res,
        { updated: count },
        `${count} apartment(s) updated successfully`
      );
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new ApartmentController();