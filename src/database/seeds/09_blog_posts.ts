import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Blog Posts
 * Migrates from old `blog` table (not articles_blog!)
 * to new `blog_posts` and `blog_post_sections` tables
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("\n📝 Starting blog posts migration...");
  console.log("====================================");

  // Validate legacy DB config
  try {
    SeederHelper.validateLegacyDbConfig();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log("\nℹ️  Skipping seeder - legacy database not configured");
    return;
  }

  const trx = await knex.transaction();
  const postStats: MigrationStats = { total: 0, inserted: 0, skipped: 0, failed: 0 };
  let sectionCount = 0;
  let galleryCount = 0;

  try {
    // Clear existing data
    await SeederHelper.clearTable(trx, "blog_post_sections");
    await SeederHelper.clearTable(trx, "blog_posts");
    console.log("  ✓ Cleared existing blog posts");

    // ============================================
    // MIGRATE BLOG POSTS FROM `blog` TABLE
    // ============================================
    try {
      const oldBlogPosts = await legacy_db("blog").select("*");
      postStats.total = oldBlogPosts.length;
      console.log(`  📊 Found ${postStats.total} old blog posts to migrate`);

      if (postStats.total === 0) {
        console.log("  ℹ️  No blog posts to migrate");
        await trx.commit();
        return;
      }

      const blogPostMap = new Map<number, number>();

      for (const post of oldBlogPosts) {
        try {
          const slug = post.slug || SeederHelper.generateSlug(
            post.titre,
            `post-${post.id}`
          );

          // Main content
          const content = post.contenu || "";

          const [newPostId] = await trx("blog_posts").insert({
            title: post.titre,
            slug,
            author_name: post.auteur || "Admin",
            category: post.categorie || null,
            excerpt: content.substring(0, 200) || null,
            content: content,
            featured_image_url: post.photo_principale_path || null,
            meta_title: post.titre,
            meta_description: content.substring(0, 160) || null,
            tags: null,
            is_published: true, // Assume published
            published_at: post.date_publication || trx.fn.now(),
            view_count: 0,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });

          blogPostMap.set(post.id, newPostId);
          postStats.inserted++;

          // ============================================
          // MIGRATE BLOG POST SECTIONS (from contenu1-4, titre1-4)
          // ============================================
          const sections = [
            { title: post.titre1, content: post.contenu1, image: post.photo1 },
            { title: post.titre2, content: post.contenu2, image: post.photo2 },
            { title: post.titre3, content: post.contenu3, image: post.photo3 },
            { title: post.titre4, content: post.contenu4, image: post.photo4 },
          ];

          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (section.content) {
              try {
                await trx("blog_post_sections").insert({
                  blog_post_id: newPostId,
                  section_title: section.title || null,
                  section_content: section.content,
                  section_image_url: section.image || null,
                  display_order: i,
                  created_at: trx.fn.now(),
                  updated_at: trx.fn.now(),
                });
                sectionCount++;
              } catch (error) {
                console.warn(`  ⚠️  Failed to insert blog section`, error);
              }
            }
          }
        } catch (error) {
          console.warn(`  ⚠️  Failed: ${post.titre}`, (error as Error).message);
          postStats.failed++;
        }
      }

      console.log(`  ✓ Inserted ${postStats.inserted} blog posts`);
      console.log(`  ✓ Inserted ${sectionCount} blog sections`);

      // ============================================
      // MIGRATE BLOG CAROUSEL IMAGES TO PHOTOS
      // ============================================
      console.log("\n  🖼️  Migrating blog carousel images...");
      try {
        const oldBlogCarousel = await legacy_db("blog_carousel").select("*");
        console.log(`  📊 Found ${oldBlogCarousel.length} blog carousel images`);

        for (const image of oldBlogCarousel) {
          const newBlogPostId = blogPostMap.get(image.blog_id);

          if (newBlogPostId && image.image) {
            try {
              await trx("photos").insert({
                photoable_type: "blog_post",
                photoable_id: newBlogPostId,
                url: image.image,
                caption: null,
                display_order: galleryCount,
                is_cover: false,
                created_at: trx.fn.now(),
                updated_at: trx.fn.now(),
              });
              galleryCount++;
            } catch (error) {
              console.warn(`  ⚠️  Failed to insert blog carousel image`, error);
            }
          }
        }
        console.log(`  ✓ Inserted ${galleryCount} blog carousel images`);
      } catch (error) {
        console.log("  ℹ️  No blog carousel table found");
      }

      // Store mapping
      await SeederHelper.storeMapping(trx, "temp_blog_post_mapping", blogPostMap);
    } catch (error) {
      console.log("  ℹ️  No blog posts table found in old database");
    }

    await trx.commit();

    console.log(`\n📝 Blog Posts Migration Summary:`);
    console.log(`  • Blog Posts: ${postStats.inserted}`);
    console.log(`  • Sections: ${sectionCount}`);
    console.log(`  • Gallery Images: ${galleryCount}`);
    if (postStats.failed > 0) {
      console.log(`  ⚠️  Failed: ${postStats.failed}`);
    }
    console.log("✅ Blog posts migration completed successfully\n");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Blog posts migration failed:", error);
    throw error;
  }
}