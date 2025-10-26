import type { Knex } from "knex";

/**
 * Migration: Core reference tables for locations and property features
 */
export async function up(knex: Knex): Promise<void> {
  // Locations table (cities, neighborhoods, zones)
  await knex.schema.createTable("locations", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 100).notNullable().unique();
    table
      .integer("parent_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL");
    table
      .enum("type", ["country", "region", "city", "neighborhood"])
      .notNullable();
    table.integer("display_order").defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);
    
    // Soft delete support
    table.timestamp("deleted_at").nullable();

    table.index("parent_id");
    table.index(["type", "is_active"]);
    table.index("slug");
    table.index("deleted_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("locations");
}