import type { Knex } from "knex";

/**
 * Migration: Blog and content management
 * Note: blog_post_gallery_images has been replaced by polymorphic photos table
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("blog_posts", (table) => {
    table.increments("id").primary();

    // Basic info
    table.string("title", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.string("author_name", 100).notNullable();
    table.string("category", 50).nullable();

    // Content
    table.text("excerpt").nullable();
    table.text("content").notNullable();
    table.string("featured_image_url", 500).nullable();

    // SEO
    table.string("meta_title", 255).nullable();
    table.text("meta_description").nullable();
    table.json("tags").nullable();

    // Publishing
    table.boolean("is_published").defaultTo(false);
    table.timestamp("published_at").nullable();

    // Analytics
    table.integer("view_count").defaultTo(0);

    // Timestamps and soft delete
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();

    table.index(["slug", "deleted_at"]);
    table.index(["is_published", "published_at"]);
    table.index("category");
  });

  // Blog post sections (for multi-section articles)
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
    table.integer("display_order").defaultTo(0);
    table.timestamps(true, true);

    table.index("blog_post_id");
    table.index(["blog_post_id", "display_order"]);
  });

  // Note: blog_post_gallery_images is now handled by the polymorphic photos table
  // Use PhotoableType.BLOG_POST with the blog post ID
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("blog_post_sections");
  await knex.schema.dropTableIfExists("blog_posts");
}
