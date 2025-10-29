import type { Knex } from "knex";
import { addCheckConstraint, configureTableEngine } from "../knex-extensions";

/**
 * Migration: Commercial Properties, Blog Posts, and Feedback
 *
 * Combined migration for remaining domain tables
 */
export async function up(knex: Knex): Promise<void> {
  // ====================================================================
  // COMMERCIAL PROPERTIES
  // ====================================================================
  await knex.schema.createTable("commercial_properties", (table) => {
    table.increments("id").primary();

    // =================================================================
    // IDENTIFIERS & BASIC INFO
    // =================================================================
    table.string("title", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.string("subtitle", 255).nullable();
    table.text("description").notNullable();
    table.text("card_description").nullable();

    // =================================================================
    // LOCATION
    // =================================================================
    table.string("address", 255).notNullable();
    table.withCoordinates({ required: false });
    table.withForeignKey("location_id", "locations", "id", "SET NULL");

    // =================================================================
    // PROPERTY DETAILS
    // =================================================================
    table.withStatusEnum(
      ["office", "shop", "warehouse", "showroom", "restaurant", "mixed_use"],
      { columnName: "property_type" }
    );

    table.decimal("area_sqm", 10, 2).nullable();
    table.decimal("price", 15, 2).nullable();

    table.withStatusEnum(
      ["available", "rented", "sold"],
      { columnName: "status", defaultStatus: "available" }
    );

    // =================================================================
    // MARKETING
    // =================================================================
    table.string("main_image_url", 500).nullable();
    table.boolean("is_featured").defaultTo(false).index();
    table.boolean("is_published").defaultTo(false).index();

    // =================================================================
    // SEO
    // =================================================================
    table.string("meta_title", 255).nullable();
    table.text("meta_description").nullable();

    table.withAuditTrail();

    // =================================================================
    // COMPOSITE INDEXES
    // =================================================================
    table.index(
      ["property_type", "status", "is_published"],
      "idx_type_status_pub"
    );
    table.index(["location_id", "property_type"], "idx_location_type");

    configureTableEngine(table);
  });

  await addCheckConstraint(
    knex,
    "commercial_properties",
    "chk_comm_area_positive",
    "area_sqm IS NULL OR area_sqm > 0"
  );

  await addCheckConstraint(
    knex,
    "commercial_properties",
    "chk_comm_price_positive",
    "price IS NULL OR price > 0"
  );

  await addCheckConstraint(
    knex,
    "commercial_properties",
    "chk_comm_latitude",
    "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)"
  );

  await addCheckConstraint(
    knex,
    "commercial_properties",
    "chk_comm_longitude",
    "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)"
  );

  // ====================================================================
  // BLOG POSTS
  // ====================================================================
  await knex.schema.createTable("blog_posts", (table) => {
    table.increments("id").primary();

    // =================================================================
    // IDENTIFIERS
    // =================================================================
    table.string("title", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.string("author_name", 100).notNullable();
    table.string("category", 50).nullable().index();

    // =================================================================
    // CONTENT
    // =================================================================
    table.text("excerpt").nullable();
    table.text("content").notNullable();
    table.string("featured_image_url", 500).nullable();
    table.integer("reading_time_minutes").unsigned().nullable();

    // =================================================================
    // SEO
    // =================================================================
    table.string("meta_title", 255).nullable();
    table.text("meta_description").nullable();
    table.withJsonMetadata("tags");

    // =================================================================
    // PUBLISHING
    // =================================================================
    table.boolean("is_published").defaultTo(false).index();
    table.boolean("is_featured").defaultTo(false).index();
    table.timestamp("published_at").nullable();

    // =================================================================
    // ANALYTICS
    // =================================================================
    table.integer("view_count").unsigned().defaultTo(0);

    table.withAuditTrail();

    // =================================================================
    // COMPOSITE INDEXES
    // =================================================================
    table.index(
      ["is_published", "is_featured", "published_at"],
      "idx_pub_feat_date"
    );
    table.index(["category", "is_published"], "idx_cat_pub");

    configureTableEngine(table);
  });

  await addCheckConstraint(
    knex,
    "blog_posts",
    "chk_blog_view_count",
    "view_count >= 0"
  );

  await addCheckConstraint(
    knex,
    "blog_posts",
    "chk_blog_reading_time",
    "reading_time_minutes IS NULL OR reading_time_minutes > 0"
  );

  // ====================================================================
  // BLOG POST SECTIONS
  // ====================================================================
  await knex.schema.createTable("blog_post_sections", (table) => {
    table.increments("id").primary();
    
    table.withForeignKey("blog_post_id", "blog_posts", "id", "CASCADE");

    table.string("section_title", 255).nullable();
    table.text("section_content").notNullable();
    table.string("section_image_url", 500).nullable();
    table.integer("display_order").unsigned().defaultTo(0);

    table.withTimestamps();

    table.index(["blog_post_id", "display_order"], "idx_post_order");

    configureTableEngine(table);
  });

  await addCheckConstraint(
    knex,
    "blog_post_sections",
    "chk_section_order",
    "display_order >= 0"
  );

  // ====================================================================
  // CUSTOMER FEEDBACK
  // ====================================================================
  await knex.schema.createTable("customer_feedback", (table) => {
    table.increments("id").primary();

    // =================================================================
    // CONTACT INFORMATION
    // =================================================================
    table.string("full_name", 255).nullable();
    table.withEmailColumn({ required: false, unique: false });
    table.string("phone", 20).nullable();

    // =================================================================
    // FEEDBACK TYPE
    // =================================================================
    table.withStatusEnum(
      ["event_feedback", "property_visit", "customer_service", "general", "kiosk"],
      { columnName: "feedback_type" }
    );

    // =================================================================
    // NPS RATINGS
    // =================================================================
    table.integer("overall_satisfaction").nullable();
    table.integer("recommendation_likelihood").nullable();

    table.text("feedback_comments").nullable();
    table.text("suggestions").nullable();

    // =================================================================
    // CONTEXT
    // =================================================================
    table.withForeignKey("project_id", "projects", "id", "SET NULL");
    table.string("related_event", 255).nullable();
    table.withStatusEnum(
      ["fr", "ar", "en"],
      { columnName: "language", defaultStatus: "fr" }
    );

    // =================================================================
    // SENTIMENT ANALYSIS
    // =================================================================
    table.withStatusEnum(
      ["positive", "neutral", "negative"],
      { columnName: "sentiment" }
    );
    table.decimal("sentiment_score", 3, 2).nullable();

    table.withAuditTrail();

    // =================================================================
    // COMPOSITE INDEXES
    // =================================================================
    table.index(["feedback_type", "created_at"], "idx_type_date");
    table.index(["project_id", "feedback_type"], "idx_proj_type");
    table.index(["sentiment", "created_at"], "idx_sentiment_date");

    configureTableEngine(table);
  });

  await addCheckConstraint(
    knex,
    "customer_feedback",
    "chk_feedback_satisfaction",
    "overall_satisfaction IS NULL OR (overall_satisfaction >= 1 AND overall_satisfaction <= 10)"
  );

  await addCheckConstraint(
    knex,
    "customer_feedback",
    "chk_feedback_nps",
    "recommendation_likelihood IS NULL OR (recommendation_likelihood >= 1 AND recommendation_likelihood <= 10)"
  );

  await addCheckConstraint(
    knex,
    "customer_feedback",
    "chk_feedback_sentiment_score",
    "sentiment_score IS NULL OR (sentiment_score >= -1.00 AND sentiment_score <= 1.00)"
  );

  // ====================================================================
  // TRADE SHOW FEEDBACK
  // ====================================================================
  await knex.schema.createTable("trade_show_feedback", (table) => {
    table.increments("id").primary();

    // =================================================================
    // RATING SCORES
    // =================================================================
    table.decimal("company_satisfaction", 3, 1).notNullable();
    table.decimal("company_recommendation", 3, 1).notNullable();
    table.decimal("event_satisfaction", 3, 1).notNullable();
    table.decimal("event_recommendation", 3, 1).notNullable();

    // =================================================================
    // FEEDBACK TEXT
    // =================================================================
    table.text("positive_feedback").nullable();
    table.text("improvement_suggestions").nullable();

    // =================================================================
    // EVENT DETAILS
    // =================================================================
    table.string("trade_show_name", 255).notNullable().index();
    table.date("trade_show_date").notNullable().index();
    table.withStatusEnum(
      ["fr", "ar", "en"],
      { columnName: "language", defaultStatus: "fr" }
    );

    table.withAuditTrail();

    table.index(["trade_show_name", "trade_show_date"], "idx_show_date");

    configureTableEngine(table);
  });

  await addCheckConstraint(
    knex,
    "trade_show_feedback",
    "chk_trade_scores",
    "company_satisfaction >= 0 AND company_satisfaction <= 10 AND " +
      "company_recommendation >= 0 AND company_recommendation <= 10 AND " +
      "event_satisfaction >= 0 AND event_satisfaction <= 10 AND " +
      "event_recommendation >= 0 AND event_recommendation <= 10"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("trade_show_feedback");
  await knex.schema.dropTableIfExists("customer_feedback");
  await knex.schema.dropTableIfExists("blog_post_sections");
  await knex.schema.dropTableIfExists("blog_posts");
  await knex.schema.dropTableIfExists("commercial_properties");
}