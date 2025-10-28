import type { Knex } from "knex";
import { addCheckConstraint, configureTableDefaults } from "../knex-extensions";

/**
 * Migration: Analytics and Tracking System
 * 
 * IMPORTANT: No user authentication exists on this website
 * - visitor_id: UUID stored in first-party cookie (persistent across sessions)
 * - session_id: UUID per browsing session
 * - lead_id: Links to leads table when visitor submits a form
 * 
 * Tables:
 * 1. user_sessions: Browsing sessions with attribution
 * 2. user_events: All user interactions (clicks, scrolls, etc.)
 * 3. form_submissions: Form submissions with session context
 * 4. property_interactions: Property-specific actions
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
    table.string("source", 100).nullable().index();
    table.string("medium", 100).nullable();
    table.string("campaign", 150).nullable();
    table.string("referer", 500).nullable();
    
    // =================================================================
    // DEVICE INFORMATION
    // =================================================================
    table.withStatusEnum(
      ["desktop", "mobile", "tablet", "unknown"],
      { columnName: "device" }
    );
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

    configureTableDefaults(table);
  });

  await addCheckConstraint(
    knex,
    "user_sessions",
    "chk_sessions_pages_viewed",
    "pages_viewed >= 0"
  );
  
  await addCheckConstraint(
    knex,
    "user_sessions",
    "chk_sessions_duration",
    "duration_seconds >= 0"
  );

  // ====================================================================
  // USER EVENTS
  // ====================================================================
  await knex.schema.createTable("user_events", (table) => {
    table.bigIncrements("id").primary();
    
    // =================================================================
    // SESSION & VISITOR IDENTIFICATION
    // =================================================================
    table.integer("session_id").unsigned().nullable()
      .references("id").inTable("user_sessions").onDelete("SET NULL");
    
    table.string("visitor_id", 36).notNullable().index();
    table.withForeignKey("lead_id", "leads", "id", "SET NULL");
    
    // =================================================================
    // EVENT CLASSIFICATION
    // =================================================================
    table.string("event_type", 100).notNullable().index();
    
    // =================================================================
    // PAGE CONTEXT
    // =================================================================
    table.string("page_url", 500).notNullable();
    table.string("page_path", 500).nullable().index();
    table.string("page_title", 255).nullable();
    
    // =================================================================
    // ELEMENT INTERACTION
    // =================================================================
    table.string("element", 255).nullable();
    
    // =================================================================
    // EVENT PAYLOAD
    // =================================================================
    table.withJsonMetadata("value");
    
    // =================================================================
    // TIMING
    // =================================================================
    table.timestamp("event_ts").notNullable().index();
    
    // =================================================================
    // TECHNICAL DETAILS
    // =================================================================
    table.string("user_agent", 500).nullable();
    table.string("ip", 45).nullable();
    
    table.withTimestamps();

    // =================================================================
    // COMPOSITE INDEXES FOR ANALYTICS QUERIES
    // =================================================================
    table.index(["event_type", "event_ts"], "idx_type_time");
    table.index(["page_path", "event_type", "event_ts"], "idx_path_type_time");
    table.index(["session_id", "event_ts"], "idx_session_time");
    table.index(["visitor_id", "event_ts"], "idx_visitor_time");

    configureTableDefaults(table);
  });

  // ====================================================================
  // FORM SUBMISSIONS
  // ====================================================================
  await knex.schema.createTable("form_submissions", (table) => {
    table.increments("id").primary();
    
    // =================================================================
    // CONTEXT & RELATIONSHIPS
    // =================================================================
    table.withForeignKey("lead_id", "leads", "id", "SET NULL");
    table.integer("session_id").unsigned().nullable()
      .references("id").inTable("user_sessions").onDelete("SET NULL");
    
    // =================================================================
    // FORM IDENTIFICATION
    // =================================================================
    table.string("form_type", 100).notNullable().index();
    
    table.withForeignKey("project_id", "projects", "id", "SET NULL");
    
    // =================================================================
    // FORM DATA
    // =================================================================
    table.withJsonMetadata("form_data");
    
    // =================================================================
    // SUBMISSION DETAILS
    // =================================================================
    table.timestamp("submitted_at").notNullable().index();
    table.string("ip", 45).nullable();
    
    // =================================================================
    // LEAD MANAGEMENT
    // =================================================================
    table.withStatusEnum(
      ["new", "contacted", "qualified", "disqualified", "converted", "spam"],
      { columnName: "status" }
    );
    
    table.text("internal_notes").nullable();
    table.string("assigned_to", 100).nullable().index();
    
    table.withTimestamps();

    // =================================================================
    // COMPOSITE INDEXES
    // =================================================================
    table.index(["form_type", "submitted_at"], "idx_type_time");
    table.index(["project_id", "form_type", "submitted_at"], "idx_proj_type_time");
    table.index(["status", "assigned_to"], "idx_status_assigned");

    configureTableDefaults(table);
  });

  // ====================================================================
  // PROPERTY INTERACTIONS
  // ====================================================================
  await knex.schema.createTable("property_interactions", (table) => {
    table.increments("id").primary();
    
    // =================================================================
    // VISITOR IDENTIFICATION
    // =================================================================
    table.string("visitor_id", 36).notNullable().index();
    table.withForeignKey("lead_id", "leads", "id", "SET NULL");
    table.integer("session_id").unsigned().nullable()
      .references("id").inTable("user_sessions").onDelete("SET NULL");
    
    // =================================================================
    // PROPERTY REFERENCE
    // =================================================================
    table.withForeignKey("property_id", "projects", "id", "SET NULL");
    
    // =================================================================
    // ACTION TYPE
    // =================================================================
    table.string("action", 100).notNullable().index();
    
    // =================================================================
    // ACTION PAYLOAD
    // =================================================================
    table.withJsonMetadata("value");
    
    // =================================================================
    // INTERACTION DETAILS
    // =================================================================
    table.timestamp("interaction_ts").notNullable().index();
    table.string("page_url", 500).nullable();
    table.string("referrer_url", 500).nullable();
    
    table.withTimestamps();

    // =================================================================
    // COMPOSITE INDEXES FOR ANALYTICS
    // =================================================================
    table.index(["property_id", "action", "interaction_ts"], "idx_prop_action_time");
    table.index(["visitor_id", "property_id"], "idx_visitor_prop");
    table.index(["session_id", "interaction_ts"], "idx_session_time");

    configureTableDefaults(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("property_interactions");
  await knex.schema.dropTableIfExists("form_submissions");
  await knex.schema.dropTableIfExists("user_events");
  await knex.schema.dropTableIfExists("user_sessions");
}