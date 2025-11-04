/**
 * Commercial Property Validation Schemas
 * Joi schemas for validating commercial property requests
 *
 * @module validators/commercial-property.validators
 */

import Joi from "joi";

/**
 * Commercial property schemas
 */
export const commercialPropertySchemas = {
  /**
   * Create commercial property schema
   */
  create: Joi.object({
    title: Joi.string().min(2).max(255).required(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    subtitle: Joi.string().max(255).allow(null, "").optional(),
    description: Joi.string().required(),
    cardDescription: Joi.string().max(500).allow(null, "").optional(),
    address: Joi.string().required(),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    locationId: Joi.number().integer().positive().allow(null).optional(),
    propertyType: Joi.string()
      .valid("office", "shop", "warehouse", "showroom", "restaurant", "mixed_use")
      .required(),
    areaSqm: Joi.number().positive().allow(null).optional(),
    price: Joi.number().positive().allow(null).optional(),
    status: Joi.string()
      .valid("available", "rented", "sold")
      .default("available"),
    mainImageUrl: Joi.string().uri().allow(null, "").optional(),
    isFeatured: Joi.boolean().default(false),
    isPublished: Joi.boolean().default(false),
    metaTitle: Joi.string().max(255).allow(null, "").optional(),
    metaDescription: Joi.string().max(500).allow(null, "").optional(),
  }),

  /**
   * Update commercial property schema
   */
  update: Joi.object({
    title: Joi.string().min(2).max(255).optional(),
    subtitle: Joi.string().max(255).allow(null, "").optional(),
    description: Joi.string().optional(),
    cardDescription: Joi.string().max(500).allow(null, "").optional(),
    address: Joi.string().optional(),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    locationId: Joi.number().integer().positive().allow(null).optional(),
    propertyType: Joi.string()
      .valid("office", "shop", "warehouse", "showroom", "restaurant", "mixed_use")
      .optional(),
    areaSqm: Joi.number().positive().allow(null).optional(),
    price: Joi.number().positive().allow(null).optional(),
    status: Joi.string().valid("available", "rented", "sold").optional(),
    mainImageUrl: Joi.string().uri().allow(null, "").optional(),
    isFeatured: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
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
    propertyType: Joi.alternatives()
      .try(
        Joi.string().valid("office", "shop", "warehouse", "showroom", "restaurant", "mixed_use"),
        Joi.array().items(
          Joi.string().valid("office", "shop", "warehouse", "showroom", "restaurant", "mixed_use")
        )
      )
      .optional(),
    status: Joi.alternatives()
      .try(
        Joi.string().valid("available", "rented", "sold"),
        Joi.array().items(Joi.string().valid("available", "rented", "sold"))
      )
      .optional(),
    locationId: Joi.alternatives()
      .try(
        Joi.number().integer().positive(),
        Joi.array().items(Joi.number().integer().positive())
      )
      .optional(),
    isFeatured: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
    minArea: Joi.number().min(0).optional(),
    maxArea: Joi.number().min(0).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    hasCoordinates: Joi.boolean().optional(),
    search: Joi.string().max(255).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
    includePhotos: Joi.boolean().optional(),
  }),

  /**
   * Search query schema
   */
  search: Joi.object({
    q: Joi.string().min(2).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export default commercialPropertySchemas;