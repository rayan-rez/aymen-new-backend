/**
 * Event Model
 *
 * Comprehensive event management system for company events, exhibitions,
 * open houses, and promotional activities with registration tracking,
 * capacity management, and influencer associations
 *
 * @module models/event.model
 * @description Manages all types of company events with advanced scheduling,
 * location management, registration workflows, and comprehensive analytics
 *
 * @swagger
 * components:
 *   schemas:
 *     EventType:
 *       type: string
 *       enum: [exhibition, open_house, workshop, seminar, launch_event, trade_show, webinar, other]
 *       description: Type of company event
 *       example: "exhibition"
 *       x-enum-descriptions:
 *         exhibition: Property or product exhibition
 *         open_house: Property viewing event
 *         workshop: Educational workshop
 *         seminar: Educational seminar
 *         launch_event: Product or service launch
 *         trade_show: Trade show participation
 *         webinar: Online educational event
 *         other: Other event type
 *
 *     EventsLocationType:
 *       type: string
 *       enum: [physical, online, hybrid]
 *       description: Event location type
 *       example: "hybrid"
 *       x-enum-descriptions:
 *         physical: In-person event only
 *         online: Virtual event only
 *         hybrid: Both in-person and virtual
 *
 *     EventStatus:
 *       type: string
 *       enum: [draft, scheduled, ongoing, completed, cancelled, postponed]
 *       description: Event status in lifecycle
 *       example: "scheduled"
 *       x-enum-descriptions:
 *         draft: Event in draft state
 *         scheduled: Event scheduled and published
 *         ongoing: Event currently happening
 *         completed: Event completed successfully
 *         cancelled: Event cancelled
 *         postponed: Event postponed to later date
 *
 *     Event:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - slug
 *         - eventType
 *         - description
 *         - startDate
 *         - endDate
 *         - timezone
 *         - locationType
 *         - status
 *         - isFeatured
 *         - isPublished
 *         - viewCount
 *         - clickCount
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique event identifier
 *           example: 1
 *         name:
 *           type: string
 *           description: Event name/title
 *           example: "Luxury Apartments Open House"
 *         slug:
 *           type: string
 *           description: URL-friendly slug
 *           example: "luxury-apartments-open-house"
 *         eventType:
 *           $ref: '#/components/schemas/EventType'
 *         description:
 *           type: string
 *           description: Detailed event description
 *           example: "Join us for an exclusive open house event showcasing our latest luxury apartment developments..."
 *         shortDescription:
 *           type: string
 *           nullable: true
 *           description: Brief event description for listings
 *           example: "Exclusive open house for luxury apartments"
 *         translations:
 *           type: object
 *           additionalProperties: true
 *           nullable: true
 *           description: Multi-language translations
 *           example: {"fr": {"name": "Portes Ouvertes", "description": "..."}}
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Event start date and time
 *           example: "2024-03-15T09:00:00Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Event end date and time
 *           example: "2024-03-15T18:00:00Z"
 *         timezone:
 *           type: string
 *           description: Event timezone
 *           example: "Africa/Algiers"
 *         locationType:
 *           $ref: '#/components/schemas/EventsLocationType'
 *         venueName:
 *           type: string
 *           nullable: true
 *           description: Venue name for physical events
 *           example: "Grand Hotel Conference Center"
 *         venueAddress:
 *           type: string
 *           nullable: true
 *           description: Full venue address
 *           example: "123 Main Street, Downtown District"
 *         latitude:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Venue latitude
 *           example: 36.7783
 *         longitude:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Venue longitude
 *           example: 3.0588
 *         locationId:
 *           type: integer
 *           nullable: true
 *           description: Associated location ID
 *           example: 15
 *         onlineMeetingUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Online meeting URL
 *           example: "https://meet.example.com/event-123"
 *         onlineMeetingPlatform:
 *           type: string
 *           nullable: true
 *           description: Online meeting platform name
 *           example: "Zoom"
 *         maxCapacity:
 *           type: integer
 *           nullable: true
 *           description: Maximum attendee capacity
 *           example: 100
 *         registeredCount:
 *           type: integer
 *           description: Current registration count
 *           example: 45
 *         requiresRegistration:
 *           type: boolean
 *           description: Whether registration is required
 *           example: true
 *         isRegistrationOpen:
 *           type: boolean
 *           description: Whether registration is currently open
 *           example: true
 *         registrationDeadline:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Registration deadline
 *           example: "2024-03-10T23:59:59Z"
 *         projectId:
 *           type: integer
 *           nullable: true
 *           description: Associated project ID
 *           example: 5
 *         status:
 *           $ref: '#/components/schemas/EventStatus'
 *         featuredImageUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Featured event image URL
 *           example: "https://cdn.example.com/images/events/featured.jpg"
 *         bannerImageUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Event banner image URL
 *           example: "https://cdn.example.com/images/events/banner.jpg"
 *         organizerName:
 *           type: string
 *           nullable: true
 *           description: Event organizer name
 *           example: "Jane Smith"
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: Organizer contact email
 *           example: "events@company.com"
 *         organizerPhone:
 *           type: string
 *           nullable: true
 *           description: Organizer contact phone
 *           example: "+33612345678"
 *         isFeatured:
 *           type: boolean
 *           description: Whether event is featured
 *           example: false
 *         isPublished:
 *           type: boolean
 *           description: Whether event is published and visible
 *           example: true
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Publication timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         metaTitle:
 *           type: string
 *           nullable: true
 *           description: SEO meta title
 *           example: "Luxury Apartments Open House | Exclusive Event"
 *         metaDescription:
 *           type: string
 *           nullable: true
 *           description: SEO meta description
 *           example: "Join us for an exclusive open house event showcasing luxury apartments..."
 *         viewCount:
 *           type: integer
 *           description: Total number of views
 *           example: 1250
 *         clickCount:
 *           type: integer
 *           description: Total number of clicks
 *           example: 85
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-10T09:15:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Deletion timestamp (soft delete)
 *           example: null
 *         location:
 *           $ref: '#/components/schemas/Location'
 *         project:
 *           $ref: '#/components/schemas/Project'
 *         registrations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EventRegistration'
 *           description: Associated event registrations
 *         influencers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EventInfluencer'
 *           description: Associated event influencers
 *
 *     CreateEventDto:
 *       type: object
 *       required:
 *         - name
 *         - eventType
 *         - description
 *         - startDate
 *         - endDate
 *         - locationType
 *       properties:
 *         name:
 *           type: string
 *           description: Event name/title
 *           example: "Luxury Apartments Open House"
 *         slug:
 *           type: string
 *           description: URL-friendly slug (auto-generated if not provided)
 *           example: "luxury-apartments-open-house"
 *         eventType:
 *           $ref: '#/components/schemas/EventType'
 *         description:
 *           type: string
 *           description: Detailed event description
 *           example: "Join us for an exclusive open house event showcasing our latest luxury apartment developments..."
 *         shortDescription:
 *           type: string
 *           description: Brief event description for listings
 *           example: "Exclusive open house for luxury apartments"
 *         translations:
 *           type: object
 *           additionalProperties: true
 *           description: Multi-language translations
 *           example: {"fr": {"name": "Portes Ouvertes", "description": "..."}}
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Event start date and time
 *           example: "2024-03-15T09:00:00Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Event end date and time
 *           example: "2024-03-15T18:00:00Z"
 *         timezone:
 *           type: string
 *           description: Event timezone (defaults to Africa/Algiers)
 *           example: "Africa/Algiers"
 *         locationType:
 *           $ref: '#/components/schemas/EventsLocationType'
 *         venueName:
 *           type: string
 *           description: Venue name for physical events
 *           example: "Grand Hotel Conference Center"
 *         venueAddress:
 *           type: string
 *           description: Full venue address
 *           example: "123 Main Street, Downtown District"
 *         latitude:
 *           type: number
 *           format: float
 *           description: Venue latitude
 *           example: 36.7783
 *         longitude:
 *           type: number
 *           format: float
 *           description: Venue longitude
 *           example: 3.0588
 *         locationId:
 *           type: integer
 *           description: Associated location ID
 *           example: 15
 *         onlineMeetingUrl:
 *           type: string
 *           format: uri
 *           description: Online meeting URL
 *           example: "https://meet.example.com/event-123"
 *         onlineMeetingPlatform:
 *           type: string
 *           description: Online meeting platform name
 *           example: "Zoom"
 *         maxCapacity:
 *           type: integer
 *           description: Maximum attendee capacity
 *           example: 100
 *         requiresRegistration:
 *           type: boolean
 *           description: Whether registration is required
 *           example: true
 *         isRegistrationOpen:
 *           type: boolean
 *           description: Whether registration is initially open
 *           example: false
 *         registrationDeadline:
 *           type: string
 *           format: date-time
 *           description: Registration deadline
 *           example: "2024-03-10T23:59:59Z"
 *         projectId:
 *           type: integer
 *           description: Associated project ID
 *           example: 5
 *         status:
 *           $ref: '#/components/schemas/EventStatus'
 *         featuredImageUrl:
 *           type: string
 *           format: uri
 *           description: Featured event image URL
 *           example: "https://cdn.example.com/images/events/featured.jpg"
 *         bannerImageUrl:
 *           type: string
 *           format: uri
 *           description: Event banner image URL
 *           example: "https://cdn.example.com/images/events/banner.jpg"
 *         organizerName:
 *           type: string
 *           description: Event organizer name
 *           example: "Jane Smith"
 *         email:
 *           type: string
 *           format: email
 *           description: Organizer contact email
 *           example: "events@company.com"
 *         organizerPhone:
 *           type: string
 *           description: Organizer contact phone
 *           example: "+33612345678"
 *         isFeatured:
 *           type: boolean
 *           description: Whether to feature the event
 *           example: false
 *         isPublished:
 *           type: boolean
 *           description: Whether to publish immediately
 *           example: false
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Custom publication timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         metaTitle:
 *           type: string
 *           description: SEO meta title
 *           example: "Luxury Apartments Open House | Exclusive Event"
 *         metaDescription:
 *           type: string
 *           description: SEO meta description
 *           example: "Join us for an exclusive open house event showcasing luxury apartments..."
 *
 *     UpdateEventDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateEventDto'
 *         - type: object
 *           description: All fields from CreateEventDto are optional for updates
 *
 *     EventQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             eventType:
 *               oneOf:
 *                 - $ref: '#/components/schemas/EventType'
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventType'
 *             status:
 *               oneOf:
 *                 - $ref: '#/components/schemas/EventStatus'
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventStatus'
 *             locationType:
 *               oneOf:
 *                 - $ref: '#/components/schemas/EventsLocationType'
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventsLocationType'
 *             isFeatured:
 *               type: boolean
 *               description: Filter by featured status
 *               example: false
 *             isPublished:
 *               type: boolean
 *               description: Filter by published status
 *               example: true
 *             locationId:
 *               oneOf:
 *                 - type: integer
 *                   description: Single location ID
 *                   example: 15
 *                 - type: array
 *                   items:
 *                     type: integer
 *                   description: Multiple location IDs
 *                   example: [15, 16, 17]
 *             projectId:
 *               oneOf:
 *                 - type: integer
 *                   description: Single project ID
 *                   example: 5
 *                 - type: array
 *                   items:
 *                     type: integer
 *                   description: Multiple project IDs
 *                   example: [5, 6, 7]
 *             startDateFrom:
 *               type: string
 *               format: date-time
 *               description: Filter events starting after this date
 *               example: "2024-01-01T00:00:00Z"
 *             startDateTo:
 *               type: string
 *               format: date-time
 *               description: Filter events starting before this date
 *               example: "2024-12-31T23:59:59Z"
 *             endDateFrom:
 *               type: string
 *               format: date-time
 *               description: Filter events ending after this date
 *               example: "2024-01-01T00:00:00Z"
 *             endDateTo:
 *               type: string
 *               format: date-time
 *               description: Filter events ending before this date
 *               example: "2024-12-31T23:59:59Z"
 *             isRegistrationOpen:
 *               type: boolean
 *               description: Filter by registration open status
 *               example: true
 *             hasCapacity:
 *               type: boolean
 *               description: Filter events with available capacity
 *               example: true
 *             isUpcoming:
 *               type: boolean
 *               description: Filter upcoming events only
 *               example: true
 *             isPast:
 *               type: boolean
 *               description: Filter past events only
 *               example: false
 *
 *     EventWithStats:
 *       allOf:
 *         - $ref: '#/components/schemas/Event'
 *         - type: object
 *           required:
 *             - stats
 *           properties:
 *             stats:
 *               type: object
 *               required:
 *                 - totalRegistrations
 *                 - confirmedRegistrations
 *                 - attendedCount
 *                 - noShowCount
 *                 - attendanceRate
 *                 - capacityPercentage
 *                 - influencerCount
 *                 - totalReach
 *               properties:
 *                 totalRegistrations:
 *                   type: integer
 *                   description: Total number of registrations
 *                   example: 150
 *                 confirmedRegistrations:
 *                   type: integer
 *                   description: Number of confirmed registrations
 *                   example: 120
 *                 attendedCount:
 *                   type: integer
 *                   description: Number of attendees who showed up
 *                   example: 95
 *                 noShowCount:
 *                   type: integer
 *                   description: Number of no-shows
 *                   example: 25
 *                 attendanceRate:
 *                   type: number
 *                   format: float
 *                   description: Attendance rate percentage
 *                   example: 79.17
 *                 capacityPercentage:
 *                   type: number
 *                   format: float
 *                   description: Capacity utilization percentage
 *                   example: 95.0
 *                 influencerCount:
 *                   type: integer
 *                   description: Number of associated influencers
 *                   example: 5
 *                 totalReach:
 *                   type: integer
 *                   description: Total influencer reach
 *                   example: 50000
 *
 *   responses:
 *     EventResponse:
 *       description: Event data response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *
 *     EventListResponse:
 *       description: Paginated event list response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaginatedResult'
 *           example:
 *             items:
 *               - id: 1
 *                 name: "Luxury Apartments Open House"
 *                 slug: "luxury-apartments-open-house"
 *                 eventType: "open_house"
 *                 status: "scheduled"
 *                 startDate: "2024-03-15T09:00:00Z"
 *                 isPublished: true
 *             pagination:
 *               total: 25
 *               page: 1
 *               limit: 10
 *               totalPages: 3
 *               hasNextPage: true
 *               hasPrevPage: false
 *
 *     EventWithStatsResponse:
 *       description: Event with statistics response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventWithStats'
 *
 *   parameters:
 *     EventIdParam:
 *       name: id
 *       in: path
 *       description: Event ID
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 1
 *
 *     EventSlugParam:
 *       name: slug
 *       in: path
 *       description: Event slug
 *       required: true
 *       schema:
 *         type: string
 *       example: "luxury-apartments-open-house"
 *
 *     EventTypeParam:
 *       name: eventType
 *       in: query
 *       description: Filter by event type
 *       required: false
 *       schema:
 *         $ref: '#/components/schemas/EventType'
 *
 *     EventStatusParam:
 *       name: status
 *       in: query
 *       description: Filter by event status
 *       required: false
 *       schema:
 *         $ref: '#/components/schemas/EventStatus'
 *
 *     LocationTypeParam:
 *       name: locationType
 *       in: query
 *       description: Filter by location type
 *       required: false
 *       schema:
 *         $ref: '#/components/schemas/EventsLocationType'
 *
 *     StartDateFromParam:
 *       name: startDateFrom
 *       in: query
 *       description: Filter events starting after this date
 *       required: false
 *       schema:
 *         type: string
 *         format: date-time
 *       example: "2024-01-01T00:00:00Z"
 *
 *     StartDateToParam:
 *       name: startDateTo
 *       in: query
 *       description: Filter events starting before this date
 *       required: false
 *       schema:
 *         type: string
 *         format: date-time
 *       example: "2024-12-31T23:59:59Z"
 *
 *     EndDateFromParam:
 *       name: endDateFrom
 *       in: query
 *       description: Filter events ending after this date
 *       required: false
 *       schema:
 *         type: string
 *         format: date-time
 *       example: "2024-01-01T00:00:00Z"
 *
 *     EndDateToParam:
 *       name: endDateTo
 *       in: query
 *       description: Filter events ending before this date
 *       required: false
 *       schema:
 *         type: string
 *         format: date-time
 *       example: "2024-12-31T23:59:59Z"
 *
 *     IsRegistrationOpenParam:
 *       name: isRegistrationOpen
 *       in: query
 *       description: Filter by registration open status
 *       required: false
 *       schema:
 *         type: boolean
 *         example: true
 *
 *     HasCapacityParam:
 *       name: hasCapacity
 *       in: query
 *       description: Filter events with available capacity
 *       required: false
 *       schema:
 *         type: boolean
 *         example: true
 *
 *     IsUpcomingParam:
 *       name: isUpcoming
 *       in: query
 *       description: Filter upcoming events only
 *       required: false
 *       schema:
 *         type: boolean
 *         example: true
 *
 *     IsPastParam:
 *       name: isPast
 *       in: query
 *       description: Filter past events only
 *       required: false
 *       schema:
 *         type: boolean
 *         example: false
 *
 * tags:
 *   - name: Events
 *     description: Event management operations including scheduling, registration, and analytics
 *     x-traitTag: true
 *
 * Features:
 * - Comprehensive event lifecycle management (draft → scheduled → ongoing → completed)
 * - Multi-location support (physical, online, hybrid)
 * - Advanced scheduling with timezone support
 * - Registration management with capacity tracking
 * - Influencer association and reach tracking
 * - Real-time statistics and analytics
 * - SEO optimization with meta tags
 * - Multi-language translation support
 * - Automatic registration count updates via triggers
 * - Geographic coordinate validation
 * - Capacity management and availability tracking
 * - Event status workflow management
 * - Comprehensive filtering and search
 * - View and click tracking
 * - Featured event system
 * - Publishing workflow with validation
 * - Integration with projects and locations
 * - Registration deadline management
 * - Attendance tracking and no-show management
 * - Event statistics and performance metrics
 * - Bulk operations support
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import { generateSlug } from "@/database/helpers";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * Event type enumeration for categorizing company events
 */
export enum EventType {
  EXHIBITION = "exhibition",
  OPEN_HOUSE = "open_house",
  WORKSHOP = "workshop",
  SEMINAR = "seminar",
  LAUNCH_EVENT = "launch_event",
  TRADE_SHOW = "trade_show",
  WEBINAR = "webinar",
  OTHER = "other",
}

/**
 * @openapi
 * Event location type enumeration
 */
export enum EventsLocationType {
  PHYSICAL = "physical",
  ONLINE = "online",
  HYBRID = "hybrid",
}

/**
 * @openapi
 * Event status enumeration for lifecycle management
 */
export enum EventStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  POSTPONED = "postponed",
}

/**
 * @openapi
 * Event entity representing company events and activities
 *
 * @interface Event
 * @property {number} id - Unique event identifier
 * @property {string} name - Event name/title
 * @property {string} slug - URL-friendly slug
 * @property {EventType} eventType - Type of event
 * @property {string} description - Detailed event description
 * @property {string|null} shortDescription - Brief event description for listings
 * @property {Record<string,any>|null} translations - Multi-language translations
 * @property {Date} startDate - Event start date and time
 * @property {Date} endDate - Event end date and time
 * @property {string} timezone - Event timezone
 * @property {EventsLocationType} locationType - Event location type
 * @property {string|null} venueName - Venue name for physical events
 * @property {string|null} venueAddress - Full venue address
 * @property {number|null} latitude - Venue latitude
 * @property {number|null} longitude - Venue longitude
 * @property {number|null} locationId - Associated location ID
 * @property {string|null} onlineMeetingUrl - Online meeting URL
 * @property {string|null} onlineMeetingPlatform - Online meeting platform name
 * @property {number|null} maxCapacity - Maximum attendee capacity
 * @property {number} registeredCount - Current registration count
 * @property {boolean} requiresRegistration - Whether registration is required
 * @property {boolean} isRegistrationOpen - Whether registration is currently open
 * @property {Date|null} registrationDeadline - Registration deadline
 * @property {number|null} projectId - Associated project ID
 * @property {EventStatus} status - Event status
 * @property {string|null} featuredImageUrl - Featured event image URL
 * @property {string|null} bannerImageUrl - Event banner image URL
 * @property {string|null} organizerName - Event organizer name
 * @property {string|null} email - Organizer contact email
 * @property {string|null} organizerPhone - Organizer contact phone
 * @property {boolean} isFeatured - Whether event is featured
 * @property {boolean} isPublished - Whether event is published and visible
 * @property {Date|null} publishedAt - Publication timestamp
 * @property {string|null} metaTitle - SEO meta title
 * @property {string|null} metaDescription - SEO meta description
 * @property {number} viewCount - Total number of views
 * @property {number} clickCount - Total number of clicks
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {Date|null} deletedAt - Deletion timestamp (soft delete)
 */
export interface Event {
  id: number;
  name: string;
  slug: string;
  eventType: EventType;
  description: string;
  shortDescription: string | null;
  translations: Record<string, any> | null;

  // Scheduling
  startDate: Date;
  endDate: Date;
  timezone: string;

  // Location
  locationType: EventsLocationType;
  venueName: string | null;
  venueAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  locationId: number | null;
  onlineMeetingUrl: string | null;
  onlineMeetingPlatform: string | null;

  // Capacity & Registration
  maxCapacity: number | null;
  registeredCount: number;
  requiresRegistration: boolean;
  isRegistrationOpen: boolean;
  registrationDeadline: Date | null;

  // Project Association
  projectId: number | null;

  // Status
  status: EventStatus;

  // Media
  featuredImageUrl: string | null;
  bannerImageUrl: string | null;

  // Organizer
  organizerName: string | null;
  email: string | null;
  organizerPhone: string | null;

  // Publishing
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt: Date | null;

  // SEO
  metaTitle: string | null;
  metaDescription: string | null;

  // Analytics
  viewCount: number;
  clickCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations
  location?: any;
  project?: any;
  registrations?: any[];
  influencers?: any[];
}

/**
 * @openapi
 * Data transfer object for creating event
 *
 * @interface CreateEventDto
 * @property {string} name - Event name/title (required)
 * @property {string} slug - URL-friendly slug (auto-generated if not provided)
 * @property {EventType} eventType - Type of event (required)
 * @property {string} description - Detailed event description (required)
 * @property {string} shortDescription - Brief event description for listings
 * @property {Record<string,any>} translations - Multi-language translations
 * @property {Date} startDate - Event start date and time (required)
 * @property {Date} endDate - Event end date and time (required)
 * @property {string} timezone - Event timezone (defaults to Africa/Algiers)
 * @property {EventsLocationType} locationType - Event location type (required)
 * @property {string} venueName - Venue name for physical events
 * @property {string} venueAddress - Full venue address
 * @property {number} latitude - Venue latitude
 * @property {number} longitude - Venue longitude
 * @property {number} locationId - Associated location ID
 * @property {string} onlineMeetingUrl - Online meeting URL
 * @property {string} onlineMeetingPlatform - Online meeting platform name
 * @property {number} maxCapacity - Maximum attendee capacity
 * @property {boolean} requiresRegistration - Whether registration is required
 * @property {boolean} isRegistrationOpen - Whether registration is initially open
 * @property {Date} registrationDeadline - Registration deadline
 * @property {number} projectId - Associated project ID
 * @property {EventStatus} status - Event status
 * @property {string} featuredImageUrl - Featured event image URL
 * @property {string} bannerImageUrl - Event banner image URL
 * @property {string} organizerName - Event organizer name
 * @property {string} email - Organizer contact email
 * @property {string} organizerPhone - Organizer contact phone
 * @property {boolean} isFeatured - Whether to feature the event
 * @property {boolean} isPublished - Whether to publish immediately
 * @property {Date} publishedAt - Custom publication timestamp
 * @property {string} metaTitle - SEO meta title
 * @property {string} metaDescription - SEO meta description
 */
export interface CreateEventDto {
  name: string;
  slug?: string;
  eventType: EventType;
  description: string;
  shortDescription?: string;
  translations?: Record<string, any>;
  startDate: Date;
  endDate: Date;
  timezone?: string;
  locationType: EventsLocationType;
  venueName?: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  locationId?: number;
  onlineMeetingUrl?: string;
  onlineMeetingPlatform?: string;
  maxCapacity?: number;
  requiresRegistration?: boolean;
  isRegistrationOpen?: boolean;
  registrationDeadline?: Date;
  projectId?: number;
  status?: EventStatus;
  featuredImageUrl?: string;
  bannerImageUrl?: string;
  organizerName?: string;
  email?: string;
  organizerPhone?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  publishedAt?: Date;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * @openapi
 * Data transfer object for updating event
 *
 * @interface UpdateEventDto
 * @extends Partial<CreateEventDto>
 */
export interface UpdateEventDto extends Partial<CreateEventDto> {}

/**
 * @openapi
 * Extended query options for event filtering
 *
 * @interface EventQueryOptions
 * @extends AdvancedQueryOptions
 * @property {EventType|EventType[]} eventType - Filter by event type
 * @property {EventStatus|EventStatus[]} status - Filter by event status
 * @property {EventsLocationType|EventsLocationType[]} locationType - Filter by location type
 * @property {boolean} isFeatured - Filter by featured status
 * @property {boolean} isPublished - Filter by published status
 * @property {number|number[]} locationId - Filter by location ID(s)
 * @property {number|number[]} projectId - Filter by project ID(s)
 * @property {Date} startDateFrom - Filter events starting after this date
 * @property {Date} startDateTo - Filter events starting before this date
 * @property {Date} endDateFrom - Filter events ending after this date
 * @property {Date} endDateTo - Filter events ending before this date
 * @property {boolean} isRegistrationOpen - Filter by registration open status
 * @property {boolean} hasCapacity - Filter events with available capacity
 * @property {boolean} isUpcoming - Filter upcoming events only
 * @property {boolean} isPast - Filter past events only
 */
export interface EventQueryOptions extends AdvancedQueryOptions {
  eventType?: EventType | EventType[];
  status?: EventStatus | EventStatus[];
  locationType?: EventsLocationType | EventsLocationType[];
  isFeatured?: boolean;
  isPublished?: boolean;
  locationId?: number | number[];
  projectId?: number | number[];
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  isRegistrationOpen?: boolean;
  hasCapacity?: boolean;
  isUpcoming?: boolean;
  isPast?: boolean;
}

/**
 * @openapi
 * Event entity with comprehensive statistics
 *
 * @interface EventWithStats
 * @extends Event
 * @property {object} stats - Statistics object
 * @property {number} stats.totalRegistrations - Total number of registrations
 * @property {number} stats.confirmedRegistrations - Number of confirmed registrations
 * @property {number} stats.attendedCount - Number of attendees who showed up
 * @property {number} stats.noShowCount - Number of no-shows
 * @property {number} stats.attendanceRate - Attendance rate percentage
 * @property {number} stats.capacityPercentage - Capacity utilization percentage
 * @property {number} stats.influencerCount - Number of associated influencers
 * @property {number} stats.totalReach - Total influencer reach
 */
export interface EventWithStats extends Event {
  stats: {
    totalRegistrations: number;
    confirmedRegistrations: number;
    attendedCount: number;
    noShowCount: number;
    attendanceRate: number;
    capacityPercentage: number;
    influencerCount: number;
    totalReach: number;
  };
}

// ============================================================================
// EVENT MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Event Model Class
 *
 * Manages company events with comprehensive scheduling, registration management,
 * location handling, and detailed analytics
 *
 * @class EventModel
 * @extends BaseModel<Event, CreateEventDto, UpdateEventDto>
 *
 * @example
 * ```typescript
 * // Create a new event
 * const event = await eventModel.create({
 *   name: "Luxury Apartments Open House",
 *   eventType: EventType.OPEN_HOUSE,
 *   description: "Join us for an exclusive open house event...",
 *   startDate: new Date('2024-03-15T09:00:00Z'),
 *   endDate: new Date('2024-03-15T18:00:00Z'),
 *   locationType: EventsLocationType.PHYSICAL,
 *   venueName: "Grand Hotel Conference Center",
 *   venueAddress: "123 Main Street, Downtown",
 *   maxCapacity: 100,
 *   requiresRegistration: true,
 *   isPublished: true
 * });
 *
 * // Find upcoming events
 * const upcomingEvents = await eventModel.findUpcoming({
 *   eventType: EventType.OPEN_HOUSE,
 *   limit: 10
 * });
 *
 * // Get event with statistics
 * const eventWithStats = await eventModel.getWithStats(123);
 * console.log(`Attendance rate: ${eventWithStats.stats.attendanceRate}%`);
 * ```
 */
export class EventModel extends BaseModel<
  Event,
  CreateEventDto,
  UpdateEventDto
> {
  protected tableName = "events";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "start_date",
    defaultSortOrder: "desc" as const,
    searchableColumns: ["name", "description", "venue_name", "venue_address"],
    hiddenFields: [],
    fillable: [
      "name",
      "slug",
      "eventType",
      "description",
      "shortDescription",
      "translations",
      "startDate",
      "endDate",
      "timezone",
      "locationType",
      "venueName",
      "venueAddress",
      "latitude",
      "longitude",
      "locationId",
      "onlineMeetingUrl",
      "onlineMeetingPlatform",
      "maxCapacity",
      "registeredCount",
      "requiresRegistration",
      "isRegistrationOpen",
      "registrationDeadline",
      "projectId",
      "status",
      "featuredImageUrl",
      "bannerImageUrl",
      "organizerName",
      "email",
      "organizerPhone",
      "isFeatured",
      "isPublished",
      "publishedAt",
      "metaTitle",
      "metaDescription",
      "viewCount",
      "clickCount",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // Define relations
  protected relations = {
    location: {
      type: "belongsTo" as const,
      model: () => require("./location.model").default,
      foreignKey: "locationId",
      localKey: "id",
    },
    project: {
      type: "belongsTo" as const,
      model: () => require("./project.model").default,
      foreignKey: "projectId",
      localKey: "id",
    },
    registrations: {
      type: "hasMany" as const,
      model: () => require("./event-registration.model").default,
      foreignKey: "eventId",
      localKey: "id",
    },
    influencers: {
      type: "hasMany" as const,
      model: () => require("./event-influencer.model").default,
      foreignKey: "eventId",
      localKey: "id",
    },
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * @openapi
   * Before create hook - validates data, generates slug, checks date logic
   *
   * @param {CreateEventDto} data - Event creation data
   * @returns {Promise<CreateEventDto>} Validated and processed data
   * @throws {Error} When validation fails
   *
   * @private
   * @lifecycle
   */
  protected async beforeCreate(data: CreateEventDto): Promise<CreateEventDto> {
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Validate slug uniqueness
    const existing = await this.findBySlug(data.slug);
    if (existing) {
      data.slug = `${data.slug}-${Date.now()}`;
    }

    // Validate dates
    if (data.endDate <= data.startDate) {
      throw new Error("End date must be after start date");
    }

    // Validate registration deadline
    if (
      data.registrationDeadline &&
      data.registrationDeadline > data.startDate
    ) {
      throw new Error("Registration deadline must be before event start date");
    }

    // Validate coordinates
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    // Set default timezone
    if (!data.timezone) {
      data.timezone = "Africa/Algiers";
    }

    // Set default status
    if (!data.status) {
      data.status = EventStatus.DRAFT;
    }

    // Validate location type requirements
    if (
      data.locationType === EventsLocationType.PHYSICAL ||
      data.locationType === EventsLocationType.HYBRID
    ) {
      if (!data.venueName || !data.venueAddress) {
        throw new Error(
          "Physical/Hybrid events require venue name and address"
        );
      }
    }

    if (
      data.locationType === EventsLocationType.ONLINE ||
      data.locationType === EventsLocationType.HYBRID
    ) {
      if (!data.onlineMeetingUrl) {
        throw new Error("Online/Hybrid events require meeting URL");
      }
    }

    return data;
  }

  /**
   * @openapi
   * After create hook - logs event creation
   *
   * @param {Event} entity - Created event entity
   * @returns {Promise<void>}
   *
   * @private
   * @lifecycle
   */
  protected async afterCreate(entity: Event): Promise<void> {
    console.log(`✅ Event created: ${entity.name} (${entity.eventType})`);
  }

  /**
   * @openapi
   * Before update hook - validates changes and date logic
   *
   * @param {number} id - Event ID being updated
   * @param {UpdateEventDto} data - Update data
   * @returns {Promise<UpdateEventDto>} Validated update data
   * @throws {Error} When validation fails
   *
   * @private
   * @lifecycle
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateEventDto
  ): Promise<UpdateEventDto> {
    const event = await this.findById(id);
    if (!event) {
      throw new Error("Event not found");
    }

    // Validate dates if changing
    if (data.startDate || data.endDate) {
      const startDate = data.startDate || event.startDate;
      const endDate = data.endDate || event.endDate;

      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }
    }

    // Validate coordinates if changing
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    // Validate slug uniqueness if changing
    if (data.slug && data.slug !== event.slug) {
      const existing = await this.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Event slug "${data.slug}" already exists`);
      }
    }

    return data;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * @openapi
   * Finds events with custom filters
   *
   * @param {EventQueryOptions} [options={}] - Query options for filtering
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event[]>} Array of events matching the criteria
   *
   * @example
   * ```typescript
   * const events = await eventModel.findEvents({
   *   eventType: EventType.OPEN_HOUSE,
   *   status: EventStatus.SCHEDULED,
   *   isPublished: true,
   *   sortBy: 'start_date',
   *   sortOrder: 'asc',
   *   limit: 10
   * });
   * ```
   */
  async findEvents(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply event-specific filters
    query = this.applyEventFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Load relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    return entities;
  }

  /**
   * @openapi
   * Gets paginated events with comprehensive filtering
   *
   * @param {EventQueryOptions & {page: number, limit: number}} options - Query options with pagination
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<Event>>} Paginated result with events and metadata
   *
   * @example
   * ```typescript
   * const result = await eventModel.paginateEvents({
   *   page: 1,
   *   limit: 10,
   *   eventType: EventType.WORKSHOP,
   *   isPublished: true,
   *   isUpcoming: true
   * });
   * console.log(`Page ${result.pagination.page} of ${result.pagination.totalPages}`);
   * ```
   */
  async paginateEvents(
    options: EventQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<Event>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findEvents(options, trx),
      this.countEvents(options, trx),
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
   * Counts events matching the specified filters
   *
   * @param {EventQueryOptions} [options={}] - Query options for filtering
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of matching events
   *
   * @example
   * ```typescript
   * const count = await eventModel.countEvents({
   *   eventType: EventType.SEMINAR,
   *   isPublished: true,
   *   isUpcoming: true
   * });
   * console.log(`Found ${count} upcoming seminars`);
   * ```
   */
  async countEvents(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    query = this.applyEventFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * @openapi
   * Finds event by slug
   *
   * @param {string} slug - The event slug
   * @param {Object} [options] - Options for loading relations
   * @param {boolean} [options.includeDeleted=false] - Whether to include soft-deleted events
   * @param {string[]} [options.relations=[]] - Relations to load
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event|null>} Event or null if not found
   *
   * @example
   * ```typescript
   * const event = await eventModel.findBySlug("luxury-apartments-open-house", {
   *   relations: ['location', 'project']
   * });
   * ```
   */
  async findBySlug(
    slug: string,
    options: { includeDeleted?: boolean; relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    return this.findOne({ slug }, options, trx);
  }

  /**
   * @openapi
   * Finds upcoming published events
   *
   * @param {EventQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event[]>} Array of upcoming events sorted by start date
   *
   * @example
   * ```typescript
   * const upcoming = await eventModel.findUpcoming({
   *   eventType: EventType.EXHIBITION,
   *   limit: 10
   * });
   * ```
   */
  async findUpcoming(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents(
      {
        ...options,
        isUpcoming: true,
        isPublished: true,
        sortBy: "start_date",
        sortOrder: "asc",
      },
      trx
    );
  }

  /**
   * @openapi
   * Finds past published events
   *
   * @param {EventQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event[]>} Array of past events sorted by start date (desc)
   *
   * @example
   * ```typescript
   * const pastEvents = await eventModel.findPast({
   *   eventType: EventType.WORKSHOP,
   *   limit: 10
   * });
   * ```
   */
  async findPast(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents(
      {
        ...options,
        isPast: true,
        isPublished: true,
        sortBy: "start_date",
        sortOrder: "desc",
      },
      trx
    );
  }

  /**
   * @openapi
   * Finds featured published events
   *
   * @param {EventQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event[]>} Array of featured events
   *
   * @example
   * ```typescript
   * const featured = await eventModel.findFeatured({
   *   limit: 5,
   *   eventType: EventType.LAUNCH_EVENT
   * });
   * ```
   */
  async findFeatured(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents(
      {
        ...options,
        isFeatured: true,
        isPublished: true,
      },
      trx
    );
  }

  /**
   * @openapi
   * Finds events with available capacity
   *
   * @param {EventQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event[]>} Array of events with available capacity
   *
   * @example
   * ```typescript
   * const withCapacity = await eventModel.findWithCapacity({
   *   requiresRegistration: true,
   *   limit: 10
   * });
   * ```
   */
  async findWithCapacity(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents(
      {
        ...options,
        hasCapacity: true,
        isRegistrationOpen: true,
        isPublished: true,
      },
      trx
    );
  }

  /**
   * @openapi
   * Finds events by type
   *
   * @param {EventType} eventType - The event type to filter by
   * @param {EventQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event[]>} Array of events of the specified type
   *
   * @example
   * ```typescript
   * const workshops = await eventModel.findByType(EventType.WORKSHOP, {
   *   isPublished: true,
   *   limit: 10
   * });
   * ```
   */
  async findByType(
    eventType: EventType,
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents({ ...options, eventType }, trx);
  }

  /**
   * @openapi
   * Finds events by project
   *
   * @param {number} projectId - The project ID to filter by
   * @param {EventQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event[]>} Array of events associated with the project
   *
   * @example
   * ```typescript
   * const projectEvents = await eventModel.findByProject(5, {
   *   isPublished: true,
   *   limit: 10
   * });
   * ```
   */
  async findByProject(
    projectId: number,
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents({ ...options, projectId }, trx);
  }

  // ============================================================================
  // CAPACITY & REGISTRATION MANAGEMENT
  // ============================================================================

  /**
   * @openapi
   * Checks if event has available capacity for additional guests
   *
   * @param {number} id - Event ID
   * @param {number} [guestCount=1] - Number of additional guests
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} Whether the event has capacity
   *
   * @example
   * ```typescript
   * const hasCapacity = await eventModel.hasAvailableCapacity(123, 2);
   * if (hasCapacity) {
   *   console.log("Event has capacity for 2 more guests");
   * }
   * ```
   */
  async hasAvailableCapacity(
    id: number,
    guestCount: number = 1,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const event = await this.findById(id, {}, trx);
    if (!event) return false;

    if (!event.maxCapacity) return true; // Unlimited capacity

    return event.registeredCount + guestCount <= event.maxCapacity;
  }

  /**
   * @openapi
   * Updates registered count (typically called by database triggers)
   *
   * @param {number} id - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event|null>} Updated event or null if not found
   *
   * @example
   * ```typescript
   * const updated = await eventModel.updateRegisteredCount(123);
   * if (updated) {
   *   console.log(`Updated count: ${updated.registeredCount}`);
   * }
   * ```
   */
  async updateRegisteredCount(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    const connection = trx || this.db;

    const [count] = await connection("event_registrations")
      .where({ event_id: id, status: "confirmed" })
      .sum("number_of_guests as total");

    const registeredCount = Number(count.total) || 0;

    return this.update(id, { registeredCount } as UpdateEventDto, trx);
  }

  /**
   * @openapi
   * Opens registration for an event
   *
   * @param {number} id - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event|null>} Updated event or null if not found
   *
   * @example
   * ```typescript
   * const opened = await eventModel.openRegistration(123);
   * ```
   */
  async openRegistration(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    return this.update(id, { isRegistrationOpen: true } as UpdateEventDto, trx);
  }

  /**
   * @openapi
   * Closes registration for an event
   *
   * @param {number} id - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event|null>} Updated event or null if not found
   *
   * @example
   * ```typescript
   * const closed = await eventModel.closeRegistration(123);
   * ```
   */
  async closeRegistration(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    return this.update(
      id,
      { isRegistrationOpen: false } as UpdateEventDto,
      trx
    );
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * @openapi
   * Updates event status
   *
   * @param {number} id - Event ID
   * @param {EventStatus} status - New status
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event|null>} Updated event or null if not found
   *
   * @example
   * ```typescript
   * const updated = await eventModel.updateStatus(123, EventStatus.COMPLETED);
   * ```
   */
  async updateStatus(
    id: number,
    status: EventStatus,
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    return this.update(id, { status } as UpdateEventDto, trx);
  }

  /**
   * @openapi
   * Publishes an event
   *
   * @param {number} id - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event|null>} Updated event or null if not found
   *
   * @example
   * ```typescript
   * const published = await eventModel.publish(123);
   * ```
   */
  async publish(id: number, trx?: Knex.Transaction): Promise<Event | null> {
    return this.update(
      id,
      { isPublished: true, publishedAt: new Date() } as UpdateEventDto,
      trx
    );
  }

  /**
   * @openapi
   * Unpublishes an event
   *
   * @param {number} id - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Event|null>} Updated event or null if not found
   *
   * @example
   * ```typescript
   * const unpublished = await eventModel.unpublish(123);
   * ```
   */
  async unpublish(id: number, trx?: Knex.Transaction): Promise<Event | null> {
    return this.update(id, { isPublished: false } as UpdateEventDto, trx);
  }

  // ============================================================================
  // STATISTICS METHODS
  // ============================================================================

  /**
   * @openapi
   * Gets event with comprehensive statistics
   *
   * @param {number} id - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventWithStats|null>} Event with statistics or null if not found
   *
   * @example
   * ```typescript
   * const eventWithStats = await eventModel.getWithStats(123);
   * if (eventWithStats) {
   *   console.log(`Attendance rate: ${eventWithStats.stats.attendanceRate}%`);
   * }
   * ```
   */
  async getWithStats(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventWithStats | null> {
    const event = await this.findById(id, {}, trx);
    if (!event) return null;

    const stats = await this.getEventStats(id, trx);

    return {
      ...event,
      stats,
    };
  }

  /**
   * @openapi
   * Gets comprehensive statistics for an event
   *
   * @param {number} eventId - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventWithStats["stats"]>} Event statistics object
   *
   * @example
   * ```typescript
   * const stats = await eventModel.getEventStats(123);
   * console.log(`Total registrations: ${stats.totalRegistrations}`);
   * console.log(`Attendance rate: ${stats.attendanceRate}%`);
   * ```
   */
  async getEventStats(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<EventWithStats["stats"]> {
    const connection = trx || this.db;

    // Get registration statistics
    const [regStats] = await connection("event_registrations")
      .where({ event_id: eventId })
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw(
          "COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'no_show' THEN 1 END) as noShow"
        ),
        connection.raw("SUM(number_of_guests) as totalGuests")
      );

    const totalRegistrations = Number(regStats?.total || 0);
    const confirmedRegistrations = Number(regStats?.confirmed || 0);
    const attendedCount = Number(regStats?.attended || 0);
    const noShowCount = Number(regStats?.noShow || 0);
    const attendanceRate =
      confirmedRegistrations > 0
        ? (attendedCount / confirmedRegistrations) * 100
        : 0;

    // Get event capacity
    const event = await this.findById(eventId, {}, trx);
    const capacityPercentage =
      event && event.maxCapacity
        ? (event.registeredCount / event.maxCapacity) * 100
        : 0;

    // Get influencer statistics
    const [influencerStats] = await connection("event_influencers")
      .where({ event_id: eventId })
      .select(
        connection.raw("COUNT(*) as count"),
        connection.raw("SUM(reach_achieved) as totalReach")
      );

    return {
      totalRegistrations,
      confirmedRegistrations,
      attendedCount,
      noShowCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      capacityPercentage: Math.round(capacityPercentage * 100) / 100,
      influencerCount: Number(influencerStats?.count || 0),
      totalReach: Number(influencerStats?.totalReach || 0),
    };
  }

  // ============================================================================
  // ANALYTICS METHODS
  // ============================================================================

  /**
   * @openapi
   * Increments view count for an event
   *
   * @param {number} id - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} Whether the update was successful
   *
   * @example
   * ```typescript
   * const success = await eventModel.incrementViewCount(123);
   * if (success) {
   *   console.log("View count incremented");
   * }
   * ```
   */
  async incrementViewCount(
    id: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    const updated = await connection(this.tableName)
      .where({ id })
      .increment("view_count", 1);

    return updated > 0;
  }

  /**
   * @openapi
   * Increments click count for an event
   *
   * @param {number} id - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} Whether the update was successful
   *
   * @example
   * ```typescript
   * const success = await eventModel.incrementClickCount(123);
   * if (success) {
   *   console.log("Click count incremented");
   * }
   * ```
   */
  async incrementClickCount(
    id: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    const updated = await connection(this.tableName)
      .where({ id })
      .increment("click_count", 1);

    return updated > 0;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * @openapi
   * Applies event-specific filters to a query
   *
   * @param {Knex.QueryBuilder} query - The query builder to modify
   * @param {EventQueryOptions} options - Event query options
   * @returns {Knex.QueryBuilder} Modified query builder with filters applied
   *
   * @private
   */
  private applyEventFilters(
    query: Knex.QueryBuilder,
    options: EventQueryOptions
  ): Knex.QueryBuilder {
    // Event type filter
    if (options.eventType) {
      if (Array.isArray(options.eventType)) {
        query = query.whereIn("event_type", options.eventType);
      } else {
        query = query.where("event_type", options.eventType);
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

    // Location type filter
    if (options.locationType) {
      if (Array.isArray(options.locationType)) {
        query = query.whereIn("location_type", options.locationType);
      } else {
        query = query.where("location_type", options.locationType);
      }
    }

    // Featured filter
    if (options.isFeatured !== undefined) {
      query = query.where("is_featured", options.isFeatured);
    }

    // Published filter
    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    // Location filter
    if (options.locationId) {
      if (Array.isArray(options.locationId)) {
        query = query.whereIn("location_id", options.locationId);
      } else {
        query = query.where("location_id", options.locationId);
      }
    }

    // Project filter
    if (options.projectId) {
      if (Array.isArray(options.projectId)) {
        query = query.whereIn("project_id", options.projectId);
      } else {
        query = query.where("project_id", options.projectId);
      }
    }

    // Date range filters
    if (options.startDateFrom) {
      query = query.where("start_date", ">=", options.startDateFrom);
    }
    if (options.startDateTo) {
      query = query.where("start_date", "<=", options.startDateTo);
    }
    if (options.endDateFrom) {
      query = query.where("end_date", ">=", options.endDateFrom);
    }
    if (options.endDateTo) {
      query = query.where("end_date", "<=", options.endDateTo);
    }

    // Registration open filter
    if (options.isRegistrationOpen !== undefined) {
      query = query.where("is_registration_open", options.isRegistrationOpen);
    }

    // Has capacity filter
    if (options.hasCapacity) {
      query = query.whereRaw(
        "max_capacity IS NULL OR registered_count < max_capacity"
      );
    }

    // Upcoming events filter
    if (options.isUpcoming) {
      query = query.where("start_date", ">", this.db.fn.now());
    }

    // Past events filter
    if (options.isPast) {
      query = query.where("end_date", "<", this.db.fn.now());
    }

    return query;
  }

  /**
   * @openapi
   * Validates geographic coordinates
   *
   * @param {number|null|undefined} latitude - Latitude value
   * @param {number|null|undefined} longitude - Longitude value
   * @throws {Error} When coordinates are invalid
   *
   * @private
   */
  private validateCoordinates(
    latitude?: number | null,
    longitude?: number | null
  ): void {
    if (latitude !== null && latitude !== undefined) {
      if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
    }

    if (longitude !== null && longitude !== undefined) {
      if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }
    }
  }

  /**
   * @openapi
   * Maps database record to Event entity
   *
   * @param {DatabaseRecord} record - Database record
   * @returns {Event} Mapped event entity
   *
   * @override
   * @protected
   */
  protected mapToEntity(record: DatabaseRecord): Event {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      eventType: record.event_type as EventType,
      description: record.description,
      shortDescription: record.short_description,
      translations: this.parseJson(record.translations),
      startDate: new Date(record.start_date),
      endDate: new Date(record.end_date),
      timezone: record.timezone,
      locationType: record.location_type as EventsLocationType,
      venueName: record.venue_name,
      venueAddress: record.venue_address,
      latitude: record.latitude ? Number(record.latitude) : null,
      longitude: record.longitude ? Number(record.longitude) : null,
      locationId: record.location_id,
      onlineMeetingUrl: record.online_meeting_url,
      onlineMeetingPlatform: record.online_meeting_platform,
      maxCapacity: record.max_capacity,
      registeredCount: record.registered_count || 0,
      requiresRegistration: Boolean(record.requires_registration),
      isRegistrationOpen: Boolean(record.is_registration_open),
      registrationDeadline: record.registration_deadline
        ? new Date(record.registration_deadline)
        : null,
      projectId: record.project_id,
      status: record.status as EventStatus,
      featuredImageUrl: record.featured_image_url,
      bannerImageUrl: record.banner_image_url,
      organizerName: record.organizer_name,
      email: record.email,
      organizerPhone: record.organizer_phone,
      isFeatured: Boolean(record.is_featured),
      isPublished: Boolean(record.is_published),
      publishedAt: record.published_at ? new Date(record.published_at) : null,
      metaTitle: record.meta_title,
      metaDescription: record.meta_description,
      viewCount: record.view_count || 0,
      clickCount: record.click_count || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// Export singleton instance
export default new EventModel();
