/**
 * Project Controller
 * Handles real estate development projects and related operations
 * Manages project CRUD, features, photos, and relationships
 *
 * @module controllers/project.controller
 */

import { Request, Response } from "express";
import {
  ProjectModel,
  ProjectStatus,
  ApartmentModel,
  FeatureModel,
} from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Project Controller class
 * Manages all project-related operations
 */
class ProjectController {
  /**
   * Get all projects with filtering and pagination
   *
   * @route GET /api/projects
   * @access Public
   *
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 100)
   * @query status - Filter by status
   * @query locationId - Filter by location
   * @query isFeatured - Filter featured projects
   * @query search - Search by name
   *
   * @example
   * GET /api/projects?status=under_construction&isFeatured=true&page=1&limit=10
   */
  getAllProjects = async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 100,
      status,
      locationId,
      isFeatured,
      search,
    } = req.query;

    try {
      const projects = await ProjectModel.findAll({
        page: Number(page),
        limit: Number(limit),
        status: status as ProjectStatus,
        locationId: locationId ? Number(locationId) : undefined,
        isFeatured: isFeatured === "true",
      });

      // Filter by search if provided
      let filteredProjects = projects;
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        filteredProjects = projects.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.address?.toLowerCase().includes(searchLower)
        );
      }

      ApiResponse.success(
        res,
        filteredProjects,
        "Projects retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getAllProjects:", error);
      ApiResponse.error(res, "Failed to retrieve projects", 500);
    }
  };

  /**
   * Get project by slug
   * Returns complete project with all relations
   *
   * @route GET /api/projects/:slug
   * @access Public
   *
   * @example
   * GET /api/projects/luxury-residence-annaba
   */
  getProjectBySlug = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;

    try {
      const project = await ProjectModel.findBySlug(slug);

      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      // Get complete project with all relations
      const completeProject = await ProjectModel.getComplete(project.id);

      ApiResponse.success(
        res,
        completeProject,
        "Project retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectBySlug:", error);
      ApiResponse.error(res, "Failed to retrieve project", 500);
    }
  };

  /**
   * Get featured projects
   *
   * @route GET /api/projects/featured
   * @access Public
   *
   * @query limit - Maximum number of projects (default: 5)
   *
   * @example
   * GET /api/projects/featured?limit=5
   */
  getFeaturedProjects = async (req: Request, res: Response): Promise<void> => {
    const { limit = 5 } = req.query;

    try {
      const projects = await ProjectModel.getFeatured(Number(limit));

      ApiResponse.success(
        res,
        projects,
        "Featured projects retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getFeaturedProjects:", error);
      ApiResponse.error(res, "Failed to retrieve featured projects", 500);
    }
  };

  /**
   * Get project features/characteristics
   * Returns project with all its features
   *
   * @route GET /api/projects/:slug/features
   * @access Public
   *
   * @example
   * GET /api/projects/luxury-residence-annaba/features
   */
  getProjectFeatures = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;

    try {
      const project = await ProjectModel.findBySlug(slug);

      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      const projectWithFeatures = await ProjectModel.getWithFeatures(
        project.id
      );

      ApiResponse.success(
        res,
        projectWithFeatures,
        "Project features retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectFeatures:", error);
      ApiResponse.error(res, "Failed to retrieve project features", 500);
    }
  };

  /**
   * Get project photos/gallery
   *
   * @route GET /api/projects/:id/photos
   * @access Public
   *
   * @example
   * GET /api/projects/1/photos
   */
  getProjectPhotos = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const projectWithPhotos = await ProjectModel.getWithPhotos(Number(id));

      if (!projectWithPhotos) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      ApiResponse.success(
        res,
        projectWithPhotos,
        "Project photos retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectPhotos:", error);
      ApiResponse.error(res, "Failed to retrieve project photos", 500);
    }
  };

  /**
   * Get project apartments
   *
   * @route GET /api/projects/:id/apartments
   * @access Public
   *
   * @query status - Filter by apartment status
   * @query bedrooms - Filter by number of bedrooms
   *
   * @example
   * GET /api/projects/1/apartments?status=available&bedrooms=3
   */
  getProjectApartments = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, bedrooms } = req.query;

    try {
      const project = await ProjectModel.findById(Number(id));

      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      const apartments = await ApartmentModel.findAll({
        projectId: Number(id),
        status: status as any,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
      });

      ApiResponse.success(
        res,
        {
          project: {
            id: project.id,
            name: project.name,
            slug: project.slug,
          },
          apartments,
        },
        "Project apartments retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectApartments:", error);
      ApiResponse.error(res, "Failed to retrieve project apartments", 500);
    }
  };

  /**
   * Create new project
   *
   * @route POST /api/projects
   * @access Private (Admin)
   *
   * @body name - Project name
   * @body slug - URL slug
   * @body address - Project address
   * @body status - Project status
   * @body description - Project description
   *
   * @example
   * POST /api/projects
   * {
   *   "name": "Luxury Residence",
   *   "slug": "luxury-residence-annaba",
   *   "address": "123 Main St, Annaba",
   *   "status": "planning"
   * }
   */
  createProject = async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      slug,
      address,
      status,
      description,
      descriptionSecondary,
      locationId,
      latitude,
      longitude,
      mapEmbedCode,
      mainPhotoUrl,
      isFeatured,
    } = req.body;

    try {
      // Validate required fields
      if (!name || !slug || !address) {
        ApiResponse.badRequest(res, "Name, slug, and address are required");
        return;
      }

      // Check if slug already exists
      const existing = await ProjectModel.findBySlug(slug);
      if (existing) {
        ApiResponse.conflict(res, "Project with this slug already exists");
        return;
      }

      const project = await ProjectModel.create({
        name,
        slug,
        address,
        status: status || ProjectStatus.PLANNING,
        description: description || null,
        descriptionSecondary: descriptionSecondary || null,
        locationId: locationId ? Number(locationId) : null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        mapEmbedCode: mapEmbedCode || null,
        mainPhotoUrl: mainPhotoUrl || null,
        isFeatured: Boolean(isFeatured),
      });

      ApiResponse.created(res, project, "Project created successfully");
    } catch (error) {
      console.error("Error in createProject:", error);
      ApiResponse.error(res, "Failed to create project", 500);
    }
  };

  /**
   * Update project
   *
   * @route PUT /api/projects/:id
   * @access Private (Admin)
   *
   * @example
   * PUT /api/projects/1
   * {
   *   "name": "Updated Name",
   *   "status": "under_construction"
   * }
   */
  updateProject = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    try {
      const project = await ProjectModel.findById(Number(id));

      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      const updated = await ProjectModel.update(Number(id), updateData);

      ApiResponse.success(res, updated, "Project updated successfully");
    } catch (error) {
      console.error("Error in updateProject:", error);
      ApiResponse.error(res, "Failed to update project", 500);
    }
  };

  /**
   * Update project completion percentage
   *
   * @route PATCH /api/projects/:id/completion
   * @access Private (Admin)
   *
   * @body percentage - Completion percentage (0-100)
   *
   * @example
   * PATCH /api/projects/1/completion
   * { "percentage": 75 }
   */
  updateCompletionPercentage = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const { percentage } = req.body;

    try {
      if (percentage === undefined || percentage < 0 || percentage > 100) {
        ApiResponse.badRequest(res, "Percentage must be between 0 and 100");
        return;
      }

      const success = await ProjectModel.updateCompletionPercentage(
        Number(id),
        Number(percentage)
      );

      if (!success) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      ApiResponse.success(
        res,
        { percentage },
        "Completion percentage updated successfully"
      );
    } catch (error) {
      console.error("Error in updateCompletionPercentage:", error);
      ApiResponse.error(res, "Failed to update completion percentage", 500);
    }
  };

  /**
   * Delete project (soft delete)
   *
   * @route DELETE /api/projects/:id
   * @access Private (Admin)
   *
   * @example
   * DELETE /api/projects/1
   */
  deleteProject = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const project = await ProjectModel.findById(Number(id));

      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      const deleted = await ProjectModel.softDelete(Number(id));

      if (!deleted) {
        ApiResponse.error(res, "Failed to delete project", 500);
        return;
      }

      ApiResponse.success(res, null, "Project deleted successfully");
    } catch (error) {
      console.error("Error in deleteProject:", error);
      ApiResponse.error(res, "Failed to delete project", 500);
    }
  };

  /**
   * Add feature to project
   *
   * @route POST /api/projects/:id/features
   * @access Private (Admin)
   *
   * @body featureId - Feature ID to add
   *
   * @example
   * POST /api/projects/1/features
   * { "featureId": 5 }
   */
  addProjectFeature = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { featureId } = req.body;

    try {
      if (!featureId) {
        ApiResponse.badRequest(res, "Feature ID is required");
        return;
      }

      // Check if project and feature exist
      const [project, feature] = await Promise.all([
        ProjectModel.findById(Number(id)),
        FeatureModel.findById(Number(featureId)),
      ]);

      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      if (!feature) {
        ApiResponse.notFound(res, "Feature not found");
        return;
      }

      const success = await ProjectModel.addFeature(
        Number(id),
        Number(featureId)
      );

      if (!success) {
        ApiResponse.conflict(res, "Feature already added to project");
        return;
      }

      ApiResponse.success(res, null, "Feature added to project successfully");
    } catch (error) {
      console.error("Error in addProjectFeature:", error);
      ApiResponse.error(res, "Failed to add feature to project", 500);
    }
  };

  /**
   * Remove feature from project
   *
   * @route DELETE /api/projects/:id/features/:featureId
   * @access Private (Admin)
   *
   * @example
   * DELETE /api/projects/1/features/5
   */
  removeProjectFeature = async (req: Request, res: Response): Promise<void> => {
    const { id, featureId } = req.params;

    try {
      const success = await ProjectModel.removeFeature(
        Number(id),
        Number(featureId)
      );

      if (!success) {
        ApiResponse.notFound(res, "Project or feature not found");
        return;
      }

      ApiResponse.success(
        res,
        null,
        "Feature removed from project successfully"
      );
    } catch (error) {
      console.error("Error in removeProjectFeature:", error);
      ApiResponse.error(res, "Failed to remove feature from project", 500);
    }
  };
}

export default new ProjectController();
