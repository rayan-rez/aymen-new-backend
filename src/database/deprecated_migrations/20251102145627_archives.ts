import type { Knex } from "knex";
import { configureTableEngine } from "../knex-extensions";

/**
 * Migration: Analytics Archive Tables
 * 
 * Creates archive tables for cold storage of old analytics data.
 * Archive tables have minimal indexes and are optimized for compression.
 * 
 * ARCHIVAL STRATEGY:
 * - Data older than 6 months → Moved to archive tables
 * - Archive tables: Compressed, fewer indexes
 * - Original tables: Hot data only, better performance
 * - Archive retention: 2 years, then purged
 * 
 * BENEFITS:
 * - Smaller active tables = faster queries
 * - Lower backup time and size
 * - Cost-effective long-term storage
 * - Compliance with data retention policies
 */

export async function up(knex: Knex): Promise<void> {
  console.log("🗄️ Creating archive tables...");

  // =================================================================
  // PAGE_VIEWS_ARCHIVE
  // =================================================================
  await knex.schema.createTable("page_views_archive", (table) => {
    table.bigIncrements("id").primary();
    table.integer("session_id").unsigned().nullable();
    table.string("visitor_id", 36).notNullable();
    table.integer("lead_mirror_id").unsigned().nullable();
    table.string("page_url", 500).notNullable();
    table.string("page_path", 255).notNullable();
    table.string("page_title", 255).nullable();
    table.string("page_type", 100).nullable();
    table.string("referrer_url", 500).nullable();
    table.string("referrer_domain", 255).nullable();
    table.integer("time_on_page_seconds").unsigned().nullable();
    table.integer("scroll_depth_percent").unsigned().nullable();
    table.boolean("bounced").defaultTo(false);
    table.string("previous_page_path", 255).nullable();
    table.string("next_page_path", 255).nullable();
    table.timestamp("viewed_at").notNullable();
    table.string("device", 50).nullable();
    table.string("browser", 100).nullable();
    table.string("location_city", 100).nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("archived_at").defaultTo(knex.fn.now());

    // Minimal indexes for archive queries
    table.index("viewed_at", "idx_arch_viewed_at");
    table.index("visitor_id", "idx_arch_visitor_id");
    table.index(["page_path", "viewed_at"], "idx_arch_path_time");

    configureTableEngine(table);
  });

  // Enable compression for archive table
  await knex.raw(`ALTER TABLE page_views_archive ROW_FORMAT=COMPRESSED`);

  // =================================================================
  // USER_EVENTS_ARCHIVE
  // =================================================================
  await knex.schema.createTable("user_events_archive", (table) => {
    table.bigIncrements("id").primary();
    table.integer("session_id").unsigned().nullable();
    table.string("visitor_id", 36).notNullable();
    table.integer("lead_mirror_id").unsigned().nullable();
    table.enum("event_type", [
      "page_view", "button_click", "form_start", "form_submit",
      "property_view", "property_favorite", "search", "filter",
      "video_play", "download", "call_click", "whatsapp_click",
      "email_click", "share", "scroll_depth"
    ]).notNullable();
    table.enum("event_category", ["navigation", "engagement", "conversion"]).nullable();
    table.string("page_url", 500).nullable();
    table.string("page_path", 255).nullable();
    table.string("page_title", 255).nullable();
    table.string("element_selector", 255).nullable();
    table.string("element_text", 255).nullable();
    table.json("value").nullable();
    table.timestamp("event_ts").notNullable();
    table.string("user_agent", 500).nullable();
    table.string("ip_address", 45).nullable();
    table.string("device", 50).nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("archived_at").defaultTo(knex.fn.now());

    // Minimal indexes
    table.index("event_ts", "idx_arch_event_ts");
    table.index("visitor_id", "idx_arch_visitor_id");
    table.index(["event_type", "event_ts"], "idx_arch_type_time");

    configureTableEngine(table);
  });

  await knex.raw(`ALTER TABLE user_events_archive ROW_FORMAT=COMPRESSED`);

  // =================================================================
  // PROPERTY_INTERACTIONS_ARCHIVE
  // =================================================================
  await knex.schema.createTable("property_interactions_archive", (table) => {
    table.bigIncrements("id").primary();
    table.string("visitor_id", 36).notNullable();
    table.integer("lead_mirror_id").unsigned().nullable();
    table.integer("session_id").unsigned().nullable();
    table.integer("property_id").unsigned().notNullable();
    table.string("action", 100).notNullable();
    table.string("action_category", 50).nullable();
    table.json("value").nullable();
    table.integer("apartment_id").unsigned().nullable();
    table.timestamp("interaction_ts").notNullable();
    table.string("page_url", 500).nullable();
    table.string("referrer_url", 500).nullable();
    table.string("device", 50).nullable();
    table.string("ip_address", 45).nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("archived_at").defaultTo(knex.fn.now());

    // Minimal indexes
    table.index("interaction_ts", "idx_arch_interaction_ts");
    table.index("property_id", "idx_arch_property_id");
    table.index(["property_id", "interaction_ts"], "idx_arch_property_time");

    configureTableEngine(table);
  });

  await knex.raw(`ALTER TABLE property_interactions_archive ROW_FORMAT=COMPRESSED`);

  // =================================================================
  // EVENT_ANALYTICS_ARCHIVE
  // =================================================================
  await knex.schema.createTable("event_analytics_archive", (table) => {
    table.bigIncrements("id").primary();
    table.integer("related_event_id").unsigned().nullable();
    table.string("event_type", 100).notNullable();
    table.string("visitor_id", 36).notNullable();
    table.string("session_id", 36).nullable();
    table.string("page_path", 255).nullable();
    table.timestamp("event_ts").notNullable();
    table.enum("sync_status", ["pending", "sent", "failed"]).notNullable().defaultTo("pending");
    table.timestamp("synced_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("archived_at").defaultTo(knex.fn.now());

    // Minimal indexes
    table.index("event_ts", "idx_arch_event_ts");
    table.index("visitor_id", "idx_arch_visitor_id");

    configureTableEngine(table);
  });

  await knex.raw(`ALTER TABLE event_analytics_archive ROW_FORMAT=COMPRESSED`);

  // =================================================================
  // ARCHIVE METADATA TABLE
  // =================================================================
  await knex.schema.createTable("archive_metadata", (table) => {
    table.increments("id").primary();
    table.string("table_name", 100).notNullable();
    table.date("archive_date").notNullable();
    table.bigInteger("records_archived").unsigned().notNullable();
    table.timestamp("started_at").notNullable();
    table.timestamp("completed_at").notNullable();
    table.integer("duration_seconds").unsigned().notNullable();
    table.enum("status", ["success", "failed", "partial"]).notNullable();
    table.text("error_message").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["table_name", "archive_date"], "idx_table_date");
    table.index("status", "idx_status");

    configureTableEngine(table);
  });

  console.log("✅ Archive tables created successfully!");
}

export async function down(knex: Knex): Promise<void> {
  console.log("⏪ Dropping archive tables...");

  await knex.schema.dropTableIfExists("archive_metadata");
  await knex.schema.dropTableIfExists("event_analytics_archive");
  await knex.schema.dropTableIfExists("property_interactions_archive");
  await knex.schema.dropTableIfExists("user_events_archive");
  await knex.schema.dropTableIfExists("page_views_archive");

  console.log("✅ Archive tables dropped!");
}