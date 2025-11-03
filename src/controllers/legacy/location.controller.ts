/**
 * Location Controller
 * Manages location hierarchy and geographical data
 *
 * @module controllers/location.controller
 */

import { Request, Response } from "express";
import { LocationModel, LocationType, ProjectModel } from "@models";
import { ApiResponse } from "@utils/response.util";

class LocationController {
  /**
   * @route GET /api/locations
   * @access Public
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    const { type, parentId, isActive = true } = req.query;

    const locations = await LocationModel.findAll({
      type: type as LocationType,
      parentId: parentId ? Number(parentId) : undefined,
      isActive: isActive === "true",
    });

    ApiResponse.success(res, locations, "Locations retrieved successfully");
  };

  /**
   * @route GET /api/locations/hierarchy
   * @access Public
   */
  getHierarchy = async (req: Request, res: Response): Promise<void> => {
    const { parentId } = req.query;

    const hierarchy = await LocationModel.getHierarchy(
      parentId ? Number(parentId) : null
    );

    ApiResponse.success(
      res,
      hierarchy,
      "Location hierarchy retrieved successfully"
    );
  };

  /**
   * @route GET /api/locations/:identifier
   * @access Public
   */
  getOne = async (req: Request, res: Response): Promise<void> => {
    const { identifier } = req.params;
    const { includeProjects } = req.query;

    const isNumeric = /^\d+$/.test(identifier);
    const location = isNumeric
      ? await LocationModel.findById(Number(identifier))
      : await LocationModel.findBySlug(identifier);

    if (!location) {
      ApiResponse.notFound(res, "Location not found");
      return;
    }

    if (includeProjects === "true") {
      const [projects, children] = await Promise.all([
        ProjectModel.findAll({ locationId: location.id }),
        LocationModel.getChildren(location.id, false),
      ]);

      ApiResponse.success(
        res,
        {
          ...location,
          projects,
          childLocations: children,
        },
        "Location with projects retrieved successfully"
      );
    } else {
      ApiResponse.success(res, location, "Location retrieved successfully");
    }
  };

  /**
   * @route GET /api/locations/:id/children
   * @access Public
   */
  getChildren = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { recursive = "false" } = req.query;

    const children = await LocationModel.getChildren(
      Number(id),
      recursive === "true"
    );

    ApiResponse.success(
      res,
      children,
      "Location children retrieved successfully"
    );
  };

  /**
   * @route GET /api/locations/:id/parents
   * @access Public
   */
  getParents = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const parents = await LocationModel.getParents(Number(id));

    ApiResponse.success(
      res,
      parents,
      "Location breadcrumb retrieved successfully"
    );
  };
}

export default new LocationController();
