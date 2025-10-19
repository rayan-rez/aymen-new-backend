import type { Knex } from "knex";

/**
 * Migration: Real estate development projects
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("projects", (table) => {
    table.increments("id").primary();
    table.string("name", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.text("description").nullable();
    table.text("description_secondary").nullable();
    table.string("address", 255).notNullable();

    // Location data
    table.text("map_embed_code").nullable();
    table.decimal("latitude", 10, 8).nullable();
    table.decimal("longitude", 11, 8).nullable();
    table
      .integer("location_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL");

    // Project details
    table
      .enum("status", [
        "planning",
        "under_construction",
        "completed",
        "sold_out",
      ])
      .defaultTo("planning");
    table
      .integer("completion_percentage")
      .unsigned()
      .defaultTo(0)
      .checkBetween([0, 100]);
    table.integer("total_blocks").unsigned().nullable();

    // Media and marketing
    table.string("main_photo_url", 500).nullable();
    table.text("contact_form_script").nullable();
    table.boolean("is_featured").defaultTo(false);

    // Timestamps and soft delete
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();

    table.index(["slug", "deleted_at"]);
    table.index("status");
    table.index("is_featured");
    table.index("location_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("projects");
}
