/**
 * Validation Middleware
 * Uses Joi for comprehensive request validation
 * Validates request body, query parameters, and route parameters
 *
 * Install: npm install joi
 *
 * @module middlewares/validation
 *
 * @swagger
 * components:
 *   schemas:
 *     ValidationErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Validation failed"
 *         errors:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           description: Field-specific validation errors
 *           example:
 *             name: "Name is required"
 *             email: "Email must be a valid email"
 *             price: "Price must be a positive number"
 *             status: "Status must be one of: draft, published, archived"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     ValidationOptions:
 *       type: object
 *       properties:
 *         abortEarly:
 *           type: boolean
 *           default: false
 *           description: Stop validation on first error
 *         allowUnknown:
 *           type: boolean
 *           default: true
 *           description: Allow unknown keys in object
 *         stripUnknown:
 *           type: boolean
 *           default: true
 *           description: Remove unknown keys from validated data
 *
 *   responses:
 *     ValidationError:
 *       description: Request validation failed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidationErrorResponse'
 *           examples:
 *             singleFieldError:
 *               $ref: '#/components/examples/SingleFieldValidationError'
 *             multipleFieldErrors:
 *               $ref: '#/components/examples/MultipleFieldValidationErrors'
 *             nestedFieldErrors:
 *               $ref: '#/components/examples/NestedFieldValidationErrors'
 *
 *   examples:
 *     SingleFieldValidationError:
 *       summary: Single field validation error
 *       value:
 *         success: false
 *         message: "Validation failed"
 *         errors:
 *           email: "Email is required"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     MultipleFieldValidationErrors:
 *       summary: Multiple field validation errors
 *       value:
 *         success: false
 *         message: "Validation failed"
 *         errors:
 *           name: "Name is required"
 *           email: "Email must be a valid email"
 *           price: "Price must be greater than 0"
 *           status: "Status must be one of: draft, published, archived"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     NestedFieldValidationErrors:
 *       summary: Nested field validation errors
 *       value:
 *         success: false
 *         message: "Validation failed"
 *         errors:
 *           "address.street": "Street is required"
 *           "address.city": "City is required"
 *           "contact.phone": "Phone must be a valid phone number"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     QueryValidationError:
 *       summary: Query parameter validation error
 *       value:
 *         success: false
 *         message: "Validation failed"
 *         errors:
 *           page: "Page must be a positive integer"
 *           limit: "Limit must be between 1 and 100"
 *           sortBy: "SortBy must be one of: name, date, price"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     ParamsValidationError:
 *       summary: Route parameter validation error
 *       value:
 *         success: false
 *         message: "Validation failed"
 *         errors:
 *           id: "ID must be a valid integer"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 * Features:
 * - Joi-based schema validation
 * - Validates body, query, and params
 * - Multi-property validation
 * - Detailed error messages
 * - Field path tracking for nested objects
 * - Automatic unknown field stripping
 * - Consistent error response format
 * - Type coercion support
 *
 * Validation Targets:
 * - **body**: Request body (POST, PUT, PATCH)
 * - **query**: Query string parameters (GET)
 * - **params**: Route parameters (/:id)
 *
 * @example
 * ```typescript
 * import Joi from 'joi';
 * import { validate, validateMultiple } from '@/middlewares/validation.middleware';
 *
 * // Define validation schemas
 * const projectSchemas = {
 *   create: Joi.object({
 *     name: Joi.string().required().min(3).max(100),
 *     description: Joi.string().required().min(10),
 *     price: Joi.number().positive().required(),
 *     status: Joi.string().valid('draft', 'published', 'archived'),
 *     location: Joi.object({
 *       city: Joi.string().required(),
 *       country: Joi.string().required()
 *     })
 *   }),
 *
 *   update: Joi.object({
 *     name: Joi.string().min(3).max(100),
 *     description: Joi.string().min(10),
 *     price: Joi.number().positive(),
 *     status: Joi.string().valid('draft', 'published', 'archived')
 *   }),
 *
 *   query: Joi.object({
 *     page: Joi.number().integer().positive().default(1),
 *     limit: Joi.number().integer().min(1).max(100).default(20),
 *     sortBy: Joi.string().valid('name', 'date', 'price').default('date'),
 *     order: Joi.string().valid('asc', 'desc').default('desc')
 *   }),
 *
 *   params: Joi.object({
 *     id: Joi.number().integer().positive().required()
 *   })
 * };
 *
 * // Use in routes
 * router.post('/projects',
 *   validate(projectSchemas.create),
 *   projectController.create
 * );
 *
 * router.put('/projects/:id',
 *   validate(projectSchemas.params, 'params'),
 *   validate(projectSchemas.update),
 *   projectController.update
 * );
 *
 * router.get('/projects',
 *   validate(projectSchemas.query, 'query'),
 *   projectController.list
 * );
 *
 * // Validate multiple properties at once
 * router.get('/projects/:id',
 *   validateMultiple({
 *     params: projectSchemas.params,
 *     query: projectSchemas.query
 *   }),
 *   projectController.getById
 * );
 * ```
 */

import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { ApiResponse } from "@/utils/response.util";

/**
 * @openapi
 * Validation options interface
 * Configures Joi validation behavior
 *
 * @interface ValidationOptions
 *
 * @property {boolean} [abortEarly=false] - Stop validation on first error
 * @property {boolean} [allowUnknown=true] - Allow unknown keys
 * @property {boolean} [stripUnknown=true] - Remove unknown keys
 */
interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

/**
 * @openapi
 * Request validation middleware factory
 * Creates middleware that validates specified request property
 *
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {"body" | "query" | "params"} [property="body"] - Request property to validate
 * @param {ValidationOptions} [options={}] - Joi validation options
 * @returns {Function} Express middleware function
 *
 * @example
 * ```typescript
 * import Joi from 'joi';
 * import { validate } from '@/middlewares/validation.middleware';
 *
 * // Validate request body (default)
 * const createProjectSchema = Joi.object({
 *   name: Joi.string().required().min(3),
 *   description: Joi.string().required(),
 *   price: Joi.number().positive().required()
 * });
 *
 * router.post('/projects',
 *   validate(createProjectSchema),
 *   async (req, res) => {
 *     // req.body is validated and sanitized
 *     const project = await ProjectModel.create(req.body);
 *     res.json(project);
 *   }
 * );
 *
 * // Validate query parameters
 * const querySchema = Joi.object({
 *   page: Joi.number().integer().positive().default(1),
 *   limit: Joi.number().integer().min(1).max(100).default(20),
 *   search: Joi.string().optional()
 * });
 *
 * router.get('/projects',
 *   validate(querySchema, 'query'),
 *   async (req, res) => {
 *     // req.query is validated with defaults applied
 *     const projects = await ProjectModel.paginate(req.query);
 *     res.json(projects);
 *   }
 * );
 *
 * // Validate route parameters
 * const paramsSchema = Joi.object({
 *   id: Joi.number().integer().positive().required()
 * });
 *
 * router.get('/projects/:id',
 *   validate(paramsSchema, 'params'),
 *   async (req, res) => {
 *     // req.params.id is validated
 *     const project = await ProjectModel.findById(req.params.id);
 *     res.json(project);
 *   }
 * );
 *
 * // Custom validation options
 * router.post('/projects',
 *   validate(createProjectSchema, 'body', {
 *     abortEarly: true,      // Stop on first error
 *     allowUnknown: false,   // Reject unknown fields
 *     stripUnknown: false    // Keep unknown fields
 *   }),
 *   projectController.create
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Complex nested validation
 * const projectSchema = Joi.object({
 *   name: Joi.string().required(),
 *   location: Joi.object({
 *     address: Joi.object({
 *       street: Joi.string().required(),
 *       city: Joi.string().required(),
 *       zipCode: Joi.string().pattern(/^\d{5}$/)
 *     }),
 *     coordinates: Joi.object({
 *       lat: Joi.number().min(-90).max(90),
 *       lng: Joi.number().min(-180).max(180)
 *     })
 *   }),
 *   amenities: Joi.array().items(Joi.string()).min(1),
 *   photos: Joi.array().items(
 *     Joi.object({
 *       url: Joi.string().uri().required(),
 *       caption: Joi.string().optional()
 *     })
 *   )
 * });
 *
 * router.post('/projects', validate(projectSchema), createProject);
 * ```
 *
 * @example
 * ```typescript
 * // Conditional validation
 * const apartmentSchema = Joi.object({
 *   type: Joi.string().valid('studio', '1br', '2br', '3br').required(),
 *   bedrooms: Joi.number().integer().when('type', {
 *     is: 'studio',
 *     then: Joi.equal(0),
 *     otherwise: Joi.min(1).max(3)
 *   }),
 *   bathrooms: Joi.number().positive().required(),
 *   price: Joi.number().positive().required(),
 *   available: Joi.boolean().default(true)
 * });
 *
 * router.post('/apartments', validate(apartmentSchema), createApartment);
 * ```
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
    Object.assign(req[property], value);
    next();
  };
};

/**
 * @openapi
 * Validate multiple request properties
 * Validates body, query, and params in a single middleware
 *
 * @param {Object} schemas - Object with schemas for different properties
 * @param {Joi.ObjectSchema} [schemas.body] - Body validation schema
 * @param {Joi.ObjectSchema} [schemas.query] - Query validation schema
 * @param {Joi.ObjectSchema} [schemas.params] - Params validation schema
 * @returns {Function} Express middleware function
 *
 * @example
 * ```typescript
 * import { validateMultiple } from '@/middlewares/validation.middleware';
 *
 * // Validate params and query together
 * router.get('/projects/:id',
 *   validateMultiple({
 *     params: Joi.object({
 *       id: Joi.number().integer().positive().required()
 *     }),
 *     query: Joi.object({
 *       includePhotos: Joi.boolean().default(false),
 *       includeFloorPlans: Joi.boolean().default(false)
 *     })
 *   }),
 *   async (req, res) => {
 *     const project = await ProjectModel.findById(req.params.id, req.query);
 *     res.json(project);
 *   }
 * );
 *
 * // Validate all three properties
 * router.put('/projects/:id',
 *   validateMultiple({
 *     params: Joi.object({
 *       id: Joi.number().integer().positive().required()
 *     }),
 *     body: Joi.object({
 *       name: Joi.string().min(3),
 *       description: Joi.string().min(10),
 *       price: Joi.number().positive()
 *     }),
 *     query: Joi.object({
 *       notify: Joi.boolean().default(false)
 *     })
 *   }),
 *   async (req, res) => {
 *     const project = await ProjectModel.update(
 *       req.params.id,
 *       req.body,
 *       { notify: req.query.notify }
 *     );
 *     res.json(project);
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Complex multi-property validation
 * router.post('/apartments/:projectId/units',
 *   validateMultiple({
 *     params: Joi.object({
 *       projectId: Joi.number().integer().positive().required()
 *     }),
 *     body: Joi.object({
 *       unitNumber: Joi.string().required(),
 *       floor: Joi.number().integer().min(1).required(),
 *       type: Joi.string().valid('studio', '1br', '2br', '3br'),
 *       price: Joi.number().positive().required(),
 *       available: Joi.boolean().default(true)
 *     }),
 *     query: Joi.object({
 *       sendNotification: Joi.boolean().default(true),
 *       publishImmediately: Joi.boolean().default(false)
 *     })
 *   }),
 *   async (req, res) => {
 *     const apartment = await ApartmentModel.create({
 *       projectId: req.params.projectId,
 *       ...req.body
 *     }, req.query);
 *     res.json(apartment);
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Search with filters
 * router.get('/search',
 *   validateMultiple({
 *     query: Joi.object({
 *       q: Joi.string().min(2).required(),
 *       type: Joi.string().valid('project', 'apartment', 'commercial'),
 *       minPrice: Joi.number().positive(),
 *       maxPrice: Joi.number().positive(),
 *       city: Joi.string(),
 *       page: Joi.number().integer().positive().default(1),
 *       limit: Joi.number().integer().min(1).max(100).default(20)
 *     }).and('minPrice', 'maxPrice') // Both or neither
 *   }),
 *   async (req, res) => {
 *     const results = await SearchService.search(req.query);
 *     res.json(results);
 *   }
 * );
 * ```
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

      const { error, value } = schema.validate(
        req[property as keyof typeof schemas],
        {
          abortEarly: false,
          allowUnknown: true,
          stripUnknown: true,
        }
      );

      if (error) {
        hasError = true;
        error.details.forEach((detail) => {
          const key = `${property}.${detail.path.join(".")}`;
          errors[key] = detail.message;
        });
      } else {
        Object.assign(req[property as keyof typeof schemas], value);
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