/**
 * Models Index
 * Central export point for all database models
 *
 * @module models/index
 */

// Base Model
export { BaseModel, BaseQueryParams, PaginatedResult } from "./base.model";

// Location Model
export {
  default as LocationModel,
  Location,
  LocationType,
  CreateLocationDto,
  UpdateLocationDto,
  LocationQueryParams,
  LocationWithChildren,
} from "./location.model";

// Feature Model
export {
  default as FeatureModel,
  Feature,
  FeatureCategory,
  CreateFeatureDto,
  UpdateFeatureDto,
  FeatureQueryParams,
} from "./feature.model";

// Project Model
export {
  default as ProjectModel,
  Project,
  ProjectStatus,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectQueryParams,
  ProjectWithRelations,
} from "./project.model";

// Apartment Model
export {
  default as ApartmentModel,
  Apartment,
  ApartmentStatus,
  CreateApartmentDto,
  UpdateApartmentDto,
  ApartmentQueryParams,
  ApartmentWithRelations,
} from "./apartment.model";

// Contact Submission Model
export {
  default as ContactSubmissionModel,
  ContactSubmission,
  ContactSubmissionStatus,
  CreateContactSubmissionDto,
  UpdateContactSubmissionDto,
  ContactSubmissionQueryParams,
} from "./contact-submission.model";

// User Model
export {
  default as UserModel,
  User,
  SafeUser,
  UserRole,
  CreateUserDto,
  UpdateUserDto,
  UserQueryParams,
} from "./user.model";

/**
 * Usage Examples:
 *
 * @example
 * // Import specific model
 * import { LocationModel } from './models';
 *
 * @example
 * // Use model
 * const locations = await LocationModel.findAll({ type: LocationType.CITY });
 *
 * @example
 * // Create new record
 * const location = await LocationModel.create({
 *   name: "Annaba",
 *   slug: "annaba",
 *   type: LocationType.CITY
 * });
 *
 * @example
 * // Update record
 * const updated = await LocationModel.update(1, { name: "New Name" });
 *
 * @example
 * // Delete record
 * await LocationModel.delete(1);
 */
