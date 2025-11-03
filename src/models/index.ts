/**
 * Models Index
 * Central export point for all application models
 *
 * @module models
 */

// ============================================================================
// BASE MODEL
// ============================================================================
export * from "./base";
export { default as BaseModel } from "./base";

// ============================================================================
// CORE DOMAIN MODELS
// ============================================================================

// Location & Geography
export { default as LocationModel } from "./location.model";
export * from "./location.model";

// Features & Amenities
export { default as FeatureModel } from "./feature.model";
export * from "./feature.model";

// Projects & Properties
export { default as ProjectModel } from "./project.model";
export * from "./project.model";

export { default as ApartmentModel } from "./apartment.model";
export * from "./apartment.model";

// ============================================================================
// FORM & LEAD MANAGEMENT
// ============================================================================

export { default as FormSubmissionModel } from "./form-submission.model";
export * from "./form-submission.model";

export { default as LeadMirrorModel } from "./lead-mirror.model";
export * from "./lead-mirror.model";

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

export { default as EventModel } from "./event.model";
export * from "./event.model";

export { default as EventRegistrationModel } from "./event-registration.model";
export * from "./event-registration.model";

export { default as EventInfluencerModel } from "./event-influencer.model";
export * from "./event-influencer.model";

// ============================================================================
// CONTENT MANAGEMENT
// ============================================================================

// Blog
export { default as BlogPostModel } from "./blog-post.model";
export * from "./blog-post.model";

// Commercial & Feedback (from combined file)
export * from "./content-management.model";

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Using models in a service
 *
 * ```typescript
 * import { ProjectModel, ApartmentModel } from '@/models';
 *
 * // Find project with apartments
 * const project = await ProjectModel.findById(1, { relations: ['apartments'] });
 *
 * // Get available apartments
 * const available = await ApartmentModel.findAvailable(projectId);
 *
 * // Create event
 * const event = await EventModel.create({
 *   name: "Grand Opening",
 *   eventType: EventType.LAUNCH_EVENT,
 *   startDate: new Date("2025-12-01"),
 *   endDate: new Date("2025-12-01"),
 *   locationType: LocationType.PHYSICAL,
 *   description: "Join us for the grand opening!"
 * });
 * ```
 */

/**
 * Example: Using transactions
 *
 * ```typescript
 * import { ProjectModel, ApartmentModel } from '@/models';
 * import db from '@/config/database';
 *
 * const trx = await db.transaction();
 *
 * try {
 *   // Create project
 *   const project = await ProjectModel.create({
 *     name: "Luxury Residence",
 *     slug: "luxury-residence",
 *     address: "123 Main St",
 *     projectType: ProjectType.LUXURY
 *   }, trx);
 *
 *   // Create apartments
 *   await ApartmentModel.bulkCreate([
 *     { projectId: project.id, name: "Unit A", price: 1000000, areaSqm: 120 },
 *     { projectId: project.id, name: "Unit B", price: 1200000, areaSqm: 150 }
 *   ], { trx });
 *
 *   await trx.commit();
 * } catch (error) {
 *   await trx.rollback();
 *   throw error;
 * }
 * ```
 */

/**
 * Example: Advanced filtering
 *
 * ```typescript
 * import { ProjectModel, ProjectType, ProjectStatus } from '@/models';
 *
 * // Find published luxury projects with price range
 * const projects = await ProjectModel.findProjects({
 *   projectType: ProjectType.LUXURY,
 *   status: ProjectStatus.COMPLETED,
 *   isPublished: true,
 *   minPrice: 50000000,
 *   maxPrice: 100000000,
 *   page: 1,
 *   limit: 10
 * });
 *
 * // Search with full-text
 * const searchResults = await ProjectModel.fullTextSearch("beachfront villa", {
 *   isPublished: true
 * });
 * ```
 */

/**
 * Example: Statistics and analytics
 *
 * ```typescript
 * import { EventModel, EventRegistrationModel } from '@/models';
 *
 * // Get event with full statistics
 * const eventWithStats = await EventModel.getWithStats(eventId);
 *
 * console.log(eventWithStats.stats);
 * // {
 * //   totalRegistrations: 150,
 * //   confirmedRegistrations: 145,
 * //   attendedCount: 120,
 * //   attendanceRate: 82.76,
 * //   capacityPercentage: 75.00,
 * //   influencerCount: 5,
 * //   totalReach: 500000
 * // }
 *
 * // Get registration statistics
 * const regStats = await EventRegistrationModel.getEventStatistics(eventId);
 * ```
 */

/**
 * Example: Working with relations
 *
 * ```typescript
 * import { BlogPostModel, blogPostSectionModel } from '@/models';
 *
 * // Create blog post with sections
 * const post = await BlogPostModel.create({
 *   title: "Top 10 Real Estate Tips",
 *   authorName: "John Doe",
 *   content: "Introduction...",
 *   isPublished: true
 * });
 *
 * // Add sections
 * await blogPostSectionModel.create({
 *   blogPostId: post.id,
 *   sectionTitle: "Tip #1: Location Matters",
 *   sectionContent: "When buying property...",
 *   displayOrder: 0
 * });
 *
 * // Load post with sections
 * const fullPost = await BlogPostModel.findById(post.id, {
 *   relations: ['sections']
 * });
 * ```
 */
