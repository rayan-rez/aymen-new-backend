import type { Knex } from "knex";

/**
 * Migration: Polymorphic photos table
 * Handles photos for: projects, apartments, commercial properties, blog posts
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("photos", (table) => {
    table.increments("id").primary();
    
    // Polymorphic relationship fields
    table.string("photoable_type", 50).notNullable(); 
    // Values: 'project', 'apartment', 'commercial_property', 'blog_post'
    table.integer("photoable_id").unsigned().notNullable();
    
    // Photo data
    table.string("url", 500).notNullable();
    table.string("external_url", 500).nullable(); // For CDN or external hosting
    table.string("caption", 255).nullable();
    table.integer("display_order").defaultTo(0);
    table.boolean("is_cover").defaultTo(false); // Main/cover photo flag
    
    table.timestamps(true, true);

    // Indexes for efficient polymorphic queries
    table.index(["photoable_type", "photoable_id"]);
    table.index(["photoable_type", "photoable_id", "display_order"]);
    table.index(["photoable_type", "photoable_id", "is_cover"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("photos");
}