// refactored events
import type { Knex } from "knex";
import { addAuditFields, addForeignKey, addCheckConstraint, addUtmTracking } from "../migration-helpers";

/**
 * REFACTORED: Events and Registrations
 * 
 * MAJOR CHANGES:
 * 1. Created proper `events` table with FK relationship
 * 2. Moved event_registrations to reference events.id
 * 3. Added event capacity and registration limits
 * 4. Normalized event metadata
 * 
 * BENEFITS:
 * - Referential integrity (can't register for non-existent events)
 * - Query events independently of registrations
 * - Track event capacity and availability
 * - Reduced data duplication (event date, type stored once)
 */
export async function up(knex: Knex): Promise<void> {
  // Events master table
  await knex.schema.createTable("events", (table) => {
    table.increments("id").primary();
    table.string("name", 200).notNullable();
    table.string("slug", 200).notNullable().unique();
    
    table
      .enum("type", [
        "open_house",
        "trade_show",
        "inauguration",
        "networking",
        "webinar",
        "other"
      ])
      .notNullable()
      .index();
    
    table.date("start_date").notNullable();
    table.date("end_date").nullable(); // For multi-day events
    table.text("description").nullable();
    table.string("location", 255).nullable();
    
    // NEW: Capacity management
    table.integer("max_capacity").unsigned().nullable();
    table.integer("current_registrations").unsigned().defaultTo(0);
    
    // NEW: Event status
    table.enum("status", [
      "draft",
      "published",
      "registration_open",
      "registration_closed",
      "completed",
      "cancelled"
    ]).defaultTo("draft").index();
    
    // Time slots as JSON array (e.g., ["09:00-12:00", "14:00-17:00"])
    table.json("available_time_slots").nullable();
    
    table.string("assigned_salesperson", 100).nullable().index();
    table.boolean("is_featured").defaultTo(false);
    
    addAuditFields(table);

    // Composite indexes
    table.index(["type", "start_date", "status"], "idx_type_date_status");
    table.index(["start_date", "end_date"], "idx_date_range");
  });

  // Event Registrations (now with proper FK)
  await knex.schema.createTable("event_registrations", (table) => {
    table.increments("id").primary();
    
    // CHANGED: Now references events.id
    addForeignKey(table, "event_id", "events", "id", "CASCADE");
    
    table.string("first_name", 100).notNullable();
    table.string("last_name", 100).notNullable();
    table.string("email", 255).nullable().index();
    table.string("phone", 30).nullable().index();
    
    // Selected time slots from event's available_time_slots
    table.json("selected_time_slots").nullable();
    
    // Check-in tracking
    table.timestamp("checked_in_at").nullable();
    table.timestamp("checked_out_at").nullable();
    
    // NEW: Registration status
    table.enum("registration_status", [
      "pending",
      "confirmed",
      "checked_in",
      "completed",
      "cancelled",
      "no_show"
    ]).defaultTo("pending").index();
    
    // Feedback (NPS style)
    table.integer("satisfaction_score").nullable();
    table.integer("recommendation_score").nullable();
    table.text("feedback_comments").nullable();
    
    table.string("assigned_salesperson", 100).nullable().index();
    
    // Consent
    table.boolean("accepted_terms").defaultTo(false);
    table.boolean("photo_consent").defaultTo(false);
    
    // Marketing tracking
    addUtmTracking(table);
    table.string("registration_source", 500).nullable();
    table.string("referrer", 500).nullable();
    
    addAuditFields(table);

    // Composite indexes
    table.index(["event_id", "registration_status"], "idx_event_status");
    table.index(["event_id", "checked_in_at"], "idx_event_checkin");
    
    // Prevent duplicate registrations
    table.unique(["event_id", "email"], "unique_event_email");
  });

  // Add CHECK constraints
  await addCheckConstraint(
    knex,
    "events",
    "events_capacity_check",
    "max_capacity IS NULL OR max_capacity > 0"
  );
  
  await addCheckConstraint(
    knex,
    "events",
    "events_registrations_check",
    "current_registrations >= 0"
  );

  await addCheckConstraint(
    knex,
    "event_registrations",
    "event_reg_satisfaction_check",
    "satisfaction_score IS NULL OR (satisfaction_score >= 1 AND satisfaction_score <= 10)"
  );
  
  await addCheckConstraint(
    knex,
    "event_registrations",
    "event_reg_recommendation_check",
    "recommendation_score IS NULL OR (recommendation_score >= 1 AND recommendation_score <= 10)"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("event_registrations");
  await knex.schema.dropTableIfExists("events");
}