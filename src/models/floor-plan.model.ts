/**
 * Floor Plan Model (Polymorphic) - FIXED
 * 
 * Handles floor plans for projects and apartments
 * Uses polymorphic relationship pattern
 * 
 * @module models/floor-plan.model
 */

import {
  BasePolymorphicModel,
  PolymorphicEntity,
  PolymorphicQueryOptions,
} from "./base/polymorphic";
import { Knex } from "knex";
import { DatabaseRecord } from "./base";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * components:
 *   schemas:
 *     
 *     PlannableType:
 *       type: string
 *       enum:
 *         - project
 *         - apartment
 *       description: Type of entity that can have floor plans
 *       example: project
 *     
 *     FloorPlan:
 *       type: object
 *       required:
 *         - id
 *         - plannableType
 *         - plannableId
 *         - name
 *         - imageUrl
 *         - displayOrder
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the floor plan
 *           example: 1
 *         plannableType:
 *           $ref: '#/components/schemas/PlannableType'
 *         plannableId:
 *           type: integer
 *           description: ID of the entity this floor plan belongs to
 *           example: 5
 *         name:
 *           type: string
 *           description: Name or title of the floor plan
 *           example: "Ground Floor Layout"
 *         imageUrl:
 *           type: string
 *           description: URL to the floor plan image
 *           example: "https://cdn.example.com/floor-plans/project-5-ground-floor.jpg"
 *         pdfUrl:
 *           type: string
 *           nullable: true
 *           description: URL to the floor plan PDF (optional)
 *           example: "https://cdn.example.com/floor-plans/project-5-ground-floor.pdf"
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting floor plans
 *           example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-25T16:20:00Z"
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Soft delete timestamp
 *           example: null
 *     
 *     CreateFloorPlanDto:
 *       type: object
 *       required:
 *         - plannableType
 *         - plannableId
 *         - name
 *         - imageUrl
 *       properties:
 *         plannableType:
 *           $ref: '#/components/schemas/PlannableType'
 *         plannableId:
 *           type: integer
 *           description: ID of the entity this floor plan belongs to
 *           example: 5
 *         name:
 *           type: string
 *           description: Name or title of the floor plan
 *           example: "Ground Floor Layout"
 *         imageUrl:
 *           type: string
 *           description: URL to the floor plan image
 *           example: "https://cdn.example.com/floor-plans/project-5-ground-floor.jpg"
 *         pdfUrl:
 *           type: string
 *           nullable: true
 *           description: URL to the floor plan PDF (optional)
 *           example: "https://cdn.example.com/floor-plans/project-5-ground-floor.pdf"
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting floor plans
 *           example: 0
 *     
 *     UpdateFloorPlanDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name or title of the floor plan
 *           example: "Ground Floor Layout (Updated)"
 *         imageUrl:
 *           type: string
 *           description: URL to the floor plan image
 *           example: "https://cdn.example.com/floor-plans/project-5-ground-floor-v2.jpg"
 *         pdfUrl:
 *           type: string
 *           nullable: true
 *           description: URL to the floor plan PDF
 *           example: "https://cdn.example.com/floor-plans/project-5-ground-floor-v2.pdf"
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting floor plans
 *           example: 1
 *     
 *     FloorPlanQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/PolymorphicQueryOptions'
 *         - type: object
 *           properties:
 *             hasPdf:
 *               type: boolean
 *               description: Filter floor plans that have PDF files
 *               example: true
 *             searchName:
 *               type: string
 *               description: Search floor plans by name (partial match)
 *               example: "ground floor"
 *     
 *     FloorPlanStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of floor plans for the entity
 *           example: 5
 *         withPdf:
 *           type: integer
 *           description: Number of floor plans with PDF files
 *           example: 3
 *         withoutPdf:
 *           type: integer
 *           description: Number of floor plans without PDF files
 *           example: 2
 */

/**
 * @openapi
 * Plannable type enumeration
 */
export enum PlannableType {
  PROJECT = "project",
  APARTMENT = "apartment",
}

/**
 * @openapi
 * Floor plan entity interface
 */
export interface FloorPlan extends PolymorphicEntity {
  id: number;
  plannableType: PlannableType;
  plannableId: number;
  name: string;
  imageUrl: string;
  pdfUrl: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * @openapi
 * Create floor plan DTO
 */
export interface CreateFloorPlanDto {
  plannableType: PlannableType;
  plannableId: number;
  name: string;
  imageUrl: string;
  pdfUrl?: string | null;
  displayOrder?: number;
}

/**
 * @openapi
 * Update floor plan DTO
 */
export interface UpdateFloorPlanDto
  extends Partial<Omit<CreateFloorPlanDto, "plannableType" | "plannableId">> {}

/**
 * @openapi
 * Floor plan query options
 */
export interface FloorPlanQueryOptions extends PolymorphicQueryOptions {
  hasPdf?: boolean;
  searchName?: string;
}

// ============================================================================
// FLOOR PLAN MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Floor Plan Model Class
 * 
 * Handles floor plans for projects and apartments using polymorphic relationships
 * Supports both image and PDF formats with ordering and search capabilities
 * 
 * @class FloorPlanModel
 * @extends BasePolymorphicModel<FloorPlan, CreateFloorPlanDto, UpdateFloorPlanDto>
 */
export class FloorPlanModel extends BasePolymorphicModel<
  FloorPlan,
  CreateFloorPlanDto,
  UpdateFloorPlanDto
> {
  protected tableName = "floor_plans";
  protected primaryKey = "id";

  protected polymorphicTypeColumn = "plannable_type";
  protected polymorphicIdColumn = "plannable_id";
  protected validPolymorphicTypes = Object.values(PlannableType);

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "display_order",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["name"],
    hiddenFields: [],
    fillable: [
      "plannableType",
      "plannableId",
      "name",
      "imageUrl",
      "pdfUrl",
      "displayOrder",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * @openapi
   * beforeCreate lifecycle hook
   * 
   * Validates and processes floor plan data before creation:
   * - Runs polymorphic validation
   * - Validates required fields (name and imageUrl)
   * - Prevents duplicate names within the same entity
   * - Sets default display order if not provided
   * 
   * @param {CreateFloorPlanDto} data - Floor plan creation data
   * @returns {Promise<CreateFloorPlanDto>} Processed data
   * @throws {Error} If validation fails
   */
  protected async beforeCreate(
    data: CreateFloorPlanDto
  ): Promise<CreateFloorPlanDto> {
    // Run polymorphic validation
    await this.beforePolymorphicCreate(data);

    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Floor plan name is required");
    }

    if (!data.imageUrl || data.imageUrl.trim().length === 0) {
      throw new Error("Floor plan image URL is required");
    }

    // Check for duplicate names within the same entity
    const existing = await this.findByName(
      data.plannableType,
      data.plannableId,
      data.name
    );

    if (existing) {
      throw new Error(
        `Floor plan with name "${data.name}" already exists for this ${data.plannableType}`
      );
    }

    // Set default display order if not provided
    if (data.displayOrder === undefined) {
      const count = await this.countForEntity(
        data.plannableType,
        data.plannableId
      );
      data.displayOrder = count;
    }

    return data;
  }

  /**
   * @openapi
   * afterCreate lifecycle hook
   * 
   * Logs floor plan creation event
   * 
   * @param {FloorPlan} entity - Created floor plan entity
   * @returns {Promise<void>}
   */
  protected async afterCreate(entity: FloorPlan): Promise<void> {
    console.log(
      `✅ Floor plan "${entity.name}" created for ${entity.plannableType} ID ${entity.plannableId}`
    );
  }

  /**
   * @openapi
   * beforeUpdate lifecycle hook
   * 
   * Validates and processes floor plan data before update:
   * - Prevents duplicate names if name is being changed
   * 
   * @param {number} id - Floor plan ID
   * @param {UpdateFloorPlanDto} data - Floor plan update data
   * @returns {Promise<UpdateFloorPlanDto>} Processed data
   * @throws {Error} If validation fails
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateFloorPlanDto
  ): Promise<UpdateFloorPlanDto> {
    const floorPlan = await this.findById(id);
    if (!floorPlan) {
      throw new Error("Floor plan not found");
    }

    // Check for duplicate names if name is being changed
    if (data.name && data.name !== floorPlan.name) {
      const existing = await this.findByName(
        floorPlan.plannableType,
        floorPlan.plannableId,
        data.name
      );

      if (existing && existing.id !== id) {
        throw new Error(
          `Floor plan with name "${data.name}" already exists for this ${floorPlan.plannableType}`
        );
      }
    }

    return data;
  }

  // ============================================================================
  // FLOOR PLAN-SPECIFIC METHODS (RENAMED TO AVOID CONFLICT)
  // ============================================================================

  /**
   * @openapi
   * Finds floor plan by name within an entity
   * 
   * @param {PlannableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {string} name - Floor plan name
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan | null>} Floor plan or null
   */
  async findByName(
    entityType: PlannableType,
    entityId: number,
    name: string,
    trx?: Knex.Transaction
  ): Promise<FloorPlan | null> {
    const connection = trx || this.db;

    let query = connection(this.tableName)
      .where("plannable_type", entityType)
      .where("plannable_id", entityId)
      .where("name", name)
      .first();

    if (this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    const record = await query;
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * @openapi
   * Bulk creates floor plans for an entity
   * 
   * @param {PlannableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {object[]} plansData - Array of floor plan data
   * @param {string} plansData[].name - Floor plan name
   * @param {string} plansData[].imageUrl - Floor plan image URL
   * @param {string} [plansData[].pdfUrl] - Floor plan PDF URL
   * @param {number} [plansData[].displayOrder] - Display order
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan[]>} Array of created floor plans
   */
  async createManyForEntity(
    entityType: PlannableType,
    entityId: number,
    plansData: Array<{
      name: string;
      imageUrl: string;
      pdfUrl?: string | null;
      displayOrder?: number;
    }>,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    const items = plansData.map((data) => ({
      plannableType: entityType,
      plannableId: entityId,
      ...data,
    }));

    return this.bulkCreateForEntity(entityType, entityId, items, trx);
  }

  /**
   * @openapi
   * Reorders floor plans for an entity
   * 
   * @param {PlannableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {number[]} planIds - Array of floor plan IDs in desired order
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} Success status
   */
  async reorder(
    entityType: PlannableType,
    entityId: number,
    planIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return this.reorderForEntity(entityType, entityId, planIds, trx);
  }

  /**
   * @openapi
   * Finds floor plans with custom filters
   * 
   * @param {FloorPlanQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan[]>} Array of floor plans
   */
  async findFloorPlans(
    options: FloorPlanQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply polymorphic filters
    query = this.applyPolymorphicFilters(query, options);

    // Apply floor plan-specific filters
    query = this.applyFloorPlanFilters(query, options);

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * @openapi
   * Gets floor plans with PDF only
   * 
   * @param {PlannableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan[]>} Array of floor plans with PDFs
   */
  async getFloorPlansWithPdf(
    entityType: PlannableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    return this.findFloorPlans(
      {
        polymorphicType: entityType,
        polymorphicId: entityId,
        hasPdf: true,
      },
      trx
    );
  }

  /**
   * @openapi
   * Searches floor plans by name
   * 
   * @param {PlannableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {string} searchTerm - Search term
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan[]>} Array of matching floor plans
   */
  async searchByName(
    entityType: PlannableType,
    entityId: number,
    searchTerm: string,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    return this.findFloorPlans(
      {
        polymorphicType: entityType,
        polymorphicId: entityId,
        searchName: searchTerm,
      },
      trx
    );
  }

  /**
   * @openapi
   * Duplicates floor plans from one entity to another
   * 
   * @param {PlannableType} sourceType - Source entity type
   * @param {number} sourceId - Source entity ID
   * @param {PlannableType} targetType - Target entity type
   * @param {number} targetId - Target entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan[]>} Array of duplicated floor plans
   */
  async duplicateFloorPlans(
    sourceType: PlannableType,
    sourceId: number,
    targetType: PlannableType,
    targetId: number,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    const sourcePlans = await this.getForEntity(sourceType, sourceId, {}, trx);

    if (sourcePlans.length === 0) return [];

    const planData = sourcePlans.map((plan) => ({
      name: plan.name,
      imageUrl: plan.imageUrl,
      pdfUrl: plan.pdfUrl,
      displayOrder: plan.displayOrder,
    }));

    return this.createManyForEntity(targetType, targetId, planData, trx);
  }

  /**
   * @openapi
   * Updates floor plan files (image and/or PDF)
   * 
   * @param {number} id - Floor plan ID
   * @param {object} files - Files to update
   * @param {string} [files.imageUrl] - New image URL
   * @param {string} [files.pdfUrl] - New PDF URL
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan | null>} Updated floor plan or null
   */
  async updateFiles(
    id: number,
    files: { imageUrl?: string; pdfUrl?: string | null },
    trx?: Knex.Transaction
  ): Promise<FloorPlan | null> {
    return this.update(id, files, trx);
  }

  /**
   * @openapi
   * Removes PDF from a floor plan
   * 
   * @param {number} id - Floor plan ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan | null>} Updated floor plan or null
   */
  async removePdf(
    id: number,
    trx?: Knex.Transaction
  ): Promise<FloorPlan | null> {
    return this.update(id, { pdfUrl: null }, trx);
  }

  // ============================================================================
  // STATISTICS METHODS
  // ============================================================================

  /**
   * @openapi
   * Gets floor plan statistics for an entity
   * 
   * @param {PlannableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlanStatistics>} Statistics object
   */
  async getStatistics(
    entityType: PlannableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<{
    total: number;
    withPdf: number;
    withoutPdf: number;
  }> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName)
      .where("plannable_type", entityType)
      .where("plannable_id", entityId)
      .whereNull("deleted_at")
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw(
          "COUNT(CASE WHEN pdf_url IS NOT NULL AND pdf_url != '' THEN 1 END) as withPdf"
        )
      );

    const total = Number(stats.total);
    const withPdf = Number(stats.withPdf);

    return {
      total,
      withPdf,
      withoutPdf: total - withPdf,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * @openapi
   * Applies floor plan-specific filters to query
   * 
   * @param {Knex.QueryBuilder} query - Database query builder
   * @param {FloorPlanQueryOptions} options - Query options
   * @returns {Knex.QueryBuilder} Modified query builder
   */
  private applyFloorPlanFilters(
    query: Knex.QueryBuilder,
    options: FloorPlanQueryOptions
  ): Knex.QueryBuilder {
    // Has PDF filter
    if (options.hasPdf !== undefined) {
      if (options.hasPdf) {
        query = query.whereNotNull("pdf_url").where("pdf_url", "!=", "");
      } else {
        query = query.where(function () {
          this.whereNull("pdf_url").orWhere("pdf_url", "=", "");
        });
      }
    }

    // Name search filter
    if (options.searchName) {
      query = query.where("name", "like", `%${options.searchName}%`);
    }

    return query;
  }

  /**
   * @openapi
   * Maps database record to FloorPlan entity
   * 
   * @param {DatabaseRecord} record - Database record
   * @returns {FloorPlan} FloorPlan entity
   */
  protected mapToEntity(record: DatabaseRecord): FloorPlan {
    return {
      id: record.id,
      plannableType: record.plannable_type as PlannableType,
      plannableId: record.plannable_id,
      polymorphicType: record.plannable_type,
      polymorphicId: record.plannable_id,
      name: record.name,
      imageUrl: record.image_url,
      pdfUrl: record.pdf_url,
      displayOrder: record.display_order || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }

  /**
   * @openapi
   * Initializes column mapping for database operations
   */
  protected initializeColumnMap(): void {
    this.columnMap.set("plannableType", "plannable_type");
    this.columnMap.set("plannableId", "plannable_id");
    this.columnMap.set("imageUrl", "image_url");
    this.columnMap.set("pdfUrl", "pdf_url");
    this.columnMap.set("displayOrder", "display_order");
  }
}

// Export singleton instance
export default new FloorPlanModel();