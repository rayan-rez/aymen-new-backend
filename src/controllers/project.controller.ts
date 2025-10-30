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
import db from "@/config/database";

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

  /**
   * Advanced filtering methods to add to project.controller.ts
   * Add these methods to the existing ProjectController class
   */

  /**
   * Gets projects with advanced filtering
   * Supports complex filters including localite, statut, and typologie
   *
   * @route GET /api/projects/filter
   * @access Public
   *
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 100)
   * @query localite - Comma-separated locations (e.g., "Dar el Beida,Kouba")
   * @query statut - Project status filter
   * @query typologie - Comma-separated apartment types (e.g., "F3,F4,F5")
   *
   * @example
   * GET /api/projects/filter?localite=Kouba,Dely Ibrahim&typologie=F3,F4&statut=completed
   */
  async getProjectsWithAdvancedFilters(
    req: Request,
    res: Response
  ): Promise<void> {
    const { page = 1, limit = 100, localite, statut, typologie } = req.query;

    try {
      const pageInt = parseInt(page as string, 10);
      const limitInt = parseInt(limit as string, 10);

      if (isNaN(pageInt) || pageInt <= 0) {
        ApiResponse.badRequest(res, "Invalid page number");
        return;
      }

      if (isNaN(limitInt) || limitInt <= 0) {
        ApiResponse.badRequest(res, "Invalid limit");
        return;
      }

      // Build base query
      let query = db("projects").whereNull("deleted_at");

      // Apply localite filter (with normalization)
      if (localite && typeof localite === "string") {
        const localiteArray = localite.split(",").map(
          (item) =>
            item
              .trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") // Remove accents
              .replace(/-/g, " ") // Replace hyphens with spaces
        );

        query = query.where((builder) => {
          localiteArray.forEach((loc, index) => {
            const method = index === 0 ? "where" : "orWhere";
            builder[method](
              db.raw("LOWER(REPLACE(address, '-', ' '))"),
              "like",
              `%${loc}%`
            );
          });
        });
      }

      // Apply status filter
      if (statut && typeof statut === "string") {
        query = query.where({ status: statut });
      }

      // Apply typologie filter (requires apartments_list column or join)
      // This assumes you have a computed field or JSON column with apartment types
      if (typologie && typeof typologie === "string") {
        const typologieArray = typologie.split(",").map((t) => t.trim());

        // Option 1: If you have apartments_list as comma-separated string
        query = query.where((builder) => {
          typologieArray.forEach((type, index) => {
            const method = index === 0 ? "where" : "orWhere";
            builder[method](
              db.raw("FIND_IN_SET(?, apartments_list) > 0", [type])
            );
          });
        });
      }

      // Get total count for pagination
      const countQuery = query.clone();
      const [{ count: totalCount }] = await countQuery.count("* as count");

      // Apply pagination and ordering
      const offset = (pageInt - 1) * limitInt;
      const projects = await query
        .orderBy("id", "desc")
        .limit(limitInt)
        .offset(offset);

      // Transform projects if needed (map apartments_list to array)
      const formattedProjects = projects.map((project) => ({
        ...project,
        apartments_list: project.apartments_list
          ? project.apartments_list.split(",").map((t: string) => t.trim())
          : [],
        completionPercentage: project.completion_percentage,
        mainPhotoUrl: project.main_photo_url,
      }));

      ApiResponse.success(
        res,
        {
          projects: formattedProjects,
          pagination: {
            total: Number(totalCount),
            page: pageInt,
            limit: limitInt,
            totalPages: Math.ceil(Number(totalCount) / limitInt),
          },
        },
        "Projects retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectsWithAdvancedFilters:", error);
      ApiResponse.error(res, "Failed to retrieve projects", 500);
    }
  }

  /**
   * Gets projects by specific location with normalized matching
   * Handles accent-insensitive and hyphen-insensitive matching
   *
   * @route GET /api/projects/location/:locationName
   * @access Public
   *
   * @example
   * GET /api/projects/location/Dar el Beida
   * GET /api/projects/location/Dely-Ibrahim
   */
  async getProjectsByLocation(req: Request, res: Response): Promise<void> {
    const { locationName } = req.params;

    try {
      if (!locationName) {
        ApiResponse.badRequest(res, "Location name is required");
        return;
      }

      // Normalize location name
      const normalizedLocation = locationName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/-/g, " ");

      const projects = await db("projects")
        .whereNull("deleted_at")
        .whereRaw("LOWER(REPLACE(address, '-', ' ')) LIKE ?", [
          `%${normalizedLocation}%`,
        ])
        .orderBy("created_at", "desc");

      ApiResponse.success(
        res,
        projects,
        `Projects in ${locationName} retrieved successfully`
      );
    } catch (error) {
      console.error("Error in getProjectsByLocation:", error);
      ApiResponse.error(res, "Failed to retrieve projects", 500);
    }
  }

  /**
   * Gets available apartment typologies across all projects
   * Useful for filter dropdowns
   *
   * @route GET /api/projects/typologies
   * @access Public
   *
   * @example
   * GET /api/projects/typologies
   */
  async getAvailableTypologies(req: Request, res: Response): Promise<void> {
    try {
      // This assumes you have a way to get unique apartment types
      // Option 1: If apartments_list is stored as comma-separated
      const projects = await db("projects")
        .whereNull("deleted_at")
        .whereNotNull("apartments_list")
        .select("apartments_list");

      const typologiesSet = new Set<string>();

      projects.forEach((project: any) => {
        if (project.apartments_list) {
          const types = project.apartments_list.split(",");
          types.forEach((type: string) => {
            typologiesSet.add(type.trim());
          });
        }
      });

      const typologies = Array.from(typologiesSet).sort();

      ApiResponse.success(
        res,
        { typologies },
        "Available typologies retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getAvailableTypologies:", error);
      ApiResponse.error(res, "Failed to retrieve typologies", 500);
    }
  }

  /**
   * Gets available locations across all projects
   * Useful for filter dropdowns
   *
   * @route GET /api/projects/locations
   * @access Public
   *
   * @example
   * GET /api/projects/locations
   */
  async getAvailableLocations(req: Request, res: Response): Promise<void> {
    try {
      // Get unique locations from projects
      const locations = await db("projects")
        .whereNull("deleted_at")
        .distinct("address")
        .select("address")
        .orderBy("address", "asc");

      // Extract city/location names from addresses
      const locationNames = locations
        .map((loc: any) => {
          // Extract location from address (basic parsing)
          const parts = loc.address.split(",");
          return parts[parts.length - 1]?.trim();
        })
        .filter((loc: string) => loc)
        .filter(
          (loc: string, index: number, self: string[]) =>
            self.indexOf(loc) === index
        )
        .sort();

      ApiResponse.success(
        res,
        { locations: locationNames },
        "Available locations retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getAvailableLocations:", error);
      ApiResponse.error(res, "Failed to retrieve locations", 500);
    }
  }
}

export default new ProjectController();
