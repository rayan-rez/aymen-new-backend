/**
 * Application Constants
 * Centralized configuration and constant values
 *
 * @module constants/app.constants
 */

// ============================================
// EVENT CONFIGURATION
// ============================================

export const EVENT_CONFIG = {
  MIN_SCAN_INTERVAL_SECONDS: parseInt(
    process.env.MIN_SCAN_INTERVAL_SECONDS || "5",
    10
  ),
  SLOT_LIMITS: {
    DEFAULT: parseInt(process.env.SLOT_LIMIT_DEFAULT || "50", 10),
    VIP: parseInt(process.env.SLOT_LIMIT_VIP || "30", 10),
    WORKSHOP: parseInt(process.env.SLOT_LIMIT_WORKSHOP || "25", 10),
  },
  DEFAULT_TIME_SLOTS: process.env.EVENT_TIME_SLOTS?.split(",") || [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ],
};

// ============================================
// API RATE LIMITING
// ============================================

export const RATE_LIMITS = {
  APPOINTMENT_COOLDOWN_HOURS: parseInt(
    process.env.APPOINTMENT_COOLDOWN_HOURS || "72",
    10
  ),
  CATALOG_DUPLICATE_CHECK_HOURS: parseInt(
    process.env.CATALOG_DUPLICATE_CHECK_HOURS || "24",
    10
  ),
};

// ============================================
// YOUTUBE API
// ============================================

export const YOUTUBE_CONFIG = {
  API_KEY: process.env.YOUTUBE_API_KEY || "",
  CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID || "",
  CACHE_DURATION_MS: parseInt(
    process.env.YOUTUBE_CACHE_DURATION || "600000",
    10
  ), // 10 minutes
  MAX_SHORTS_DURATION_SECONDS: parseInt(
    process.env.YOUTUBE_MAX_SHORTS_DURATION || "60",
    10
  ),
};

// ============================================
// FILE UPLOAD
// ============================================

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10), // 5MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf", "application/msword"],
};

// ============================================
// PAGINATION
// ============================================

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 100,
};

// ============================================
// VALIDATION
// ============================================

export const VALIDATION_LIMITS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  MESSAGE_MIN_LENGTH: 10,
  MESSAGE_MAX_LENGTH: 5000,
  PHONE_MIN_DIGITS: 8,
};

// ============================================
// INFLUENCER CAMPAIGNS
// ============================================

export const CAMPAIGN_TABLES: Record<string, string> = {
  aminawissem: "aminawissem_user",
  attitude: "attitude_user",
  chaibi: "chaibi_user",
  fahd: "fahd_user",
  fake: "fake_user",
  hanaghezzar: "hanaghezzar_user",
  influenceur: "influenceur_user",
  lyeskohlanta: "lyeskohlanta_user",
  mohinoo: "mohinoo_user",
  myriamk: "myriamk_user",
  nourhene: "nourhene_user",
  romi: "romi_user",
  salaheddine: "salaheddine_user",
  salimsouakri: "salimsouakri_user",
  vipplatinium: "vipplatinium_user",
  yasminejoevent: "yasminejoevent_user",
  lilaborsali: "lilaborsali",
};

// ============================================
// BLOCKED EMAIL DOMAINS
// ============================================

export const BLOCKED_EMAIL_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "dispostable.com",
  "maildrop.cc",
  "fakeinbox.com",
  "throwaway.email",
  "temp-mail.org",
];

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
  // General
  INTERNAL_SERVER_ERROR: "Internal server error",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",

  // Validation
  INVALID_EMAIL: "Invalid email format",
  INVALID_PHONE: "Invalid phone number format",
  REQUIRED_FIELDS_MISSING: "Required fields are missing",
  INVALID_DATE: "Invalid date format",

  // Duplicates
  DUPLICATE_REGISTRATION: "You have already registered",
  DUPLICATE_SUBMISSION: "You have already submitted this form",

  // Events
  EVENT_NOT_FOUND: "Event not found",
  ALREADY_CHECKED_IN: "Already checked in",
  SLOT_FULLY_BOOKED: "This time slot is fully booked",
  MUST_REGISTER_FIRST: "You must register for the event first",

  // Database
  DB_CONNECTION_FAILED: "Database connection failed",
  QUERY_FAILED: "Database query failed",
};

// ============================================
// SUCCESS MESSAGES
// ============================================

export const SUCCESS_MESSAGES = {
  // General
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",

  // Registrations
  REGISTRATION_SUCCESS: "Registration successful",
  CHECKIN_SUCCESS: "Check-in successful",
  CHECKOUT_SUCCESS: "Check-out successful",

  // Submissions
  FORM_SUBMITTED: "Form submitted successfully",
  FEEDBACK_SUBMITTED: "Thank you for your feedback",
};

// ============================================
// HTTP STATUS CODES
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
