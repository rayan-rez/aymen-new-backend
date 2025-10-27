// refactored locations
import type { Knex } from "knex";
import { addAuditFields, addCheckConstraint } from "../migration-helpers";

/**
 * REFACTORED: Locations table
 * 
 * CHANGES:
 * 1. Added materialized path for efficient hierarchy queries
 * 2. Added depth column to avoid recursive queries
 * 3. Standardized with helper functions
 * 4. Added CHECK constraint for display_order
 * 
 * BENEFITS:
 * - Faster hierarchy traversal (no recursive CTEs needed)
 * - Better query performance for "get all children"
 * - Consistent audit fields
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("locations", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 100).notNullable().unique();
    
    // Hierarchy fields
    table
      .integer("parent_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL");
    
    // NEW: Materialized path for efficient queries
    // Format: "/1/5/12/" (includes all ancestor IDs)
    table.string("path", 500).nullable().index();
    
    // NEW: Depth in tree (0 = root, 1 = child of root, etc.)
    table.integer("depth").unsigned().defaultTo(0);
    
    table
      .enum("type", ["country", "region", "city", "neighborhood"])
      .notNullable()
      .index();
    
    table.integer("display_order").unsigned().defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    
    // Standard audit fields
    addAuditFields(table);

    // Composite indexes for common queries
    table.index(["type", "is_active", "display_order"], "idx_type_active_order");
    table.index(["parent_id", "display_order"], "idx_parent_order");
    table.index(["depth", "display_order"], "idx_depth_order");
  });

  // CHECK constraint for display_order
  await addCheckConstraint(
    knex,
    "locations",
    "locations_display_order_check",
    "display_order >= 0"
  );
  
  // CHECK constraint for depth
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