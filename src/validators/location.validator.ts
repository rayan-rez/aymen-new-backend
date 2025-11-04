/**
 * Location Validation Schemas
 * Joi schemas for validating location requests
 *
 * @module validators/location.validators
 */

import Joi from "joi";

/**
 * Location schemas
 */
export const locationSchemas = {
  /**
   * Create location schema
   */
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    parentId: Joi.number().integer().positive().allow(null).optional(),
    type: Joi.string()
      .valid("country", "region", "city", "neighborhood")
      .required(),
    displayOrder: Joi.number().integer().min(0).default(0),
    isActive: Joi.boolean().default(true),
  }),

  /**
   * Update location schema
   */
  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    parentId: Joi.number().integer().positive().allow(null).optional(),
    type: Joi.string()
      .valid("country", "region", "city", "neighborhood")
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
   * Parent ID param schema
   */
  parentIdParam: Joi.object({
    countryId: Joi.number().integer().positive().optional(),
    regionId: Joi.number().integer().positive().optional(),
    cityId: Joi.number().integer().positive().optional(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    type: Joi.alternatives()
      .try(
        Joi.string().valid("country", "region", "city", "neighborhood"),
        Joi.array().items(
          Joi.string().valid("country", "region", "city", "neighborhood")
        )
      )
      .optional(),
    parentId: Joi.alternatives()
      .try(
        Joi.number().integer().positive(),
        Joi.array().items(Joi.number().integer().positive())
      )
      .optional(),
    isActive: Joi.boolean().optional(),
    depth: Joi.alternatives()
      .try(
        Joi.number().integer().min(0).max(10),
        Joi.array().items(Joi.number().integer().min(0).max(10))
      )
      .optional(),
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
    includeHierarchy: Joi.boolean().optional(),
  }),

  /**
   * Get descendants query schema
   */
  descendantsQuery: Joi.object({
    maxDepth: Joi.number().integer().min(1).max(10).optional(),
    typesOnly: Joi.alternatives()
      .try(
        Joi.string().valid("country", "region", "city", "neighborhood"),
        Joi.array().items(
          Joi.string().valid("country", "region", "city", "neighborhood")
        )
      )
      .optional(),
  }),

  /**
   * Reorder locations schema
   */
  reorder: Joi.object({
    locationIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
  }),
};

export default locationSchemas;