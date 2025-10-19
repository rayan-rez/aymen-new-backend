import type { Knex } from "knex";

/**
 * Migration: Land/terrain submissions from property owners
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("land_submissions", (table) => {
    table.increments("id").primary();

    // Owner information
    table.string("owner_name", 255).notNullable();
    table.string("email", 255).nullable();
    table.string("phone", 20).notNullable();

    // Property details
    table.string("address", 500).notNullable();
    table.string("city", 100).nullable();
    table.string("state_province", 100).nullable();
    table.decimal("area_sqm", 12, 2).nullable();
    table.integer("facade_count").unsigned().nullable();

    // Legal documentation status
    table.boolean("has_building_permit").defaultTo(false);
    table.boolean("has_land_title").defaultTo(false); // Libret foncier
    table.boolean("has_property_deed").defaultTo(false); // Acte de propriété
    table.boolean("has_cadastral_plan").defaultTo(false);
    table.boolean("has_urban_planning_certificate").defaultTo(false);
    table.boolean("has_ferida_certificate").defaultTo(false);

    // Evaluation
    table
      .enum("status", [
        "submitted",
        "under_review",
        "site_visit_scheduled",
        "evaluation_complete",
        "interested",
        "offer_made",
        "acquired",
        "rejected",
      ])
      .defaultTo("submitted");

    // Internal tracking
    table.text("internal_notes").nullable();
    table.string("assigned_evaluator", 100).nullable();
    table.decimal("estimated_value", 15, 2).nullable();
    table.date("evaluation_date").nullable();

    table.timestamps(true, true);

    table.index("status");
    table.index("email");
    table.index("phone");
    table.index("assigned_evaluator");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("land_submissions");
}
