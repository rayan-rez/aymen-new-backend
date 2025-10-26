import type { Knex } from "knex";

/**
 * Migration: Polymorphic photos table (FIXED for MySQL)
 * Handles photos for: projects, apartments, commercial properties, blog posts
 * 
 * FIX: MySQL doesn't support filtered indexes with WHERE clause
 * Solution: Use application-level logic in the model instead of database constraint
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("photos", (table) => {
    table.increments("id").primary();
    
    // Polymorphic relationship fields
    table.string("photoable_type", 50).notNullable(); 
    table.integer("photoable_id").unsigned().notNullable();
    
    // Photo data
    table.string("url", 500).notNullable();
    table.string("external_url", 500).nullable();
    table.string("caption", 255).nullable();
    table.integer("display_order").defaultTo(0);
    table.boolean("is_cover").defaultTo(false);
    
    table.timestamps(true, true);

    // Indexes for efficient polymorphic queries
    table.index(["photoable_type", "photoable_id"]);
    table.index(["photoable_type", "photoable_id", "display_order"]);
    table.index(["photoable_type", "photoable_id", "is_cover"]);

    table.timestamp("deleted_at").nullable();
  });

  // Add CHECK constraint for valid photoable_type values
  await knex.raw(`
    ALTER TABLE photos 
    ADD CONSTRAINT photos_photoable_type_check 
    CHECK (photoable_type IN ('project', 'apartment', 'commercial_property', 'blog_post'))
  `);

  // Add CHECK constraint for display_order (non-negative)
  await knex.raw(`
    ALTER TABLE photos 
    ADD CONSTRAINT photos_display_order_check 
    CHECK (display_order >= 0)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("photos");
}