/**
 * Event Registration Validation Schemas
 * Joi schemas for validating event registration requests
 *
 * @module validators/event-registration.validators
 */

import Joi from "joi";

/**
 * Event registration schemas
 */
export const eventRegistrationSchemas = {
  /**
   * Create registration schema (public endpoint)
   */
  create: Joi.object({
    fullName: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().max(30).allow(null, "").optional(),
    company: Joi.string().max(255).allow(null, "").optional(),
    jobTitle: Joi.string().max(255).allow(null, "").optional(),
    numberOfGuests: Joi.number().integer().min(1).max(10).default(1),
    specialRequirements: Joi.string().max(500).allow(null, "").optional(),
    notes: Joi.string().max(1000).allow(null, "").optional(),
    utmSource: Joi.string().max(100).allow(null, "").optional(),
    utmMedium: Joi.string().max(100).allow(null, "").optional(),
    utmCampaign: Joi.string().max(150).allow(null, "").optional(),
    utmTerm: Joi.string().max(150).allow(null, "").optional(),
    utmContent: Joi.string().max(150).allow(null, "").optional(),
  }),

  /**
   * Update registration schema
   */
  update: Joi.object({
    fullName: Joi.string().min(2).max(255).optional(),
    phone: Joi.string().max(30).allow(null, "").optional(),
    company: Joi.string().max(255).allow(null, "").optional(),
    jobTitle: Joi.string().max(255).allow(null, "").optional(),
    numberOfGuests: Joi.number().integer().min(1).max(10).optional(),
    specialRequirements: Joi.string().max(500).allow(null, "").optional(),
    notes: Joi.string().max(1000).allow(null, "").optional(),
    status: Joi.string()
      .valid("confirmed", "pending", "cancelled", "attended", "no_show")
      .optional(),
  }).min(1),

  /**
   * Get by ID params schema
   */
  getById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  /**
   * Event ID param schema
   */
  eventIdParam: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    eventId: Joi.number().integer().positive().optional(),
    status: Joi.alternatives()
      .try(
        Joi.string().valid("confirmed", "pending", "cancelled", "attended", "no_show"),
        Joi.array().items(
          Joi.string().valid("confirmed", "pending", "cancelled", "attended", "no_show")
        )
      )
      .optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    registeredAfter: Joi.date().iso().optional(),
    registeredBefore: Joi.date().iso().optional(),
    hasSpecialRequirements: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  }),

  /**
   * Update status schema
   */
  updateStatus: Joi.object({
    status: Joi.string()
      .valid("confirmed", "pending", "cancelled", "attended", "no_show")
      .required(),
  }),

  /**
   * Bulk check-in schema
   */
  bulkCheckIn: Joi.object({
    registrationIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
  }),

  /**
   * Cancel registration schema
   */
  cancel: Joi.object({
    reason: Joi.string().max(500).allow(null, "").optional(),
  }),

  /**
   * Export query schema
   */
  exportQuery: Joi.object({
    status: Joi.alternatives()
      .try(
        Joi.string().valid("confirmed", "pending", "cancelled", "attended", "no_show"),
        Joi.array().items(
          Joi.string().valid("confirmed", "pending", "cancelled", "attended", "no_show")
        )
      )
      .optional(),
    format: Joi.string().valid("csv", "xlsx", "pdf").default("csv"),
  }),
};

export default eventRegistrationSchemas;