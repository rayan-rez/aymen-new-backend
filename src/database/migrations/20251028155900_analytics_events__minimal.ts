import type { Knex } from "knex";
import { configureTableEngine } from "../knex-extensions";

/**
 * Migration: Analytics Events (Minimal Local Storage)
 * 
 * This table stores MINIMAL analytics event references locally.
 * The full event data is sent to an external analytics service.
 * 
 * PURPOSE:
 * - Correlation with form submissions (visitor_id → form → lead)
 * - Quick lookup for "last activity" timestamps
 * - Emergency fallback if analytics service is down
 * 
 * ARCHITECTURE:
 * - Events are batched and sent to external analytics (Mixpanel, Amplitude, etc.)
 * - Only event IDs, timestamps, and correlation keys stored here
 * - No heavy JSON payloads (those go to analytics service)
 * 
 * NOTE: Consider partitioning this table by month for performance
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("analytics_events", (table) => {
    // =================================================================
    // PRIMARY KEY
    // =================================================================
    table.bigIncrements("id").primary();

    // =================================================================
    // EVENT IDENTIFICATION
    // =================================================================
    // UUID for correlation with external analytics service
    table.uuid("event_uuid").notNullable().unique();
    table.index("event_uuid", "idx_event_uuid");

    // Event type
    table.string("event_type", 100).notNullable().index();
    // Examples: page_view, button_click, property_view, form_start, etc.

    // =================================================================
    // VISITOR & SESSION CORRELATION
    // =================================================================
    table.string("visitor_id", 36).notNullable().index();
    table.string("session_id", 36).nullable().index();

    // =================================================================
    // CONTEXT
    // =================================================================
    table.string("page_path", 255).nullable().index();
    table.timestamp("event_ts").notNullable().index();

    // =================================================================
    // EXTERNAL SYNC STATUS
    // =================================================================
    table.withStatusEnum(
      ["pending", "sent", "failed"],
      { columnName: "sync_status", defaultStatus: "pending" }
    );

    table.timestamp("synced_at").nullable();

    // =================================================================
    // TIMESTAMPS
    // =================================================================
    table.withTimestamps();

    // =================================================================
    // COMPOSITE INDEXES
    // =================================================================
    table.index(["visitor_id", "event_ts"], "idx_visitor_time");
    table.index(["session_id", "event_ts"], "idx_session_time");
    table.index(["event_type", "event_ts"], "idx_type_time");
    table.index(["sync_status", "created_at"], "idx_sync_created");

    configureTableEngine(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("analytics_events");
}