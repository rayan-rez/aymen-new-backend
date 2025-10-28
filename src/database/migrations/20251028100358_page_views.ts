// src/database/migrations/20251027134530_page_views.ts
import type { Knex } from "knex";
import { configureTableDefaults } from "../knex-extensions";

/**
 * PAGE VIEWS - Detailed page-level analytics
 * 
 * Separate from user_events for performance and specific page analytics.
 * Captures every page view with full context for heat mapping and funnel analysis.
 * 
 * NOTE: This table can grow very large. Consider:
 * - Partitioning by date (monthly or quarterly)
 * - Archiving old data after aggregation
 * - Sampling for high-traffic sites
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("page_views", (table) => {
    table.bigIncrements("id").primary();
    
    // Session context
    table
      .integer("session_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("user_sessions")
      .onDelete("SET NULL");
    table.index("session_id");
    
    // Visitor identification
    table.string("visitor_id", 36).notNullable().index();
    
    // Lead relationship
    table
      .integer("lead_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("leads")
      .onDelete("SET NULL");
    table.index("lead_id");
    
    // Page details
    table.string("page_url", 500).notNullable();
    table.string("page_path", 255).notNullable().index();
    table.string("page_title", 255).nullable();
    table.string("page_type", 100).nullable(); // home, project_detail, blog_post, etc.
    
    // Referrer information
    table.string("referrer_url", 500).nullable();
    table.string("referrer_domain", 255).nullable();
    
    // Engagement metrics
    table.integer("time_on_page_seconds").unsigned().nullable();
    table.integer("scroll_depth_percent").unsigned().nullable();
    table.boolean("bounced").defaultTo(false);
    
    // Previous and next pages in session
    table.string("previous_page_path", 255).nullable();
    table.string("next_page_path", 255).nullable();
    
    // Timestamp
    table.timestamp("viewed_at").notNullable().index();
    
    // Device and location
    table.string("device", 50).nullable();
    table.string("browser", 100).nullable();
    table.string("location_city", 100).nullable();
    
    table.withTimestamps();

    // Composite indexes
    table.index(["page_path", "viewed_at"], "idx_path_time");
    table.index(["page_type", "viewed_at"], "idx_type_time");
    table.index(["visitor_id", "viewed_at"], "idx_visitor_time");
    table.index(["referrer_domain", "viewed_at"], "idx_referrer_time");

    configureTableDefaults(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("page_views");
}