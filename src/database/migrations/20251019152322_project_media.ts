import type { Knex } from "knex";

/**
 * Migration: Project media (photos, virtual tours, floor plans)
 */
export async function up(knex: Knex): Promise<void> {
  // Project photos
  await knex.schema.createTable("project_photos", (table) => {
    table.increments("id").primary();
    table
      .integer("project_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE");
    table.string("url", 500).notNullable();
    table.string("caption", 255).nullable();
    table.integer("display_order").defaultTo(0);
    table.boolean("is_cover").defaultTo(false);
    table.timestamps(true, true);

    table.index("project_id");
    table.index(["project_id", "display_order"]);
  });

  // Virtual tours
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

  // Floor plans
  await knex.schema.createTable("floor_plans", (table) => {
    table.increments("id").primary();
    table
      .integer("project_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE");
    table.string("name", 255).notNullable();
    table.string("image_url", 500).notNullable();
    table.string("pdf_url", 500).nullable();
    table.integer("display_order").defaultTo(0);
    table.timestamps(true, true);

    table.index("project_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("floor_plans");
  await knex.schema.dropTableIfExists("virtual_tours");
  await knex.schema.dropTableIfExists("project_photos");
}
