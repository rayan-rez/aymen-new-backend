import type { Knex } from "knex";

/**
 * Migration: Catalog download requests
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("catalog_download_requests", (table) => {
    table.increments("id").primary();

    // Contact info
    table.string("full_name", 100).notNullable();
    table.string("email", 255).notNullable();
    table.string("phone", 20).notNullable();

    // Catalog details
    table.string("catalog_type", 100).nullable();
    table
      .integer("project_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("projects")
      .onDelete("SET NULL");

    // Consent
    table.boolean("marketing_consent").defaultTo(false);

    // Tracking
    table.timestamp("downloaded_at").nullable();
    table.string("download_ip", 45).nullable();

    table.timestamps(true, true);

    table.index("email");
    table.index("project_id");
    table.index(["created_at", "catalog_type"]);
    table.timestamp("deleted_at").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("catalog_download_requests");
}
