import type { Knex } from "knex";

/**
 * Migration: Polymorphic floor plans table
 * Handles floor plans for: projects, apartments
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("floor_plans", (table) => {
    table.increments("id").primary();
    
    // Polymorphic relationship fields
    table.string("plannable_type", 50).notNullable(); 
    // Values: 'project', 'apartment'
    table.integer("plannable_id").unsigned().notNullable();
    
    // Floor plan data
    table.string("name", 255).notNullable();
    table.string("image_url", 500).notNullable();
    table.string("pdf_url", 500).nullable();
    table.integer("display_order").defaultTo(0);
    
    table.timestamps(true, true);
    
    // Soft delete support
    table.timestamp("deleted_at").nullable();

    // Indexes for efficient polymorphic queries
    table.index(["plannable_type", "plannable_id"]);
    table.index(["plannable_type", "plannable_id", "display_order"]);
    table.index("deleted_at");
    
    // Prevent duplicate floor plan names per entity
    table.unique(["plannable_type", "plannable_id", "name"]);
  });

  // Add CHECK constraint for valid plannable_type values
  await knex.raw(`
    ALTER TABLE floor_plans 
    ADD CONSTRAINT floor_plans_plannable_type_check 
    CHECK (plannable_type IN ('project', 'apartment'))
  `);

  // Add CHECK constraint for display_order (non-negative)
  await knex.raw(`
    ALTER TABLE floor_plans 
    ADD CONSTRAINT floor_plans_display_order_check 
    CHECK (display_order >= 0)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("floor_plans");
}