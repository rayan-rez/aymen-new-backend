import type { Knex } from "knex";
import { addCheckConstraint, configureTableEngine } from "../knex-extensions";

/**
 * Migration: Events Management System
 * 
 * Manages company events, exhibitions, open houses, and other promotional activities
 * 
 * KEY FEATURES:
 * - Event scheduling with start/end dates
 * - Location tracking (physical venue or online)
 * - Capacity management and registration tracking
 * - Multi-language support for event details
 * - Event categorization and status tracking
 * - SEO optimization for event pages
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("events", (table) => {
    // =================================================================
    // PRIMARY KEY & IDENTIFIERS
    // =================================================================
    table.increments("id").primary();
    table.string("name", 255).notNullable();
    table.string("slug", 255).notNullable().unique();

    // =================================================================
    // EVENT CLASSIFICATION
    // =================================================================
    table.withStatusEnum(
      [
        "exhibition",
        "open_house",
        "workshop",
        "seminar",
        "launch_event",
        "trade_show",
        "webinar",
        "other"
      ],
      { columnName: "event_type" }
    );

    // =================================================================
    // CONTENT & DESCRIPTION
    // =================================================================
    table.text("description").notNullable();
    table.text("short_description").nullable();
    
    // Multi-language support
    table.withJsonMetadata("translations");

    // =================================================================
    // SCHEDULING
    // =================================================================
    table.timestamp("start_date").notNullable().index();
    table.timestamp("end_date").notNullable();
    table.string("timezone", 50).defaultTo("Africa/Algiers");

    // =================================================================
    // LOCATION
    // =================================================================
    table.withStatusEnum(
      ["physical", "online", "hybrid"],
      { columnName: "location_type", defaultStatus: "physical" }
    );
    
    table.string("venue_name", 255).nullable();
    table.string("venue_address", 500).nullable();
    table.withCoordinates({ required: false });
    table.withForeignKey("location_id", "locations", "id", "SET NULL");
    
    // For online/hybrid events
    table.string("online_meeting_url", 500).nullable();
    table.string("online_meeting_platform", 100).nullable();

    // =================================================================
    // CAPACITY & REGISTRATION
    // =================================================================
    table.integer("max_capacity").unsigned().nullable();
    table.integer("registered_count").unsigned().defaultTo(0);
    table.boolean("requires_registration").defaultTo(true);
    table.boolean("is_registration_open").defaultTo(true);
    table.timestamp("registration_deadline").nullable();

    // =================================================================
    // PROJECT ASSOCIATION
    // =================================================================
    table.withForeignKey("project_id", "projects", "id", "SET NULL");

    // =================================================================
    // EVENT STATUS
    // =================================================================
    table.withStatusEnum(
      ["draft", "scheduled", "ongoing", "completed", "cancelled", "postponed"],
      { columnName: "status", defaultStatus: "draft" }
    );

    // =================================================================
    // MEDIA & ASSETS
    // =================================================================
    table.string("featured_image_url", 500).nullable();
    table.string("banner_image_url", 500).nullable();

    // =================================================================
    // ORGANIZER INFORMATION
    // =================================================================
    table.string("organizer_name", 255).nullable();
    table.withEmailColumn({ required: false, unique: false, maxLength: 255 });
    table.string("organizer_phone", 30).nullable();

    // =================================================================
    // PUBLISHING & VISIBILITY
    // =================================================================
    table.boolean("is_featured").defaultTo(false).index();
    table.boolean("is_published").defaultTo(false).index();
    table.timestamp("published_at").nullable();

    // =================================================================
    // SEO OPTIMIZATION
    // =================================================================
    table.string("meta_title", 255).nullable();
    table.text("meta_description").nullable();

    // =================================================================
    // ANALYTICS
    // =================================================================
    table.integer("view_count").unsigned().defaultTo(0);
    table.integer("click_count").unsigned().defaultTo(0);

    // =================================================================
    // AUDIT TRAIL
    // =================================================================
    table.withAuditTrail();

    // =================================================================
    // COMPOSITE INDEXES FOR QUERY OPTIMIZATION
    // =================================================================
    
    // Upcoming events query
    table.index(
      ["status", "start_date", "is_published"],
      "idx_status_date_pub"
    );

    // Featured events
    table.index(
      ["is_featured", "is_published", "start_date"],
      "idx_feat_pub_date"
    );

    // Event type filtering
    table.index(
      ["event_type", "status", "start_date"],
      "idx_type_status_date"
    );

    // Location-based events
    table.index(["location_id", "start_date"], "idx_location_date");

    // Project-specific events
    table.index(["project_id", "start_date"], "idx_project_date");

    // Registration tracking
    table.index(
      ["requires_registration", "is_registration_open"],
      "idx_registration"
    );

    // =================================================================
    // TABLE CONFIGURATION
    // =================================================================
    configureTableEngine(table);
  });

  // =================================================================
  // CHECK CONSTRAINTS (DATA VALIDATION)
  // =================================================================

  // Ensure end_date is after start_date
  await addCheckConstraint(
    knex,
    "events",
    "chk_events_date_range",
    "end_date > start_date"
  );

  // Ensure max_capacity is positive
  await addCheckConstraint(
    knex,
    "events",
    "chk_events_capacity",
    "max_capacity IS NULL OR max_capacity > 0"
  );

  // Ensure registered_count doesn't exceed capacity
  await addCheckConstraint(
    knex,
    "events",
    "chk_events_registration_count",
    "registered_count >= 0 AND (max_capacity IS NULL OR registered_count <= max_capacity)"
  );

  // Validate latitude range
  await addCheckConstraint(
    knex,
    "events",
    "chk_events_latitude",
    "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)"
  );

  // Validate longitude range
  await addCheckConstraint(
    knex,
    "events",
    "chk_events_longitude",
    "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)"
  );

  // Ensure view_count is non-negative
  await addCheckConstraint(
    knex,
    "events",
    "chk_events_view_count",
    "view_count >= 0"
  );

  // Ensure click_count is non-negative
  await addCheckConstraint(
    knex,
    "events",
    "chk_events_click_count",
    "click_count >= 0"
  );

  // ====================================================================
  // EVENT REGISTRATIONS (JUNCTION TABLE)
  // ====================================================================
  await knex.schema.createTable("event_registrations", (table) => {
    table.increments("id").primary();

    // =================================================================
    // RELATIONSHIPS
    // =================================================================
    table.withForeignKey("event_id", "events", "id", "CASCADE");
    table.withForeignKey("lead_id", "leads", "id", "SET NULL");

    // =================================================================
    // REGISTRANT INFORMATION
    // =================================================================
    table.string("full_name", 255).notNullable();
    table.withEmailColumn({ required: true, unique: false });
    table.string("phone", 30).nullable();
    table.string("company", 255).nullable();
    table.string("job_title", 255).nullable();

    // =================================================================
    // REGISTRATION DETAILS
    // =================================================================
    table.integer("number_of_guests").unsigned().defaultTo(1);
    table.text("special_requirements").nullable();
    table.text("notes").nullable();

    // =================================================================
    // STATUS TRACKING
    // =================================================================
    table.withStatusEnum(
      ["confirmed", "pending", "cancelled", "attended", "no_show"],
      { columnName: "status", defaultStatus: "confirmed" }
    );

    table.timestamp("registered_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("cancelled_at").nullable();
    table.timestamp("checked_in_at").nullable();

    // =================================================================
    // MARKETING ATTRIBUTION
    // =================================================================
    table.withUtmTracking();

    // =================================================================
    // COMMUNICATION
    // =================================================================
    table.boolean("confirmation_sent").defaultTo(false);
    table.boolean("reminder_sent").defaultTo(false);
    table.boolean("feedback_requested").defaultTo(false);

    table.withTimestamps();

    // =================================================================
    // INDEXES
    // =================================================================
    table.index(["event_id", "status"], "idx_event_status");
    table.index(["lead_id", "event_id"], "idx_lead_event");
    table.index(["email", "event_id"], "idx_email_event");
    table.index("registered_at", "idx_registered_at");

    configureTableEngine(table);
  });

  await addCheckConstraint(
    knex,
    "event_registrations",
    "chk_reg_guests",
    "number_of_guests > 0"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("event_registrations");
  await knex.schema.dropTableIfExists("events");
}