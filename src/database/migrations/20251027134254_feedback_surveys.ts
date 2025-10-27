// 20251027133435_feedback_surveys.ts
import type { Knex } from "knex";
import {
  addAuditFields,
  addForeignKey,
  addCheckConstraint,
} from "../migration-helpers";

/**
 * REFACTORED: Feedback & Surveys
 *
 * CHANGES:
 * 1. Unified customer_feedback table
 * 2. Simplified trade_show_feedback
 * 3. Added sentiment analysis fields
 * 4. Improved indexing
 *
 * BENEFITS:
 * - Centralized feedback management
 * - Better analytics support
 * - Consistent NPS tracking
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("customer_feedback", (table) => {
    table.increments("id").primary();

    // Contact info (optional for anonymous feedback)
    table.string("full_name", 255).nullable();
    table.string("email", 255).nullable().index();
    table.string("phone", 20).nullable();

    // Feedback type
    table
      .enum("feedback_type", [
        "event_feedback",
        "property_visit",
        "customer_service",
        "general",
        "kiosk",
      ])
      .notNullable()
      .index();

    // Ratings (NPS-style)
    table.integer("overall_satisfaction").nullable();
    table.integer("recommendation_likelihood").nullable(); // NPS score

    // Comments
    table.text("feedback_comments").nullable();
    table.text("suggestions").nullable();

    // Context
    addForeignKey(table, "project_id", "projects", "id", "SET NULL");
    table.string("related_event", 255).nullable();
    table.enum("language", ["fr", "ar", "en"]).defaultTo("fr");

    // NEW: Sentiment analysis
    table.enum("sentiment", ["positive", "neutral", "negative"]).nullable();
    table.decimal("sentiment_score", 3, 2).nullable(); // -1.00 to 1.00

    addAuditFields(table);

    // Composite indexes
    table.index(["feedback_type", "created_at"], "idx_type_date");
    table.index(["project_id", "feedback_type"], "idx_proj_type");
    table.index(["sentiment", "created_at"], "idx_sentiment_date");
  });

  // Trade show specific feedback (simplified)
  await knex.schema.createTable("trade_show_feedback", (table) => {
    table.increments("id").primary();

    // Ratings
    table.decimal("company_satisfaction", 3, 1).notNullable();
    table.decimal("company_recommendation", 3, 1).notNullable();
    table.decimal("event_satisfaction", 3, 1).notNullable();
    table.decimal("event_recommendation", 3, 1).notNullable();

    // Comments
    table.text("positive_feedback").nullable();
    table.text("improvement_suggestions").nullable();

    // Context
    table.string("trade_show_name", 255).notNullable().index();
    table.date("trade_show_date").notNullable().index();
    table.enum("language", ["fr", "ar", "en"]).defaultTo("fr");

    addAuditFields(table);

    table.index(["trade_show_name", "trade_show_date"], "idx_show_date");
  });

  // CHECK constraints
  await addCheckConstraint(
    knex,
    "customer_feedback",
    "feedback_satisfaction_check",
    "overall_satisfaction IS NULL OR (overall_satisfaction >= 1 AND overall_satisfaction <= 10)"
  );
  await addCheckConstraint(
    knex,
    "customer_feedback",
    "feedback_nps_check",
    "recommendation_likelihood IS NULL OR (recommendation_likelihood >= 1 AND recommendation_likelihood <= 10)"
  );
  await addCheckConstraint(
    knex,
    "customer_feedback",
    "feedback_sentiment_score_check",
    "sentiment_score IS NULL OR (sentiment_score >= -1.00 AND sentiment_score <= 1.00)"
  );

  await addCheckConstraint(
    knex,
    "trade_show_feedback",
    "trade_feedback_scores_check",
    "company_satisfaction >= 0 AND company_satisfaction <= 10 AND " +
      "company_recommendation >= 0 AND company_recommendation <= 10 AND " +
      "event_satisfaction >= 0 AND event_satisfaction <= 10 AND " +
      "event_recommendation >= 0 AND event_recommendation <= 10"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("trade_show_feedback");
  await knex.schema.dropTableIfExists("customer_feedback");
}
