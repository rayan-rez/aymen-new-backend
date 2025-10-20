/**
 * Property Controller
 * Handles apartments and commercial properties operations
 *
 * @module controllers/property.controller
 */

import { Request, Response } from "express";
import {
  ApartmentModel,
  CommercialPropertyModel,
  ApartmentStatus,
  CommercialPropertyStatus,
  CommercialPropertyType,
} from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Property Controller class
 * Manages apartments and commercial properties
 */
class PropertyController {
  // ============================================
  // Apartment Operations
  // ============================================

  /**
   * Get all apartments
   *
   * @route GET /api/properties/apartments
   * @access Public
   */
  async getAllApartments(req: Request, res: Response): Promise<void> {
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

    ApiResponse.success(res, apartments, "Apartments retrieved successfully");
  }

  /**
   * Get apartments by project
   *
   * @route GET /api/properties/apartments/project/:projectId
   * @access Public
   */
  async getApartmentsByProject(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;

    const apartments = await ApartmentModel.findByProject(Number(projectId));

    ApiResponse.success(
      res,
      apartments,
      "Project apartments retrieved successfully"
    );
  }

  /**
   * Get apartment by ID with photos
   *
   * @route GET /api/properties/apartments/:id
   * @access Public
   */
  async getApartmentById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const apartment = await ApartmentModel.getComplete(Number(id));

    if (!apartment) {
      ApiResponse.notFound(res, "Apartment not found");
      return;
    }

    ApiResponse.success(res, apartment, "Apartment retrieved successfully");
  }

  /**
   * Get available apartments
   *
   * @route GET /api/properties/apartments/available
   * @access Public
   */
  async getAvailableApartments(req: Request, res: Response): Promise<void> {
    const { projectId } = req.query;

    const apartments = await ApartmentModel.getAvailable(
      projectId ? Number(projectId) : undefined
    );

    ApiResponse.success(
      res,
      apartments,
      "Available apartments retrieved successfully"
    );
  }

  /**
   * Get model apartments
   *
   * @route GET /api/properties/apartments/models
   * @access Public
   */
  async getModelApartments(req: Request, res: Response): Promise<void> {
    const { projectId } = req.query;

    const apartments = await ApartmentModel.getModelUnits(
      projectId ? Number(projectId) : undefined
    );

    ApiResponse.success(
      res,
      apartments,
      "Model apartments retrieved successfully"
    );
  }

  // ============================================
  // Commercial Property Operations
  // ============================================

  /**
   * Get all commercial properties
   *
   * @route GET /api/properties/commercial
   * @access Public
   */
  async getAllCommercialProperties(req: Request, res: Response): Promise<void> {
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

    ApiResponse.success(
      res,
      properties,
      "Commercial properties retrieved successfully"
    );
  }

  /**
   * Get commercial property by slug
   *
   * @route GET /api/properties/commercial/:slug
   * @access Public
   */
  async getCommercialPropertyBySlug(
    req: Request,
    res: Response
  ): Promise<void> {
    const { slug } = req.params;

    const property = await CommercialPropertyModel.findBySlug(slug);

    if (!property) {
      ApiResponse.notFound(res, "Commercial property not found");
      return;
    }

    // Get complete property data
    const completeProperty = await CommercialPropertyModel.getComplete(
      property.id
    );

    ApiResponse.success(
      res,
      completeProperty,
      "Commercial property retrieved successfully"
    );
  }

  /**
   * Get featured commercial properties
   *
   * @route GET /api/properties/commercial/featured
   * @access Public
   */
  async getFeaturedCommercialProperties(
    req: Request,
    res: Response
  ): Promise<void> {
    const { limit = 5 } = req.query;

    const properties = await CommercialPropertyModel.getFeatured(Number(limit));

    ApiResponse.success(
      res,
      properties,
      "Featured commercial properties retrieved successfully"
    );
  }

  /**
   * Get available properties by type
   *
   * @route GET /api/properties/commercial/type/:type
   * @access Public
   */
  async getCommercialPropertiesByType(
    req: Request,
    res: Response
  ): Promise<void> {
    const { type } = req.params;

    if (!Object.values(CommercialPropertyType).includes(type as any)) {
      ApiResponse.badRequest(res, "Invalid property type");
      return;
    }

    const properties = await CommercialPropertyModel.getAvailableByType(
      type as CommercialPropertyType
    );

    ApiResponse.success(
      res,
      properties,
      `Available ${type} properties retrieved successfully`
    );
  }
}

export default new PropertyController();
