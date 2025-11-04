/**
 * Location Controllers
 * Handles location hierarchy
 *
 * @module controllers/location.controllers
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import LocationModel, { LocationType } from "@models/location.model";
import { AppError } from "@/middlewares/error-handler.middleware";

// ============================================================================
// LOCATION CONTROLLER
// ============================================================================

/**
 * Location Controller Class
 */
export class LocationController {
  /**
   * Get all locations
   * GET /api/locations
   */
  async getLocations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { type, parentId, isActive, depth, page, limit } = req.query;

      const options: any = {};
      if (type) options.type = type;
      if (parentId) options.parentId = Number(parentId);
      if (isActive !== undefined) options.isActive = isActive === "true";
      if (depth) options.depth = Number(depth);

      if (page && limit) {
        options.page = Number(page);
        options.limit = Number(limit);
        const result = await LocationModel.paginateLocations(options);
        ApiResponse.success(res, result, "Locations retrieved successfully");
      } else {
        const locations = await LocationModel.findLocations(options);
        ApiResponse.success(res, locations, "Locations retrieved successfully");
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get location by ID with hierarchy
   * GET /api/locations/:id
   */
  async getLocationById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { includeHierarchy } = req.query;

      if (includeHierarchy === "true") {
        const location = await LocationModel.getWithHierarchy(Number(id));
        if (!location) {
          throw new AppError("Location not found", 404);
        }
        ApiResponse.success(
          res,
          location,
          "Location with hierarchy retrieved successfully"
        );
      } else {
        const location = await LocationModel.findById(Number(id));
        if (!location) {
          throw new AppError("Location not found", 404);
        }
        ApiResponse.success(res, location, "Location retrieved successfully");
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all countries
   * GET /api/locations/countries
   */
  async getCountries(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const countries = await LocationModel.getCountries();
      ApiResponse.success(res, countries, "Countries retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get regions by country
   * GET /api/locations/countries/:countryId/regions
   */
  async getRegions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { countryId } = req.params;
      const regions = await LocationModel.getRegions(Number(countryId));
      ApiResponse.success(res, regions, "Regions retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cities by region
   * GET /api/locations/regions/:regionId/cities
   */
  async getCities(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { regionId } = req.params;
      const cities = await LocationModel.getCities(Number(regionId));
      ApiResponse.success(res, cities, "Cities retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get neighborhoods by city
   * GET /api/locations/cities/:cityId/neighborhoods
   */
  async getNeighborhoods(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { cityId } = req.params;
      const neighborhoods = await LocationModel.getNeighborhoods(
        Number(cityId)
      );
      ApiResponse.success(
        res,
        neighborhoods,
        "Neighborhoods retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get location hierarchy path
   * GET /api/locations/:id/hierarchy
   */
  async getHierarchyPath(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const hierarchy = await LocationModel.getHierarchyPath(Number(id));
      ApiResponse.success(
        res,
        hierarchy,
        "Hierarchy path retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get location descendants
   * GET /api/locations/:id/descendants
   */
  async getDescendants(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { maxDepth, typesOnly } = req.query;

      const options: any = {};
      if (maxDepth) options.maxDepth = Number(maxDepth);
      if (typesOnly) options.typesOnly = (typesOnly as string).split(",");

      const descendants = await LocationModel.getDescendants(
        Number(id),
        options
      );
      ApiResponse.success(
        res,
        descendants,
        "Descendants retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create location
   * POST /api/locations
   */
  async createLocation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const location = await LocationModel.create(req.body);
      ApiResponse.created(res, location, "Location created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update location
   * PUT /api/locations/:id
   */
  async updateLocation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const location = await LocationModel.update(Number(id), req.body);
      if (!location) {
        throw new AppError("Location not found", 404);
      }
      ApiResponse.success(res, location, "Location updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete location
   * DELETE /api/locations/:id
   */
  async deleteLocation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await LocationModel.delete(Number(id));
      if (!deleted) {
        throw new AppError("Location not found", 404);
      }
      ApiResponse.success(res, null, "Location deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get location statistics
   * GET /api/locations/statistics
   */
  async getStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await LocationModel.getStatistics();
      ApiResponse.success(res, stats, "Statistics retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

}

export default new LocationController();
