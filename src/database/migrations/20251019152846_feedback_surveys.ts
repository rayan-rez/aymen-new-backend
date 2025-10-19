import type { Knex } from "knex";

/**
 * Migration: Customer feedback and surveys
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("customer_feedback", (table) => {
    table.increments("id").primary();

    // Contact info (optional for anonymous feedback)
    table.string("full_name", 255).nullable();
    table.string("email", 255).nullable();
    table.string("phone", 20).nullable();

    // Feedback type
    table
      .enum("feedback_type", [
        "event_feedback",
        "property_visit",
        "customer_service",
        "general",
        "kiosk",
      ])
      .notNullable();

    // Ratings
    table.integer("overall_satisfaction").nullable().checkBetween([1, 10]);
    table.integer("recommendation_likelihood").nullable().checkBetween([1, 10]);

    // Comments
    table.text("feedback_comments").nullable();
    table.text("suggestions").nullable();

    // Context
    table
      .integer("project_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("projects")
      .onDelete("SET NULL");
    table.string("related_event", 255).nullable();
    table.enum("language", ["fr", "ar", "en"]).defaultTo("fr");

    table.timestamps(true, true);

    table.index("feedback_type");
    table.index("project_id");
    table.index("created_at");
  });

  // Trade show specific feedback
  await knex.schema.createTable("trade_show_feedback", (table) => {
    table.increments("id").primary();

    // Company ratings
    table
      .decimal("company_satisfaction", 3, 1)
      .notNullable()
      .checkBetween([0, 10]);
    table
      .decimal("company_recommendation", 3, 1)
      .notNullable()
      .checkBetween([0, 10]);

    // Event ratings
    table
      .decimal("event_satisfaction", 3, 1)
      .notNullable()
      .checkBetween([0, 10]);
    table
      .decimal("event_recommendation", 3, 1)
      .notNullable()
      .checkBetween([0, 10]);

    // Comments
    table.text("positive_feedback").nullable();
    table.text("improvement_suggestions").nullable();

    // Context
    table.string("trade_show_name", 255).notNullable();
    table.date("trade_show_date").notNullable();
    table.enum("language", ["fr", "ar", "en"]).defaultTo("fr");

    table.timestamps(true, true);

    table.index(["trade_show_name", "trade_show_date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("trade_show_feedback");
  await knex.schema.dropTableIfExists("customer_feedback");
}
