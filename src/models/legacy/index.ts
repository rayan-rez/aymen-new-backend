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

// Commercial Property Model
export {
  default as CommercialPropertyModel,
  CommercialProperty,
  CommercialPropertyType,
  CommercialPropertyStatus,
  CreateCommercialPropertyDto,
  UpdateCommercialPropertyDto,
  CommercialPropertyQueryParams,
  CommercialPropertyWithRelations,
} from "./commercial-property.model";

// Polymorphic Photo Model (NEW)
export {
  default as PhotoModel,
  Photo,
  PhotoableType,
  CreatePhotoDto,
  UpdatePhotoDto,
  PhotoQueryParams,
} from "./photo.model";

// Polymorphic Floor Plan Model (NEW)
export {
  default as FloorPlanModel,
  FloorPlan,
  PlannableType,
  CreateFloorPlanDto,
  UpdateFloorPlanDto,
  FloorPlanQueryParams,
} from "./floor-plan.model";

// Contact Submission Model
export {
  default as ContactSubmissionModel,
  ContactSubmission,
  ContactSubmissionStatus,
  CreateContactSubmissionDto,
  UpdateContactSubmissionDto,
  ContactSubmissionQueryParams,
} from "./contact-submission.model";

// Project Inquiry Model
export {
  default as ProjectInquiryModel,
  ProjectInquiry,
  ProjectInquiryStatus,
  FinancingMethod,
  PurchaseTimeline,
  CreateProjectInquiryDto,
  UpdateProjectInquiryDto,
  ProjectInquiryQueryParams,
} from "./project-inquiry.model";

// Appointment Request Model
export {
  default as AppointmentRequestModel,
  AppointmentRequest,
  AppointmentRequestStatus,
  CreateAppointmentRequestDto,
  UpdateAppointmentRequestDto,
  AppointmentRequestQueryParams,
} from "./appointment-request.model";

// Event Registration Model
export {
  default as EventRegistrationModel,
  EventRegistration,
  EventType,
  CreateEventRegistrationDto,
  UpdateEventRegistrationDto,
  EventRegistrationQueryParams,
} from "./event-registration.model";

// Catalog Download Request Model
export {
  default as CatalogDownloadRequestModel,
  CatalogDownloadRequest,
  CreateCatalogDownloadRequestDto,
  UpdateCatalogDownloadRequestDto,
  CatalogDownloadRequestQueryParams,
} from "./catalog-download-request.model";

// Blog Post Model
export {
  default as BlogPostModel,
  BlogPost,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  BlogPostQueryParams,
  BlogPostWithRelations,
} from "./blog-post.model";

// Customer Feedback Model
export {
  default as CustomerFeedbackModel,
  CustomerFeedback,
  FeedbackType,
  FeedbackLanguage,
  CreateCustomerFeedbackDto,
  UpdateCustomerFeedbackDto,
  CustomerFeedbackQueryParams,
} from "./customer-feedback.model";

// Job Application Model
export {
  default as JobApplicationModel,
  JobApplication,
  JobApplicationStatus,
  CreateJobApplicationDto,
  UpdateJobApplicationDto,
  JobApplicationQueryParams,
} from "./job-application.model";

// Land Submission Model
export {
  default as LandSubmissionModel,
  LandSubmission,
  LandSubmissionStatus,
  CreateLandSubmissionDto,
  UpdateLandSubmissionDto,
  LandSubmissionQueryParams,
} from "./land-submission.model";

// Lead Source Model
export {
  default as LeadSourceModel,
  LeadSource,
  LeadType,
  DeviceType,
  CreateLeadSourceDto,
  UpdateLeadSourceDto,
  LeadSourceQueryParams,
} from "./lead-source.model";

// Marketing Consent Model
export {
  default as MarketingConsentModel,
  MarketingConsent,
  CreateMarketingConsentDto,
  UpdateMarketingConsentDto,
  MarketingConsentQueryParams,
} from "./marketing-consent.model";

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
 * Usage Examples with Polymorphic Models:
 *
 * @example
 * // Working with polymorphic photos
 * import { PhotoModel, PhotoableType } from './models';
 *
 * // Add photos to a project
 * const projectPhotos = await PhotoModel.bulkCreate(
 *   PhotoableType.PROJECT,
 *   1,
 *   [
 *     { url: "photo1.jpg", caption: "Front view", isCover: true },
 *     { url: "photo2.jpg", caption: "Side view" }
 *   ]
 * );
 *
 * // Get all photos for an apartment
 * const apartmentPhotos = await PhotoModel.getForEntity(
 *   PhotoableType.APARTMENT,
 *   5
 * );
 *
 * // Set cover photo
 * await PhotoModel.setCover(photoId);
 *
 * @example
 * // Working with polymorphic floor plans
 * import { FloorPlanModel, PlannableType } from './models';
 *
 * // Add floor plans to a project
 * const plans = await FloorPlanModel.bulkCreate(
 *   PlannableType.PROJECT,
 *   1,
 *   [
 *     { name: "Ground Floor", imageUrl: "plan1.jpg", pdfUrl: "plan1.pdf" },
 *     { name: "First Floor", imageUrl: "plan2.jpg" }
 *   ]
 * );
 *
 * // Get floor plans for an apartment
 * const apartmentPlans = await FloorPlanModel.getForEntity(
 *   PlannableType.APARTMENT,
 *   3
 * );
 *
 * // Reorder floor plans
 * await FloorPlanModel.reorder(PlannableType.PROJECT, 1, [5, 3, 7, 2]);
 *
 * @example
 * // Updated project queries with polymorphic relations
 * import { ProjectModel, PhotoModel, FloorPlanModel, PhotoableType, PlannableType } from './models';
 *
 * const project = await ProjectModel.findById(1);
 * const photos = await PhotoModel.getForEntity(PhotoableType.PROJECT, project.id);
 * const plans = await FloorPlanModel.getForEntity(PlannableType.PROJECT, project.id);
 *
 * const projectWithMedia = {
 *   ...project,
 *   photos,
 *   floorPlans: plans
 * };
 */
