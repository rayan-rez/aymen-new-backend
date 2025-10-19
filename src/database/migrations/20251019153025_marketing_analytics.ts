import type { Knex } from "knex";

/**
 * Migration: Marketing campaigns and analytics
 */
export async function up(knex: Knex): Promise<void> {
  // Lead sources and campaign tracking
  await knex.schema.createTable("lead_sources", (table) => {
    table.increments("id").primary();

    // Lead identification
    table.string("lead_email", 255).notNullable();
    table
      .enum("lead_type", [
        "contact_form",
        "project_inquiry",
        "event_registration",
        "appointment",
        "catalog_download",
      ])
      .notNullable();
    table.integer("lead_reference_id").unsigned().nullable(); // ID in the source table

    // Campaign tracking
    table.string("utm_source", 100).nullable();
    table.string("utm_medium", 100).nullable();
    table.string("utm_campaign", 150).nullable();
    table.string("utm_term", 150).nullable();
    table.string("utm_content", 150).nullable();

    // Source tracking
    table.string("referrer_url", 500).nullable();
    table.string("landing_page_url", 500).nullable();
    table.string("source_ip", 45).nullable();
    table.string("user_agent", 500).nullable();

    // Device info
    table
      .enum("device_type", ["desktop", "mobile", "tablet", "unknown"])
      .nullable();
    table.string("browser", 100).nullable();
    table.string("operating_system", 100).nullable();

    table.timestamps(true, true);

    table.index("lead_email");
    table.index(["utm_source", "utm_medium", "utm_campaign"]);
    table.index("created_at");
  });

  // Marketing preferences and consent
  await knex.schema.createTable("marketing_consents", (table) => {
    table.increments("id").primary();

    table.string("email", 255).notNullable().unique();
    table.boolean("email_marketing_consent").defaultTo(false);
    table.boolean("sms_marketing_consent").defaultTo(false);
    table.boolean("phone_marketing_consent").defaultTo(false);
    table.timestamp("consent_given_at").nullable();
    table.timestamp("consent_revoked_at").nullable();
    table.string("consent_source", 255).nullable();

    table.timestamps(true, true);

    table.index("email");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("marketing_consents");
  await knex.schema.dropTableIfExists("lead_sources");
}
