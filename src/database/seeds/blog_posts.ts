import { Knex } from "knex";
import legacy_db from "@/config/legacy-database";

/**
 * Seed: Blog Posts
 * Migrates from old `articles_blog` and `articles_blog_sections` tables
 * to new `blog_posts` and `blog_post_sections` tables
 */
export async function seed(knex: Knex): Promise<void> {
  console.log("📝 Starting blog posts migration...");

  const trx = await knex.transaction();

  try {
    // Clear existing data
    await trx("blog_post_sections").del();
    await trx("blog_posts").del();
    console.log("  ✓ Cleared existing blog posts");

    // ============================================
    // MIGRATE BLOG POSTS
    // ============================================
    try {
      const oldBlogPosts = await legacy_db("articles_blog").select("*");
      console.log(`  📊 Found ${oldBlogPosts.length} old blog posts`);

      const blogPostMap = new Map<number, number>();
      let insertedCount = 0;

      for (const post of oldBlogPosts) {
        try {
          // Generate slug
          const slug = post.titre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          // Parse tags if stored as JSON
          let tags = null;
          if (post.tags) {
            try {
              tags = JSON.parse(post.tags);
            } catch {
              tags = [post.tags];
            }
          }

          const [newPostId] = await trx("blog_posts").insert({
            title: post.titre,
            slug: slug || `post-${post.article_id}`,
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
          insertedCount++;
        } catch (error) {
          console.warn(
            `  ⚠️  Failed to insert blog post: ${post.titre}`,
            error
          );
        }
      }

      console.log(`  ✓ Inserted ${insertedCount} blog posts`);

      // ============================================
      // MIGRATE BLOG POST SECTIONS
      // ============================================
      try {
        const oldBlogSections = await legacy_db("articles_blog_sections").select(
          "*"
        );
        console.log(`  📄 Found ${oldBlogSections.length} blog sections`);

        let sectionCount = 0;
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
      try {
        const oldBlogGallery = await legacy_db("articles_blog_galerie").select(
          "*"
        );
        console.log(`  🖼️  Found ${oldBlogGallery.length} blog gallery images`);

        let galleryCount = 0;
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

      // Store mapping for potential future use
      await trx.raw(`
        CREATE TEMPORARY TABLE IF NOT EXISTS temp_blog_post_mapping (
          old_id INT PRIMARY KEY,
          new_id INT
        )
      `);

      for (const [oldId, newId] of blogPostMap.entries()) {
        await trx.raw(
          "INSERT INTO temp_blog_post_mapping (old_id, new_id) VALUES (?, ?)",
          [oldId, newId]
        );
      }
    } catch (error) {
      console.log("  ℹ️  No blog posts table found in old database");
    }

    await trx.commit();

    console.log("✅ Blog posts migration completed successfully");
  } catch (error) {
    await trx.rollback();
    console.error("❌ Blog posts migration failed:", error);
    throw error;
  }
}