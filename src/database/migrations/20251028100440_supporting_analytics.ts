// src/database/migrations/20251027134600_supporting_analytics.ts
import type { Knex } from "knex";
import { configureTableDefaults } from "../knex-extensions";

/**
 * SUPPORTING ANALYTICS TABLES
 * 
 * Additional tables for comprehensive analytics:
 * - conversion_goals: Define and track conversion goals
 * - ab_tests: A/B testing configuration and results
 * - email_campaigns: Email marketing campaigns
 * - email_sends: Individual email send tracking
 */
export async function up(knex: Knex): Promise<void> {
  // Conversion Goals Definition
  await knex.schema.createTable("conversion_goals", (table) => {
    table.increments("id").primary();
    
    table.string("name", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.text("description").nullable();
    
    // Goal type and conditions
    table.enum("goal_type", [
      "form_submission",
      "page_view",
      "event",
      "time_on_site",
      "pages_per_session"
    ]).notNullable();
    
    // Goal conditions as JSON
    // Example: {"form_type":"project_inquiry","project_id":5}
    // Example: {"page_path":"/thank-you","min_time_seconds":30}
    table.json("conditions").nullable();
    
    // Goal value (for ROI calculation)
    table.decimal("value", 15, 2).nullable();
    
    table.boolean("is_active").defaultTo(true);
    
    table.withTimestamps();

    table.index(["goal_type", "is_active"]);

    configureTableDefaults(table);
  });

  // A/B Tests
  await knex.schema.createTable("ab_tests", (table) => {
    table.increments("id").primary();
    
    table.string("name", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.text("description").nullable();
    
    // Test configuration
    table.enum("test_type", [
      "page_variant",
      "form_variant",
      "cta_variant",
      "pricing_variant"
    ]).notNullable();
    
    table.string("control_variant", 100).notNullable();
    table.json("test_variants").notNullable(); // ["variant_a", "variant_b"]
    table.json("traffic_split").notNullable(); // {"control":50,"variant_a":25,"variant_b":25}
    
    // Test period
    table.timestamp("start_date").nullable();
    table.timestamp("end_date").nullable();
    
    // Status
    table.enum("status", [
      "draft",
      "running",
      "paused",
      "completed",
      "cancelled"
    ]).defaultTo("draft");
    
    // Target pages or forms
    table.json("target_urls").nullable();
    
    // Goal tracking
    table
      .integer("conversion_goal_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("conversion_goals")
      .onDelete("SET NULL");
    
    table.withTimestamps();

    table.index(["status", "start_date"]);

    configureTableDefaults(table);

  });

  // Email Campaigns
  await knex.schema.createTable("email_campaigns", (table) => {
    table.increments("id").primary();
    
    table.string("name", 255).notNullable();
    table.string("subject", 255).notNullable();
    table.text("preview_text").nullable();
    
    // Campaign type
    table.enum("campaign_type", [
      "newsletter",
      "promotional",
      "transactional",
      "drip",
      "announcement"
    ]).notNullable();
    
    // Targeting
    table.json("target_segments").nullable(); // ["all_leads", "recent_inquiries"]
    table
      .integer("project_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("projects")
      .onDelete("SET NULL");
    
    // Scheduling
    table.timestamp("scheduled_at").nullable();
    table.timestamp("sent_at").nullable();
    
    // Status
    table.enum("status", [
      "draft",
      "scheduled",
      "sending",
      "sent",
      "cancelled"
    ]).defaultTo("draft");
    
    // Metrics
    table.integer("total_recipients").unsigned().defaultTo(0);
    table.integer("total_sent").unsigned().defaultTo(0);
    table.integer("total_delivered").unsigned().defaultTo(0);
    table.integer("total_opened").unsigned().defaultTo(0);
    table.integer("total_clicked").unsigned().defaultTo(0);
    table.integer("total_bounced").unsigned().defaultTo(0);
    table.integer("total_unsubscribed").unsigned().defaultTo(0);
    
    table.withTimestamps();

    table.index(["status", "scheduled_at"]);
    table.index("campaign_type");

    configureTableDefaults(table);

  });

  // Email Sends (individual email tracking)
  await knex.schema.createTable("email_sends", (table) => {
    table.bigIncrements("id").primary();
    
    table
      .integer("campaign_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("email_campaigns")
      .onDelete("CASCADE");
    table.index("campaign_id");
    
    table
      .integer("lead_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("leads")
      .onDelete("CASCADE");
    table.index("lead_id");
    
    table.string("email", 255).notNullable().index();
    
    // Status
    table.enum("status", [
      "pending",
      "sent",
      "delivered",
      "bounced",
      "failed"
    ]).defaultTo("pending");
    
    // Timestamps for each stage
    table.timestamp("sent_at").nullable();
    table.timestamp("delivered_at").nullable();
    table.timestamp("opened_at").nullable(); // First open
    table.timestamp("clicked_at").nullable(); // First click
    table.timestamp("bounced_at").nullable();
    table.timestamp("unsubscribed_at").nullable();
    
    // Engagement metrics
    table.integer("open_count").unsigned().defaultTo(0);
    table.integer("click_count").unsigned().defaultTo(0);
    
    // Error details
    table.string("bounce_reason", 255).nullable();
    
    table.withTimestamps();

    table.index(["campaign_id", "status"]);
    table.index(["email", "sent_at"]);

    configureTableDefaults(table);

  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("email_sends");
  await knex.schema.dropTableIfExists("email_campaigns");
  await knex.schema.dropTableIfExists("ab_tests");
  await knex.schema.dropTableIfExists("conversion_goals");
}