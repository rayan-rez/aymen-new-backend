/**
 * Base Polymorphic Model
 * 
 * Provides shared functionality for polymorphic relationships where a model
 * can belong to multiple parent types (e.g., photos belong to projects, apartments, etc.)
 * 
 * @module models/base/polymorphic
 * 
 * FIXED: bulkCreateForEntity now properly maps polymorphic column names
 */

import { BaseModel, AdvancedQueryOptions, DatabaseRecord } from "./index";
import { Knex } from "knex";

/**
 * Polymorphic entity interface
 * Base structure for all polymorphic models
 */
export interface PolymorphicEntity {
  id: number;
  polymorphicType: string;  // e.g., 'project', 'apartment'
  polymorphicId: number;    // Parent entity ID
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Polymorphic query options
 */
export interface PolymorphicQueryOptions extends AdvancedQueryOptions {
  polymorphicType?: string | string[];
  polymorphicId?: number | number[];
}

/**
 * Abstract Base Polymorphic Model
 * Provides common functionality for all polymorphic models
 * 
 * @abstract
 */
export abstract class BasePolymorphicModel<
  T extends PolymorphicEntity,
  TCreate = Partial<T>,
  TUpdate = Partial<T>
> extends BaseModel<T, TCreate, TUpdate> {
  /**
   * Name of the polymorphic type column (e.g., 'photoable_type', 'plannable_type')
   * Must be implemented by child classes
   */
  protected abstract polymorphicTypeColumn: string;

  /**
   * Name of the polymorphic ID column (e.g., 'photoable_id', 'plannable_id')
   * Must be implemented by child classes
   */
  protected abstract polymorphicIdColumn: string;

  /**
   * Valid polymorphic types for this model
   * Must be implemented by child classes
   */
  protected abstract validPolymorphicTypes: string[];

  /**
   * Override initializeColumnMap to set up polymorphic column mappings
   */
  protected initializeColumnMap(): void {
    super.initializeColumnMap();
    // Map camelCase polymorphic fields to actual database columns
    this.columnMap.set('polymorphicType', this.polymorphicTypeColumn);
    this.columnMap.set('polymorphicId', this.polymorphicIdColumn);
  }

  /**
   * Validates polymorphic type
   */
  protected validatePolymorphicType(type: string): boolean {
    return this.validPolymorphicTypes.includes(type);
  }

  /**
   * Ensures polymorphic type is valid
   */
  protected ensureValidType(type: string): void {
    if (!this.validatePolymorphicType(type)) {
      throw new Error(
        `Invalid polymorphic type "${type}". Valid types: ${this.validPolymorphicTypes.join(", ")}`
      );
    }
  }

  // ============================================================================
  // POLYMORPHIC-SPECIFIC QUERY METHODS
  // ============================================================================

  /**
   * Finds all records for a specific entity
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
   * Counts records for a specific entity
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
   * Finds records by entity type (all entities of that type)
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
   * Deletes all records for a specific entity
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
      // Soft delete - only delete non-deleted records
      query = query.whereNull("deleted_at");
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
   * Bulk creates records for a specific entity
   * FIXED VERSION - Properly maps all column names including polymorphic fields
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
      // Step 1: Build complete item with ALL fields in camelCase
      const itemWithPolymorphic = {
        ...item,
        polymorphicType: entityType,
        polymorphicId: entityId,
        displayOrder: (item as any).displayOrder ?? index,
      } as any;

      // Step 2: Filter fillable/guarded fields
      const filtered = this.filterFields(itemWithPolymorphic);
      
      // Step 3: CRITICAL FIX - Map ALL fields to database column names
      // This will convert:
      //   polymorphicType -> testable_type (via columnMap)
      //   polymorphicId -> testable_id (via columnMap)
      //   displayOrder -> display_order (via camelToSnake)
      const dbData = this.mapToDatabase(filtered);

      // Step 4: Add timestamps (already in correct format)
      if (this.config.timestamps) {
        dbData.created_at = connection.fn.now();
        dbData.updated_at = connection.fn.now();
      }

      return dbData;
    });

    await connection(this.tableName).insert(insertData);

    // Fetch and return created records
    return this.getForEntity(entityType, entityId, {}, trx);
  }

  /**
   * Reorders records for a specific entity
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
    const shouldCommit = !trx;
    const localTrx = trx || await connection.transaction();

    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await localTrx(this.tableName)
          .where({ id: orderedIds[i] })
          .where(this.polymorphicTypeColumn, entityType)
          .where(this.polymorphicIdColumn, entityId)
          .update({
            display_order: i,
            ...(this.config.timestamps && { updated_at: localTrx.fn.now() }),
          });
      }

      if (shouldCommit) {
        await localTrx.commit();
      }

      return true;
    } catch (error) {
      if (shouldCommit) {
        await localTrx.rollback();
      }
      throw error;
    }
  }

  /**
   * Gets the first record for an entity (useful for cover images, etc.)
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
   * Checks if an entity has any records
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
   * Gets entities grouped by polymorphic type
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
   * Gets count grouped by polymorphic type
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
   * Validates that entity exists before creating polymorphic record
   */
  protected async validateEntityExists(
    entityType: string,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    // Map entity type to table name
    const tableName = this.getTableNameForType(entityType);

    const exists = await connection(tableName)
      .where({ id: entityId })
      .first();

    return !!exists;
  }

  /**
   * Maps polymorphic type to database table name
   * Override in child classes if custom mapping needed
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
   * Applies polymorphic-specific filters to query
   */
  protected applyPolymorphicFilters(
    query: Knex.QueryBuilder,
    options: PolymorphicQueryOptions
  ): Knex.QueryBuilder {
    // Polymorphic type filter
    if (options.polymorphicType) {
      if (Array.isArray(options.polymorphicType)) {
        query = query.whereIn(this.polymorphicTypeColumn, options.polymorphicType);
      } else {
        query = query.where(this.polymorphicTypeColumn, options.polymorphicType);
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
   * Before create hook - validates polymorphic type and entity existence
   */
  protected async beforePolymorphicCreate(data: any): Promise<any> {
    const entityType = data.polymorphicType;
    const entityId = data.polymorphicId;

    if (!entityType || !entityId) {
      throw new Error(
        `Missing required polymorphic fields: polymorphicType, polymorphicId`
      );
    }

    this.ensureValidType(entityType);

    // Optional: Validate entity exists
    // const exists = await this.validateEntityExists(entityType, entityId);
    // if (!exists) {
    //   throw new Error(
    //     `Referenced ${entityType} with ID ${entityId} does not exist`
    //   );
    // }

    return data;
  }
}

export default BasePolymorphicModel;