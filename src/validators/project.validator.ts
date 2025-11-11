

/**
 * 
 * Project Validator
 */

import Joi from "joi";
import { ProjectType, ProjectStatus } from "@models/project.model";

export const projectSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    slug: Joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    description: Joi.string().allow(null, "").optional(),
    descriptionSecondary: Joi.string().allow(null, "").optional(),
    address: Joi.string().required(),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    locationId: Joi.number().integer().positive().allow(null).optional(),
    projectType: Joi.string()
      .valid(...Object.values(ProjectType))
      .default(ProjectType.RESIDENTIAL),
    status: Joi.string()
      .valid(...Object.values(ProjectStatus))
      .default(ProjectStatus.PLANNING),
    completionPercentage: Joi.number().min(0).max(100).default(0),
    estimatedCompletionDate: Joi.date().iso().allow(null).optional(),
    actualCompletionDate: Joi.date().iso().allow(null).optional(),
    totalBlocks: Joi.number().integer().positive().allow(null).optional(),
    totalUnits: Joi.number().integer().positive().allow(null).optional(),
    mainPhotoUrl: Joi.string().uri().allow(null, "").optional(),
    isFeatured: Joi.boolean().default(false),
    isPublished: Joi.boolean().default(false),
    // REMOVED: metaTitle, metaDescription
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    slug: Joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    description: Joi.string().allow(null, "").optional(),
    descriptionSecondary: Joi.string().allow(null, "").optional(),
    address: Joi.string().optional(),
    latitude: Joi.number().min(-90).max(90).allow(null).optional(),
    longitude: Joi.number().min(-180).max(180).allow(null).optional(),
    locationId: Joi.number().integer().positive().allow(null).optional(),
    projectType: Joi.string()
      .valid(...Object.values(ProjectType))
      .optional(),
    status: Joi.string()
      .valid(...Object.values(ProjectStatus))
      .optional(),
    completionPercentage: Joi.number().min(0).max(100).optional(),
    estimatedCompletionDate: Joi.date().iso().allow(null).optional(),
    actualCompletionDate: Joi.date().iso().allow(null).optional(),
    totalBlocks: Joi.number().integer().positive().allow(null).optional(),
    totalUnits: Joi.number().integer().positive().allow(null).optional(),
    mainPhotoUrl: Joi.string().uri().allow(null, "").optional(),
    isFeatured: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
    // REMOVED: metaTitle, metaDescription
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
    projectType: Joi.alternatives()
      .try(
        Joi.string().valid(...Object.values(ProjectType)),
        Joi.array().items(Joi.string().valid(...Object.values(ProjectType)))
      )
      .optional(),
    status: Joi.alternatives()
      .try(
        Joi.string().valid(...Object.values(ProjectStatus)),
        Joi.array().items(Joi.string().valid(...Object.values(ProjectStatus)))
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
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    minCompletion: Joi.number().min(0).max(100).optional(),
    maxCompletion: Joi.number().min(0).max(100).optional(),
    hasCoordinates: Joi.boolean().optional(),
    search: Joi.string().max(255).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
    relations: Joi.string().optional(),
  }),

  search: Joi.object({
    q: Joi.string().min(2).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  features: Joi.object({
    featureIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(0)
      .required(),
  }),
};

export default projectSchemas;
