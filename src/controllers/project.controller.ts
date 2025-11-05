/**
 * Enhanced Project Controller - WITH FULL RELATION LOADING
 * Returns complete project data including all related entities
 *
 * @module controllers/project.controller
 *
 * @swagger
 * tags:
 *   - name: Projects
 *     description: Project management endpoints with comprehensive relation loading
 *   - name: Project Photos
 *     description: Photo management for projects
 *   - name: Project Floor Plans
 *     description: Floor plan management for projects
 *   - name: Project Publishing
 *     description: Project validation and publishing operations
 *   - name: Project Analytics
 *     description: Project statistics and comparison endpoints
 *
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       description: Complete project entity with all relations
 *       required:
 *         - id
 *         - title
 *         - slug
 *         - projectType
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           description: Project primary key
 *           example: 1
 *         title:
 *           type: string
 *           description: Project title
 *           example: "Luxury Waterfront Apartments"
 *         slug:
 *           type: string
 *           description: URL-friendly project identifier
 *           example: "luxury-waterfront-apartments"
 *         description:
 *           type: string
 *           description: Detailed project description
 *           example: "Modern luxury apartments with stunning waterfront views"
 *         projectType:
 *           $ref: '#/components/schemas/ProjectType'
 *         status:
 *           $ref: '#/components/schemas/ProjectStatus'
 *         locationId:
 *           type: integer
 *           description: Reference to location entity
 *           example: 5
 *         price:
 *           type: number
 *           description: Starting price
 *           example: 250000
 *         isFeatured:
 *           type: boolean
 *           description: Whether project is featured
 *           example: true
 *         isPublished:
 *           type: boolean
 *           description: Whether project is publicly visible
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-01T00:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         location:
 *           $ref: '#/components/schemas/Location'
 *         apartments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Apartment'
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *         floorPlans:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FloorPlan'
 *         features:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Feature'
 *
 *     ProjectType:
 *       type: string
 *       enum:
 *         - residential
 *         - commercial
 *         - mixed_use
 *         - industrial
 *       description: Type of real estate project
 *       example: "residential"
 *
 *     ProjectStatus:
 *       type: string
 *       enum:
 *         - planning
 *         - under_construction
 *         - completed
 *         - sold_out
 *       description: Current project status
 *       example: "under_construction"
 *
 *     CreateProjectDTO:
 *       type: object
 *       required:
 *         - title
 *         - projectType
 *         - locationId
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 200
 *           description: Project title
 *           example: "Luxury Waterfront Apartments"
 *         description:
 *           type: string
 *           description: Detailed project description
 *           example: "Modern luxury apartments with stunning waterfront views"
 *         projectType:
 *           $ref: '#/components/schemas/ProjectType'
 *         status:
 *           $ref: '#/components/schemas/ProjectStatus'
 *         locationId:
 *           type: integer
 *           minimum: 1
 *           description: Reference to location entity
 *           example: 5
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Starting price
 *           example: 250000
 *         isFeatured:
 *           type: boolean
 *           default: false
 *           description: Whether project is featured
 *           example: false
 *
 *     UpdateProjectDTO:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 200
 *           description: Project title
 *           example: "Updated Project Title"
 *         description:
 *           type: string
 *           description: Detailed project description
 *         status:
 *           $ref: '#/components/schemas/ProjectStatus'
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Starting price
 *         isFeatured:
 *           type: boolean
 *           description: Whether project is featured
 *
 *     Photo:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://example.com/photos/photo1.jpg"
 *         alt:
 *           type: string
 *           example: "Project exterior view"
 *         caption:
 *           type: string
 *           example: "Beautiful waterfront facade"
 *         isCover:
 *           type: boolean
 *           example: true
 *         displayOrder:
 *           type: integer
 *           example: 0
 *
 *     CreatePhotoDTO:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           description: Photo URL
 *           example: "https://example.com/photos/photo1.jpg"
 *         alt:
 *           type: string
 *           description: Alternative text for accessibility
 *           example: "Project exterior view"
 *         caption:
 *           type: string
 *           description: Photo caption
 *           example: "Beautiful waterfront facade"
 *         isCover:
 *           type: boolean
 *           default: false
 *           description: Whether this is the cover photo
 *           example: false
 *
 *     FloorPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "2-Bedroom Layout"
 *         imageUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/floorplans/2bed.jpg"
 *         pdfUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/floorplans/2bed.pdf"
 *         displayOrder:
 *           type: integer
 *           example: 0
 *
 *     CreateFloorPlanDTO:
 *       type: object
 *       required:
 *         - title
 *         - imageUrl
 *       properties:
 *         title:
 *           type: string
 *           description: Floor plan title
 *           example: "2-Bedroom Layout"
 *         imageUrl:
 *           type: string
 *           format: uri
 *           description: Floor plan image URL
 *           example: "https://example.com/floorplans/2bed.jpg"
 *         pdfUrl:
 *           type: string
 *           format: uri
 *           description: Floor plan PDF URL (optional)
 *           example: "https://example.com/floorplans/2bed.pdf"
 *
 *     MediaValidationResult:
 *       type: object
 *       properties:
 *         isValid:
 *           type: boolean
 *           description: Whether media validation passed
 *           example: false
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           description: List of validation errors
 *           example:
 *             - "Cover photo is required"
 *             - "At least 3 photos are required"
 *             - "WARNING: No floor plans found (recommended)"
 *
 *     MediaStatistics:
 *       type: object
 *       properties:
 *         photos:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               description: Total number of photos
 *               example: 12
 *             hasCover:
 *               type: boolean
 *               description: Whether project has a cover photo
 *               example: true
 *         floorPlans:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               description: Total number of floor plans
 *               example: 5
 *             withPdf:
 *               type: integer
 *               description: Number of floor plans with PDF
 *               example: 3
 *
 *     Location:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 5
 *         name:
 *           type: string
 *           example: "Downtown District"
 *         city:
 *           type: string
 *           example: "New York"
 *         country:
 *           type: string
 *           example: "USA"
 *
 *     Apartment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "2-Bedroom Unit A"
 *         bedrooms:
 *           type: integer
 *           example: 2
 *         bathrooms:
 *           type: integer
 *           example: 2
 *         area:
 *           type: number
 *           example: 1200
 *         price:
 *           type: number
 *           example: 350000
 *
 *     Feature:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Swimming Pool"
 *         icon:
 *           type: string
 *           example: "pool"
 *
 *   parameters:
 *     ProjectIdParam:
 *       name: id
 *       in: path
 *       description: Project ID
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 1
 *
 *     ProjectSlugParam:
 *       name: slug
 *       in: path
 *       description: Project slug (URL-friendly identifier)
 *       required: true
 *       schema:
 *         type: string
 *       example: "luxury-waterfront-apartments"
 *
 *     PhotoIdParam:
 *       name: photoId
 *       in: path
 *       description: Photo ID
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 1
 *
 *     FloorPlanIdParam:
 *       name: floorPlanId
 *       in: path
 *       description: Floor plan ID
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 1
 *
 *     ProjectTypeParam:
 *       name: projectType
 *       in: query
 *       description: Filter by project type
 *       required: false
 *       schema:
 *         $ref: '#/components/schemas/ProjectType'
 *
 *     StatusParam:
 *       name: status
 *       in: query
 *       description: Filter by project status
 *       required: false
 *       schema:
 *         $ref: '#/components/schemas/ProjectStatus'
 *
 *     LocationIdParam:
 *       name: locationId
 *       in: query
 *       description: Filter by location ID
 *       required: false
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 5
 *
 *     IsFeaturedParam:
 *       name: isFeatured
 *       in: query
 *       description: Filter by featured status
 *       required: false
 *       schema:
 *         type: boolean
 *       example: true
 *
 *     IsPublishedParam:
 *       name: isPublished
 *       in: query
 *       description: Filter by published status
 *       required: false
 *       schema:
 *         type: boolean
 *       example: true
 *
 *     MinPriceParam:
 *       name: minPrice
 *       in: query
 *       description: Minimum price filter
 *       required: false
 *       schema:
 *         type: number
 *         minimum: 0
 *       example: 100000
 *
 *     MaxPriceParam:
 *       name: maxPrice
 *       in: query
 *       description: Maximum price filter
 *       required: false
 *       schema:
 *         type: number
 *         minimum: 0
 *       example: 500000
 *
 *     IncludePhotosParam:
 *       name: includePhotos
 *       in: query
 *       description: Include project photos in response
 *       required: false
 *       schema:
 *         type: boolean
 *         default: false
 *       example: true
 *
 *     IncludeFloorPlansParam:
 *       name: includeFloorPlans
 *       in: query
 *       description: Include floor plans in response
 *       required: false
 *       schema:
 *         type: boolean
 *         default: false
 *       example: true
 *
 *     IncludeApartmentsParam:
 *       name: includeApartments
 *       in: query
 *       description: Include apartments in response
 *       required: false
 *       schema:
 *         type: boolean
 *         default: false
 *       example: true
 *
 *     IncludeLocationParam:
 *       name: includeLocation
 *       in: query
 *       description: Include location details in response
 *       required: false
 *       schema:
 *         type: boolean
 *         default: false
 *       example: true
 *
 *     PageParam:
 *        name: page
 *        in: query
 *        description: Page number for pagination
 *        required: false
 *        schema:
 *          type: integer
 *          minimum: 1
 *          default: 1
 *        example: 1
 *
 *    LimitParam:
 *      name: limit
 *      in: query
 *      description: Number of items per page
 *      required: false
 *      schema:
 *        type: integer
 *        minimum: 1
 *        maximum: 100
 *        default: 10
 *      example: 10
 *
 *    SearchParam:
 *      name: search
 *      in: query
 *      description: Search term for filtering projects by title or description
 *      required: false
 *      schema:
 *        type: string
 *      example: "luxury apartments"
 *
 *    SortByParam:
 *      name: sortBy
 *      in: query
 *      description: Field to sort by
 *      required: false
 *      schema:
 *        type: string
 *        enum:
 *          - created_at
 *          - updated_at
 *          - title
 *          - price
 *        default: created_at
 *      example: "price"
 *
 *    SortOrderParam:
 *      name: sortOrder
 *      in: query
 *      description: Sort order
 *      required: false
 *      schema:
 *        type: string
 *        enum:
 *          - asc
 *          - desc
 *        default: desc
 *      example: "asc"
 *
 *     IncludeFeaturesParam:
 *       name: includeFeatures
 *       in: query
 *       description: Include project features in response
 *       required: false
 *       schema:
 *         type: boolean
 *         default: false
 *       example: true
 *
 *     IsCoverParam:
 *       name: isCover
 *       in: query
 *       description: Filter photos by cover status
 *       required: false
 *       schema:
 *         type: boolean
 *       example: true
 *
 *     HasCaptionParam:
 *       name: hasCaption
 *       in: query
 *       description: Filter photos by caption presence
 *       required: false
 *       schema:
 *         type: boolean
 *       example: true
 *
 *     HasPdfParam:
 *       name: hasPdf
 *       in: query
 *       description: Filter floor plans by PDF presence
 *       required: false
 *       schema:
 *         type: boolean
 *       example: true
 *
 *   responses:
 *     ProjectResponse:
 *       description: Project retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               data:
 *                 $ref: '#/components/schemas/Project'
 *               message:
 *                 type: string
 *                 example: "Project retrieved successfully"
 *
 *     ProjectsListResponse:
 *       description: Projects list retrieved successfully
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
 *                       $ref: '#/components/schemas/Project'
 *                   pagination:
 *                     $ref: '#/components/schemas/PaginationMetadata'
 *               message:
 *                 type: string
 *                 example: "Projects retrieved successfully"
 *
 *     PhotosResponse:
 *       description: Photos retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               data:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Photo'
 *               message:
 *                 type: string
 *                 example: "Project photos retrieved successfully"
 *
 *     FloorPlansResponse:
 *       description: Floor plans retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               data:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/FloorPlan'
 *               message:
 *                 type: string
 *                 example: "Project floor plans retrieved successfully"
 *
 *     PaginationMetadata:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 150
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 15
 *         hasNextPage:
 *           type: boolean
 *           example: true
 *         hasPrevPage:
 *           type: boolean
 *           example: false
 *       ErrorResponse:
 *          description: Error response
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    example: false
 *                  error:
 *                    type: object
 *                    properties:
 *                      message:
 *                        type: string
 *                        example: "Resource not found"
 *                      statusCode:
 *                        type: integer
 *                        example: 404
 *
 *        ValidationError:
 *          description: Validation error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    example: false
 *                  error:
 *                    type: object
 *                    properties:
 *                      message:
 *                        type: string
 *                        example: "Validation failed"
 *                      statusCode:
 *                        type: integer
 *                        example: 400
 *                      details:
 *                        type: array
 *                        items:
 *                          type: string
 *
 *        DatabaseError:
 *          description: Database error
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  success:
 *                    type: boolean
 *                    example: false
 *                  error:
 *                    type: object
 *                    properties:
 *                      message:
 *                        type: string
 *                        example: "Database operation failed"
 *                      statusCode:
 *                        type: integer
 *                        example: 500
 *
 *        NotFound:
 *          description: Resource not found
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ErrorResponse'
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import ProjectModel, {
  ProjectType,
  ProjectStatus,
  ProjectQueryOptions,
} from "@models/project.model";
import PhotoModel, { PhotoableType } from "@models/photo.model";
import FloorPlanModel, { PlannableType } from "@models/floor-plan.model";
import { AppError } from "@/middlewares/error-handler.middleware";
import db from "@/config/database";

/**
 * @openapi
 * Enhanced Project Controller Class
 * Handles all project-related HTTP requests with comprehensive relation loading,
 * media management, validation, and publishing capabilities.
 *
 * @class ProjectController
 *
 * @description
 * Provides endpoints for:
 * - CRUD operations on projects
 * - Photo management (upload, reorder, set cover)
 * - Floor plan management
 * - Publishing and validation
 * - Statistics and analytics
 * - Project comparison
 *
 * @example
 * ```typescript
 * // Usage in routes
 * import projectController from '@/controllers/project.controller';
 * router.get('/projects', projectController.getProjects);
 * router.get('/projects/:id', projectController.getProjectById);
 * router.post('/projects', projectController.createProject);
 * ```
 */
export class ProjectController {
  // ============================================================================
  // CORE PROJECT OPERATIONS
  // ============================================================================

  /**
   * @openapi
   * /api/projects/slug/{slug}:
   *   get:
   *     tags:
   *       - Projects
   *     summary: Get project by slug
   *     description: |
   *       Retrieves a single project by its URL-friendly slug identifier.
   *       Returns complete project data with all requested relations.
   *       Useful for public-facing pages where IDs shouldn't be exposed.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectSlugParam'
   *       - name: includePhotos
   *         in: query
   *         description: Include project photos
   *         schema:
   *           type: boolean
   *           default: true
   *       - name: includeFloorPlans
   *         in: query
   *         description: Include floor plans
   *         schema:
   *           type: boolean
   *           default: true
   *       - name: includeApartments
   *         in: query
   *         description: Include apartments
   *         schema:
   *           type: boolean
   *           default: true
   *       - name: includeLocation
   *         in: query
   *         description: Include location details
   *         schema:
   *           type: boolean
   *           default: true
   *       - name: includeFeatures
   *         in: query
   *         description: Include project features
   *         schema:
   *           type: boolean
   *           default: true
   *     responses:
   *       200:
   *         $ref: '#/components/responses/ProjectResponse'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           // Get project by slug
   *           fetch('/api/projects/slug/luxury-waterfront-apartments')
   *             .then(res => res.json())
   *             .then(data => console.log(data));
   */
  async getProjectBySlug(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { slug } = req.params;
      const {
        includePhotos = "true",
        includeFloorPlans = "true",
        includeApartments = "true",
        includeLocation = "true",
        includeFeatures = "true",
      } = req.query;

      // Build options
      const options: ProjectQueryOptions = {
        relations: [],
        includePhotos: includePhotos === "true",
        includeFloorPlans: includeFloorPlans === "true",
      };

      // Add relations
      if (includeLocation === "true") options.relations!.push("location");
      if (includeApartments === "true") options.relations!.push("apartments");

      let project = await ProjectModel.findOne({ slug }, options);

      if (!project) {
        throw new AppError("Project not found", 404);
      }

      // Load features if requested
      if (includeFeatures === "true") {
        project = await ProjectModel.loadFeaturesForProject(project);
      }

      // Load apartment media if apartments are included
      if (includeApartments === "true" && project?.apartments) {
        project.apartments = await ProjectModel.loadApartmentMedia(
          project.apartments
        );
      }

      ApiResponse.success(res, project, "Project retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects:
   *   post:
   *     tags:
   *       - Projects
   *     summary: Create new project
   *     description: |
   *       Creates a new project with the provided data.
   *       Slug is automatically generated from title if not provided.
   *       Project starts as unpublished by default.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProjectDTO'
   *           examples:
   *             residential:
   *               summary: Residential project
   *               value:
   *                 title: "Luxury Waterfront Apartments"
   *                 description: "Modern luxury apartments with stunning waterfront views"
   *                 projectType: "residential"
   *                 status: "planning"
   *                 locationId: 5
   *                 price: 250000
   *                 isFeatured: false
   *             commercial:
   *               summary: Commercial project
   *               value:
   *                 title: "Downtown Business Center"
   *                 description: "Premium office spaces in the heart of downtown"
   *                 projectType: "commercial"
   *                 status: "under_construction"
   *                 locationId: 3
   *                 price: 500000
   *     responses:
   *       201:
   *         description: Project created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Project'
   *                 message:
   *                   type: string
   *                   example: "Project created successfully"
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           const projectData = {
   *             title: "Luxury Waterfront Apartments",
   *             projectType: "residential",
   *             locationId: 5,
   *             price: 250000
   *           };
   *           fetch('/api/projects', {
   *             method: 'POST',
   *             headers: { 'Content-Type': 'application/json' },
   *             body: JSON.stringify(projectData)
   *           }).then(res => res.json());
   */
  async createProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const project = await ProjectModel.create(req.body);

      ApiResponse.created(res, project, "Project created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}:
   *   put:
   *     tags:
   *       - Projects
   *     summary: Update project
   *     description: |
   *       Updates an existing project with the provided data.
   *       Only provided fields will be updated (partial update supported).
   *       Returns the updated project with all current data.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateProjectDTO'
   *           examples:
   *             updateStatus:
   *               summary: Update project status
   *               value:
   *                 status: "completed"
   *             updatePrice:
   *               summary: Update project price
   *               value:
   *                 price: 275000
   *             fullUpdate:
   *               summary: Update multiple fields
   *               value:
   *                 title: "Updated Project Title"
   *                 status: "under_construction"
   *                 price: 300000
   *                 isFeatured: true
   *     responses:
   *       200:
   *         description: Project updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Project'
   *                 message:
   *                   type: string
   *                   example: "Project updated successfully"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/projects/1', {
   *             method: 'PUT',
   *             headers: { 'Content-Type': 'application/json' },
   *             body: JSON.stringify({ status: 'completed' })
   *           }).then(res => res.json());
   */
  async updateProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const project = await ProjectModel.update(Number(id), req.body);

      if (!project) {
        throw new AppError("Project not found", 404);
      }

      ApiResponse.success(res, project, "Project updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}:
   *   delete:
   *     tags:
   *       - Projects
   *     summary: Delete project
   *     description: |
   *       Soft deletes a project by setting deleted_at timestamp.
   *       Associated media (photos, floor plans) are also soft deleted.
   *       Project can be restored later if needed.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Project deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: null
   *                 message:
   *                   type: string
   *                   example: "Project deleted successfully"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/projects/1', {
   *             method: 'DELETE'
   *           }).then(res => res.json());
   */
  async deleteProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await ProjectModel.delete(Number(id));

      if (!deleted) {
        throw new AppError("Project not found", 404);
      }

      ApiResponse.success(res, null, "Project deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // PHOTO MANAGEMENT
  // ============================================================================

  /**
   * @openapi
   * /api/projects/{id}/photos:
   *   get:
   *     tags:
   *       - Project Photos
   *     summary: Get project photos
   *     description: |
   *       Retrieves all photos associated with a project.
   *       Photos are returned in display order (ascending).
   *       Can filter by cover status or caption presence.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - $ref: '#/components/parameters/IsCoverParam'
   *       - $ref: '#/components/parameters/HasCaptionParam'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/PhotosResponse'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           // Get all photos for project
   *           fetch('/api/projects/1/photos')
   *             .then(res => res.json())
   *             .then(data => console.log(data));
   */
  async getProjectPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { isCover, hasCaption } = req.query;

      const options: any = {};
      if (isCover !== undefined) options.isCover = isCover === "true";
      if (hasCaption !== undefined) options.hasCaption = hasCaption === "true";

      const photos = await PhotoModel.getForEntity(
        PhotoableType.PROJECT,
        Number(id),
        options
      );

      ApiResponse.success(res, photos, "Project photos retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/photos/cover:
   *   get:
   *     tags:
   *       - Project Photos
   *     summary: Get project cover photo
   *     description: |
   *       Retrieves the cover photo for a project.
   *       The cover photo is typically the first photo displayed in listings.
   *       Only one photo can be marked as cover per project.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Cover photo retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Photo'
   *                 message:
   *                   type: string
   *                   example: "Cover photo retrieved successfully"
   *       404:
   *         description: Cover photo not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   */
  async getProjectCoverPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const photo = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        Number(id)
      );

      if (!photo) {
        throw new AppError("Cover photo not found", 404);
      }

      ApiResponse.success(res, photo, "Cover photo retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/photos:
   *   post:
   *     tags:
   *       - Project Photos
   *     summary: Add photos to project
   *     description: |
   *       Bulk adds multiple photos to a project in a single transaction.
   *       Display order is automatically assigned based on array position.
   *       All photos are added or none (atomic operation).
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - photos
   *             properties:
   *               photos:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   $ref: '#/components/schemas/CreatePhotoDTO'
   *           example:
   *             photos:
   *               - url: "https://example.com/photo1.jpg"
   *                 alt: "Exterior view"
   *                 caption: "Beautiful facade"
   *                 isCover: true
   *               - url: "https://example.com/photo2.jpg"
   *                 alt: "Interior view"
   *                 caption: "Spacious living room"
   *               - url: "https://example.com/photo3.jpg"
   *                 alt: "Amenities"
   *     responses:
   *       201:
   *         description: Photos added successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Photo'
   *                 message:
   *                   type: string
   *                   example: "3 photo(s) added successfully"
   *       400:
   *         description: Photos array is required or empty
   *       404:
   *         description: Project not found
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           const photos = [
   *             { url: 'https://example.com/photo1.jpg', alt: 'View 1' },
   *             { url: 'https://example.com/photo2.jpg', alt: 'View 2' }
   *           ];
   *           fetch('/api/projects/1/photos', {
   *             method: 'POST',
   *             headers: { 'Content-Type': 'application/json' },
   *             body: JSON.stringify({ photos })
   *           }).then(res => res.json());
   */
  async addProjectPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { photos } = req.body;

      if (!photos || !Array.isArray(photos) || photos.length === 0) {
        throw new AppError("Photos array is required", 400);
      }

      // Validate project exists
      const project = await ProjectModel.findById(Number(id));
      if (!project) {
        throw new AppError("Project not found", 404);
      }

      const trx = await db.transaction();

      try {
        const createdPhotos = await PhotoModel.createManyForEntity(
          PhotoableType.PROJECT,
          Number(id),
          photos,
          trx
        );

        await trx.commit();

        ApiResponse.created(
          res,
          createdPhotos,
          `${createdPhotos.length} photo(s) added successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/photos/{photoId}:
   *   patch:
   *     tags:
   *       - Project Photos
   *     summary: Update project photo
   *     description: |
   *       Updates a specific photo's properties.
   *       Can update URL, alt text, caption, or display order.
   *       Use set-cover endpoint to change cover status.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - $ref: '#/components/parameters/PhotoIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               url:
   *                 type: string
   *                 format: uri
   *               alt:
   *                 type: string
   *               caption:
   *                 type: string
   *               displayOrder:
   *                 type: integer
   *           example:
   *             caption: "Updated photo caption"
   *             alt: "Updated alt text"
   *     responses:
   *       200:
   *         description: Photo updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Photo'
   *                 message:
   *                   type: string
   *                   example: "Photo updated successfully"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   */
  async updateProjectPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const photo = await PhotoModel.update(Number(photoId), req.body);

      if (!photo) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, photo, "Photo updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/photos/{photoId}/set-cover:
   *   patch:
   *     tags:
   *       - Project Photos
   *     summary: Set project cover photo
   *     description: |
   *       Marks a photo as the project's cover photo.
   *       Automatically unmarks any existing cover photo for the project.
   *       Only one cover photo is allowed per project.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - $ref: '#/components/parameters/PhotoIdParam'
   *     responses:
   *       200:
   *         description: Cover photo set successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Photo'
   *                 message:
   *                   type: string
   *                   example: "Cover photo set successfully"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/projects/1/photos/5/set-cover', {
   *             method: 'PATCH'
   *           }).then(res => res.json());
   */
  async setProjectCoverPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const photo = await PhotoModel.setCover(Number(photoId));

      if (!photo) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, photo, "Cover photo set successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/photos/{photoId}:
   *   delete:
   *     tags:
   *       - Project Photos
   *     summary: Delete project photo
   *     description: |
   *       Soft deletes a photo from the project.
   *       Photo can be restored later if needed.
   *       If deleted photo was cover, another photo should be set as cover.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - $ref: '#/components/parameters/PhotoIdParam'
   *     responses:
   *       200:
   *         description: Photo deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: null
   *                 message:
   *                   type: string
   *                   example: "Photo deleted successfully"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   */
  async deleteProjectPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const deleted = await PhotoModel.delete(Number(photoId));

      if (!deleted) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, null, "Photo deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/photos/reorder:
   *   post:
   *     tags:
   *       - Project Photos
   *     summary: Reorder project photos
   *     description: |
   *       Updates the display order of project photos.
   *       Array position determines new display_order value.
   *       All photos must belong to the specified project.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - photoIds
   *             properties:
   *               photoIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *                 description: Array of photo IDs in desired order
   *                 example: [3, 1, 5, 2, 4]
   *     responses:
   *       200:
   *         description: Photos reordered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: null
   *                 message:
   *                   type: string
   *                   example: "Photos reordered successfully"
   *       400:
   *         description: photoIds array is required
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           const photoIds = [3, 1, 5, 2, 4];
   *           fetch('/api/projects/1/photos/reorder', {
   *             method: 'POST',
   *             headers: { 'Content-Type': 'application/json' },
   *             body: JSON.stringify({ photoIds })
   *           }).then(res => res.json());
   */
  async reorderProjectPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { photoIds } = req.body;

      if (!photoIds || !Array.isArray(photoIds)) {
        throw new AppError("photoIds array is required", 400);
      }

      await PhotoModel.reorder(PhotoableType.PROJECT, Number(id), photoIds);

      ApiResponse.success(res, null, "Photos reordered successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // FLOOR PLAN MANAGEMENT
  // ============================================================================

  /**
   * @openapi
   * /api/projects/{id}/floor-plans:
   *   get:
   *     tags:
   *       - Project Floor Plans
   *     summary: Get project floor plans
   *     description: |
   *       Retrieves all floor plans associated with a project.
   *       Floor plans are returned in display order (ascending).
   *       Can filter by PDF presence.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - $ref: '#/components/parameters/HasPdfParam'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/FloorPlansResponse'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           // Get all floor plans
   *           fetch('/api/projects/1/floor-plans')
   *             .then(res => res.json())
   *             .then(data => console.log(data));
   */
  async getProjectFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { hasPdf } = req.query;

      const options: any = {};
      if (hasPdf !== undefined) options.hasPdf = hasPdf === "true";

      const floorPlans = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        Number(id),
        options
      );

      ApiResponse.success(
        res,
        floorPlans,
        "Project floor plans retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}:
   *   get:
   *     tags:
   *       - Projects
   *     summary: Get project by ID with FULL relations
   *     description: |
   *       Retrieves a single project by its ID with comprehensive relation loading.
   *       By default includes all relations (photos, floor plans, apartments, location, features).
   *       Each relation can be individually excluded using query parameters.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - name: includePhotos
   *         in: query
   *         description: Include project photos
   *         schema:
   *           type: boolean
   *           default: true
   *       - name: includeFloorPlans
   *         in: query
   *         description: Include floor plans
   *         schema:
   *           type: boolean
   *           default: true
   *       - name: includeApartments
   *         in: query
   *         description: Include apartments
   *         schema:
   *           type: boolean
   *           default: true
   *       - name: includeLocation
   *         in: query
   *         description: Include location details
   *         schema:
   *           type: boolean
   *           default: true
   *       - name: includeFeatures
   *         in: query
   *         description: Include project features
   *         schema:
   *           type: boolean
   *           default: true
   *     responses:
   *       200:
   *         $ref: '#/components/responses/ProjectResponse'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           // Get complete project with all relations
   *           fetch('/api/projects/1')
   *             .then(res => res.json())
   *             .then(data => console.log(data));
   */
  async getProjectById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const {
        includePhotos = "true",
        includeFloorPlans = "true",
        includeApartments = "true",
        includeLocation = "true",
        includeFeatures = "true",
      } = req.query;

      // Build relations array
      const relations: string[] = [];
      if (includeLocation === "true") relations.push("location");
      if (includeApartments === "true") relations.push("apartments");

      // Get project with media
      let project = await ProjectModel.findByIdWithMedia(Number(id), {
        includePhotos: includePhotos === "true",
        includeFloorPlans: includeFloorPlans === "true",
        includeRelations: relations,
      });

      if (!project) {
        throw new AppError("Project not found", 404);
      }

      // Load features if requested
      if (includeFeatures === "true") {
        project = await ProjectModel.loadFeaturesForProject(project);
      }

      // Load apartment photos if apartments are included
      if (includeApartments === "true" && project?.apartments) {
        project.apartments = await ProjectModel.loadApartmentMedia(
          project.apartments
        );
      }

      ApiResponse.success(res, project, "Project retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all projects with filtering and pagination
   * GET /api/projects
   */
  async getProjects(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        projectType,
        status,
        locationId,
        isFeatured,
        isPublished,
        minPrice,
        maxPrice,
        search,
        sortBy = "created_at",
        sortOrder = "desc",
        includePhotos,
        includeFloorPlans,
        includeApartments,
        includeLocation,
        includeFeatures,
      } = req.query;

      const options: ProjectQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
        includePhotos: includePhotos === "true",
        includeFloorPlans: includeFloorPlans === "true",
      };

      // Build relations array based on query params
      const relations: string[] = [];
      if (includeLocation === "true") relations.push("location");
      if (includeApartments === "true") relations.push("apartments");
      if (relations.length > 0) {
        options.relations = relations;
      }

      // Apply filters
      if (projectType) options.projectType = projectType as ProjectType;
      if (status) options.status = status as ProjectStatus;
      if (locationId) options.locationId = Number(locationId);
      if (isFeatured !== undefined) options.isFeatured = isFeatured === "true";
      if (isPublished !== undefined)
        options.isPublished = isPublished === "true";
      if (minPrice) options.minPrice = Number(minPrice);
      if (maxPrice) options.maxPrice = Number(maxPrice);
      if (search) options.search = search as string;

      let result = await ProjectModel.findProjects(options);

      // Load features if requested
      if (includeFeatures === "true") {
        result = await ProjectModel.loadFeaturesForProjects(result);
      }

      // Load apartment media if apartments are included
      if (includeApartments === "true") {
        result = await ProjectModel.loadApartmentMediaForProjects(result);
      }

      ApiResponse.success(res, result, "Projects retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/floor-plans:
   *   post:
   *     tags:
   *       - Project Floor Plans
   *     summary: Add floor plans to project
   *     description: |
   *       Bulk adds multiple floor plans to a project in a single transaction.
   *       Display order is automatically assigned based on array position.
   *       All floor plans are added or none (atomic operation).
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - floorPlans
   *             properties:
   *               floorPlans:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   $ref: '#/components/schemas/CreateFloorPlanDTO'
   *           example:
   *             floorPlans:
   *               - title: "2-Bedroom Layout"
   *                 imageUrl: "https://example.com/floorplans/2bed.jpg"
   *                 pdfUrl: "https://example.com/floorplans/2bed.pdf"
   *               - title: "3-Bedroom Layout"
   *                 imageUrl: "https://example.com/floorplans/3bed.jpg"
   *     responses:
   *       201:
   *         description: Floor plans added successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/FloorPlan'
   *                 message:
   *                   type: string
   *                   example: "2 floor plan(s) added successfully"
   *       400:
   *         description: floorPlans array is required or empty
   *       404:
   *         description: Project not found
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           const floorPlans = [
   *             { title: '2-Bedroom', imageUrl: 'https://example.com/2bed.jpg' },
   *             { title: '3-Bedroom', imageUrl: 'https://example.com/3bed.jpg' }
   *           ];
   *           fetch('/api/projects/1/floor-plans', {
   *             method: 'POST',
   *             headers: { 'Content-Type': 'application/json' },
   *             body: JSON.stringify({ floorPlans })
   *           }).then(res => res.json());
   */
  async addProjectFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { floorPlans } = req.body;

      if (
        !floorPlans ||
        !Array.isArray(floorPlans) ||
        floorPlans.length === 0
      ) {
        throw new AppError("floorPlans array is required", 400);
      }

      // Validate project exists
      const project = await ProjectModel.findById(Number(id));
      if (!project) {
        throw new AppError("Project not found", 404);
      }

      const trx = await db.transaction();

      try {
        const createdFloorPlans = await FloorPlanModel.createManyForEntity(
          PlannableType.PROJECT,
          Number(id),
          floorPlans,
          trx
        );

        await trx.commit();

        ApiResponse.created(
          res,
          createdFloorPlans,
          `${createdFloorPlans.length} floor plan(s) added successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/floor-plans/{floorPlanId}:
   *   patch:
   *     tags:
   *       - Project Floor Plans
   *     summary: Update project floor plan
   *     description: |
   *       Updates a specific floor plan's properties.
   *       Can update title, image URL, PDF URL, or display order.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - $ref: '#/components/parameters/FloorPlanIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               imageUrl:
   *                 type: string
   *                 format: uri
   *               pdfUrl:
   *                 type: string
   *                 format: uri
   *               displayOrder:
   *                 type: integer
   *           example:
   *             title: "Updated 2-Bedroom Layout"
   *             pdfUrl: "https://example.com/floorplans/updated-2bed.pdf"
   *     responses:
   *       200:
   *         description: Floor plan updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/FloorPlan'
   *                 message:
   *                   type: string
   *                   example: "Floor plan updated successfully"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   */
  async updateProjectFloorPlan(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;

      const floorPlan = await FloorPlanModel.update(
        Number(floorPlanId),
        req.body
      );

      if (!floorPlan) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, floorPlan, "Floor plan updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/floor-plans/{floorPlanId}:
   *   delete:
   *     tags:
   *       - Project Floor Plans
   *     summary: Delete project floor plan
   *     description: |
   *       Soft deletes a floor plan from the project.
   *       Floor plan can be restored later if needed.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *       - $ref: '#/components/parameters/FloorPlanIdParam'
   *     responses:
   *       200:
   *         description: Floor plan deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: null
   *                 message:
   *                   type: string
   *                   example: "Floor plan deleted successfully"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/projects/1/floor-plans/5', {
   *             method: 'DELETE'
   *           }).then(res => res.json());
   */
  async deleteProjectFloorPlan(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;

      const deleted = await FloorPlanModel.delete(Number(floorPlanId));

      if (!deleted) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, null, "Floor plan deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/floor-plans/reorder:
   *   post:
   *     tags:
   *       - Project Floor Plans
   *     summary: Reorder project floor plans
   *     description: |
   *       Updates the display order of project floor plans.
   *       Array position determines new display_order value.
   *       All floor plans must belong to the specified project.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - floorPlanIds
   *             properties:
   *               floorPlanIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *                 description: Array of floor plan IDs in desired order
   *                 example: [3, 1, 5, 2]
   *     responses:
   *       200:
   *         description: Floor plans reordered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: null
   *                 message:
   *                   type: string
   *                   example: "Floor plans reordered successfully"
   *       400:
   *         description: floorPlanIds array is required
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   */
  async reorderProjectFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { floorPlanIds } = req.body;

      if (!floorPlanIds || !Array.isArray(floorPlanIds)) {
        throw new AppError("floorPlanIds array is required", 400);
      }

      await FloorPlanModel.reorder(
        PlannableType.PROJECT,
        Number(id),
        floorPlanIds
      );

      ApiResponse.success(res, null, "Floor plans reordered successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // PUBLISHING & VALIDATION
  // ============================================================================

  /**
   * @openapi
   * /api/projects/{id}/validate-media:
   *   get:
   *     tags:
   *       - Project Publishing
   *     summary: Validate project media before publishing
   *     description: |
   *       Validates that a project has the required media for publishing.
   *       Checks for cover photo, minimum photo count, and floor plans.
   *       Returns validation status and list of any errors or warnings.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Media validation result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/MediaValidationResult'
   *                 message:
   *                   type: string
   *                   example: "Media validation passed"
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/projects/1/validate-media')
   *             .then(res => res.json())
   *             .then(data => {
   *               if (data.data.isValid) {
   *                 console.log('Ready to publish!');
   *               } else {
   *                 console.log('Errors:', data.data.errors);
   *               }
   *             });
   */
  async validateProjectMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const errors: string[] = [];

      // Check for cover photo
      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        Number(id)
      );
      if (!coverPhoto) {
        errors.push("Cover photo is required");
      }

      // Check for minimum photos
      const photoCount = await PhotoModel.countForEntity(
        PhotoableType.PROJECT,
        Number(id)
      );
      if (photoCount < 3) {
        errors.push("At least 3 photos are required");
      }

      // Check for floor plans (warning only)
      const floorPlanCount = await FloorPlanModel.countForEntity(
        PlannableType.PROJECT,
        Number(id)
      );
      if (floorPlanCount === 0) {
        errors.push("WARNING: No floor plans found (recommended)");
      }

      const isValid = errors.length === 0;

      ApiResponse.success(
        res,
        { isValid, errors },
        isValid ? "Media validation passed" : "Media validation failed"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/publish:
   *   patch:
   *     tags:
   *       - Project Publishing
   *     summary: Publish project
   *     description: |
   *       Publishes a project making it publicly visible.
   *       Validates that project has required media before publishing.
   *       Requires cover photo and at least 3 photos.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Project published successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Project'
   *                 message:
   *                   type: string
   *                   example: "Project published successfully"
   *       400:
   *         description: Project doesn't meet publishing requirements
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Cannot publish project: Cover photo and at least 3 photos are required"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/projects/1/publish', {
   *             method: 'PATCH'
   *           }).then(res => res.json());
   */
  async publishProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // Validate media before publishing
      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        Number(id)
      );

      const photoCount = await PhotoModel.countForEntity(
        PhotoableType.PROJECT,
        Number(id)
      );

      if (!coverPhoto || photoCount < 3) {
        throw new AppError(
          "Cannot publish project: Cover photo and at least 3 photos are required",
          400
        );
      }

      const project = await ProjectModel.publish(Number(id));

      ApiResponse.success(res, project, "Project published successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/unpublish:
   *   patch:
   *     tags:
   *       - Project Publishing
   *     summary: Unpublish project
   *     description: |
   *       Unpublishes a project making it hidden from public view.
   *       Project remains in the database and can be republished later.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Project unpublished successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Project'
   *                 message:
   *                   type: string
   *                   example: "Project unpublished successfully"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/projects/1/unpublish', {
   *             method: 'PATCH'
   *           }).then(res => res.json());
   */
  async unpublishProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const project = await ProjectModel.unpublish(Number(id));

      ApiResponse.success(res, project, "Project unpublished successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * @openapi
   * /api/projects/{id}/media-stats:
   *   get:
   *     tags:
   *       - Project Analytics
   *     summary: Get project media statistics
   *     description: |
   *       Retrieves comprehensive statistics about project media.
   *       Includes photo count, cover photo status, floor plan count, and PDF availability.
   *     parameters:
   *       - $ref: '#/components/parameters/ProjectIdParam'
   *     responses:
   *       200:
   *         description: Media statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/MediaStatistics'
   *                 message:
   *                   type: string
   *                   example: "Media statistics retrieved successfully"
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           fetch('/api/projects/1/media-stats')
   *             .then(res => res.json())
   *             .then(data => console.log('Stats:', data.data));
   */
  async getProjectMediaStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const [photoStats, floorPlanStats] = await Promise.all([
        PhotoModel.countForEntity(PhotoableType.PROJECT, Number(id)),
        FloorPlanModel.getStatistics(PlannableType.PROJECT, Number(id)),
      ]);

      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        Number(id)
      );

      ApiResponse.success(
        res,
        {
          photos: {
            total: photoStats,
            hasCover: !!coverPhoto,
          },
          floorPlans: floorPlanStats,
        },
        "Media statistics retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/projects/compare:
   *   post:
   *     tags:
   *       - Project Analytics
   *     summary: Compare multiple projects
   *     description: |
   *       Retrieves complete data for multiple projects for comparison.
   *       Includes all relations (photos, apartments, location) for each project.
   *       Useful for side-by-side project comparisons.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - projectIds
   *             properties:
   *               projectIds:
   *                 type: array
   *                 minItems: 2
   *                 items:
   *                   type: integer
   *                 description: Array of project IDs to compare
   *                 example: [1, 5, 12]
   *     responses:
   *       200:
   *         description: Projects comparison data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Project'
   *                 message:
   *                   type: string
   *                   example: "Projects comparison data retrieved"
   *       400:
   *         description: At least 2 project IDs required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "At least 2 project IDs required"
   *       500:
   *         $ref: '#/components/responses/DatabaseError'
   *     x-codeSamples:
   *       - lang: 'JavaScript'
   *         source: |
   *           const projectIds = [1, 5, 12];
   *           fetch('/api/projects/compare', {
   *             method: 'POST',
   *             headers: { 'Content-Type': 'application/json' },
   *             body: JSON.stringify({ projectIds })
   *           }).then(res => res.json());
   */
  async compareProjects(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectIds } = req.body;

      if (!Array.isArray(projectIds) || projectIds.length < 2) {
        throw new AppError("At least 2 project IDs required", 400);
      }

      const projects = await Promise.all(
        projectIds.map((id: number) =>
          ProjectModel.findByIdWithMedia(id, {
            includePhotos: true,
            includeRelations: ["location", "apartments"],
          })
        )
      );

      ApiResponse.success(res, projects, "Projects comparison data retrieved");
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new ProjectController();
