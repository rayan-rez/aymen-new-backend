/**
 * Lead Mirror Validation Schemas
 * Joi schemas for validating lead mirror requests
 *
 * @module validators/lead-mirror.validators
 */

import Joi from "joi";

/**
 * Lead mirror schemas
 */
export const leadMirrorSchemas = {
  /**
   * Get by ID params schema
   */
  getById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  /**
   * Get by Odoo lead ID params schema
   */
  getByOdooId: Joi.object({
    odooLeadId: Joi.string().required(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    leadType: Joi.alternatives()
      .try(
        Joi.string().valid(
          "contact_form",
          "project_inquiry",
          "appointment",
          "catalog_download",
          "land_submission",
          "job_application",
          "event_registration"
        ),
        Joi.array().items(
          Joi.string().valid(
            "contact_form",
            "project_inquiry",
            "appointment",
            "catalog_download",
            "land_submission",
            "job_application",
            "event_registration"
          )
        )
      )
      .optional(),
    syncStatus: Joi.alternatives()
      .try(
        Joi.string().valid("pending", "synced", "failed", "updated"),
        Joi.array().items(
          Joi.string().valid("pending", "synced", "failed", "updated")
        )
      )
      .optional(),
    formSubmissionId: Joi.alternatives()
      .try(
        Joi.number().integer().positive(),
        Joi.array().items(Joi.number().integer().positive())
      )
      .optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    hasSyncError: Joi.boolean().optional(),
    syncedAfter: Joi.date().iso().optional(),
    syncedBefore: Joi.date().iso().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  }),

  /**
   * Update sync status schema
   */
  updateSyncStatus: Joi.object({
    syncStatus: Joi.string()
      .valid("pending", "synced", "failed", "updated")
      .required(),
    syncError: Joi.string().max(1000).allow(null, "").optional(),
  }),

  /**
   * Statistics date range schema
   */
  statisticsQuery: Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
  }),
};

// ============================================================================
// EVENT INFLUENCER VALIDATORS
// ============================================================================

/**
 * Event influencer schemas
 */
export const eventInfluencerSchemas = {
  /**
   * Create influencer schema
   */
  create: Joi.object({
    influencerName: Joi.string().min(2).max(255).required(),
    influencerHandle: Joi.string().max(255).allow(null, "").optional(),
    influencerEmail: Joi.string().email().allow(null, "").optional(),
    influencerPhone: Joi.string().max(30).allow(null, "").optional(),
    socialLinks: Joi.object().allow(null).optional(),
    followerCount: Joi.number().integer().min(0).allow(null).optional(),
    tier: Joi.string()
      .valid("micro", "macro", "mega", "celebrity")
      .default("micro"),
    role: Joi.string().max(100).allow(null, "").optional(),
    compensationAmount: Joi.number().min(0).allow(null).optional(),
    compensationCurrency: Joi.string().length(3).default("DZD"),
    contractTerms: Joi.string().allow(null, "").optional(),
    requiredPosts: Joi.number().integer().min(0).default(0),
    notes: Joi.string().allow(null, "").optional(),
    internalNotes: Joi.string().allow(null, "").optional(),
    customFields: Joi.object().allow(null).optional(),
  }),

  /**
   * Update influencer schema
   */
  update: Joi.object({
    influencerName: Joi.string().min(2).max(255).optional(),
    influencerHandle: Joi.string().max(255).allow(null, "").optional(),
    influencerEmail: Joi.string().email().allow(null, "").optional(),
    influencerPhone: Joi.string().max(30).allow(null, "").optional(),
    socialLinks: Joi.object().allow(null).optional(),
    followerCount: Joi.number().integer().min(0).allow(null).optional(),
    tier: Joi.string().valid("micro", "macro", "mega", "celebrity").optional(),
    status: Joi.string()
      .valid("invited", "confirmed", "declined", "attended", "cancelled")
      .optional(),
    role: Joi.string().max(100).allow(null, "").optional(),
    compensationAmount: Joi.number().min(0).allow(null).optional(),
    compensationCurrency: Joi.string().length(3).optional(),
    contractTerms: Joi.string().allow(null, "").optional(),
    requiredPosts: Joi.number().integer().min(0).optional(),
    completedPosts: Joi.number().integer().min(0).optional(),
    reachAchieved: Joi.number().integer().min(0).allow(null).optional(),
    engagementCount: Joi.number().integer().min(0).allow(null).optional(),
    notes: Joi.string().allow(null, "").optional(),
    internalNotes: Joi.string().allow(null, "").optional(),
    customFields: Joi.object().allow(null).optional(),
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
   * Update status schema
   */
  updateStatus: Joi.object({
    status: Joi.string()
      .valid("invited", "confirmed", "declined", "attended", "cancelled")
      .required(),
  }),

  /**
   * Update deliverables schema
   */
  updateDeliverables: Joi.object({
    completedPosts: Joi.number().integer().min(0).required(),
    reachAchieved: Joi.number().integer().min(0).allow(null).optional(),
    engagementCount: Joi.number().integer().min(0).allow(null).optional(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.alternatives()
      .try(
        Joi.string().valid(
          "invited",
          "confirmed",
          "declined",
          "attended",
          "cancelled"
        ),
        Joi.array().items(
          Joi.string().valid(
            "invited",
            "confirmed",
            "declined",
            "attended",
            "cancelled"
          )
        )
      )
      .optional(),
    tier: Joi.alternatives()
      .try(
        Joi.string().valid("micro", "macro", "mega", "celebrity"),
        Joi.array().items(
          Joi.string().valid("micro", "macro", "mega", "celebrity")
        )
      )
      .optional(),
    minFollowers: Joi.number().integer().min(0).optional(),
    maxFollowers: Joi.number().integer().min(0).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  }),
};

export default { leadMirrorSchemas, eventInfluencerSchemas };
