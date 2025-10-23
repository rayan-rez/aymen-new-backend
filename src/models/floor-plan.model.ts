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
   * Finds all floor plans matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<FloorPlan[]> - Array of floor plans
   *
   * @example
   * const plans = await FloorPlanModel.findAll({
   *   plannableType: PlannableType.PROJECT,
   *   plannableId: 1
   * });
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
   *
   * @param plannableType - Entity type
   * @param plannableId - Entity ID
   * @returns Promise<FloorPlan[]> - Entity floor plans
   *
   * @example
   * const projectPlans = await FloorPlanModel.getForEntity(PlannableType.PROJECT, 1);
   */
  async getForEntity(
    plannableType: PlannableType,
    plannableId: number
  ): Promise<FloorPlan[]> {
    return this.findAll({ plannableType, plannableId });
  }

  /**
   * Deletes all floor plans for an entity
   *
   * @param plannableType - Entity type
   * @param plannableId - Entity ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await FloorPlanModel.deleteForEntity(PlannableType.PROJECT, 1);
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
   *
   * @param plannableType - Entity type
   * @param plannableId - Entity ID
   * @param planIds - Array of plan IDs in desired order
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await FloorPlanModel.reorder(PlannableType.PROJECT, 1, [5, 3, 7]);
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
          .update({ display_order: i });
      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      return false;
    }
  }

  /**
   * Gets floor plan count for an entity
   *
   * @param plannableType - Entity type
   * @param plannableId - Entity ID
   * @returns Promise<number> - Floor plan count
   *
   * @example
   * const count = await FloorPlanModel.countForEntity(PlannableType.PROJECT, 1);
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
   * Bulk creates floor plans for an entity
   *
   * @param plannableType - Entity type
   * @param plannableId - Entity ID
   * @param plans - Array of floor plan data
   * @returns Promise<FloorPlan[]> - Created floor plans
   *
   * @example
   * const plans = await FloorPlanModel.bulkCreate(PlannableType.APARTMENT, 1, [
   *   { name: "Ground Floor", imageUrl: "plan1.jpg", pdfUrl: "plan1.pdf" },
   *   { name: "First Floor", imageUrl: "plan2.jpg" }
   * ]);
   */
  async bulkCreate(
    plannableType: PlannableType,
    plannableId: number,
    plans: Array<Omit<CreateFloorPlanDto, "plannableType" | "plannableId">>
  ): Promise<FloorPlan[]> {
    const planData = plans.map((plan, index) => ({
      plannable_type: plannableType,
      plannable_id: plannableId,
      name: plan.name,
      image_url: plan.imageUrl,
      pdf_url: plan.pdfUrl || null,
      display_order:
        plan.displayOrder !== undefined ? plan.displayOrder : index,
    }));

    const ids = await this.db(this.tableName).insert(planData);

    // Fetch and return created plans
    const createdPlans = await this.db(this.tableName)
      .whereIn("id", ids)
      .orderBy("display_order", "asc");

    return createdPlans.map(this.mapToEntity);
  }

  /**
   * Maps database record to FloorPlan entity
   *
   * @param record - Database record
   * @returns FloorPlan entity
   *
   * @protected
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
