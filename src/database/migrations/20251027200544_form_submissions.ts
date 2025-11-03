import type { Knex } from "knex";
import { addCheckConstraint, configureTableEngine } from "../knex-extensions";

/**
 * Migration: Form Submissions (Refactored)
 * 
 * Central table for ALL form submissions on the website.
 * This is the primary source of truth for user-submitted data.
 * 
 * CHANGES FROM ORIGINAL:
 * - No direct lead_id reference (replaced by lead_mirrors)
 * - Enhanced tracking metadata
 * - Added Odoo sync queue fields
 * - Optimized for event-driven architecture
 * 
 * WORKFLOW:
 * 1. User submits form → Record created here
 * 2. Event published to Kafka/Queue → "form.submitted"
 * 3. Worker picks up event → Calls Odoo API
 * 4. Odoo creates lead → Returns lead_id
 * 5. Worker creates lead_mirrors record with odoo_lead_id
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("form_submissions", (table) => {
    // =================================================================
    // PRIMARY KEY
    // =================================================================
    table.increments("id").primary();

    // =================================================================
    // SESSION & TRACKING CONTEXT
    // =================================================================
    // Visitor/Session references (for analytics correlation)
    table.string("visitor_id", 36).nullable().index();
    table.string("session_id", 36).nullable().index();

    // =================================================================
    // FORM IDENTIFICATION
    // =================================================================
    table.string("form_type", 100).notNullable().index();
    // Values: contact_form, project_inquiry, appointment_request,
    //         catalog_download, land_submission, job_application, 
    //         event_registration

    table.string("form_id", 100).nullable(); // HTML form ID

    // =================================================================
    // PROJECT CONTEXT (IF APPLICABLE)
    // =================================================================
    table.withForeignKey("project_id", "projects", "id", "SET NULL");

    // =================================================================
    // EXTRACTED KEY FIELDS (FOR QUICK ACCESS)
    // =================================================================
    // Denormalized from form_data for indexing and queries
    table.string("email", 255).nullable();
    table.string("phone", 30).nullable();
    table.string("first_name", 100).nullable();
    table.string("last_name", 100).nullable();
    
    table.index("email", "idx_email");
    table.index("phone", "idx_phone");

    // =================================================================
    // SUBMISSION METADATA
    // =================================================================
    table.timestamp("submitted_at").notNullable().defaultTo(knex.fn.now());
    table.string("page_url", 500).nullable();
    table.string("referrer_url", 500).nullable();
    table.string("ip_address", 45).nullable();
    table.string("user_agent", 500).nullable();

    // =================================================================
    // MARKETING ATTRIBUTION
    // =================================================================
    table.withUtmTracking();
    table.withReferrerTracking();

    // =================================================================
    // PROCESSING STATUS
    // =================================================================
    table.withStatusEnum(
      ["pending", "processing", "completed", "failed", "spam"],
      { defaultStatus: "pending" }
    );

    // Time to complete form (in seconds)
    table.integer("completion_time_seconds").unsigned().nullable();

    // =================================================================
    // ODOO SYNC QUEUE
    // =================================================================
    // Whether this submission should be synced to Odoo
    table.boolean("requires_odoo_sync").defaultTo(true);
    
    // Timestamp when sync was attempted
    table.timestamp("odoo_sync_attempted_at").nullable();
    
    // Number of sync retry attempts
    table.integer("odoo_sync_retries").unsigned().defaultTo(0);
    
    // Last sync error message
    table.text("odoo_sync_error").nullable();

    // =================================================================
    // VALIDATION & QUALITY
    // =================================================================
    table.integer("validation_errors").unsigned().defaultTo(0);
    table.boolean("is_spam").defaultTo(false).index();
    table.decimal("spam_score", 3, 2).nullable(); // 0.00 to 1.00

    // =================================================================
    // FORM DATA
    // =================================================================
    table.withJsonMetadata("form_data")

    // =================================================================
    // AUDIT TRAIL
    // =================================================================
    table.withTimestamps();

    // =================================================================
    // COMPOSITE INDEXES
    // =================================================================
    table.index(["form_type", "submitted_at"], "idx_type_time");
    table.index(["form_type", "status"], "idx_type_status");
    table.index(
      ["project_id", "form_type", "submitted_at"],
      "idx_project_form_time"
    );
    table.index(
      ["requires_odoo_sync", "status"],
      "idx_sync_status"
    );
    table.index(
      ["is_spam", "submitted_at"],
      "idx_spam_time"
    );
    table.index(["visitor_id", "submitted_at"], "idx_visitor_submissions");

    configureTableEngine(table);
  });

  // =================================================================
  // CHECK CONSTRAINTS
  // =================================================================
  await addCheckConstraint(
    knex,
    "form_submissions",
    "chk_completion_time",
    "completion_time_seconds IS NULL OR completion_time_seconds >= 0"
  );

  await addCheckConstraint(
    knex,
    "form_submissions",
    "chk_spam_score",
    "spam_score IS NULL OR (spam_score >= 0.00 AND spam_score <= 1.00)"
  );

  await addCheckConstraint(
    knex,
    "form_submissions",
    "chk_validation_errors",
    "validation_errors >= 0"
  );

  await addCheckConstraint(
    knex,
    "form_submissions",
    "chk_sync_retries",
    "odoo_sync_retries >= 0 AND odoo_sync_retries <= 10"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("form_submissions");
}