/**
 * Apartment Model
 *
 * Individual residential units within projects
 * Tracks availability, specifications, and sales pipeline
 * Price changes automatically update project price range (via database trigger)
 *
 * @module models/apartment.model
 * @class ApartmentModel
 *
 * @swagger
 * components:
 *   schemas:
 *     ApartmentStatus:
 *       type: string
 *       enum: [available, reserved, sold]
 *       description: Apartment status in the sales pipeline
 *       example: "available"
 *       x-enum-descriptions:
 *         available: Unit is available for sale
 *         reserved: Unit is reserved by a potential buyer
 *         sold: Unit has been sold
 *
 *     Apartment:
 *       type: object
 *       required:
 *         - id
 *         - projectId
 *         - name
 *         - areaSqm
 *         - price
 *         - status
 *         - isModelUnit
 *         - isPublished
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique apartment identifier
 *           example: 1
 *         projectId:
 *           type: integer
 *           description: ID of the parent project
 *           example: 5
 *         name:
 *           type: string
 *           description: Apartment name or title
 *           example: "Luxury 3-Bedroom Suite"
 *         unitNumber:
 *           type: string
 *           nullable: true
 *           description: Unit number within the building
 *           example: "12A"
 *         floorNumber:
 *           type: integer
 *           nullable: true
 *           description: Floor number where apartment is located
 *           example: 12
 *         title:
 *           type: string
 *           nullable: true
 *           description: Marketing title for the apartment
 *           example: "Executive Suite with City View"
 *         subtitle:
 *           type: string
 *           nullable: true
 *           description: Marketing subtitle
 *           example: "Premium location with modern amenities"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Detailed description of the apartment
 *           example: "Spacious 3-bedroom apartment with panoramic city views..."
 *         areaSqm:
 *           type: number
 *           minimum: 0
 *           description: Total area in square meters
 *           example: 120.5
 *         bedrooms:
 *           type: integer
 *           nullable: true
 *           minimum: 0
 *           description: Number of bedrooms
 *           example: 3
 *         bathrooms:
 *           type: integer
 *           nullable: true
 *           minimum: 0
 *           description: Number of bathrooms
 *           example: 2
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Price in the project's currency
 *           example: 850000
 *         livingRooms:
 *           type: integer
 *           nullable: true
 *           minimum: 0
 *           description: Number of living rooms
 *           example: 1
 *         kitchens:
 *           type: integer
 *           nullable: true
 *           minimum: 0
 *           description: Number of kitchens
 *           example: 1
 *         balconies:
 *           type: integer
 *           nullable: true
 *           minimum: 0
 *           description: Number of balconies
 *           example: 2
 *         status:
 *           $ref: '#/components/schemas/ApartmentStatus'
 *         isModelUnit:
 *           type: boolean
 *           description: Whether this is a model/show unit
 *           example: false
 *         isPublished:
 *           type: boolean
 *           description: Whether the apartment is published and visible
 *           example: true
 *         virtualTourUrl:
 *           type: string
 *           nullable: true
 *           format: uri
 *           description: URL to virtual tour
 *           example: "https://tour.example.com/apartment/12a"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-20T14:45:00Z"
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Deletion timestamp (soft delete)
 *           example: null
 *         project:
 *           $ref: '#/components/schemas/Project'
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *           description: Associated photos
 *         floorPlans:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FloorPlan'
 *           description: Associated floor plans
 *
 *     CreateApartmentDto:
 *       type: object
 *       required:
 *         - projectId
 *         - name
 *         - areaSqm
 *         - price
 *       properties:
 *         projectId:
 *           type: integer
 *           description: ID of the parent project
 *           example: 5
 *         name:
 *           type: string
 *           description: Apartment name or title
 *           example: "Luxury 3-Bedroom Suite"
 *         unitNumber:
 *           type: string
 *           description: Unit number within the building
 *           example: "12A"
 *         floorNumber:
 *           type: integer
 *           description: Floor number where apartment is located
 *           example: 12
 *         title:
 *           type: string
 *           description: Marketing title for the apartment
 *           example: "Executive Suite with City View"
 *         subtitle:
 *           type: string
 *           description: Marketing subtitle
 *           example: "Premium location with modern amenities"
 *         description:
 *           type: string
 *           description: Detailed description of the apartment
 *           example: "Spacious 3-bedroom apartment with panoramic city views..."
 *         areaSqm:
 *           type: number
 *           minimum: 0
 *           description: Total area in square meters
 *           example: 120.5
 *         bedrooms:
 *           type: integer
 *           minimum: 0
 *           description: Number of bedrooms
 *           example: 3
 *         bathrooms:
 *           type: integer
 *           minimum: 0
 *           description: Number of bathrooms
 *           example: 2
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Price in the project's currency
 *           example: 850000
 *         livingRooms:
 *           type: integer
 *           minimum: 0
 *           description: Number of living rooms
 *           example: 1
 *         kitchens:
 *           type: integer
 *           minimum: 0
 *           description: Number of kitchens
 *           example: 1
 *         balconies:
 *           type: integer
 *           minimum: 0
 *           description: Number of balconies
 *           example: 2
 *         status:
 *           $ref: '#/components/schemas/ApartmentStatus'
 *         isModelUnit:
 *           type: boolean
 *           description: Whether this is a model/show unit
 *           example: false
 *         isPublished:
 *           type: boolean
 *           description: Whether the apartment is published and visible
 *           example: true
 *         virtualTourUrl:
 *           type: string
 *           format: uri
 *           description: URL to virtual tour
 *           example: "https://tour.example.com/apartment/12a"
 *
 *     UpdateApartmentDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateApartmentDto'
 *         - type: object
 *           description: All fields from CreateApartmentDto are optional for updates
 *
 *     ApartmentQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             projectId:
 *               type: integer
 *               description: Filter by project ID
 *               example: 5
 *             status:
 *               $ref: '#/components/schemas/ApartmentStatus'
 *             isModelUnit:
 *               type: boolean
 *               description: Filter by model unit status
 *               example: false
 *             isPublished:
 *               type: boolean
 *               description: Filter by published status
 *               example: true
 *             minPrice:
 *               type: number
 *               minimum: 0
 *               description: Minimum price filter
 *               example: 500000
 *             maxPrice:
 *               type: number
 *               minimum: 0
 *               description: Maximum price filter
 *               example: 1000000
 *             bedrooms:
 *               oneOf:
 *                 - type: integer
 *                   description: Exact number of bedrooms
 *                   example: 3
 *                 - type: array
 *                   items:
 *                     type: integer
 *                   description: Multiple bedroom options
 *                   example: [2, 3, 4]
 *             minBedrooms:
 *               type: integer
 *               minimum: 0
 *               description: Minimum number of bedrooms
 *               example: 2
 *             maxBedrooms:
 *               type: integer
 *               minimum: 0
 *               description: Maximum number of bedrooms
 *               example: 4
 *             bathrooms:
 *               oneOf:
 *                 - type: integer
 *                   description: Exact number of bathrooms
 *                   example: 2
 *                 - type: array
 *                   items:
 *                     type: integer
 *                   description: Multiple bathroom options
 *                   example: [1, 2]
 *             minArea:
 *               type: number
 *               minimum: 0
 *               description: Minimum area in square meters
 *               example: 80
 *             maxArea:
 *               type: number
 *               minimum: 0
 *               description: Maximum area in square meters
 *               example: 200
 *             floorNumber:
 *               oneOf:
 *                 - type: integer
 *                   description: Exact floor number
 *                   example: 12
 *                 - type: array
 *                   items:
 *                     type: integer
 *                   description: Multiple floor options
 *                   example: [10, 11, 12, 13]
 *             minFloor:
 *               type: integer
 *               description: Minimum floor number
 *               example: 5
 *             maxFloor:
 *               type: integer
 *               description: Maximum floor number
 *               example: 20
 *             hasVirtualTour:
 *               type: boolean
 *               description: Filter apartments with virtual tours
 *               example: true
 *             includePhotos:
 *               type: boolean
 *               description: Include associated photos in response
 *               example: true
 *             includeFloorPlans:
 *               type: boolean
 *               description: Include associated floor plans in response
 *               example: true
 *
 *     ApartmentWithStats:
 *       allOf:
 *         - $ref: '#/components/schemas/Apartment'
 *         - type: object
 *           required:
 *             - stats
 *           properties:
 *             stats:
 *               type: object
 *               required:
 *                 - viewCount
 *                 - inquiryCount
 *                 - favoriteCount
 *                 - lastViewedAt
 *               properties:
 *                 viewCount:
 *                   type: integer
 *                   description: Total number of views
 *                   example: 1250
 *                 inquiryCount:
 *                   type: integer
 *                   description: Number of inquiries received
 *                   example: 45
 *                 favoriteCount:
 *                   type: integer
 *                   description: Number of times added to favorites
 *                   example: 23
 *                 lastViewedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   description: Timestamp of last view
 *                   example: "2024-01-20T16:30:00Z"
 *
 *     ApartmentAvailabilitySummary:
 *       type: object
 *       required:
 *         - total
 *         - available
 *         - reserved
 *         - sold
 *         - availabilityRate
 *         - soldRate
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of apartments in project
 *           example: 150
 *         available:
 *           type: integer
 *           description: Number of available apartments
 *           example: 75
 *         reserved:
 *           type: integer
 *           description: Number of reserved apartments
 *           example: 25
 *         sold:
 *           type: integer
 *           description: Number of sold apartments
 *           example: 50
 *         availabilityRate:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of available units
 *           example: 50.0
 *         soldRate:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of sold units
 *           example: 33.33
 *
 *     MediaValidationResult:
 *       type: object
 *       required:
 *         - valid
 *         - errors
 *       properties:
 *         valid:
 *           type: boolean
 *           description: Whether media requirements are met
 *           example: false
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           description: List of validation errors
 *           example: ["At least one photo is required", "Cover photo is required"]
 *
 *     ApartmentMedia:
 *       type: object
 *       required:
 *         - photos
 *         - floorPlans
 *       properties:
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *           description: Associated photos
 *         floorPlans:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FloorPlan'
 *           description: Associated floor plans
 *
 *     ProjectStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of apartments
 *           example: 150
 *         available:
 *           type: integer
 *           description: Number of available apartments
 *           example: 75
 *         reserved:
 *           type: integer
 *           description: Number of reserved apartments
 *           example: 25
 *         sold:
 *           type: integer
 *           description: Number of sold apartments
 *           example: 50
 *         published:
 *           type: integer
 *           description: Number of published apartments
 *           example: 120
 *         modelUnits:
 *           type: integer
 *           description: Number of model units
 *           example: 3
 *         pricing:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *               nullable: true
 *               description: Minimum price
 *               example: 500000
 *             max:
 *               type: number
 *               nullable: true
 *               description: Maximum price
 *               example: 1500000
 *             avg:
 *               type: number
 *               nullable: true
 *               description: Average price
 *               example: 875000
 *         area:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *               nullable: true
 *               description: Minimum area in sqm
 *               example: 80
 *             max:
 *               type: number
 *               nullable: true
 *               description: Maximum area in sqm
 *               example: 200
 *             avg:
 *               type: number
 *               nullable: true
 *               description: Average area in sqm
 *               example: 125
 *         floors:
 *           type: object
 *           properties:
 *             min:
 *               type: integer
 *               nullable: true
 *               description: Lowest floor number
 *               example: 1
 *             max:
 *               type: integer
 *               nullable: true
 *               description: Highest floor number
 *               example: 25
 *
 *     FloorDistribution:
 *       type: object
 *       required:
 *         - floor_number
 *         - count
 *       properties:
 *         floor_number:
 *           type: integer
 *           description: Floor number
 *           example: 12
 *         count:
 *           type: integer
 *           description: Number of apartments on this floor
 *           example: 8
 *
 *     BedroomDistribution:
 *       type: object
 *       required:
 *         - bedrooms
 *         - count
 *       properties:
 *         bedrooms:
 *           type: integer
 *           nullable: true
 *           description: Number of bedrooms (null for unspecified)
 *           example: 3
 *         count:
 *           type: integer
 *           description: Number of apartments with this bedroom count
 *           example: 25
 *
 *     PriceDistribution:
 *       type: object
 *       required:
 *         - range
 *         - count
 *       properties:
 *         range:
 *           type: string
 *           description: Price range label
 *           example: "$500,000 - $600,000"
 *         count:
 *           type: integer
 *           description: Number of apartments in this price range
 *           example: 15
 *         minPrice:
 *           type: number
 *           description: Minimum price in range
 *           example: 500000
 *         maxPrice:
 *           type: number
 *           description: Maximum price in range
 *           example: 600000
 *
 *   responses:
 *     ApartmentResponse:
 *       description: Apartment data response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Apartment'
 *
 *     ApartmentListResponse:
 *       description: Paginated apartment list response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaginatedResult'
 *           example:
 *             items:
 *               - id: 1
 *                 name: "Luxury 3-Bedroom Suite"
 *                 unitNumber: "12A"
 *                 floorNumber: 12
 *                 areaSqm: 120.5
 *                 bedrooms: 3
 *                 bathrooms: 2
 *                 price: 850000
 *                 status: "available"
 *                 isPublished: true
 *             pagination:
 *               total: 150
 *               page: 1
 *               limit: 10
 *               totalPages: 15
 *               hasNextPage: true
 *               hasPrevPage: false
 *
 *     ApartmentAvailabilityResponse:
 *       description: Apartment availability summary response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApartmentAvailabilitySummary'
 *
 *     ProjectStatisticsResponse:
 *       description: Project statistics response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectStatistics'
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
 *     StatusParam:
 *       name: status
 *       in: query
 *       description: Apartment status filter
 *       required: false
 *       schema:
 *         $ref: '#/components/schemas/ApartmentStatus'
 *
 *     PriceRangeParams:
 *       name: minPrice
 *       in: query
 *       description: Minimum price filter
 *       required: false
 *       schema:
 *         type: number
 *         minimum: 0
 *       example: 500000
 *     MaxPriceParam:
 *       name: maxPrice
 *       in: query
 *       description: Maximum price filter
 *       required: false
 *       schema:
 *         type: number
 *         minimum: 0
 *       example: 1000000
 *
 *     BedroomParams:
 *       name: bedrooms
 *       in: query
 *       description: Number of bedrooms filter
 *       required: false
 *       schema:
 *         oneOf:
 *           - type: integer
 *             minimum: 0
 *             example: 3
 *           - type: array
 *             items:
 *               type: integer
 *             example: [2, 3, 4]
 *
 *     AreaRangeParams:
 *       name: minArea
 *       in: query
 *       description: Minimum area filter (sqm)
 *       required: false
 *       schema:
 *         type: number
 *         minimum: 0
 *         example: 80
 *     MaxAreaParam:
 *       name: maxArea
 *       in: query
 *       description: Maximum area filter (sqm)
 *       required: false
 *       schema:
 *         type: number
 *         minimum: 0
 *         example: 200
 *
 *     FloorParams:
 *       name: floorNumber
 *       in: query
 *       description: Floor number filter
 *       required: false
 *       schema:
 *         oneOf:
 *           - type: integer
 *             example: 12
 *           - type: array
 *             items:
 *               type: integer
 *             example: [10, 11, 12, 13]
 *
 *     VirtualTourParam:
 *       name: hasVirtualTour
 *       in: query
 *       description: Filter apartments with virtual tours
 *       required: false
 *       schema:
 *         type: boolean
 *         example: true
 *
 *     IncludeMediaParams:
 *       name: includePhotos
 *       in: query
 *       description: Include photos in response
 *       required: false
 *       schema:
 *         type: boolean
 *         example: true
 *       IncludeFloorPlansParam:
 *         name: includeFloorPlans
 *         in: query
 *         description: Include floor plans in response
 *         required: false
 *         schema:
 *           type: boolean
 *           example: true
 *
 * tags:
 *   - name: Apartments
 *     description: Apartment management operations
 *     x-traitTag: true
 *
 * Features:
 * - Advanced apartment filtering and search capabilities
 * - Media management (photos and floor plans)
 * - Status workflow management (available → reserved → sold)
 * - Project-level statistics and analytics
 * - Price range calculations with automatic project updates
 * - Virtual tour URL support
 * - Model unit designation
 * - Publishing workflow with media validation
 * - Floor and unit number validation
 * - Area and price validation
 * - Comprehensive availability tracking
 * - Distribution analytics (price, floor, bedroom)
 * - Batch status updates
 * - Optimized media loading for multiple apartments
 * - Integration with project price range triggers
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import PhotoModel, { PhotoableType, Photo } from "./photo.model";
import FloorPlanModel, { PlannableType, FloorPlan } from "./floor-plan.model";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * Apartment status enumeration for sales pipeline tracking
 */
export enum ApartmentStatus {
  AVAILABLE = "available",
  RESERVED = "reserved",
  SOLD = "sold",
}

/**
 * @openapi
 * Apartment entity representing a residential unit within a project
 *
 * @interface Apartment
 * @property {number} id - Unique apartment identifier
 * @property {number} projectId - ID of the parent project
 * @property {string} name - Apartment name or title
 * @property {string|null} unitNumber - Unit number within the building
 * @property {number|null} floorNumber - Floor number where apartment is located
 * @property {string|null} title - Marketing title for the apartment
 * @property {string|null} subtitle - Marketing subtitle
 * @property {string|null} description - Detailed description
 * @property {number} areaSqm - Total area in square meters
 * @property {number|null} bedrooms - Number of bedrooms
 * @property {number|null} bathrooms - Number of bathrooms
 * @property {number} price - Price in project's currency
 * @property {number|null} livingRooms - Number of living rooms
 * @property {number|null} kitchens - Number of kitchens
 * @property {number|null} balconies - Number of balconies
 * @property {ApartmentStatus} status - Current sales status
 * @property {boolean} isModelUnit - Whether this is a model/show unit
 * @property {boolean} isPublished - Whether published and visible
 * @property {string|null} virtualTourUrl - URL to virtual tour
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {Date|null} deletedAt - Deletion timestamp (soft delete)
 */
export interface Apartment {
  id: number;
  projectId: number;
  name: string;
  unitNumber: string | null;
  floorNumber: number | null;

  // Marketing content
  title: string | null;
  subtitle: string | null;
  description: string | null;

  // Specifications
  areaSqm: number;
  bedrooms: number | null;
  bathrooms: number | null;
  price: number;
  livingRooms: number | null;
  kitchens: number | null;
  balconies: number | null;

  // Status & visibility
  status: ApartmentStatus;
  isModelUnit: boolean;
  isPublished: boolean;
  virtualTourUrl: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations
  project?: any;
  photos?: any[];
  floorPlans?: any[];
}

/**
 * @openapi
 * Data transfer object for creating a new apartment
 *
 * @interface CreateApartmentDto
 * @property {number} projectId - ID of the parent project (required)
 * @property {string} name - Apartment name or title (required)
 * @property {string} unitNumber - Unit number within the building
 * @property {number} floorNumber - Floor number where apartment is located
 * @property {string} title - Marketing title for the apartment
 * @property {string} subtitle - Marketing subtitle
 * @property {string} description - Detailed description
 * @property {number} areaSqm - Total area in square meters (required)
 * @property {number} bedrooms - Number of bedrooms
 * @property {number} bathrooms - Number of bathrooms
 * @property {number} price - Price in project's currency (required)
 * @property {number} livingRooms - Number of living rooms
 * @property {number} kitchens - Number of kitchens
 * @property {number} balconies - Number of balconies
 * @property {ApartmentStatus} status - Current sales status
 * @property {boolean} isModelUnit - Whether this is a model/show unit
 * @property {boolean} isPublished - Whether published and visible
 * @property {string} virtualTourUrl - URL to virtual tour
 */
export interface CreateApartmentDto {
  projectId: number;
  name: string;
  unitNumber?: string;
  floorNumber?: number;
  title?: string;
  subtitle?: string;
  description?: string;
  areaSqm: number;
  bedrooms?: number;
  bathrooms?: number;
  price: number;
  livingRooms?: number;
  kitchens?: number;
  balconies?: number;
  status?: ApartmentStatus;
  isModelUnit?: boolean;
  isPublished?: boolean;
  virtualTourUrl?: string;
}

/**
 * @openapi
 * Data transfer object for updating an existing apartment
 * All fields are optional - only provided fields will be updated
 *
 * @interface UpdateApartmentDto
 * @extends Partial<CreateApartmentDto>
 */
export interface UpdateApartmentDto extends Partial<CreateApartmentDto> {}

/**
 * @openapi
 * Extended query options for apartment-specific filtering
 *
 * @interface ApartmentQueryOptions
 * @extends AdvancedQueryOptions
 * @property {number|number[]} projectId - Filter by project ID(s)
 * @property {ApartmentStatus|ApartmentStatus[]} status - Filter by status
 * @property {boolean} isModelUnit - Filter by model unit status
 * @property {boolean} isPublished - Filter by published status
 * @property {number} minPrice - Minimum price filter
 * @property {number} maxPrice - Maximum price filter
 * @property {number|number[]} bedrooms - Filter by bedroom count
 * @property {number} minBedrooms - Minimum bedroom count
 * @property {number} maxBedrooms - Maximum bedroom count
 * @property {number|number[]} bathrooms - Filter by bathroom count
 * @property {number} minArea - Minimum area filter (sqm)
 * @property {number} maxArea - Maximum area filter (sqm)
 * @property {number|number[]} floorNumber - Filter by floor number
 * @property {number} minFloor - Minimum floor number
 * @property {number} maxFloor - Maximum floor number
 * @property {boolean} hasVirtualTour - Filter apartments with virtual tours
 * @property {boolean} includePhotos - Include associated photos
 * @property {boolean} includeFloorPlans - Include associated floor plans
 */
export interface ApartmentQueryOptions extends AdvancedQueryOptions {
  projectId?: number | number[];
  status?: ApartmentStatus | ApartmentStatus[];
  isModelUnit?: boolean;
  isPublished?: boolean;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number | number[];
  minBedrooms?: number;
  maxBedrooms?: number;
  bathrooms?: number | number[];
  minArea?: number;
  maxArea?: number;
  floorNumber?: number | number[];
  minFloor?: number;
  maxFloor?: number;
  hasVirtualTour?: boolean;

  includePhotos?: boolean;
  includeFloorPlans?: boolean;
}

/**
 * @openapi
 * Apartment entity with additional statistics for analytics
 *
 * @interface ApartmentWithStats
 * @extends Apartment
 * @property {object} stats - Statistics object
 * @property {number} stats.viewCount - Total number of views
 * @property {number} stats.inquiryCount - Number of inquiries received
 * @property {number} stats.favoriteCount - Number of times added to favorites
 * @property {Date|null} stats.lastViewedAt - Timestamp of last view
 */
export interface ApartmentWithStats extends Apartment {
  stats: {
    viewCount: number;
    inquiryCount: number;
    favoriteCount: number;
    lastViewedAt: Date | null;
  };
}

/**
 * @openapi
 * Summary of apartment availability for a project
 *
 * @interface ApartmentAvailabilitySummary
 * @property {number} total - Total number of apartments
 * @property {number} available - Number of available apartments
 * @property {number} reserved - Number of reserved apartments
 * @property {number} sold - Number of sold apartments
 * @property {number} availabilityRate - Percentage of available units (0-100)
 * @property {number} soldRate - Percentage of sold units (0-100)
 */
export interface ApartmentAvailabilitySummary {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  availabilityRate: number;
  soldRate: number;
}

// ============================================================================
// APARTMENT MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Apartment Model Class
 *
 * Manages apartment entities with comprehensive CRUD operations, advanced filtering,
 * media management, and project-level analytics.
 *
 * @class ApartmentModel
 * @extends BaseModel<Apartment, CreateApartmentDto, UpdateApartmentDto>
 *
 * @example
 * ```typescript
 * // Create a new apartment
 * const apartment = await apartmentModel.create({
 *   projectId: 5,
 *   name: "Luxury 3-Bedroom Suite",
 *   unitNumber: "12A",
 *   floorNumber: 12,
 *   areaSqm: 120.5,
 *   bedrooms: 3,
 *   bathrooms: 2,
 *   price: 850000,
 *   status: ApartmentStatus.AVAILABLE,
 *   isPublished: true
 * });
 *
 * // Find available apartments in a project
 * const availableApartments = await apartmentModel.findAvailable(5, {
 *   minPrice: 500000,
 *   maxPrice: 1000000,
 *   includePhotos: true
 * });
 *
 * // Get project availability summary
 * const summary = await apartmentModel.getAvailabilitySummary(5);
 * console.log(`Availability rate: ${summary.availabilityRate}%`);
 * ```
 */
export class ApartmentModel extends BaseModel<
  Apartment,
  CreateApartmentDto,
  UpdateApartmentDto
> {
  protected tableName = "apartments";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "unit_number",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["name", "unit_number", "title", "description"],
    hiddenFields: [],
    fillable: [
      "projectId",
      "name",
      "unitNumber",
      "floorNumber",
      "title",
      "subtitle",
      "description",
      "areaSqm",
      "bedrooms",
      "bathrooms",
      "price",
      "livingRooms",
      "kitchens",
      "balconies",
      "status",
      "isModelUnit",
      "isPublished",
      "virtualTourUrl",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // Define relations
  protected relations = {
    project: {
      type: "belongsTo" as const,
      model: () => require("./project.model").default,
      foreignKey: "projectId",
      localKey: "id",
    },
  };

  // ============================================================================
  // MEDIA LOADING METHODS
  // ============================================================================

  /**
   * @openapi
   * Loads photos for a specific apartment
   *
   * @param {number} apartmentId - The apartment ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos associated with the apartment
   *
   * @example
   * ```typescript
   * const photos = await apartmentModel.loadPhotos(123);
   * console.log(`Found ${photos.length} photos`);
   * ```
   */
  async loadPhotos(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(
      PhotoableType.APARTMENT,
      apartmentId,
      {},
      trx
    );
  }

  /**
   * @openapi
   * Loads floor plans for a specific apartment
   *
   * @param {number} apartmentId - The apartment ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan[]>} Array of floor plans associated with the apartment
   *
   * @example
   * ```typescript
   * const floorPlans = await apartmentModel.loadFloorPlans(123);
   * console.log(`Found ${floorPlans.length} floor plans`);
   * ```
   */
  async loadFloorPlans(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    return FloorPlanModel.getForEntity(
      PlannableType.APARTMENT,
      apartmentId,
      {},
      trx
    );
  }

  /**
   * @openapi
   * Loads both photos and floor plans for an apartment
   *
   * @param {number} apartmentId - The apartment ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Object containing photos and floor plans
   * @property {Photo[]} photos - Array of photos
   * @property {FloorPlan[]} floorPlans - Array of floor plans
   *
   * @example
   * ```typescript
   * const media = await apartmentModel.loadMedia(123);
   * console.log(`Photos: ${media.photos.length}, Floor Plans: ${media.floorPlans.length}`);
   * ```
   */
  async loadMedia(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<{ photos: Photo[]; floorPlans: FloorPlan[] }> {
    const [photos, floorPlans] = await Promise.all([
      this.loadPhotos(apartmentId, trx),
      this.loadFloorPlans(apartmentId, trx),
    ]);

    return { photos, floorPlans };
  }

  /**
   * @openapi
   * Loads photos for multiple apartments (optimized batch loading)
   *
   * @param {number[]} apartmentIds - Array of apartment IDs
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Map<number, Photo[]>>} Map of apartment ID to photos array
   *
   * @private
   * @example
   * ```typescript
   * const photosByApartment = await apartmentModel.loadPhotosForMany([1, 2, 3]);
   * const photosForApartment1 = photosByApartment.get(1);
   * ```
   */
  private async loadPhotosForMany(
    apartmentIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, Photo[]>> {
    if (apartmentIds.length === 0) return new Map();

    const photos = await PhotoModel.findPhotos(
      {
        polymorphicType: PhotoableType.APARTMENT,
        polymorphicId: apartmentIds,
      },
      trx
    );

    const photosByApartment = new Map<number, Photo[]>();
    for (const photo of photos) {
      if (!photosByApartment.has(photo.photoableId)) {
        photosByApartment.set(photo.photoableId, []);
      }
      photosByApartment.get(photo.photoableId)!.push(photo);
    }

    return photosByApartment;
  }

  /**
   * @openapi
   * Loads floor plans for multiple apartments (optimized batch loading)
   *
   * @param {number[]} apartmentIds - Array of apartment IDs
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Map<number, FloorPlan[]>>} Map of apartment ID to floor plans array
   *
   * @private
   * @example
   * ```typescript
   * const plansByApartment = await apartmentModel.loadFloorPlansForMany([1, 2, 3]);
   * const plansForApartment1 = plansByApartment.get(1);
   * ```
   */
  private async loadFloorPlansForMany(
    apartmentIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, FloorPlan[]>> {
    if (apartmentIds.length === 0) return new Map();

    const floorPlans = await FloorPlanModel.findFloorPlans(
      {
        polymorphicType: PlannableType.APARTMENT,
        polymorphicId: apartmentIds,
      },
      trx
    );

    const plansByApartment = new Map<number, FloorPlan[]>();
    for (const plan of floorPlans) {
      if (!plansByApartment.has(plan.plannableId)) {
        plansByApartment.set(plan.plannableId, []);
      }
      plansByApartment.get(plan.plannableId)!.push(plan);
    }

    return plansByApartment;
  }

  /**
   * @openapi
   * Finds apartment by ID with optional media loading
   *
   * @param {number} id - The apartment ID
   * @param {Object} [options] - Options for media loading
   * @param {boolean} [options.includePhotos=false] - Whether to include photos
   * @param {boolean} [options.includeFloorPlans=false] - Whether to include floor plans
   * @param {string[]} [options.includeRelations=[]] - Relations to load
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment|null>} Apartment with loaded media or null if not found
   *
   * @example
   * ```typescript
   * const apartment = await apartmentModel.findByIdWithMedia(123, {
   *   includePhotos: true,
   *   includeFloorPlans: true
   * });
   * if (apartment) {
   *   console.log(`Photos: ${apartment.photos?.length}`);
   *   console.log(`Floor Plans: ${apartment.floorPlans?.length}`);
   * }
   * ```
   */
  async findByIdWithMedia(
    id: number,
    options: {
      includePhotos?: boolean;
      includeFloorPlans?: boolean;
      includeRelations?: string[];
    } = {},
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    const apartment = await this.findById(
      id,
      { relations: options.includeRelations },
      trx
    );

    if (!apartment) return null;

    // Load media if requested
    if (options.includePhotos || options.includeFloorPlans) {
      const media = await this.loadMedia(id, trx);

      return {
        ...apartment,
        ...(options.includePhotos && { photos: media.photos }),
        ...(options.includeFloorPlans && { floorPlans: media.floorPlans }),
      };
    }

    return apartment;
  }

  /**
   * @openapi
   * Validates required media before publishing an apartment
   *
   * @param {number} apartmentId - The apartment ID to validate
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Validation result
   * @property {boolean} valid - Whether all media requirements are met
   * @property {string[]} errors - Array of validation error messages
   *
   * @example
   * ```typescript
   * const validation = await apartmentModel.validateMediaForPublishing(123);
   * if (!validation.valid) {
   *   console.log("Validation errors:", validation.errors);
   * }
   * ```
   */
  async validateMediaForPublishing(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for at least one photo
    const photoCount = await PhotoModel.countForEntity(
      PhotoableType.APARTMENT,
      apartmentId,
      trx
    );

    if (photoCount === 0) {
      errors.push("At least one photo is required");
    }

    // Check for cover photo
    const coverPhoto = await PhotoModel.getCoverPhoto(
      PhotoableType.APARTMENT,
      apartmentId,
      trx
    );

    if (!coverPhoto) {
      errors.push("Cover photo is required");
    }

    // Check for floor plan (optional but recommended)
    const floorPlanCount = await FloorPlanModel.countForEntity(
      PlannableType.APARTMENT,
      apartmentId,
      trx
    );

    if (floorPlanCount === 0) {
      // Warning only, not an error
      console.warn(`⚠️ Apartment ${apartmentId} has no floor plans`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * @openapi
   * Before create hook - validates apartment specifications and project existence
   *
   * @param {CreateApartmentDto} data - Apartment creation data
   * @returns {Promise<CreateApartmentDto>} Validated and processed data
   * @throws {Error} When validation fails
   *
   * @private
   * @lifecycle
   */
  protected async beforeCreate(
    data: CreateApartmentDto
  ): Promise<CreateApartmentDto> {
    // Validate project exists
    const project = await this.db("projects")
      .where("id", data.projectId)
      .whereNull("deleted_at")
      .first();

    if (!project) {
      throw new Error(`Project with ID ${data.projectId} not found`);
    }

    // Validate area
    if (data.areaSqm <= 0) {
      throw new Error("Area must be greater than 0");
    }

    // Validate price
    if (data.price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    // Validate counts are non-negative
    this.validateRoomCounts(data);

    // Set default status
    if (!data.status) {
      data.status = ApartmentStatus.AVAILABLE;
    }

    // Validate unit number uniqueness within project
    if (data.unitNumber) {
      const existing = await this.db(this.tableName)
        .where({
          project_id: data.projectId,
          unit_number: data.unitNumber,
        })
        .whereNull("deleted_at")
        .first();

      if (existing) {
        throw new Error(
          `Unit number "${data.unitNumber}" already exists in this project`
        );
      }
    }

    return data;
  }

  /**
   * @openapi
   * After create hook - logs apartment creation
   *
   * @param {Apartment} entity - Created apartment entity
   * @returns {Promise<void>}
   *
   * @private
   * @lifecycle
   */
  protected async afterCreate(entity: Apartment): Promise<void> {
    console.log(
      `✅ Apartment created: ${entity.name} (Project: ${entity.projectId}, Status: ${entity.status})`
    );
  }

  /**
   * @openapi
   * Before update hook - validates changes and media requirements for publishing
   *
   * @param {number} id - Apartment ID being updated
   * @param {UpdateApartmentDto} data - Update data
   * @returns {Promise<UpdateApartmentDto>} Validated update data
   * @throws {Error} When validation fails
   *
   * @private
   * @lifecycle
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateApartmentDto
  ): Promise<UpdateApartmentDto> {
    const apartment = await this.findById(id);
    if (!apartment) {
      throw new Error("Apartment not found");
    }

    // Validate area if provided
    if (data.areaSqm !== undefined && data.areaSqm <= 0) {
      throw new Error("Area must be greater than 0");
    }

    // Validate price if provided
    if (data.price !== undefined && data.price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    // Validate room counts
    this.validateRoomCounts(data);

    // Validate unit number uniqueness if changing
    if (data.unitNumber && data.unitNumber !== apartment.unitNumber) {
      const existing = await this.db(this.tableName)
        .where({
          project_id: apartment.projectId,
          unit_number: data.unitNumber,
        })
        .where("id", "!=", id)
        .whereNull("deleted_at")
        .first();

      if (existing) {
        throw new Error(
          `Unit number "${data.unitNumber}" already exists in this project`
        );
      }
    }

    // If changing project, validate new project exists
    if (data.projectId && data.projectId !== apartment.projectId) {
      const project = await this.db("projects")
        .where("id", data.projectId)
        .whereNull("deleted_at")
        .first();

      if (!project) {
        throw new Error(`Project with ID ${data.projectId} not found`);
      }
    }

    // If publishing, validate media
    if (data.isPublished && !apartment.isPublished) {
      const mediaValidation = await this.validateMediaForPublishing(id);
      if (!mediaValidation.valid) {
        throw new Error(
          `Cannot publish apartment: ${mediaValidation.errors.join(", ")}`
        );
      }
    }

    return data;
  }

  /**
   * @openapi
   * After update hook - logs apartment update
   *
   * @param {Apartment} entity - Updated apartment entity
   * @returns {Promise<void>}
   *
   * @private
   * @lifecycle
   */
  protected async afterUpdate(entity: Apartment): Promise<void> {
    console.log(`✅ Apartment updated: ${entity.name} (ID: ${entity.id})`);
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * @openapi
   * Finds apartments with custom filters and optional media loading
   *
   * @param {ApartmentQueryOptions} [options={}] - Query options for filtering and media loading
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment[]>} Array of apartments matching the criteria
   *
   * @example
   * ```typescript
   * // Find available apartments with photos
   * const apartments = await apartmentModel.findApartments({
   *   status: ApartmentStatus.AVAILABLE,
   *   minPrice: 500000,
   *   maxPrice: 1000000,
   *   includePhotos: true,
   *   sortBy: 'price',
   *   sortOrder: 'asc'
   * });
   * ```
   */
  async findApartments(
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply apartment-specific filters
    query = this.applyApartmentFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Load standard relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    // Load photos if requested
    if (options.includePhotos) {
      const apartmentIds = entities.map((e: DatabaseRecord) => e.id);
      const photosByApartment = await this.loadPhotosForMany(apartmentIds, trx);

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        photos: photosByApartment.get(entity.id) || [],
      }));
    }

    // Load floor plans if requested
    if (options.includeFloorPlans) {
      const apartmentIds = entities.map((e: DatabaseRecord) => e.id);
      const plansByApartment = await this.loadFloorPlansForMany(
        apartmentIds,
        trx
      );

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        floorPlans: plansByApartment.get(entity.id) || [],
      }));
    }

    return entities;
  }

  /**
   * @openapi
   * Gets paginated apartments with comprehensive filtering
   *
   * @param {ApartmentQueryOptions & {page: number, limit: number}} options - Query options with pagination
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<Apartment>>} Paginated result with apartments and metadata
   *
   * @example
   * ```typescript
   * const result = await apartmentModel.paginateApartments({
   *   page: 1,
   *   limit: 10,
   *   status: ApartmentStatus.AVAILABLE,
   *   projectId: 5,
   *   includePhotos: true
   * });
   * console.log(`Page ${result.pagination.page} of ${result.pagination.totalPages}`);
   * ```
   */
  async paginateApartments(
    options: ApartmentQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<Apartment>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findApartments(options, trx),
      this.countApartments(options, trx),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * @openapi
   * Counts apartments matching the specified filters
   *
   * @param {ApartmentQueryOptions} [options={}] - Query options for filtering
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of matching apartments
   *
   * @example
   * ```typescript
   * const count = await apartmentModel.countApartments({
   *   status: ApartmentStatus.AVAILABLE,
   *   projectId: 5,
   *   minPrice: 500000
   * });
   * console.log(`Found ${count} available apartments`);
   * ```
   */
  async countApartments(
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    query = this.applyApartmentFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * @openapi
   * Finds apartments by project ID
   *
   * @param {number} projectId - The project ID
   * @param {ApartmentQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment[]>} Array of apartments in the project
   *
   * @example
   * ```typescript
   * const projectApartments = await apartmentModel.findByProject(5, {
   *   status: ApartmentStatus.AVAILABLE,
   *   includePhotos: true
   * });
   * ```
   */
  async findByProject(
    projectId: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    return this.findApartments({ ...options, projectId }, trx);
  }

  /**
   * @openapi
   * Finds available apartments with optional project filter
   *
   * @param {number} [projectId] - Optional project ID filter
   * @param {ApartmentQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment[]>} Array of available and published apartments
   *
   * @example
   * ```typescript
   * // Find all available apartments
   * const available = await apartmentModel.findAvailable();
   *
   * // Find available apartments in specific project
   * const projectAvailable = await apartmentModel.findAvailable(5);
   * ```
   */
  async findAvailable(
    projectId?: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const queryOptions: ApartmentQueryOptions = {
      ...options,
      status: ApartmentStatus.AVAILABLE,
      isPublished: true,
    };

    if (projectId) {
      queryOptions.projectId = projectId;
    }

    return this.findApartments(queryOptions, trx);
  }

  /**
   * @openapi
   * Finds sold apartments with optional project filter
   *
   * @param {number} [projectId] - Optional project ID filter
   * @param {ApartmentQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment[]>} Array of sold apartments
   *
   * @example
   * ```typescript
   * const soldApartments = await apartmentModel.findSold(5);
   * ```
   */
  async findSold(
    projectId?: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const queryOptions: ApartmentQueryOptions = {
      ...options,
      status: ApartmentStatus.SOLD,
    };

    if (projectId) {
      queryOptions.projectId = projectId;
    }

    return this.findApartments(queryOptions, trx);
  }

  /**
   * @openapi
   * Finds reserved apartments with optional project filter
   *
   * @param {number} [projectId] - Optional project ID filter
   * @param {ApartmentQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment[]>} Array of reserved apartments
   *
   * @example
   * ```typescript
   * const reservedApartments = await apartmentModel.findReserved(5);
   * ```
   */
  async findReserved(
    projectId?: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const queryOptions: ApartmentQueryOptions = {
      ...options,
      status: ApartmentStatus.RESERVED,
    };

    if (projectId) {
      queryOptions.projectId = projectId;
    }

    return this.findApartments(queryOptions, trx);
  }

  /**
   * @openapi
   * Finds model units with optional project filter
   *
   * @param {number} [projectId] - Optional project ID filter
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment[]>} Array of published model units
   *
   * @example
   * ```typescript
   * const modelUnits = await apartmentModel.findModelUnits(5);
   * ```
   */
  async findModelUnits(
    projectId?: number,
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const options: ApartmentQueryOptions = {
      isModelUnit: true,
      isPublished: true,
    };

    if (projectId) {
      options.projectId = projectId;
    }

    return this.findApartments(options, trx);
  }

  /**
   * @openapi
   * Finds apartments on a specific floor in a project
   *
   * @param {number} projectId - The project ID
   * @param {number} floorNumber - The floor number
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment[]>} Array of apartments on the specified floor
   *
   * @example
   * ```typescript
   * const floor12Apartments = await apartmentModel.findByFloor(5, 12);
   * ```
   */
  async findByFloor(
    projectId: number,
    floorNumber: number,
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    return this.findApartments({ projectId, floorNumber }, trx);
  }

  /**
   * @openapi
   * Finds apartments by unit number with optional project filter
   *
   * @param {string} unitNumber - The unit number to search for
   * @param {number} [projectId] - Optional project ID filter
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment[]>} Array of apartments with matching unit number
   *
   * @example
   * ```typescript
   * const unit12A = await apartmentModel.findByUnitNumber("12A", 5);
   * ```
   */
  async findByUnitNumber(
    unitNumber: string,
    projectId?: number,
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const connection = trx || this.db;
    let query = connection(this.tableName)
      .where("unit_number", unitNumber)
      .whereNull("deleted_at");

    if (projectId) {
      query = query.where("project_id", projectId);
    }

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * @openapi
   * Updates apartment status
   *
   * @param {number} id - Apartment ID
   * @param {ApartmentStatus} status - New status
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment|null>} Updated apartment or null if not found
   *
   * @example
   * ```typescript
   * const updated = await apartmentModel.updateStatus(123, ApartmentStatus.RESERVED);
   * ```
   */
  async updateStatus(
    id: number,
    status: ApartmentStatus,
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    return this.update(id, { status }, trx);
  }

  /**
   * @openapi
   * Marks apartment as sold
   *
   * @param {number} id - Apartment ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment|null>} Updated apartment or null if not found
   *
   * @example
   * ```typescript
   * const sold = await apartmentModel.markAsSold(123);
   * ```
   */
  async markAsSold(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.SOLD, trx);
  }

  /**
   * @openapi
   * Marks apartment as reserved
   *
   * @param {number} id - Apartment ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment|null>} Updated apartment or null if not found
   *
   * @example
   * ```typescript
   * const reserved = await apartmentModel.markAsReserved(123);
   * ```
   */
  async markAsReserved(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.RESERVED, trx);
  }

  /**
   * @openapi
   * Marks apartment as available
   *
   * @param {number} id - Apartment ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Apartment|null>} Updated apartment or null if not found
   *
   * @example
   * ```typescript
   * const available = await apartmentModel.markAsAvailable(123);
   * ```
   */
  async markAsAvailable(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.AVAILABLE, trx);
  }

  /**
   * @openapi
   * Bulk status update for multiple apartments
   *
   * @param {number[]} ids - Array of apartment IDs to update
   * @param {ApartmentStatus} status - New status for all apartments
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Number of apartments updated
   *
   * @example
   * ```typescript
   * const updatedCount = await apartmentModel.bulkUpdateStatus(
   *   [1, 2, 3, 4, 5],
   *   ApartmentStatus.RESERVED
   * );
   * console.log(`Updated ${updatedCount} apartments`);
   * ```
   */
  async bulkUpdateStatus(
    ids: number[],
    status: ApartmentStatus,
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;

    const updated = await connection(this.tableName)
      .whereIn("id", ids)
      .whereNull("deleted_at")
      .update({
        status,
        updated_at: connection.fn.now(),
      });

    return updated;
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * @openapi
   * Gets availability summary for a project
   *
   * @param {number} projectId - The project ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<ApartmentAvailabilitySummary>} Availability summary with counts and rates
   *
   * @example
   * ```typescript
   * const summary = await apartmentModel.getAvailabilitySummary(5);
   * console.log(`Availability: ${summary.availabilityRate}%`);
   * console.log(`Sold: ${summary.soldRate}%`);
   * ```
   */
  async getAvailabilitySummary(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<ApartmentAvailabilitySummary> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw(
          "COUNT(CASE WHEN status = 'available' THEN 1 END) as available"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved"
        ),
        connection.raw("COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold")
      );

    const total = Number(stats.total);
    const available = Number(stats.available);
    const sold = Number(stats.sold);

    return {
      total,
      available,
      reserved: Number(stats.reserved),
      sold,
      availabilityRate: total > 0 ? (available / total) * 100 : 0,
      soldRate: total > 0 ? (sold / total) * 100 : 0,
    };
  }

  /**
   * @openapi
   * Gets comprehensive statistics for a project
   *
   * @param {number} projectId - The project ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Project statistics including counts, pricing, and area metrics
   *
   * @example
   * ```typescript
   * const stats = await apartmentModel.getProjectStatistics(5);
   * console.log(`Price range: $${stats.pricing.min} - $${stats.pricing.max}`);
   * console.log(`Average area: ${stats.area.avg} sqm`);
   * ```
   */
  async getProjectStatistics(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<any> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw(
          "COUNT(CASE WHEN status = 'available' THEN 1 END) as available"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved"
        ),
        connection.raw("COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold"),
        connection.raw(
          "COUNT(CASE WHEN is_published = true THEN 1 END) as published"
        ),
        connection.raw(
          "COUNT(CASE WHEN is_model_unit = true THEN 1 END) as modelUnits"
        ),
        connection.raw("MIN(price) as minPrice"),
        connection.raw("MAX(price) as maxPrice"),
        connection.raw("AVG(price) as avgPrice"),
        connection.raw("MIN(area_sqm) as minArea"),
        connection.raw("MAX(area_sqm) as maxArea"),
        connection.raw("AVG(area_sqm) as avgArea"),
        connection.raw("MIN(floor_number) as minFloor"),
        connection.raw("MAX(floor_number) as maxFloor")
      );

    return {
      total: Number(stats.total),
      available: Number(stats.available),
      reserved: Number(stats.reserved),
      sold: Number(stats.sold),
      published: Number(stats.published),
      modelUnits: Number(stats.modelUnits),
      pricing: {
        min: stats.minPrice ? Number(stats.minPrice) : null,
        max: stats.maxPrice ? Number(stats.maxPrice) : null,
        avg: stats.avgPrice ? Number(stats.avgPrice) : null,
      },
      area: {
        min: stats.minArea ? Number(stats.minArea) : null,
        max: stats.maxArea ? Number(stats.maxArea) : null,
        avg: stats.avgArea ? Number(stats.avgArea) : null,
      },
      floors: {
        min: stats.minFloor,
        max: stats.maxFloor,
      },
    };
  }

  /**
   * @openapi
   * Gets floor distribution for a project
   *
   * @param {number} projectId - The project ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object[]>} Array of floor distribution objects
   *
   * @example
   * ```typescript
   * const floorDist = await apartmentModel.getFloorDistribution(5);
   * floorDist.forEach(floor => {
   *   console.log(`Floor ${floor.floor_number}: ${floor.count} apartments`);
   * });
   * ```
   */
  async getFloorDistribution(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select("floor_number")
      .count("* as count")
      .groupBy("floor_number")
      .orderBy("floor_number", "asc");
  }

  /**
   * @openapi
   * Gets bedroom distribution for a project
   *
   * @param {number} projectId - The project ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object[]>} Array of bedroom distribution objects
   *
   * @example
   * ```typescript
   * const bedroomDist = await apartmentModel.getBedroomDistribution(5);
   * bedroomDist.forEach(dist => {
   *   console.log(`${dist.bedrooms || 'Studio'} bedrooms: ${dist.count} apartments`);
   * });
   * ```
   */
  async getBedroomDistribution(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select("bedrooms")
      .count("* as count")
      .groupBy("bedrooms")
      .orderBy("bedrooms", "asc");
  }

  /**
   * @openapi
   * Gets price distribution for a project in buckets
   *
   * @param {number} projectId - The project ID
   * @param {number} [bucketCount=5] - Number of price buckets to create
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object[]>} Array of price distribution objects
   *
   * @example
   * ```typescript
   * const priceDist = await apartmentModel.getPriceDistribution(5, 5);
   * priceDist.forEach(bucket => {
   *   console.log(`${bucket.range}: ${bucket.count} apartments`);
   * });
   * ```
   */
  async getPriceDistribution(
    projectId: number,
    bucketCount: number = 5,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    // Get price range
    const [range] = await connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select(
        connection.raw("MIN(price) as minPrice"),
        connection.raw("MAX(price) as maxPrice")
      );

    if (!range.minPrice || !range.maxPrice) return [];

    const minPrice = Number(range.minPrice);
    const maxPrice = Number(range.maxPrice);
    const bucketSize = (maxPrice - minPrice) / bucketCount;

    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = minPrice + i * bucketSize;
      const bucketMax =
        i === bucketCount - 1 ? maxPrice : bucketMin + bucketSize;

      const [count] = await connection(this.tableName)
        .where("project_id", projectId)
        .whereNull("deleted_at")
        .whereBetween("price", [bucketMin, bucketMax])
        .count("* as count");

      buckets.push({
        range: `$${bucketMin.toLocaleString()} - $${bucketMax.toLocaleString()}`,
        count: Number(count.count),
        minPrice: bucketMin,
        maxPrice: bucketMax,
      });
    }

    return buckets;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

    /**
   * @openapi
   * Validates room counts to ensure they are non-negative
   *
   * @param {CreateApartmentDto|UpdateApartmentDto} data - Apartment data to validate
   * @throws {Error} When any room count is negative
   *
   * @private
   */
  private validateRoomCounts(data: Partial<CreateApartmentDto>): void {
    const fields = [
      "bedrooms",
      "bathrooms",
      "livingRooms",
      "kitchens",
      "balconies",
    ];

    for (const field of fields) {
      const value = (data as any)[field];
      if (value !== undefined && value !== null && value < 0) {
        throw new Error(`${field} cannot be negative`);
      }
    }

    // Validate floor number allows basements
    if (
      data.floorNumber !== undefined &&
      data.floorNumber !== null &&
      data.floorNumber < -5
    ) {
      throw new Error("Floor number cannot be less than -5 (basement levels)");
    }
  }
  
  /**
   * @openapi
   * Applies apartment-specific filters to a query
   *
   * @param {Knex.QueryBuilder} query - The query builder to modify
   * @param {ApartmentQueryOptions} options - Apartment query options
   * @returns {Knex.QueryBuilder} Modified query builder with filters applied
   *
   * @private
   */
  private applyApartmentFilters(
    query: Knex.QueryBuilder,
    options: ApartmentQueryOptions
  ): Knex.QueryBuilder {
    // Project filter
    if (options.projectId) {
      if (Array.isArray(options.projectId)) {
        query = query.whereIn("project_id", options.projectId);
      } else {
        query = query.where("project_id", options.projectId);
      }
    }

    // Status filter
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.whereIn("status", options.status);
      } else {
        query = query.where("status", options.status);
      }
    }

    // Model unit filter
    if (options.isModelUnit !== undefined) {
      query = query.where("is_model_unit", options.isModelUnit);
    }

    // Published filter
    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    // Price range filters
    if (options.minPrice !== undefined) {
      query = query.where("price", ">=", options.minPrice);
    }
    if (options.maxPrice !== undefined) {
      query = query.where("price", "<=", options.maxPrice);
    }

    // Bedroom filters
    if (options.bedrooms !== undefined) {
      if (Array.isArray(options.bedrooms)) {
        query = query.whereIn("bedrooms", options.bedrooms);
      } else {
        query = query.where("bedrooms", options.bedrooms);
      }
    }
    if (options.minBedrooms !== undefined) {
      query = query.where("bedrooms", ">=", options.minBedrooms);
    }
    if (options.maxBedrooms !== undefined) {
      query = query.where("bedrooms", "<=", options.maxBedrooms);
    }

    // Bathroom filters
    if (options.bathrooms !== undefined) {
      if (Array.isArray(options.bathrooms)) {
        query = query.whereIn("bathrooms", options.bathrooms);
      } else {
        query = query.where("bathrooms", options.bathrooms);
      }
    }

    // Area range filters
    if (options.minArea !== undefined) {
      query = query.where("area_sqm", ">=", options.minArea);
    }
    if (options.maxArea !== undefined) {
      query = query.where("area_sqm", "<=", options.maxArea);
    }

    // Floor number filters
    if (options.floorNumber !== undefined) {
      if (Array.isArray(options.floorNumber)) {
        query = query.whereIn("floor_number", options.floorNumber);
      } else {
        query = query.where("floor_number", options.floorNumber);
      }
    }
    if (options.minFloor !== undefined) {
      query = query.where("floor_number", ">=", options.minFloor);
    }
    if (options.maxFloor !== undefined) {
      query = query.where("floor_number", "<=", options.maxFloor);
    }

    // Virtual tour filter
    if (options.hasVirtualTour !== undefined) {
      if (options.hasVirtualTour) {
        query = query.whereNotNull("virtual_tour_url");
      } else {
        query = query.whereNull("virtual_tour_url");
      }
    }

    return query;
  }

  /**
   * @openapi
   * Maps database record to Apartment entity
   *
   * @param {DatabaseRecord} record - Database record
   * @returns {Apartment} Mapped apartment entity
   *
   * @override
   * @protected
   */
  protected mapToEntity(record: DatabaseRecord): Apartment {
    return {
      id: record.id,
      projectId: record.project_id,
      name: record.name,
      unitNumber: record.unit_number,
      floorNumber: record.floor_number,
      title: record.title,
      subtitle: record.subtitle,
      description: record.description,
      areaSqm: Number(record.area_sqm),
      bedrooms: record.bedrooms,
      bathrooms: record.bathrooms,
      price: Number(record.price),
      livingRooms: record.living_rooms,
      kitchens: record.kitchens,
      balconies: record.balconies,
      status: record.status as ApartmentStatus,
      isModelUnit: Boolean(record.is_model_unit),
      isPublished: Boolean(record.is_published),
      virtualTourUrl: record.virtual_tour_url,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// Export singleton instance
export default new ApartmentModel();
