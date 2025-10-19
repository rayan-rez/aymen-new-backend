import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Features table (amenities and property features)
  await knex.schema.createTable("features", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 100).notNullable().unique();
    table.string("icon", 50).nullable();
    table
      .enum("category", [
        "amenity",
        "security",
        "transport",
        "leisure",
        "other",
      ])
      .defaultTo("amenity");
    table.integer("display_order").defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);

    table.index(["category", "is_active"]);
    table.index("slug");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("features");
}
