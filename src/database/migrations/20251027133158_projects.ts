import type { Knex } from "knex";
import { addCheckConstraint, configureTableEngine } from "../knex-extensions";

/**
 * Migration: Projects (Real Estate Developments)
 * 
 * Core table for residential/commercial/mixed-use projects.
 * 
 * Key Features:
 * - Project categorization by type (residential, commercial, luxury, etc.)
 * - Denormalized price range for efficient filtering
 * - Construction progress tracking with completion percentage
 * - Publishing workflow with featured/published flags
 * - SEO optimization fields (meta_title, meta_description)
 * - Geographic coordinates with location hierarchy
 * 
 * Relationships:
 * - One project → many apartments (projects.id ← apartments.project_id)
 * - One project → one location (projects.location_id → locations.id)
 * 
 * Indexes:
 * - Primary filtering: status + is_published + is_featured
 * - Geographic queries: location_id + status, latitude + longitude
 * - Type filtering: project_type + status
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("projects", (table) => {
    // =================================================================
    // PRIMARY KEY & IDENTIFIERS
    // =================================================================
    table.increments("id").primary();
    table.string("name", 255).notNullable();
    table.string("slug", 255).notNullable().unique();

    // =================================================================
    // CONTENT & DESCRIPTION
    // =================================================================
    table.text("description").nullable();
    table.text("description_secondary").nullable();
    table.string("address", 255).notNullable();

    // =================================================================
    // LOCATION & GEOGRAPHY
    // =================================================================
    table.withCoordinates({ required: false });
    table.withForeignKey("location_id", "locations", "id", "SET NULL");

    // =================================================================
    // PROJECT CLASSIFICATION
    // =================================================================
    table
      .withStatusEnum(
        ["residential", "commercial", "mixed_use", "luxury", "affordable"],
        { columnName: "project_type", defaultStatus: "residential" }
      );

    // =================================================================
    // PROJECT STATUS & PROGRESS
    // =================================================================
    table.withStatusEnum(
      ["planning", "under_construction", "completed", "sold_out"],
      { defaultStatus: "planning" }
    );

    table.integer("completion_percentage").unsigned().defaultTo(0);
    table.date("estimated_completion_date").nullable();
    table.date("actual_completion_date").nullable();

    // =================================================================
    // PROJECT METRICS
    // =================================================================
    table.integer("total_blocks").unsigned().nullable();
    table.integer("total_units").unsigned().nullable();

    // Denormalized from apartments for quick filtering without joins
    table.decimal("price_min", 15, 2).nullable();
    table.decimal("price_max", 15, 2).nullable();

    // =================================================================
    // MEDIA & ASSETS
    // =================================================================
    table.string("main_photo_url", 500).nullable();

    // =================================================================
    // PUBLISHING WORKFLOW
    // =================================================================
    table.boolean("is_featured").defaultTo(false).index("idx_is_featured");
    table.boolean("is_published").defaultTo(false).index("idx_is_published");

    // =================================================================
    // SEO OPTIMIZATION
    // =================================================================
    table.string("meta_title", 255).nullable();
    table.text("meta_description").nullable();

    // =================================================================
    // AUDIT TRAIL (created_at, updated_at, deleted_at)
    // =================================================================
    table.withAuditTrail();

    // =================================================================
    // COMPOSITE INDEXES FOR QUERY OPTIMIZATION
    // =================================================================
    
    // Primary listing query: published projects by status and featured flag
    table.index(
      ["status", "is_published", "is_featured"],
      "idx_status_pub_feat"
    );

    // Location-based filtering
    table.index(["location_id", "status"], "idx_location_status");

    // Type-based filtering
    table.index(["project_type", "status"], "idx_type_status");

    // =================================================================
    // TABLE CONFIGURATION
    // =================================================================
    configureTableEngine(table);
  });

  // =================================================================
  // CHECK CONSTRAINTS (DATA VALIDATION)
  // =================================================================

  // Ensure completion percentage is between 0 and 100
  await addCheckConstraint(
    knex,
    "projects",
    "chk_projects_completion_percentage",
    "completion_percentage >= 0 AND completion_percentage <= 100"
  );

  // Validate latitude range (-90 to +90)
  await addCheckConstraint(
    knex,
    "projects",
    "chk_projects_latitude",
    "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)"
  );

  // Validate longitude range (-180 to +180)
  await addCheckConstraint(
    knex,
    "projects",
    "chk_projects_longitude",
    "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)"
  );

  // Ensure price_min <= price_max when both are set
  await addCheckConstraint(
    knex,
    "projects",
    "chk_projects_price_range",
    "price_min IS NULL OR price_max IS NULL OR price_min <= price_max"
  );

  // Ensure total_blocks is positive
  await addCheckConstraint(
    knex,
    "projects",
    "chk_projects_total_blocks",
    "total_blocks IS NULL OR total_blocks > 0"
  );

  // Ensure total_units is positive
  await addCheckConstraint(
    knex,
    "projects",
    "chk_projects_total_units",
    "total_units IS NULL OR total_units > 0"
  );
}

/**
 * Rollback Migration
 * Drops the projects table and all associated constraints
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("projects");
}