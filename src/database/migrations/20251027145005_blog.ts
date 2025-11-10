import type { Knex } from "knex";
import { addCheckConstraint, configureTableEngine } from "../knex-extensions";

/**
 * Migration: Commercial Properties, Blog Posts, and Feedback
 *
 * Combined migration for remaining domain tables
 */
export async function up(knex: Knex): Promise<void> {

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
    // table.integer("reading_time_minutes").unsigned().nullable();

    // =================================================================
    // SEO
    // =================================================================
    // table.string("meta_title", 255).nullable();
    // table.text("meta_description").nullable();
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
    // table.integer("view_count").unsigned().defaultTo(0);

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

  // await addCheckConstraint(
  //   knex,
  //   "blog_posts",
  //   "chk_blog_view_count",
  //   "view_count >= 0"
  // );

  // await addCheckConstraint(
  //   knex,
  //   "blog_posts",
  //   "chk_blog_reading_time",
  //   "reading_time_minutes IS NULL OR reading_time_minutes > 0"
  // );

  await knex.raw(`
    ALTER TABLE blog_posts 
    ADD FULLTEXT INDEX ft_blog_search (title, excerpt, content)
  `);

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

}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("blog_post_sections");
  await knex.schema.dropTableIfExists("blog_posts");
}
