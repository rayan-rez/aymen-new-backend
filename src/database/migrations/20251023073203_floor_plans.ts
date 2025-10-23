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

    // Indexes for efficient polymorphic queries
    table.index(["plannable_type", "plannable_id"]);
    table.index(["plannable_type", "plannable_id", "display_order"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("floor_plans");
}