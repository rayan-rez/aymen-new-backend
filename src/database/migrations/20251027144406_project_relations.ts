import type { Knex } from "knex";
import { configureTableEngine } from "../knex-extensions";

/**
 * Migration: Project Relations (Junction Tables)
 * 
 * Creates many-to-many relationship tables between projects and other entities.
 * These junction tables enable flexible associations without data duplication.
 * 
 * TABLES CREATED:
 * 1. project_features: Projects ↔ Features (amenities, facilities)
 * 2. project_media: Projects ↔ Media files (images, videos, documents)
 * 
 * ARCHITECTURE PATTERN:
 * - Simple junction tables with composite unique constraints
 * - Optional metadata fields for relationship-specific data
 * - Timestamps for audit trail
 * - CASCADE deletes maintain referential integrity
 */
export async function up(knex: Knex): Promise<void> {
  // =================================================================
  // PROJECT FEATURES (Many-to-Many)
  // =================================================================
  await knex.schema.createTable("project_features", (table) => {
    table.increments("id").primary();

    // Foreign keys
    table.withForeignKey("project_id", "projects", "id", "CASCADE");
    table.withForeignKey("feature_id", "features", "id", "CASCADE");

    // Optional: Feature-specific value or note
    // Example: "Swimming Pool" → "Olympic-sized (50m)"
    table.string("feature_value", 255).nullable();

    // Display order for feature listing
    table.integer("display_order").unsigned().defaultTo(0);

    table.withTimestamps();

    // Prevent duplicate feature assignments
    table.unique(["project_id", "feature_id"], "uniq_project_feature");

    // Index for queries: "Get all features for project X"
    table.index(
      ["project_id", "display_order"],
      "idx_project_order"
    );

    configureTableEngine(table);
  });

  // =================================================================
  // PROJECT MEDIA (Many-to-Many)
  // =================================================================
  await knex.schema.createTable("project_media", (table) => {
    table.increments("id").primary();

    // Foreign key to projects
    table.withForeignKey("project_id", "projects", "id", "CASCADE");

    // =================================================================
    // MEDIA DETAILS
    // =================================================================
    table.string("media_url", 500).notNullable();
    table.string("thumbnail_url", 500).nullable();
    
    table.withStatusEnum(
      ["image", "video", "virtual_visit", "floor_plan", "brochure", "document"],
      { columnName: "media_type" }
    );

    // =================================================================
    // METADATA
    // =================================================================
    table.string("title", 255).nullable();
    table.text("description").nullable();
    table.string("alt_text", 255).nullable(); // For accessibility

    // =================================================================
    // ORGANIZATION
    // =================================================================
    table.integer("display_order").unsigned().defaultTo(0);
    table.boolean("is_featured").defaultTo(false); // Main/hero image
    table.boolean("is_public").defaultTo(true); // Public vs. internal docs

    table.withTimestamps();

    // Indexes for common queries
    table.index(
      ["project_id", "media_type", "display_order"],
      "idx_project_type_order"
    );
    table.index(
      ["project_id", "is_featured"],
      "idx_project_featured"
    );

    configureTableEngine(table);
  });
}

/**
 * Rollback Migration
 * Drops all project relation tables in reverse dependency order
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("project_media");
  await knex.schema.dropTableIfExists("project_features");
}