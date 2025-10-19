/**
 * Blog Post Model
 * Represents blog posts and content articles
 * Manages blog content, SEO, and publishing workflow
 *
 * @module models/blog-post.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Blog post entity interface
 * Represents a blog post or article
 */
export interface BlogPost {
  /** Unique identifier */
  id: number;

  /** Post title */
  title: string;

  /** URL-friendly slug */
  slug: string;

  /** Author name */
  authorName: string;

  /** Post category */
  category: string | null;

  /** Excerpt/summary */
  excerpt: string | null;

  /** Full content */
  content: string;

  /** Featured image URL */
  featuredImageUrl: string | null;

  /** SEO meta title */
  metaTitle: string | null;

  /** SEO meta description */
  metaDescription: string | null;

  /** Tags - JSON array */
  tags: string[] | null;

  /** Whether the post is published */
  isPublished: boolean;

  /** Publication timestamp */
  publishedAt: Date | null;

  /** View count */
  viewCount: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Soft delete timestamp */
  deletedAt: Date | null;
}

/**
 * Create blog post DTO
 */
export interface CreateBlogPostDto {
  title: string;
  slug: string;
  authorName: string;
  category?: string | null;
  excerpt?: string | null;
  content: string;
  featuredImageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  tags?: string[] | null;
  isPublished?: boolean;
  publishedAt?: Date | null;
}

/**
 * Update blog post DTO
 */
export interface UpdateBlogPostDto {
  title?: string;
  slug?: string;
  authorName?: string;
  category?: string | null;
  excerpt?: string | null;
  content?: string;
  featuredImageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  tags?: string[] | null;
  isPublished?: boolean;
  publishedAt?: Date | null;
}

/**
 * Blog post query parameters
 */
export interface BlogPostQueryParams extends BaseQueryParams {
  category?: string;
  authorName?: string;
  isPublished?: boolean;
  tag?: string;
  includeDeleted?: boolean;
}

/**
 * Blog post with relations
 */
export interface BlogPostWithRelations extends BlogPost {
  sections?: any[];
  galleryImages?: any[];
}

/**
 * Blog Post Model class
 * Handles all database operations for blog posts
 */
class BlogPostModel extends BaseModel<
  BlogPost,
  CreateBlogPostDto,
  UpdateBlogPostDto
> {
  protected tableName = "blog_posts";

  /**
   * Finds a blog post by slug
   *
   * @param slug - Post slug
   * @param includeDeleted - Whether to include soft-deleted posts
   * @returns Promise<BlogPost | null> - Post or null if not found
   *
   * @example
   * const post = await BlogPostModel.findBySlug("real-estate-trends-2025");
   */
  async findBySlug(
    slug: string,
    includeDeleted: boolean = false
  ): Promise<BlogPost | null> {
    let query = this.db(this.tableName).where({ slug });

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Finds all blog posts matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<BlogPost[]> - Array of posts
   *
   * @example
   * const posts = await BlogPostModel.findAll({
   *   isPublished: true,
   *   category: "news"
   * });
   */
  async findAll(params: BlogPostQueryParams = {}): Promise<BlogPost[]> {
    let query = this.db(this.tableName);

    if (!params.includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    if (params.isPublished !== undefined) {
      query = query.where({ is_published: params.isPublished });
    }

    if (params.category) {
      query = query.where({ category: params.category });
    }

    if (params.authorName) {
      query = query.where({ author_name: params.authorName });
    }

    if (params.tag) {
      query = query.whereRaw("JSON_CONTAINS(tags, ?)", [
        JSON.stringify(params.tag),
      ]);
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "desc");
    } else {
      query = query.orderBy("published_at", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const posts = await query;
    return posts.map(this.mapToEntity);
  }

  /**
   * Gets published blog posts
   *
   * @param limit - Maximum number of posts
   * @returns Promise<BlogPost[]> - Published posts
   *
   * @example
   * const posts = await BlogPostModel.getPublished(10);
   */
  async getPublished(limit?: number): Promise<BlogPost[]> {
    let query = this.db(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .orderBy("published_at", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const posts = await query;
    return posts.map(this.mapToEntity);
  }

  /**
   * Gets posts by category
   *
   * @param category - Category name
   * @returns Promise<BlogPost[]> - Category posts
   *
   * @example
   * const news = await BlogPostModel.getByCategory("news");
   */
  async getByCategory(category: string): Promise<BlogPost[]> {
    return this.findAll({ category, isPublished: true });
  }

  /**
   * Gets posts by tag
   *
   * @param tag - Tag name
   * @returns Promise<BlogPost[]> - Tagged posts
   *
   * @example
   * const tagged = await BlogPostModel.getByTag("investment");
   */
  async getByTag(tag: string): Promise<BlogPost[]> {
    return this.findAll({ tag, isPublished: true });
  }

  /**
   * Gets post with sections and gallery
   *
   * @param postId - Post ID
   * @returns Promise<BlogPostWithRelations | null> - Complete post data
   *
   * @example
   * const post = await BlogPostModel.getComplete(1);
   */
  async getComplete(postId: number): Promise<BlogPostWithRelations | null> {
    const post = await this.findById(postId);
    if (!post) return null;

    const [sections, galleryImages] = await Promise.all([
      this.db("blog_post_sections")
        .where({ blog_post_id: postId })
        .orderBy("display_order", "asc"),

      this.db("blog_post_gallery_images")
        .where({ blog_post_id: postId })
        .orderBy("display_order", "asc"),
    ]);

    return { ...post, sections, galleryImages };
  }

  /**
   * Publishes a blog post
   *
   * @param postId - Post ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await BlogPostModel.publish(1);
   */
  async publish(postId: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: postId }).update({
      is_published: true,
      published_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Unpublishes a blog post
   *
   * @param postId - Post ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await BlogPostModel.unpublish(1);
   */
  async unpublish(postId: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: postId }).update({
      is_published: false,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Increments view count
   *
   * @param postId - Post ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await BlogPostModel.incrementViewCount(1);
   */
  async incrementViewCount(postId: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: postId })
      .increment("view_count", 1);

    return updated > 0;
  }

  /**
   * Gets popular posts by view count
   *
   * @param limit - Maximum number of posts
   * @returns Promise<BlogPost[]> - Popular posts
   *
   * @example
   * const popular = await BlogPostModel.getPopular(5);
   */
  async getPopular(limit: number = 10): Promise<BlogPost[]> {
    const posts = await this.db(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .orderBy("view_count", "desc")
      .limit(limit);

    return posts.map(this.mapToEntity);
  }

  /**
   * Gets recent posts
   *
   * @param limit - Maximum number of posts
   * @returns Promise<BlogPost[]> - Recent posts
   *
   * @example
   * const recent = await BlogPostModel.getRecent(5);
   */
  async getRecent(limit: number = 10): Promise<BlogPost[]> {
    const posts = await this.db(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .orderBy("published_at", "desc")
      .limit(limit);

    return posts.map(this.mapToEntity);
  }

  /**
   * Searches posts by title or content
   *
   * @param query - Search query
   * @returns Promise<BlogPost[]> - Matching posts
   *
   * @example
   * const results = await BlogPostModel.search("real estate");
   */
  async search(query: string): Promise<BlogPost[]> {
    const posts = await this.db(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .where((builder) => {
        builder
          .where("title", "like", `%${query}%`)
          .orWhere("content", "like", `%${query}%`)
          .orWhere("excerpt", "like", `%${query}%`);
      })
      .orderBy("published_at", "desc");

    return posts.map(this.mapToEntity);
  }

  /**
   * Maps database record to BlogPost entity
   *
   * @param record - Database record
   * @returns BlogPost entity
   *
   * @protected
   */
  protected mapToEntity(record: any): BlogPost {
    return {
      id: record.id,
      title: record.title,
      slug: record.slug,
      authorName: record.author_name,
      category: record.category,
      excerpt: record.excerpt,
      content: record.content,
      featuredImageUrl: record.featured_image_url,
      metaTitle: record.meta_title,
      metaDescription: record.meta_description,
      tags: record.tags ? JSON.parse(record.tags) : null,
      isPublished: Boolean(record.is_published),
      publishedAt: record.published_at ? new Date(record.published_at) : null,
      viewCount: record.view_count || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

export default new BlogPostModel();
