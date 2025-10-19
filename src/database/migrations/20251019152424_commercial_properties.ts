import type { Knex } from "knex";

/**
 * Migration: Commercial properties (offices, shops, etc.)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("commercial_properties", (table) => {
    table.increments("id").primary();

    // Basic info
    table.string("title", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.string("subtitle", 255).nullable();
    table.text("description").notNullable();
    table.text("card_description").nullable();

    // Location
    table.string("address", 255).notNullable();
    table.text("map_embed_code").nullable();
    table.decimal("latitude", 10, 8).nullable();
    table.decimal("longitude", 11, 8).nullable();

    // Property details
    table
      .enum("property_type", [
        "office",
        "shop",
        "warehouse",
        "showroom",
        "restaurant",
        "mixed_use",
      ])
      .notNullable();
    table.decimal("area_sqm", 10, 2).nullable();
    table.decimal("price", 15, 2).nullable();
    table
      .enum("status", ["available", "rented", "sold"])
      .defaultTo("available");

    // Marketing
    table.string("main_image_url", 500).nullable();
    table.string("contact_form_id", 255).nullable();
    table.boolean("is_featured").defaultTo(false);

    // Timestamps and soft delete
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();

    table.index(["slug", "deleted_at"]);
    table.index("property_type");
    table.index("status");
    table.index("is_featured");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("commercial_properties");
}
