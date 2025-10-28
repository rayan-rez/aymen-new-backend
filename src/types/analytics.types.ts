// TypeScript interfaces for analytics tables

// ============================================================================
// BASE TYPES
// ============================================================================

export interface Timestamps {
  created_at: Date;
  updated_at: Date;
}

export interface SoftDelete {
  deleted_at: Date | null;
}

// ============================================================================
// USER SESSIONS
// ============================================================================

export enum DeviceType {
  DESKTOP = "desktop",
  MOBILE = "mobile",
  TABLET = "tablet",
  UNKNOWN = "unknown"
}

export interface UserSession extends Timestamps {
  id: number;
  user_id: number | null;
  session_id: string; // UUID
  
  // Attribution
  source: string | null;
  campaign: string | null;
  medium: string | null;
  
  // Device info
  device: DeviceType | null;
  browser: string | null;
  os: string | null;
  
  // Location
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  language: string | null;
  
  // Metrics
  start_time: Date;
  end_time: Date | null;
  pages_viewed: number;
  duration_seconds: number;
  
  // Metadata
  meta: Record<string, any> | null;
}

export interface CreateUserSessionDTO {
  user_id?: number;
  session_id: string;
  source?: string;
  campaign?: string;
  medium?: string;
  device?: DeviceType;
  browser?: string;
  os?: string;
  location_city?: string;
  location_region?: string;
  location_country?: string;
  language?: string;
  start_time: Date;
  meta?: Record<string, any>;
}

// ============================================================================
// USER EVENTS
// ============================================================================

export enum EventType {
  PAGE_VIEW = "page_view",
  CLICK = "click",
  SCROLL = "scroll",
  FORM_SUBMIT = "form_submit",
  VIDEO_PLAY = "video_play",
  VIDEO_PAUSE = "video_pause",
  VIDEO_COMPLETE = "video_complete",
  DOWNLOAD = "download",
  SEARCH = "search",
  FILTER_APPLY = "filter_apply",
  SHARE = "share",
  ERROR = "error"
}

export interface UserEvent extends Timestamps {
  id: number;
  session_id: number | null;
  user_id: number | null;
  
  // Event classification
  event_type: EventType | string;
  
  // Page context
  page_url: string;
  page_path: string | null;
  page_title: string | null;
  
  // Element interaction
  element: string | null;
  
  // Event payload
  value: Record<string, any> | null;
  
  // Timing
  event_ts: Date;
  
  // Technical
  user_agent: string | null;
  ip: string | null;
}

export interface CreateUserEventDTO {
  session_id?: number;
  user_id?: number;
  event_type: EventType | string;
  page_url: string;
  page_path?: string;
  page_title?: string;
  element?: string;
  value?: Record<string, any>;
  event_ts: Date;
  user_agent?: string;
  ip?: string;
}

// Event value schemas (type-safe payloads)
export interface ScrollEventValue {
  scroll_depth_percent: number;
  max_scroll_depth_percent: number;
  scroll_duration_ms: number;
}

export interface VideoEventValue {
  video_id: string;
  video_title?: string;
  duration_seconds: number;
  watch_duration_seconds: number;
  completion_percent: number;
  playback_rate: number;
}

export interface DownloadEventValue {
  file_name: string;
  file_type: string;
  file_size_bytes?: number;
}

export interface ClickEventValue {
  element_text?: string;
  element_id?: string;
  element_class?: string;
  x_position?: number;
  y_position?: number;
}

// ============================================================================
// FORM SUBMISSIONS
// ============================================================================

export enum FormType {
  CONTACT = "contact",
  BOOK_VISIT = "book_visit",
  REQUEST_INFO = "request_info",
  NEWSLETTER = "newsletter",
  EVENT_REGISTRATION = "event_registration",
  CATALOG_DOWNLOAD = "catalog_download",
  CALLBACK_REQUEST = "callback_request"
}

export enum FormSubmissionStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  DISQUALIFIED = "disqualified",
  CONVERTED = "converted",
  SPAM = "spam"
}

export interface FormSubmission extends Timestamps {
  id: number;
  user_id: number | null;
  session_id: number | null;
  project_id: number | null;
  
  form_type: FormType | string;
  form_data: Record<string, any>;
  
  submitted_at: Date;
  ip: string | null;
  
  status: FormSubmissionStatus | null;
  internal_notes: string | null;
  assigned_to: string | null;
}

export interface CreateFormSubmissionDTO {
  user_id?: number;
  session_id?: number;
  project_id?: number;
  form_type: FormType | string;
  form_data: Record<string, any>;
  submitted_at: Date;
  ip?: string;
  status?: FormSubmissionStatus;
}

// Form data schemas (type-safe payloads)
export interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  consent_marketing?: boolean;
}

export interface BookVisitFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  project_id?: number;
  preferred_date?: string;
  preferred_time?: string;
  visitor_count?: number;
  message?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface NewsletterFormData {
  email: string;
  first_name?: string;
  last_name?: string;
  interests?: string[];
  language?: string;
  consent_marketing: boolean;
}

// ============================================================================
// PROPERTY INTERACTIONS
// ============================================================================

export enum InteractionAction {
  VIEW = "view",
  DOWNLOAD_BROCHURE = "download_brochure",
  DOWNLOAD_FLOOR_PLAN = "download_floor_plan",
  BOOK_VISIT_CLICK = "book_visit_click",
  ADD_TO_FAVORITES = "add_to_favorites",
  REMOVE_FROM_FAVORITES = "remove_from_favorites",
  COMPARE = "compare",
  SHARE = "share",
  VIRTUAL_TOUR_START = "virtual_tour_start",
  VIRTUAL_TOUR_END = "virtual_tour_end",
  VIDEO_PLAY = "video_play",
  GALLERY_VIEW = "gallery_view",
  CALL_CLICK = "call_click",
  WHATSAPP_CLICK = "whatsapp_click",
  EMAIL_CLICK = "email_click",
  MAP_VIEW = "map_view",
  THREE_D_VIEW = "three_d_view"
}

export interface PropertyInteraction extends Timestamps {
  id: number;
  user_id: number | null;
  session_id: number | null;
  property_id: number | null;
  
  action: InteractionAction | string;
  value: Record<string, any> | null;
  
  interaction_ts: Date;
  page_url: string | null;
  referrer_url: string | null;
}

export interface CreatePropertyInteractionDTO {
  user_id?: number;
  session_id?: number;
  property_id: number;
  action: InteractionAction | string;
  value?: Record<string, any>;
  interaction_ts: Date;
  page_url?: string;
  referrer_url?: string;
}

// Interaction value schemas
export interface ViewInteractionValue {
  duration_seconds: number;
  scroll_depth_percent: number;
  sections_viewed: string[];
}

export interface DownloadInteractionValue {
  file_name: string;
  file_type: string;
  file_size_bytes?: number;
}

export interface GalleryInteractionValue {
  image_count: number;
  images_viewed: number[];
  view_duration_seconds: number;
}

export interface VideoInteractionValue {
  video_id: string;
  watch_duration_seconds: number;
  completion_percent: number;
}

export interface VirtualTourInteractionValue {
  duration_seconds: number;
  rooms_visited: string[];
  interaction_count: number;
}

export interface CompareInteractionValue {
  compared_with_property_ids: number[];
}

export interface ShareInteractionValue {
  platform: string; // facebook, twitter, whatsapp, email, link
  success: boolean;
}

// ============================================================================
// ENHANCED USER TYPE (with analytics fields)
// ============================================================================

export enum UserRole {
  VISITOR = "visitor",
  BUYER = "buyer",
  INVESTOR = "investor",
  AGENT = "agent",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
  SALES_MANAGER = "sales_manager",
  SALES_AGENT = "sales_agent",
  MARKETING = "marketing",
  CONTENT_MANAGER = "content_manager",
  VIEWER = "viewer"
}

export interface User extends Timestamps, SoftDelete {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole | null;
  role_meta: Record<string, any> | null; // Extended role data
  meta: Record<string, any> | null; // Profile metadata
  
  // From existing users table (if present)
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  last_login_at?: Date;
}

// ============================================================================
// ENHANCED PROJECT TYPE (with analytics fields)
// ============================================================================

export interface Project extends Timestamps, SoftDelete {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  description_secondary: string | null;
  address: string;
  
  // Location
  latitude: number | null;
  longitude: number | null;
  location_id: number | null;
  
  // Project details
  project_type?: string;
  status: string;
  completion_percentage: number;
  estimated_completion_date?: Date;
  actual_completion_date?: Date;
  total_blocks: number | null;
  total_units?: number;
  
  // Pricing
  price_min?: number;
  price_max?: number;
  
  // Media
  main_photo_url: string | null;
  
  // Marketing
  is_featured: boolean;
  is_published?: boolean;
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  
  // ANALYTICS FIELDS (new)
  view_count: number;
  brochure_download_count: number;
  inquiry_count: number;
  favorite_count: number;
  engagement_score: number;
  last_interaction_at: Date | null;
}

// ============================================================================
// ANALYTICS VIEWS (Read-only types)
// ============================================================================

export interface PropertySummaryAnalytics {
  property_id: number;
  property_name: string;
  status: string;
  location_id: number | null;
  unique_visitors: number;
  total_views: number;
  brochure_downloads: number;
  booking_clicks: number;
  favorites: number;
  engaged_users: number;
  avg_view_duration_seconds: number | null;
  last_interaction_at: Date | null;
  first_interaction_at: Date | null;
}

export interface ConversionFunnelAnalytics {
  property_id: number;
  step_1_view: number;
  step_2_engage: number;
  step_3_intent: number;
  step_4_convert: number;
  
  // Calculated metrics
  engagement_rate?: number; // step_2 / step_1
  intent_rate?: number; // step_3 / step_2
  conversion_rate?: number; // step_4 / step_1
}

export interface UserEngagementAnalytics {
  user_id: number;
  email: string | null;
  role: string | null;
  total_sessions: number;
  total_pages_viewed: number;
  total_duration_seconds: number;
  total_events: number;
  properties_viewed: number;
  properties_downloaded: number;
  forms_submitted: number;
  last_session_at: Date | null;
  engagement_score: number;
}

// ============================================================================
// QUERY FILTERS (for repository layer)
// ============================================================================

export interface SessionFilters {
  user_id?: number;
  source?: string;
  device?: DeviceType;
  location_region?: string;
  date_from?: Date;
  date_to?: Date;
  min_duration?: number;
  min_pages_viewed?: number;
}

export interface EventFilters {
  session_id?: number;
  user_id?: number;
  event_type?: EventType | string;
  page_path?: string;
  element?: string;
  date_from?: Date;
  date_to?: Date;
}

export interface InteractionFilters {
  user_id?: number;
  session_id?: number;
  property_id?: number;
  action?: InteractionAction | string;
  date_from?: Date;
  date_to?: Date;
}

export interface FormSubmissionFilters {
  form_type?: FormType | string;
  project_id?: number;
  status?: FormSubmissionStatus;
  assigned_to?: string;
  date_from?: Date;
  date_to?: Date;
}

// ============================================================================
// AGGREGATION RESULTS (for BI queries)
// ============================================================================

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  sessions: number;
  unique_users: number;
  page_views: number;
  events: number;
  form_submissions: number;
  avg_session_duration: number;
  bounce_rate: number;
}

export interface PropertyPerformance {
  property_id: number;
  property_name: string;
  views: number;
  unique_visitors: number;
  downloads: number;
  inquiries: number;
  conversion_rate: number;
  engagement_score: number;
  rank: number;
}

export interface TrafficSource {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  users: number;
  conversions: number;
  conversion_rate: number;
  avg_session_duration: number;
}

export interface GeographicDistribution {
  location_region: string;
  location_city: string;
  sessions: number;
  users: number;
  avg_engagement_score: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type QueryResult<T> = {
  data: T[];
  total: number;
  page: number;
  page_size: number;
};

export type TimeRange = {
  start: Date;
  end: Date;
};