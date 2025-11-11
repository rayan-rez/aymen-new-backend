/**
 * Blog Post Validation Schemas
 * Joi schemas for validating blog post requests
 *
 * @module validators/blog-post.validators
 */

import Joi from "joi";

/**
 * Blog Post Validator - FIXED
 */

export const blogPostSchemas = {
  create: Joi.object({
    title: Joi.string().min(2).max(255).required(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    authorName: Joi.string().min(2).max(100).required(),
    category: Joi.string().max(50).allow(null, "").optional(),
    excerpt: Joi.string().max(500).allow(null, "").optional(),
    content: Joi.string().required(),
    featuredImageUrl: Joi.string().uri().allow(null, "").optional(),
    // REMOVED: readingTimeMinutes, metaTitle, metaDescription
    tags: Joi.array().items(Joi.string().max(50)).allow(null).optional(),
    isPublished: Joi.boolean().default(false),
    isFeatured: Joi.boolean().default(false),
    publishedAt: Joi.date().iso().allow(null).optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(255).optional(),
    slug: Joi.string()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    authorName: Joi.string().min(2).max(100).optional(),
    category: Joi.string().max(50).allow(null, "").optional(),
    excerpt: Joi.string().max(500).allow(null, "").optional(),
    content: Joi.string().optional(),
    featuredImageUrl: Joi.string().uri().allow(null, "").optional(),
    // REMOVED: readingTimeMinutes, metaTitle, metaDescription
    tags: Joi.array().items(Joi.string().max(50)).allow(null).optional(),
    isPublished: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    publishedAt: Joi.date().iso().allow(null).optional(),
  }).min(1),

  getById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  getBySlug: Joi.object({
    slug: Joi.string().required(),
  }),

  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    category: Joi.alternatives()
      .try(Joi.string(), Joi.array().items(Joi.string()))
      .optional(),
    isPublished: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    authorName: Joi.string().optional(),
    hasTag: Joi.string().optional(),
    publishedAfter: Joi.date().iso().optional(),
    publishedBefore: Joi.date().iso().optional(),
    search: Joi.string().max(255).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
    includePhotos: Joi.boolean().optional(),
  }),

  search: Joi.object({
    q: Joi.string().min(2).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  addSection: Joi.object({
    sectionTitle: Joi.string().max(255).allow(null, "").optional(),
    sectionContent: Joi.string().required(),
    sectionImageUrl: Joi.string().uri().allow(null, "").optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
  }),

  updateSection: Joi.object({
    sectionTitle: Joi.string().max(255).allow(null, "").optional(),
    sectionContent: Joi.string().optional(),
    sectionImageUrl: Joi.string().uri().allow(null, "").optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
  }).min(1),

  reorderSections: Joi.object({
    sectionIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
  }),
};

export default blogPostSchemas;