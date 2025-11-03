/**
 * Enhanced Base Model with Advanced Features
 *
 * @module models/base
 * @abstract
 *
 * Features:
 * - Full TypeScript type safety
 * - Advanced filtering and querying
 * - Transaction support
 * - Relation loading (eager/lazy)
 * - Query builder extensions
 * - Batch operations optimization
 * - Custom column mapping
 * - Hooks/lifecycle methods
 */

import { Knex } from "knex";
import db from "@/config/database";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Base query parameters with advanced filtering
 */
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeDeleted?: boolean;
  search?: string;
  fields?: string[]; // Select specific fields
  relations?: string[]; // Relations to load
}

export interface DatabaseRecord {
  [key: string]: any;
}

/**
 * Advanced filter operators
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
 * Filter condition
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: any;
}

/**
 * Advanced query options
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
 * Paginated result with metadata
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
 * Batch operation result
 */
export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ id?: number; error: string }>;
}

/**
 * Relation definition
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
 * Model configuration
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

export abstract class BaseModel<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  // ------------------------------------------------------------------------
  // ABSTRACT PROPERTIES (Must be implemented by child classes)
  // ------------------------------------------------------------------------

  /**
   * Database table name
   */
  protected abstract tableName: string;

  /**
   * Primary key column name
   */
  protected primaryKey: string = "id";

  /**
   * Model configuration
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
   * Relations definition
   */
  protected relations: Record<string, RelationDefinition> = {};

  /**
   * Database connection instance
   */
  protected db: Knex;

  /**
   * Column name mapping (camelCase -> snake_case)
   */
  protected columnMap: Map<string, string> = new Map();

  // ------------------------------------------------------------------------
  // CONSTRUCTOR
  // ------------------------------------------------------------------------

  constructor(connection?: Knex) {
    this.db = connection || db;
    this.validateConnection();
    this.initializeColumnMap();
  }

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

  protected async beforeCreate?(data: TCreate): Promise<TCreate>;
  protected async afterCreate?(entity: T): Promise<void>;
  protected async beforeUpdate?(id: number, data: TUpdate): Promise<TUpdate>;
  protected async afterUpdate?(entity: T): Promise<void>;
  protected async beforeDelete?(id: number): Promise<void>;
  protected async afterDelete?(id: number): Promise<void>;

  // ------------------------------------------------------------------------
  // CORE CRUD OPERATIONS
  // ------------------------------------------------------------------------

  /**
   * Creates a new record with lifecycle hooks
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
   * Finds a record by ID with relations
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
   * Finds one record matching conditions
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
   * Finds all records with advanced filtering
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
   * Paginated results with advanced filtering
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
   * Updates a record by ID with lifecycle hooks
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
   * Deletes or soft-deletes a record
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
   * Restores a soft-deleted record
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
   * Hard deletes a record (bypass soft delete)
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
   * Optimized bulk create with transaction support
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
   * Optimized bulk update
   */
  async bulkUpdate(
    updates: Array<{ id: number; data: TUpdate }>,
    options: { chunkSize?: number } = {}
  ): Promise<BatchOperationResult> {
    const chunkSize = options.chunkSize || 100;
    const chunks = this.chunk(updates, chunkSize);
    let processed = 0;
    let failed = 0;
    const errors: Array<{ id?: number; error: string }> = [];

    const trx = await this.db.transaction();

    try {
      for (const chunk of chunks) {
        for (const { id, data } of chunk) {
          try {
            const filtered = this.filterFields(data);
            const updateData = this.mapToDatabase(filtered);

            if (this.config.timestamps) {
              updateData.updated_at = trx.fn.now();
            }

            await trx(this.tableName)
              .where({ [this.primaryKey]: id })
              .update(updateData);

            processed++;
          } catch (error) {
            failed++;
            errors.push({ id, error: (error as Error).message });
          }
        }
      }

      await trx.commit();
      return { success: failed === 0, processed, failed, errors };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Bulk delete records
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
   * Counts records with advanced filtering
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
   * Checks if record exists
   */
  async exists(
    conditions: Partial<Record<string, any>>,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const count = await this.count({ where: conditions }, trx);
    return count > 0;
  }

  /**
   * Gets first record or throws error
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
   * Gets first record or creates new one
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
   * Updates or creates record
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
   * Advanced search with full-text support
   */
  async search(
    searchTerm: string,
    options: AdvancedQueryOptions = {},
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
   * Loads relations for a single entity
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
   * Loads relations for multiple entities (optimized with eager loading)
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
   * Builds query with all filters and options
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
   * Applies advanced filters to query
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
   * Executes callback within transaction
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
   * Maps database record to entity (must be implemented by child)
   */
  protected abstract mapToEntity(record: any): T;

  /**
   * Maps entity to database format
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
   * Maps field names to column names for queries
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
   * Initializes column mapping (override for custom mappings)
   */
  protected initializeColumnMap(): void {
    // Default: empty map (will use camelToSnake conversion)
    // Override in child classes for custom mappings:
    // this.columnMap.set('userId', 'user_id');
  }

  /**
   * Filters fields based on fillable/guarded configuration
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
   * Converts camelCase to snake_case
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Converts snake_case to camelCase
   */
  protected snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Safely parses JSON field
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
   * Safely parses JSON array field
   */
  protected parseJsonArray<T = any>(value: any): T[] {
    const parsed = this.parseJson<T[]>(value);
    return Array.isArray(parsed) ? parsed : [];
  }

  /**
   * Chunks array into smaller arrays
   */
  protected chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Removes hidden fields from entity
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
   * Gets table name (useful for raw queries)
   */
  getTableName(): string {
    return this.tableName;
  }

  /**
   * Gets primary key column name
   */
  getPrimaryKey(): string {
    return this.primaryKey;
  }

  /**
   * Raw query execution (use with caution)
   */
  protected async raw<T = any>(
    query: string,
    bindings: Knex.RawBinding
  ): Promise<T> {
    return this.db.raw(query, bindings) as Promise<T>;
  }

  /**
   * Gets query builder for custom queries
   */
  query(trx?: Knex.Transaction): Knex.QueryBuilder {
    const connection = trx || this.db;
    return connection(this.tableName);
  }
}

export default BaseModel;
