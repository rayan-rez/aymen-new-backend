import type { Knex } from "knex";
import { addCheckConstraint, configureTableDefaults } from "../knex-extensions";

/**
 * Migration: Apartments (Individual Units within Projects)
 * 
 * Represents individual residential units/apartments within larger projects.
 * Each apartment belongs to exactly one project (one-to-many relationship).
 * 
 * KEY FEATURES:
 * - Unit identification and numbering system
 * - Floor-based organization for multi-story buildings
 * - Detailed specifications (area, bedrooms, bathrooms, price)
 * - Availability status tracking (available, reserved, sold)
 * - Publishing workflow for controlled visibility
 * - Model unit designation for show apartments
 * - Virtual tour integration
 * 
 * TYPICAL USE CASES:
 * - Display available units for a project
 * - Filter apartments by specifications (bedrooms, price range)
 * - Track sales pipeline (available → reserved → sold)
 * - Showcase model units to potential buyers
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("apartments", (table) => {
    // =================================================================
    // PRIMARY KEY & PROJECT RELATIONSHIP
    // =================================================================
    table.increments("id").primary();
    table.withForeignKey("project_id", "projects", "id", "CASCADE");

    // =================================================================
    // UNIT IDENTIFICATION
    // =================================================================
    table.string("name", 255).notNullable();
    
    // Unit numbering examples: "A-101", "Tower 2-305", "Villa 12"
    table.string("unit_number", 50).nullable();
    table.index("unit_number", "idx_unit_number");
    
    // Floor number for vertical organization
    table.integer("floor_number").nullable();

    // =================================================================
    // MARKETING CONTENT
    // =================================================================
    table.string("title", 255).nullable();
    table.string("subtitle", 255).nullable();
    table.text("description").nullable();

    // =================================================================
    // SPECIFICATIONS
    // =================================================================
    table.decimal("area_sqm", 10, 2).nullable();
    table.integer("bedrooms").unsigned().nullable();
    table.integer("bathrooms").unsigned().nullable();
    table.decimal("price", 15, 2).nullable();

    // Optional: Additional room counts
    table.integer("living_rooms").unsigned().nullable();
    table.integer("kitchens").unsigned().nullable();
    table.integer("balconies").unsigned().nullable();

    // =================================================================
    // AVAILABILITY STATUS
    // =================================================================
    table.withStatusEnum(
      ["available", "reserved", "sold"],
      { defaultStatus: "available" }
    );

    // =================================================================
    // SPECIAL DESIGNATIONS
    // =================================================================
    table.boolean("is_model_unit").defaultTo(false);
    table.index("is_model_unit", "idx_is_model_unit");
    
    table.boolean("is_published").defaultTo(false);
    table.index("is_published", "idx_is_published");

    // =================================================================
    // VIRTUAL TOUR
    // =================================================================
    table.string("virtual_tour_url", 500).nullable();

    // =================================================================
    // AUDIT TRAIL
    // =================================================================
    table.withAuditTrail();

    // =================================================================
    // COMPOSITE INDEXES FOR QUERY OPTIMIZATION
    // =================================================================
    
    // Primary listing query: available units in project
    table.index(
      ["project_id", "status", "is_published"],
      "idx_proj_status_pub"
    );

    // Floor-based organization
    table.index(
      ["project_id", "floor_number"],
      "idx_proj_floor"
    );

    // Filter by bedroom count
    table.index(
      ["bedrooms", "status"],
      "idx_bed_status"
    );

    // Price range filtering
    table.index(
      ["price", "status"],
      "idx_price_status"
    );

    // Find model units
    table.index(
      ["project_id", "is_model_unit"],
      "idx_proj_model"
    );

    // =================================================================
    // TABLE CONFIGURATION
    // =================================================================
    configureTableDefaults(table);
  });

  // =================================================================
  // CHECK CONSTRAINTS (DATA VALIDATION)
  // =================================================================

  // Ensure area is positive
  await addCheckConstraint(
    knex,
    "apartments",
    "chk_apartments_area_positive",
    "area_sqm IS NULL OR area_sqm > 0"
  );

  // Ensure bedroom count is non-negative
  await addCheckConstraint(
    knex,
    "apartments",
    "chk_apartments_bedrooms",
    "bedrooms IS NULL OR bedrooms >= 0"
  );

  // Ensure bathroom count is non-negative
  await addCheckConstraint(
    knex,
    "apartments",
    "chk_apartments_bathrooms",
    "bathrooms IS NULL OR bathrooms >= 0"
  );

  // Ensure price is positive
  await addCheckConstraint(
    knex,
    "apartments",
    "chk_apartments_price_positive",
    "price IS NULL OR price > 0"
  );

  // Ensure living rooms count is non-negative
  await addCheckConstraint(
    knex,
    "apartments",
    "chk_apartments_living_rooms",
    "living_rooms IS NULL OR living_rooms >= 0"
  );

  // Ensure kitchens count is non-negative
  await addCheckConstraint(
    knex,
    "apartments",
    "chk_apartments_kitchens",
    "kitchens IS NULL OR kitchens >= 0"
  );

  // Ensure balconies count is non-negative
  await addCheckConstraint(
    knex,
    "apartments",
    "chk_apartments_balconies",
    "balconies IS NULL OR balconies >= 0"
  );
}

/**
 * Rollback Migration
 * Drops the apartments table and all associated constraints
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("apartments");
}