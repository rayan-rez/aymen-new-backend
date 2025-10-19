import type { Knex } from "knex";

/**
 * Migration: Apartment photos and media
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("apartment_photos", (table) => {
    table.increments("id").primary();
    table
      .integer("apartment_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("apartments")
      .onDelete("CASCADE");
    table.string("url", 500).notNullable();
    table.string("external_url", 500).nullable();
    table.string("caption", 255).nullable();
    table.integer("display_order").defaultTo(0);
    table.timestamps(true, true);

    table.index("apartment_id");
    table.index(["apartment_id", "display_order"]);
  });

  // Apartment floor plans (separate from project floor plans)
  await knex.schema.createTable("apartment_floor_plans", (table) => {
    table.increments("id").primary();
    table
      .integer("apartment_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("apartments")
      .onDelete("CASCADE");
    table.string("name", 255).notNullable();
    table.string("image_url", 500).notNullable();
    table.string("pdf_url", 500).nullable();
    table.integer("display_order").defaultTo(0);
    table.timestamps(true, true);

    table.index("apartment_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("apartment_floor_plans");
  await knex.schema.dropTableIfExists("apartment_photos");
}
