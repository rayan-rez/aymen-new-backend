/**
 * Photo Validation Schemas
 * Joi schemas for validating photo requests
 * 
 * @module validators/photo.validators
 */

import Joi from "joi";
import { PhotoableType } from "@/models/photo.model";

/**
 * Common photo schemas
 */
export const photoSchemas = {
  /**
   * Add photos schema
   */
  addPhotos: Joi.object({
    photos: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          externalUrl: Joi.string().uri().allow(null, "").optional(),
          caption: Joi.string().max(255).allow(null, "").optional(),
          displayOrder: Joi.number().integer().min(0).optional(),
          isCover: Joi.boolean().optional(),
        })
      )
      .min(1)
      .required(),
  }),

  /**
   * Update photo schema
   */
  updatePhoto: Joi.object({
    url: Joi.string().uri().optional(),
    externalUrl: Joi.string().uri().allow(null, "").optional(),
    caption: Joi.string().max(255).allow(null, "").optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
    isCover: Joi.boolean().optional(),
  }).min(1),

  /**
   * Delete photos schema
   */
  deletePhotos: Joi.object({
    photoIds: Joi.array()
      .items(Joi.number().integer().positive())
      .optional(),
  }),

  /**
   * Reorder photos schema
   */
  reorderPhotos: Joi.object({
    photoIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
  }),

  /**
   * Photo params schema
   */
  photoParams: Joi.object({
    id: Joi.number().integer().positive().required(),
    photoId: Joi.number().integer().positive().required(),
  }),

  /**
   * Entity ID param schema
   */
  entityIdParam: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

export default photoSchemas;

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Use in routes with validation middleware:
 * 
 * import { validate } from '@/middlewares/validation.middleware';
 * import photoSchemas from '@/validators/photo.validators';
 * 
 * router.post(
 *   '/:id/photos',
 *   validate(photoSchemas.entityIdParam, 'params'),
 *   validate(photoSchemas.addPhotos, 'body'),
 *   projectController.addProjectPhotos
 * );
 * 
 * router.patch(
 *   '/:id/photos/:photoId',
 *   validate(photoSchemas.photoParams, 'params'),
 *   validate(photoSchemas.updatePhoto, 'body'),
 *   projectController.updateProjectPhoto
 * );
 */