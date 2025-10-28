import type { Knex } from "knex";
import { addCheckConstraint, configureTableDefaults } from "../knex-extensions";

/**
 * Migration: Features (Property Amenities and Features)
 * 
 * Reference table for property features, amenities, and facilities.
 * Used in project_features junction table for many-to-many relationships.
 * 
 * KEY FEATURES:
 * - Multi-language support via JSON translations
 * - Category-based organization for UI grouping
 * - Icon support for visual representation
 * - Display ordering for consistent presentation
 * - No soft deletes (reference data typically doesn't need it)
 * 
 * TRANSLATION STRUCTURE:
 * {
 *   "en": "Swimming Pool",
 *   "fr": "Piscine",
 *   "ar": "مسبح"
 * }
 * 
 * CATEGORIES:
 * - amenity: Pools, gyms, playgrounds, gardens
 * - security: 24/7 security, CCTV, access control
 * - transport: Parking, metro access, bus stops
 * - leisure: Spa, cinema, sports facilities
 * - other: Miscellaneous features
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("features", (table) => {
    // =================================================================
    // PRIMARY KEY & IDENTIFIERS
    // =================================================================
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 100).notNullable().unique();

    // =================================================================
    // VISUAL REPRESENTATION
    // =================================================================
    // Icon identifier (e.g., "swimming-pool", "security-camera")
    // Can reference icon library (FontAwesome, Material Icons, etc.)
    table.string("icon", 50).nullable();

    // =================================================================
    // MULTI-LANGUAGE SUPPORT
    // =================================================================
    // JSON object with language codes as keys
    // Example: {"en":"Swimming Pool","fr":"Piscine","ar":"مسبح"}
    table.withJsonMetadata("translations");

    // =================================================================
    // CATEGORIZATION
    // =================================================================
    table.withStatusEnum(
      ["amenity", "security", "transport", "leisure", "other"],
      { columnName: "category", defaultStatus: "amenity" }
    );

    // =================================================================
    // DISPLAY & ORDERING
    // =================================================================
    table.integer("display_order").unsigned().defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    table.index("is_active", "idx_is_active");

    // =================================================================
    // TIMESTAMPS (No soft deletes for reference data)
    // =================================================================
    table.withTimestamps();

    // =================================================================
    // COMPOSITE INDEXES FOR QUERY OPTIMIZATION
    // =================================================================
    
    // Filter and order features by category
    table.index(
      ["category", "is_active", "display_order"],
      "idx_cat_active_order"
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
    "features",
    "chk_features_display_order",
    "display_order >= 0"
  );
}

/**
 * Rollback Migration
 * Drops the features table and all associated constraints
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("features");
}