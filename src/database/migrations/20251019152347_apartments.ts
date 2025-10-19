import type { Knex } from "knex";

/**
 * Migration: Apartment units within projects
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("apartments", (table) => {
    table.increments("id").primary();
    table
      .integer("project_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE");

    // Basic info
    table.string("name", 255).notNullable();
    table.string("title", 255).nullable();
    table.string("subtitle", 255).nullable();
    table.text("description").nullable();

    // Specifications
    table.decimal("area_sqm", 10, 2).nullable();
    table.integer("bedrooms").unsigned().nullable();
    table.integer("bathrooms").unsigned().nullable();
    table.decimal("price", 15, 2).nullable();

    // Status
    table
      .enum("status", ["available", "reserved", "sold"])
      .defaultTo("available");
    table.boolean("is_model_unit").defaultTo(false);

    // Virtual tour
    table.string("virtual_tour_url", 500).nullable();

    // Timestamps and soft delete
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();

    table.index("project_id");
    table.index("status");
    table.index(["project_id", "status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("apartments");
}
