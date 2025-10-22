/**
 * Content Management Controller
 * Handles blog posts and media galleries
 *
 * Routes:
 * - GET    /api/content/blog                    - Get all blog posts
 * - GET    /api/content/blog/:slug              - Get blog post by slug
 * - GET    /api/content/blog/published          - Get published posts
 * - GET    /api/content/blog/category/:category - Get posts by category
 * - GET    /api/content/blog/search             - Search blog posts
 *
 * - GET    /api/content/media/projects/:id      - Get project media
 * - GET    /api/content/media/apartments/:id    - Get apartment media
 * - GET    /api/content/media/commercial/:id    - Get commercial property media
 *
 * @module controllers/content.controller
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
   * Get all blog posts with filtering
   * @route GET /api/content/blog
   */
  getAllPosts = async (req: Request, res: Response): Promise<void> => {
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
   * Get blog post by slug
   * @route GET /api/content/blog/:slug
   */
  getPostBySlug = async (req: Request, res: Response): Promise<void> => {
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
   * Get published posts
   * @route GET /api/content/blog/published
   */
  getPublishedPosts = async (req: Request, res: Response): Promise<void> => {
    const { limit = 10 } = req.query;
    const posts = await BlogPostModel.getPublished(Number(limit));
    ApiResponse.success(res, posts, "Published posts retrieved successfully");
  };

  /**
   * Get posts by category
   * @route GET /api/content/blog/category/:category
   */
  getPostsByCategory = async (req: Request, res: Response): Promise<void> => {
    const { category } = req.params;
    const posts = await BlogPostModel.getByCategory(category);
    ApiResponse.success(
      res,
      posts,
      `Posts in category '${category}' retrieved successfully`
    );
  };

  /**
   * Search blog posts
   * @route GET /api/content/blog/search
   */
  searchPosts = async (req: Request, res: Response): Promise<void> => {
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
  };

  // ============================================
  // MEDIA GALLERIES
  // ============================================

  /**
   * Get all media for a project
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
   * Get all media for an apartment
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
   * Get all media for a commercial property
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
