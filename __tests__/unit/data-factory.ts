/**
 * Mock Data Factory - Refactored
 * Clean separation between DTO factories and entity creation functions
 * @module tests/data-factory
 */

import {
  // Core Models
  ProjectModel,
  ProjectType,
  ProjectStatus,
  ApartmentModel,
  ApartmentStatus,
  
  // Location
  LocationModel,
  LocationType,
  
  // Features
  FeatureModel,
  FeatureCategory,
  
  // Media (Polymorphic)
  PhotoModel,
  PhotoableType,
  FloorPlanModel,
  PlannableType,
  
  // Events
  EventModel,
  EventType,
  EventsLocationType,
  EventStatus,
  EventRegistrationModel,
  RegistrationStatus,
  EventInfluencerModel,
  InfluencerTier,
  CollaborationStatus,
  
  // Content
  BlogPostModel,
  blogPostSectionModel,
  commercialPropertyModel,
  CommercialPropertyType,
  CommercialPropertyStatus,
  customerFeedbackModel,
  FeedbackType,
  FeedbackLanguage,
  
  // Forms
  FormSubmissionModel,
  FormType,
} from "@/models";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number, decimals: number = 2): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const randomChoice = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const randomBool = (): boolean => Math.random() > 0.5;

const futureDate = (daysFromNow: number = 30): Date => {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysFromNow));
  return date;
};

const pastDate = (daysAgo: number = 30): Date => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(1, daysAgo));
  return date;
};

const randomEmail = (): string =>
  `user${Date.now()}${randomInt(1000, 9999)}@example.com`;

const randomPhone = (): string => `+21355${randomInt(1000000, 9999999)}`;

const randomName = (): string => {
  const firstNames = ['Ahmed', 'Fatima', 'Mohamed', 'Amina', 'Youssef', 'Leila', 'Karim', 'Nadia'];
  const lastNames = ['Benali', 'Kaddour', 'Mansouri', 'Belkacem', 'Hammadi', 'Djebbar', 'Boudiaf', 'Cherif'];
  return `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
};

const uniqueSlug = (prefix: string): string =>
  `${prefix}-${Date.now()}-${randomInt(1000, 9999)}`;

// ============================================================================
// LOCATION FACTORIES
// ============================================================================

/**
 * Creates a Location DTO with random data
 */
export const createLocationDto = (overrides: Partial<import("@/models").CreateLocationDto> = {}): import("@/models").CreateLocationDto => ({
  name: `Location ${randomInt(1, 1000)}`,
  slug: uniqueSlug('location'),
  parentId: overrides.parentId,
  type: randomChoice(Object.values(LocationType)),
  displayOrder: randomInt(0, 100),
  isActive: true,
  ...overrides,
});

/**
 * Creates and persists a Location entity
 */
export const createLocation = async (
  overrides: Partial<import("@/models").CreateLocationDto> = {}
): Promise<import("@/models").Location> => {
  const dto = createLocationDto(overrides);
  return await LocationModel.create(dto);
};

/**
 * Creates a complete location hierarchy (country → region → city → neighborhood)
 */
export const createLocationHierarchy = async () => {
  const country = await createLocation({
    name: 'Algeria',
    slug: 'algeria',
    type: LocationType.COUNTRY,
    parentId: undefined,
  });

  const region = await createLocation({
    name: 'Blida',
    slug: 'blida',
    type: LocationType.REGION,
    parentId: country.id,
  });

  const city = await createLocation({
    name: 'Blida City',
    slug: 'blida-city',
    type: LocationType.CITY,
    parentId: region.id,
  });

  const neighborhood = await createLocation({
    name: 'Downtown',
    slug: 'downtown',
    type: LocationType.NEIGHBORHOOD,
    parentId: city.id,
  });

  return { country, region, city, neighborhood };
};

// ============================================================================
// FEATURE FACTORIES
// ============================================================================

/**
 * Creates a Feature DTO with random data
 */
export const createFeatureDto = (overrides: Partial<import("@/models").CreateFeatureDto> = {}): import("@/models").CreateFeatureDto => ({
  name: `Feature ${randomInt(1, 100)}`,
  slug: uniqueSlug('feature'),
  icon: randomChoice(['🏊', '🏋️', '🔒', '🚗', '🎮', '🌳']),
  category: randomChoice(Object.values(FeatureCategory)),
  displayOrder: randomInt(0, 10),
  isActive: randomBool(),
  ...overrides,
});

/**
 * Creates and persists a Feature entity
 */
export const createFeature = async (
  overrides: Partial<import("@/models").CreateFeatureDto> = {}
): Promise<import("@/models").Feature> => {
  const dto = createFeatureDto(overrides);
  return await FeatureModel.create(dto);
};

/**
 * Creates standard feature set
 */
export const createStandardFeatures = async (): Promise<import("@/models").Feature[]> => {
  const features = [
    { name: 'Swimming Pool', icon: '🏊', category: FeatureCategory.AMENITY },
    { name: 'Gym', icon: '🏋️', category: FeatureCategory.AMENITY },
    { name: '24/7 Security', icon: '🔒', category: FeatureCategory.SECURITY },
    { name: 'Parking', icon: '🚗', category: FeatureCategory.TRANSPORT },
    { name: 'Playground', icon: '🎮', category: FeatureCategory.LEISURE },
    { name: 'Garden', icon: '🌳', category: FeatureCategory.LEISURE },
  ];

  return await Promise.all(
    features.map((f, i) => createFeature({ ...f, displayOrder: i }))
  );
};

// ============================================================================
// PROJECT FACTORIES
// ============================================================================

/**
 * Creates a Project DTO with random data
 */
export const createProjectDto = (overrides: Partial<import("@/models").CreateProjectDto> = {}): import("@/models").CreateProjectDto => ({
  name: `Project ${randomInt(1, 1000)}`,
  slug: uniqueSlug('project'),
  description: 'A high-quality development project with modern amenities',
  descriptionSecondary: 'Perfect for families looking for comfort and luxury',
  address: `${randomInt(1, 999)} Main Street, Algiers`,
  latitude: randomFloat(36.0, 37.0, 4),
  longitude: randomFloat(2.0, 4.0, 4),
  locationId: overrides.locationId,
  projectType: randomChoice(Object.values(ProjectType)),
  status: randomChoice(Object.values(ProjectStatus)),
  completionPercentage: randomInt(0, 100),
  estimatedCompletionDate: futureDate(365),
  totalBlocks: randomInt(1, 10),
  totalUnits: randomInt(10, 200),
  mainPhotoUrl: `https://picsum.photos/seed/${Date.now()}/800/600`,
  isFeatured: randomBool(),
  isPublished: true,
  ...overrides,
});

/**
 * Creates and persists a Project entity
 */
export const createProject = async (
  overrides: Partial<import("@/models").CreateProjectDto> = {}
): Promise<import("@/models").Project> => {
  const dto = createProjectDto(overrides);
  return await ProjectModel.create(dto);
};

/**
 * Creates a complete project with location and features
 */
export const createCompleteProject = async (
  projectOverrides: Partial<import("@/models").CreateProjectDto> = {}
) => {
  const location = await createLocation({
    type: LocationType.CITY,
    name: 'Test City',
  });

  const project = await createProject({
    locationId: location.id,
    ...projectOverrides,
  });

  const features = await createStandardFeatures();

  return { project, location, features };
};

// ============================================================================
// APARTMENT FACTORIES
// ============================================================================

/**
 * Creates an Apartment DTO with random data
 */
export const createApartmentDto = (overrides: Partial<import("@/models").CreateApartmentDto> = {}): import("@/models").CreateApartmentDto => ({
  projectId: overrides.projectId || 1,
  name: `Apartment ${randomInt(1, 1000)}`,
  unitNumber: `${randomChoice(['A', 'B', 'C', 'D'])}-${randomInt(101, 999)}`,
  floorNumber: randomInt(0, 10),
  title: `${randomInt(1, 4)} Pièces ${randomChoice(['Vue Mer', 'Vue Jardin', 'Standard'])}`,
  subtitle: 'Urban Living at its Finest',
  description: 'A beautiful apartment with stunning views and modern finishes',
  areaSqm: randomInt(80, 200),
  bedrooms: randomChoice([1, 2, 3, 4]),
  bathrooms: randomChoice([1, 2, 3]),
  price: randomInt(50000, 500000),
  livingRooms: 1,
  kitchens: 1,
  balconies: randomInt(0, 2),
  status: randomChoice(Object.values(ApartmentStatus)),
  isModelUnit: randomBool(),
  isPublished: true,
  virtualVisitUrl: randomBool() ? 'https://example.com/virtual-tour' : undefined,
  ...overrides,
});

/**
 * Creates and persists an Apartment entity
 */
export const createApartment = async (
  overrides: Partial<import("@/models").CreateApartmentDto> = {}
): Promise<import("@/models").Apartment> => {
  const dto = createApartmentDto(overrides);
  return await ApartmentModel.create(dto);
};

/**
 * Creates multiple apartments for a project
 */
export const createApartmentsForProject = async (
  projectId: number,
  count: number = 5
): Promise<import("@/models").Apartment[]> => {
  return await Promise.all(
    Array.from({ length: count }, (_, i) =>
      createApartment({
        projectId,
        unitNumber: `U${100 + i}`,
        floorNumber: Math.floor(i / 4) + 1,
        status: i === 0 ? ApartmentStatus.AVAILABLE : randomChoice(Object.values(ApartmentStatus)),
      })
    )
  );
};

// ============================================================================
// PHOTO FACTORIES (POLYMORPHIC)
// ============================================================================

/**
 * Creates a Photo DTO with random data
 */
export const createPhotoDto = (overrides: Partial<import("@/models").CreatePhotoDto> = {}): import("@/models").CreatePhotoDto => ({
  photoableType: randomChoice(Object.values(PhotoableType)),
  photoableId: randomInt(1, 100),
  url: `https://picsum.photos/seed/${Date.now()}/800/600`,
  externalUrl: randomBool() ? `https://example.com/photo-${Date.now()}.jpg` : null,
  caption: randomBool() ? `Beautiful view of the property` : null,
  displayOrder: 0,
  isCover: false,
  ...overrides,
});

/**
 * Creates and persists a Photo entity
 */
export const createPhoto = async (
  overrides: Partial<import("@/models").CreatePhotoDto> = {}
): Promise<import("@/models").Photo> => {
  const dto = createPhotoDto(overrides);
  return await PhotoModel.create(dto);
};

/**
 * Creates multiple photos for an entity
 */
export const createPhotosForEntity = async (
  entityType: PhotoableType,
  entityId: number,
  count: number = 5
): Promise<import("@/models").Photo[]> => {
  return await Promise.all(
    Array.from({ length: count }, (_, i) =>
      createPhoto({
        photoableType: entityType,
        photoableId: entityId,
        displayOrder: i,
        isCover: i === 0,
        caption: `Photo ${i + 1}`,
      })
    )
  );
};

// ============================================================================
// FLOOR PLAN FACTORIES (POLYMORPHIC)
// ============================================================================

/**
 * Creates a Floor Plan DTO with random data
 */
export const createFloorPlanDto = (overrides: Partial<import("@/models").CreateFloorPlanDto> = {}): import("@/models").CreateFloorPlanDto => ({
  plannableType: randomChoice([PlannableType.PROJECT, PlannableType.APARTMENT]),
  plannableId: randomInt(1, 100),
  name: `Floor Plan ${randomInt(1, 20)}`,
  imageUrl: `https://picsum.photos/seed/${Date.now()}/1200/800`,
  pdfUrl: randomBool() ? `https://example.com/plan-${Date.now()}.pdf` : null,
  displayOrder: 0,
  ...overrides,
});

/**
 * Creates and persists a Floor Plan entity
 */
export const createFloorPlan = async (
  overrides: Partial<import("@/models").CreateFloorPlanDto> = {}
): Promise<import("@/models").FloorPlan> => {
  const dto = createFloorPlanDto(overrides);
  return await FloorPlanModel.create(dto);
};

/**
 * Creates multiple floor plans for an entity
 */
export const createFloorPlansForEntity = async (
  entityType: PlannableType,
  entityId: number,
  count: number = 3
): Promise<import("@/models").FloorPlan[]> => {
  return await Promise.all(
    Array.from({ length: count }, (_, i) =>
      createFloorPlan({
        plannableType: entityType,
        plannableId: entityId,
        name: `Floor ${i + 1} Plan`,
        displayOrder: i,
      })
    )
  );
};

// ============================================================================
// EVENT FACTORIES
// ============================================================================

/**
 * Creates an Event DTO with random data
 */
export const createEventDto = (overrides: Partial<import("@/models").CreateEventDto> = {}): import("@/models").CreateEventDto => {
  const startDate = overrides.startDate || futureDate(30);
  const endDate = overrides.endDate || new Date(startDate.getTime() + 86400000);

  return {
    name: `Event ${randomInt(1, 1000)}`,
    slug: uniqueSlug('event'),
    eventType: randomChoice(Object.values(EventType)),
    description: 'An exciting event for potential buyers and investors',
    shortDescription: 'Join us for an unforgettable experience',
    startDate,
    endDate,
    timezone: 'Africa/Algiers',
    locationType: randomChoice(Object.values(EventsLocationType)),
    venueName: 'Convention Center',
    venueAddress: '123 Event Street',
    latitude: randomFloat(36.0, 37.0, 4),
    longitude: randomFloat(2.0, 4.0, 4),
    locationId: overrides.locationId,
    onlineMeetingUrl: 'https://meet.example.com/event',
    maxCapacity: randomInt(50, 500),
    requiresRegistration: true,
    isRegistrationOpen: true,
    registrationDeadline: futureDate(28),
    projectId: overrides.projectId,
    status: EventStatus.SCHEDULED,
    featuredImageUrl: `https://picsum.photos/seed/${Date.now()}/1200/600`,
    organizerName: 'Event Team',
    email: 'organizer@example.com',
    organizerPhone: '+213555123456',
    isFeatured: randomBool(),
    isPublished: true,
    ...overrides,
  };
};

/**
 * Creates and persists an Event entity
 */
export const createEvent = async (
  overrides: Partial<import("@/models").CreateEventDto> = {}
): Promise<import("@/models").Event> => {
  const dto = createEventDto(overrides);
  return await EventModel.create(dto);
};

// ============================================================================
// EVENT REGISTRATION FACTORIES
// ============================================================================

/**
 * Creates an Event Registration DTO with random data
 */
export const createEventRegistrationDto = (overrides: Partial<import("@/models").CreateRegistrationDto> = {}): import("@/models").CreateRegistrationDto => ({
  eventId: overrides.eventId || 1,
  fullName: randomName(),
  email: randomEmail(),
  phone: randomPhone(),
  company: randomBool() ? 'Tech Corp' : undefined,
  jobTitle: randomBool() ? 'Manager' : undefined,
  status: RegistrationStatus.CONFIRMED,
  registeredAt: new Date(),
  ...overrides,
});

/**
 * Creates and persists an Event Registration entity
 */
export const createEventRegistration = async (
  overrides: Partial<import("@/models").CreateRegistrationDto> = {}
): Promise<import("@/models").EventRegistration> => {
  const dto = createEventRegistrationDto(overrides);
  return await EventRegistrationModel.create(dto);
};

/**
 * Creates multiple registrations for an event
 */
export const createRegistrationsForEvent = async (
  eventId: number,
  count: number = 10
): Promise<import("@/models").EventRegistration[]> => {
  return await Promise.all(
    Array.from({ length: count }, (_, i) =>
      createEventRegistration({
        eventId,
        fullName: `Attendee ${i + 1}`,
        email: `attendee${i + 1}@example.com`,
        status: i < 8 ? RegistrationStatus.CONFIRMED : RegistrationStatus.PENDING,
      })
    )
  );
};

// ============================================================================
// EVENT INFLUENCER FACTORIES
// ============================================================================

/**
 * Creates an Event Influencer DTO with random data
 */
export const createEventInfluencerDto = (overrides: Partial<import("@/models").CreateInfluencerDto> = {}): import("@/models").CreateInfluencerDto => ({
  eventId: overrides.eventId || 1,
  influencerName: 'Social Media Star',
  influencerHandle: `@influencer${Date.now()}`,
  influencerEmail: randomEmail(),
  influencerPhone: randomPhone(),
  socialLinks: {
    instagram: 'https://instagram.com/influencer',
    youtube: 'https://youtube.com/@influencer',
  },
  followerCount: randomInt(10000, 1000000),
  tier: randomChoice(Object.values(InfluencerTier)),
  status: CollaborationStatus.INVITED,
  role: randomBool() ? 'Brand Ambassador' : 'Content Creator',
  ...overrides,
});

/**
 * Creates and persists an Event Influencer entity
 */
export const createEventInfluencer = async (
  overrides: Partial<import("@/models").CreateInfluencerDto> = {}
): Promise<import("@/models").EventInfluencer> => {
  const dto = createEventInfluencerDto(overrides);
  return await EventInfluencerModel.create(dto);
};

// ============================================================================
// BLOG POST FACTORIES
// ============================================================================

/**
 * Creates a Blog Post DTO with random data
 */
export const createBlogPostDto = (overrides: Partial<import("@/models").CreateBlogPostDto> = {}): import("@/models").CreateBlogPostDto => ({
  title: `Blog Post ${randomInt(1, 1000)}`,
  slug: uniqueSlug('blog-post'),
  authorName: 'Jane Writer',
  category: randomChoice(['Real Estate', 'Investment', 'Tips', 'Market News']),
  excerpt: 'A brief introduction to this amazing blog post',
  content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Detailed content goes here...',
  featuredImageUrl: `https://picsum.photos/seed/${Date.now()}/1200/600`,
  tags: ['real-estate', 'investment', 'tips'],
  isPublished: true,
  isFeatured: randomBool(),
  publishedAt: pastDate(30),
  ...overrides,
});

/**
 * Creates and persists a Blog Post entity
 */
export const createBlogPost = async (
  overrides: Partial<import("@/models").CreateBlogPostDto> = {}
): Promise<import("@/models").BlogPost> => {
  const dto = createBlogPostDto(overrides);
  return await BlogPostModel.create(dto);
};

/**
 * Creates a blog post with sections
 */
export const createBlogPostWithSections = async (
  postOverrides: Partial<import("@/models").CreateBlogPostDto> = {},
  sectionCount: number = 3
) => {
  const post = await createBlogPost(postOverrides);

  const sections = await Promise.all(
    Array.from({ length: sectionCount }, (_, i) =>
      blogPostSectionModel.create({
        blogPostId: post.id,
        sectionTitle: `Section ${i + 1}`,
        sectionContent: `Content for section ${i + 1}. Lorem ipsum dolor sit amet.`,
        sectionImageUrl: `https://picsum.photos/seed/${Date.now() + i}/800/600`,
        displayOrder: i,
      })
    )
  );

  return { post, sections };
};

// ============================================================================
// COMMERCIAL PROPERTY FACTORIES
// ============================================================================

/**
 * Creates a Commercial Property DTO with random data
 */
export const createCommercialPropertyDto = (overrides: Partial<import("@/models/content-management.model").CreateCommercialPropertyDto> = {}): import("@/models/content-management.model").CreateCommercialPropertyDto => ({
  title: `Commercial Property ${randomInt(1, 1000)}`,
  slug: uniqueSlug('commercial'),
  subtitle: 'Prime location for your business',
  description: 'Excellent commercial space in a high-traffic area',
  cardDescription: 'Modern commercial property',
  address: `${randomInt(1, 999)} Business Ave`,
  latitude: randomFloat(36.0, 37.0, 4),
  longitude: randomFloat(2.0, 4.0, 4),
  locationId: overrides.locationId,
  propertyType: randomChoice(Object.values(CommercialPropertyType)),
  areaSqm: randomInt(50, 500),
  price: randomInt(100000, 2000000),
  status: randomChoice(Object.values(CommercialPropertyStatus)),
  mainImageUrl: `https://picsum.photos/seed/${Date.now()}/1200/800`,
  isFeatured: randomBool(),
  isPublished: true,
  ...overrides,
});

/**
 * Creates and persists a Commercial Property entity
 */
export const createCommercialProperty = async (
  overrides: Partial<import("@/models/content-management.model").CreateCommercialPropertyDto> = {}
): Promise<import("@/models/content-management.model").CommercialProperty> => {
  const dto = createCommercialPropertyDto(overrides);
  return await commercialPropertyModel.create(dto);
};

// ============================================================================
// CUSTOMER FEEDBACK FACTORIES
// ============================================================================

/**
 * Creates a Customer Feedback DTO with random data
 */
export const createCustomerFeedbackDto = (overrides: Partial<import("@/models/content-management.model").CreateFeedbackDto> = {}): import("@/models/content-management.model").CreateFeedbackDto => ({
  fullName: randomName(),
  email: randomEmail(),
  phone: randomPhone(),
  feedbackType: randomChoice(Object.values(FeedbackType)),
  projectId: overrides.projectId,
  relatedEvent: randomBool() ? 'Grand Opening Event' : undefined,
  language: randomChoice(Object.values(FeedbackLanguage)),
  ...overrides,
});

/**
 * Creates and persists a Customer Feedback entity
 */
export const createCustomerFeedback = async (
  overrides: Partial<import("@/models/content-management.model").CreateFeedbackDto> = {}
): Promise<import("@/models/content-management.model").CustomerFeedback> => {
  const dto = createCustomerFeedbackDto(overrides);
  return await customerFeedbackModel.create(dto);
};

// ============================================================================
// FORM SUBMISSION FACTORIES
// ============================================================================

/**
 * Creates a Form Submission DTO with random data
 */
export const createFormSubmissionDto = (overrides: Partial<import("@/models").CreateFormSubmissionDto> = {}): import("@/models").CreateFormSubmissionDto => {
  const name = randomName().split(' ');
  
  return {
    formType: randomChoice(Object.values(FormType)),
    formId: `form_${Date.now()}`,
    projectId: overrides.projectId,
    email: randomEmail(),
    phone: randomPhone(),
    firstName: name[0],
    lastName: name[1],
    note: 'This is a test submission',
    ...overrides,
  };
};

/**
 * Creates and persists a Form Submission entity
 */
export const createFormSubmission = async (
  overrides: Partial<import("@/models").CreateFormSubmissionDto> = {}
): Promise<import("@/models").FormSubmission> => {
  const dto = createFormSubmissionDto(overrides);
  return await FormSubmissionModel.create(dto);
};

// ============================================================================
// COMPLEX SCENARIO BUILDERS
// ============================================================================

/**
 * Creates a complete project with apartments, photos, and floor plans
 */
export const createFullProject = async (
  projectOverrides: Partial<import("@/models").CreateProjectDto> = {},
  options: {
    apartmentCount?: number;
    photoCount?: number;
    floorPlanCount?: number;
  } = {}
) => {
  const { apartmentCount = 5, photoCount = 8, floorPlanCount = 3 } = options;

  // Create location
  const location = await createLocation({
    type: LocationType.CITY,
    name: 'Test City',
  });

  // Create project
  const project = await createProject({
    locationId: location.id,
    ...projectOverrides,
  });

  // Create features
  const features = await createStandardFeatures();

  // Create apartments
  const apartments = await createApartmentsForProject(project.id, apartmentCount);

  // Create photos for project
  const projectPhotos = await createPhotosForEntity(
    PhotoableType.PROJECT,
    project.id,
    photoCount
  );

  // Create floor plans for project
  const projectFloorPlans = await createFloorPlansForEntity(
    PlannableType.PROJECT,
    project.id,
    floorPlanCount
  );

  // Create media for each apartment
  for (const apartment of apartments) {
    await createPhotosForEntity(PhotoableType.APARTMENT, apartment.id, 3);
    await createFloorPlansForEntity(PlannableType.APARTMENT, apartment.id, 1);
  }

  return {
    project,
    location,
    features,
    apartments,
    photos: projectPhotos,
    floorPlans: projectFloorPlans,
  };
};

/**
 * Creates a complete event with registrations and influencers
 */
export const createFullEvent = async (
  eventOverrides: Partial<import("@/models").CreateEventDto> = {},
  options: {
    registrationCount?: number;
    influencerCount?: number;
  } = {}
) => {
  const { registrationCount = 10, influencerCount = 5 } = options;

  const event = await createEvent(eventOverrides);
  const registrations = await createRegistrationsForEvent(event.id, registrationCount);
  
  const influencers = await Promise.all(
    Array.from({ length: influencerCount }, () =>
      createEventInfluencer({ eventId: event.id })
    )
  );

  return { event, registrations, influencers };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Location
  createLocationDto,
  createLocation,
  createLocationHierarchy,

  // Feature
  createFeatureDto,
  createFeature,
  createStandardFeatures,

  // Project
  createProjectDto,
  createProject,
  createCompleteProject,

  // Apartment
  createApartmentDto,
  createApartment,
  createApartmentsForProject,

  // Photo
  createPhotoDto,
  createPhoto,
  createPhotosForEntity,

  // Floor Plan
  createFloorPlanDto,
  createFloorPlan,
  createFloorPlansForEntity,

  // Event
  createEventDto,
  createEvent,

  // Event Registration
  createEventRegistrationDto,
  createEventRegistration,
  createRegistrationsForEvent,

  // Event Influencer
  createEventInfluencerDto,
  createEventInfluencer,

  // Blog Post
  createBlogPostDto,
  createBlogPost,
  createBlogPostWithSections,

  // Commercial Property
  createCommercialPropertyDto,
  createCommercialProperty,

  // Customer Feedback
  createCustomerFeedbackDto,
  createCustomerFeedback,

  // Form Submission
  createFormSubmissionDto,
  createFormSubmission,

  // Complex Scenarios
  createFullProject,
  createFullEvent,

  // Utilities
  randomInt,
  randomFloat,
  randomChoice,
  randomBool,
  futureDate,
  pastDate,
  randomEmail,
  randomPhone,
  randomName,
  uniqueSlug,
};