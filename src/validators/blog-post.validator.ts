/**
 * Blog Post Validation Schemas
 * Joi schemas for validating blog post requests
 *
 * @module validators/blog-post.validators
 */

import Joi from "joi";

/**
 * Common blog post schemas
 */
export const blogPostSchemas = {
  /**
   * Create blog post schema
   */
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
    readingTimeMinutes: Joi.number().integer().positive().allow(null).optional(),
    metaTitle: Joi.string().max(255).allow(null, "").optional(),
    metaDescription: Joi.string().max(500).allow(null, "").optional(),
    tags: Joi.array().items(Joi.string().max(50)).allow(null).optional(),
    isPublished: Joi.boolean().default(false),
    isFeatured: Joi.boolean().default(false),
    publishedAt: Joi.date().iso().allow(null).optional(),
  }),

  /**
   * Update blog post schema
   */
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
    readingTimeMinutes: Joi.number().integer().positive().allow(null).optional(),
    metaTitle: Joi.string().max(255).allow(null, "").optional(),
    metaDescription: Joi.string().max(500).allow(null, "").optional(),
    tags: Joi.array().items(Joi.string().max(50)).allow(null).optional(),
    isPublished: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    publishedAt: Joi.date().iso().allow(null).optional(),
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

  /**
   * Full-text search schema
   */
  search: Joi.object({
    q: Joi.string().min(2).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  /**
   * Add section schema
   */
  addSection: Joi.object({
    sectionTitle: Joi.string().max(255).allow(null, "").optional(),
    sectionContent: Joi.string().required(),
    sectionImageUrl: Joi.string().uri().allow(null, "").optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
  }),

  /**
   * Update section schema
   */
  updateSection: Joi.object({
    sectionTitle: Joi.string().max(255).allow(null, "").optional(),
    sectionContent: Joi.string().optional(),
    sectionImageUrl: Joi.string().uri().allow(null, "").optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
  }).min(1),

  /**
   * Reorder sections schema
   */
  reorderSections: Joi.object({
    sectionIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
  }),
};

export default blogPostSchemas;