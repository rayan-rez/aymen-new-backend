import type { Knex } from "knex";
import { addCheckConstraint, configureTableEngine } from "../knex-extensions";

/**
 * Migration: Locations (hierarchical reference data)
 *
 * Hierarchical structure for: country > region > city > neighborhood
 *
 * Features:
 * - Materialized path for O(1) hierarchy queries
 * - Depth tracking to avoid recursive queries
 * - Self-referencing parent_id for flexible hierarchy
 *
 * Example paths:
 * - Algeria: path="/1/", depth=0
 * - Annaba: path="/1/5/", depth=1
 * - El Bouni: path="/1/5/12/", depth=2
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("locations", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 100).notNullable().unique();

    table.withForeignKey("parent_id", "locations", "id", "SET NULL");


    // Materialized path: "/1/5/12/" for fast "get all descendants" queries
    table.string("path", 500).nullable().index();

    // Depth in tree (0=root, 1=child of root, etc.)
    table.integer("depth").unsigned().defaultTo(0).index();

    table
      .enum("type", ["country", "region", "city", "neighborhood"])
      .notNullable()
      .index();

    table.integer("display_order").unsigned().defaultTo(0);
    table.boolean("is_active").defaultTo(true);

    table.withAuditTrail();

    // Composite indexes for common queries
    table.index(
      ["type", "is_active", "display_order"],
      "idx_type_active_order"
    );
    table.index(["parent_id", "display_order"], "idx_parent_order");
    table.index(["depth", "display_order"], "idx_depth_order");

    configureTableEngine(table);
  });

  await addCheckConstraint(
    knex,
    "locations",
    "locations_display_order_check",
    "display_order >= 0"
  );

  await addCheckConstraint(
    knex,
    "locations",
    "locations_depth_check",
    "depth >= 0 AND depth <= 10"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("locations");
}
