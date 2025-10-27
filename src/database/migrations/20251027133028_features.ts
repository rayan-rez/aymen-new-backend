// refactored features
import type { Knex } from "knex";
import { addTimestamps, addCheckConstraint } from "../migration-helpers";

/**
 * REFACTORED: Features table
 * 
 * CHANGES:
 * 1. No soft delete (reference data doesn't need it)
 * 2. Added translations support (JSON column)
 * 3. Improved indexing
 * 
 * BENEFITS:
 * - Simpler queries (no deleted_at checks)
 * - Multi-language support without separate tables
 * - Better performance on feature lookups
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("features", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 100).notNullable().unique();
    table.string("icon", 50).nullable();
    
    // NEW: Translations as JSON (fr, ar, en)
    table.json("translations").nullable();
    
    table
      .enum("category", [
        "amenity",
        "security",
        "transport",
        "leisure",
        "other",
      ])
      .defaultTo("amenity")
      .index();
    
    table.integer("display_order").unsigned().defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    
    addTimestamps(table);

    // Composite index for common queries
    table.index(["category", "is_active", "display_order"], "idx_cat_active_order");
  });

  await addCheckConstraint(
    knex,
    "features",
    "features_display_order_check",
    "display_order >= 0"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("features");
}