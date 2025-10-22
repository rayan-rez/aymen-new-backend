/**
 * Unified Content Controller
 * Handles all content management: blog posts, media galleries, and assets
 *
 * REPLACES: blog.controller.ts, content.controller.ts (remove both)
 *
 * Routes:
 * - GET    /api/content/blog                     - List blog posts
 * - GET    /api/content/blog/:slug               - Get blog post by slug
 * - GET    /api/content/blog/category/:category  - Posts by category
 * - GET    /api/content/blog/tag/:tag            - Posts by tag
 * - GET    /api/content/media/projects/:id       - Project media gallery
 * - GET    /api/content/media/apartments/:id     - Apartment media gallery
 * - GET    /api/content/media/commercial/:id     - Commercial property media
 */

import { Request, Response } from "express";
import { BlogPostModel } from "@models";
import { ApiResponse } from "@utils/response.util";
import db from "@/config/database";

class ContentController {
  // ============================================
  // BLOG POSTS
  // ============================================

  /**
   * List all blog posts with filters
   * @route GET /api/content/blog
   */
  listBlogPosts = async (req: Request, res: Response): Promise<void> => {
    const { page, limit, category, tag, isPublished = true } = req.query;

    const posts = await BlogPostModel.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category: category as string,
      tag: tag as string,
      isPublished: isPublished === "true",
    });

    ApiResponse.success(res, posts, "Blog posts retrieved successfully");
  };

  /**
   * Get single blog post with content
   * @route GET /api/content/blog/:slug
   */
  getBlogPost = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;

    const post = await BlogPostModel.findBySlug(slug);

    if (!post) {
      ApiResponse.notFound(res, "Blog post not found");
      return;
    }

    await BlogPostModel.incrementViewCount(post.id);
    const completePost = await BlogPostModel.getComplete(post.id);

    ApiResponse.success(res, completePost, "Blog post retrieved successfully");
  };

  /**
   * Get posts by category
   * @route GET /api/content/blog/category/:category
   */
  getBlogPostsByCategory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { category } = req.params;
    const posts = await BlogPostModel.getByCategory(category);
    ApiResponse.success(res, posts, `Posts in category retrieved successfully`);
  };

  /**
   * Get posts by tag
   * @route GET /api/content/blog/tag/:tag
   */
  getBlogPostsByTag = async (req: Request, res: Response): Promise<void> => {
    const { tag } = req.params;
    const posts = await BlogPostModel.getByTag(tag);
    ApiResponse.success(res, posts, `Posts with tag retrieved successfully`);
  };

  /**
   * Search blog posts
   * @route GET /api/content/blog/search
   */
  searchBlogPosts = async (req: Request, res: Response): Promise<void> => {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      ApiResponse.badRequest(res, "Search query is required");
      return;
    }

    const posts = await BlogPostModel.search(q);
    ApiResponse.success(res, posts, `Found ${posts.length} posts`);
  };

  // ============================================
  // MEDIA GALLERIES
  // ============================================

  /**
   * Get project media (photos, floor plans, virtual tours)
   * @route GET /api/content/media/projects/:id
   */
  getProjectMedia = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [photos, floorPlans, virtualTours] = await Promise.all([
        db("project_photos")
          .where("project_id", Number(id))
          .orderBy("display_order", "asc"),
        db("floor_plans")
          .where("project_id", Number(id))
          .orderBy("display_order", "asc"),
        db("virtual_tours").where("project_id", Number(id)),
      ]);

      ApiResponse.success(
        res,
        { photos, floorPlans, virtualTours },
        "Project media retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectMedia:", error);
      ApiResponse.error(res, "Failed to retrieve project media", 500);
    }
  };

  /**
   * Get apartment media (photos, floor plans)
   * @route GET /api/content/media/apartments/:id
   */
  getApartmentMedia = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [photos, floorPlans] = await Promise.all([
        db("apartment_photos")
          .where("apartment_id", Number(id))
          .orderBy("display_order", "asc"),
        db("apartment_floor_plans")
          .where("apartment_id", Number(id))
          .orderBy("display_order", "asc"),
      ]);

      ApiResponse.success(
        res,
        { photos, floorPlans },
        "Apartment media retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getApartmentMedia:", error);
      ApiResponse.error(res, "Failed to retrieve apartment media", 500);
    }
  };

  /**
   * Get commercial property media
   * @route GET /api/content/media/commercial/:id
   */
  getCommercialMedia = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const photos = await db("commercial_property_photos")
        .where("property_id", Number(id))
        .orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        { photos },
        "Commercial property media retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getCommercialMedia:", error);
      ApiResponse.error(
        res,
        "Failed to retrieve commercial property media",
        500
      );
    }
  };
}

export default new ContentController();
