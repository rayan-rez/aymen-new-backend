// refactored projects
import type { Knex } from "knex";
import { addAuditFields, addForeignKey, addCheckConstraint } from "../migration-helpers";

/**
 * REFACTORED: Projects table
 * 
 * CHANGES:
 * 1. Removed map_embed_code (store in separate media table)
 * 2. Added project_type for better categorization
 * 3. Added price_range fields for quick filtering
 * 4. Improved geospatial indexing
 * 5. Added completion_date (actual vs. percentage)
 * 
 * BENEFITS:
 * - Cleaner separation of concerns (media in separate table)
 * - Better search/filter performance
 * - More accurate project timeline tracking
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("projects", (table) => {
    table.increments("id").primary();
    table.string("name", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.text("description").nullable();
    table.text("description_secondary").nullable();
    table.string("address", 255).notNullable();

    // Location data
    table.decimal("latitude", 10, 8).nullable();
    table.decimal("longitude", 11, 8).nullable();
    addForeignKey(table, "location_id", "locations", "id", "SET NULL");

    // NEW: Project type for categorization
    table.enum("project_type", [
      "residential",
      "commercial",
      "mixed_use",
      "luxury",
      "affordable"
    ]).defaultTo("residential").index();

    // Project details
    table
      .enum("status", [
        "planning",
        "under_construction",
        "completed",
        "sold_out",
      ])
      .defaultTo("planning")
      .index();
    
    table.integer("completion_percentage").unsigned().defaultTo(0);
    
    // NEW: Actual completion date (more useful than percentage alone)
    table.date("estimated_completion_date").nullable();
    table.date("actual_completion_date").nullable();
    
    table.integer("total_blocks").unsigned().nullable();
    table.integer("total_units").unsigned().nullable(); // NEW: Total apartments/units

    // NEW: Price range for filtering (denormalized from apartments)
    table.decimal("price_min", 15, 2).nullable();
    table.decimal("price_max", 15, 2).nullable();

    // Media and marketing
    table.string("main_photo_url", 500).nullable();
    
    // REMOVED: contact_form_script (use separate forms table)
    // REMOVED: map_embed_code (use separate media table)
    
    table.boolean("is_featured").defaultTo(false).index();
    table.boolean("is_published").defaultTo(false).index();

    // SEO
    table.string("meta_title", 255).nullable();
    table.text("meta_description").nullable();

    addAuditFields(table);

    // Composite indexes for common queries
    table.index(["status", "is_published", "is_featured"], "idx_status_pub_feat");
    table.index(["location_id", "status"], "idx_location_status");
    table.index(["project_type", "status"], "idx_type_status");
    
    // Geospatial index (if using spatial features in future)
    table.index(["latitude", "longitude"], "idx_coordinates");
  });

  // CHECK constraints
  await addCheckConstraint(
    knex,
    "projects",
    "projects_completion_percentage_check",
    "completion_percentage >= 0 AND completion_percentage <= 100"
  );

  await addCheckConstraint(
    knex,
    "projects",
    "projects_latitude_check",
    "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)"
  );

  await addCheckConstraint(
    knex,
    "projects",
    "projects_longitude_check",
    "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)"
  );
  
  await addCheckConstraint(
    knex,
    "projects",
    "projects_price_range_check",
    "price_min IS NULL OR price_max IS NULL OR price_min <= price_max"
  );

  // Trigger to update price_range when apartments change (optional, can be done in app)
  // This is a placeholder - implement in application logic or as MySQL trigger
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("projects");
}