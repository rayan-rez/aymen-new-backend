import type { Knex } from "knex";

/**
 * Migration: Virtual tours table
 * Currently only used for projects
 * Can be made polymorphic later if needed for apartments/commercial properties
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("virtual_tours", (table) => {
    table.increments("id").primary();
    table
      .integer("project_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE");
    table.string("url", 500).notNullable();
    table.text("description").nullable();
    table.string("thumbnail_url", 500).nullable();
    table.timestamps(true, true);

    table.index("project_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("virtual_tours");
}