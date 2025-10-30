/**
 * Property Controller (Unified)
 * Manages all property types: residential projects, apartments, and commercial properties
 * Consolidates duplicate logic from project.controller.ts and property.controller.ts
 *
 * @module controllers/property.controller
 */

import { Request, Response } from "express";
import {
  ProjectModel,
  ApartmentModel,
  CommercialPropertyModel,
  FeatureModel,
  ProjectStatus,
  ApartmentStatus,
  CommercialPropertyStatus,
  CommercialPropertyType,
} from "@models";
import { ApiResponse } from "@utils/response.util";
import db from "@/config/database";

class PropertyController {
  /**
   * @route GET /api/properties/projects
   * @access Public
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 100,
      status,
      locationId,
      isFeatured,
      search,
      localite,
      typologie,
      statut,
    } = req.query;

    try {
      if (localite || typologie || statut) {
        await this.getAllWithFilters(req, res);
        return;
      }

      const projects = await ProjectModel.findAll({
        page: Number(page),
        limit: Number(limit),
        status: status as ProjectStatus,
        locationId: locationId ? Number(locationId) : undefined,
        isFeatured: isFeatured === "true",
      });

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
      console.error("Error in getAll:", error);
      ApiResponse.error(res, "Failed to retrieve projects", 500);
    }
  };

  /**
   * @route GET /api/properties/projects/featured
   * @access Public
   */
  getFeatured = async (req: Request, res: Response): Promise<void> => {
    const { limit = 5 } = req.query;
    try {
      const projects = await ProjectModel.getFeatured(Number(limit));
      ApiResponse.success(
        res,
        projects,
        "Featured projects retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getFeatured:", error);
      ApiResponse.error(res, "Failed to retrieve featured projects", 500);
    }
  };

  /**
   * @route GET /api/properties/projects/:identifier
   * @access Public
   */
  getOne = async (req: Request, res: Response): Promise<void> => {
    const { identifier } = req.params;
    try {
      const isNumeric = /^\d+$/.test(identifier);
      const project = isNumeric
        ? await ProjectModel.findById(Number(identifier))
        : await ProjectModel.findBySlug(identifier);

      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }

      const completeProject = await ProjectModel.getComplete(project.id);
      ApiResponse.success(
        res,
        completeProject,
        "Project retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getOne:", error);
      ApiResponse.error(res, "Failed to retrieve project", 500);
    }
  };

  /**
   * @route POST /api/properties/projects
   * @access Private (Admin)
   */
  create = async (req: Request, res: Response): Promise<void> => {
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
      if (!name || !slug || !address) {
        ApiResponse.badRequest(res, "Name, slug, and address are required");
        return;
      }

      const existing = await ProjectModel.findBySlug(slug);
      if (existing) {
        ApiResponse.conflict(res, "Project slug already exists");
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
      console.error("Error in create:", error);
      ApiResponse.error(res, "Failed to create project", 500);
    }
  };

  /**
   * @route PUT /api/properties/projects/:id
   * @access Private (Admin)
   */
  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      const project = await ProjectModel.findById(Number(id));
      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }
      const updated = await ProjectModel.update(Number(id), req.body);
      ApiResponse.success(res, updated, "Project updated successfully");
    } catch (error) {
      console.error("Error in update:", error);
      ApiResponse.error(res, "Failed to update project", 500);
    }
  };

  /**
   * @route PATCH /api/properties/projects/:id
   * @access Private (Admin)
   */
  updatePartial = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { percentage } = req.body;

    try {
      if (percentage !== undefined) {
        if (percentage < 0 || percentage > 100) {
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
          "Completion updated successfully"
        );
        return;
      }

      const project = await ProjectModel.findById(Number(id));
      if (!project) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }
      const updated = await ProjectModel.update(Number(id), req.body);
      ApiResponse.success(res, updated, "Project updated successfully");
    } catch (error) {
      console.error("Error in updatePartial:", error);
      ApiResponse.error(res, "Failed to update project", 500);
    }
  };

  /**
   * @route DELETE /api/properties/projects/:id
   * @access Private (Admin)
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      const deleted = await ProjectModel.softDelete(Number(id));
      if (!deleted) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }
      ApiResponse.success(res, null, "Project deleted successfully");
    } catch (error) {
      console.error("Error in delete:", error);
      ApiResponse.error(res, "Failed to delete project", 500);
    }
  };

  /**
   * @route GET /api/properties/projects/:id/features
   * @access Public
   */
  getFeatures = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      const projectWithFeatures = await ProjectModel.getWithFeatures(
        Number(id)
      );
      if (!projectWithFeatures) {
        ApiResponse.notFound(res, "Project not found");
        return;
      }
      ApiResponse.success(
        res,
        projectWithFeatures,
        "Features retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getFeatures:", error);
      ApiResponse.error(res, "Failed to retrieve features", 500);
    }
  };

  /**
   * @route POST /api/properties/projects/:id/features
   * @access Private (Admin)
   */
  addFeature = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { featureId } = req.body;

    try {
      if (!featureId) {
        ApiResponse.badRequest(res, "Feature ID is required");
        return;
      }

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
        ApiResponse.conflict(res, "Feature already added");
        return;
      }

      ApiResponse.success(res, null, "Feature added successfully");
    } catch (error) {
      console.error("Error in addFeature:", error);
      ApiResponse.error(res, "Failed to add feature", 500);
    }
  };

  /**
   * @route DELETE /api/properties/projects/:id/features/:featureId
   * @access Private (Admin)
   */
  removeFeature = async (req: Request, res: Response): Promise<void> => {
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
      ApiResponse.success(res, null, "Feature removed successfully");
    } catch (error) {
      console.error("Error in removeFeature:", error);
      ApiResponse.error(res, "Failed to remove feature", 500);
    }
  };

  /**
   * @route GET /api/properties/projects/:id/photos
   * @access Public
   */
  getPhotos = async (req: Request, res: Response): Promise<void> => {
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
        "Photos retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getPhotos:", error);
      ApiResponse.error(res, "Failed to retrieve photos", 500);
    }
  };

  /**
   * @route GET /api/properties/projects/:id/apartments
   * @access Public
   */
  getApartments = async (req: Request, res: Response): Promise<void> => {
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
          project: { id: project.id, name: project.name, slug: project.slug },
          apartments,
        },
        "Apartments retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getApartments:", error);
      ApiResponse.error(res, "Failed to retrieve apartments", 500);
    }
  };

  /**
   * @route GET /api/properties/apartments
   * @access Public
   */
  getAllApartments = async (req: Request, res: Response): Promise<void> => {
    const {
      projectId,
      status,
      bedrooms,
      minPrice,
      maxPrice,
      isModelUnit,
      page,
      limit,
    } = req.query;

    try {
      const apartments = await ApartmentModel.findAll({
        projectId: projectId ? Number(projectId) : undefined,
        status: status as ApartmentStatus,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        isModelUnit: isModelUnit === "true",
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      ApiResponse.success(res, apartments, "Apartments retrieved successfully");
    } catch (error) {
      console.error("Error in getAllApartments:", error);
      ApiResponse.error(res, "Failed to retrieve apartments", 500);
    }
  };

  /**
   * @route GET /api/properties/apartments/available
   * @access Public
   */
  getAvailableApartments = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { projectId } = req.query;
    try {
      const apartments = await ApartmentModel.getAvailable(
        projectId ? Number(projectId) : undefined
      );
      ApiResponse.success(
        res,
        apartments,
        "Available apartments retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getAvailableApartments:", error);
      ApiResponse.error(res, "Failed to retrieve available apartments", 500);
    }
  };

  /**
   * @route GET /api/properties/apartments/:id
   * @access Public
   */
  getOneApartment = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      const apartment = await ApartmentModel.getComplete(Number(id));
      if (!apartment) {
        ApiResponse.notFound(res, "Apartment not found");
        return;
      }
      ApiResponse.success(res, apartment, "Apartment retrieved successfully");
    } catch (error) {
      console.error("Error in getOneApartment:", error);
      ApiResponse.error(res, "Failed to retrieve apartment", 500);
    }
  };

  /**
   * @route GET /api/properties/commercial
   * @access Public
   */
  getAllCommercial = async (req: Request, res: Response): Promise<void> => {
    const {
      propertyType,
      status,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      isFeatured,
      page,
      limit,
    } = req.query;

    try {
      const properties = await CommercialPropertyModel.findAll({
        propertyType: propertyType as CommercialPropertyType,
        status: status as CommercialPropertyStatus,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
        isFeatured: isFeatured === "true",
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      ApiResponse.success(
        res,
        properties,
        "Commercial properties retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getAllCommercial:", error);
      ApiResponse.error(res, "Failed to retrieve commercial properties", 500);
    }
  };

  /**
   * @route GET /api/properties/commercial/featured
   * @access Public
   */
  getFeaturedCommercial = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { limit = 5 } = req.query;
    try {
      const properties = await CommercialPropertyModel.getFeatured(
        Number(limit)
      );
      ApiResponse.success(
        res,
        properties,
        "Featured commercial properties retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getFeaturedCommercial:", error);
      ApiResponse.error(
        res,
        "Failed to retrieve featured commercial properties",
        500
      );
    }
  };

  /**
   * @route GET /api/properties/commercial/:slug
   * @access Public
   */
  getOneCommercial = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    try {
      const property = await CommercialPropertyModel.findBySlug(slug);
      if (!property) {
        ApiResponse.notFound(res, "Commercial property not found");
        return;
      }
      const completeProperty = await CommercialPropertyModel.getComplete(
        property.id
      );
      ApiResponse.success(
        res,
        completeProperty,
        "Commercial property retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getOneCommercial:", error);
      ApiResponse.error(res, "Failed to retrieve commercial property", 500);
    }
  };

  /**
   * @route GET /api/properties/metadata/locations
   * @access Public
   */
  getLocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const locations = await db("projects")
        .whereNull("deleted_at")
        .distinct("address")
        .select("address")
        .orderBy("address", "asc");

      const locationNames = locations
        .map((loc: any) => {
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
        "Locations retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getLocations:", error);
      ApiResponse.error(res, "Failed to retrieve locations", 500);
    }
  };

  /**
   * @route GET /api/properties/metadata/typologies
   * @access Public
   */
  getTypologies = async (req: Request, res: Response): Promise<void> => {
    try {
      const projects = await db("projects")
        .whereNull("deleted_at")
        .whereNotNull("apartments_list")
        .select("apartments_list");

      const typologiesSet = new Set<string>();
      projects.forEach((project: any) => {
        if (project.apartments_list) {
          const types = project.apartments_list.split(",");
          types.forEach((type: string) => typologiesSet.add(type.trim()));
        }
      });

      const typologies = Array.from(typologiesSet).sort();
      ApiResponse.success(
        res,
        { typologies },
        "Typologies retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getTypologies:", error);
      ApiResponse.error(res, "Failed to retrieve typologies", 500);
    }
  };

  private async getAllWithFilters(
    req: Request,
    res: Response
  ): Promise<void> {
    const {
      page = 1,
      limit = 100,
      localite,
      statut,
      typologie,
    } = req.query;

    try {
      const pageInt = parseInt(page as string, 10);
      const limitInt = parseInt(limit as string, 10);

      if (isNaN(pageInt) || pageInt <= 0 || isNaN(limitInt) || limitInt <= 0) {
        ApiResponse.badRequest(res, "Invalid pagination parameters");
        return;
      }

      let query = db("projects").whereNull("deleted_at");

      if (localite && typeof localite === "string") {
        const localiteArray = localite.split(",").map((item) =>
          item
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/-/g, " ")
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

      if (statut && typeof statut === "string") {
        query = query.where({ status: statut });
      }

      if (typologie && typeof typologie === "string") {
        const typologieArray = typologie.split(",").map((t) => t.trim());
        query = query.where((builder) => {
          typologieArray.forEach((type, index) => {
            const method = index === 0 ? "where" : "orWhere";
            builder[method](
              db.raw("FIND_IN_SET(?, apartments_list) > 0", [type])
            );
          });
        });
      }

      const countQuery = query.clone();
      const [{ count: totalCount }] = await countQuery.count("* as count");

      const offset = (pageInt - 1) * limitInt;
      const projects = await query
        .orderBy("id", "desc")
        .limit(limitInt)
        .offset(offset);

      const formattedProjects = projects.map((project) => ({
        ...project,
        apartments_list: project.apartments_list
          ? project.apartments_list.split(",").map((t: string) => t.trim())
          : [],
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
      console.error("Error in getAllWithFilters:", error);
      ApiResponse.error(res, "Failed to retrieve projects", 500);
    }
  }
}

export default new PropertyController();
