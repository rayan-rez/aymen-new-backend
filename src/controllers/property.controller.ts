/**
  ============================================
  PROPERTIES CONTROLLER (UNIFIED)
  ============================================
  Consolidates: projects, apartments, commercial properties
  Routes:
  GET    /api/properties/projects
  GET    /api/properties/projects/:slug
  GET    /api/properties/projects/featured/list
  POST   /api/properties/projects
  PATCH  /api/properties/projects/:id/completion
  GET    /api/properties/apartments
  GET    /api/properties/apartments/:id
  GET    /api/properties/apartments/available/list
  GET    /api/properties/commercial
  GET    /api/properties/commercial/:slug
  GET    /api/properties/commercial/featured/list
*/

import { Request, Response } from "express";
import {
  ProjectModel,
  ApartmentModel,
  CommercialPropertyModel,
  FeatureModel,
} from "@models";
import {
  ProjectStatus,
  ApartmentStatus,
  CommercialPropertyStatus,
  CommercialPropertyType,
} from "@models";
import { ApiResponse } from "@utils/response.util";
class PropertyController {
  // ============================================
  // PROJECTS
  // ============================================

  /**
   * @route GET /api/properties/projects
   * @desc Get all projects with filters
   * @access Public
   */
  getProjects = async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 100,
      status,
      locationId,
      isFeatured,
      search,
    } = req.query;

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

    ApiResponse.success(res, filteredProjects, "Projects retrieved");
  };

  /**
   * @route GET /api/properties/projects/:slug
   * @desc Get project by slug with complete data
   * @access Public
   */
  getProjectBySlug = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    const project = await ProjectModel.findBySlug(slug);

    if (!project) {
      ApiResponse.notFound(res, "Project not found");
      return;
    }

    const completeProject = await ProjectModel.getComplete(project.id);
    ApiResponse.success(res, completeProject, "Project retrieved");
  };

  /**
   * @route GET /api/properties/projects/featured/list
   * @desc Get featured projects
   * @access Public
   */
  getFeaturedProjects = async (req: Request, res: Response): Promise<void> => {
    const { limit = 5 } = req.query;
    const projects = await ProjectModel.getFeatured(Number(limit));
    ApiResponse.success(res, projects, "Featured projects retrieved");
  };

  /**
   * @route POST /api/properties/projects
   * @desc Create new project
   * @access Private (Admin)
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

    if (!name || !slug || !address) {
      ApiResponse.badRequest(res, "Name, slug, and address required");
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
      mapEmbedCode: mapEmbedCode || null,
      mainPhotoUrl: mainPhotoUrl || null,
      isFeatured: Boolean(isFeatured),
    });

    ApiResponse.created(res, project, "Project created");
  };

  /**
   * @route PATCH /api/properties/projects/:id/completion
   * @desc Update project completion percentage
   * @access Private (Admin)
   */
  updateProjectCompletion = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const { percentage } = req.body;

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

    ApiResponse.success(res, { percentage }, "Completion updated");
  };

  // ============================================
  // APARTMENTS
  // ============================================

  /**
   * @route GET /api/properties/apartments
   * @desc Get all apartments with filters
   * @access Public
   */
  getApartments = async (req: Request, res: Response): Promise<void> => {
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

    ApiResponse.success(res, apartments, "Apartments retrieved");
  };

  /**
   * @route GET /api/properties/apartments/:id
   * @desc Get apartment by ID with complete data
   * @access Public
   */
  getApartmentById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const apartment = await ApartmentModel.getComplete(Number(id));

    if (!apartment) {
      ApiResponse.notFound(res, "Apartment not found");
      return;
    }

    ApiResponse.success(res, apartment, "Apartment retrieved");
  };

  /**
   * @route GET /api/properties/apartments/available/list
   * @desc Get available apartments
   * @access Public
   */
  getAvailableApartments = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { projectId } = req.query;
    const apartments = await ApartmentModel.getAvailable(
      projectId ? Number(projectId) : undefined
    );
    ApiResponse.success(res, apartments, "Available apartments retrieved");
  };

  // ============================================
  // COMMERCIAL PROPERTIES
  // ============================================

  /**
   * @route GET /api/properties/commercial
   * @desc Get all commercial properties with filters
   * @access Public
   */
  getCommercialProperties = async (
    req: Request,
    res: Response
  ): Promise<void> => {
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

    ApiResponse.success(res, properties, "Commercial properties retrieved");
  };

  /**
   * @route GET /api/properties/commercial/:slug
   * @desc Get commercial property by slug
   * @access Public
   */
  getCommercialBySlug = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    const property = await CommercialPropertyModel.findBySlug(slug);

    if (!property) {
      ApiResponse.notFound(res, "Commercial property not found");
      return;
    }

    const completeProperty = await CommercialPropertyModel.getComplete(
      property.id
    );
    ApiResponse.success(res, completeProperty, "Commercial property retrieved");
  };

  /**
   * @route GET /api/properties/commercial/featured/list
   * @desc Get featured commercial properties
   * @access Public
   */
  getFeaturedCommercial = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { limit = 5 } = req.query;
    const properties = await CommercialPropertyModel.getFeatured(Number(limit));
    ApiResponse.success(
      res,
      properties,
      "Featured commercial properties retrieved"
    );
  };
}

export default new PropertyController();
