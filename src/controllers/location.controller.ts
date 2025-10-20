/**
 * Location Controller
 * Handles location hierarchy and geographical data
 *
 * @module controllers/location.controller
 */

import { Request, Response } from "express";
import { LocationModel, LocationType, ProjectModel } from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Location Controller class
 * Manages locations and their hierarchical relationships
 */
class LocationController {
  /**
   * Get all locations with optional filtering
   *
   * @route GET /api/v1/locations
   * @access Public
   */
  async getAllLocations(req: Request, res: Response): Promise<void> {
    const { type, parentId, isActive = true } = req.query;

    const locations = await LocationModel.findAll({
      type: type as LocationType,
      parentId: parentId ? Number(parentId) : undefined,
      isActive: isActive === "true",
    });

    ApiResponse.success(res, locations, "Locations retrieved successfully");
  }

  /**
   * Get location hierarchy
   * Returns locations in tree structure
   *
   * @route GET /api/v1/locations/hierarchy
   * @access Public
   */
  async getHierarchy(req: Request, res: Response): Promise<void> {
    const { parentId } = req.query;

    const hierarchy = await LocationModel.getHierarchy(
      parentId ? Number(parentId) : null
    );

    ApiResponse.success(
      res,
      hierarchy,
      "Location hierarchy retrieved successfully"
    );
  }

  /**
   * Get location by slug
   *
   * @route GET /api/v1/locations/:slug
   * @access Public
   */
  async getLocationBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;

    const location = await LocationModel.findBySlug(slug);

    if (!location) {
      ApiResponse.notFound(res, "Location not found");
      return;
    }

    ApiResponse.success(res, location, "Location retrieved successfully");
  }

  /**
   * Get location with projects
   * Returns location with all associated projects
   *
   * @route GET /api/v1/locations/:slug/projects
   * @access Public
   */
  async getLocationWithProjects(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;

    const location = await LocationModel.findBySlug(slug);

    if (!location) {
      ApiResponse.notFound(res, "Location not found");
      return;
    }

    // Get projects in this location
    const projects = await ProjectModel.findAll({
      locationId: location.id,
    });

    // Get child locations
    const children = await LocationModel.getChildren(location.id, false);

    const response = {
      ...location,
      projects,
      childLocations: children,
    };

    ApiResponse.success(
      res,
      response,
      "Location with projects retrieved successfully"
    );
  }

  /**
   * Get location children
   *
   * @route GET /api/v1/locations/:id/children
   * @access Public
   */
  async getLocationChildren(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Get location parents (breadcrumb)
   *
   * @route GET /api/v1/locations/:id/parents
   * @access Public
   */
  async getLocationParents(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const parents = await LocationModel.getParents(Number(id));

    ApiResponse.success(
      res,
      parents,
      "Location breadcrumb retrieved successfully"
    );
  }
}

export default new LocationController();
