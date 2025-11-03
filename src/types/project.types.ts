/**
 * Project Types and Interfaces
 * Centralized type definitions for Project domain
 * 
 * @module types/project.types
 */

import { ProjectType, ProjectStatus, Project } from "@/models/new/project.model";

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Create project request
 */
export interface CreateProjectRequest {
  name: string;
  slug?: string;
  description?: string;
  descriptionSecondary?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  locationId?: number;
  projectType?: ProjectType;
  status?: ProjectStatus;
  completionPercentage?: number;
  estimatedCompletionDate?: string; // ISO date string
  actualCompletionDate?: string;
  totalBlocks?: number;
  totalUnits?: number;
  mainPhotoUrl?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Update project request
 */
export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}

/**
 * Project query parameters
 */
export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  projectType?: ProjectType | ProjectType[];
  status?: ProjectStatus | ProjectStatus[];
  locationId?: number | number[];
  isFeatured?: boolean;
  isPublished?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minCompletion?: number;
  maxCompletion?: number;
  hasCoordinates?: boolean;
  includeDeleted?: boolean;
  relations?: string[];
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Project response (public-facing)
 */
export interface ProjectResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  descriptionSecondary: string | null;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  location: {
    id: number;
    name: string;
    type: string;
  } | null;
  type: ProjectType;
  status: ProjectStatus;
  progress: {
    completionPercentage: number;
    estimatedCompletionDate: string | null;
    actualCompletionDate: string | null;
  };
  metrics: {
    totalBlocks: number | null;
    totalUnits: number | null;
  };
  pricing: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  media: {
    mainPhoto: string | null;
    gallery: any[];
  };
  publishing: {
    isFeatured: boolean;
    isPublished: boolean;
    publishedAt: string | null;
  };
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Project list response
 */
export interface ProjectListResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  type: ProjectType;
  status: ProjectStatus;
  completionPercentage: number;
  priceMin: number | null;
  priceMax: number | null;
  mainPhotoUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  location: {
    id: number;
    name: string;
  } | null;
  stats: {
    totalApartments: number;
    availableApartments: number;
    soldPercentage: number;
  };
}

/**
 * Project detail response with full data
 */
export interface ProjectDetailResponse extends ProjectResponse {
  apartments?: any[];
  features?: Array<{
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    category: string;
    value: string | null;
  }>;
  media?: Array<{
    id: number;
    type: string;
    url: string;
    thumbnailUrl: string | null;
    title: string | null;
    description: string | null;
    isFeatured: boolean;
  }>;
  team?: Array<{
    id: number;
    name: string;
    title: string | null;
    role: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    photoUrl: string | null;
    bio: string | null;
  }>;
  statistics: {
    totalApartments: number;
    availableApartments: number;
    reservedApartments: number;
    soldApartments: number;
    soldPercentage: number;
    uniqueVisitors: number;
    totalInteractions: number;
    inquiries: number;
  };
}

/**
 * Paginated projects response
 */
export interface PaginatedProjectsResponse {
  items: ProjectListResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ============================================================================
// FEATURE DTOs
// ============================================================================

/**
 * Add features request
 */
export interface AddProjectFeaturesRequest {
  featureIds: number[];
}

/**
 * Sync features request (replaces all)
 */
export interface SyncProjectFeaturesRequest {
  featureIds: number[];
}

// ============================================================================
// MEDIA DTOs
// ============================================================================

/**
 * Add media request
 */
export interface AddProjectMediaRequest {
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaType: "image" | "video" | "virtual_tour" | "floor_plan" | "brochure" | "document";
  title?: string;
  description?: string;
  altText?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isPublic?: boolean;
}

// ============================================================================
// TEAM DTOs
// ============================================================================

/**
 * Add team member request
 */
export interface AddProjectTeamRequest {
  name: string;
  title?: string;
  role: "architect" | "developer" | "contractor" | "designer" | "sales_manager" | "other";
  email?: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
  bio?: string;
  displayOrder?: number;
  isVisible?: boolean;
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Project statistics
 */
export interface ProjectStatistics {
  apartments: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    soldPercentage: number;
  };
  pricing: {
    min: number | null;
    max: number | null;
    average: number | null;
  };
  media: {
    total: number;
    images: number;
    videos: number;
    documents: number;
  };
  features: {
    total: number;
    byCategory: Record<string, number>;
  };
  team: {
    total: number;
    byRole: Record<string, number>;
  };
  engagement: {
    uniqueVisitors: number;
    totalViews: number;
    totalInteractions: number;
    inquiries: number;
    favoriteCount: number;
    shareCount: number;
  };
}

/**
 * Project performance metrics
 */
export interface ProjectPerformanceMetrics {
  projectId: number;
  projectName: string;
  status: ProjectStatus;
  conversions: {
    viewToInquiry: number;
    inquiryToSale: number;
    overallConversion: number;
  };
  timeline: {
    daysActive: number;
    daysUntilCompletion: number | null;
    salesVelocity: number; // Units sold per month
  };
  marketPosition: {
    pricePerSqm: number | null;
    competitorComparison: "above" | "at" | "below" | null;
  };
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Project validation errors
 */
export interface ProjectValidationErrors {
  name?: string;
  slug?: string;
  description?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  locationId?: string;
  projectType?: string;
  status?: string;
  completionPercentage?: string;
  totalBlocks?: string;
  totalUnits?: string;
  priceMin?: string;
  priceMax?: string;
  mainPhotoUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// ============================================================================
// FILTERS & SORTING
// ============================================================================

/**
 * Project filter options
 */
export interface ProjectFilters {
  types?: ProjectType[];
  statuses?: ProjectStatus[];
  locations?: number[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  completionRange?: {
    min?: number;
    max?: number;
  };
  isFeatured?: boolean;
  isPublished?: boolean;
  hasCoordinates?: boolean;
  hasAvailableUnits?: boolean;
}

/**
 * Project sort options
 */
export type ProjectSortField =
  | "name"
  | "created_at"
  | "updated_at"
  | "completion_percentage"
  | "price_min"
  | "price_max"
  | "total_units"
  | "status";

/**
 * Project sort configuration
 */
export interface ProjectSort {
  field: ProjectSortField;
  order: "asc" | "desc";
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Project export format
 */
export type ProjectExportFormat = "json" | "csv" | "excel" | "pdf";

/**
 * Project export options
 */
export interface ProjectExportOptions {
  format: ProjectExportFormat;
  fields?: string[];
  includeRelations?: boolean;
  filters?: ProjectFilters;
}