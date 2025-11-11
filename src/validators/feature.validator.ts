import Joi from "joi";

/**
 * Feature Validator
 */

export const featureSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    icon: Joi.string().max(50).allow(null, "").optional(),
    // REMOVED: translations
    category: Joi.string()
      .valid("amenity", "security", "transport", "leisure", "other")
      .default("amenity"),
    displayOrder: Joi.number().integer().min(0).default(0),
    isActive: Joi.boolean().default(true),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    icon: Joi.string().max(50).allow(null, "").optional(),
    // REMOVED: translations
    category: Joi.string()
      .valid("amenity", "security", "transport", "leisure", "other")
      .optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),

  getById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  categoryParam: Joi.object({
    category: Joi.string()
      .valid("amenity", "security", "transport", "leisure", "other")
      .required(),
  }),

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
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  }),

  popularQuery: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),

  reorder: Joi.object({
    featureIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
  }),
};


export default featureSchemas;
