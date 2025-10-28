// src/database/migrations/20251027134430_form_submissions.ts
import type { Knex } from "knex";
import { addCheckConstraint } from "../knex-extensions";

/**
 * FORM SUBMISSIONS - Unified form tracking
 *
 * Captures all form submissions across the website in a single table.
 * Links to specific form tables (contact_submissions, project_inquiries, etc.)
 * Enables cross-form analytics and funnel analysis.
 *
 * This complements specific form tables by providing:
 * - Unified analytics across all forms
 * - Session and event tracking context
 * - Form abandonment tracking (partial submissions)
 * - A/B testing support
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("form_submissions", (table) => {
    table.increments("id").primary();

    // Lead relationship
    table
      .integer("lead_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("leads")
      .onDelete("SET NULL");
    table.index("lead_id");

    // Session context
    table
      .integer("session_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("user_sessions")
      .onDelete("SET NULL");
    table.index("session_id");

    // Form identification
    table.string("form_type", 100).notNullable().index();
    // Values: contact_form, project_inquiry, appointment_request,
    //         catalog_download, land_submission, job_application, newsletter

    table.string("form_id", 100).nullable(); // HTML form ID for A/B testing
    table.string("form_variant", 50).nullable(); // A/B test variant

    // Project context (if applicable)
    table
      .integer("project_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("projects")
      .onDelete("SET NULL");
    table.index("project_id");

    // Form data as JSON (sanitized copy of submitted data)
    // Example: {"name":"Ahmed Benali","email":"ahmed@example.com","phone":"+213555123456","message":"Interested in Villa Azure","budget_range":"20M-30M"}
    table.json("form_data").nullable();

    // Submission metadata
    table.timestamp("submitted_at").notNullable().index();
    table.string("page_url", 500).nullable();
    table.string("referrer_url", 500).nullable();

    // Processing status
    table.withStatusEnum(
      ["pending", "processing", "completed", "failed", "spam"],
      {
        defaultStatus: "pending"
      }
    );

    // Time to complete form (in seconds)
    table.integer("completion_time_seconds").unsigned().nullable();

    // Reference to specific form table record
    table.string("source_table", 100).nullable();
    table.integer("source_id").unsigned().nullable();
    table.index(["source_table", "source_id"], "idx_source_ref");

    // Validation and quality metrics
    table.integer("validation_errors").unsigned().defaultTo(0);
    table.boolean("is_spam").defaultTo(false).index();
    table.decimal("spam_score", 3, 2).nullable(); // 0.00 to 1.00

    table.withTimestamps();

    // Composite indexes
    table.index(["form_type", "submitted_at"], "idx_type_time");
    table.index(["form_type", "status"], "idx_type_status");
    table.index(
      ["project_id", "form_type", "submitted_at"],
      "idx_project_form_time"
    );
  });

  // CHECK constraints
  await addCheckConstraint(
    knex,
    "form_submissions",
    "form_submissions_completion_time_check",
    "completion_time_seconds IS NULL OR completion_time_seconds >= 0"
  );

  await addCheckConstraint(
    knex,
    "form_submissions",
    "form_submissions_spam_score_check",
    "spam_score IS NULL OR (spam_score >= 0.00 AND spam_score <= 1.00)"
  );

  await addCheckConstraint(
    knex,
    "form_submissions",
    "form_submissions_errors_check",
    "validation_errors >= 0"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("form_submissions");
}
