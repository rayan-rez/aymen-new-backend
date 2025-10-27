// 20251027133410_blog_posts.ts
import type { Knex } from "knex";
import { addAuditFields, addCheckConstraint } from "../migration-helpers";

/**
 * REFACTORED: Blog Posts
 *
 * CHANGES:
 * 1. Removed blog_post_gallery_images (use polymorphic photos table)
 * 2. Added reading_time_minutes
 * 3. Added is_featured flag
 * 4. Improved SEO fields
 *
 * BENEFITS:
 * - Better content management
 * - Unified media handling
 * - Enhanced SEO support
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("blog_posts", (table) => {
    table.increments("id").primary();

    // Basic info
    table.string("title", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.string("author_name", 100).notNullable();
    table.string("category", 50).nullable().index();

    // Content
    table.text("excerpt").nullable();
    table.text("content").notNullable();
    table.string("featured_image_url", 500).nullable();
    table.integer("reading_time_minutes").unsigned().nullable(); // NEW

    // SEO
    table.string("meta_title", 255).nullable();
    table.text("meta_description").nullable();
    table.json("tags").nullable();

    // Publishing
    table.boolean("is_published").defaultTo(false).index();
    table.boolean("is_featured").defaultTo(false).index(); // NEW
    table.timestamp("published_at").nullable();

    // Analytics
    table.integer("view_count").unsigned().defaultTo(0);

    addAuditFields(table);

    // Composite indexes
    table.index(
      ["is_published", "is_featured", "published_at"],
      "idx_pub_feat_date"
    );
    table.index(["category", "is_published"], "idx_cat_pub");
  });

  // Blog post sections (unchanged but included for completeness)
  await knex.schema.createTable("blog_post_sections", (table) => {
    table.increments("id").primary();
    table
      .integer("blog_post_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("blog_posts")
      .onDelete("CASCADE");

    table.string("section_title", 255).nullable();
    table.text("section_content").notNullable();
    table.string("section_image_url", 500).nullable();
    table.integer("display_order").unsigned().defaultTo(0);

    table.timestamps(true, true);

    table.index(["blog_post_id", "display_order"], "idx_post_order");
  });

  // CHECK constraints
  await addCheckConstraint(
    knex,
    "blog_posts",
    "blog_posts_view_count_check",
    "view_count >= 0"
  );
  await addCheckConstraint(
    knex,
    "blog_posts",
    "blog_posts_reading_time_check",
    "reading_time_minutes IS NULL OR reading_time_minutes > 0"
  );
  await addCheckConstraint(
    knex,
    "blog_post_sections",
    "blog_sections_order_check",
    "display_order >= 0"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("blog_post_sections");
  await knex.schema.dropTableIfExists("blog_posts");
}
