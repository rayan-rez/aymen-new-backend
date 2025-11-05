/**
 * Base Polymorphic Model with Advanced Features
 *
 * @module models/base/polymorphic
 * @abstract
 *
 * @swagger
 * components:
 *   schemas:
 *     PolymorphicEntity:
 *       type: object
 *       description: Base structure for all polymorphic models
 *       required:
 *         - id
 *         - polymorphicType
 *         - polymorphicId
 *         - displayOrder
 *       properties:
 *         id:
 *           type: integer
 *           description: Primary key
 *           example: 1
 *         polymorphicType:
 *           type: string
 *           description: Type of parent entity (e.g., 'project', 'apartment')
 *           example: "project"
 *         polymorphicId:
 *           type: integer
 *           description: ID of parent entity
 *           example: 42
 *         displayOrder:
 *           type: integer
 *           description: Order for displaying this item
 *           minimum: 0
 *           example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-01T00:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Soft delete timestamp
 *           example: null
 *
 *     PolymorphicQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             polymorphicType:
 *               oneOf:
 *                 - type: string
 *                 - type: array
 *                   items:
 *                     type: string
 *               description: Filter by parent entity type(s)
 *               example: "project"
 *             polymorphicId:
 *               oneOf:
 *                 - type: integer
 *                 - type: array
 *                   items:
 *                     type: integer
 *               description: Filter by parent entity ID(s)
 *               example: 42
 *
 *     PolymorphicTypeCount:
 *       type: object
 *       description: Count of records grouped by polymorphic type
 *       additionalProperties:
 *         type: integer
 *       example:
 *         project: 45
 *         apartment: 32
 *         commercial_property: 18
 *
 *     PolymorphicTypeGroup:
 *       type: object
 *       description: Records grouped by polymorphic type
 *       additionalProperties:
 *         type: array
 *         items:
 *           type: object
 *
 *     ReorderRequest:
 *       type: object
 *       required:
 *         - orderedIds
 *       properties:
 *         orderedIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of IDs in desired order
 *           example: [3, 1, 5, 2, 4]
 *
 *     BulkPolymorphicCreateRequest:
 *       type: object
 *       required:
 *         - entityType
 *         - entityId
 *         - items
 *       properties:
 *         entityType:
 *           type: string
 *           description: Type of parent entity
 *           example: "project"
 *         entityId:
 *           type: integer
 *           description: ID of parent entity
 *           example: 42
 *         items:
 *           type: array
 *           items:
 *             type: object
 *           description: Array of items to create
 *
 *   parameters:
 *     PolymorphicTypeParam:
 *       name: polymorphicType
 *       in: query
 *       description: Filter by parent entity type
 *       required: false
 *       schema:
 *         type: string
 *       example: "project"
 *
 *     PolymorphicIdParam:
 *       name: polymorphicId
 *       in: query
 *       description: Filter by parent entity ID
 *       required: false
 *       schema:
 *         type: integer
 *       example: 42
 *
 *     EntityTypePathParam:
 *       name: entityType
 *       in: path
 *       description: Type of parent entity
 *       required: true
 *       schema:
 *         type: string
 *         enum: [project, apartment, commercial_property, blog_post, event]
 *       example: "project"
 *
 *     EntityIdPathParam:
 *       name: entityId
 *       in: path
 *       description: ID of parent entity
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 42
 *
 * Features:
 * - Polymorphic relationships (belongs to multiple parent types)
 * - Type validation and constraints
 * - Display order management with reordering
 * - Bulk operations for specific entities
 * - Grouping and counting by polymorphic type
 * - Entity existence validation
 * - Optimized queries for polymorphic data
 * - Soft delete support inherited from BaseModel
 */

/**
 * @openapi
 * /api/{resource}/{entityType}/{entityId}:
 *   get:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Get all records for a specific entity
 *     description: Retrieves all polymorphic records belonging to a parent entity
 *     parameters:
 *       - $ref: '#/components/parameters/EntityTypePathParam'
 *       - $ref: '#/components/parameters/EntityIdPathParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - $ref: '#/components/parameters/IncludeDeletedParam'
 *     responses:
 *       200:
 *         description: Records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PolymorphicEntity'
 *       400:
 *         description: Invalid polymorphic type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 *
 *   post:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Bulk create records for a specific entity
 *     description: Creates multiple polymorphic records for a parent entity in one operation
 *     parameters:
 *       - $ref: '#/components/parameters/EntityTypePathParam'
 *       - $ref: '#/components/parameters/EntityIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Records created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PolymorphicEntity'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Parent entity not found
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 *
 *   delete:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Delete all records for a specific entity
 *     description: Removes all polymorphic records belonging to a parent entity
 *     parameters:
 *       - $ref: '#/components/parameters/EntityTypePathParam'
 *       - $ref: '#/components/parameters/EntityIdPathParam'
 *       - name: force
 *         in: query
 *         description: Force permanent deletion
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Records deleted successfully
 *       400:
 *         description: Invalid polymorphic type
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 *
 * /api/{resource}/{entityType}/{entityId}/reorder:
 *   post:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Reorder records for a specific entity
 *     description: Updates display order of polymorphic records
 *     parameters:
 *       - $ref: '#/components/parameters/EntityTypePathParam'
 *       - $ref: '#/components/parameters/EntityIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderRequest'
 *     responses:
 *       200:
 *         description: Records reordered successfully
 *       400:
 *         description: Invalid polymorphic type or empty array
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 *
 * /api/{resource}/{entityType}/{entityId}/first:
 *   get:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Get first record for an entity
 *     description: Retrieves the first record by display order (useful for cover images)
 *     parameters:
 *       - $ref: '#/components/parameters/EntityTypePathParam'
 *       - $ref: '#/components/parameters/EntityIdPathParam'
 *     responses:
 *       200:
 *         description: First record retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PolymorphicEntity'
 *       404:
 *         description: No records found
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 *
 * /api/{resource}/{entityType}/{entityId}/count:
 *   get:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Count records for a specific entity
 *     description: Returns the number of polymorphic records for a parent entity
 *     parameters:
 *       - $ref: '#/components/parameters/EntityTypePathParam'
 *       - $ref: '#/components/parameters/EntityIdPathParam'
 *     responses:
 *       200:
 *         description: Count retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                   example: 15
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 *
 * /api/{resource}/by-type/{entityType}:
 *   get:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Get all records by polymorphic type
 *     description: Retrieves all records for a specific parent entity type
 *     parameters:
 *       - $ref: '#/components/parameters/EntityTypePathParam'
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PolymorphicEntity'
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 *
 * /api/{resource}/group-by-type:
 *   get:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Get records grouped by type
 *     description: Retrieves all records organized by their polymorphic type
 *     responses:
 *       200:
 *         description: Grouped records retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PolymorphicTypeGroup'
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 *
 * /api/{resource}/count-by-type:
 *   get:
 *     tags:
 *       - Polymorphic Resources
 *     summary: Get counts grouped by type
 *     description: Returns record counts for each polymorphic type
 *     responses:
 *       200:
 *         description: Counts retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PolymorphicTypeCount'
 *       500:
 *         $ref: '#/components/responses/DatabaseError'
 */

import { BaseModel, AdvancedQueryOptions, DatabaseRecord } from "./index";
import { Knex } from "knex";

/**
 * @openapi
 * Polymorphic entity interface.
 * Base structure for all polymorphic models that can belong to multiple parent types.
 */
export interface PolymorphicEntity {
  id: number;
  polymorphicType: string; // e.g., 'project', 'apartment'
  polymorphicId: number; // Parent entity ID
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * @openapi
 * Polymorphic query options extending base query parameters.
 * Adds filtering by polymorphic type and ID.
 */
export interface PolymorphicQueryOptions extends AdvancedQueryOptions {
  polymorphicType?: string | string[];
  polymorphicId?: number | number[];
}

/**
 * @openapi
 * Abstract Base Polymorphic Model providing comprehensive polymorphic relationship management.
 *
 * @abstract
 * @class BasePolymorphicModel
 * @extends BaseModel
 *
 * @template T - Entity type (must extend PolymorphicEntity)
 * @template TCreate - Creation data type
 * @template TUpdate - Update data type
 *
 * @description
 * Provides shared functionality for polymorphic relationships where a model
 * can belong to multiple parent types (e.g., photos belong to projects, apartments, etc.)
 *
 * @example
 * ```typescript
 * // Define a Photo model with polymorphic relationships
 * interface Photo extends PolymorphicEntity {
 *   url: string;
 *   alt: string;
 *   size: number;
 * }
 *
 * class PhotoModel extends BasePolymorphicModel<Photo> {
 *   protected tableName = 'photos';
 *   protected polymorphicTypeColumn = 'photoable_type';
 *   protected polymorphicIdColumn = 'photoable_id';
 *   protected validPolymorphicTypes = ['project', 'apartment', 'commercial_property'];
 *
 *   protected mapToEntity(record: any): Photo {
 *     return {
 *       id: record.id,
 *       polymorphicType: record.photoable_type,
 *       polymorphicId: record.photoable_id,
 *       url: record.url,
 *       alt: record.alt,
 *       size: record.size,
 *       displayOrder: record.display_order,
 *       createdAt: new Date(record.created_at),
 *       updatedAt: new Date(record.updated_at),
 *       deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
 *     };
 *   }
 * }
 *
 * // Usage
 * const photoModel = new PhotoModel();
 *
 * // Get all photos for a project
 * const photos = await photoModel.getForEntity('project', 42);
 *
 * // Reorder photos
 * await photoModel.reorderForEntity('project', 42, [3, 1, 5, 2]);
 * ```
 */
export abstract class BasePolymorphicModel<
  T extends PolymorphicEntity,
  TCreate = Partial<T>,
  TUpdate = Partial<T>
> extends BaseModel<T, TCreate, TUpdate> {
  /**
   * Name of the polymorphic type column (e.g., 'photoable_type', 'plannable_type').
   * Must be implemented by child classes.
   *
   * @abstract
   * @protected
   *
   * @example
   * ```typescript
   * protected polymorphicTypeColumn = 'photoable_type';
   * ```
   */
  protected abstract polymorphicTypeColumn: string;

  /**
   * Name of the polymorphic ID column (e.g., 'photoable_id', 'plannable_id').
   * Must be implemented by child classes.
   *
   * @abstract
   * @protected
   *
   * @example
   * ```typescript
   * protected polymorphicIdColumn = 'photoable_id';
   * ```
   */
  protected abstract polymorphicIdColumn: string;

  /**
   * Valid polymorphic types for this model.
   * Must be implemented by child classes.
   *
   * @abstract
   * @protected
   *
   * @example
   * ```typescript
   * protected validPolymorphicTypes = ['project', 'apartment', 'commercial_property'];
   * ```
   */
  protected abstract validPolymorphicTypes: string[];

  /**
   * Validates polymorphic type against allowed types.
   *
   * @openapi
   * Checks if the provided type is in the list of valid polymorphic types.
   *
   * @protected
   * @param {string} type - Polymorphic type to validate
   * @returns {boolean} True if valid, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = this.validatePolymorphicType('project'); // true
   * const isInvalid = this.validatePolymorphicType('invalid'); // false
   * ```
   */
  protected validatePolymorphicType(type: string): boolean {
    return this.validPolymorphicTypes.includes(type);
  }

  /**
   * Ensures polymorphic type is valid or throws error.
   *
   * @openapi
   * Validates the polymorphic type and throws a descriptive error if invalid.
   * Used internally to enforce type constraints.
   *
   * @protected
   * @param {string} type - Polymorphic type to validate
   * @throws {Error} When type is not in validPolymorphicTypes
   *
   * @example
   * ```typescript
   * this.ensureValidType('project'); // OK
   * this.ensureValidType('invalid'); // Throws error
   * ```
   */
  protected ensureValidType(type: string): void {
    if (!this.validatePolymorphicType(type)) {
      throw new Error(
        `Invalid polymorphic type "${type}". Valid types: ${this.validPolymorphicTypes.join(
          ", "
        )}`
      );
    }
  }

  // ============================================================================
  // POLYMORPHIC-SPECIFIC QUERY METHODS
  // ============================================================================

  /**
   * Finds all records for a specific entity.
   *
   * @openapi
   * Retrieves all polymorphic records belonging to a specific parent entity.
   * Results are automatically sorted by display_order unless specified otherwise.
   *
   * @param {string} entityType - Type of parent entity (e.g., 'project')
   * @param {number} entityId - ID of parent entity
   * @param {PolymorphicQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T[]>} Array of polymorphic entities
   * @throws {Error} When entityType is invalid
   *
   * @example
   * ```typescript
   * // Get all photos for a project
   * const photos = await photoModel.getForEntity('project', 42);
   *
   * // Get photos with custom sorting
   * const photos = await photoModel.getForEntity('project', 42, {
   *   sortBy: 'created_at',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  async getForEntity(
    entityType: string,
    entityId: number,
    options: PolymorphicQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<T[]> {
    this.ensureValidType(entityType);

    const connection = trx || this.db;
    let query = this.buildQuery(connection, {
      ...options,
      sortBy: options.sortBy || "display_order",
      sortOrder: options.sortOrder || "asc",
    });

    query = query
      .where(this.polymorphicTypeColumn, entityType)
      .where(this.polymorphicIdColumn, entityId);

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * Counts records for a specific entity.
   *
   * @openapi
   * Returns the total count of polymorphic records for a parent entity.
   * Respects soft delete configuration.
   *
   * @param {string} entityType - Type of parent entity
   * @param {number} entityId - ID of parent entity
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of records
   * @throws {Error} When entityType is invalid
   *
   * @example
   * ```typescript
   * const photoCount = await photoModel.countForEntity('project', 42);
   * console.log(`Project has ${photoCount} photos`);
   * ```
   */
  async countForEntity(
    entityType: string,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    this.ensureValidType(entityType);

    const connection = trx || this.db;
    let query = connection(this.tableName)
      .where(this.polymorphicTypeColumn, entityType)
      .where(this.polymorphicIdColumn, entityId);

    if (this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    const result = await query.count("* as count").first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Finds records by entity type (all entities of that type).
   *
   * @openapi
   * Retrieves all polymorphic records for a specific parent entity type,
   * regardless of which specific parent entity they belong to.
   *
   * @param {string} entityType - Type of parent entity
   * @param {PolymorphicQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T[]>} Array of polymorphic entities
   * @throws {Error} When entityType is invalid
   *
   * @example
   * ```typescript
   * // Get all photos that belong to ANY project
   * const projectPhotos = await photoModel.findByType('project');
   *
   * // Get all apartment photos with pagination
   * const apartmentPhotos = await photoModel.findByType('apartment', {
   *   page: 1,
   *   limit: 20
   * });
   * ```
   */
  async findByType(
    entityType: string,
    options: PolymorphicQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<T[]> {
    this.ensureValidType(entityType);

    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = query.where(this.polymorphicTypeColumn, entityType);

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * Deletes all records for a specific entity.
   *
   * @openapi
   * Removes all polymorphic records belonging to a parent entity.
   * Respects soft delete configuration unless force is true.
   *
   * @param {string} entityType - Type of parent entity
   * @param {number} entityId - ID of parent entity
   * @param {boolean} [force=false] - Force permanent deletion
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if any records were deleted
   * @throws {Error} When entityType is invalid
   *
   * @example
   * ```typescript
   * // Soft delete all photos for a project
   * await photoModel.deleteForEntity('project', 42);
   *
   * // Permanently delete all photos
   * await photoModel.deleteForEntity('project', 42, true);
   * ```
   */
  async deleteForEntity(
    entityType: string,
    entityId: number,
    force: boolean = false,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    this.ensureValidType(entityType);

    const connection = trx || this.db;
    let query = connection(this.tableName)
      .where(this.polymorphicTypeColumn, entityType)
      .where(this.polymorphicIdColumn, entityId);

    if (this.config.softDelete && !force) {
      // Soft delete
      const updated = await query.update({
        deleted_at: connection.fn.now(),
        ...(this.config.timestamps && { updated_at: connection.fn.now() }),
      });
      return updated > 0;
    } else {
      // Hard delete
      const deleted = await query.del();
      return deleted > 0;
    }
  }

  /**
   * Bulk creates records for a specific entity.
   *
   * @openapi
   * Creates multiple polymorphic records for a parent entity in a single operation.
   * Automatically sets polymorphic fields and display order.
   *
   * @param {string} entityType - Type of parent entity
   * @param {number} entityId - ID of parent entity
   * @param {TCreate[]} items - Array of items to create
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T[]>} Array of created entities
   * @throws {Error} When entityType is invalid or parent entity doesn't exist
   *
   * @example
   * ```typescript
   * const photos = await photoModel.bulkCreateForEntity('project', 42, [
   *   { url: '/photo1.jpg', alt: 'Photo 1', size: 1024 },
   *   { url: '/photo2.jpg', alt: 'Photo 2', size: 2048 },
   *   { url: '/photo3.jpg', alt: 'Photo 3', size: 1536 }
   * ]);
   * console.log(`Created ${photos.length} photos`);
   * ```
   */
  async bulkCreateForEntity(
    entityType: string,
    entityId: number,
    items: TCreate[],
    trx?: Knex.Transaction
  ): Promise<T[]> {
    this.ensureValidType(entityType);

    if (items.length === 0) return [];

    const connection = trx || this.db;

    // Prepare data with polymorphic fields
    const insertData = items.map((item, index) => {
      const filtered = this.filterFields(item);
      const dbData = this.mapToDatabase(filtered);

      return {
        ...dbData,
        [this.polymorphicTypeColumn]: entityType,
        [this.polymorphicIdColumn]: entityId,
        display_order: (item as any).displayOrder ?? index,
        ...(this.config.timestamps && {
          created_at: connection.fn.now(),
          updated_at: connection.fn.now(),
        }),
      };
    });

    await connection(this.tableName).insert(insertData);

    // Fetch and return created records
    return this.getForEntity(entityType, entityId, {}, trx);
  }

  /**
   * Reorders records for a specific entity.
   *
   * @openapi
   * Updates the display order of polymorphic records based on provided ID array.
   * The order of IDs in the array determines the new display_order values.
   *
   * @param {string} entityType - Type of parent entity
   * @param {number} entityId - ID of parent entity
   * @param {number[]} orderedIds - Array of record IDs in desired order
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if reorder was successful
   * @throws {Error} When entityType is invalid
   *
   * @example
   * ```typescript
   * // Reorder photos: move photo 3 to first, then 1, 5, 2, 4
   * await photoModel.reorderForEntity('project', 42, [3, 1, 5, 2, 4]);
   *
   * // Photos will now have display_order: 0, 1, 2, 3, 4 respectively
   * ```
   */
  async reorderForEntity(
    entityType: string,
    entityId: number,
    orderedIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    this.ensureValidType(entityType);

    if (orderedIds.length === 0) return true;

    const connection = trx || this.db;

    await connection.transaction(async (localTrx) => {
      const useTrx = trx || localTrx;

      for (let i = 0; i < orderedIds.length; i++) {
        await useTrx(this.tableName)
          .where({ id: orderedIds[i] })
          .where(this.polymorphicTypeColumn, entityType)
          .where(this.polymorphicIdColumn, entityId)
          .update({
            display_order: i,
            ...(this.config.timestamps && { updated_at: useTrx.fn.now() }),
          });
      }
    });

    return true;
  }

  /**
   * Gets the first record for an entity (useful for cover images, etc.).
   *
   * @openapi
   * Retrieves the first polymorphic record by display order.
   * Commonly used to get cover images or featured items.
   *
   * @param {string} entityType - Type of parent entity
   * @param {number} entityId - ID of parent entity
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<T | null>} First entity or null if none exist
   * @throws {Error} When entityType is invalid
   *
   * @example
   * ```typescript
   * // Get cover photo for a project
   * const coverPhoto = await photoModel.getFirstForEntity('project', 42);
   * if (coverPhoto) {
   *   console.log('Cover photo:', coverPhoto.url);
   * }
   * ```
   */
  async getFirstForEntity(
    entityType: string,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<T | null> {
    this.ensureValidType(entityType);

    const connection = trx || this.db;

    let query = connection(this.tableName)
      .where(this.polymorphicTypeColumn, entityType)
      .where(this.polymorphicIdColumn, entityId)
      .orderBy("display_order", "asc")
      .first();

    if (this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    const record = await query;
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Checks if an entity has any records.
   *
   * @openapi
   * Verifies whether a parent entity has any associated polymorphic records.
   * More efficient than counting when only existence matters.
   *
   * @param {string} entityType - Type of parent entity
   * @param {number} entityId - ID of parent entity
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if entity has records, false otherwise
   * @throws {Error} When entityType is invalid
   *
   * @example
   * ```typescript
   * const hasPhotos = await photoModel.hasRecordsForEntity('project', 42);
   * if (!hasPhotos) {
   *   console.log('This project has no photos yet');
   * }
   * ```
   */
  async hasRecordsForEntity(
    entityType: string,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const count = await this.countForEntity(entityType, entityId, trx);
    return count > 0;
  }

  /**
   * Gets entities grouped by polymorphic type.
   *
   * @openapi
   * Retrieves all polymorphic records organized by their parent entity type.
   * Useful for displaying records categorized by type.
   *
   * @param {PolymorphicQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Record<string, T[]>>} Object with type keys and entity arrays
   *
   * @example
   * ```typescript
   * const grouped = await photoModel.groupByType();
   * // Result: {
   * //   project: [photo1, photo2, ...],
   * //   apartment: [photo3, photo4, ...],
   * //   commercial_property: [photo5, ...]
   * // }
   *
   * for (const [type, photos] of Object.entries(grouped)) {
   *   console.log(`${type}: ${photos.length} photos`);
   * }
   * ```
   */
  async groupByType(
    options: PolymorphicQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Record<string, T[]>> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    const records = await query;
    const entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Group by polymorphic type
    const grouped: Record<string, T[]> = {};
    for (const entity of entities) {
      const type = entity.polymorphicType;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(entity);
    }

    return grouped;
  }

  /**
   * Gets count grouped by polymorphic type.
   *
   * @openapi
   * Returns record counts for each polymorphic type.
   * Useful for analytics and displaying statistics.
   *
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Record<string, number>>} Object with type keys and count values
   *
   * @example
   * ```typescript
   * const counts = await photoModel.countByType();
   * // Result: { project: 45, apartment: 32, commercial_property: 18 }
   *
   * for (const [type, count] of Object.entries(counts)) {
   *   console.log(`${type}: ${count} photos`);
   * }
   * ```
   */
  async countByType(trx?: Knex.Transaction): Promise<Record<string, number>> {
    const connection = trx || this.db;

    let query = connection(this.tableName)
      .select(this.polymorphicTypeColumn)
      .count("* as count")
      .groupBy(this.polymorphicTypeColumn);

    if (this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    const results = await query;

    const counts: Record<string, number> = {};
    for (const result of results) {
      counts[result[this.polymorphicTypeColumn]] = Number(result.count);
    }

    return counts;
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validates that entity exists before creating polymorphic record.
   *
   * @openapi
   * Checks if the parent entity exists in the database before creating
   * a polymorphic relationship. Helps maintain referential integrity.
   *
   * @protected
   * @param {string} entityType - Type of parent entity
   * @param {number} entityId - ID of parent entity
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if entity exists, false otherwise
   *
   * @example
   * ```typescript
   * // In child class before create
   * const exists = await this.validateEntityExists('project', 42);
   * if (!exists) {
   *   throw new Error('Parent project does not exist');
   * }
   * ```
   */
  protected async validateEntityExists(
    entityType: string,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    // Map entity type to table name
    const tableName = this.getTableNameForType(entityType);

    const exists = await connection(tableName).where({ id: entityId }).first();

    return !!exists;
  }

  /**
   * Maps polymorphic type to database table name.
   *
   * @openapi
   * Converts a polymorphic type string to its corresponding database table name.
   * Override this method in child classes for custom mapping logic.
   *
   * @protected
   * @param {string} entityType - Polymorphic type
   * @returns {string} Database table name
   *
   * @example
   * ```typescript
   * // Default implementation
   * this.getTableNameForType('project') // 'projects'
   * this.getTableNameForType('apartment') // 'apartments'
   *
   * // Override for custom mapping
   * protected getTableNameForType(entityType: string): string {
   *   const customMapping = {
   *     project: 'real_estate_projects',
   *     apartment: 'residential_units'
   *   };
   *   return customMapping[entityType] || super.getTableNameForType(entityType);
   * }
   * ```
   */
  protected getTableNameForType(entityType: string): string {
    // Default: pluralize and add 's'
    const plurals: Record<string, string> = {
      project: "projects",
      apartment: "apartments",
      commercial_property: "commercial_properties",
      blog_post: "blog_posts",
      event: "events",
    };

    return plurals[entityType] || `${entityType}s`;
  }

  // ============================================================================
  // QUERY FILTER HELPERS
  // ============================================================================

  /**
   * Applies polymorphic-specific filters to query.
   *
   * @openapi
   * Extends the base query builder with polymorphic type and ID filtering.
   * Supports both single values and arrays for flexible querying.
   *
   * @protected
   * @param {Knex.QueryBuilder} query - Query builder to enhance
   * @param {PolymorphicQueryOptions} options - Polymorphic filter options
   * @returns {Knex.QueryBuilder} Enhanced query builder
   *
   * @example
   * ```typescript
   * // In child class
   * let query = this.db(this.tableName);
   * query = this.applyPolymorphicFilters(query, {
   *   polymorphicType: ['project', 'apartment'],
   *   polymorphicId: [1, 2, 3]
   * });
   * ```
   */
  protected applyPolymorphicFilters(
    query: Knex.QueryBuilder,
    options: PolymorphicQueryOptions
  ): Knex.QueryBuilder {
    // Polymorphic type filter
    if (options.polymorphicType) {
      if (Array.isArray(options.polymorphicType)) {
        query = query.whereIn(
          this.polymorphicTypeColumn,
          options.polymorphicType
        );
      } else {
        query = query.where(
          this.polymorphicTypeColumn,
          options.polymorphicType
        );
      }
    }

    // Polymorphic ID filter
    if (options.polymorphicId) {
      if (Array.isArray(options.polymorphicId)) {
        query = query.whereIn(this.polymorphicIdColumn, options.polymorphicId);
      } else {
        query = query.where(this.polymorphicIdColumn, options.polymorphicId);
      }
    }

    return query;
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validates polymorphic type and entity existence.
   *
   * @openapi
   * Lifecycle hook that validates polymorphic relationships before creating records.
   * Ensures type is valid and parent entity exists. Override in child classes
   * to add custom validation logic.
   *
   * @protected
   * @param {any} data - Data to be created
   * @returns {Promise<any>} Validated data
   * @throws {Error} When polymorphic fields are missing, type is invalid, or entity doesn't exist
   *
   * @example
   * ```typescript
   * // In child class - extend validation
   * protected async beforePolymorphicCreate(data: any): Promise<any> {
   *   // Call parent validation
   *   data = await super.beforePolymorphicCreate(data);
   *
   *   // Add custom validation
   *   if (data.url && !this.isValidUrl(data.url)) {
   *     throw new Error('Invalid URL format');
   *   }
   *
   *   return data;
   * }
   * ```
   */
  protected async beforePolymorphicCreate(data: any): Promise<any> {
    const entityType =
      data[this.camelToSnake(this.polymorphicTypeColumn.replace(/_/g, ""))];
    const entityId =
      data[this.camelToSnake(this.polymorphicIdColumn.replace(/_/g, ""))];

    if (!entityType || !entityId) {
      throw new Error(
        `Missing required polymorphic fields: ${this.polymorphicTypeColumn}, ${this.polymorphicIdColumn}`
      );
    }

    this.ensureValidType(entityType);

    // Validate entity exists
    const exists = await this.validateEntityExists(entityType, entityId);
    if (!exists) {
      throw new Error(
        `Referenced ${entityType} with ID ${entityId} does not exist`
      );
    }

    return data;
  }
}

/**
 * @openapi
 *
 * # Complete Usage Examples for Polymorphic Models
 *
 * ## Example 1: Creating a Photo Model with Polymorphic Relationships
 *
 * ```typescript
 * import { BasePolymorphicModel, PolymorphicEntity } from '@/models/base/polymorphic';
 *
 * // Define Photo entity interface
 * interface Photo extends PolymorphicEntity {
 *   url: string;
 *   alt: string;
 *   size: number;
 *   mimeType: string;
 * }
 *
 * interface CreatePhotoDTO {
 *   url: string;
 *   alt?: string;
 *   size: number;
 *   mimeType: string;
 *   displayOrder?: number;
 * }
 *
 * interface UpdatePhotoDTO {
 *   url?: string;
 *   alt?: string;
 *   displayOrder?: number;
 * }
 *
 * class PhotoModel extends BasePolymorphicModel<Photo, CreatePhotoDTO, UpdatePhotoDTO> {
 *   protected tableName = 'photos';
 *   protected primaryKey = 'id';
 *
 *   // Polymorphic configuration
 *   protected polymorphicTypeColumn = 'photoable_type';
 *   protected polymorphicIdColumn = 'photoable_id';
 *   protected validPolymorphicTypes = [
 *     'project',
 *     'apartment',
 *     'commercial_property',
 *     'blog_post'
 *   ];
 *
 *   protected config = {
 *     softDelete: true,
 *     timestamps: true,
 *     defaultSortColumn: 'display_order',
 *     defaultSortOrder: 'asc' as const,
 *     fillable: ['url', 'alt', 'size', 'mime_type', 'display_order'],
 *   };
 *
 *   protected mapToEntity(record: any): Photo {
 *     return {
 *       id: record.id,
 *       polymorphicType: record.photoable_type,
 *       polymorphicId: record.photoable_id,
 *       url: record.url,
 *       alt: record.alt || '',
 *       size: record.size,
 *       mimeType: record.mime_type,
 *       displayOrder: record.display_order,
 *       createdAt: new Date(record.created_at),
 *       updatedAt: new Date(record.updated_at),
 *       deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
 *     };
 *   }
 *
 *   // Custom method: Get photos by minimum size
 *   async getPhotosAboveSize(
 *     entityType: string,
 *     entityId: number,
 *     minSize: number
 *   ): Promise<Photo[]> {
 *     const photos = await this.getForEntity(entityType, entityId);
 *     return photos.filter(photo => photo.size >= minSize);
 *   }
 *
 *   // Custom method: Get cover photo
 *   async getCoverPhoto(entityType: string, entityId: number): Promise<Photo | null> {
 *     return this.getFirstForEntity(entityType, entityId);
 *   }
 * }
 *
 * export default PhotoModel;
 * ```
 *
 * ## Example 2: Using Polymorphic Model in Controller
 *
 * ```typescript
 * import { Request, Response } from 'express';
 * import PhotoModel from '@/models/PhotoModel';
 *
 * class PhotoController {
 *   private photoModel: PhotoModel;
 *
 *   constructor() {
 *     this.photoModel = new PhotoModel();
 *   }
 *
 *   // GET /api/photos/:entityType/:entityId
 *   async getEntityPhotos(req: Request, res: Response) {
 *     try {
 *       const { entityType, entityId } = req.params;
 *
 *       const photos = await this.photoModel.getForEntity(
 *         entityType,
 *         Number(entityId)
 *       );
 *
 *       res.json({
 *         success: true,
 *         data: photos,
 *         count: photos.length
 *       });
 *     } catch (error) {
 *       if (error.message.includes('Invalid polymorphic type')) {
 *         return res.status(400).json({
 *           success: false,
 *           error: 'ValidationError',
 *           message: error.message
 *         });
 *       }
 *
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message
 *       });
 *     }
 *   }
 *
 *   // POST /api/photos/:entityType/:entityId/bulk
 *   async bulkUpload(req: Request, res: Response) {
 *     try {
 *       const { entityType, entityId } = req.params;
 *       const { photos } = req.body;
 *
 *       const created = await this.photoModel.bulkCreateForEntity(
 *         entityType,
 *         Number(entityId),
 *         photos
 *       );
 *
 *       res.status(201).json({
 *         success: true,
 *         data: created,
 *         message: `${created.length} photos uploaded successfully`
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message
 *       });
 *     }
 *   }
 *
 *   // POST /api/photos/:entityType/:entityId/reorder
 *   async reorder(req: Request, res: Response) {
 *     try {
 *       const { entityType, entityId } = req.params;
 *       const { orderedIds } = req.body;
 *
 *       await this.photoModel.reorderForEntity(
 *         entityType,
 *         Number(entityId),
 *         orderedIds
 *       );
 *
 *       res.json({
 *         success: true,
 *         message: 'Photos reordered successfully'
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message
 *       });
 *     }
 *   }
 *
 *   // GET /api/photos/:entityType/:entityId/cover
 *   async getCover(req: Request, res: Response) {
 *     try {
 *       const { entityType, entityId } = req.params;
 *
 *       const cover = await this.photoModel.getFirstForEntity(
 *         entityType,
 *         Number(entityId)
 *       );
 *
 *       if (!cover) {
 *         return res.status(404).json({
 *           success: false,
 *           error: 'NotFoundError',
 *           message: 'No cover photo found'
 *         });
 *       }
 *
 *       res.json({
 *         success: true,
 *         data: cover
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message
 *       });
 *     }
 *   }
 *
 *   // DELETE /api/photos/:entityType/:entityId
 *   async deleteAll(req: Request, res: Response) {
 *     try {
 *       const { entityType, entityId } = req.params;
 *       const force = req.query.force === 'true';
 *
 *       const deleted = await this.photoModel.deleteForEntity(
 *         entityType,
 *         Number(entityId),
 *         force
 *       );
 *
 *       res.json({
 *         success: true,
 *         deleted,
 *         message: deleted ? 'Photos deleted successfully' : 'No photos to delete'
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message
 *       });
 *     }
 *   }
 *
 *   // GET /api/photos/statistics
 *   async getStatistics(req: Request, res: Response) {
 *     try {
 *       const counts = await this.photoModel.countByType();
 *       const grouped = await this.photoModel.groupByType({
 *         limit: 5,
 *         sortBy: 'created_at',
 *         sortOrder: 'desc'
 *       });
 *
 *       res.json({
 *         success: true,
 *         data: {
 *           counts,
 *           recentByType: grouped
 *         }
 *       });
 *     } catch (error) {
 *       res.status(500).json({
 *         success: false,
 *         error: 'DatabaseError',
 *         message: error.message
 *       });
 *     }
 *   }
 * }
 *
 * export default PhotoController;
 * ```
 *
 * ## Example 3: Service Layer with Polymorphic Operations
 *
 * ```typescript
 * import PhotoModel from '@/models/PhotoModel';
 * import ProjectModel from '@/models/ProjectModel';
 *
 * class ProjectService {
 *   private photoModel: PhotoModel;
 *   private projectModel: ProjectModel;
 *
 *   constructor() {
 *     this.photoModel = new PhotoModel();
 *     this.projectModel = new ProjectModel();
 *   }
 *
 *   // Create project with photos in transaction
 *   async createProjectWithPhotos(projectData: any, photoUrls: string[]) {
 *     return this.projectModel.transaction(async (trx) => {
 *       // Create project
 *       const project = await this.projectModel.create(projectData, trx);
 *
 *       // Create photos for project
 *       const photoData = photoUrls.map((url, index) => ({
 *         url,
 *         alt: `Project ${project.id} - Photo ${index + 1}`,
 *         size: 0, // Would be calculated from actual file
 *         mimeType: 'image/jpeg',
 *         displayOrder: index
 *       }));
 *
 *       const photos = await this.photoModel.bulkCreateForEntity(
 *         'project',
 *         project.id,
 *         photoData,
 *         trx
 *       );
 *
 *       return { project, photos };
 *     });
 *   }
 *
 *   // Transfer photos from one entity to another
 *   async transferPhotos(
 *     sourceType: string,
 *     sourceId: number,
 *     targetType: string,
 *     targetId: number
 *   ) {
 *     return this.photoModel.transaction(async (trx) => {
 *       // Get source photos
 *       const photos = await this.photoModel.getForEntity(
 *         sourceType,
 *         sourceId,
 *         {},
 *         trx
 *       );
 *
 *       if (photos.length === 0) {
 *         return { transferred: 0 };
 *       }
 *
 *       // Delete from source
 *       await this.photoModel.deleteForEntity(sourceType, sourceId, true, trx);
 *
 *       // Create at target
 *       const photoData = photos.map(photo => ({
 *         url: photo.url,
 *         alt: photo.alt,
 *         size: photo.size,
 *         mimeType: photo.mimeType,
 *         displayOrder: photo.displayOrder
 *       }));
 *
 *       await this.photoModel.bulkCreateForEntity(
 *         targetType,
 *         targetId,
 *         photoData,
 *         trx
 *       );
 *
 *       return { transferred: photos.length };
 *     });
 *   }
 *
 *   // Get project with cover photo
 *   async getProjectWithCover(projectId: number) {
 *     const project = await this.projectModel.findById(projectId);
 *     if (!project) {
 *       throw new Error('Project not found');
 *     }
 *
 *     const coverPhoto = await this.photoModel.getCoverPhoto('project', projectId);
 *
 *     return {
 *       ...project,
 *       coverPhoto
 *     };
 *   }
 * }
 *
 * export default ProjectService;
 * ```
 *
 * ## Example 4: Advanced Polymorphic Queries
 *
 * ```typescript
 * // Get photos for multiple projects
 * const projectPhotos = await photoModel.findAll({
 *   polymorphicType: 'project',
 *   polymorphicId: [1, 2, 3, 4],
 *   sortBy: 'display_order',
 *   sortOrder: 'asc'
 * });
 *
 * // Get photos across different entity types
 * const mixedPhotos = await photoModel.findAll({
 *   polymorphicType: ['project', 'apartment'],
 *   filters: [
 *     { field: 'size', operator: '>', value: 1000000 } // > 1MB
 *   ]
 * });
 *
 * // Get statistics
 * const stats = await photoModel.countByType();
 * // Result: { project: 150, apartment: 80, commercial_property: 45 }
 *
 * // Get grouped data
 * const grouped = await photoModel.groupByType({
 *   sortBy: 'created_at',
 *   sortOrder: 'desc',
 *   limit: 10
 * });
 * // Result: {
 * //   project: [recent10ProjectPhotos],
 * //   apartment: [recent10ApartmentPhotos]
 * // }
 * ```
 */

export default BasePolymorphicModel;
