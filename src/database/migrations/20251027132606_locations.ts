import type { Knex } from "knex";
import { addCheckConstraint, configureTableDefaults } from "../knex-extensions";

/**
 * Migration: Locations (Hierarchical Reference Data)
 * 
 * Hierarchical geographic structure: country > region > city > neighborhood
 * 
 * KEY FEATURES:
 * - Materialized path pattern for O(1) hierarchy queries
 * - Depth tracking eliminates need for recursive queries
 * - Self-referencing parent_id for flexible tree structure
 * - Optimized indexes for common lookup patterns
 * 
 * MATERIALIZED PATH EXAMPLES:
 * - Algeria (root):        path="/1/", depth=0
 * - Annaba (region):       path="/1/5/", depth=1
 * - El Bouni (city):       path="/1/5/12/", depth=2
 * - Downtown (neighborhood): path="/1/5/12/3/", depth=3
 * 
 * QUERY PATTERNS:
 * - Get all descendants: WHERE path LIKE '/1/5/%'
 * - Get all children: WHERE parent_id = 5
 * - Get ancestors: Parse path and query by IDs
 * - Get by level: WHERE depth = 2 (all cities)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("locations", (table) => {
    // =================================================================
    // PRIMARY KEY & IDENTIFIERS
    // =================================================================
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 100).notNullable().unique();

    // =================================================================
    // HIERARCHY STRUCTURE
    // =================================================================
    
    // Self-referencing foreign key for tree structure
    table
      .integer("parent_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("locations")
      .onDelete("SET NULL");
    table.index("parent_id", "idx_parent_id");

    // Materialized path for fast descendant queries
    // Format: "/ancestor_id/.../parent_id/current_id/"
    // Enables: SELECT * FROM locations WHERE path LIKE '/1/5/%'
    table.string("path", 500).nullable();
    table.index("path", "idx_path");

    // Depth in hierarchy (0 = root, 1 = child of root, etc.)
    // Enables: SELECT * FROM locations WHERE depth = 2
    table.integer("depth").unsigned().defaultTo(0);
    table.index("depth", "idx_depth");

    // =================================================================
    // LOCATION TYPE CLASSIFICATION
    // =================================================================
    table.withStatusEnum(
      ["country", "region", "city", "neighborhood"],
      { columnName: "type" }
    );

    // =================================================================
    // DISPLAY & ORDERING
    // =================================================================
    table.integer("display_order").unsigned().defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    table.index("is_active", "idx_is_active");

    // =================================================================
    // AUDIT TRAIL
    // =================================================================
    table.withAuditTrail();

    // =================================================================
    // COMPOSITE INDEXES FOR COMMON QUERIES
    // =================================================================
    
    // Filter by type, active status, and order
    table.index(
      ["type", "is_active", "display_order"],
      "idx_type_active_order"
    );

    // Get children ordered by display_order
    table.index(
      ["parent_id", "display_order"],
      "idx_parent_order"
    );

    // Get all locations at a specific depth level
    table.index(
      ["depth", "display_order"],
      "idx_depth_order"
    );

    // =================================================================
    // TABLE CONFIGURATION
    // =================================================================
    configureTableDefaults(table);
  });

  // =================================================================
  // CHECK CONSTRAINTS (DATA VALIDATION)
  // =================================================================

  // Ensure display_order is non-negative
  await addCheckConstraint(
    knex,
    "locations",
    "chk_locations_display_order",
    "display_order >= 0"
  );

  // Limit hierarchy depth to prevent performance issues
  // Max depth of 10 allows: country > region > state > city > district > 
  // neighborhood > sub-neighborhood > block > sub-block > micro-area
  await addCheckConstraint(
    knex,
    "locations",
    "chk_locations_depth",
    "depth >= 0 AND depth <= 10"
  );
}

/**
 * Rollback Migration
 * Drops the locations table and all associated constraints
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("locations");
}