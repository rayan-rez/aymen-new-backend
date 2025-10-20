/**
 * Blog Controller
 * Handles blog post operations and content management
 *
 * @module controllers/blog.controller
 */

import { Request, Response } from "express";
import { BlogPostModel } from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Blog Controller class
 * Manages blog posts and content operations
 */
class BlogController {
  /**
   * Get all blog posts
   *
   * @route GET /api/v1/blog
   * @access Public
   */
  async getAllPosts(req: Request, res: Response): Promise<void> {
    const {
      page,
      limit,
      category,
      tag,
      isPublished = true,
    } = req.query;

    const posts = await BlogPostModel.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category: category as string,
      tag: tag as string,
      isPublished: isPublished === "true",
    });

    ApiResponse.success(res, posts, "Blog posts retrieved successfully");
  }

  /**
   * Get blog post by slug
   *
   * @route GET /api/v1/blog/:slug
   * @access Public
   */
  async getPostBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;

    const post = await BlogPostModel.findBySlug(slug);

    if (!post) {
      ApiResponse.notFound(res, "Blog post not found");
      return;
    }

    // Increment view count
    await BlogPostModel.incrementViewCount(post.id);

    // Get complete post with sections and gallery
    const completePost = await BlogPostModel.getComplete(post.id);

    ApiResponse.success(res, completePost, "Blog post retrieved successfully");
  }

  /**
   * Get published posts
   *
   * @route GET /api/v1/blog/published
   * @access Public
   */
  async getPublishedPosts(req: Request, res: Response): Promise<void> {
    const { limit = 10 } = req.query;

    const posts = await BlogPostModel.getPublished(Number(limit));

    ApiResponse.success(res, posts, "Published posts retrieved successfully");
  }

  /**
   * Get posts by category
   *
   * @route GET /api/v1/blog/category/:category
   * @access Public
   */
  async getPostsByCategory(req: Request, res: Response): Promise<void> {
    const { category } = req.params;

    const posts = await BlogPostModel.getByCategory(category);

    ApiResponse.success(
      res,
      posts,
      `Posts in category '${category}' retrieved successfully`
    );
  }

  /**
   * Get posts by tag
   *
   * @route GET /api/v1/blog/tag/:tag
   * @access Public
   */
  async getPostsByTag(req: Request, res: Response): Promise<void> {
    const { tag } = req.params;

    const posts = await BlogPostModel.getByTag(tag);

    ApiResponse.success(
      res,
      posts,
      `Posts tagged with '${tag}' retrieved successfully`
    );
  }

  /**
   * Get popular posts
   *
   * @route GET /api/v1/blog/popular
   * @access Public
   */
  async getPopularPosts(req: Request, res: Response): Promise<void> {
    const { limit = 5 } = req.query;

    const posts = await BlogPostModel.getPopular(Number(limit));

    ApiResponse.success(res, posts, "Popular posts retrieved successfully");
  }

  /**
   * Get recent posts
   *
   * @route GET /api/v1/blog/recent
   * @access Public
   */
  async getRecentPosts(req: Request, res: Response): Promise<void> {
    const { limit = 5 } = req.query;

    const posts = await BlogPostModel.getRecent(Number(limit));

    ApiResponse.success(res, posts, "Recent posts retrieved successfully");
  }

  /**
   * Search blog posts
   *
   * @route GET /api/v1/blog/search
   * @access Public
   */
  async searchPosts(req: Request, res: Response): Promise<void> {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      ApiResponse.badRequest(res, "Search query is required");
      return;
    }

    const posts = await BlogPostModel.search(q);

    ApiResponse.success(
      res,
      posts,
      `Found ${posts.length} posts matching '${q}'`
    );
  }
}

export default new BlogController();