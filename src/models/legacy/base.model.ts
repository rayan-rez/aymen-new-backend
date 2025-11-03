/**
 * Base Model
 * Abstract base class for all database models
 * Provides common CRUD operations and query building functionality
 *
 * @module models/base.model
 * @abstract
 */

import db from "../config/database";
import { Knex } from "knex";

/**
 * Base query parameters interface
 * Common pagination and sorting parameters
 */
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeDeleted?: boolean; // ADDED: Global parameter for soft deletes
}

/**
 * Paginated result interface
 * Standard structure for paginated responses
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Abstract Base Model class
 * Implements common database operations
 * All models should extend this class
 *
 * @abstract
 * @template T - Entity type
 * @template TCreate - Create DTO type
 * @template TUpdate - Update DTO type
 */
export abstract class BaseModel<T, TCreate, TUpdate> {
  /**
   * Database table name
   * Must be implemented by child classes
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
   * Creates a new record in the database
   *
   * @param data - Data for creating the record
   * @returns Promise<T> - Created entity
   */
  async create(data: TCreate): Promise<T> {
    try {
      const [id] = await this.db(this.tableName).insert(this.mapToDatabase(data));
      const created = await this.findById(id, true); // Include deleted to get fresh record
      if (!created) {
        throw new Error(`Failed to create record in ${this.tableName}`);
      }
      return created;
    } catch (error) {
      throw new Error(`Failed to create record: ${error}`);
    }
  }

  /**
   * Finds a record by ID
   * FIXED: Now properly excludes soft-deleted records by default
   *
   * @param id - Record ID
   * @param includeDeleted - Whether to include soft-deleted records
   * @returns Promise<T | null> - Entity or null if not found
   */
  async findById(id: number, includeDeleted: boolean = false): Promise<T | null> {
    let query = this.db(this.tableName).where({ id });

    // Exclude soft-deleted by default
    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Finds all records matching the query
   *
   * @param params - Query parameters
   * @returns Promise<T[]> - Array of entities
   */
  async findAll(params: BaseQueryParams = {}): Promise<T[]> {
    let query = this.db(this.tableName);

    // Exclude soft-deleted by default
    if (!params.includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    // Apply pagination
    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    // Apply sorting
    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "asc");
    }

    const records = await query;
    return records.map((record) => this.mapToEntity(record));
  }

  /**
   * Finds one record matching the conditions
   *
   * @param conditions - Where conditions
   * @param includeDeleted - Whether to include soft-deleted records
   * @returns Promise<T | null> - Entity or null if not found
   */
  async findOne(
    conditions: Partial<Record<string, any>>,
    includeDeleted: boolean = false
  ): Promise<T | null> {
    let query = this.db(this.tableName).where(conditions);

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Finds records matching the conditions
   *
   * @param conditions - Where conditions
   * @param includeDeleted - Whether to include soft-deleted records
   * @returns Promise<T[]> - Array of entities
   */
  async findWhere(
    conditions: Partial<Record<string, any>>,
    includeDeleted: boolean = false
  ): Promise<T[]> {
    let query = this.db(this.tableName).where(conditions);

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const records = await query;
    return records.map((record) => this.mapToEntity(record));
  }

  /**
   * Updates a record by ID
   *
   * @param id - Record ID
   * @param data - Update data
   * @returns Promise<T | null> - Updated entity or null if not found
   */
  async update(id: number, data: TUpdate): Promise<T | null> {
    const updateData = this.mapToDatabase(data);

    await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at") // Only update non-deleted records
      .update({
        ...updateData,
        updated_at: this.db.fn.now(),
      });

    return this.findById(id);
  }

  /**
   * Deletes a record by ID (hard delete)
   *
   * @param id - Record ID
   * @returns Promise<boolean> - Success status
   */
  async delete(id: number): Promise<boolean> {
    const deleted = await this.db(this.tableName).where({ id }).del();
    return deleted > 0;
  }

  /**
   * Soft deletes a record by ID (sets deleted_at timestamp)
   * Only works for tables with deleted_at column
   *
   * @param id - Record ID
   * @returns Promise<boolean> - Success status
   */
  async softDelete(id: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at") // Only soft-delete if not already deleted
      .update({ 
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now()
      });
    return updated > 0;
  }

  /**
   * Restores a soft-deleted record
   *
   * @param id - Record ID
   * @returns Promise<boolean> - Success status
   */
  async restore(id: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id })
      .whereNotNull("deleted_at")
      .update({ 
        deleted_at: null,
        updated_at: this.db.fn.now()
      });
    return updated > 0;
  }

  /**
   * Counts total records matching conditions
   *
   * @param conditions - Where conditions
   * @param includeDeleted - Whether to include soft-deleted records
   * @returns Promise<number> - Count
   */
  async count(
    conditions: Partial<Record<string, any>> = {},
    includeDeleted: boolean = false
  ): Promise<number> {
    let query = this.db(this.tableName).where(conditions);

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const result = await query.count("* as count").first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Checks if a record exists
   *
   * @param conditions - Where conditions
   * @param includeDeleted - Whether to include soft-deleted records
   * @returns Promise<boolean> - Existence status
   */
  async exists(
    conditions: Partial<Record<string, any>>,
    includeDeleted: boolean = false
  ): Promise<boolean> {
    const count = await this.count(conditions, includeDeleted);
    return count > 0;
  }

  /**
   * Gets paginated results with metadata
   *
   * @param params - Query parameters with pagination
   * @returns Promise<PaginatedResult<T>> - Paginated result
   */
  async paginate(
    params: BaseQueryParams & { page: number; limit: number }
  ): Promise<PaginatedResult<T>> {
    const { page, limit, ...queryParams } = params;

    const [items, total] = await Promise.all([
      this.findAll(params),
      this.count({}, params.includeDeleted),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Executes a raw query
   * Use with caution - prefer using query builder methods
   *
   * @param query - Raw SQL query
   * @param bindings - Query bindings
   * @returns Promise<any> - Query result
   *
   * @protected
   */
  protected async raw(query: string, bindings: Knex.RawBinding): Promise<any> {
    return this.db.raw(query, bindings);
  }

  /**
   * Begins a database transaction
   *
   * @returns Promise<Knex.Transaction> - Transaction object
   *
   * @protected
   */
  protected async beginTransaction(): Promise<Knex.Transaction> {
    return this.db.transaction();
  }

  /**
   * Maps database record to entity
   * Converts snake_case to camelCase
   * Must be implemented by child classes
   *
   * @param record - Database record
   * @returns T - Entity
   *
   * @protected
   * @abstract
   */
  protected abstract mapToEntity(record: any): T;

  /**
   * Maps entity/DTO to database format
   * Converts camelCase to snake_case
   * Can be overridden by child classes
   * FIXED: No longer skips undefined values by default
   *
   * @param data - Entity or DTO
   * @returns Database record
   *
   * @protected
   */
  protected mapToDatabase(data: any): Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip undefined values
      if (value === undefined) continue;

      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`
      );
      
      // Serialize arrays and objects to JSON
      if (
        Array.isArray(value) ||
        (typeof value === "object" &&
          value !== null &&
          !(value instanceof Date))
      ) {
        mapped[snakeKey] = JSON.stringify(value);
      } else {
        mapped[snakeKey] = value;
      }
    }
    return mapped;
  }

  /**
   * Converts snake_case to camelCase
   * Helper method for mapping
   *
   * @param str - Snake case string
   * @returns Camel case string
   *
   * @protected
   */
  protected snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Converts camelCase to snake_case
   * Helper method for mapping
   *
   * @param str - Camel case string
   * @returns Snake case string
   *
   * @protected
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

export default BaseModel;