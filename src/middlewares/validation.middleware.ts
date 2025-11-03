/**
 * Validation Middleware
 * Uses Joi for request validation
 * 
 * Install: npm install joi
 * 
 * @module middlewares/validation.middleware
 */

import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { ApiResponse } from "@/utils/response.util";

/**
 * Validation options
 */
interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

/**
 * Request validation middleware factory
 * 
 * @param schema - Joi validation schema
 * @param property - Request property to validate (body, query, params)
 * @param options - Joi validation options
 * @returns Express middleware function
 * 
 * @example
 * router.post(
 *   '/projects',
 *   validate(projectSchemas.create),
 *   projectController.createProject
 * );
 */
export const validate = (
  schema: Joi.ObjectSchema,
  property: "body" | "query" | "params" = "body",
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationOptions: Joi.ValidationOptions = {
      abortEarly: options.abortEarly ?? false,
      allowUnknown: options.allowUnknown ?? true,
      stripUnknown: options.stripUnknown ?? true,
    };

    const { error, value } = schema.validate(req[property], validationOptions);

    if (error) {
      const errors: Record<string, string> = {};
      
      error.details.forEach((detail) => {
        const key = detail.path.join(".");
        errors[key] = detail.message;
      });

      ApiResponse.badRequest(res, "Validation failed", errors);
      return;
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

/**
 * Validate multiple request properties
 * 
 * @param schemas - Object with schemas for different properties
 * @returns Express middleware function
 * 
 * @example
 * router.get(
 *   '/projects/:id',
 *   validateMultiple({
 *     params: projectSchemas.getById,
 *     query: projectSchemas.filters
 *   }),
 *   projectController.getProjectById
 * );
 */
export const validateMultiple = (schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};
    let hasError = false;

    // Validate each property
    for (const [property, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const { error, value } = schema.validate(req[property as keyof typeof schemas], {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
      });

      if (error) {
        hasError = true;
        error.details.forEach((detail) => {
          const key = `${property}.${detail.path.join(".")}`;
          errors[key] = detail.message;
        });
      } else {
        req[property as keyof typeof schemas] = value;
      }
    }

    if (hasError) {
      ApiResponse.badRequest(res, "Validation failed", errors);
      return;
    }

    next();
  };
};

export default validate;