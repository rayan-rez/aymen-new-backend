/**
 * Floor Plan Model (Polymorphic)
 * Represents floor plans for multiple entity types
 * Replaces: floor_plans (project), apartment_floor_plans
 *
 * @module models/floor-plan.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Plannable type enumeration
 * Defines which entities can have floor plans
 */
export enum PlannableType {
  PROJECT = "project",
  APARTMENT = "apartment",
}

/**
 * Floor plan entity interface
 * Represents a polymorphic floor plan
 */
export interface FloorPlan {
  /** Unique identifier */
  id: number;

  /** Type of parent entity */
  plannableType: PlannableType;

  /** ID of parent entity */
  plannableId: number;

  /** Floor plan name/title */
  name: string;

  /** Image URL */
  imageUrl: string;

  /** PDF URL (optional) */
  pdfUrl: string | null;

  /** Display order */
  displayOrder: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
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
export interface UpdateFloorPlanDto {
  name?: string;
  imageUrl?: string;
  pdfUrl?: string | null;
  displayOrder?: number;
}

/**
 * Floor plan query parameters
 */
export interface FloorPlanQueryParams extends BaseQueryParams {
  plannableType?: PlannableType;
  plannableId?: number;
}

/**
 * Floor Plan Model class
 * Handles all database operations for polymorphic floor plans
 */
class FloorPlanModel extends BaseModel<
  FloorPlan,
  CreateFloorPlanDto,
  UpdateFloorPlanDto
> {
  protected tableName = "floor_plans";

  /**
   * Table name mapping for entity validation
   */
  private readonly tableMap: Record<PlannableType, string> = {
    [PlannableType.PROJECT]: "projects",
    [PlannableType.APARTMENT]: "apartments",
  };

  /**
   * Validates if entity exists before creating floor plan
   */
  private async validateEntity(
    type: PlannableType,
    id: number
  ): Promise<boolean> {
    const table = this.tableMap[type];
    const result = await this.db(table).where({ id }).first();
    return !!result;
  }

  /**
   * Type guard for PlannableType
   */
  static isValidPlannableType(type: string): type is PlannableType {
    return Object.values(PlannableType).includes(type as PlannableType);
  }

  /**
   * Creates a new floor plan with entity validation
   * @override
   */
  async create(data: CreateFloorPlanDto): Promise<FloorPlan> {
    // Validate entity exists
    const entityExists = await this.validateEntity(
      data.plannableType,
      data.plannableId
    );

    if (!entityExists) {
      throw new Error(
        `Entity ${data.plannableType}:${data.plannableId} does not exist`
      );
    }

    return super.create(data);
  }

  /**
   * Finds all floor plans matching query parameters
   */
  async findAll(params: FloorPlanQueryParams = {}): Promise<FloorPlan[]> {
    let query = this.db(this.tableName);

    if (params.plannableType) {
      query = query.where({ plannable_type: params.plannableType });
    }

    if (params.plannableId !== undefined) {
      query = query.where({ plannable_id: params.plannableId });
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "asc");
    } else {
      query = query.orderBy("display_order", "asc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const plans = await query;
    return plans.map(this.mapToEntity);
  }

  /**
   * Gets floor plans for a specific entity
   */
  async getForEntity(
    plannableType: PlannableType,
    plannableId: number
  ): Promise<FloorPlan[]> {
    return this.findAll({ plannableType, plannableId });
  }

  /**
   * Deletes all floor plans for an entity
   */
  async deleteForEntity(
    plannableType: PlannableType,
    plannableId: number
  ): Promise<boolean> {
    const deleted = await this.db(this.tableName)
      .where({
        plannable_type: plannableType,
        plannable_id: plannableId,
      })
      .del();

    return deleted > 0;
  }

  /**
   * Reorders floor plans for an entity
   */
  async reorder(
    plannableType: PlannableType,
    plannableId: number,
    planIds: number[]
  ): Promise<boolean> {
    const trx = await this.db.transaction();

    try {
      for (let i = 0; i < planIds.length; i++) {
        await trx(this.tableName)
          .where({
            id: planIds[i],
            plannable_type: plannableType,
            plannable_id: plannableId,
          })
          .update({ display_order: i, updated_at: trx.fn.now() });
      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Gets floor plan count for an entity
   */
  async countForEntity(
    plannableType: PlannableType,
    plannableId: number
  ): Promise<number> {
    return this.count({
      plannable_type: plannableType,
      plannable_id: plannableId,
    });
  }

  /**
   * Bulk creates floor plans for an entity with transaction safety
   */
  async bulkCreate(
    plannableType: PlannableType,
    plannableId: number,
    plans: Array<Omit<CreateFloorPlanDto, "plannableType" | "plannableId">>
  ): Promise<FloorPlan[]> {
    // Validate entity exists
    const entityExists = await this.validateEntity(plannableType, plannableId);
    if (!entityExists) {
      throw new Error(
        `Entity ${plannableType}:${plannableId} does not exist`
      );
    }

    const trx = await this.db.transaction();

    try {
      const timestamp = new Date();
      const planData = plans.map((plan, index) => ({
        plannable_type: plannableType,
        plannable_id: plannableId,
        name: plan.name,
        image_url: plan.imageUrl,
        pdf_url: plan.pdfUrl || null,
        display_order:
          plan.displayOrder !== undefined ? plan.displayOrder : index,
        created_at: timestamp,
        updated_at: timestamp,
      }));

      await trx(this.tableName).insert(planData);

      // Re-fetch the inserted records
      const createdPlans = await trx(this.tableName)
        .where({
          plannable_type: plannableType,
          plannable_id: plannableId,
        })
        .where("created_at", ">=", timestamp)
        .orderBy("display_order", "asc");

      await trx.commit();
      return createdPlans.map(this.mapToEntity);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Updates multiple floor plans at once
   */
  async bulkUpdate(
    updates: Array<{ id: number; data: UpdateFloorPlanDto }>
  ): Promise<boolean> {
    const trx = await this.db.transaction();

    try {
      for (const update of updates) {
        const updateData = this.mapToDatabase(update.data);
        await trx(this.tableName)
          .where({ id: update.id })
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
   * Deletes multiple floor plans at once
   */
  async bulkDelete(planIds: number[]): Promise<boolean> {
    const trx = await this.db.transaction();

    try {
      await trx(this.tableName).whereIn("id", planIds).del();

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Maps database record to FloorPlan entity
   */
  protected mapToEntity(record: any): FloorPlan {
    return {
      id: record.id,
      plannableType: record.plannable_type as PlannableType,
      plannableId: record.plannable_id,
      name: record.name,
      imageUrl: record.image_url,
      pdfUrl: record.pdf_url,
      displayOrder: record.display_order,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new FloorPlanModel();