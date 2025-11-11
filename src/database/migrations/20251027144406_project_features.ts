import type { Knex } from "knex";
import { configureTableEngine } from "../knex-extensions";

/**
 * Migration: Project Relations (Junction Tables)
 * 
 * Creates many-to-many relationship tables between projects and other entities.
 * 
 * TABLES CREATED:
 * 1. project_features: Projects ↔ Features (amenities, facilities)
 * 
 * Note: project_media has been removed as it's redundant with the polymorphic
 * photos and floor_plans tables.
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
}

/**
 * Rollback Migration
 * Drops the project_features table
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("project_features");
}