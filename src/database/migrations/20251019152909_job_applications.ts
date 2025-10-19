import type { Knex } from "knex";

/**
 * Migration: Recruitment and job applications
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("job_applications", (table) => {
    table.increments("id").primary();

    // Applicant info
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.string("email", 255).notNullable();
    table.string("phone", 20).notNullable();

    // Application details
    table.string("applied_position", 100).notNullable();
    table.string("portfolio_url", 500).nullable();
    table.string("linkedin_url", 500).nullable();
    table.text("cover_letter").nullable();

    // Resume storage (store path/URL, not binary)
    table.string("resume_url", 500).nullable();
    table.string("resume_filename", 255).nullable();

    // Application status
    table
      .enum("status", [
        "received",
        "screening",
        "interview_scheduled",
        "interviewed",
        "offer_extended",
        "hired",
        "rejected",
        "withdrawn",
      ])
      .defaultTo("received");

    // Internal tracking
    table.text("hr_notes").nullable();
    table.string("interviewed_by", 255).nullable();
    table.date("interview_date").nullable();

    table.timestamps(true, true);

    table.index("email");
    table.index("status");
    table.index("applied_position");
    table.index(["status", "created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("job_applications");
}
