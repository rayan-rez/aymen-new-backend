import type { Knex } from "knex";

/**
 * Migration: Event registrations and trade shows
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("event_registrations", (table) => {
    table.increments("id").primary();

    // Contact info
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.string("email", 255).nullable();
    table.string("phone", 30).nullable();

    // Event details
    table
      .enum("event_type", [
        "open_house",
        "trade_show",
        "inauguration",
        "networking",
        "webinar",
      ])
      .notNullable();
    table.date("event_date").notNullable();
    table.json("selected_time_slots").nullable();

    // Check-in tracking
    table.timestamp("checked_in_at").nullable();
    table.timestamp("checked_out_at").nullable();

    // Feedback (NPS style)
    table.integer("satisfaction_score").nullable().checkBetween([1, 10]);
    table.integer("recommendation_score").nullable().checkBetween([1, 10]);
    table.text("feedback_comments").nullable();

    // Assigned staff
    table.string("assigned_salesperson", 100).nullable();

    // Consent
    table.boolean("accepted_terms").defaultTo(false);
    table.boolean("photo_consent").defaultTo(false);

    // Tracking
    table.string("utm_source", 100).nullable();
    table.string("utm_medium", 100).nullable();
    table.string("utm_campaign", 150).nullable();
    table.string("registration_source", 500).nullable();
    table.string("referrer", 500).nullable();

    table.timestamps(true, true);

    table.index(["event_type", "event_date"]);
    table.index("email");
    table.index("phone");
    table.index("assigned_salesperson");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("event_registrations");
}
