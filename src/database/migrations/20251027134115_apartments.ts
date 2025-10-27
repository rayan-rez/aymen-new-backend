// 20251027133320_apartments.ts
import type { Knex } from "knex";
import { addAuditFields, addForeignKey, addCheckConstraint } from "../migration-helpers";

/**
 * REFACTORED: Apartments table
 * 
 * CHANGES:
 * 1. Added unit_number for better organization
 * 2. Added floor_number for filtering
 * 3. Added is_published flag
 * 4. Removed unique constraint on name (allow duplicates across projects)
 * 5. Improved indexing strategy
 * 
 * BENEFITS:
 * - Better unit identification
 * - Floor-based filtering support
 * - Publishing workflow support
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("apartments", (table) => {
    table.increments("id").primary();
    
    addForeignKey(table, "project_id", "projects", "id", "CASCADE");

    // Basic info
    table.string("name", 255).notNullable();
    table.string("unit_number", 50).nullable(); // NEW: e.g., "A-101"
    table.integer("floor_number").nullable(); // NEW: Floor level
    table.string("title", 255).nullable();
    table.string("subtitle", 255).nullable();
    table.text("description").nullable();

    // Specifications
    table.decimal("area_sqm", 10, 2).nullable();
    table.integer("bedrooms").unsigned().nullable();
    table.integer("bathrooms").unsigned().nullable();
    table.decimal("price", 15, 2).nullable();

    // Status
    table.enum("status", ["available", "reserved", "sold"])
      .defaultTo("available")
      .index();
    
    table.boolean("is_model_unit").defaultTo(false);
    table.boolean("is_published").defaultTo(false).index(); // NEW

    // Virtual tour
    table.string("virtual_tour_url", 500).nullable();

    addAuditFields(table);

    // Composite indexes
    table.index(["project_id", "status", "is_published"], "idx_proj_status_pub");
    table.index(["project_id", "floor_number"], "idx_proj_floor");
    table.index(["bedrooms", "status"], "idx_bed_status");
    table.index(["price", "status"], "idx_price_status");
  });

  // CHECK constraints
  await addCheckConstraint(knex, "apartments", "apartments_area_sqm_check", "area_sqm IS NULL OR area_sqm > 0");
  await addCheckConstraint(knex, "apartments", "apartments_bedrooms_check", "bedrooms IS NULL OR bedrooms >= 0");
  await addCheckConstraint(knex, "apartments", "apartments_bathrooms_check", "bathrooms IS NULL OR bathrooms >= 0");
  await addCheckConstraint(knex, "apartments", "apartments_price_check", "price IS NULL OR price > 0");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("apartments");
}