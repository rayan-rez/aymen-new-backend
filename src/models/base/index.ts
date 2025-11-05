/**
 * Enhanced Base Model with Advanced Features
 *
 * @module models/base
 * @abstract
 *
 * @swagger
 * components:
 *   schemas:
 *     BaseQueryParams:
 *       type: object
 *       description: Base query parameters for filtering and pagination
 *       properties:
 *         page:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           description: Page number for pagination
 *           example: 1
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *           description: Number of items per page
 *           example: 10
 *         sortBy:
 *           type: string
 *           description: Field name to sort by
 *           example: "created_at"
 *         sortOrder:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *           description: Sort order direction
 *           example: "desc"
 *         includeDeleted:
 *           type: boolean
 *           default: false
 *           description: Include soft-deleted records in results
 *           example: false
 *         search:
 *           type: string
 *           description: Search term for full-text search
 *           example: "search term"
 *         fields:
 *           type: array
 *           items:
 *             type: string
 *           description: Specific fields to select
 *           example: ["id", "name", "email"]
 *         relations:
 *           type: array
 *           items:
 *             type: string
 *           description: Relations to eagerly load
 *           example: ["author", "comments"]
 *
 *     FilterOperator:
 *       type: string
 *       enum:
 *         - "="
 *         - "!="
 *         - ">"
 *         - ">="
 *         - "<"
 *         - "<="
 *         - "like"
 *         - "ilike"
 *         - "in"
 *         - "notIn"
 *         - "isNull"
 *         - "isNotNull"
 *         - "between"
 *       description: Filter comparison operators
 *       example: "="
 *
 *     FilterCondition:
 *       type: object
 *       required:
 *         - field
 *         - operator
 *       properties:
 *         field:
 *           type: string
 *           description: Field name to filter on
 *           example: "status"
 *         operator:
 *           $ref: '#/components/schemas/FilterOperator'
 *         value:
 *           description: Value to compare against (not required for isNull/isNotNull)
 *           example: "active"
 *       example:
 *         field: "status"
 *         operator: "="
 *         value: "active"
 *
 *     AdvancedQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/BaseQueryParams'
 *         - type: object
 *           properties:
 *             filters:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FilterCondition'
 *               description: Advanced filter conditions
 *               example:
 *                 - field: "status"
 *                   operator: "="
 *                   value: "active"
 *                 - field: "views"
 *                   operator: ">"
 *                   value: 100
 *             where:
 *               type: object
 *               additionalProperties: true
 *               description: Simple WHERE conditions
 *               example:
 *                 status: "active"
 *                 isPublished: true
 *             orWhere:
 *               type: object
 *               additionalProperties: true
 *               description: OR WHERE conditions
 *               example:
 *                 status: "draft"
 *                 status: "pending"
 *             whereIn:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *               description: WHERE IN conditions
 *               example:
 *                 id: [1, 2, 3, 4]
 *                 category: ["tech", "science"]
 *             whereBetween:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 minItems: 2
 *                 maxItems: 2
 *               description: WHERE BETWEEN conditions
 *               example:
 *                 createdAt: ["2024-01-01", "2024-12-31"]
 *                 views: [100, 1000]
 *             groupBy:
 *               type: array
 *               items:
 *                 type: string
 *               description: Fields to group by
 *               example: ["category", "status"]
 *             having:
 *               type: string
 *               description: HAVING clause (raw SQL)
 *               example: "COUNT(*) > 5"
 *
 *     PaginationMetadata:
 *       type: object
 *       required:
 *         - total
 *         - page
 *         - limit
 *         - totalPages
 *         - hasNextPage
 *         - hasPrevPage
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of records
 *           example: 150
 *         page:
 *           type: integer
 *           description: Current page number
 *           example: 2
 *         limit:
 *           type: integer
 *           description: Items per page
 *           example: 10
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *           example: 15
 *         hasNextPage:
 *           type: boolean
 *           description: Whether there is a next page
 *           example: true
 *         hasPrevPage:
 *           type: boolean
 *           description: Whether there is a previous page
 *           example: true
 *
 *     PaginatedResult:
 *       type: object
 *       required:
 *         - items
 *         - pagination
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *           description: Array of result items
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMetadata'
 *       example:
 *         items:
 *           - id: 1
 *             name: "Item 1"
 *           - id: 2
 *             name: "Item 2"
 *         pagination:
 *           total: 150
 *           page: 1
 *           limit: 10
 *           totalPages: 15
 *           hasNextPage: true
 *           hasPrevPage: false
 *
 *     BatchOperationResult:
 *       type: object
 *       required:
 *         - success
 *         - processed
 *         - failed
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the operation was successful
 *           example: true
 *         processed:
 *           type: integer
 *           description: Number of successfully processed items
 *           example: 95
 *         failed:
 *           type: integer
 *           description: Number of failed items
 *           example: 5
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: ID of the failed item (if applicable)
 *               error:
 *                 type: string
 *                 description: Error message
 *           description: Array of errors for failed items
 *           example:
 *             - id: 10
 *               error: "Validation failed: name is required"
 *             - id: 25
 *               error: "Duplicate key violation"
 *
 *     RelationType:
 *       type: string
 *       enum:
 *         - hasOne
 *         - hasMany
 *         - belongsTo
 *         - belongsToMany
 *       description: Type of relationship between models
 *       example: "hasMany"
 *
 *     RelationDefinition:
 *       type: object
 *       required:
 *         - type
 *         - model
 *         - foreignKey
 *       properties:
 *         type:
 *           $ref: '#/components/schemas/RelationType'
 *         model:
 *           type: string
 *           description: Related model class name
 *           example: "User"
 *         foreignKey:
 *           type: string
 *           description: Foreign key column name
 *           example: "user_id"
 *         localKey:
 *           type: string
 *           description: Local key column name (default: "id")
 *           example: "id"
 *         pivotTable:
 *           type: string
 *           description: Pivot table name (for belongsToMany)
 *           example: "user_roles"
 *         pivotForeignKey:
 *           type: string
 *           description: Foreign key in pivot table
 *           example: "user_id"
 *         pivotRelatedKey:
 *           type: string
 *           description: Related key in pivot table
 *           example: "role_id"
 *
 *     ModelConfig:
 *       type: object
 *       properties:
 *         softDelete:
 *           type: boolean
 *           default: true
 *           description: Enable soft delete functionality
 *           example: true
 *         timestamps:
 *           type: boolean
 *           default: true
 *           description: Auto-manage created_at and updated_at timestamps
 *           example: true
 *         defaultSortColumn:
 *           type: string
 *           default: "created_at"
 *           description: Default column for sorting
 *           example: "created_at"
 *         defaultSortOrder:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *           description: Default sort order
 *           example: "desc"
 *         searchableColumns:
 *           type: array
 *           items:
 *             type: string
 *           description: Columns available for full-text search
 *           example: ["title", "description", "content"]
 *         hiddenFields:
 *           type: array
 *           items:
 *             type: string
 *           description: Fields to hide from responses
 *           example: ["password", "token"]
 *         fillable:
 *           type: array
 *           items:
 *             type: string
 *           description: Fields that can be mass-assigned
 *           example: ["name", "email", "status"]
 *         guarded:
 *           type: array
 *           items:
 *             type: string
 *           description: Fields protected from mass-assignment
 *           example: ["id", "created_at", "updated_at", "deleted_at"]
 *
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - error
 *         - message
 *       properties:
 *         error:
 *           type: string
 *           description: Error type
 *           example: "ValidationError"
 *         message:
 *           type: string
 *           description: Error message
 *           example: "Record not found"
 *         details:
 *           type: object
 *           description: Additional error details
 *           example:
 *             field: "email"
 *             constraint: "unique"
 *
 *   parameters:
 *     PageParam:
 *       name: page
 *       in: query
 *       description: Page number for pagination
 *       required: false
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       example: 1
 *
 *     LimitParam:
 *       name: limit
 *       in: query
 *       description: Number of items per page
 *       required: false
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 10
 *       example: 10
 *
 *     SortByParam:
 *       name: sortBy
 *       in: query
 *       description: Field name to sort by
 *       required: false
 *       schema:
 *         type: string
 *       example: "created_at"
 *
 *     SortOrderParam:
 *       name: sortOrder
 *       in: query
 *       description: Sort order direction
 *       required: false
 *       schema:
 *         type: string
 *         enum: [asc, desc]
 *         default: desc
 *       example: "desc"
 *
 *     SearchParam:
 *       name: search
 *       in: query
 *       description: Search term for full-text search
 *       required: false
 *       schema:
 *         type: string
 *       example: "search term"
 *
 *     IncludeDeletedParam:
 *       name: includeDeleted
 *       in: query
 *       description: Include soft-deleted records
 *       required: false
 *       schema:
 *         type: boolean
 *         default: false
 *       example: false
 *
 *     RelationsParam:
 *       name: relations
 *       in: query
 *       description: Comma-separated list of relations to load
 *       required: false
 *       schema:
 *         type: string
 *       example: "author,comments,tags"
 *
 *     IdParam:
 *       name: id
 *       in: path
 *       description: Resource ID
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 1
 *
 *   responses:
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             error: "NotFoundError"
 *             message: "Record not found in table_name"
 *
 *     ValidationError:
 *       description: Validation error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             error: "ValidationError"
 *             message: "Validation failed"
 *             details:
 *               field: "email"
 *               constraint: "Invalid email format"
 *
 *     DatabaseError:
 *       description: Database operation error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             error: "DatabaseError"
 *             message: "Database connection unavailable"
 *
 *     UnauthorizedError:
 *       description: Unauthorized access
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             error: "UnauthorizedError"
 *             message: "Authentication required"
 *
 * Features:
 * - Full TypeScript type safety
 * - Advanced filtering and querying with multiple operators
 * - Transaction support for data consistency
 * - Relation loading (eager/lazy) with optimization
 * - Query builder extensions for complex queries
 * - Batch operations with chunking and error handling
 * - Custom column mapping (camelCase <-> snake_case)
 * - Lifecycle hooks (beforeCreate, afterCreate, etc.)
 * - Soft delete with restore functionality
 * - Full-text search capability
 * - Pagination with metadata
 * - Field-level security (fillable/guarded)
 * - Hidden fields for sensitive data
 */

import { Knex } from "knex";
import db from "@/config/database";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * Base query parameters with advanced filtering capabilities.
 * Used across all model queries for consistent pagination and filtering.
 */
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeDeleted?: boolean;
  search?: string;
  fields?: string[];
  relations?: string[];
}

export interface DatabaseRecord {
  [key: string]: any;
}

/**
 * @openapi
 * Advanced filter operators for complex queries.
 * Supports comparison, pattern matching, null checks, and range queries.
 */
export type FilterOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "like"
  | "ilike"
  | "in"
  | "notIn"
  | "isNull"
  | "isNotNull"
  | "between";

/**
 * @openapi
 * Filter condition for advanced querying.
 * Combines a field, operator, and optional value to create flexible queries.
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: any;
}

/**
 * @openapi
 * Advanced query options extending base parameters.
 * Provides comprehensive filtering, sorting, grouping, and aggregation capabilities.
 */
export interface AdvancedQueryOptions extends BaseQueryParams {
  filters?: FilterCondition[];
  where?: Partial<Record<string, any>>;
  orWhere?: Partial<Record<string, any>>;
  whereIn?: Record<string, any[]>;
  whereBetween?: Record<string, [any, any]>;
  groupBy?: string[];
  having?: string;
}

/**
 * @openapi
 * Paginated result with comprehensive metadata.
 * Includes navigation information for building pagination UI.
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * @openapi
 * Batch operation result with detailed processing information.
 * Tracks success/failure counts and provides error details for debugging.
 */
export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ id?: number; error: string }>;
}

/**
 * @openapi
 * Relation definition for model relationships.
 * Supports hasOne, hasMany, belongsTo, and belongsToMany relationships.
 */
export interface RelationDefinition {
  type: "hasOne" | "hasMany" | "belongsTo" | "belongsToMany";
  model: () => BaseModel<any, any, any>;
  foreignKey: string;
  localKey?: string;
  pivotTable?: string;
  pivotForeignKey?: string;
  pivotRelatedKey?: string;
}

/**
 * @openapi
 * Model configuration options.
 * Controls behavior for timestamps, soft deletes, searching, and field protection.
 */
export interface ModelConfig {
  softDelete?: boolean;
  timestamps?: boolean;
  defaultSortColumn?: string;
  defaultSortOrder?: "asc" | "desc";
  searchableColumns?: string[];
  hiddenFields?: string[];
  fillable?: string[];
  guarded?: string[];
}

// ============================================================================
// ABSTRACT BASE MODEL
// ============================================================================

/**
 * @openapi
 * Abstract base model providing comprehensive CRUD operations,
 * advanced querying, transactions, and relationship management.
 *
 * @template T - Entity type
 * @template TCreate - Creation data type
 * @template TUpdate - Update data type
 *
 * @abstract
 * @class BaseModel
 *
 * @example
 * ```typescript
 * // Define a User model
 * class UserModel extends BaseModel<User, CreateUserDTO, UpdateUserDTO> {
 *   protected tableName = 'users';
 *   protected primaryKey = 'id';
 *
 *   protected config: ModelConfig = {
 *     softDelete: true,
 *     timestamps: true,
 *     searchableColumns: ['name', 'email'],
 *     hiddenFields: ['password'],
 *     fillable: ['name', 'email', 'role'],
 *   };
 *
 *   protected mapToEntity(record: any): User {
 *     return {
 *       id: record.id,
 *       name: record.name,
 *       email: record.email,
 *       createdAt: record.created_at,
 *     };
 *   }
 * }
 *
 * // Usage
 * const userModel = new UserModel();
 * const user = await userModel.create({ name: 'John', email: 'john@example.com' });
 * const users = await userModel.paginate({ page: 1, limit: 10 });
 * ```
 */
export abstract class BaseModel<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  // ------------------------------------------------------------------------
  // ABSTRACT PROPERTIES (Must be implemented by child classes)
  // ------------------------------------------------------------------------

  /**
   * Database table name.
   * Must be set by child classes.
   * @abstract
   */
  protected abstract tableName: string;

  /**
   * Primary key column name.
   * Defaults to 'id' but can be overridden.
   */
  protected primaryKey: string = "id";

  /**
   * Model configuration settings.
   * Controls timestamps, soft deletes, sorting, searching, and field protection.
   */
  protected config: ModelConfig = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "created_at",
    defaultSortOrder: "desc",
    searchableColumns: [],
    hiddenFields: [],
    fillable: [],
    guarded: ["id", "created_at", "updated_at", "deleted_at"],
  };

  /**
   * Relations definition mapping.
   * Define model relationships here.
   */
  protected relations: Record<string, RelationDefinition> = {};

  /**
   * Database connection instance.
   * Can be overridden for multi-database support.
   */
  protected db: Knex;

  /**
   * Column name mapping for camelCase to snake_case conversion.
   * Override initializeColumnMap() to customize.
   */
  protected columnMap: Map<string, string> = new Map();

  // ------------------------------------------------------------------------
  // CONSTRUCTOR
  // ------------------------------------------------------------------------

  /**
   * @constructor
   * @param {Knex} [connection] - Optional database connection (defaults to main db)
   */
  constructor(connection?: Knex) {
    this.db = connection || db;
    this.validateConnection();
    this.initializeColumnMap();
  }

  /**
   * Validates database connection on initialization.
   * @private
   * @throws {Error} When database connection fails
   */
  private async validateConnection(): Promise<void> {
    try {
      await this.db.raw("SELECT 1");
    } catch (error) {
      console.error(`[${this.tableName}] Database connection failed:`, error);
      throw new Error("Database connection unavailable");
    }
  }

  // ------------------------------------------------------------------------
  // LIFECYCLE HOOKS (Override in child classes)
  // ------------------------------------------------------------------------

  /**
   * Hook called before creating a record.
   * Override to modify data or perform validation.
   * @param {TCreate} data - Data to be created
   * @returns {Promise<TCreate>} Modified data
   */
  protected async beforeCreate?(data: TCreate): Promise<TCreate>;

  /**
   * Hook called after creating a record.
   * Override for post-creation side effects.
   * @param {T} entity - Created entity
   */
  protected async afterCreate?(entity: T): Promise<void>;

  /**
   * Hook called before updating a record.
   * Override to modify data or perform validation.
   * @param {number} id - Record ID
   * @param {TUpdate} data - Update data
   * @returns {Promise<TUpdate>} Modified data
   */
  protected async beforeUpdate?(id: number, data: TUpdate): Promise<TUpdate>;

  /**
   * Hook called after updating a record.
   * Override for post-update side effects.
   * @param {T} entity - Updated entity
   */
  protected async afterUpdate?(entity: T): Promise<void>;

  /**
   * Hook called before deleting a record.
   * Override to perform cleanup or validation.
   * @param {number} id - Record ID
   */
  protected async beforeDelete?(id: number): Promise<void>;

  /**
   * Hook called after deleting a record.
   * Override for post-deletion side effects.
   * @param {number} id - Deleted record ID
   */
  protected async afterDelete?(id: number): Promise<void>;

  // ------------------------------------------------------------------------
  // CORE CRUD OPERATIONS
  // ------------------------------------------------------------------------

  /**
   * Creates a new record with lifecycle hooks.
   *
   * @openapi
   * Creates a new record in the database with automatic timestamp management,
   * field filtering, and lifecycle hook execution.
   *
   * @param {TCreate} data - Data for the new record
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T>} Created entity
   * @throws {Error} When creation fails or validation errors occur
   *
   * @example
   * ```typescript
   * const user = await userModel.create({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   role: 'user'
   * });
   * ```
   */
  async create(data: TCreate, trx?: Knex.Transaction): Promise<T> {
    const connection = trx || this.db;

    // Before create hook
    let processedData = data;
    if (this.beforeCreate) {
      processedData = await this.beforeCreate(data);
    }

    // Filter fillable/guarded fields
    const filteredData = this.filterFields(processedData);
    const dbData = this.mapToDatabase(filteredData);

    // Add timestamps
    if (this.config.timestamps) {
      dbData.created_at = connection.fn.now();
      dbData.updated_at = connection.fn.now();
    }

    const [id] = await connection(this.tableName).insert(dbData);

    const created = await this.findById(id, { includeDeleted: true }, trx);
    if (!created) {
      throw new Error(`Failed to create record in ${this.tableName}`);
    }

    // After create hook
    if (this.afterCreate) {
      await this.afterCreate(created);
    }

    return created;
  }

  /**
   * Finds a record by ID with optional relation loading.
   *
   * @openapi
   * Retrieves a single record by its primary key. Supports eager loading
   * of relationships and optional inclusion of soft-deleted records.
   *
   * @param {number} id - Record ID
   * @param {Object} [options] - Query options
   * @param {boolean} [options.includeDeleted=false] - Include soft-deleted records
   * @param {string[]} [options.relations=[]] - Relations to load
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T | null>} Found entity or null
   *
   * @example
   * ```typescript
   * const user = await userModel.findById(1, {
   *   relations: ['posts', 'comments']
   * });
   * ```
   */
  async findById(
    id: number,
    options: { includeDeleted?: boolean; relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<T | null> {
    const connection = trx || this.db;
    let query = connection(this.tableName).where({ [this.primaryKey]: id });

    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    if (!record) return null;

    let entity = this.mapToEntity(record);

    // Load relations if requested
    if (options.relations && options.relations.length > 0) {
      entity = await this.loadRelations(entity, options.relations, trx);
    }

    return entity;
  }

  /**
   * Finds one record matching conditions.
   *
   * @openapi
   * Retrieves the first record matching the given conditions.
   * Supports advanced filtering and relation loading.
   *
   * @param {Partial<Record<string, any>>} conditions - Search conditions
   * @param {AdvancedQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T | null>} Found entity or null
   *
   * @example
   * ```typescript
   * const user = await userModel.findOne(
   *   { email: 'john@example.com' },
   *   { relations: ['profile'] }
   * );
   * ```
   */
  async findOne(
    conditions: Partial<Record<string, any>>,
    options: AdvancedQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<T | null> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = query.where(this.mapFieldsToColumns(conditions));

    const record = await query.first();
    if (!record) return null;

    let entity = this.mapToEntity(record);

    if (options.relations && options.relations.length > 0) {
      entity = await this.loadRelations(entity, options.relations, trx);
    }

    return entity;
  }

  /**
   * Finds all records with advanced filtering.
   *
   * @openapi
   * Retrieves all records matching the specified filters. Supports pagination,
   * sorting, relation loading, and complex query conditions without result limits.
   *
   * @param {AdvancedQueryOptions} [options={}] - Query options for filtering and sorting
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T[]>} Array of matching entities
   * @throws {Error} When query execution fails
   *
   * @example
   * ```typescript
   * const activeUsers = await userModel.findAll({
   *   where: { status: 'active' },
   *   sortBy: 'created_at',
   *   sortOrder: 'desc',
   *   relations: ['profile']
   * });
   * ```
   */
  async findAll(
    options: AdvancedQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<T[]> {
    const connection = trx || this.db;
    const query = this.buildQuery(connection, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    return entities;
  }

  /**
   * Paginated results with advanced filtering.
   *
   * @openapi
   * Retrieves a paginated list of records with comprehensive metadata for
   * building pagination UI. Automatically calculates total pages and navigation info.
   *
   * @param {AdvancedQueryOptions & { page: number; limit: number }} options - Pagination and query options
   * @param {number} options.page - Current page number (1-indexed)
   * @param {number} options.limit - Number of items per page
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<T>>} Paginated results with metadata
   * @throws {Error} When query execution fails
   *
   * @example
   * ```typescript
   * const result = await userModel.paginate({
   *   page: 2,
   *   limit: 20,
   *   filters: [
   *     { field: 'status', operator: '=', value: 'active' },
   *     { field: 'views', operator: '>', value: 100 }
   *   ],
   *   sortBy: 'created_at',
   *   sortOrder: 'desc'
   * });
   *
   * console.log(result.pagination.hasNextPage); // true/false
   * console.log(result.items); // Array of entities
   * ```
   */
  async paginate(
    options: AdvancedQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = options;
    const connection = trx || this.db;

    const [items, total] = await Promise.all([
      this.findAll(options, trx),
      this.count(options, trx),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Updates a record by ID with lifecycle hooks.
   *
   * @openapi
   * Updates an existing record with automatic timestamp management,
   * field filtering, and lifecycle hook execution. Respects fillable/guarded configuration.
   *
   * @param {number} id - Record ID to update
   * @param {TUpdate} data - Update data
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T | null>} Updated entity or null if not found
   * @throws {Error} When update fails
   *
   * @example
   * ```typescript
   * const updated = await userModel.update(1, {
   *   name: 'Jane Doe',
   *   status: 'inactive'
   * });
   * ```
   */
  async update(
    id: number,
    data: TUpdate,
    trx?: Knex.Transaction
  ): Promise<T | null> {
    const connection = trx || this.db;

    // Before update hook
    let processedData = data;
    if (this.beforeUpdate) {
      processedData = await this.beforeUpdate(id, data);
    }

    const filteredData = this.filterFields(processedData);
    const updateData = this.mapToDatabase(filteredData);

    // Update timestamp
    if (this.config.timestamps) {
      updateData.updated_at = connection.fn.now();
    }

    await connection(this.tableName)
      .where({ [this.primaryKey]: id })
      .update(updateData);

    const updated = await this.findById(id, { includeDeleted: true }, trx);

    // After update hook
    if (updated && this.afterUpdate) {
      await this.afterUpdate(updated);
    }

    return updated;
  }

  /**
   * Deletes or soft-deletes a record.
   *
   * @openapi
   * Removes a record from the database. If soft delete is enabled, marks the record
   * as deleted without removing it. Otherwise performs a hard delete.
   *
   * @param {number} id - Record ID to delete
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if deleted successfully, false otherwise
   * @throws {Error} When deletion fails
   *
   * @example
   * ```typescript
   * const deleted = await userModel.delete(1);
   * if (deleted) {
   *   console.log('User deleted successfully');
   * }
   * ```
   */
  async delete(id: number, trx?: Knex.Transaction): Promise<boolean> {
    const connection = trx || this.db;

    // Before delete hook
    if (this.beforeDelete) {
      await this.beforeDelete(id);
    }

    let deleted: number;

    if (this.config.softDelete) {
      deleted = await connection(this.tableName)
        .where({ [this.primaryKey]: id })
        .whereNull("deleted_at")
        .update({
          deleted_at: connection.fn.now(),
          ...(this.config.timestamps && { updated_at: connection.fn.now() }),
        });
    } else {
      deleted = await connection(this.tableName)
        .where({ [this.primaryKey]: id })
        .del();
    }

    // After delete hook
    if (deleted > 0 && this.afterDelete) {
      await this.afterDelete(id);
    }

    return deleted > 0;
  }

  /**
   * Restores a soft-deleted record.
   *
   * @openapi
   * Restores a previously soft-deleted record by setting deleted_at to null.
   * Only works when soft delete is enabled in model configuration.
   *
   * @param {number} id - Record ID to restore
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if restored successfully, false otherwise
   * @throws {Error} When soft delete is not enabled or restoration fails
   *
   * @example
   * ```typescript
   * const restored = await userModel.restore(1);
   * if (restored) {
   *   console.log('User restored successfully');
   * }
   * ```
   */
  async restore(id: number, trx?: Knex.Transaction): Promise<boolean> {
    if (!this.config.softDelete) {
      throw new Error(`Soft delete not supported for ${this.tableName}`);
    }

    const connection = trx || this.db;

    const updated = await connection(this.tableName)
      .where({ [this.primaryKey]: id })
      .whereNotNull("deleted_at")
      .update({
        deleted_at: null,
        ...(this.config.timestamps && { updated_at: connection.fn.now() }),
      });

    return updated > 0;
  }

  /**
   * Hard deletes a record (bypass soft delete).
   *
   * @openapi
   * Permanently removes a record from the database, bypassing soft delete
   * configuration. This operation cannot be undone.
   *
   * @param {number} id - Record ID to permanently delete
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if deleted successfully, false otherwise
   * @throws {Error} When deletion fails
   *
   * @example
   * ```typescript
   * const deleted = await userModel.forceDelete(1);
   * if (deleted) {
   *   console.log('User permanently deleted');
   * }
   * ```
   */

  async forceDelete(id: number, trx?: Knex.Transaction): Promise<boolean> {
    const connection = trx || this.db;

    if (this.beforeDelete) {
      await this.beforeDelete(id);
    }

    const deleted = await connection(this.tableName)
      .where({ [this.primaryKey]: id })
      .del();

    if (deleted > 0 && this.afterDelete) {
      await this.afterDelete(id);
    }

    return deleted > 0;
  }

  // ------------------------------------------------------------------------
  // BATCH OPERATIONS
  // ------------------------------------------------------------------------

  /**
   * Optimized bulk create with transaction support.
   *
   * @openapi
   * Creates multiple records in a single transaction with automatic chunking
   * for better performance. All records are inserted or none (atomic operation).
   *
   * @param {TCreate[]} items - Array of items to create
   * @param {Object} [options] - Bulk operation options
   * @param {number} [options.chunkSize=100] - Number of items per chunk
   * @returns {Promise<BatchOperationResult>} Operation result with success/failure counts
   * @throws {Error} When transaction fails
   *
   * @example
   * ```typescript
   * const result = await userModel.bulkCreate([
   *   { name: 'User 1', email: 'user1@example.com' },
   *   { name: 'User 2', email: 'user2@example.com' },
   *   { name: 'User 3', email: 'user3@example.com' }
   * ], { chunkSize: 50 });
   *
   * console.log(`Processed: ${result.processed}, Failed: ${result.failed}`);
   * ```
   */
  async bulkCreate(
    items: TCreate[],
    options: { chunkSize?: number } = {}
  ): Promise<BatchOperationResult> {
    if (items.length === 0) {
      return { success: true, processed: 0, failed: 0 };
    }

    const chunkSize = options.chunkSize || 100;
    const chunks = this.chunk(items, chunkSize);
    let processed = 0;
    let failed = 0;
    const errors: Array<{ error: string }> = [];

    const trx = await this.db.transaction();

    try {
      for (const chunk of chunks) {
        const mappedData = chunk.map((item) => {
          const filtered = this.filterFields(item);
          const dbData = this.mapToDatabase(filtered);

          if (this.config.timestamps) {
            dbData.created_at = trx.fn.now();
            dbData.updated_at = trx.fn.now();
          }

          return dbData;
        });

        await trx(this.tableName).insert(mappedData);
        processed += chunk.length;
      }

      await trx.commit();
      return { success: true, processed, failed };
    } catch (error) {
      await trx.rollback();
      errors.push({ error: (error as Error).message });
      return { success: false, processed, failed: items.length, errors };
    }
  }

  /**
   * Optimized bulk update.
   *
   * @openapi
   * Updates multiple records in a transaction. Processes each update individually
   * and tracks success/failure counts with detailed error information.
   *
   * @param {Array<{ id: number; data: TUpdate }>} updates - Array of update operations
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BatchOperationResult>} Operation result with errors for failed updates
   * @throws {Error} When transaction fails
   *
   * @example
   * ```typescript
   * const result = await userModel.bulkUpdate([
   *   { id: 1, data: { status: 'active' } },
   *   { id: 2, data: { status: 'inactive' } },
   *   { id: 3, data: { status: 'active' } }
   * ]);
   *
   * if (!result.success) {
   *   console.log('Some updates failed:', result.errors);
   * }
   * ```
   */
  async bulkUpdate(
    updates: Array<{ id: number; data: TUpdate }>,
    trx?: Knex.Transaction // Changed from options object to transaction
  ): Promise<BatchOperationResult> {
    let processed = 0;
    let failed = 0;
    const errors: Array<{ id?: number; error: string }> = [];

    const connection = trx || this.db;
    const shouldCommit = !trx;
    const localTrx = trx || (await this.db.transaction());

    try {
      for (const { id, data } of updates) {
        try {
          const filtered = this.filterFields(data);
          const updateData = this.mapToDatabase(filtered);

          if (this.config.timestamps) {
            updateData.updated_at = localTrx.fn.now();
          }

          await localTrx(this.tableName)
            .where({ [this.primaryKey]: id })
            .update(updateData);

          processed++;
        } catch (error) {
          failed++;
          errors.push({ id, error: (error as Error).message });
        }
      }

      if (shouldCommit) {
        await localTrx.commit();
      }

      return { success: failed === 0, processed, failed, errors };
    } catch (error) {
      if (shouldCommit) {
        await localTrx.rollback();
      }
      throw error;
    }
  }

  /**
   * Bulk delete records.
   *
   * @openapi
   * Deletes multiple records in a single transaction. Respects soft delete
   * configuration unless force option is specified.
   *
   * @param {number[]} ids - Array of record IDs to delete
   * @param {Object} [options] - Deletion options
   * @param {boolean} [options.force=false] - Force permanent deletion (bypass soft delete)
   * @returns {Promise<BatchOperationResult>} Operation result with deletion count
   * @throws {Error} When transaction fails
   *
   * @example
   * ```typescript
   * // Soft delete multiple users
   * const result = await userModel.bulkDelete([1, 2, 3]);
   *
   * // Force permanent deletion
   * const result = await userModel.bulkDelete([4, 5, 6], { force: true });
   * ```
   */
  async bulkDelete(
    ids: number[],
    options: { force?: boolean } = {}
  ): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { success: true, processed: 0, failed: 0 };
    }

    const trx = await this.db.transaction();

    try {
      let deleted: number;

      if (this.config.softDelete && !options.force) {
        deleted = await trx(this.tableName)
          .whereIn(this.primaryKey, ids)
          .whereNull("deleted_at")
          .update({
            deleted_at: trx.fn.now(),
            ...(this.config.timestamps && { updated_at: trx.fn.now() }),
          });
      } else {
        deleted = await trx(this.tableName).whereIn(this.primaryKey, ids).del();
      }

      await trx.commit();
      return { success: true, processed: deleted, failed: 0 };
    } catch (error) {
      await trx.rollback();
      return {
        success: false,
        processed: 0,
        failed: ids.length,
        errors: [{ error: (error as Error).message }],
      };
    }
  }

  // ------------------------------------------------------------------------
  // QUERY UTILITIES
  // ------------------------------------------------------------------------

  /**
   * Counts records with advanced filtering.
   *
   * @openapi
   * Returns the total count of records matching the specified filters.
   * Respects soft delete configuration and supports all query options.
   *
   * @param {AdvancedQueryOptions} [options={}] - Query options for filtering
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Total count of matching records
   * @throws {Error} When query execution fails
   *
   * @example
   * ```typescript
   * const count = await userModel.count({
   *   where: { status: 'active' },
   *   filters: [
   *     { field: 'views', operator: '>', value: 100 }
   *   ]
   * });
   * console.log(`Found ${count} active users with over 100 views`);
   * ```
   */
  async count(
    options: AdvancedQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    // Apply soft delete filter
    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    // Apply filters
    query = this.applyFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Checks if record exists.
   *
   * @openapi
   * Verifies whether a record matching the given conditions exists in the database.
   * More efficient than fetching the full record when only existence matters.
   *
   * @param {Partial<Record<string, any>>} conditions - Search conditions
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if record exists, false otherwise
   * @throws {Error} When query execution fails
   *
   * @example
   * ```typescript
   * const emailExists = await userModel.exists({
   *   email: 'john@example.com'
   * });
   *
   * if (emailExists) {
   *   throw new Error('Email already in use');
   * }
   * ```
   */
  async exists(
    conditions: Partial<Record<string, any>>,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const count = await this.count({ where: conditions }, trx);
    return count > 0;
  }

  /**
   * Gets first record or throws error.
   *
   * @openapi
   * Retrieves the first record matching conditions or throws an error if not found.
   * Useful when a record is expected to exist and absence is an error condition.
   *
   * @param {Partial<Record<string, any>>} conditions - Search conditions
   * @param {AdvancedQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T>} Found entity (never null)
   * @throws {Error} When record is not found or query fails
   *
   * @example
   * ```typescript
   * try {
   *   const user = await userModel.findOrFail({
   *     email: 'john@example.com'
   *   });
   *   // User exists, proceed with operations
   * } catch (error) {
   *   // User not found, handle error
   *   console.error('User not found');
   * }
   * ```
   */
  async findOrFail(
    conditions: Partial<Record<string, any>>,
    options: AdvancedQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<T> {
    const entity = await this.findOne(conditions, options, trx);
    if (!entity) {
      throw new Error(`Record not found in ${this.tableName}`);
    }
    return entity;
  }

  /**
   * Gets first record or creates new one.
   *
   * @openapi
   * Attempts to find a record matching conditions. If not found, creates a new
   * record with the provided data. Returns both the entity and a flag indicating
   * whether it was newly created.
   *
   * @param {Partial<Record<string, any>>} conditions - Search conditions
   * @param {TCreate} data - Data for new record if not found
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<{ entity: T; created: boolean }>} Entity and creation flag
   * @throws {Error} When query or creation fails
   *
   * @example
   * ```typescript
   * const { entity, created } = await userModel.firstOrCreate(
   *   { email: 'john@example.com' },
   *   {
   *     email: 'john@example.com',
   *     name: 'John Doe',
   *     role: 'user'
   *   }
   * );
   *
   * if (created) {
   *   console.log('New user created');
   * } else {
   *   console.log('Existing user found');
   * }
   * ```
   */
  async firstOrCreate(
    conditions: Partial<Record<string, any>>,
    data: TCreate,
    trx?: Knex.Transaction
  ): Promise<{ entity: T; created: boolean }> {
    const existing = await this.findOne(conditions, {}, trx);
    if (existing) {
      return { entity: existing, created: false };
    }

    const entity = await this.create(data, trx);
    return { entity, created: true };
  }

  /**
   * Updates or creates record.
   *
   * @openapi
   * Attempts to find and update a record matching conditions. If not found,
   * creates a new record with the provided data. Also known as "upsert".
   *
   * @param {Partial<Record<string, any>>} conditions - Search conditions
   * @param {TCreate} data - Data for update or creation
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<{ entity: T; created: boolean }>} Entity and creation flag
   * @throws {Error} When query, update, or creation fails
   *
   * @example
   * ```typescript
   * const { entity, created } = await userModel.updateOrCreate(
   *   { email: 'john@example.com' },
   *   {
   *     email: 'john@example.com',
   *     name: 'John Smith',
   *     status: 'active'
   *   }
   * );
   *
   * if (created) {
   *   console.log('New user created');
   * } else {
   *   console.log('Existing user updated');
   * }
   * ```
   */
  async updateOrCreate(
    conditions: Partial<Record<string, any>>,
    data: TCreate,
    trx?: Knex.Transaction
  ): Promise<{ entity: T; created: boolean }> {
    const existing = await this.findOne(conditions, {}, trx);
    if (existing) {
      const updated = await this.update(
        (existing as any)[this.primaryKey],
        data as unknown as TUpdate,
        trx
      );
      return { entity: updated!, created: false };
    }

    const entity = await this.create(data, trx);
    return { entity, created: true };
  }

  /**
   * Advanced search with full-text support.
   *
   * @openapi
   * Performs full-text search across configured searchable columns using LIKE
   * pattern matching. Combines with other query options for filtered search results.
   *
   * @param {string} searchTerm - Search term to match against searchable columns
   * @param {AdvancedQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T[]>} Array of matching entities
   * @throws {Error} When query execution fails
   *
   * @example
   * ```typescript
   * const results = await userModel.search('john', {
   *   where: { status: 'active' },
   *   sortBy: 'created_at',
   *   relations: ['profile']
   * });
   *
   * // Searches across all searchableColumns configured in the model
   * ```
   */
  async search(
    searchTerm: string,
    options: AdvancedQueryOptions & { isPublished?: boolean } = {},
    trx?: Knex.Transaction
  ): Promise<T[]> {
    if (!searchTerm || this.config.searchableColumns!.length === 0) {
      return this.findAll(options, trx);
    }

    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = query.where((builder) => {
      for (const column of this.config.searchableColumns!) {
        builder.orWhere(column, "like", `%${searchTerm}%`);
      }
    });

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  // ------------------------------------------------------------------------
  // RELATION LOADING
  // ------------------------------------------------------------------------

  /**
   * Loads relations for a single entity.
   *
   * @openapi
   * Eagerly loads specified relationships for a single entity. Supports hasOne,
   * hasMany, belongsTo, and belongsToMany relationship types.
   *
   * @protected
   * @param {T} entity - Entity to load relations for
   * @param {string[]} relationNames - Array of relation names to load
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T>} Entity with loaded relations
   * @throws {Error} When relation loading fails
   *
   * @example
   * ```typescript
   * // In child class
   * const userWithRelations = await this.loadRelations(
   *   user,
   *   ['posts', 'comments', 'profile']
   * );
   * ```
   */
  protected async loadRelations(
    entity: T,
    relationNames: string[],
    trx?: Knex.Transaction
  ): Promise<T> {
    const entityWithRelations = { ...entity } as any;

    for (const relationName of relationNames) {
      const relation = this.relations[relationName];
      if (!relation) continue;

      const relatedModel = relation.model();
      const foreignKeyValue = (entity as any)[relation.foreignKey];

      if (!foreignKeyValue) continue;

      if (relation.type === "hasOne" || relation.type === "belongsTo") {
        entityWithRelations[relationName] = await relatedModel.findOne(
          { [relation.localKey || "id"]: foreignKeyValue },
          {},
          trx
        );
      } else if (relation.type === "hasMany") {
        entityWithRelations[relationName] = await relatedModel.findAll(
          { where: { [relation.foreignKey]: foreignKeyValue } },
          trx
        );
      }
    }

    return entityWithRelations;
  }

  /**
   * Loads relations for multiple entities (optimized with eager loading).
   *
   * @openapi
   * Efficiently loads relationships for multiple entities in a single query per
   * relation to avoid N+1 query problems. Maps related entities back to parents.
   *
   * @protected
   * @param {T[]} entities - Array of entities to load relations for
   * @param {string[]} relationNames - Array of relation names to load
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T[]>} Entities with loaded relations
   * @throws {Error} When relation loading fails
   *
   * @example
   * ```typescript
   * // In child class - optimized for multiple records
   * const usersWithRelations = await this.loadRelationsForMany(
   *   users,
   *   ['posts', 'comments']
   * );
   * // Loads all posts and comments in just 2 queries instead of N queries
   * ```
   */
  protected async loadRelationsForMany(
    entities: T[],
    relationNames: string[],
    trx?: Knex.Transaction
  ): Promise<T[]> {
    if (entities.length === 0) return entities;

    const entitiesWithRelations = entities.map((e) => ({ ...e })) as any[];

    for (const relationName of relationNames) {
      const relation = this.relations[relationName];
      if (!relation) continue;

      const relatedModel = relation.model();
      const foreignKeyValues = entities
        .map((e) => (e as any)[relation.foreignKey])
        .filter(Boolean);

      if (foreignKeyValues.length === 0) continue;

      const relatedEntities = await relatedModel.findAll(
        {
          whereIn: {
            [relation.localKey || "id"]: foreignKeyValues,
          },
        },
        trx
      );

      // Map related entities back to parent entities
      for (let i = 0; i < entitiesWithRelations.length; i++) {
        const entity = entitiesWithRelations[i];
        const foreignKeyValue = entity[relation.foreignKey];

        if (relation.type === "hasOne" || relation.type === "belongsTo") {
          entity[relationName] = relatedEntities.find(
            (re) => (re as any)[relation.localKey || "id"] === foreignKeyValue
          );
        } else if (relation.type === "hasMany") {
          entity[relationName] = relatedEntities.filter(
            (re) => (re as any)[relation.localKey || "id"] === foreignKeyValue
          );
        }
      }
    }

    return entitiesWithRelations;
  }

  // ------------------------------------------------------------------------
  // QUERY BUILDER HELPERS
  // ------------------------------------------------------------------------

  /**
   * Builds query with all filters and options.
   *
   * @openapi
   * Constructs a Knex query builder with all specified filters, sorting,
   * pagination, and grouping options applied. Central query building method.
   *
   * @protected
   * @param {Knex | Knex.Transaction} connection - Database connection or transaction
   * @param {AdvancedQueryOptions} options - Query options to apply
   * @returns {Knex.QueryBuilder} Configured query builder
   *
   * @example
   * ```typescript
   * // In child class for custom queries
   * const query = this.buildQuery(this.db, {
   *   where: { status: 'active' },
   *   sortBy: 'created_at',
   *   limit: 10
   * });
   * const records = await query;
   * ```
   */
  protected buildQuery(
    connection: Knex | Knex.Transaction,
    options: AdvancedQueryOptions
  ): Knex.QueryBuilder {
    let query = connection(this.tableName);

    // Soft delete filter
    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    // Select specific fields
    if (options.fields && options.fields.length > 0) {
      const mappedFields = options.fields.map(
        (f) => this.columnMap.get(f) || f
      );
      query = query.select(mappedFields);
    }

    // Apply filters
    query = this.applyFilters(query, options);

    // Sorting
    const sortBy = options.sortBy || this.config.defaultSortColumn!;
    const sortOrder = options.sortOrder || this.config.defaultSortOrder!;
    const sortColumn = this.columnMap.get(sortBy) || sortBy;
    query = query.orderBy(sortColumn, sortOrder);

    // Group by
    if (options.groupBy && options.groupBy.length > 0) {
      query = query.groupBy(options.groupBy);
    }

    // Having
    if (options.having) {
      query = query.havingRaw(options.having);
    }

    // Pagination
    if (options.page && options.limit) {
      const offset = (options.page - 1) * options.limit;
      query = query.limit(options.limit).offset(offset);
    }

    return query;
  }

  /**
   * Applies advanced filters to query.
   *
   * @openapi
   * Applies various filter types (where, whereIn, whereBetween, advanced filters)
   * to a query builder. Handles operator-based filtering and search terms.
   *
   * @protected
   * @param {Knex.QueryBuilder} query - Query builder to apply filters to
   * @param {AdvancedQueryOptions} options - Filter options
   * @returns {Knex.QueryBuilder} Query builder with filters applied
   *
   * @example
   * ```typescript
   * // In child class
   * let query = this.db(this.tableName);
   * query = this.applyFilters(query, {
   *   filters: [
   *     { field: 'status', operator: '=', value: 'active' },
   *     { field: 'views', operator: '>', value: 100 }
   *   ]
   * });
   * ```
   */
  protected applyFilters(
    query: Knex.QueryBuilder,
    options: AdvancedQueryOptions
  ): Knex.QueryBuilder {
    // Simple where conditions
    if (options.where) {
      query = query.where(this.mapFieldsToColumns(options.where));
    }

    // Or where conditions
    if (options.orWhere) {
      query = query.orWhere(this.mapFieldsToColumns(options.orWhere));
    }

    // Where in conditions
    if (options.whereIn) {
      for (const [field, values] of Object.entries(options.whereIn)) {
        const column = this.columnMap.get(field) || field;
        query = query.whereIn(column, values);
      }
    }

    // Where between conditions
    if (options.whereBetween) {
      for (const [field, range] of Object.entries(options.whereBetween)) {
        const column = this.columnMap.get(field) || field;
        query = query.whereBetween(column, range);
      }
    }

    // Advanced filters
    if (options.filters) {
      for (const filter of options.filters) {
        const column = this.columnMap.get(filter.field) || filter.field;

        switch (filter.operator) {
          case "=":
          case "!=":
          case ">":
          case ">=":
          case "<":
          case "<=":
            query = query.where(column, filter.operator, filter.value);
            break;
          case "like":
          case "ilike":
            query = query.where(column, filter.operator, `%${filter.value}%`);
            break;
          case "in":
            query = query.whereIn(column, filter.value);
            break;
          case "notIn":
            query = query.whereNotIn(column, filter.value);
            break;
          case "isNull":
            query = query.whereNull(column);
            break;
          case "isNotNull":
            query = query.whereNotNull(column);
            break;
          case "between":
            query = query.whereBetween(column, filter.value);
            break;
        }
      }
    }

    // Search
    if (options.search && this.config.searchableColumns!.length > 0) {
      query = query.where((builder) => {
        for (const column of this.config.searchableColumns!) {
          builder.orWhere(column, "like", `%${options.search}%`);
        }
      });
    }

    return query;
  }

  // ------------------------------------------------------------------------
  // TRANSACTION HELPERS
  // ------------------------------------------------------------------------

  /**
   * Executes callback within transaction.
   *
   * @openapi
   * Wraps operations in a database transaction. Automatically commits on success
   * and rolls back on error. Can use existing transaction or create new one.
   *
   * @template R - Return type of callback
   * @param {(trx: Knex.Transaction) => Promise<R>} callback - Operations to execute in transaction
   * @param {Knex.Transaction} [existingTrx] - Optional existing transaction to use
   * @returns {Promise<R>} Result of callback execution
   * @throws {Error} Rolls back transaction and re-throws on error
   *
   * @example
   * ```typescript
   * const result = await userModel.transaction(async (trx) => {
   *   const user = await userModel.create({ name: 'John' }, trx);
   *   const profile = await profileModel.create({
   *     userId: user.id
   *   }, trx);
   *   return { user, profile };
   * });
   * // Both created or neither (atomic)
   * ```
   */
  async transaction<R>(
    callback: (trx: Knex.Transaction) => Promise<R>,
    existingTrx?: Knex.Transaction
  ): Promise<R> {
    if (existingTrx) {
      // Use existing transaction
      return callback(existingTrx);
    }

    // Create new transaction
    const trx = await this.db.transaction();
    try {
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // ------------------------------------------------------------------------
  // DATA MAPPING
  // ------------------------------------------------------------------------

  /**
   * Maps database record to entity (must be implemented by child).
   *
   * @openapi
   * Abstract method that child classes must implement to transform database
   * records into entity objects. Handles column name conversion and type casting.
   *
   * @abstract
   * @protected
   * @param {any} record - Raw database record
   * @returns {T} Mapped entity object
   *
   * @example
   * ```typescript
   * // In child class
   * protected mapToEntity(record: any): User {
   *   return {
   *     id: record.id,
   *     name: record.name,
   *     email: record.email,
   *     createdAt: record.created_at,
   *     updatedAt: record.updated_at,
   *     tags: this.parseJsonArray(record.tags)
   *   };
   * }
   * ```
   */
  protected abstract mapToEntity(record: any): T;

  /**
   * Maps entity to database format.
   *
   * @openapi
   * Converts entity object to database record format. Handles column name mapping
   * (camelCase to snake_case) and serialization of complex types to JSON.
   *
   * @protected
   * @param {any} data - Entity data to map
   * @returns {Record<string, any>} Database-ready record
   *
   * @example
   * ```typescript
   * const dbData = this.mapToDatabase({
   *   userId: 1,
   *   firstName: 'John',
   *   tags: ['admin', 'user']
   * });
   * // Result: { user_id: 1, first_name: 'John', tags: '["admin","user"]' }
   * ```
   */
  protected mapToDatabase(data: any): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;

      const columnName = this.columnMap.get(key) || this.camelToSnake(key);

      // Serialize complex types
      if (
        Array.isArray(value) ||
        (typeof value === "object" &&
          value !== null &&
          !(value instanceof Date))
      ) {
        mapped[columnName] = JSON.stringify(value);
      } else {
        mapped[columnName] = value;
      }
    }

    return mapped;
  }

  /**
   * Maps field names to column names for queries.
   *
   * @openapi
   * Converts entity field names to database column names for use in queries.
   * Uses column map if defined, otherwise converts camelCase to snake_case.
   *
   * @protected
   * @param {Record<string, any>} fields - Fields with entity names
   * @returns {Record<string, any>} Fields with database column names
   *
   * @example
   * ```typescript
   * const mapped = this.mapFieldsToColumns({
   *   userId: 1,
   *   firstName: 'John'
   * });
   * // Result: { user_id: 1, first_name: 'John' }
   * ```
   */
  protected mapFieldsToColumns(
    fields: Record<string, any>
  ): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const [key, value] of Object.entries(fields)) {
      const columnName = this.columnMap.get(key) || this.camelToSnake(key);
      mapped[columnName] = value;
    }

    return mapped;
  }

  /**
   * Initializes column mapping (override for custom mappings).
   *
   * @openapi
   * Hook for child classes to define custom column name mappings.
   * By default uses automatic camelCase to snake_case conversion.
   *
   * @protected
   * @returns {void}
   *
   * @example
   * ```typescript
   * // In child class
   * protected initializeColumnMap(): void {
   *   this.columnMap.set('userId', 'user_id');
   *   this.columnMap.set('firstName', 'first_name');
   *   this.columnMap.set('lastName', 'last_name');
   * }
   * ```
   */
  protected initializeColumnMap(): void {
    // Default: empty map (will use camelToSnake conversion)
    // Override in child classes for custom mappings:
    // this.columnMap.set('userId', 'user_id');
  }

  /**
   * Filters fields based on fillable/guarded configuration.
   *
   * @openapi
   * Applies fillable/guarded field protection to prevent mass-assignment
   * vulnerabilities. Only allows explicitly permitted fields.
   *
   * @protected
   * @param {any} data - Data to filter
   * @returns {any} Filtered data with only allowed fields
   *
   * @example
   * ```typescript
   * // With fillable: ['name', 'email']
   * const filtered = this.filterFields({
   *   name: 'John',
   *   email: 'john@example.com',
   *   role: 'admin' // This will be filtered out
   * });
   * // Result: { name: 'John', email: 'john@example.com' }
   * ```
   */
  protected filterFields(data: any): any {
    const filtered: any = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip guarded fields
      if (this.config.guarded && this.config.guarded.includes(key)) {
        continue;
      }

      // If fillable is set, only allow those fields
      if (
        this.config.fillable &&
        this.config.fillable.length > 0 &&
        !this.config.fillable.includes(key)
      ) {
        continue;
      }

      filtered[key] = value;
    }

    return filtered;
  }

  // ------------------------------------------------------------------------
  // UTILITY METHODS
  // ------------------------------------------------------------------------

  /**
   * Converts camelCase to snake_case.
   *
   * @openapi
   * Utility method for converting JavaScript camelCase naming to database
   * snake_case naming convention.
   *
   * @protected
   * @param {string} str - String in camelCase
   * @returns {string} String in snake_case
   *
   * @example
   * ```typescript
   * this.camelToSnake('firstName') // 'first_name'
   * this.camelToSnake('userId')    // 'user_id'
   * ```
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Converts snake_case to camelCase.
   *
   * @openapi
   * Utility method for converting database snake_case naming to JavaScript
   * camelCase naming convention.
   *
   * @protected
   * @param {string} str - String in snake_case
   * @returns {string} String in camelCase
   *
   * @example
   * ```typescript
   * this.snakeToCamel('first_name') // 'firstName'
   * this.snakeToCamel('user_id')    // 'userId'
   * ```
   */
  protected snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Safely parses JSON field.
   *
   * @openapi
   * Parses JSON strings stored in database columns with error handling.
   * Returns null on parse errors or empty values.
   *
   * @protected
   * @template T - Expected return type
   * @param {any} value - Value to parse
   * @returns {T | null} Parsed object or null
   *
   * @example
   * ```typescript
   * const metadata = this.parseJson<UserMetadata>(record.metadata);
   * if (metadata) {
   *   console.log(metadata.preferences);
   * }
   * ```
   */
  protected parseJson<T = any>(value: any): T | null {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  }

  /**
   * Safely parses JSON array field.
   *
   * @openapi
   * Parses JSON array strings with validation. Always returns an array,
   * returning empty array on parse errors or invalid data.
   *
   * @protected
   * @template T - Expected array element type
   * @param {any} value - Value to parse
   * @returns {T[]} Parsed array or empty array
   *
   * @example
   * ```typescript
   * const tags = this.parseJsonArray<string>(record.tags);
   * // Safe to use: tags is always an array
   * tags.forEach(tag => console.log(tag));
   * ```
   */
  protected parseJsonArray<T = any>(value: any): T[] {
    const parsed = this.parseJson<T[]>(value);
    return Array.isArray(parsed) ? parsed : [];
  }

  /**
   * Finds all records with advanced filtering.
   *
   * @openapi
   * Retrieves all records matching the specified filters. Supports pagination,
   * sorting, relation loading, and complex query conditions without result limits.
   *
   * @param {AdvancedQueryOptions} [options={}] - Query options for filtering and sorting
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T[]>} Array of matching entities
   * @throws {Error} When query execution fails
   *
   * @example
   * ```typescript
   * const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
   * const chunks = this.chunk(items, 3);
   * // Result: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
   * ```
   */
  protected chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Removes hidden fields from entity.
   *
   * @openapi
   * Filters out sensitive fields from entity before sending response.
   * Uses hiddenFields configuration to determine which fields to remove.
   *
   * @protected
   * @param {T} entity - Entity to clean
   * @returns {T} Entity with hidden fields removed
   *
   * @example
   * ```typescript
   * // With hiddenFields: ['password', 'token']
   * const cleaned = this.hideFields({
   *   id: 1,
   *   name: 'John',
   *   email: 'john@example.com',
   *   password: 'secret123',
   *   token: 'abc123'
   * });
   * // Result: { id: 1, name: 'John', email: 'john@example.com' }
   * ```
   */
  protected hideFields(entity: T): T {
    if (!this.config.hiddenFields || this.config.hiddenFields.length === 0) {
      return entity;
    }

    const cleaned = { ...entity } as any;
    for (const field of this.config.hiddenFields) {
      delete cleaned[field];
    }
    return cleaned;
  }

  /**
   * Gets table name (useful for raw queries).
   *
   * @openapi
   * Returns the database table name for this model. Useful when constructing
   * raw SQL queries or for debugging purposes.
   *
   * @returns {string} Table name
   *
   * @example
   * ```typescript
   * const tableName = userModel.getTableName(); // 'users'
   * const query = `SELECT * FROM ${tableName} WHERE status = ?`;
   * ```
   */
  getTableName(): string {
    return this.tableName;
  }

  /**
   * Gets primary key column name.
   *
   * @openapi
   * Returns the primary key column name for this model. Useful for dynamic
   * query building or when working with generic model operations.
   *
   * @returns {string} Primary key column name
   *
   * @example
   * ```typescript
   * const pk = userModel.getPrimaryKey(); // 'id'
   * const query = connection(tableName).where(pk, 1);
   * ```
   */
  getPrimaryKey(): string {
    return this.primaryKey;
  }

  /**
   * Raw query execution (use with caution).
   *
   * @openapi
   * Executes raw SQL queries with parameter binding. Should be used sparingly
   * and only when query builder methods are insufficient. Always use parameter
   * binding to prevent SQL injection.
   *
   * @protected
   * @template T - Expected return type
   * @param {string} query - Raw SQL query with ? placeholders
   * @param {Knex.RawBinding} bindings - Query parameter bindings
   * @returns {Promise<T>} Query result
   * @throws {Error} When query execution fails
   *
   * @example
   * ```typescript
   * // In child class
   * const result = await this.raw<{ count: number }[]>(
   *   'SELECT COUNT(*) as count FROM users WHERE status = ?',
   *   ['active']
   * );
   * console.log(result[0].count);
   * ```
   */
  protected async raw<T = any>(
    query: string,
    bindings: Knex.RawBinding
  ): Promise<T> {
    return this.db.raw(query, bindings) as Promise<T>;
  }

  /**
   * Gets query builder for custom queries.
   *
   * @openapi
   * Returns a Knex query builder for the model's table. Use this when you need
   * to build complex custom queries that aren't covered by the base methods.
   *
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Knex.QueryBuilder} Query builder for this model's table
   *
   * @example
   * ```typescript
   * // Build custom query
   * const query = userModel.query()
   *   .select('users.*', 'profiles.bio')
   *   .leftJoin('profiles', 'users.id', 'profiles.user_id')
   *   .where('users.status', 'active')
   *   .groupBy('users.id')
   *   .having('COUNT(posts.id)', '>', 5);
   *
   * const results = await query;
   * ```
   */
  query(trx?: Knex.Transaction): Knex.QueryBuilder {
    const connection = trx || this.db;
    return connection(this.tableName);
  }
}

/**
 * @openapi
 *
 * # Additional Usage Examples
 *
 * ## Example 1: Creating a Complete Model
 *
 * ```typescript
 * import { BaseModel, ModelConfig } from '@/models/base';
 *
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 *   role: string;
 *   status: 'active' | 'inactive';
 *   createdAt: Date;
 *   updatedAt: Date;
 *   deletedAt?: Date;
 * }
 *
 * interface CreateUserDTO {
 *   name: string;
 *   email: string;
 *   role: string;
 *   status?: 'active' | 'inactive';
 * }
 *
 * interface UpdateUserDTO {
 *   name?: string;
 *   email?: string;
 *   role?: string;
 *   status?: 'active' | 'inactive';
 * }
 *
 * class UserModel extends BaseModel<User, CreateUserDTO, UpdateUserDTO> {
 *   protected tableName = 'users';
 *   protected primaryKey = 'id';
 *
 *   protected config: ModelConfig = {
 *     softDelete: true,
 *     timestamps: true,
 *     defaultSortColumn: 'created_at',
 *     defaultSortOrder: 'desc',
 *     searchableColumns: ['name', 'email'],
 *     hiddenFields: ['password'],
 *     fillable: ['name', 'email', 'role', 'status'],
 *     guarded: ['id', 'created_at', 'updated_at', 'deleted_at'],
 *   };
 *
 *   protected relations = {
 *     posts: {
 *       type: 'hasMany' as const,
 *       model: () => new PostModel(),
 *       foreignKey: 'user_id',
 *       localKey: 'id',
 *     },
 *     profile: {
 *       type: 'hasOne' as const,
 *       model: () => new ProfileModel(),
 *       foreignKey: 'user_id',
 *       localKey: 'id',
 *     },
 *   };
 *
 *   protected mapToEntity(record: any): User {
 *     return {
 *       id: record.id,
 *       name: record.name,
 *       email: record.email,
 *       role: record.role,
 *       status: record.status,
 *       createdAt: new Date(record.created_at),
 *       updatedAt: new Date(record.updated_at),
 *       deletedAt: record.deleted_at ? new Date(record.deleted_at) : undefined,
 *     };
 *   }
 *
 *   // Lifecycle hooks
 *   protected async beforeCreate(data: CreateUserDTO): Promise<CreateUserDTO> {
 *     // Add default status if not provided
 *     return {
 *       ...data,
 *       status: data.status || 'active',
 *     };
 *   }
 *
 *   protected async afterCreate(entity: User): Promise<void> {
 *     // Send welcome email
 *     console.log(`Welcome email sent to ${entity.email}`);
 *   }
 *
 *   // Custom methods
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.findOne({ email });
 *   }
 *
 *   async findActiveUsers(page: number = 1, limit: number = 10): Promise<PaginatedResult<User>> {
 *     return this.paginate({
 *       page,
 *       limit,
 *       where: { status: 'active' },
 *       sortBy: 'name',
 *       sortOrder: 'asc',
 *     });
 *   }
 * }
 *
 * export default UserModel;
 * ```
 *
 * ## Example 2: Using the Model in a Controller
 *
 * ```typescript
 * import { Request, Response } from 'express';
 * import UserModel from '@/models/UserModel';
 *
 * class UserController {
 *   private userModel: UserModel;
 *
 *   constructor() {
 *     this.userModel = new UserModel();
 *   }
 *
 *   // GET /api/users
 *   async index(req: Request, res: Response) {
 *     try {
 *       const { page = 1, limit = 10, search, status } = req.query;
 *
 *       const options: any = {
 *         page: Number(page),
 *         limit: Number(limit),
 *       };
 *
 *       if (search) {
 *         options.search = String(search);
 *       }
 *
 *       if (status) {
 *         options.where = { status: String(status) };
 *       }
 *
 *       const result = await this.userModel.paginate(options);
 *
 *       res.json({
 *         success: true,
 *         data: result.items,
 *         pagination: result.pagination,
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message,
 *       });
 *     }
 *   }
 *
 *   // POST /api/users
 *   async create(req: Request, res: Response) {
 *     try {
 *       const user = await this.userModel.create(req.body);
 *
 *       res.status(201).json({
 *         success: true,
 *         data: user,
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message,
 *       });
 *     }
 *   }
 *
 *   // GET /api/users/:id
 *   async show(req: Request, res: Response) {
 *     try {
 *       const id = Number(req.params.id);
 *       const relations = req.query.relations
 *         ? String(req.query.relations).split(',')
 *         : [];
 *
 *       const user = await this.userModel.findById(id, { relations });
 *
 *       if (!user) {
 *         return res.status(404).json({
 *           success: false,
 *           error: 'NotFoundError',
 *           message: 'User not found',
 *         });
 *       }
 *
 *       res.json({
 *         success: true,
 *         data: user,
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message,
 *       });
 *     }
 *   }
 *
 *   // PUT /api/users/:id
 *   async update(req: Request, res: Response) {
 *     try {
 *       const id = Number(req.params.id);
 *       const user = await this.userModel.update(id, req.body);
 *
 *       if (!user) {
 *         return res.status(404).json({
 *           success: false,
 *           error: 'NotFoundError',
 *           message: 'User not found',
 *         });
 *       }
 *
 *       res.json({
 *         success: true,
 *         data: user,
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message,
 *       });
 *     }
 *   }
 *
 *   // DELETE /api/users/:id
 *   async destroy(req: Request, res: Response) {
 *     try {
 *       const id = Number(req.params.id);
 *       const deleted = await this.userModel.delete(id);
 *
 *       if (!deleted) {
 *         return res.status(404).json({
 *           success: false,
 *           error: 'NotFoundError',
 *           message: 'User not found',
 *         });
 *       }
 *
 *       res.json({
 *         success: true,
 *         message: 'User deleted successfully',
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message,
 *       });
 *     }
 *   }
 *
 *   // POST /api/users/:id/restore
 *   async restore(req: Request, res: Response) {
 *     try {
 *       const id = Number(req.params.id);
 *       const restored = await this.userModel.restore(id);
 *
 *       if (!restored) {
 *         return res.status(404).json({
 *           success: false,
 *           error: 'NotFoundError',
 *           message: 'User not found or not deleted',
 *         });
 *       }
 *
 *       res.json({
 *         success: true,
 *         message: 'User restored successfully',
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message,
 *       });
 *     }
 *   }
 *
 *   // POST /api/users/bulk
 *   async bulkCreate(req: Request, res: Response) {
 *     try {
 *       const { items, chunkSize } = req.body;
 *
 *       const result = await this.userModel.bulkCreate(items, { chunkSize });
 *
 *       res.json({
 *         success: result.success,
 *         processed: result.processed,
 *         failed: result.failed,
 *         errors: result.errors,
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message,
 *       });
 *     }
 *   }
 *
 *   // GET /api/users/search
 *   async search(req: Request, res: Response) {
 *     try {
 *       const { q, page = 1, limit = 10 } = req.query;
 *
 *       if (!q) {
 *         return res.status(400).json({
 *           success: false,
 *           error: 'ValidationError',
 *           message: 'Search query is required',
 *         });
 *       }
 *
 *       const results = await this.userModel.search(String(q), {
 *         page: Number(page),
 *         limit: Number(limit),
 *       });
 *
 *       res.json({
 *         success: true,
 *         data: results,
 *         query: q,
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message,
 *       });
 *     }
 *   }
 * }
 *
 * export default UserController;
 * ```
 *
 * ## Example 3: Using Transactions
 *
 * ```typescript
 * import UserModel from '@/models/UserModel';
 * import ProfileModel from '@/models/ProfileModel';
 *
 * class UserService {
 *   private userModel: UserModel;
 *   private profileModel: ProfileModel;
 *
 *   constructor() {
 *     this.userModel = new UserModel();
 *     this.profileModel = new ProfileModel();
 *   }
 *
 *   async createUserWithProfile(userData: any, profileData: any) {
 *     return this.userModel.transaction(async (trx) => {
 *       // Create user
 *       const user = await this.userModel.create(userData, trx);
 *
 *       // Create profile linked to user
 *       const profile = await this.profileModel.create(
 *         {
 *           ...profileData,
 *           userId: user.id,
 *         },
 *         trx
 *       );
 *
 *       // Both operations succeed or both fail
 *       return { user, profile };
 *     });
 *   }
 *
 *   async transferData(fromUserId: number, toUserId: number) {
 *     return this.userModel.transaction(async (trx) => {
 *       // Update multiple records in a transaction
 *       const updates = [
 *         { id: fromUserId, data: { status: 'inactive' } },
 *         { id: toUserId, data: { status: 'active' } },
 *       ];
 *
 *       const result = await this.userModel.bulkUpdate(updates, trx);
 *
 *       if (!result.success) {
 *         throw new Error('Failed to transfer data');
 *       }
 *
 *       return result;
 *     });
 *   }
 * }
 * ```
 *
 * ## Example 4: Advanced Filtering
 *
 * ```typescript
 * // Find users with complex conditions
 * const users = await userModel.findAll({
 *   filters: [
 *     { field: 'status', operator: '=', value: 'active' },
 *     { field: 'created_at', operator: '>=', value: '2024-01-01' },
 *     { field: 'role', operator: 'in', value: ['admin', 'moderator'] },
 *   ],
 *   whereIn: {
 *     country: ['US', 'CA', 'UK'],
 *   },
 *   whereBetween: {
 *     age: [18, 65],
 *   },
 *   sortBy: 'name',
 *   sortOrder: 'asc',
 *   relations: ['profile', 'posts'],
 * });
 *
 * // Search with filters
 * const results = await userModel.search('john', {
 *   where: { status: 'active' },
 *   filters: [
 *     { field: 'role', operator: '!=', value: 'banned' },
 *   ],
 *   sortBy: 'created_at',
 *   sortOrder: 'desc',
 * });
 * ```
 *
 * ## Example 5: Custom Query Methods
 *
 * ```typescript
 * class UserModel extends BaseModel<User, CreateUserDTO, UpdateUserDTO> {
 *   // ... existing code ...
 *
 *   async findUsersWithPostCount(minPosts: number) {
 *     const query = this.query()
 *       .select('users.*')
 *       .count('posts.id as post_count')
 *       .leftJoin('posts', 'users.id', 'posts.user_id')
 *       .groupBy('users.id')
 *       .havingRaw('COUNT(posts.id) >= ?', [minPosts]);
 *
 *     const records = await query;
 *     return records.map(r => this.mapToEntity(r));
 *   }
 *
 *   async getUserStatistics() {
 *     const result = await this.raw<any>(
 *       `SELECT
 *         COUNT(*) as total,
 *         COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
 *         COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
 *         AVG(DATEDIFF(NOW(), created_at)) as avg_age_days
 *       FROM users
 *       WHERE deleted_at IS NULL`,
 *       []
 *     );
 *
 *     return result[0];
 *   }
 * }
 * ```
 */

export default BaseModel;
