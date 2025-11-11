// src/database/seeds/blog_posts.ts

import { Knex } from "knex";
import {
  fetchLegacyRecords,
  generateSlug,
  sanitizeString,
  cleanUrl,
  parseDate,
  parseInteger,
  processBatch,
  printMigrationStats,
  clearTable,
  TransformResult,
} from "../helpers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LegacyBlogPost {
  id: number;
  titre: string;
  contenu: string;
  auteur: string;
  date_publication: string;
  categorie: string | null;
  slug: string;
  photo_principale_path: string | null;
  contenu1: string | null;
  contenu2: string | null;
  contenu3: string | null;
  contenu4: string | null;
  titre1: string | null;
  titre2: string | null;
  titre3: string | null;
  titre4: string | null;
  photo1: string | null;
  photo2: string | null;
  photo3: string | null;
  photo4: string | null;
}

interface NewBlogPost {
  id: number;
  title: string;
  slug: string;
  author_name: string;
  category: string | null;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  reading_time_minutes: number | null;
  tags: string | null; // JSON
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface BlogSection {
  blog_post_id: number;
  section_title: string | null;
  section_content: string;
  section_image_url: string | null;
  display_order: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Estimate reading time based on word count (avg 200 words/min)
 */
function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Extract excerpt from content (first 160 chars)
 */
function extractExcerpt(content: string): string {
  const cleaned = content.replace(/<[^>]*>/g, "").trim();
  return cleaned.length > 160
    ? cleaned.substring(0, 157) + "..."
    : cleaned;
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

async function transformBlogPost(
  legacy: LegacyBlogPost,
  existingSlugs: Set<string>
): Promise<
  TransformResult<{ post: NewBlogPost; sections: BlogSection[] }>
> {
  try {
    // Clean title
    const title = sanitizeString(legacy.titre);
    if (!title) {
      return { data: null, skip: true, error: "Empty blog title" };
    }

    // Generate unique slug
    let slug = legacy.slug ? generateSlug(legacy.slug) : generateSlug(title);
    let baseSlug = slug;
    let counter = 1;

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    existingSlugs.add(slug);

    // Clean content
    const content = sanitizeString(legacy.contenu) || "";
    if (!content) {
      return { data: null, skip: true, error: "Empty blog content" };
    }

    // Extract metadata
    const excerpt = extractExcerpt(content);
    const readingTime = estimateReadingTime(content);
    const category = sanitizeString(legacy.categorie as string);
    const authorName = sanitizeString(legacy.auteur) || "Aymen Promotion";

    // Parse publication date
    const publishedAt = parseDate(legacy.date_publication);
    const isPublished = !!publishedAt;
    const isFeatured = false; // Could add logic to determine featured posts

    // Clean image URL
    const featuredImageUrl = cleanUrl(legacy.photo_principale_path);

    // Create blog post
    const post: NewBlogPost = {
      id: legacy.id,
      title,
      slug,
      author_name: authorName,
      category,
      excerpt,
      content,
      featured_image_url: featuredImageUrl,
      reading_time_minutes: readingTime,
      tags: null,
      is_published: isPublished,
      is_featured: isFeatured,
      published_at: publishedAt ? publishedAt.toISOString() : null,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create sections
    const sections: BlogSection[] = [];

    // Section 1
    if (legacy.contenu1) {
      const sectionContent = sanitizeString(legacy.contenu1);
      if (sectionContent) {
        sections.push({
          blog_post_id: legacy.id,
          section_title: sanitizeString(legacy.titre1 as string),
          section_content: sectionContent,
          section_image_url: cleanUrl(legacy.photo1),
          display_order: 0,
        });
      }
    }

    // Section 2
    if (legacy.contenu2) {
      const sectionContent = sanitizeString(legacy.contenu2);
      if (sectionContent) {
        sections.push({
          blog_post_id: legacy.id,
          section_title: sanitizeString(legacy.titre2 as string),
          section_content: sectionContent,
          section_image_url: cleanUrl(legacy.photo2),
          display_order: 1,
        });
      }
    }

    // Section 3
    if (legacy.contenu3) {
      const sectionContent = sanitizeString(legacy.contenu3);
      if (sectionContent) {
        sections.push({
          blog_post_id: legacy.id,
          section_title: sanitizeString(legacy.titre3 as string),
          section_content: sectionContent,
          section_image_url: cleanUrl(legacy.photo3),
          display_order: 2,
        });
      }
    }

    // Section 4
    if (legacy.contenu4) {
      const sectionContent = sanitizeString(legacy.contenu4);
      if (sectionContent) {
        sections.push({
          blog_post_id: legacy.id,
          section_title: sanitizeString(legacy.titre4 as string),
          section_content: sectionContent,
          section_image_url: cleanUrl(legacy.photo4),
          display_order: 3,
        });
      }
    }

    return {
      data: { post, sections },
      skip: false,
    };
  } catch (error: any) {
    return {
      data: null,
      skip: false,
      error: `Transform failed: ${error.message}`,
    };
  }
}

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seed(knex: Knex): Promise<void> {
  console.log("\n📝 Starting Blog Posts Migration...\n");

  // Clear existing data
  await clearTable(knex, "blog_post_sections");
  await clearTable(knex, "blog_posts");
  console.log("✓ Cleared blog tables");

  // Fetch legacy blog posts
  const legacyPosts = await fetchLegacyRecords<LegacyBlogPost>("blog");
  console.log(`✓ Fetched ${legacyPosts.length} legacy blog posts\n`);

  if (legacyPosts.length === 0) {
    console.log("⊗ No legacy blog posts found, skipping migration\n");
    return;
  }

  // Process blog posts
  const existingSlugs = new Set<string>();
  const allSections: BlogSection[] = [];

  const stats = await processBatch(
    legacyPosts,
    (record) => transformBlogPost(record, existingSlugs),
    async (batch) => {
      // Insert posts
      const posts = batch.map((item) => item.post);
      await knex("blog_posts").insert(posts);

      // Collect sections for later insertion
      batch.forEach((item) => {
        allSections.push(...item.sections);
      });
    },
    { batchSize: 20, tableName: "blog_posts" }
  );

  // Print blog post statistics
  printMigrationStats(stats);

  // Insert all sections
  if (allSections.length > 0) {
    console.log(`\n✓ Inserting ${allSections.length} blog sections...`);
    await knex.batchInsert("blog_post_sections", allSections, 100);
  }

  // Verify migration
  const totalPosts = await knex("blog_posts").count("* as count").first();
  const totalSections = await knex("blog_post_sections")
    .count("* as count")
    .first();

  console.log("\n" + "=".repeat(60));
  console.log("Blog Migration Complete");
  console.log("=".repeat(60));
  console.log(`Total blog posts: ${totalPosts?.count}`);
  console.log(`Total sections: ${totalSections?.count}`);
  console.log("=".repeat(60) + "\n");
}