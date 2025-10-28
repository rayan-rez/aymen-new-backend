import type { Knex } from "knex";
import { addCheckConstraint, configureTableDefaults } from "../knex-extensions";

/**
 * Migration: Unified Lead Management System
 * 
 * IMPORTANT: email is NOT unique - allows duplicate submissions
 * 
 * Architecture:
 * - Base `leads` table: All leads start here (single source of truth)
 * - Sub-tables: Type-specific data (contact_submissions, project_inquiries, etc.)
 * - Links to analytics: lead_id in sessions/events for attribution
 * 
 * Benefits:
 * - Single lead scoring/status across all types
 * - Unified reporting and analytics
 * - Consistent marketing attribution
 */
export async function up(knex: Knex): Promise<void> {
  // ====================================================================
  // BASE LEADS TABLE
  // ====================================================================
  await knex.schema.createTable("leads", (table) => {
    table.increments("id").primary();

    // =================================================================
    // CONTACT INFORMATION
    // =================================================================
    table.string("first_name", 100).nullable();
    table.string("last_name", 100).nullable();
    
    // IMPORTANT: Email is NOT unique (allows duplicates)
    table.withEmailColumn({ required: false, unique: false });
    table.string("phone", 30).nullable().index();

    // =================================================================
    // LEAD CLASSIFICATION
    // =================================================================
    table.withStatusEnum(
      [
        "contact_form",
        "project_inquiry",
        "appointment",
        "event_registration",
        "catalog_download",
        "land_submission",
        "job_application",
      ],
      { columnName: "lead_type" }
    );

    // =================================================================
    // UNIFIED STATUS WORKFLOW
    // =================================================================
    table.withStatusEnum(
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
      { columnName: "status", defaultStatus: "new" }
    );

    // =================================================================
    // ASSIGNMENT
    // =================================================================
    table.string("assigned_to", 100).nullable().index();
    table.timestamp("assigned_at").nullable();

    // =================================================================
    // LEAD SCORING
    // =================================================================
    table.integer("lead_score").unsigned().defaultTo(0).index();

    // =================================================================
    // MARKETING ATTRIBUTION
    // =================================================================
    table.withUtmTracking();
    table.withReferrerTracking();

    // =================================================================
    // SOURCE REFERENCE
    // =================================================================
    table.string("source_table", 50).nullable();
    table.integer("source_id").unsigned().nullable();

    // =================================================================
    // INTERNAL NOTES
    // =================================================================
    table.text("internal_notes").nullable();

    table.withAuditTrail();

    // =================================================================
    // COMPOSITE INDEXES
    // =================================================================
    table.index(["lead_type", "status", "created_at"], "idx_type_status_date");
    table.index(["assigned_to", "status"], "idx_assigned_status");
    table.index(["email", "lead_type"], "idx_email_type");
    table.index(["lead_score", "status"], "idx_score_status");
    table.index(["source_table", "source_id"], "idx_source_ref");

    configureTableDefaults(table);
  });

  await addCheckConstraint(
    knex,
    "leads",
    "chk_leads_lead_score",
    "lead_score >= 0 AND lead_score <= 100"
  );

  // ====================================================================
  // CONTACT SUBMISSIONS
  // ====================================================================
  await knex.schema.createTable("contact_submissions", (table) => {
    table.increments("id").primary();

    table.withForeignKey("lead_id", "leads", "id", "CASCADE");

    table.string("subject", 255).nullable();
    table.text("message").notNullable();

    table.withAuditTrail();

    table.index("lead_id");

    configureTableDefaults(table);
  });

  // ====================================================================
  // PROJECT INQUIRIES
  // ====================================================================
  await knex.schema.createTable("project_inquiries", (table) => {
    table.increments("id").primary();

    table.withForeignKey("lead_id", "leads", "id", "CASCADE");
    table.withForeignKey("project_id", "projects", "id", "SET NULL");

    // =================================================================
    // GEOGRAPHIC INFORMATION
    // =================================================================
    table.string("country", 100).notNullable();
    table.string("state_province", 100).nullable();
    table.string("city", 100).nullable();

    // =================================================================
    // BUYER PROFILE
    // =================================================================
    table.string("profession", 255).nullable();
    table.string("budget_range", 100).nullable();
    table.withStatusEnum(
      ["cash", "mortgage", "installment", "mixed", "other"],
      { columnName: "financing_method" }
    );

    // =================================================================
    // PREFERENCES (JSON FOR FLEXIBILITY)
    // =================================================================
    table.withJsonMetadata("interest_types");
    table.withJsonMetadata("property_types");
    table.withJsonMetadata("preferred_locations");

    // =================================================================
    // CONTACT PREFERENCES
    // =================================================================
    table.string("preferred_contact_day", 50).nullable();
    table.string("preferred_contact_time", 50).nullable();

    // =================================================================
    // PURCHASE TIMELINE
    // =================================================================
    table.withStatusEnum(
      ["immediate", "within_3_months", "within_6_months", "within_year", "exploring"],
      { columnName: "purchase_timeline" }
    );

    // =================================================================
    // CONSENT
    // =================================================================
    table.boolean("accepted_terms").defaultTo(false);
    table.boolean("marketing_consent").defaultTo(false);

    table.withAuditTrail();

    table.index("lead_id");
    table.index(["project_id", "created_at"], "idx_project_date");

    configureTableDefaults(table);
  });

  // ====================================================================
  // APPOINTMENT REQUESTS
  // ====================================================================
  await knex.schema.createTable("appointment_requests", (table) => {
    table.increments("id").primary();

    table.withForeignKey("lead_id", "leads", "id", "CASCADE");

    table.string("preferred_location", 255).nullable();
    table.string("budget_range", 50).nullable();
    table.date("preferred_date").nullable();
    table.string("preferred_time", 20).nullable();

    table.withStatusEnum(
      ["pending", "confirmed", "completed", "cancelled", "no_show"],
      { columnName: "appointment_status", defaultStatus: "pending" }
    );

    table.text("notes").nullable();

    table.withAuditTrail();

    table.index("lead_id");
    table.index(["preferred_date", "appointment_status"], "idx_date_status");

    configureTableDefaults(table);
  });

  // ====================================================================
  // CATALOG DOWNLOADS
  // ====================================================================
  await knex.schema.createTable("catalog_downloads", (table) => {
    table.increments("id").primary();

    table.withForeignKey("lead_id", "leads", "id", "CASCADE");
    table.withForeignKey("project_id", "projects", "id", "SET NULL");

    table.string("catalog_type", 100).nullable();
    table.boolean("marketing_consent").defaultTo(false);

    table.timestamp("downloaded_at").nullable();
    table.string("download_ip", 45).nullable();

    table.withAuditTrail();

    table.index("lead_id");
    table.index(["project_id", "created_at"], "idx_project_date");

    configureTableDefaults(table);
  });

  // ====================================================================
  // LAND SUBMISSIONS
  // ====================================================================
  await knex.schema.createTable("land_submissions", (table) => {
    table.increments("id").primary();

    table.withForeignKey("lead_id", "leads", "id", "CASCADE");

    // =================================================================
    // PROPERTY DETAILS
    // =================================================================
    table.string("address", 500).notNullable();
    table.string("city", 100).nullable();
    table.string("state_province", 100).nullable();
    table.decimal("area_sqm", 12, 2).nullable();
    table.integer("facade_count").unsigned().nullable();

    // =================================================================
    // LEGAL DOCUMENTATION
    // =================================================================
    table.boolean("has_building_permit").defaultTo(false);
    table.boolean("has_land_title").defaultTo(false);
    table.boolean("has_property_deed").defaultTo(false);
    table.boolean("has_cadastral_plan").defaultTo(false);
    table.boolean("has_urban_planning_certificate").defaultTo(false);
    table.boolean("has_ferida_certificate").defaultTo(false);

    // =================================================================
    // EVALUATION
    // =================================================================
    table.withStatusEnum(
      [
        "pending",
        "under_review",
        "site_visit_scheduled",
        "evaluation_complete",
        "interested",
        "offer_made",
        "acquired",
        "rejected",
      ],
      { columnName: "submission_status", defaultStatus: "pending" }
    );

    table.text("internal_notes").nullable();
    table.string("assigned_evaluator", 100).nullable().index();
    table.decimal("estimated_value", 15, 2).nullable();
    table.date("evaluation_date").nullable();

    table.withAuditTrail();

    table.index("lead_id");
    table.index(["submission_status", "evaluation_date"], "idx_status_eval_date");

    configureTableDefaults(table);
  });

  await addCheckConstraint(
    knex,
    "land_submissions",
    "chk_land_area_positive",
    "area_sqm IS NULL OR area_sqm > 0"
  );

  // ====================================================================
  // JOB APPLICATIONS
  // ====================================================================
  await knex.schema.createTable("job_applications", (table) => {
    table.increments("id").primary();

    table.withForeignKey("lead_id", "leads", "id", "CASCADE");

    table.string("applied_position", 100).notNullable().index();
    table.string("portfolio_url", 500).nullable();
    table.string("linkedin_url", 500).nullable();
    table.text("cover_letter").nullable();

    table.string("resume_url", 500).nullable();
    table.string("resume_filename", 255).nullable();

    table.withStatusEnum(
      [
        "received",
        "screening",
        "interview_scheduled",
        "interviewed",
        "offer_extended",
        "hired",
        "rejected",
        "withdrawn",
      ],
      { columnName: "application_status", defaultStatus: "received" }
    );

    table.text("hr_notes").nullable();
    table.string("interviewed_by", 255).nullable();
    table.date("interview_date").nullable();

    table.withAuditTrail();

    table.index("lead_id");
    table.index(["application_status", "created_at"], "idx_status_date");

    configureTableDefaults(table);
  });
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