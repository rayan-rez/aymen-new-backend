/**
 * Feature Validation Schemas
 * Joi schemas for validating feature requests
 *
 * @module validators/feature.validators
 */

import Joi from "joi";

/**
 * Feature schemas
 */
export const featureSchemas = {
  /**
   * Create feature schema
   */
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    icon: Joi.string().max(50).allow(null, "").optional(),
    translations: Joi.object()
      .pattern(
        Joi.string().pattern(/^[a-z]{2,3}$/i),
        Joi.string().min(1).max(255)
      )
      .allow(null)
      .optional(),
    category: Joi.string()
      .valid("amenity", "security", "transport", "leisure", "other")
      .default("amenity"),
    displayOrder: Joi.number().integer().min(0).default(0),
    isActive: Joi.boolean().default(true),
  }),

  /**
   * Update feature schema
   */
  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    icon: Joi.string().max(50).allow(null, "").optional(),
    translations: Joi.object()
      .pattern(
        Joi.string().pattern(/^[a-z]{2,3}$/i),
        Joi.string().min(1).max(255)
      )
      .allow(null)
      .optional(),
    category: Joi.string()
      .valid("amenity", "security", "transport", "leisure", "other")
      .optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
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
   * Get by category params schema
   */
  categoryParam: Joi.object({
    category: Joi.string()
      .valid("amenity", "security", "transport", "leisure", "other")
      .required(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    category: Joi.alternatives()
      .try(
        Joi.string().valid("amenity", "security", "transport", "leisure", "other"),
        Joi.array().items(
          Joi.string().valid("amenity", "security", "transport", "leisure", "other")
        )
      )
      .optional(),
    isActive: Joi.boolean().optional(),
    hasIcon: Joi.boolean().optional(),
    hasTranslations: Joi.boolean().optional(),
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  }),

  /**
   * Update translations schema
   */
  updateTranslations: Joi.object({
    translations: Joi.object()
      .pattern(
        Joi.string().pattern(/^[a-z]{2,3}$/i),
        Joi.string().min(1).max(255)
      )
      .required(),
    merge: Joi.boolean().default(true),
  }),

  /**
   * Add single translation schema
   */
  addTranslation: Joi.object({
    language: Joi.string()
      .pattern(/^[a-z]{2,3}$/i)
      .required(),
    translation: Joi.string().min(1).max(255).required(),
  }),

  /**
   * Remove translation params schema
   */
  removeTranslation: Joi.object({
    id: Joi.number().integer().positive().required(),
    language: Joi.string()
      .pattern(/^[a-z]{2,3}$/i)
      .required(),
  }),

  /**
   * Get popular features query schema
   */
  popularQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),

  /**
   * Reorder features schema
   */
  reorder: Joi.object({
    featureIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
  }),
};

export default featureSchemas;