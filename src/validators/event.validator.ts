/**
 * Event Validation Schemas
 * Joi schemas for validating event requests
 *
 * @module validators/event.validators
 */

import Joi from "joi";
import {
  EventType,
  EventStatus,
  EventsLocationType,
} from "@models/event.model";

/**
 * Common event schemas
 */
export const eventSchemas = {
  /**
   * Create event schema
   */
  create: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    eventType: Joi.string()
      .valid(...Object.values(EventType))
      .required(),
    description: Joi.string().required(),
    shortDescription: Joi.string().allow(null, "").optional(),
    translations: Joi.object().allow(null).optional(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref("startDate")).required(),
    timezone: Joi.string().default("Africa/Algiers"),
    locationType: Joi.string()
      .valid(...Object.values(EventsLocationType))
      .required(),
    venueName: Joi.string()
      .max(255)
      .when("locationType", {
        is: Joi.string().valid(
          EventsLocationType.PHYSICAL,
          EventsLocationType.HYBRID
        ),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    venueAddress: Joi.string()
      .max(500)
      .when("locationType", {
        is: Joi.string().valid(
          EventsLocationType.PHYSICAL,
          EventsLocationType.HYBRID
        ),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    locationId: Joi.number().integer().positive().allow(null).optional(),
    onlineMeetingUrl: Joi.string()
      .uri()
      .when("locationType", {
        is: Joi.string().valid(
          EventsLocationType.ONLINE,
          EventsLocationType.HYBRID
        ),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    onlineMeetingPlatform: Joi.string().max(100).allow(null, "").optional(),
    maxCapacity: Joi.number().integer().positive().allow(null).optional(),
    requiresRegistration: Joi.boolean().default(true),
    isRegistrationOpen: Joi.boolean().default(true),
    registrationDeadline: Joi.date()
      .iso()
      .less(Joi.ref("startDate"))
      .allow(null)
      .optional(),
    projectId: Joi.number().integer().positive().allow(null).optional(),
    status: Joi.string()
      .valid(...Object.values(EventStatus))
      .default(EventStatus.DRAFT),
    featuredImageUrl: Joi.string().uri().allow(null, "").optional(),
    bannerImageUrl: Joi.string().uri().allow(null, "").optional(),
    organizerName: Joi.string().max(255).allow(null, "").optional(),
    email: Joi.string().email().allow(null, "").optional(),
    organizerPhone: Joi.string().max(30).allow(null, "").optional(),
    isFeatured: Joi.boolean().default(false),
    isPublished: Joi.boolean().default(false),
    publishedAt: Joi.date().iso().allow(null).optional(),
    metaTitle: Joi.string().max(255).allow(null, "").optional(),
    metaDescription: Joi.string().max(500).allow(null, "").optional(),
  }),

  /**
   * Update event schema
   */
  update: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    eventType: Joi.string()
      .valid(...Object.values(EventType))
      .optional(),
    description: Joi.string().optional(),
    shortDescription: Joi.string().allow(null, "").optional(),
    translations: Joi.object().allow(null).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    timezone: Joi.string().optional(),
    locationType: Joi.string()
      .valid(...Object.values(EventsLocationType))
      .optional(),
    venueName: Joi.string().max(255).allow(null, "").optional(),
    venueAddress: Joi.string().max(500).allow(null, "").optional(),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    locationId: Joi.number().integer().positive().allow(null).optional(),
    onlineMeetingUrl: Joi.string().uri().allow(null, "").optional(),
    onlineMeetingPlatform: Joi.string().max(100).allow(null, "").optional(),
    maxCapacity: Joi.number().integer().positive().allow(null).optional(),
    requiresRegistration: Joi.boolean().optional(),
    isRegistrationOpen: Joi.boolean().optional(),
    registrationDeadline: Joi.date().iso().allow(null).optional(),
    projectId: Joi.number().integer().positive().allow(null).optional(),
    status: Joi.string()
      .valid(...Object.values(EventStatus))
      .optional(),
    featuredImageUrl: Joi.string().uri().allow(null, "").optional(),
    bannerImageUrl: Joi.string().uri().allow(null, "").optional(),
    organizerName: Joi.string().max(255).allow(null, "").optional(),
    email: Joi.string().email().allow(null, "").optional(),
    organizerPhone: Joi.string().max(30).allow(null, "").optional(),
    isFeatured: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
    publishedAt: Joi.date().iso().allow(null).optional(),
    metaTitle: Joi.string().max(255).allow(null, "").optional(),
    metaDescription: Joi.string().max(500).allow(null, "").optional(),
  }).min(1),

  /**
   * Get by ID params schema
   */
  getById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  /**
   * Get by slug params schema
   */
  getBySlug: Joi.object({
    slug: Joi.string().required(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    eventType: Joi.alternatives()
      .try(
        Joi.string().valid(...Object.values(EventType)),
        Joi.array().items(Joi.string().valid(...Object.values(EventType)))
      )
      .optional(),
    status: Joi.alternatives()
      .try(
        Joi.string().valid(...Object.values(EventStatus)),
        Joi.array().items(Joi.string().valid(...Object.values(EventStatus)))
      )
      .optional(),
    locationType: Joi.alternatives()
      .try(
        Joi.string().valid(...Object.values(EventsLocationType)),
        Joi.array().items(
          Joi.string().valid(...Object.values(EventsLocationType))
        )
      )
      .optional(),
    isFeatured: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
    locationId: Joi.alternatives()
      .try(
        Joi.number().integer().positive(),
        Joi.array().items(Joi.number().integer().positive())
      )
      .optional(),
    projectId: Joi.alternatives()
      .try(
        Joi.number().integer().positive(),
        Joi.array().items(Joi.number().integer().positive())
      )
      .optional(),
    isUpcoming: Joi.boolean().optional(),
    isPast: Joi.boolean().optional(),
    search: Joi.string().max(255).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
    relations: Joi.string().optional(),
  }),

  /**
   * Registration query filters
   */
  registrationFilters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid("confirmed", "pending", "cancelled", "attended", "no_show")
      .optional(),
  }),

  /**
   * Update status schema
   */
  updateStatus: Joi.object({
    status: Joi.string()
      .valid(...Object.values(EventStatus))
      .required(),
  }),
};

export default eventSchemas;
