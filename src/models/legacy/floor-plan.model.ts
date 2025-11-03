/**
 * Floor Plan Model (Polymorphic)
 * Represents floor plans for multiple entity types
 * Similar to PhotoModel pattern
 * FIXED: Changed externalUrl to pdfUrl to match database schema
 * FIXED: Added empty array handling in bulkCreate
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
  COMMERCIAL_PROPERTY = "commercial_property",
}

/**
 * Floor plan entity interface
 */
export interface FloorPlan {
  id: number;
  plannableType: PlannableType;
  plannableId: number;
  name: string;
  imageUrl: string;
  pdfUrl: string | null;
  displayOrder: number;
  createdAt: Date;
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
    [PlannableType.COMMERCIAL_PROPERTY]: "commercial_properties",
  };

  /**
   * Validates if entity exists
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
   * Creates a new floor plan with validation
   */
  async create(data: CreateFloorPlanDto): Promise<FloorPlan> {
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
   * Gets floor plans for an entity
   */
  async getForEntity(
    plannableType: PlannableType,
    plannableId: number
  ): Promise<FloorPlan[]> {
    const plans = await this.db(this.tableName)
      .where({
        plannable_type: plannableType,
        plannable_id: plannableId,
      })
      .orderBy("display_order", "asc");

    return plans.map(this.mapToEntity);
  }

  /**
   * Bulk creates floor plans for an entity
   * FIXED: Added empty array handling
   */
  async bulkCreate(
    plannableType: PlannableType,
    plannableId: number,
    plans: Array<Omit<CreateFloorPlanDto, "plannableType" | "plannableId">>
  ): Promise<FloorPlan[]> {
    const entityExists = await this.validateEntity(plannableType, plannableId);
    if (!entityExists) {
      throw new Error(`Entity ${plannableType}:${plannableId} does not exist`);
    }

    // Handle empty array case
    if (plans.length === 0) {
      return [];
    }

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

    const insertedIds = await this.db(this.tableName).insert(planData);
    const firstId = insertedIds[0];

    const createdPlans = await this.db(this.tableName)
      .where({
        plannable_type: plannableType,
        plannable_id: plannableId,
      })
      .where("id", ">=", firstId)
      .orderBy("display_order", "asc")
      .limit(plans.length);

    return createdPlans.map(this.mapToEntity);
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
