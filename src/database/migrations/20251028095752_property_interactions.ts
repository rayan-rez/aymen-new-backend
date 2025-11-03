// src/database/migrations/20251027134500_property_interactions.ts
import type { Knex } from "knex";
import { configureTableEngine } from "../knex-extensions";

/**
 * PROPERTY INTERACTIONS - Property-specific engagement tracking
 * 
 * Tracks all user interactions with property listings (projects, apartments, commercial properties).
 * Essential for understanding property interest and optimizing listings.
 * 
 * INTERACTION TYPES:
 * - view: User views property detail page
 * - favorite: User adds property to favorites
 * - unfavorite: User removes from favorites
 * - share: User shares property
 * - call: User clicks phone number
 * - whatsapp: User clicks WhatsApp button
 * - email: User clicks email contact
 * - gallery_view: User opens photo gallery
 * - floorplan_view: User views floor plans
 * - virtual_tour: User starts virtual tour
 * - video_play: User plays property video
 * - compare: User adds to comparison
 * - download_brochure: User downloads property brochure
 * - inquiry: User submits inquiry form
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("property_interactions", (table) => {
    table.bigIncrements("id").primary();
    
    // Visitor identification
    table.string("visitor_id", 36).notNullable().index();
    
    // Lead relationship (nullable until conversion)
    table.withForeignKey("lead_mirror_id","lead_mirrors","id","SET NULL");
    
    // Session context
    table.withForeignKey("session_id","user_sessions","id","SET NULL");
    table.index("session_id");
    
    // Property reference (projects table)
    table.withForeignKey("property_id","projects","id","CASCADE");
    table.index("property_id");
    
    // Interaction details
    table.string("action", 100).notNullable().index();
    table.string("action_category", 50).nullable(); // view, engagement, conversion
    
    // Interaction-specific data as JSON
    // Example for gallery_view: {"image_index":3,"total_images":15,"time_spent":45}
    // Example for floorplan_view: {"floor_plan_name":"Ground Floor","zoom_level":2.5}
    // Example for share: {"platform":"facebook","url":"https://..."}
    table.json("value").nullable();
    
    // Apartment/unit context (if interaction is with specific unit)
    table.withForeignKey("apartment_id","apartments","id","SET NULL");
    table.index("apartment_id");
    
    // Timestamp
    table.timestamp("interaction_ts").notNullable().index();
    
    // Page context
    table.string("page_url", 500).nullable();
    table.string("referrer_url", 500).nullable();
    
    // Device context
    table.string("device", 50).nullable();
    table.string("ip_address", 45).nullable();
    
    table.withTimestamps();

    // Composite indexes for analytics
    table.index(["property_id", "action"], "idx_property_action");
    table.index(["property_id", "interaction_ts"], "idx_property_time");
    table.index(["action", "interaction_ts"], "idx_action_time");
    table.index(["visitor_id", "property_id"], "idx_visitor_property");
    table.index(["lead_mirror_id", "property_id"], "idx_lead_property");
    table.index(["action_category", "interaction_ts"], "idx_category_time");
    table.index(["property_id", "visitor_id", "action"], "idx_unique_visitor_actions");

    configureTableEngine(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("property_interactions");
}