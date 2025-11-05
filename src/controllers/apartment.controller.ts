/**
 * Enhanced Apartment Controller - WITH FULL DOCUMENTATION
 * Handles all apartment-related HTTP requests with comprehensive filtering,
 * status management, and analytics capabilities
 *
 * @module controllers/apartment.controller
 *
 * @swagger
 * tags:
 *   - name: Apartments
 *     description: Apartment management endpoints with filtering and pagination
 *   - name: Apartment Status
 *     description: Apartment status management and bulk operations
 *   - name: Apartment Analytics
 *     description: Apartment statistics, distributions, and availability
 *   - name: Apartment Queries
 *     description: Specialized apartment query endpoints
 *
 * components:
 *   schemas:
 *     Apartment:
 *       type: object
 *       description: Complete apartment entity
 *       required:
 *         - id
 *         - unitNumber
 *         - projectId
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           description: Apartment primary key
 *           example: 1
 *         unitNumber:
 *           type: string
 *           description: Unique unit identifier within project
 *           example: "A-201"
 *         projectId:
 *           type: integer
 *           description: Reference to parent project
 *           example: 5
 *         title:
 *           type: string
 *           description: Apartment title/name
 *           example: "Luxury 2-Bedroom Unit"
 *         description:
 *           type: string
 *           description: Detailed apartment description
 *           example: "Spacious corner unit with panoramic views"
 *         status:
 *           $ref: '#/components/schemas/ApartmentStatus'
 *         bedrooms:
 *           type: integer
 *           description: Number of bedrooms
 *           example: 2
 *         bathrooms:
 *           type: integer
 *           description: Number of bathrooms
 *           example: 2
 *         area:
 *           type: number
 *           description: Total area in square meters
 *           example: 120.5
 *         price:
 *           type: number
 *           description: Apartment price
 *           example: 350000
 *         floorNumber:
 *           type: integer
 *           description: Floor number
 *           example: 2
 *         isModelUnit:
 *           type: boolean
 *           description: Whether this is a model/show unit
 *           example: false
 *         isPublished:
 *           type: boolean
 *           description: Whether apartment is publicly visible
 *           example: true
 *         viewDirection:
 *           type: string
 *           description: Primary view direction
 *           example: "North"
 *         balconyArea:
 *           type: number
 *           description: Balcony area in square meters
 *           example: 15.0
 *         parkingSpaces:
 *           type: integer
 *           description: Number of parking spaces included
 *           example: 1
 *         storageArea:
 *           type: number
 *           description: Storage area in square meters
 *           example: 5.0
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00Z"
 *         project:
 *           $ref: '#/components/schemas/Project'
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *         floorPlans:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FloorPlan'
 *
 *     ApartmentStatus:
 *       type: string
 *       enum:
 *         - available
 *         - reserved
 *         - sold
 *         - unavailable
 *       description: Current apartment availability status
 *       example: "available"
 *
 *     CreateApartmentDTO:
 *       type: object
 *       required:
 *         - unitNumber
 *         - projectId
 *         - bedrooms
 *         - bathrooms
 *         - area
 *         - price
 *       properties:
 *         unitNumber:
 *           type: string
 *           description: Unique unit identifier
 *           example: "A-201"
 *         projectId:
 *           type: integer
 *           minimum: 1
 *           description: Reference to parent project
 *           example: 5
 *         title:
 *           type: string
 *           description: Apartment title
 *           example: "Luxury 2-Bedroom Unit"
 *         description:
 *           type: string
 *           description: Detailed description
 *         bedrooms:
 *           type: integer
 *           minimum: 0
 *           description: Number of bedrooms
 *           example: 2
 *         bathrooms:
 *           type: integer
 *           minimum: 0
 *           description: Number of bathrooms
 *           example: 2
 *         area:
 *           type: number
 *           minimum: 0
 *           description: Total area in square meters
 *           example: 120.5
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Apartment price
 *           example: 350000
 *         floorNumber:
 *           type: integer
 *           description: Floor number
 *           example: 2
 *         isModelUnit:
 *           type: boolean
 *           default: false
 *           description: Whether this is a model unit
 *         viewDirection:
 *           type: string
 *           description: Primary view direction
 *         balconyArea:
 *           type: number
 *           minimum: 0
 *           description: Balcony area
 *         parkingSpaces:
 *           type: integer
 *           minimum: 0
 *           description: Number of parking spaces
 *         storageArea:
 *           type: number
 *           minimum: 0
 *           description: Storage area
 *
 *     UpdateApartmentDTO:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           $ref: '#/components/schemas/ApartmentStatus'
 *         price:
 *           type: number
 *           minimum: 0
 *         floorNumber:
 *           type: integer
 *         isModelUnit:
 *           type: boolean
 *         isPublished:
 *           type: boolean
 *         viewDirection:
 *           type: string
 *         balconyArea:
 *           type: number
 *         parkingSpaces:
 *           type: integer
 *         storageArea:
 *           type: number
 *
 *     AvailabilitySummary:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of apartments
 *           example: 100
 *         available:
 *           type: integer
 *           description: Number of available apartments
 *           example: 45
 *         reserved:
 *           type: integer
 *           description: Number of reserved apartments
 *           example: 15
 *         sold:
 *           type: integer
 *           description: Number of sold apartments
 *           example: 35
 *         unavailable:
 *           type: integer
 *           description: Number of unavailable apartments
 *           example: 5
 *         availabilityRate:
 *           type: number
 *           description: Percentage of available units
 *           example: 45.0
 *
 *     ProjectStatistics:
 *       type: object
 *       properties:
 *         totalUnits:
 *           type: integer
 *           example: 100
 *         availableUnits:
 *           type: integer
 *           example: 45
 *         soldUnits:
 *           type: integer
 *           example: 35
 *         reservedUnits:
 *           type: integer
 *           example: 15
 *         averagePrice:
 *           type: number
 *           example: 325000
 *         minPrice:
 *           type: number
 *           example: 250000
 *         maxPrice:
 *           type: number
 *           example: 500000
 *         averageArea:
 *           type: number
 *           example: 115.5
 *         totalArea:
 *           type: number
 *           example: 11550
 *
 *     FloorDistribution:
 *       type: object
 *       properties:
 *         floor:
 *           type: integer
 *           description: Floor number
 *           example: 2
 *         total:
 *           type: integer
 *           description: Total units on floor
 *           example: 8
 *         available:
 *           type: integer
 *           description: Available units on floor
 *           example: 3
 *         sold:
 *           type: integer
 *           description: Sold units on floor
 *           example: 4
 *         reserved:
 *           type: integer
 *           description: Reserved units on floor
 *           example: 1
 *
 *     BedroomDistribution:
 *       type: object
 *       properties:
 *         bedrooms:
 *           type: integer
 *           description: Number of bedrooms
 *           example: 2
 *         count:
 *           type: integer
 *           description: Number of units with this bedroom count
 *           example: 45
 *         available:
 *           type: integer
 *           description: Available units with this bedroom count
 *           example: 20
 *         averagePrice:
 *           type: number
 *           description: Average price for this bedroom type
 *           example: 325000
 *
 *   parameters:
 *     ApartmentIdParam:
 *       name: id
 *       in: path
 *       description: Apartment ID
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 1
 *
 *     ProjectIdParam:
 *       name: projectId
 *       in: path
 *       description: Project ID
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 5
 *
 *     StatusQueryParam:
 *       name: status
 *       in: query
 *       description: Filter by apartment status
 *       required: false
 *       schema:
 *         $ref: '#/components/schemas/ApartmentStatus'
 *
 *     BedroomsParam:
 *       name: bedrooms
 *       in: query
 *       description: Filter by number of bedrooms
 *       required: false
 *       schema:
 *         type: integer
 *         minimum: 0
 *       example: 2
 *
 *     BathroomsParam:
 *       name: bathrooms
 *       in: query
 *       description: Filter by number of bathrooms
 *       required: false
 *       schema:
 *         type: integer
 *         minimum: 0
 *       example: 2
 *
 *     MinAreaParam:
 *       name: minArea
 *       in: query
 *       description: Minimum area filter (square meters)
 *       required: false
 *       schema:
 *         type: number
 *         minimum: 0
 *       example: 100
 *
 *     MaxAreaParam:
 *       name: maxArea
 *       in: query
 *       description: Maximum area filter (square meters)
 *       required: false
 *       schema:
 *         type: number
 *         minimum: 0
 *       example: 200
 *
 *     FloorNumberParam:
 *       name: floorNumber
 *       in: query
 *       description: Filter by floor number
 *       required: false
 *       schema:
 *         type: integer
 *       example: 5
 *
 *     UnitNumberParam:
 *       name: unitNumber
 *       in: query
 *       description: Unit number to check
 *       required: true
 *       schema:
 *         type: string
 *       example: "A-201"
 *
 *     RelationsParam:
 *       name: relations
 *       in: query
 *       description: Comma-separated list of relations to include
 *       required: false
 *       schema:
 *         type: string
 *       example: "project,photos,floorPlans"
 *
 *   responses:
 *     ApartmentResponse:
 *       description: Apartment retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               data:
 *                 $ref: '#/components/schemas/Apartment'
 *               message:
 *                 type: string
 *                 example: "Apartment retrieved successfully"
 *
 *     ApartmentsListResponse:
 *       description: Apartments list retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               data:
 *                 type: object
 *                 properties:
 *                   items:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Apartment'
 *                   pagination:
 *                     type: object
 *                     properties:
 *                       total:
 *                         type: integer
 *                       page:
 *                         type: integer
 *                       limit:
 *                         type: integer
 *                       totalPages:
 *                         type: integer
 *               message:
 *                 type: string
 *                 example: "Apartments retrieved successfully"
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import ApartmentModel, {
  ApartmentStatus,
  ApartmentQueryOptions,
} from "@models/apartment.model";
import { AppError } from "@/middlewares/error-handler.middleware";

/**
 * Apartment Controller Class
 */
export class ApartmentController {
  /**
   * @openapi
   * /api/apartments:
   *   get:
   *     tags:
   *       - Apartments
   *     summary: Get all apartments with filtering and pagination
   *     description: |
   *       Retrieves a paginated list of apartments with comprehensive filtering options.
   *       Supports filtering by project, status, price range, bedrooms, bathrooms, area, floor, and search term.
   *     parameters:
   *       - name: page
   *         in: query
   *         schema:
   *           type: integer
   *           default: 1
   *       - name: limit
   *         in: query
   *         schema:
   *           type: integer
   *           default: 10
   *       - name: projectId
   *         in: query
   *         description: Filter by project ID
   *         schema:
   *           type: integer
   *       - $ref: '#/components/parameters/StatusQueryParam'
   *       - name: isPublished
   *         in: query
   *         schema:
   *           type: boolean
   *       - name: minPrice
   *         in: query
   *         schema:
   *           type: number
   *       - name: maxPrice
   *         in: query
   *         schema:
   *           type: number
   *       - $ref: '#/components/parameters/BedroomsParam'
   *       - $ref: '#/components/parameters/BathroomsParam'
   *       - $ref: '#/components/parameters/MinAreaParam'
   *       - $ref: '#/components/parameters/MaxAreaParam'
   *       - $ref: '#/components/parameters/FloorNumberParam'
   *       - name: search
   *         in: query
   *         description: Search in title and description
   *         schema:
   *           type: string
   *       - name: sortBy
   *         in: query
   *         schema:
   *           type: string
   *           default: unit_number
   *       - name: sortOrder
   *         in: query
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: asc
   *     responses:
   *       200:
   *         $ref: '#/components/responses/ApartmentsListResponse'
   *       500:
   *         description: Server error
   */
  async getApartments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
      if (isPublished !== undefined)
        options.isPublished = isPublished === "true";
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
   * @openapi
   * /api/apartments/{id}:
   *   get:
   *     tags:
   *       - Apartments
   *     summary: Get apartment by ID
   *     description: |
   *       Retrieves a single apartment by its ID with optional relations.
   *       By default includes project relation. Can specify additional relations via query parameter.
   *     parameters:
   *       - $ref: '#/components/parameters/ApartmentIdParam'
   *       - $ref: '#/components/parameters/RelationsParam'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/ApartmentResponse'
   *       404:
   *         description: Apartment not found
   *       500:
   *         description: Server error
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/apartments/1?relations=project,photos')
   *             .then(res => res.json())
   *             .then(data => console.log(data));
   */
  async getApartmentById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { relations } = req.query;

      const relationsList = relations
        ? (relations as string).split(",")
        : ["project"];

      const apartment = await ApartmentModel.findById(Number(id), {
        relations: relationsList,
      });

      if (!apartment) {
        throw new AppError("Apartment not found", 404);
      }

      ApiResponse.success(res, apartment, "Apartment retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/apartments/project/{projectId}:
   *   get:
   *     tags:
   *       - Apartment Queries
   *     summary: Get apartments by project
   *     description: |
   *       Retrieves all apartments for a specific project with optional filtering.
   *       Useful for displaying project inventory and availability.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - $ref: '#/components/parameters/StatusQueryParam'
   *       - name: minPrice
   *         in: query
   *         schema:
   *           type: number
   *       - name: maxPrice
   *         in: query
   *         schema:
   *           type: number
   *       - $ref: '#/components/parameters/BedroomsParam'
   *     responses:
   *       200:
   *         description: Apartments retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Apartment'
   *                 message:
   *                   type: string
   *       500:
   *         description: Server error
   */
  async getApartmentsByProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const { status, minPrice, maxPrice, bedrooms } = req.query;

      const options: ApartmentQueryOptions = {};
      if (status) options.status = status as ApartmentStatus;
      if (minPrice) options.minPrice = Number(minPrice);
      if (maxPrice) options.maxPrice = Number(maxPrice);
      if (bedrooms) options.bedrooms = Number(bedrooms);

      const apartments = await ApartmentModel.findByProject(
        Number(projectId),
        options
      );

      ApiResponse.success(res, apartments, "Apartments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/apartments/available:
   *   get:
   *     tags:
   *       - Apartment Queries
   *     summary: Get available apartments
   *     description: |
   *       Retrieves only available and published apartments.
   *       Useful for public-facing apartment listings.
   *       Can be filtered by project ID.
   *     parameters:
   *       - name: projectId
   *         in: query
   *         description: Filter by specific project
   *         schema:
   *           type: integer
   *       - name: page
   *         in: query
   *         schema:
   *           type: integer
   *           default: 1
   *       - name: limit
   *         in: query
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         $ref: '#/components/responses/ApartmentsListResponse'
   *       500:
   *         description: Server error
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/apartments/available?projectId=5&page=1&limit=20')
   *             .then(res => res.json())
   *             .then(data => console.log(data));
   */
  async getAvailableApartments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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

      ApiResponse.success(
        res,
        result,
        "Available apartments retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/apartments/model-units:
   *   get:
   *     tags:
   *       - Apartment Queries
   *     summary: Get model units
   *     description: |
   *       Retrieves apartments marked as model/show units.
   *       Model units are typically furnished and available for tours.
   *       Can be filtered by project ID.
   *     parameters:
   *       - name: projectId
   *         in: query
   *         description: Filter by specific project
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Model units retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Apartment'
   *                 message:
   *                   type: string
   *       500:
   *         description: Server error
   */
  async getModelUnits(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.query;

      const apartments = await ApartmentModel.findModelUnits(
        projectId ? Number(projectId) : undefined
      );

      ApiResponse.success(
        res,
        apartments,
        "Model units retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/apartments/floor:
   *   get:
   *     tags:
   *       - Apartment Queries
   *     summary: Get apartments by floor
   *     description: |
   *       Retrieves all apartments on a specific floor of a project.
   *       Useful for floor plan visualizations and availability displays.
   *       Both projectId and floorNumber are required.
   *     parameters:
   *       - name: projectId
   *         in: query
   *         required: true
   *         description: Project ID
   *         schema:
   *           type: integer
   *       - name: floorNumber
   *         in: query
   *         required: true
   *         description: Floor number
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Apartments retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Apartment'
   *                 message:
   *                   type: string
   *       400:
   *         description: projectId and floorNumber are required
   *       500:
   *         description: Server error
   */
  async getApartmentsByFloor(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
   * @openapi
   * /api/apartments/availability/{projectId}:
   *   get:
   *     tags:
   *       - Apartment Analytics
   *     summary: Get apartment availability summary for project
   *     description: |
   *       Retrieves a comprehensive summary of apartment availability for a project.
   *       Includes counts by status and overall availability rate.
   *       Useful for dashboards and project overview displays.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Availability summary retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AvailabilitySummary'
   *                 message:
   *                   type: string
   *       500:
   *         description: Server error
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/apartments/availability/5')
   *             .then(res => res.json())
   *             .then(data => console.log('Availability:', data.data));
   */
  async getAvailabilitySummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      const summary = await ApartmentModel.getAvailabilitySummary(
        Number(projectId)
      );

      ApiResponse.success(
        res,
        summary,
        "Availability summary retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/apartments/statistics/{projectId}:
   *   get:
   *     tags:
   *       - Apartment Analytics
   *     summary: Get project statistics
   *     description: |
   *       Retrieves comprehensive statistics for a project's apartments.
   *       Includes unit counts, price statistics, and area metrics.
   *       Useful for project analytics and reporting.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ProjectStatistics'
   *                 message:
   *                   type: string
   *       500:
   *         description: Server error
   */
  async getProjectStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      const statistics = await ApartmentModel.getProjectStatistics(
        Number(projectId)
      );

      ApiResponse.success(res, statistics, "Statistics retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/apartments/distribution/floors/{projectId}:
   *   get:
   *     tags:
   *       - Apartment Analytics
   *     summary: Get floor distribution
   *     description: |
   *       Retrieves apartment distribution across floors for a project.
   *       Shows total, available, sold, and reserved units per floor.
   *       Useful for floor availability visualizations.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Floor distribution retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/FloorDistribution'
   *                 message:
   *                   type: string
   *       500:
   *         description: Server error
   */
  async getFloorDistribution(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      const distribution = await ApartmentModel.getFloorDistribution(
        Number(projectId)
      );

      ApiResponse.success(
        res,
        distribution,
        "Floor distribution retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/apartments/distribution/bedrooms/{projectId}:
   *   get:
   *     tags:
   *       - Apartment Analytics
   *     summary: Get bedroom distribution
   *     description: |
   *       Retrieves apartment distribution by bedroom count for a project.
   *       Shows count, availability, and average price per bedroom type.
   *       Useful for inventory analysis and pricing strategies.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Bedroom distribution retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/BedroomDistribution'
   *                 message:
   *                   type: string
   *       500:
   *         description: Server error
   */
  async getBedroomDistribution(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      const distribution = await ApartmentModel.getBedroomDistribution(
        Number(projectId)
      );

      ApiResponse.success(
        res,
        distribution,
        "Bedroom distribution retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/apartments:
   *   post:
   *     tags:
   *       - Apartments
   *     summary: Create new apartment
   *     description: |
   *       Creates a new apartment with the provided data.
   *       Unit number must be unique within the project.
   *       Status defaults to 'available' if not specified.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateApartmentDTO'
   *           examples:
   *             standard:
   *               summary: Standard apartment
   *               value:
   *                 unitNumber: "A-201"
   *                 projectId: 5
   *                 title: "Luxury 2-Bedroom Unit"
   *                 bedrooms: 2
   *                 bathrooms: 2
   *                 area: 120.5
   *                 price: 350000
   *                 floorNumber: 2
   *             penthouse:
   *               summary: Penthouse unit
   *               value:
   *                 unitNumber: "PH-01"
   *                 projectId: 5
   *                 title: "Premium Penthouse"
   *                 bedrooms: 4
   *                 bathrooms: 3
   *                 area: 250
   *                 price: 800000
   *                 floorNumber: 15
   *                 balconyArea: 50
   *                 parkingSpaces: 2
   *     responses:
   *       201:
   *         description: Apartment created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Apartment'
   *                 message:
   *                   type: string
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  async createApartment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
  async updateApartment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
  async deleteApartment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
  async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
  async markAsSold(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
  async markAsReserved(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
  async markAsAvailable(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
  async bulkUpdateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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

  /**
   * Duplicate check for apartment
   * GET /api/apartments/check-duplicate
   */
  async checkDuplicate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId, unitNumber } = req.query;

      const existing = await ApartmentModel.findByUnitNumber(
        unitNumber as string,
        Number(projectId)
      );

      ApiResponse.success(
        res,
        { exists: existing.length > 0, apartments: existing },
        "Duplicate check completed"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export apartments to CSV
   * GET /api/apartments/export
   */
  async exportApartments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId, format = "csv" } = req.query;

      const apartments = await ApartmentModel.findByProject(Number(projectId));

      // TODO: Implement CSV/Excel export logic

      ApiResponse.success(res, { count: apartments.length }, "Export ready");
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new ApartmentController();
