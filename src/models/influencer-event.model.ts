import { BaseModel } from "@models/base.model";

/**
 * Influencer event registration entity
 */
interface InfluencerEventRegistration {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  selectedDays: string[] | null;
  selectedTimes: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create registration DTO
 */
interface CreateInfluencerRegistrationDto {
  email: string;
  first_name: string;
  last_name: string;
  n_telephone: string;
  selected_days?: string[] | null;
  selected_times?: string[] | null;
}

/**
 * Base model for influencer event registrations
 * Provides common CRUD operations for all influencer campaigns
 */
export class InfluencerEventModel extends BaseModel<
  InfluencerEventRegistration,
  CreateInfluencerRegistrationDto,
  Partial<CreateInfluencerRegistrationDto>
> {
  protected tableName: string;

  constructor(tableName: string) {
    super();
    this.tableName = tableName;
  }

  protected mapToEntity(record: any): InfluencerEventRegistration {
    return {
      id: record.id,
      email: record.email,
      firstName: record.first_name,
      lastName: record.last_name,
      phone: record.n_telephone,
      selectedDays: record.selected_days
        ? JSON.parse(record.selected_days)
        : null,
      selectedTimes: record.selected_times
        ? JSON.parse(record.selected_times)
        : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  protected mapToDatabase(data: any): Record<string, any> {
    const mapped: Record<string, any> = {};

    if (data.email !== undefined) mapped.email = data.email;
    if (data.first_name !== undefined) mapped.first_name = data.first_name;
    if (data.last_name !== undefined) mapped.last_name = data.last_name;
    if (data.n_telephone !== undefined) mapped.n_telephone = data.n_telephone;

    if (data.selected_days !== undefined) {
      mapped.selected_days = Array.isArray(data.selected_days)
        ? JSON.stringify(data.selected_days)
        : "[]";
    }

    if (data.selected_times !== undefined) {
      mapped.selected_times = Array.isArray(data.selected_times)
        ? JSON.stringify(data.selected_times)
        : "[]";
    }

    return mapped;
  }

  /**
   * Finds registration by email
   */
  async findByEmail(
    email: string
  ): Promise<InfluencerEventRegistration | null> {
    return this.findOne({ email: email.toLowerCase() });
  }
}
