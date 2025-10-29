// src/database/migrations/20251027134330_user_sessions.ts
import type { Knex } from "knex";
import { addCheckConstraint, configureTableEngine } from "../knex-extensions";

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
  // ====================================================================
  // USER SESSIONS
  // ====================================================================
  await knex.schema.createTable("user_sessions", (table) => {
    table.increments("id").primary();

    // =================================================================
    // VISITOR IDENTIFICATION
    // =================================================================
    table.string("visitor_id", 36).notNullable().index();
    table.string("session_id", 36).notNullable().unique();

    // Link to lead when identified
    table.withForeignKey("lead_id", "leads", "id", "SET NULL");

    // =================================================================
    // ATTRIBUTION (UTM PARAMETERS)
    // =================================================================
    table.withUtmTracking();

    // =================================================================
    // DEVICE INFORMATION
    // =================================================================
    table.withStatusEnum(["desktop", "mobile", "tablet", "unknown"], {
      columnName: "device",
    });
    table.string("browser", 100).nullable();
    table.string("os", 100).nullable();

    // =================================================================
    // LOCATION (FROM IP GEOLOCATION)
    // =================================================================
    table.string("location_city", 100).nullable();
    table.string("location_region", 100).nullable();
    table.string("location_country", 100).nullable();
    table.string("language", 10).nullable();

    // =================================================================
    // SESSION METRICS
    // =================================================================
    table.timestamp("start_time").notNullable().index();
    table.timestamp("end_time").nullable();
    table.integer("pages_viewed").unsigned().defaultTo(0);
    table.integer("duration_seconds").unsigned().defaultTo(0);

    // =================================================================
    // METADATA
    // =================================================================
    table.withJsonMetadata("meta");

    table.withTimestamps();

    // =================================================================
    // COMPOSITE INDEXES FOR ANALYTICS QUERIES
    // =================================================================
    table.index(["visitor_id", "start_time"], "idx_visitor_time");
    table.index(["source", "medium", "campaign"], "idx_attribution");
    table.index(["start_time", "location_region"], "idx_time_region");

    configureTableEngine(table);
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
