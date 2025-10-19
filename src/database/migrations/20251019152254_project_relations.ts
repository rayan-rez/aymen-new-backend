import type { Knex } from "knex";

/**
 * Migration: Project relationship tables (many-to-many)
 */
export async function up(knex: Knex): Promise<void> {
  // Project features junction table
  await knex.schema.createTable('project_features', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.integer('feature_id').unsigned().notNullable()
      .references('id').inTable('features').onDelete('CASCADE');
    table.timestamps(true, true);
    
    table.unique(['project_id', 'feature_id']);
    table.index('project_id');
    table.index('feature_id');
  });

  // Project additional locations junction table
  await knex.schema.createTable('project_locations', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.integer('location_id').unsigned().notNullable()
      .references('id').inTable('locations').onDelete('CASCADE');
    table.timestamps(true, true);
    
    table.unique(['project_id', 'location_id']);
    table.index('project_id');
    table.index('location_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_locations');
  await knex.schema.dropTableIfExists('project_features');
}