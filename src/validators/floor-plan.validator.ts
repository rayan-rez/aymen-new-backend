/**
 * Floor Plan Validation Schemas
 * Joi schemas for validating floor plan requests
 *
 * @module validators/floor-plan.validators
 */

import Joi from "joi";
import { PlannableType } from "@/models/floor-plan.model";

/**
 * Common floor plan schemas
 */
export const floorPlanSchemas = {
  /**
   * Add floor plans schema
   */
  addFloorPlans: Joi.object({
    floorPlans: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().min(2).max(255).required(),
          imageUrl: Joi.string().uri().required(),
          pdfUrl: Joi.string().uri().allow(null, "").optional(),
          displayOrder: Joi.number().integer().min(0).optional(),
        })
      )
      .min(1)
      .required(),
  }),

  /**
   * Update floor plan schema
   */
  updateFloorPlan: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    imageUrl: Joi.string().uri().optional(),
    pdfUrl: Joi.string().uri().allow(null, "").optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
  }).min(1),

  /**
   * Update files schema
   */
  updateFiles: Joi.object({
    imageUrl: Joi.string().uri().optional(),
    pdfUrl: Joi.string().uri().allow(null, "").optional(),
  }).min(1),

  /**
   * Delete floor plans schema
   */
  deleteFloorPlans: Joi.object({
    floorPlanIds: Joi.array()
      .items(Joi.number().integer().positive())
      .optional(),
  }),

  /**
   * Reorder floor plans schema
   */
  reorderFloorPlans: Joi.object({
    floorPlanIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
  }),

  /**
   * Floor plan params schema
   */
  floorPlanParams: Joi.object({
    id: Joi.number().integer().positive().required(),
    floorPlanId: Joi.number().integer().positive().required(),
  }),

  /**
   * Entity ID param schema
   */
  entityIdParam: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  /**
   * Search by name query schema
   */
  searchQuery: Joi.object({
    name: Joi.string().min(2).required(),
  }),

  /**
   * Query filters schema
   */
  filters: Joi.object({
    hasPdf: Joi.boolean().optional(),
    searchName: Joi.string().optional(),
  }),
};

export default floorPlanSchemas;

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Use in routes with validation middleware:
 *
 * import { validate } from '@/middlewares/validation.middleware';
 * import floorPlanSchemas from '@/validators/floor-plan.validators';
 *
 * router.post(
 *   '/:id/floor-plans',
 *   validate(floorPlanSchemas.entityIdParam, 'params'),
 *   validate(floorPlanSchemas.addFloorPlans, 'body'),
 *   projectController.addProjectFloorPlans
 * );
 *
 * router.patch(
 *   '/:id/floor-plans/:floorPlanId',
 *   validate(floorPlanSchemas.floorPlanParams, 'params'),
 *   validate(floorPlanSchemas.updateFloorPlan, 'body'),
 *   projectController.updateProjectFloorPlan
 * );
 *
 * router.post(
 *   '/:id/floor-plans/reorder',
 *   validate(floorPlanSchemas.entityIdParam, 'params'),
 *   validate(floorPlanSchemas.reorderFloorPlans, 'body'),
 *   projectController.reorderFloorPlans
 * );
 */
