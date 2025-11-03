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
 * Plannable type enumeration
 */
export enum PlannableType {
  PROJECT = "project",
  APARTMENT = "apartment",
}

/**
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
 * Update floor plan DTO
 */
export interface UpdateFloorPlanDto
  extends Partial<Omit<CreateFloorPlanDto, "plannableType" | "plannableId">> {}

/**
 * Floor plan query options
 */
export interface FloorPlanQueryOptions extends PolymorphicQueryOptions {
  hasPdf?: boolean;
  searchName?: string;
}

// ============================================================================
// FLOOR PLAN MODEL CLASS
// ============================================================================

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

  protected async afterCreate(entity: FloorPlan): Promise<void> {
    console.log(
      `✅ Floor plan "${entity.name}" created for ${entity.plannableType} ID ${entity.plannableId}`
    );
  }

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
   * Finds floor plan by name within an entity
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
   * Bulk creates floor plans for an entity
   * RENAMED from bulkCreate to avoid conflict with base class
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
   * Reorders floor plans for an entity
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
   * Finds floor plans with custom filters
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
   * Gets floor plans with PDF only
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
   * Searches floor plans by name
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
   * Duplicates floor plans from one entity to another
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
   * Updates floor plan files (image and/or PDF)
   */
  async updateFiles(
    id: number,
    files: { imageUrl?: string; pdfUrl?: string | null },
    trx?: Knex.Transaction
  ): Promise<FloorPlan | null> {
    return this.update(id, files, trx);
  }

  /**
   * Removes PDF from a floor plan
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
