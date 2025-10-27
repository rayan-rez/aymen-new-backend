// 20251027093659_events.ts
import type { Knex } from "knex";

/**
 * Migration: Create events and event registrations tables
 */
export async function up(knex: Knex): Promise<void> {
  // Create events table
  await knex.schema.createTable("events", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table
      .enum("type", [
        "open_house",
        "trade_show",
        "inauguration",
        "networking",
        "webinar",
        "other"
      ])
      .notNullable();
    table.date("date").notNullable();
    table.string("assigned_salesperson", 100).nullable();
    table.timestamps(true, true);

    table.unique(["type", "date"]);
    table.index("type");
    table.index("date");
  });

}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("events");
}