// src/database/migrations/20251027134330_user_sessions.ts
import type { Knex } from "knex";
import { addCheckConstraint } from "../knex-extensions";

/**
 * USER SESSIONS - Core analytics table
 * 
 * Tracks visitor sessions across the website with full attribution data.
 * Links anonymous visitors to identified leads when they convert.
 * 
 * KEY FEATURES:
 * - Unique session tracking with session_id
 * - Device and location fingerprinting
 * - Full UTM and referrer tracking
 * - Session duration and engagement metrics
 * - Links to leads table when visitor converts
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("user_sessions", (table) => {
    table.increments("id").primary();
    
    // Visitor identification
    table.string("visitor_id", 36).notNullable().index();
    // Example: "vis_a1b2c3d4e5f6"
    
    table.string("session_id", 36).notNullable().unique();
    // Example: "ses_x1y2z3a4b5c6"
    
    // Link to identified lead (nullable until conversion)
    table
      .integer("lead_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("leads")
      .onDelete("SET NULL");
    table.index("lead_id");

    table.withUtmTracking();
    table.withReferrerTracking();
    
    table.string("source", 100).nullable(); // Derived source category
    table.string("medium", 100).nullable(); // Derived medium category
    table.string("campaign", 150).nullable(); // Campaign name
    
    // Device and browser info
    table.string("device", 50).nullable(); // desktop, mobile, tablet
    table.string("browser", 100).nullable(); // Chrome, Safari, Firefox, etc.
    table.string("os", 100).nullable(); // Windows, macOS, iOS, Android
    table.string("user_agent", 500).nullable();
    
    // Geolocation (derived from IP)
    table.string("ip_address", 45).nullable();
    table.string("location_country", 100).nullable();
    table.string("location_city", 100).nullable();
    table.string("location_region", 100).nullable();
    table.string("language", 10).nullable(); // fr, ar, en
    
    // Session metrics
    table.timestamp("start_time").notNullable().index();
    table.timestamp("end_time").nullable();
    table.integer("pages_viewed").unsigned().defaultTo(0);
    table.integer("duration_seconds").unsigned().defaultTo(0);
    
    // Landing and exit pages
    table.string("landing_page", 500).nullable();
    table.string("exit_page", 500).nullable();
    
    // Additional metadata as JSON
    // Example: {"screen_resolution":"1920x1080","viewport":"1200x800","timezone":"Africa/Algiers"}
    table.withJsonMetadata();
    
    table.withTimestamps();

    // Composite indexes for common analytics queries
    table.index(["visitor_id", "start_time"], "idx_visitor_time");
    table.index(["start_time", "end_time"], "idx_time_range");
    table.index(["source", "medium", "campaign"], "idx_attribution");
    table.index(["device", "start_time"], "idx_device_time");
    table.index(["location_city", "start_time"], "idx_location_time");
  });

  // CHECK constraints
  await addCheckConstraint(
    knex,
    "user_sessions",
    "user_sessions_pages_check",
    "pages_viewed >= 0"
  );
  
  await addCheckConstraint(
    knex,
    "user_sessions",
    "user_sessions_duration_check",
    "duration_seconds >= 0"
  );
  
  await addCheckConstraint(
    knex,
    "user_sessions",
    "user_sessions_time_check",
    "end_time IS NULL OR end_time >= start_time"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_sessions");
}