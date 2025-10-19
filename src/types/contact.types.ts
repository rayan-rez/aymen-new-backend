/**
 * Contact-related TypeScript interfaces
 * Defines all types for contact form functionality
 */

/**
 * Contact form status enumeration
 * Represents the lifecycle state of a contact form submission
 */
export enum ContactStatus {
  PENDING = "pending",
  CONTACTED = "contacted",
  RESOLVED = "resolved",
}

/**
 * Contact form entity
 * Represents a contact form submission from the database
 */
export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create contact DTO (Data Transfer Object)
 * Used for incoming requests
 */
export interface CreateContactDto {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/**
 * Update contact status DTO
 * Used when changing contact status
 */
export interface UpdateContactStatusDto {
  status: ContactStatus;
}

/**
 * Contact query parameters
 * Used for filtering/pagination
 */
export interface ContactQueryParams {
  status?: ContactStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
