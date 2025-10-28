/**
 * Enhanced Base Model
 * Abstract base class for all database models with improved type safety
 * 
 * @module models/base/base.model
 * @abstract
 */

import db from "@/config/database";
import { Knex } from "knex";

/**
 * Base query parameters interface
 */
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeDeleted?: boolean;
  search?: string;
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Timestamps interface
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Soft delete interface
 */
export interface SoftDelete {
  deletedAt: Date | null;
}

/**
 * Abstract Base Model class
 * 
 * @template T - Entity type
 * @template TCreate - Create DTO type
 * @template TUpdate - Update DTO type
 * 
 * @example
 * class ProjectModel extends BaseModel<Project, CreateProjectDto, UpdateProjectDto> {
 *   protected tableName = "projects";
 *   protected mapToEntity(record: any): Project { ... }
 * }
 */
export abstract class BaseModel<T, TCreate, TUpdate> {
  /**
   * Database table name
   * @protected
   * @abstract
   */
  protected abstract tableName: string;

  /**
   * Database connection instance
   * @protected
   */
  protected db: Knex = db;

  /**
   * Whether table supports soft deletes
   * @protected
   */
  protected supportsSoftDelete: boolean = false;

  /**
   * Default sort column
   * @protected
   */
  protected defaultSortColumn: string = "created_at";

  /**
   * Default sort order
   * @protected
   */
  protected defaultSortOrder: "asc" | "desc" = "desc";

  /**
   * Searchable columns for text search
   * @protected
   */
  protected searchableColumns: string[] = [];

  /**
   * Creates a new record
   */
  async create(data: TCreate): Promise<T> {
    const [id] = await this.db(this.tableName).insert(
      this.mapToDatabase(data)
    );
    
    const created = await this.findById(id, true);
    if (!created) {
      throw new Error(`Failed to create record in ${this.tableName}`);
    }
    return created;
  }

  /**
   * Bulk creates multiple records
   */
  async bulkCreate(data: TCreate[]): Promise<T[]> {
    if (data.length === 0) return [];

    const mappedData = data.map((item) => this.mapToDatabase(item));
    const insertedIds = await this.db(this.tableName).insert(mappedData);
    
    const firstId = insertedIds[0];
    const records = await this.db(this.tableName)
      .where("id", ">=", firstId)
      .limit(data.length);
    
    return records.map(this.mapToEntity.bind(this));
  }

  /**
   * Finds a record by ID
   */
  async findById(id: number, includeDeleted: boolean = false): Promise<T | null> {
    let query = this.db(this.tableName).where({ id });

    if (!includeDeleted && this.supportsSoftDelete) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Finds one record matching conditions
   */
  async findOne(
    conditions: Partial<Record<string, any>>,
    includeDeleted: boolean = false
  ): Promise<T | null> {
    let query = this.db(this.tableName).where(conditions);

    if (!includeDeleted && this.supportsSoftDelete) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Finds records matching conditions
   */
  async findWhere(
    conditions: Partial<Record<string, any>>,
    includeDeleted: boolean = false
  ): Promise<T[]> {
    let query = this.db(this.tableName).where(conditions);

    if (!includeDeleted && this.supportsSoftDelete) {
      query = query.whereNull("deleted_at");
    }

    const records = await query;
    return records.map(this.mapToEntity.bind(this));
  }

  /**
   * Finds all records with pagination and filtering
   */
  async findAll(params: BaseQueryParams = {}): Promise<T[]> {
    let query = this.buildBaseQuery(params);

    // Sorting
    const sortBy = params.sortBy || this.defaultSortColumn;
    const sortOrder = params.sortOrder || this.defaultSortOrder;
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const records = await query;
    return records.map(this.mapToEntity.bind(this));
  }

  /**
   * Gets paginated results with metadata
   */
  async paginate(
    params: BaseQueryParams & { page: number; limit: number }
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = params;

    const [items, total] = await Promise.all([
      this.findAll(params),
      this.count({}, params.includeDeleted),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Updates a record by ID
   */
  async update(id: number, data: TUpdate): Promise<T | null> {
    const updateData = this.mapToDatabase(data);

    await this.db(this.tableName)
      .where({ id })
      .update({
        ...updateData,
        updated_at: this.db.fn.now(),
      });

    return this.findById(id);
  }

  /**
   * Bulk updates multiple records
   */
  async bulkUpdate(
    updates: Array<{ id: number; data: TUpdate }>
  ): Promise<boolean> {
    const trx = await this.db.transaction();

    try {
      for (const { id, data } of updates) {
        const updateData = this.mapToDatabase(data);
        await trx(this.tableName)
          .where({ id })
          .update({
            ...updateData,
            updated_at: trx.fn.now(),
          });
      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Hard deletes a record
   */
  async delete(id: number): Promise<boolean> {
    const deleted = await this.db(this.tableName).where({ id }).del();
    return deleted > 0;
  }

  /**
   * Bulk hard deletes multiple records
   */
  async bulkDelete(ids: number[]): Promise<boolean> {
    const deleted = await this.db(this.tableName).whereIn("id", ids).del();
    return deleted > 0;
  }

  /**
   * Soft deletes a record (if supported)
   */
  async softDelete(id: number): Promise<boolean> {
    if (!this.supportsSoftDelete) {
      throw new Error(`Soft delete not supported for ${this.tableName}`);
    }

    const updated = await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at")
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Restores a soft-deleted record
   */
  async restore(id: number): Promise<boolean> {
    if (!this.supportsSoftDelete) {
      throw new Error(`Soft delete not supported for ${this.tableName}`);
    }

    const updated = await this.db(this.tableName)
      .where({ id })
      .whereNotNull("deleted_at")
      .update({
        deleted_at: null,
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Counts records matching conditions
   */
  async count(
    conditions: Partial<Record<string, any>> = {},
    includeDeleted: boolean = false
  ): Promise<number> {
    let query = this.db(this.tableName).where(conditions);

    if (!includeDeleted && this.supportsSoftDelete) {
      query = query.whereNull("deleted_at");
    }

    const result = await query.count("* as count").first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Checks if a record exists
   */
  async exists(
    conditions: Partial<Record<string, any>>,
    includeDeleted: boolean = false
  ): Promise<boolean> {
    const count = await this.count(conditions, includeDeleted);
    return count > 0;
  }

  /**
   * Performs a text search across searchable columns
   */
  async search(
    searchTerm: string,
    params: BaseQueryParams = {}
  ): Promise<T[]> {
    if (!searchTerm || this.searchableColumns.length === 0) {
      return this.findAll(params);
    }

    let query = this.buildBaseQuery(params);

    // Add search conditions
    query = query.where((builder) => {
      for (const column of this.searchableColumns) {
        builder.orWhere(column, "like", `%${searchTerm}%`);
      }
    });

    // Sorting
    const sortBy = params.sortBy || this.defaultSortColumn;
    const sortOrder = params.sortOrder || this.defaultSortOrder;
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const records = await query;
    return records.map(this.mapToEntity.bind(this));
  }

  /**
   * Executes a raw query (use with caution)
   */
  protected async raw(query: string, bindings: Knex.RawBinding): Promise<any> {
    return this.db.raw(query, bindings);
  }

  /**
   * Begins a database transaction
   */
  protected async beginTransaction(): Promise<Knex.Transaction> {
    return this.db.transaction();
  }

  /**
   * Builds base query with common filters
   */
  protected buildBaseQuery(params: BaseQueryParams): Knex.QueryBuilder {
    let query = this.db(this.tableName);

    // Soft delete filter
    if (!params.includeDeleted && this.supportsSoftDelete) {
      query = query.whereNull("deleted_at");
    }

    return query;
  }

  /**
   * Maps database record to entity
   * @abstract
   * @protected
   */
  protected abstract mapToEntity(record: any): T;

  /**
   * Maps entity/DTO to database format
   * @protected
   */
  protected mapToDatabase(data: any): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;

      const snakeKey = this.camelToSnake(key);

      // Serialize arrays and objects to JSON
      if (
        Array.isArray(value) ||
        (typeof value === "object" && value !== null && !(value instanceof Date))
      ) {
        mapped[snakeKey] = JSON.stringify(value);
      } else {
        mapped[snakeKey] = value;
      }
    }

    return mapped;
  }

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
}

export default BaseModel;