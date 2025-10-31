// src/database/migrations/20251027134400_user_events.ts
import type { Knex } from "knex";
import { configureTableEngine } from "../knex-extensions";

/**
 * USER EVENTS - Granular user behavior tracking
 *
 * Captures every significant user interaction on the website.
 * Used for behavior analysis, funnel tracking, and conversion optimization.
 *
 * EVENT TYPES:
 * - page_view: User views a page
 * - button_click: User clicks a CTA or button
 * - form_start: User starts filling a form
 * - form_submit: User submits a form
 * - property_view: User views a property detail page
 * - property_favorite: User favorites a property
 * - search: User performs a search
 * - filter: User applies filters
 * - video_play: User plays a video
 * - download: User downloads content (catalog, brochure)
 * - call_click: User clicks phone number
 * - whatsapp_click: User clicks WhatsApp button
 * - email_click: User clicks email address
 * - share: User shares content
 * - scroll_depth: User scrolls to specific depth
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("user_events", (table) => {
    table.bigIncrements("id").primary();

    // Session relationship (nullable for events without session context)
    table.withForeignKey("session_id", "user_sessions", "id", "SET NULL");
    table.index("session_id");

    // Visitor identification
    table.string("visitor_id", 36).notNullable().index();

    // Lead relationship (nullable until visitor converts)
    table.withForeignKey("lead_id", "leads", "id", "SET NULL");
    table.index("lead_id");

    // Event classification
    table
      .enu(
        "event_type",
        [
          "page_view",
          "button_click",
          "form_start",
          "form_submit",
          "property_view",
          "property_favorite",
          "search",
          "filter",
          "video_play",
          "download",
          "call_click",
          "whatsapp_click",
          "email_click",
          "share",
          "scroll_depth",
        ],
        {
          useNative: true,
          enumName: "event_type_enum",
        }
      )
      .notNullable()
      .index();
      
    table
      .enu("event_category", ["navigation", "engagement", "conversion"], {
        useNative: true,
        enumName: "event_category_enum",
      })
      .nullable()
      .index();

    // Page context
    table.string("page_url", 500).nullable();
    table.string("page_path", 255).nullable().index();
    table.string("page_title", 255).nullable();

    // Element that triggered event (CSS selector or ID)
    table.string("element_selector", 255).nullable();
    table.string("element_text", 255).nullable();

    // Event-specific data as JSON
    // Example for property_view: {"property_id":123,"property_name":"Villa Azure","price":25000000}
    // Example for search: {"query":"appartement sidi bel abbes","filters":{"bedrooms":3,"price_max":20000000}}
    // Example for form_start: {"form_type":"contact","form_id":"contact-hero"}
    table.json("value").nullable();

    // Timestamp
    table.timestamp("event_ts").notNullable().index();

    // Technical context
    table.string("user_agent", 500).nullable();
    table.string("ip_address", 45).nullable();
    table.string("device", 50).nullable();

    table.withTimestamps();

    // Composite indexes for common queries
    table.index(["event_type", "event_ts"], "idx_type_time");
    table.index(["page_path", "event_type"], "idx_page_type");
    table.index(["visitor_id", "event_ts"], "idx_visitor_time");
    table.index(["event_category", "event_ts"], "idx_category_time");

    configureTableEngine(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_events");
}
