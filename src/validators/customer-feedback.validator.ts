/**
 * Customer Feedback Validation Schemas
 * Joi schemas for validating customer feedback requests
 *
 * @module validators/customer-feedback.validators
 */

import Joi from "joi";

/**
 * Customer feedback schemas
 */
export const customerFeedbackSchemas = {
  /**
   * Create feedback schema (public endpoint)
   */
  create: Joi.object({
    fullName: Joi.string().max(255).allow(null, "").optional(),
    email: Joi.string().email().allow(null, "").optional(),
    phone: Joi.string().max(20).allow(null, "").optional(),
    feedbackType: Joi.string()
      .valid("event_feedback", "property_visit", "customer_service", "general", "kiosk")
      .required(),
    overallSatisfaction: Joi.number().integer().min(1).max(10).allow(null).optional(),
    recommendationLikelihood: Joi.number().integer().min(1).max(10).allow(null).optional(),
    feedbackComments: Joi.string().allow(null, "").optional(),
    suggestions: Joi.string().allow(null, "").optional(),
    projectId: Joi.number().integer().positive().allow(null).optional(),
    relatedEvent: Joi.string().max(255).allow(null, "").optional(),
    language: Joi.string().valid("fr", "ar", "en").default("fr"),
  }),

  /**
   * Update feedback schema (admin only)
   */
  update: Joi.object({
    fullName: Joi.string().max(255).allow(null, "").optional(),
    email: Joi.string().email().allow(null, "").optional(),
    phone: Joi.string().max(20).allow(null, "").optional(),
    feedbackType: Joi.string()
      .valid("event_feedback", "property_visit", "customer_service", "general", "kiosk")
      .optional(),
    overallSatisfaction: Joi.number().integer().min(1).max(10).allow(null).optional(),
    recommendationLikelihood: Joi.number().integer().min(1).max(10).allow(null).optional(),
    feedbackComments: Joi.string().allow(null, "").optional(),
    suggestions: Joi.string().allow(null, "").optional(),
    projectId: Joi.number().integer().positive().allow(null).optional(),
    relatedEvent: Joi.string().max(255).allow(null, "").optional(),
    sentiment: Joi.string().valid("positive", "neutral", "negative").optional(),
    sentimentScore: Joi.number().min(-1).max(1).allow(null).optional(),
  }).min(1),

  /**
   * Get by ID params schema
   */
  getById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    feedbackType: Joi.alternatives()
      .try(
        Joi.string().valid("event_feedback", "property_visit", "customer_service", "general", "kiosk"),
        Joi.array().items(
          Joi.string().valid("event_feedback", "property_visit", "customer_service", "general", "kiosk")
        )
      )
      .optional(),
    sentiment: Joi.alternatives()
      .try(
        Joi.string().valid("positive", "neutral", "negative"),
        Joi.array().items(Joi.string().valid("positive", "neutral", "negative"))
      )
      .optional(),
    language: Joi.alternatives()
      .try(
        Joi.string().valid("fr", "ar", "en"),
        Joi.array().items(Joi.string().valid("fr", "ar", "en"))
      )
      .optional(),
    projectId: Joi.alternatives()
      .try(
        Joi.number().integer().positive(),
        Joi.array().items(Joi.number().integer().positive())
      )
      .optional(),
    minSatisfaction: Joi.number().integer().min(1).max(10).optional(),
    maxSatisfaction: Joi.number().integer().min(1).max(10).optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  }),

  /**
   * Statistics date range schema
   */
  statisticsQuery: Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
  }),
};

export default customerFeedbackSchemas;