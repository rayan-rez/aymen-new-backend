/**
 * Apartment Validation Schemas
 * Joi schemas for validating apartment requests
 *
 * @module validators/apartment.validators
 */

import Joi from "joi";
import { ApartmentStatus } from "@models/apartment.model";

/**
 * Common apartment schemas
 */
export const apartmentSchemas = {
  /**
   * Create apartment schema
   */
  create: Joi.object({
    projectId: Joi.number().integer().positive().required(),
    name: Joi.string().min(2).max(255).required(),
    unitNumber: Joi.string().max(50).allow(null, "").optional(),
    floorNumber: Joi.number().integer().min(-5).allow(null).optional(),
    title: Joi.string().max(255).allow(null, "").optional(),
    subtitle: Joi.string().max(255).allow(null, "").optional(),
    description: Joi.string().allow(null, "").optional(),
    areaSqm: Joi.number().positive().required(),
    bedrooms: Joi.number().integer().min(0).allow(null).optional(),
    bathrooms: Joi.number().integer().min(0).allow(null).optional(),
    price: Joi.number().positive().required(),
    livingRooms: Joi.number().integer().min(0).allow(null).optional(),
    kitchens: Joi.number().integer().min(0).allow(null).optional(),
    balconies: Joi.number().integer().min(0).allow(null).optional(),
    status: Joi.string()
      .valid(...Object.values(ApartmentStatus))
      .default(ApartmentStatus.AVAILABLE),
    isModelUnit: Joi.boolean().default(false),
    isPublished: Joi.boolean().default(false),
    virtualVisitUrl: Joi.string().uri().allow(null, "").optional(),
  }),

  /**
   * Update apartment schema
   */
  update: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    unitNumber: Joi.string().max(50).allow(null, "").optional(),
    floorNumber: Joi.number().integer().min(-5).allow(null).optional(),
    title: Joi.string().max(255).allow(null, "").optional(),
    subtitle: Joi.string().max(255).allow(null, "").optional(),
    description: Joi.string().allow(null, "").optional(),
    areaSqm: Joi.number().positive().optional(),
    bedrooms: Joi.number().integer().min(0).allow(null).optional(),
    bathrooms: Joi.number().integer().min(0).allow(null).optional(),
    price: Joi.number().positive().optional(),
    livingRooms: Joi.number().integer().min(0).allow(null).optional(),
    kitchens: Joi.number().integer().min(0).allow(null).optional(),
    balconies: Joi.number().integer().min(0).allow(null).optional(),
    status: Joi.string()
      .valid(...Object.values(ApartmentStatus))
      .optional(),
    isModelUnit: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
    virtualVisitUrl: Joi.string().uri().allow(null, "").optional(),
  }).min(1),

  /**
   * Get by ID params schema
   */
  getById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  /**
   * Get by project params schema
   */
  getByProject: Joi.object({
    projectId: Joi.number().integer().positive().required(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    projectId: Joi.alternatives()
      .try(
        Joi.number().integer().positive(),
        Joi.array().items(Joi.number().integer().positive())
      )
      .optional(),
    status: Joi.alternatives()
      .try(
        Joi.string().valid(...Object.values(ApartmentStatus)),
        Joi.array().items(Joi.string().valid(...Object.values(ApartmentStatus)))
      )
      .optional(),
    isPublished: Joi.boolean().optional(),
    isModelUnit: Joi.boolean().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    bedrooms: Joi.alternatives()
      .try(
        Joi.number().integer().min(0),
        Joi.array().items(Joi.number().integer().min(0))
      )
      .optional(),
    minBedrooms: Joi.number().integer().min(0).optional(),
    maxBedrooms: Joi.number().integer().min(0).optional(),
    bathrooms: Joi.alternatives()
      .try(
        Joi.number().integer().min(0),
        Joi.array().items(Joi.number().integer().min(0))
      )
      .optional(),
    minArea: Joi.number().min(0).optional(),
    maxArea: Joi.number().min(0).optional(),
    floorNumber: Joi.alternatives()
      .try(
        Joi.number().integer().min(-5),
        Joi.array().items(Joi.number().integer().min(-5))
      )
      .optional(),
    minFloor: Joi.number().integer().min(-5).optional(),
    maxFloor: Joi.number().integer().optional(),
    hasVirtualVisit: Joi.boolean().optional(),
    search: Joi.string().max(255).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
    relations: Joi.string().optional(),
  }),

  /**
   * Floor query schema
   */
  floorQuery: Joi.object({
    projectId: Joi.number().integer().positive().required(),
    floorNumber: Joi.number().integer().min(-5).required(),
  }),

  /**
   * Update status schema
   */
  updateStatus: Joi.object({
    status: Joi.string()
      .valid(...Object.values(ApartmentStatus))
      .required(),
  }),

  /**
   * Bulk update status schema
   */
  bulkUpdateStatus: Joi.object({
    ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    status: Joi.string()
      .valid(...Object.values(ApartmentStatus))
      .required(),
  }),
};

export default apartmentSchemas;
