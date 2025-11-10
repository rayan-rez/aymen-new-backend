import type { Knex } from "knex";
import { addCheckConstraint, configureTableEngine } from "../knex-extensions";

/**
 * Migration: Lead Mirrors (Local ↔ Odoo Sync)
 *
 * Minimal local table that mirrors leads created in Odoo ERP.
 * This acts as a correlation table between local form submissions
 * and external CRM records.
 *
 * KEY FEATURES:
 * - Stores Odoo lead ID for external reference
 * - Links to local form submission
 * - Tracks sync status and timestamps
 * - Enables local-to-Odoo correlation without duplicating CRM data
 *
 * WORKFLOW:
 * 1. User submits form → form_submissions record created
 * 2. API call to Odoo → Lead created in Odoo CRM
 * 3. Odoo returns lead_id → Stored in this table
 * 4. Local database now has bidirectional mapping
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("lead_mirrors", (table) => {
    // =================================================================
    // PRIMARY KEY
    // =================================================================
    table.increments("id").primary();

    // =================================================================
    // EXTERNAL REFERENCE (ODOO)
    // =================================================================
    // Odoo lead ID (unique identifier in external CRM)
    table.string("odoo_lead_id", 100).notNullable().unique();
    table.index("odoo_lead_id", "idx_odoo_lead_id");

    // =================================================================
    // LOCAL REFERENCE (FORM SUBMISSION)
    // =================================================================
    // Links to the form submission that created this lead
    table.withForeignKey("form_submission_id","form_submissions","id","CASCADE");

    // =================================================================
    // LEAD METADATA
    // =================================================================
    // Lead type (mirrors Odoo lead type/category)
    table.withStatusEnum(
      [
        "contact_form",
        "project_inquiry",
        "appointment",
        "catalog_download",
        "land_submission",
        "job_application",
        "event_registration",
      ],
      { columnName: "lead_type" }
    );

    // Basic contact info (cached from form submission for quick access)
    table.string("email", 255).nullable();
    table.string("phone", 30).nullable();
    table.index("email", "idx_email");
    table.index("phone", "idx_phone");

    // =================================================================
    // SYNC STATUS
    // =================================================================
    table.withStatusEnum(["pending", "synced", "failed", "updated"], {
      columnName: "sync_status",
      defaultStatus: "pending",
    });

    // Timestamp when lead was successfully synced to Odoo
    table.timestamp("synced_at").nullable();

    // Timestamp when Odoo last updated this lead
    table.timestamp("last_odoo_update").nullable();

    // Error message if sync failed
    table.text("sync_error").nullable();

    // Retry count for failed syncs
    table.integer("sync_retry_count").unsigned().defaultTo(0);

    // =================================================================
    // AUDIT TRAIL
    // =================================================================
    table.withTimestamps();

    // =================================================================
    // COMPOSITE INDEXES
    // =================================================================
    table.index(["sync_status", "created_at"], "idx_sync_status_date");
    table.index(["lead_type", "sync_status"], "idx_type_sync");

    configureTableEngine(table);
  });

  await addCheckConstraint(
    knex,
    "lead_mirrors",
    "chk_sync_retry_count",
    "sync_retry_count >= 0 AND sync_retry_count <= 10"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("lead_mirrors");
}
