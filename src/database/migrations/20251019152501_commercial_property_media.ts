import type { Knex } from "knex";

/**
 * Migration: Commercial property media and relationships
 */
export async function up(knex: Knex): Promise<void> {
  // Commercial property photos
  await knex.schema.createTable("commercial_property_photos", (table) => {
    table.increments("id").primary();
    table
      .integer("property_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("commercial_properties")
      .onDelete("CASCADE");
    table.string("url", 500).notNullable();
    table.string("caption", 255).nullable();
    table.integer("display_order").defaultTo(0);
    table.boolean("is_cover").defaultTo(false);
    table.timestamps(true, true);

    table.index("property_id");
    table.index(["property_id", "display_order"]);
  });

  // Commercial property locations junction table
  await knex.schema.createTable("commercial_property_locations", (table) => {
    table.increments("id").primary();
    table
      .integer("property_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("commercial_properties")
      .onDelete("CASCADE");
    table
      .integer("location_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("locations")
      .onDelete("CASCADE");
    table.timestamps(true, true);

    table.unique(["property_id", "location_id"]);
    table.index("property_id");
    table.index("location_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("commercial_property_locations");
  await knex.schema.dropTableIfExists("commercial_property_photos");
}
