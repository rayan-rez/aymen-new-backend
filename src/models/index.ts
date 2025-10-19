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
 * Usage Examples:
 *
 * @example
 * // Import specific model
 * import { LocationModel, ProjectInquiryModel } from './models';
 *
 * @example
 * // Use location model
 * const locations = await LocationModel.findAll({ type: LocationType.CITY });
 *
 * @example
 * // Create new project inquiry
 * const inquiry = await ProjectInquiryModel.create({
 *   firstName: "John",
 *   lastName: "Doe",
 *   email: "john@example.com",
 *   phone: "+213555123456",
 *   country: "Algeria"
 * });
 *
 * @example
 * // Get blog posts
 * const posts = await BlogPostModel.getPublished(10);
 *
 * @example
 * // Track lead source
 * const lead = await LeadSourceModel.create({
 *   leadEmail: "john@example.com",
 *   leadType: LeadType.CONTACT_FORM,
 *   utmSource: "facebook",
 *   utmMedium: "cpc",
 *   utmCampaign: "summer-2025"
 * });
 *
 * @example
 * // Manage marketing consent
 * await MarketingConsentModel.upsertConsent(
 *   "john@example.com",
 *   { email: true, sms: false, phone: true },
 *   "newsletter-signup"
 * );
 */
