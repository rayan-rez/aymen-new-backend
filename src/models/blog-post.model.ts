/**
 * Blog Post Model - FIXED TO MATCH DATABASE SCHEMA
 * 
 * Removed fields that don't exist in migration:
 * - readingTimeMinutes, viewCount, metaTitle, metaDescription
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import { generateSlug } from "@/database/helpers";
import PhotoModel, { PhotoableType, Photo } from "./photo.model";
import { Knex } from "knex";
import type { BlogPostSection } from "./blog-post-section.model";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Blog post entity interface
 */
export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  authorName: string;
  category: string | null;
  excerpt: string | null;
  content: string;
  featuredImageUrl: string | null;
  tags: string[] | null;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations
  sections?: BlogPostSection[];
  photos?: Photo[];
}

/**
 * Create blog post DTO
 */
export interface CreateBlogPostDto {
  title: string;
  slug?: string;
  authorName: string;
  category?: string;
  excerpt?: string;
  content: string;
  featuredImageUrl?: string;
  tags?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
  publishedAt?: Date;
}

/**
 * Update blog post DTO
 */
export interface UpdateBlogPostDto extends Partial<CreateBlogPostDto> {}

/**
 * Blog post query options
 */
export interface BlogPostQueryOptions extends AdvancedQueryOptions {
  category?: string | string[];
  isPublished?: boolean;
  isFeatured?: boolean;
  authorName?: string;
  hasTag?: string;
  publishedAfter?: Date;
  publishedBefore?: Date;
  includePhotos?: boolean;
}


// ============================================================================
// BLOG POST MODEL CLASS
// ============================================================================

export class BlogPostModel extends BaseModel<
  BlogPost,
  CreateBlogPostDto,
  UpdateBlogPostDto
> {
  protected tableName = "blog_posts";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "published_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: ["title", "excerpt", "content", "author_name"],
    hiddenFields: [],
    fillable: [
      "title",
      "slug",
      "authorName",
      "category",
      "excerpt",
      "content",
      "featuredImageUrl",
      "tags",
      "isPublished",
      "isFeatured",
      "publishedAt"
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // Define relations
  protected relations = {
    sections: {
      type: "hasMany" as const,
      model: () => require("./blog-post-section.model").default,
      foreignKey: "blogPostId",
      localKey: "id",
    },
  };

  /**
   * Loads photos for a blog post
   */
  async loadPhotos(postId: number, trx?: Knex.Transaction): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.BLOG_POST, postId, {}, trx);
  }

  /**
   * Loads photos for multiple posts (optimized)
   */
  private async loadPhotosForMany(
    postIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, Photo[]>> {
    if (postIds.length === 0) return new Map();

    const photos = await PhotoModel.findPhotos(
      {
        polymorphicType: PhotoableType.BLOG_POST,
        polymorphicId: postIds,
      },
      trx
    );

    const photosByPost = new Map<number, Photo[]>();
    for (const photo of photos) {
      if (!photosByPost.has(photo.photoableId)) {
        photosByPost.set(photo.photoableId, []);
      }
      photosByPost.get(photo.photoableId)!.push(photo);
    }

    return photosByPost;
  }

  /**
   * Validates media before publishing
   */
  async validateMediaForPublishing(
    postId: number,
    trx?: Knex.Transaction
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const post = await this.findById(postId, {}, trx);
    if (!post) {
      errors.push("Post not found");
      return { valid: false, errors };
    }

    if (!post.featuredImageUrl) {
      errors.push("Featured image is required");
    }

    const photoCount = await PhotoModel.countForEntity(
      PhotoableType.BLOG_POST,
      postId,
      trx
    );

    if (photoCount === 0) {
      console.warn(`⚠️ Blog post ${postId} has no additional photos`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validate and generate slug
   */
  protected async beforeCreate(
    data: CreateBlogPostDto
  ): Promise<CreateBlogPostDto> {
    if (!data.slug) {
      data.slug = generateSlug(data.title);
    }

    const existing = await this.findBySlug(data.slug);
    if (existing) {
      data.slug = `${data.slug}-${Date.now()}`;
    }

    if (data.isPublished && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    return data;
  }

  protected async afterCreate(entity: BlogPost): Promise<void> {
    console.log(`✅ Blog post created: ${entity.title}`);
  }

  protected async beforeUpdate(
    id: number,
    data: UpdateBlogPostDto
  ): Promise<UpdateBlogPostDto> {
    const post = await this.findById(id);
    if (!post) {
      throw new Error("Blog post not found");
    }

    if (data.slug && data.slug !== post.slug) {
      const existing = await this.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Blog post slug "${data.slug}" already exists`);
      }
    }

    if (data.isPublished && !post.isPublished && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    if (data.isPublished && !post.isPublished) {
      const mediaValidation = await this.validateMediaForPublishing(id);
      if (!mediaValidation.valid) {
        throw new Error(
          `Cannot publish post: ${mediaValidation.errors.join(", ")}`
        );
      }
    }

    return data;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds blog posts with custom filters and photo loading
   */
  async findBlogPosts(
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = this.applyBlogFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    if (options.includePhotos) {
      const postIds = entities.map((e: DatabaseRecord) => e.id);
      const photosByPost = await this.loadPhotosForMany(postIds, trx);

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        photos: photosByPost.get(entity.id) || [],
      }));
    }

    return entities;
  }

  async paginateBlogPosts(
    options: BlogPostQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<BlogPost>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findBlogPosts(options, trx),
      this.countBlogPosts(options, trx),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Counts blog posts with filters
   */
  async countBlogPosts(
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    query = this.applyBlogFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Find blog post by slug with photos
   */
  async findBySlug(
    slug: string,
    options: {
      includeDeleted?: boolean;
      relations?: string[];
      includePhotos?: boolean;
    } = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost | null> {
    const post = await this.findOne({ slug }, options, trx);
    if (!post) return null;

    if (options.includePhotos) {
      const photos = await this.loadPhotos(post.id, trx);
      return {
        ...post,
        photos,
      };
    }

    return post;
  }

  /**
   * Finds published posts
   */
  async findPublished(
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts({ ...options, isPublished: true }, trx);
  }

  /**
   * Finds featured posts with photos
   */
  async findFeatured(
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts(
      {
        ...options,
        isPublished: true,
        isFeatured: true,
      },
      trx
    );
  }

  /**
   * Finds by category
   */
  async findByCategory(
    category: string,
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts({ ...options, category, isPublished: true }, trx);
  }

  /**
   * Finds by author
   */
  async findByAuthor(
    authorName: string,
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts(
      { ...options, authorName, isPublished: true },
      trx
    );
  }

  /**
   * Finds by tag
   */
  async findByTag(
    tag: string,
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts(
      { ...options, hasTag: tag, isPublished: true },
      trx
    );
  }

  /**
   * Full-text search
   */
  async fullTextSearch(
    searchTerm: string,
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return this.findBlogPosts(options, trx);
    }

    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = this.applyBlogFilters(query, options);

    query = query.whereRaw(
      `MATCH(title, excerpt, content) AGAINST(? IN BOOLEAN MODE)`,
      [`${searchTerm}*`]
    );

    query = query.orderByRaw(
      `MATCH(title, excerpt, content) AGAINST(? IN BOOLEAN MODE) DESC`,
      [`${searchTerm}*`]
    );

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * Gets recent posts
   */
  async getRecent(
    limit: number = 5,
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts(
      {
        isPublished: true,
        sortBy: "published_at",
        sortOrder: "desc",
        limit,
      },
      trx
    );
  }

  /**
   * Gets related posts (same category, excluding current)
   */
  async getRelated(
    postId: number,
    limit: number = 5,
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    const post = await this.findById(postId, {}, trx);
    if (!post || !post.category) return [];

    const connection = trx || this.db;

    const records = await connection(this.tableName)
      .where({ category: post.category, is_published: true })
      .where("id", "!=", postId)
      .whereNull("deleted_at")
      .orderBy("published_at", "desc")
      .limit(limit);

    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  // ============================================================================
  // PUBLISHING WORKFLOW
  // ============================================================================

  /**
   * Publishes a post
   */
  async publish(id: number, trx?: Knex.Transaction): Promise<BlogPost | null> {
    return this.update(id, { isPublished: true, publishedAt: new Date() }, trx);
  }

  /**
   * Unpublishes a post
   */
  async unpublish(
    id: number,
    trx?: Knex.Transaction
  ): Promise<BlogPost | null> {
    return this.update(id, { isPublished: false }, trx);
  }

  /**
   * Toggles featured status
   */
  async toggleFeatured(
    id: number,
    trx?: Knex.Transaction
  ): Promise<BlogPost | null> {
    const post = await this.findById(id, {}, trx);
    if (!post) return null;

    return this.update(id, { isFeatured: !post.isFeatured }, trx);
  }

  /**
   * Gets category statistics
   */
  async getCategoryStats(trx?: Knex.Transaction): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .select("category")
      .count("* as postCount")
      .groupBy("category")
      .orderBy("postCount", "desc");
  }

  /**
   * Gets author statistics
   */
  async getAuthorStats(trx?: Knex.Transaction): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .select("author_name")
      .count("* as postCount")
      .groupBy("author_name")
      .orderBy("postCount", "desc");
  }

  /**
   * Gets all unique categories
   */
  async getCategories(trx?: Knex.Transaction): Promise<string[]> {
    const connection = trx || this.db;

    const results = await connection(this.tableName)
      .distinct("category")
      .whereNotNull("category")
      .whereNull("deleted_at")
      .orderBy("category");

    return results.map((r: any) => r.category);
  }

  /**
   * Gets all unique tags
   */
  async getAllTags(trx?: Knex.Transaction): Promise<string[]> {
    const connection = trx || this.db;

    const results = await connection(this.tableName)
      .select("tags")
      .whereNotNull("tags")
      .whereNull("deleted_at");

    const allTags = new Set<string>();

    results.forEach((r: any) => {
      const tags = this.parseJsonArray<string>(r.tags);
      tags.forEach((tag) => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  }

  /**
   * Applies blog-specific filters to query
   */
  private applyBlogFilters(
    query: Knex.QueryBuilder,
    options: BlogPostQueryOptions
  ): Knex.QueryBuilder {
    if (options.category) {
      if (Array.isArray(options.category)) {
        query = query.whereIn("category", options.category);
      } else {
        query = query.where("category", options.category);
      }
    }

    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    if (options.isFeatured !== undefined) {
      query = query.where("is_featured", options.isFeatured);
    }

    if (options.authorName) {
      query = query.where("author_name", "like", `%${options.authorName}%`);
    }

    if (options.hasTag) {
      query = query.whereRaw("JSON_SEARCH(tags, 'one', ?) IS NOT NULL", [
        options.hasTag,
      ]);
    }

    if (options.publishedAfter) {
      query = query.where("published_at", ">=", options.publishedAfter);
    }
    if (options.publishedBefore) {
      query = query.where("published_at", "<=", options.publishedBefore);
    }

    return query;
  }

  /**
   * Maps database record to BlogPost entity
   */
  protected mapToEntity(record: DatabaseRecord): BlogPost {
    return {
      id: record.id,
      title: record.title,
      slug: record.slug,
      authorName: record.author_name,
      category: record.category,
      excerpt: record.excerpt,
      content: record.content,
      featuredImageUrl: record.featured_image_url,
      tags: this.parseJsonArray<string>(record.tags),
      isPublished: Boolean(record.is_published),
      isFeatured: Boolean(record.is_featured),
      publishedAt: record.published_at ? new Date(record.published_at) : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

export default new BlogPostModel();