// refactored leads
// incomplete
import type { Knex } from "knex";
import {
  addAuditFields,
  addEmailColumn,
  addStatusEnum,
  addUtmTracking,
  addReferrerTracking,
  addForeignKey,
  addCheckConstraint,
} from "../migration-helpers";

/**
 * REFACTORED: Unified Lead Management System
 *
 * MAJOR CHANGES:
 * 1. Created base `leads` table for all lead types
 * 2. Specific lead types (contact, inquiry, appointment) extend base
 * 3. Unified status workflow across all lead types
 * 4. Centralized marketing attribution
 *
 * BENEFITS:
 * - Single source of truth for all leads
 * - Easier reporting across lead types
 * - Consistent status tracking
 * - Reduced data duplication
 *
 * MIGRATION STRATEGY:
 * - Keep existing tables temporarily
 * - Create views for backwards compatibility
 * - Gradually migrate to new structure
 */
export async function up(knex: Knex): Promise<void> {
  // Base leads table - all leads start here
  await knex.schema.createTable("leads", (table) => {
    table.increments("id").primary();

    // Common contact info
    table.string("first_name", 100).nullable();
    table.string("last_name", 100).nullable();
    addEmailColumn(table, true);
    table.string("phone", 30).nullable().index();

    // Lead type and source
    table
      .enum("lead_type", [
        "contact_form",
        "project_inquiry",
        "appointment",
        "event_registration",
        "catalog_download",
        "land_submission",
        "job_application",
      ])
      .notNullable()
      .index();

    // Unified status (maps to specific statuses in sub-tables)
    addStatusEnum(
      table,
      [
        "new",
        "contacted",
        "qualified",
        "nurturing",
        "converted",
        "closed_won",
        "closed_lost",
        "spam",
      ],
      "new"
    );

    // Assignment
    table.string("assigned_to", 100).nullable().index();
    table.timestamp("assigned_at").nullable();

    // Lead scoring (0-100)
    table.integer("lead_score").unsigned().defaultTo(0).index();

    // Marketing attribution
    addUtmTracking(table);
    addReferrerTracking(table);

    // Quick reference to specific lead record
    table.string("source_table", 50).nullable(); // e.g., "contact_submissions"
    table.integer("source_id").unsigned().nullable();

    // Internal notes (consolidated)
    table.text("internal_notes").nullable();

    addAuditFields(table);

    // Composite indexes
    table.index(["lead_type", "status", "created_at"], "idx_type_status_date");
    table.index(["assigned_to", "status"], "idx_assigned_status");
    table.index(["email", "lead_type"], "idx_email_type");
    table.index(["lead_score", "status"], "idx_score_status");
    table.index(["source_table", "source_id"], "idx_source_ref");
  });

  // Contact Submissions (now extends leads)
  await knex.schema.createTable("contact_submissions", (table) => {
    table.increments("id").primary();

    // FK to base leads table
    addForeignKey(table, "lead_id", "leads", "id", "CASCADE");

    // Specific fields for contact forms
    table.string("subject", 255).nullable();
    table.text("message").notNullable();

    addAuditFields(table);

    table.index("lead_id");
  });

  // Project Inquiries (enhanced)
  await knex.schema.createTable("project_inquiries", (table) => {
    table.increments("id").primary();

    addForeignKey(table, "lead_id", "leads", "id", "CASCADE");
    addForeignKey(table, "project_id", "projects", "id", "SET NULL");

    // Geographic info
    table.string("country", 100).notNullable();
    table.string("state_province", 100).nullable();
    table.string("city", 100).nullable();

    // Buyer profile
    table.string("profession", 255).nullable();
    table.string("budget_range", 100).nullable();
    table
      .enum("financing_method", [
        "cash",
        "mortgage",
        "installment",
        "mixed",
        "other",
      ])
      .nullable();

    // Preferences (JSON for flexibility)
    table.json("interest_types").nullable();
    table.json("property_types").nullable();
    table.json("preferred_locations").nullable();

    // Contact preferences
    table.string("preferred_contact_day", 50).nullable();
    table.string("preferred_contact_time", 50).nullable();

    // Purchase timeline
    table
      .enum("purchase_timeline", [
        "immediate",
        "within_3_months",
        "within_6_months",
        "within_year",
        "exploring",
      ])
      .nullable()
      .index();

    // Consent
    table.boolean("accepted_terms").defaultTo(false);
    table.boolean("marketing_consent").defaultTo(false);

    addAuditFields(table);

    table.index("lead_id");
    table.index(["project_id", "created_at"], "idx_project_date");
  });

  // Appointment Requests (simplified)
  await knex.schema.createTable("appointment_requests", (table) => {
    table.increments("id").primary();

    addForeignKey(table, "lead_id", "leads", "id", "CASCADE");

    // Appointment details
    table.string("preferred_location", 255).nullable();
    table.string("budget_range", 50).nullable();
    table.date("preferred_date").nullable();
    table.string("preferred_time", 20).nullable();

    // Status specific to appointments
    table
      .enum("appointment_status", [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ])
      .defaultTo("pending")
      .index();

    table.text("notes").nullable();

    addAuditFields(table);

    table.index("lead_id");
    table.index(["preferred_date", "appointment_status"], "idx_date_status");
  });

  // Catalog Downloads
  await knex.schema.createTable("catalog_downloads", (table) => {
    table.increments("id").primary();

    addForeignKey(table, "lead_id", "leads", "id", "CASCADE");
    addForeignKey(table, "project_id", "projects", "id", "SET NULL");

    table.string("catalog_type", 100).nullable();
    table.boolean("marketing_consent").defaultTo(false);

    // Download tracking
    table.timestamp("downloaded_at").nullable();
    table.string("download_ip", 45).nullable();

    addAuditFields(table);

    table.index("lead_id");
    table.index(["project_id", "created_at"], "idx_project_date");
  });
  // 20251027133236_leads.ts (CONTINUED FROM LINE 145)

  // Land Submissions
  await knex.schema.createTable("land_submissions", (table) => {
    table.increments("id").primary();

    addForeignKey(table, "lead_id", "leads", "id", "CASCADE");

    // Property details
    table.string("address", 500).notNullable();
    table.string("city", 100).nullable();
    table.string("state_province", 100).nullable();
    table.decimal("area_sqm", 12, 2).nullable();
    table.integer("facade_count").unsigned().nullable();

    // Legal documentation status
    table.boolean("has_building_permit").defaultTo(false);
    table.boolean("has_land_title").defaultTo(false);
    table.boolean("has_property_deed").defaultTo(false);
    table.boolean("has_cadastral_plan").defaultTo(false);
    table.boolean("has_urban_planning_certificate").defaultTo(false);
    table.boolean("has_ferida_certificate").defaultTo(false);

    // Evaluation
    table
      .enum("submission_status", [
        "pending",
        "under_review",
        "site_visit_scheduled",
        "evaluation_complete",
        "interested",
        "offer_made",
        "acquired",
        "rejected",
      ])
      .defaultTo("pending")
      .index();

    table.text("internal_notes").nullable();
    table.string("assigned_evaluator", 100).nullable().index();
    table.decimal("estimated_value", 15, 2).nullable();
    table.date("evaluation_date").nullable();

    addAuditFields(table);

    table.index("lead_id");
    table.index(
      ["submission_status", "evaluation_date"],
      "idx_status_eval_date"
    );
  });

  // Job Applications
  await knex.schema.createTable("job_applications", (table) => {
    table.increments("id").primary();

    addForeignKey(table, "lead_id", "leads", "id", "CASCADE");

    // Application details
    table.string("applied_position", 100).notNullable().index();
    table.string("portfolio_url", 500).nullable();
    table.string("linkedin_url", 500).nullable();
    table.text("cover_letter").nullable();

    // Resume storage (store path/URL, not binary)
    table.string("resume_url", 500).nullable();
    table.string("resume_filename", 255).nullable();

    // Application status
    table
      .enum("application_status", [
        "received",
        "screening",
        "interview_scheduled",
        "interviewed",
        "offer_extended",
        "hired",
        "rejected",
        "withdrawn",
      ])
      .defaultTo("received")
      .index();

    // Internal tracking
    table.text("hr_notes").nullable();
    table.string("interviewed_by", 255).nullable();
    table.date("interview_date").nullable();

    addAuditFields(table);

    table.index("lead_id");
    table.index(["application_status", "created_at"], "idx_status_date");
    table.index("applied_position");
  });

  // Add CHECK constraints
  await addCheckConstraint(
    knex,
    "catalog_downloads",
    "catalog_downloads_lead_id_check",
    "lead_id IS NOT NULL"
  );

  await addCheckConstraint(
    knex,
    "land_submissions",
    "land_submissions_area_check",
    "area_sqm IS NULL OR area_sqm > 0"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("job_applications");
  await knex.schema.dropTableIfExists("land_submissions");
  await knex.schema.dropTableIfExists("catalog_downloads");
  await knex.schema.dropTableIfExists("appointment_requests");
  await knex.schema.dropTableIfExists("project_inquiries");
  await knex.schema.dropTableIfExists("contact_submissions");
  await knex.schema.dropTableIfExists("leads");
}
