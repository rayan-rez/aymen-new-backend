import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";
import { SeederHelper, MigrationStats } from "../seed-helpers";

/**
 * Seed: Blog Posts
 * Migrates from old `articles_blog` and `articles_blog_sections` tables
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
    // Check if already seeded (idempotency)
    const existingCount = await trx("blog_posts").count("* as count").first();
    if (existingCount && Number(existingCount.count) > 0) {
      console.log(`  ℹ️  Found ${existingCount.count} existing blog posts`);
      console.log("  ⚠️  Table already seeded. Skipping...");
      await trx.commit();
      return;
    }

    // Clear existing data
    await SeederHelper.clearTable(trx, "blog_post_sections");
    await SeederHelper.clearTable(trx, "blog_posts");
    console.log("  ✓ Cleared existing blog posts");

    // ============================================
    // MIGRATE BLOG POSTS
    // ============================================
    try {
      const oldBlogPosts = await legacy_db("articles_blog").select("*");
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
          const slug = SeederHelper.generateSlug(
            post.titre,
            `post-${post.article_id}`
          );

          // Parse tags if stored as JSON
          let tags = null;
          if (post.tags) {
            tags = SeederHelper.safeJsonParse(post.tags, [post.tags]);
          }

          const [newPostId] = await trx("blog_posts").insert({
            title: post.titre,
            slug,
            author_name: post.nom_auteur || "Admin",
            category: post.categorie || null,
            excerpt: post.extrait || null,
            content: post.contenu,
            featured_image_url: post.url_image_vedette || null,
            meta_title: post.titre_meta || post.titre,
            meta_description: post.description_meta || post.extrait,
            tags: tags ? JSON.stringify(tags) : null,
            is_published: Boolean(post.est_publie),
            published_at: post.date_publication || trx.fn.now(),
            view_count: post.nombre_vues || 0,
            created_at: post.date_creation || trx.fn.now(),
            updated_at: trx.fn.now(),
          });

          blogPostMap.set(post.article_id, newPostId);
          postStats.inserted++;
        } catch (error) {
          console.warn(`  ⚠️  Failed: ${post.titre}`, (error as Error).message);
          postStats.failed++;
        }
      }

      console.log(`  ✓ Inserted ${postStats.inserted} blog posts`);

      // ============================================
      // MIGRATE BLOG POST SECTIONS
      // ============================================
      console.log("\n  📄 Migrating blog post sections...");
      try {
        const oldBlogSections = await legacy_db("articles_blog_sections").select("*");
        console.log(`  📊 Found ${oldBlogSections.length} blog sections`);

        for (const section of oldBlogSections) {
          const newBlogPostId = blogPostMap.get(section.article_id);

          if (newBlogPostId) {
            try {
              await trx("blog_post_sections").insert({
                blog_post_id: newBlogPostId,
                section_title: section.titre_section || null,
                section_content: section.contenu_section,
                section_image_url: section.url_image_section || null,
                display_order: section.ordre_affichage || 0,
                created_at: trx.fn.now(),
                updated_at: trx.fn.now(),
              });
              sectionCount++;
            } catch (error) {
              console.warn(`  ⚠️  Failed to insert blog section`, error);
            }
          }
        }
        console.log(`  ✓ Inserted ${sectionCount} blog sections`);
      } catch (error) {
        console.log("  ℹ️  No blog sections table found");
      }

      // ============================================
      // MIGRATE BLOG POST GALLERY IMAGES TO PHOTOS
      // ============================================
      console.log("\n  🖼️  Migrating blog post gallery images...");
      try {
        const oldBlogGallery = await legacy_db("articles_blog_galerie").select("*");
        console.log(`  📊 Found ${oldBlogGallery.length} blog gallery images`);

        for (const image of oldBlogGallery) {
          const newBlogPostId = blogPostMap.get(image.article_id);

          if (newBlogPostId) {
            try {
              await trx("photos").insert({
                photoable_type: "blog_post",
                photoable_id: newBlogPostId,
                url: image.url,
                caption: image.legende || null,
                display_order: image.ordre_affichage || 0,
                is_cover: false,
                created_at: trx.fn.now(),
                updated_at: trx.fn.now(),
              });
              galleryCount++;
            } catch (error) {
              console.warn(`  ⚠️  Failed to insert blog gallery image`, error);
            }
          }
        }
        console.log(`  ✓ Inserted ${galleryCount} blog gallery images`);
      } catch (error) {
        console.log("  ℹ️  No blog gallery table found");
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