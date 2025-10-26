import type { Knex } from "knex";

/**
 * Migration: General contact forms and lead management
 */
export async function up(knex: Knex): Promise<void> {
  // Base contact table for general inquiries
  await knex.schema.createTable("contact_submissions", (table) => {
    table.increments("id").primary();

    // Contact info
    table.string("first_name", 100).nullable();
    table.string("last_name", 100).nullable();
    table.string("email", 255).notNullable();
    table.string("phone", 20).nullable();

    // Message
    table.string("subject", 255).nullable();
    table.text("message").notNullable();

    // Lead management
    table
      .enum("status", [
        "new",
        "contacted",
        "qualified",
        "converted",
        "closed",
        "spam",
      ])
      .defaultTo("new");
    table.text("internal_notes").nullable();

    // Tracking
    table.string("source_page", 500).nullable();
    table.string("utm_source", 100).nullable();
    table.string("utm_medium", 100).nullable();
    table.string("utm_campaign", 150).nullable();
    table.string("referrer", 500).nullable();

    table.timestamps(true, true);
    
    // Soft delete support
    table.timestamp("deleted_at").nullable();

    table.index(["status", "created_at"]);
    table.index("email");
    table.index("deleted_at");
  });

  // Appointments/viewing requests
  await knex.schema.createTable("appointment_requests", (table) => {
    table.increments("id").primary();

    // Contact info
    table.string("full_name", 150).notNullable();
    table.string("email", 255).notNullable();
    table.string("phone", 20).notNullable();

    // Appointment details
    table.string("preferred_location", 255).nullable();
    table.string("budget_range", 50).nullable();
    table.date("preferred_date").nullable();
    table.string("preferred_time", 20).nullable();

    // Status
    table
      .enum("status", [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ])
      .defaultTo("pending");
    table.text("notes").nullable();

    table.timestamps(true, true);
    
    // Soft delete support
    table.timestamp("deleted_at").nullable();

    table.index(["status", "preferred_date"]);
    table.index("email");
    table.index("deleted_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("appointment_requests");
  await knex.schema.dropTableIfExists("contact_submissions");
}