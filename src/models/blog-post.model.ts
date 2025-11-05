/**
 * Blog Post Model
 *
 * Manages blog posts with sections, SEO, and analytics
 * Supports featured posts, categories, tags, and view tracking
 *
 * @module models/blog-post.model
 * @class BlogPostModel
 *
 * @swagger
 * components:
 *   schemas:
 *     BlogPost:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - slug
 *         - authorName
 *         - content
 *         - isPublished
 *         - isFeatured
 *         - viewCount
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique blog post identifier
 *           example: 1
 *         title:
 *           type: string
 *           description: Blog post title
 *           example: "10 Tips for Modern Real Estate Investment"
 *         slug:
 *           type: string
 *           description: URL-friendly slug for the post
 *           example: "10-tips-modern-real-estate-investment"
 *         authorName:
 *           type: string
 *           description: Name of the post author
 *           example: "Jane Smith"
 *         category:
 *           type: string
 *           nullable: true
 *           description: Post category
 *           example: "Real Estate Tips"
 *         excerpt:
 *           type: string
 *           nullable: true
 *           description: Brief summary of the post
 *           example: "Discover essential strategies for successful real estate investment..."
 *         content:
 *           type: string
 *           description: Full blog post content
 *           example: "<h1>Introduction</h1><p>Real estate investment requires careful planning...</p>"
 *         featuredImageUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the featured image
 *           example: "https://cdn.example.com/images/blog/featured-real-estate.jpg"
 *         readingTimeMinutes:
 *           type: integer
 *           nullable: true
 *           description: Estimated reading time in minutes
 *           example: 8
 *         metaTitle:
 *           type: string
 *           nullable: true
 *           description: SEO meta title
 *           example: "10 Real Estate Investment Tips | Expert Guide"
 *         metaDescription:
 *           type: string
 *           nullable: true
 *           description: SEO meta description
 *           example: "Learn 10 essential real estate investment strategies from industry experts..."
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           nullable: true
 *           description: Array of tags for the post
 *           example: ["real estate", "investment", "tips", "property"]
 *         isPublished:
 *           type: boolean
 *           description: Whether the post is published and visible
 *           example: true
 *         isFeatured:
 *           type: boolean
 *           description: Whether the post is featured/highlighted
 *           example: false
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Publication timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         viewCount:
 *           type: integer
 *           minimum: 0
 *           description: Total number of views
 *           example: 1250
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-10T09:15:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Deletion timestamp (soft delete)
 *           example: null
 *         sections:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BlogPostSection'
 *           description: Associated content sections
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *           description: Associated photos
 *
 *     CreateBlogPostDto:
 *       type: object
 *       required:
 *         - title
 *         - authorName
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           description: Blog post title
 *           example: "10 Tips for Modern Real Estate Investment"
 *         slug:
 *           type: string
 *           description: URL-friendly slug (auto-generated if not provided)
 *           example: "10-tips-modern-real-estate-investment"
 *         authorName:
 *           type: string
 *           description: Name of the post author
 *           example: "Jane Smith"
 *         category:
 *           type: string
 *           description: Post category
 *           example: "Real Estate Tips"
 *         excerpt:
 *           type: string
 *           description: Brief summary of the post
 *           example: "Discover essential strategies for successful real estate investment..."
 *         content:
 *           type: string
 *           description: Full blog post content
 *           example: "<h1>Introduction</h1><p>Real estate investment requires careful planning...</p>"
 *         featuredImageUrl:
 *           type: string
 *           format: uri
 *           description: URL of the featured image
 *           example: "https://cdn.example.com/images/blog/featured-real-estate.jpg"
 *         readingTimeMinutes:
 *           type: integer
 *           description: Estimated reading time in minutes (auto-calculated if not provided)
 *           example: 8
 *         metaTitle:
 *           type: string
 *           description: SEO meta title
 *           example: "10 Real Estate Investment Tips | Expert Guide"
 *         metaDescription:
 *           type: string
 *           description: SEO meta description
 *           example: "Learn 10 essential real estate investment strategies from industry experts..."
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of tags for the post
 *           example: ["real estate", "investment", "tips", "property"]
 *         isPublished:
 *           type: boolean
 *           description: Whether to publish the post immediately
 *           example: false
 *         isFeatured:
 *           type: boolean
 *           description: Whether to mark as featured post
 *           example: false
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Custom publication timestamp
 *           example: "2024-01-15T10:30:00Z"
 *
 *     UpdateBlogPostDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateBlogPostDto'
 *         - type: object
 *           description: All fields from CreateBlogPostDto are optional for updates
 *
 *     BlogPostQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             category:
 *               oneOf:
 *                 - type: string
 *                   description: Single category filter
 *                   example: "Real Estate Tips"
 *                 - type: array
 *                   items:
 *                     type: string
 *                   description: Multiple category filter
 *                   example: ["Real Estate Tips", "Market Analysis"]
 *             isPublished:
 *               type: boolean
 *               description: Filter by published status
 *               example: true
 *             isFeatured:
 *               type: boolean
 *               description: Filter by featured status
 *               example: false
 *             authorName:
 *               type: string
 *               description: Filter by author name (partial match)
 *               example: "Jane Smith"
 *             hasTag:
 *               type: string
 *               description: Filter posts containing specific tag
 *               example: "investment"
 *             publishedAfter:
 *               type: string
 *               format: date-time
 *               description: Filter posts published after this date
 *               example: "2024-01-01T00:00:00Z"
 *             publishedBefore:
 *               type: string
 *               format: date-time
 *               description: Filter posts published before this date
 *               example: "2024-12-31T23:59:59Z"
 *             includePhotos:
 *               type: boolean
 *               description: Include associated photos in response
 *               example: true
 *
 *     BlogPostWithStats:
 *       allOf:
 *         - $ref: '#/components/schemas/BlogPost'
 *         - type: object
 *           required:
 *             - stats
 *           properties:
 *             stats:
 *               type: object
 *               required:
 *                 - sectionCount
 *                 - estimatedReadTime
 *                 - engagementRate
 *               properties:
 *                 sectionCount:
 *                   type: integer
 *                   description: Number of content sections
 *                   example: 5
 *                 estimatedReadTime:
 *                   type: string
 *                   description: Human-readable reading time
 *                   example: "8 min read"
 *                 engagementRate:
 *                   type: number
 *                   format: float
 *                   description: Calculated engagement rate (0-100)
 *                   example: 75.5
 *
 *     CategoryStats:
 *       type: object
 *       required:
 *         - category
 *         - postCount
 *         - totalViews
 *       properties:
 *         category:
 *           type: string
 *           description: Category name
 *           example: "Real Estate Tips"
 *         postCount:
 *           type: integer
 *           description: Number of posts in this category
 *           example: 15
 *         totalViews:
 *           type: integer
 *           description: Total views for all posts in category
 *           example: 18500
 *
 *     AuthorStats:
 *       type: object
 *       required:
 *         - authorName
 *         - postCount
 *         - totalViews
 *       properties:
 *         authorName:
 *           type: string
 *           description: Author name
 *           example: "Jane Smith"
 *         postCount:
 *           type: integer
 *           description: Number of posts by this author
 *           example: 8
 *         totalViews:
 *           type: integer
 *           description: Total views for all posts by author
 *           example: 12500
 *
 *     PostStats:
 *       type: object
 *       required:
 *         - sectionCount
 *         - estimatedReadTime
 *         - engagementRate
 *       properties:
 *         sectionCount:
 *           type: integer
 *           description: Number of content sections
 *           example: 5
 *         estimatedReadTime:
 *           type: string
 *           description: Human-readable reading time
 *           example: "8 min read"
 *         engagementRate:
 *           type: number
 *           format: float
 *           description: Calculated engagement rate (0-100)
 *           example: 75.5
 *
 *   responses:
 *     BlogPostResponse:
 *       description: Blog post data response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlogPost'
 *
 *     BlogPostListResponse:
 *       description: Paginated blog post list response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaginatedResult'
 *           example:
 *             items:
 *               - id: 1
 *                 title: "10 Tips for Modern Real Estate Investment"
 *                 slug: "10-tips-modern-real-estate-investment"
 *                 authorName: "Jane Smith"
 *                 category: "Real Estate Tips"
 *                 isPublished: true
 *                 viewCount: 1250
 *             pagination:
 *               total: 50
 *               page: 1
 *               limit: 10
 *               totalPages: 5
 *               hasNextPage: true
 *               hasPrevPage: false
 *
 *     CategoryListResponse:
 *       description: List of unique categories response
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: string
 *             example: ["Real Estate Tips", "Market Analysis", "Investment Guide"]
 *
 *     TagListResponse:
 *       description: List of unique tags response
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: string
 *             example: ["real estate", "investment", "tips", "property"]
 *
 *   parameters:
 *     BlogPostSlugParam:
 *       name: slug
 *       in: path
 *       description: Blog post slug
 *       required: true
 *       schema:
 *         type: string
 *       example: "10-tips-modern-real-estate-investment"
 *
 *     CategoryParam:
 *       name: category
 *       in: query
 *       description: Filter by category
 *       required: false
 *       schema:
 *         type: string
 *       example: "Real Estate Tips"
 *
 *     AuthorParam:
 *       name: authorName
 *       in: query
 *       description: Filter by author name
 *       required: false
 *       schema:
 *         type: string
 *       example: "Jane Smith"
 *
 *     TagParam:
 *       name: hasTag
 *       in: query
 *       description: Filter by tag
 *       required: false
 *       schema:
 *         type: string
 *       example: "investment"
 *
 *     PublishedAfterParam:
 *       name: publishedAfter
 *       in: query
 *       description: Filter posts published after this date
 *       required: false
 *       schema:
 *         type: string
 *         format: date-time
 *       example: "2024-01-01T00:00:00Z"
 *
 *     PublishedBeforeParam:
 *       name: publishedBefore
 *       in: query
 *       description: Filter posts published before this date
 *       required: false
 *       schema:
 *         type: string
 *         format: date-time
 *       example: "2024-12-31T23:59:59Z"
 *
 *     SearchTermParam:
 *       name: search
 *       in: query
 *       description: Search term for full-text search
 *       required: false
 *       schema:
 *         type: string
 *       example: "real estate investment"
 *
 * tags:
 *   - name: Blog Posts
 *     description: Blog post management operations
 *     x-traitTag: true
 *
 * Features:
 * - Full-featured blog post management with rich content support
 * - SEO optimization with meta tags and structured data
 * - Content sections for organized article structure
 * - Featured post system for highlighting important content
 * - Category and tag-based organization
 * - Author management and attribution
 * - View tracking and analytics
 * - Reading time calculation
 * - Full-text search capabilities
 * - Publishing workflow with scheduled publishing
 * - Media management with photo support
 * - Social media integration ready
 * - Slug generation and uniqueness validation
 * - Content validation and media requirements
 * - Related posts suggestion system
 * - Popular and recent posts queries
 * - Comprehensive statistics and analytics
 * - Batch operations support
 * - Soft delete with restore capability
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
import type { BlogPostSection } from "./content-management.model";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * Blog post entity representing a content article
 *
 * @interface BlogPost
 * @property {number} id - Unique blog post identifier
 * @property {string} title - Blog post title
 * @property {string} slug - URL-friendly slug
 * @property {string} authorName - Name of the post author
 * @property {string|null} category - Post category
 * @property {string|null} excerpt - Brief summary of the post
 * @property {string} content - Full blog post content
 * @property {string|null} featuredImageUrl - URL of the featured image
 * @property {number|null} readingTimeMinutes - Estimated reading time in minutes
 * @property {string|null} metaTitle - SEO meta title
 * @property {string|null} metaDescription - SEO meta description
 * @property {string[]|null} tags - Array of tags for the post
 * @property {boolean} isPublished - Whether the post is published and visible
 * @property {boolean} isFeatured - Whether the post is featured/highlighted
 * @property {Date|null} publishedAt - Publication timestamp
 * @property {number} viewCount - Total number of views
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {Date|null} deletedAt - Deletion timestamp (soft delete)
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
  readingTimeMinutes: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string[] | null;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: Date | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations
  sections?: BlogPostSection[];
  photos?: Photo[];
}

/**
 * @openapi
 * Data transfer object for creating a new blog post
 *
 * @interface CreateBlogPostDto
 * @property {string} title - Blog post title (required)
 * @property {string} slug - URL-friendly slug (auto-generated if not provided)
 * @property {string} authorName - Name of the post author (required)
 * @property {string} category - Post category
 * @property {string} excerpt - Brief summary of the post
 * @property {string} content - Full blog post content (required)
 * @property {string} featuredImageUrl - URL of the featured image
 * @property {number} readingTimeMinutes - Estimated reading time in minutes
 * @property {string} metaTitle - SEO meta title
 * @property {string} metaDescription - SEO meta description
 * @property {string[]} tags - Array of tags for the post
 * @property {boolean} isPublished - Whether to publish the post immediately
 * @property {boolean} isFeatured - Whether to mark as featured post
 * @property {Date} publishedAt - Custom publication timestamp
 */
export interface CreateBlogPostDto {
  title: string;
  slug?: string;
  authorName: string;
  category?: string;
  excerpt?: string;
  content: string;
  featuredImageUrl?: string;
  readingTimeMinutes?: number;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
  publishedAt?: Date;
}

/**
 * @openapi
 * Data transfer object for updating an existing blog post
 * All fields are optional - only provided fields will be updated
 *
 * @interface UpdateBlogPostDto
 * @extends Partial<CreateBlogPostDto>
 */
export interface UpdateBlogPostDto extends Partial<CreateBlogPostDto> {}

/**
 * @openapi
 * Extended query options for blog post-specific filtering
 *
 * @interface BlogPostQueryOptions
 * @extends AdvancedQueryOptions
 * @property {string|string[]} category - Filter by category
 * @property {boolean} isPublished - Filter by published status
 * @property {boolean} isFeatured - Filter by featured status
 * @property {string} authorName - Filter by author name
 * @property {string} hasTag - Filter posts containing specific tag
 * @property {Date} publishedAfter - Filter posts published after this date
 * @property {Date} publishedBefore - Filter posts published before this date
 * @property {boolean} includePhotos - Include associated photos in response
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

/**
 * @openapi
 * Blog post entity with additional statistics for analytics
 *
 * @interface BlogPostWithStats
 * @extends BlogPost
 * @property {object} stats - Statistics object
 * @property {number} stats.sectionCount - Number of content sections
 * @property {string} stats.estimatedReadTime - Human-readable reading time
 * @property {number} stats.engagementRate - Calculated engagement rate
 */
export interface BlogPostWithStats extends BlogPost {
  stats: {
    sectionCount: number;
    estimatedReadTime: string;
    engagementRate: number;
  };
}

// ============================================================================
// BLOG POST MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Blog Post Model Class
 *
 * Manages blog post entities with comprehensive CRUD operations, advanced filtering,
 * SEO optimization, content management, and analytics.
 *
 * @class BlogPostModel
 * @extends BaseModel<BlogPost, CreateBlogPostDto, UpdateBlogPostDto>
 *
 * @example
 * ```typescript
 * // Create a new blog post
 * const post = await blogPostModel.create({
 *   title: "10 Tips for Modern Real Estate Investment",
 *   authorName: "Jane Smith",
 *   content: "<h1>Introduction</h1><p>Real estate investment requires...</p>",
 *   category: "Real Estate Tips",
 *   tags: ["real estate", "investment", "tips"],
 *   isPublished: true
 * });
 *
 * // Find published posts by category
 * const posts = await blogPostModel.findByCategory("Real Estate Tips", {
 *   limit: 10,
 *   includePhotos: true
 * });
 *
 * // Full-text search
 * const searchResults = await blogPostModel.fullTextSearch("investment tips");
 * ```
 */
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
      "readingTimeMinutes",
      "metaTitle",
      "metaDescription",
      "tags",
      "isPublished",
      "isFeatured",
      "publishedAt",
      "viewCount",
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

  // ============================================================================
  // MEDIA LOADING METHODS
  // ============================================================================

  /**
   * @openapi
   * Loads photos for a specific blog post
   *
   * @param {number} postId - The blog post ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos associated with the blog post
   *
   * @example
   * ```typescript
   * const photos = await blogPostModel.loadPhotos(123);
   * console.log(`Found ${photos.length} photos`);
   * ```
   */
  async loadPhotos(postId: number, trx?: Knex.Transaction): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.BLOG_POST, postId, {}, trx);
  }

  /**
   * @openapi
   * Loads photos for multiple blog posts (optimized batch loading)
   *
   * @param {number[]} postIds - Array of blog post IDs
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Map<number, Photo[]>>} Map of post ID to photos array
   *
   * @private
   * @example
   * ```typescript
   * const photosByPost = await blogPostModel.loadPhotosForMany([1, 2, 3]);
   * const photosForPost1 = photosByPost.get(1);
   * ```
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
   * @openapi
   * Validates media requirements before publishing a blog post
   *
   * @param {number} postId - The blog post ID to validate
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Validation result
   * @property {boolean} valid - Whether all media requirements are met
   * @property {string[]} errors - Array of validation error messages
   *
   * @example
   * ```typescript
   * const validation = await blogPostModel.validateMediaForPublishing(123);
   * if (!validation.valid) {
   *   console.log("Validation errors:", validation.errors);
   * }
   * ```
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

    // Check for featured image
    if (!post.featuredImageUrl) {
      errors.push("Featured image is required");
    }

    // Optional: Check for additional photos
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
   * @openapi
   * Before create hook - validates data, generates slug, calculates reading time
   *
   * @param {CreateBlogPostDto} data - Blog post creation data
   * @returns {Promise<CreateBlogPostDto>} Validated and processed data
   * @throws {Error} When validation fails
   *
   * @private
   * @lifecycle
   */
  protected async beforeCreate(
    data: CreateBlogPostDto
  ): Promise<CreateBlogPostDto> {
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.title);
    }

    // Validate slug uniqueness
    const existing = await this.findBySlug(data.slug);
    if (existing) {
      data.slug = `${data.slug}-${Date.now()}`;
    }

    // Calculate reading time if not provided
    if (!data.readingTimeMinutes && data.content) {
      data.readingTimeMinutes = this.calculateReadingTime(data.content);
    }

    // Set published timestamp if publishing
    if (data.isPublished && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    return data;
  }

  /**
   * @openapi
   * After create hook - logs blog post creation
   *
   * @param {BlogPost} entity - Created blog post entity
   * @returns {Promise<void>}
   *
   * @private
   * @lifecycle
   */
  protected async afterCreate(entity: BlogPost): Promise<void> {
    console.log(`✅ Blog post created: ${entity.title}`);
  }

  /**
   * @openapi
   * Before update hook - validates changes, handles slug changes, recalculates reading time
   *
   * @param {number} id - Blog post ID being updated
   * @param {UpdateBlogPostDto} data - Update data
   * @returns {Promise<UpdateBlogPostDto>} Validated update data
   * @throws {Error} When validation fails
   *
   * @private
   * @lifecycle
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateBlogPostDto
  ): Promise<UpdateBlogPostDto> {
    const post = await this.findById(id);
    if (!post) {
      throw new Error("Blog post not found");
    }

    // Validate slug uniqueness if changing
    if (data.slug && data.slug !== post.slug) {
      const existing = await this.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Blog post slug "${data.slug}" already exists`);
      }
    }

    // Recalculate reading time if content changes
    if (data.content && !data.readingTimeMinutes) {
      data.readingTimeMinutes = this.calculateReadingTime(data.content);
    }

    // Set published timestamp if publishing
    if (data.isPublished && !post.isPublished && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    // If publishing, validate media
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
   * @openapi
   * Finds blog posts with custom filters and optional photo loading
   *
   * @param {BlogPostQueryOptions} [options={}] - Query options for filtering and photo loading
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of blog posts matching the criteria
   *
   * @example
   * ```typescript
   * // Find published posts by category with photos
   * const posts = await blogPostModel.findBlogPosts({
   *   category: "Real Estate Tips",
   *   isPublished: true,
   *   includePhotos: true,
   *   sortBy: 'published_at',
   *   sortOrder: 'desc',
   *   limit: 10
   * });
   * ```
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

    // Load standard relations
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    // Load photos if requested
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

  /**
   * @openapi
   * Gets paginated blog posts with comprehensive filtering
   *
   * @param {BlogPostQueryOptions & {page: number, limit: number}} options - Query options with pagination
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<BlogPost>>} Paginated result with blog posts and metadata
   *
   * @example
   * ```typescript
   * const result = await blogPostModel.paginateBlogPosts({
   *   page: 1,
   *   limit: 10,
   *   isPublished: true,
   *   category: "Real Estate Tips",
   *   includePhotos: true
   * });
   * console.log(`Page ${result.pagination.page} of ${result.pagination.totalPages}`);
   * ```
   */
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
   * @openapi
   * Counts blog posts matching the specified filters
   *
   * @param {BlogPostQueryOptions} [options={}] - Query options for filtering
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of matching blog posts
   *
   * @example
   * ```typescript
   * const count = await blogPostModel.countBlogPosts({
   *   isPublished: true,
   *   category: "Real Estate Tips",
   *   authorName: "Jane Smith"
   * });
   * console.log(`Found ${count} blog posts`);
   * ```
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
   * @openapi
   * Finds blog post by slug with optional photo loading
   *
   * @param {string} slug - The blog post slug
   * @param {Object} [options] - Options for photo loading
   * @param {boolean} [options.includeDeleted=false] - Whether to include soft-deleted posts
   * @param {string[]} [options.relations=[]] - Relations to load
   * @param {boolean} [options.includePhotos=false] - Whether to include photos
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost|null>} Blog post with loaded photos or null if not found
   *
   * @example
   * ```typescript
   * const post = await blogPostModel.findBySlug("10-tips-modern-real-estate-investment", {
   *   includePhotos: true
   * });
   * if (post) {
   *   console.log(`Photos: ${post.photos?.length}`);
   * }
   * ```
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

    // Load photos if requested
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
   * @openapi
   * Finds published blog posts
   *
   * @param {BlogPostQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of published blog posts
   *
   * @example
   * ```typescript
   * const publishedPosts = await blogPostModel.findPublished({
   *   category: "Real Estate Tips",
   *   limit: 10
   * });
   * ```
   */
  async findPublished(
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts({ ...options, isPublished: true }, trx);
  }

  /**
   * @openapi
   * Finds featured blog posts (published and featured)
   *
   * @param {BlogPostQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of featured blog posts
   *
   * @example
   * ```typescript
   * const featuredPosts = await blogPostModel.findFeatured({
   *   limit: 5,
   *   includePhotos: true
   * });
   * ```
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
   * @openapi
   * Finds blog posts by category
   *
   * @param {string} category - The category to filter by
   * @param {BlogPostQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of blog posts in the specified category
   *
   * @example
   * ```typescript
   * const categoryPosts = await blogPostModel.findByCategory("Real Estate Tips", {
   *   limit: 10,
   *   sortBy: 'published_at',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  async findByCategory(
    category: string,
    options: BlogPostQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts({ ...options, category, isPublished: true }, trx);
  }

  /**
   * @openapi
   * Finds blog posts by author
   *
   * @param {string} authorName - The author name to filter by
   * @param {BlogPostQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of blog posts by the specified author
   *
   * @example
   * ```typescript
   * const authorPosts = await blogPostModel.findByAuthor("Jane Smith", {
   *   limit: 10
   * });
   * ```
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
   * @openapi
   * Finds blog posts by tag
   *
   * @param {string} tag - The tag to filter by
   * @param {BlogPostQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of blog posts containing the specified tag
   *
   * @example
   * ```typescript
   * const tagPosts = await blogPostModel.findByTag("investment", {
   *   limit: 10
   * });
   * ```
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
   * @openapi
   * Performs full-text search on blog posts
   *
   * @param {string} searchTerm - The search term
   * @param {BlogPostQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of blog posts matching the search term
   *
   * @example
   * ```typescript
   * const searchResults = await blogPostModel.fullTextSearch("real estate investment", {
   *   limit: 20,
   *   includePhotos: true
   * });
   * ```
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

    // Apply blog-specific filters
    query = this.applyBlogFilters(query, options);

    // Use MySQL MATCH AGAINST for full-text search
    query = query.whereRaw(
      `MATCH(title, excerpt, content) AGAINST(? IN BOOLEAN MODE)`,
      [`${searchTerm}*`]
    );

    // Order by relevance
    query = query.orderByRaw(
      `MATCH(title, excerpt, content) AGAINST(? IN BOOLEAN MODE) DESC`,
      [`${searchTerm}*`]
    );

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * @openapi
   * Gets recent blog posts
   *
   * @param {number} [limit=5] - Number of posts to retrieve
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of recent published blog posts
   *
   * @example
   * ```typescript
   * const recentPosts = await blogPostModel.getRecent(10);
   * ```
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
   * @openapi
   * Gets popular blog posts by view count
   *
   * @param {number} [limit=5] - Number of posts to retrieve
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of most viewed blog posts
   *
   * @example
   * ```typescript
   * const popularPosts = await blogPostModel.getPopular(10);
   * ```
   */
  async getPopular(
    limit: number = 5,
    trx?: Knex.Transaction
  ): Promise<BlogPost[]> {
    return this.findBlogPosts(
      {
        isPublished: true,
        sortBy: "view_count",
        sortOrder: "desc",
        limit,
      },
      trx
    );
  }

  /**
   * @openapi
   * Gets related blog posts (same category, excluding current post)
   *
   * @param {number} postId - The current blog post ID
   * @param {number} [limit=5] - Number of related posts to retrieve
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost[]>} Array of related blog posts
   *
   * @example
   * ```typescript
   * const relatedPosts = await blogPostModel.getRelated(123, 5);
   * ```
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
   * @openapi
   * Publishes a blog post
   *
   * @param {number} id - Blog post ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost|null>} Updated blog post or null if not found
   *
   * @example
   * ```typescript
   * const published = await blogPostModel.publish(123);
   * ```
   */
  async publish(id: number, trx?: Knex.Transaction): Promise<BlogPost | null> {
    return this.update(id, { isPublished: true, publishedAt: new Date() }, trx);
  }

  /**
   * @openapi
   * Unpublishes a blog post
   *
   * @param {number} id - Blog post ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost|null>} Updated blog post or null if not found
   *
   * @example
   * ```typescript
   * const unpublished = await blogPostModel.unpublish(123);
   * ```
   */
  async unpublish(
    id: number,
    trx?: Knex.Transaction
  ): Promise<BlogPost | null> {
    return this.update(id, { isPublished: false }, trx);
  }

  /**
   * @openapi
   * Toggles featured status of a blog post
   *
   * @param {number} id - Blog post ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPost|null>} Updated blog post or null if not found
   *
   * @example
   * ```typescript
   * const toggled = await blogPostModel.toggleFeatured(123);
   * ```
   */
  async toggleFeatured(
    id: number,
    trx?: Knex.Transaction
  ): Promise<BlogPost | null> {
    const post = await this.findById(id, {}, trx);
    if (!post) return null;

    return this.update(id, { isFeatured: !post.isFeatured }, trx);
  }

  // ============================================================================
  // ANALYTICS METHODS
  // ============================================================================

  /**
   * @openapi
   * Increments view count for a blog post
   *
   * @param {number} id - Blog post ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} Whether the update was successful
   *
   * @example
   * ```typescript
   * const success = await blogPostModel.incrementViewCount(123);
   * if (success) {
   *   console.log("View count incremented");
   * }
   * ```
   */
  async incrementViewCount(
    id: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    const updated = await connection(this.tableName)
      .where({ id })
      .increment("view_count", 1);

    return updated > 0;
  }

  /**
   * @openapi
   * Gets blog post with additional statistics
   *
   * @param {number} id - Blog post ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<BlogPostWithStats|null>} Blog post with statistics or null if not found
   *
   * @example
   * ```typescript
   * const postWithStats = await blogPostModel.getWithStats(123);
   * if (postWithStats) {
   *   console.log(`Sections: ${postWithStats.stats.sectionCount}`);
   *   console.log(`Read time: ${postWithStats.stats.estimatedReadTime}`);
   * }
   * ```
   */
  async getWithStats(
    id: number,
    trx?: Knex.Transaction
  ): Promise<BlogPostWithStats | null> {
    const post = await this.findById(id, {}, trx);
    if (!post) return null;

    const stats = await this.getPostStats(id, trx);

    return {
      ...post,
      stats,
    };
  }

  /**
   * @openapi
   * Gets statistics for a specific blog post
   *
   * @param {number} postId - Blog post ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Post statistics object
   *
   * @example
   * ```typescript
   * const stats = await blogPostModel.getPostStats(123);
   * console.log(`Sections: ${stats.sectionCount}`);
   * console.log(`Read time: ${stats.estimatedReadTime}`);
   * ```
   */
  async getPostStats(
    postId: number,
    trx?: Knex.Transaction
  ): Promise<BlogPostWithStats["stats"]> {
    const connection = trx || this.db;

    // Get section count
    const [sectionCount] = await connection("blog_post_sections")
      .where({ blog_post_id: postId })
      .count("* as count");

    const post = await this.findById(postId, {}, trx);

    return {
      sectionCount: Number(sectionCount.count),
      estimatedReadTime: post?.readingTimeMinutes
        ? `${post.readingTimeMinutes} min read`
        : "Unknown",
      engagementRate: 0, // TODO: Calculate based on views, comments, shares
    };
  }

  /**
   * @openapi
   * Gets category statistics (post count and total views)
   *
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object[]>} Array of category statistics
   *
   * @example
   * ```typescript
   * const categoryStats = await blogPostModel.getCategoryStats();
   * categoryStats.forEach(stat => {
   *   console.log(`${stat.category}: ${stat.postCount} posts, ${stat.totalViews} views`);
   * });
   * ```
   */
  async getCategoryStats(trx?: Knex.Transaction): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .select("category")
      .count("* as postCount")
      .sum("view_count as totalViews")
      .groupBy("category")
      .orderBy("postCount", "desc");
  }

  /**
   * @openapi
   * Gets author statistics (post count and total views)
   *
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object[]>} Array of author statistics
   *
   * @example
   * ```typescript
   * const authorStats = await blogPostModel.getAuthorStats();
   * authorStats.forEach(stat => {
   *   console.log(`${stat.authorName}: ${stat.postCount} posts, ${stat.totalViews} views`);
   * });
   * ```
   */
  async getAuthorStats(trx?: Knex.Transaction): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .select("author_name")
      .count("* as postCount")
      .sum("view_count as totalViews")
      .groupBy("author_name")
      .orderBy("postCount", "desc");
  }

  /**
   * @openapi
   * Gets all unique categories
   *
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<string[]>} Array of unique category names
   *
   * @example
   * ```typescript
   * const categories = await blogPostModel.getCategories();
   * console.log("Available categories:", categories);
   * ```
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
   * @openapi
   * Gets all unique tags across all blog posts
   *
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<string[]>} Array of unique tag names
   *
   * @example
   * ```typescript
   * const allTags = await blogPostModel.getAllTags();
   * console.log("All available tags:", allTags);
   * ```
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

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * @openapi
   * Calculates reading time based on content length
   * Uses average reading speed of 200 words per minute
   *
   * @param {string} content - Blog post content
   * @returns {number} Estimated reading time in minutes (minimum 1)
   *
   * @private
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(1, minutes); // At least 1 minute
  }

  /**
   * @openapi
   * Applies blog post-specific filters to a query
   *
   * @param {Knex.QueryBuilder} query - The query builder to modify
   * @param {BlogPostQueryOptions} options - Blog post query options
   * @returns {Knex.QueryBuilder} Modified query builder with filters applied
   *
   * @private
   */
  private applyBlogFilters(
    query: Knex.QueryBuilder,
    options: BlogPostQueryOptions
  ): Knex.QueryBuilder {
    // Category filter
    if (options.category) {
      if (Array.isArray(options.category)) {
        query = query.whereIn("category", options.category);
      } else {
        query = query.where("category", options.category);
      }
    }

    // Published filter
    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    // Featured filter
    if (options.isFeatured !== undefined) {
      query = query.where("is_featured", options.isFeatured);
    }

    // Author filter
    if (options.authorName) {
      query = query.where("author_name", "like", `%${options.authorName}%`);
    }

    // Tag filter (JSON search)
    if (options.hasTag) {
      query = query.whereRaw("JSON_SEARCH(tags, 'one', ?) IS NOT NULL", [
        options.hasTag,
      ]);
    }

    // Published date range
    if (options.publishedAfter) {
      query = query.where("published_at", ">=", options.publishedAfter);
    }
    if (options.publishedBefore) {
      query = query.where("published_at", "<=", options.publishedBefore);
    }

    return query;
  }

  /**
   * @openapi
   * Maps database record to BlogPost entity
   *
   * @param {DatabaseRecord} record - Database record
   * @returns {BlogPost} Mapped blog post entity
   *
   * @override
   * @protected
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
      readingTimeMinutes: record.reading_time_minutes,
      metaTitle: record.meta_title,
      metaDescription: record.meta_description,
      tags: this.parseJsonArray<string>(record.tags),
      isPublished: Boolean(record.is_published),
      isFeatured: Boolean(record.is_featured),
      publishedAt: record.published_at ? new Date(record.published_at) : null,
      viewCount: record.view_count || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// Export singleton instance
export default new BlogPostModel();
