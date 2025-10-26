import type { Knex } from "knex";

/**
 * Migration: Project-specific inquiry forms
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("project_inquiries", (table) => {
    table.increments("id").primary();

    // Project reference
    table
      .integer("project_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("projects")
      .onDelete("SET NULL");

    // Contact info
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.string("email", 255).notNullable();
    table.string("phone", 20).notNullable();

    // Location info
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

    // Preferences (stored as JSON for flexibility)
    table.json("interest_types").nullable(); // ['buy', 'invest', 'rent']
    table.json("property_types").nullable(); // ['apartment', 'villa', 'studio']
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
      .nullable();

    // Lead tracking
    table.string("assigned_to", 100).nullable(); // Salesperson
    table
      .enum("status", [
        "new",
        "contacted",
        "qualified",
        "viewing_scheduled",
        "offer_made",
        "closed_won",
        "closed_lost",
      ])
      .defaultTo("new");

    // Consent
    table.boolean("accepted_terms").defaultTo(false);
    table.boolean("marketing_consent").defaultTo(false);

    table.timestamps(true, true);
    
    // Soft delete support
    table.timestamp("deleted_at").nullable();

    table.index("project_id");
    table.index(["email", "created_at"]);
    table.index("assigned_to");
    table.index("status");
    table.index("deleted_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("project_inquiries");
}