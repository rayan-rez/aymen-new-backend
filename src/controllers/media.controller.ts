/**
 * Media Controller (Unified)
 * Handles ALL media operations: photos, floor plans, virtual tours, and galleries
 *
 * REPLACES:
 * - photo.controller.ts (DELETE THIS FILE)
 * - content.controller.ts (DELETE THIS FILE)
 *
 * @module controllers/media.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import { BlogPostModel } from "@models";
import db from "@/config/database";

class MediaController {
  // ============================================
  // BLOG CONTENT
  // ============================================

  /**
   * @route GET /api/media/blog
   * @desc Get all blog posts with filters
   * @access Public
   */
  getBlogPosts = async (req: Request, res: Response): Promise<void> => {
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
   * @route GET /api/media/blog/:slug
   * @desc Get single blog post by slug
   * @access Public
   */
  getBlogPostBySlug = async (req: Request, res: Response): Promise<void> => {
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
   * @route GET /api/media/blog/category/:category
   * @desc Get blog posts by category
   * @access Public
   */
  getBlogPostsByCategory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { category } = req.params;
    const posts = await BlogPostModel.getByCategory(category);
    ApiResponse.success(res, posts, "Posts retrieved successfully");
  };

  /**
   * @route GET /api/media/blog/tag/:tag
   * @desc Get blog posts by tag
   * @access Public
   */
  getBlogPostsByTag = async (req: Request, res: Response): Promise<void> => {
    const { tag } = req.params;
    const posts = await BlogPostModel.getByTag(tag);
    ApiResponse.success(res, posts, "Posts retrieved successfully");
  };

  /**
   * @route GET /api/media/blog/search
   * @desc Search blog posts
   * @access Public
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
  // PROJECT MEDIA
  // ============================================

  /**
   * @route GET /api/media/projects/:projectId
   * @desc Get all media for a project (photos, floor plans, virtual tours)
   * @access Public
   */
  getProjectMedia = async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;

    try {
      const [photos, floorPlans, virtualTours] = await Promise.all([
        db("project_photos")
          .where("project_id", Number(projectId))
          .orderBy("display_order", "asc"),
        db("floor_plans")
          .where("project_id", Number(projectId))
          .orderBy("display_order", "asc"),
        db("virtual_tours").where("project_id", Number(projectId)),
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
   * @route GET /api/media/projects/:projectId/photos
   * @desc Get project photos only
   * @access Public
   */
  getProjectPhotos = async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;

    try {
      const photos = await db("project_photos")
        .where("project_id", Number(projectId))
        .orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          caption: photo.caption,
          displayOrder: photo.display_order,
          isCover: Boolean(photo.is_cover),
        })),
        "Project photos retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectPhotos:", error);
      ApiResponse.error(res, "Failed to retrieve photos", 500);
    }
  };

  /**
   * @route GET /api/media/projects/:projectId/floor-plans
   * @desc Get project floor plans
   * @access Public
   */
  getProjectFloorPlans = async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;

    try {
      const plans = await db("floor_plans")
        .where("project_id", Number(projectId))
        .orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          imageUrl: plan.image_url,
          pdfUrl: plan.pdf_url,
          displayOrder: plan.display_order,
        })),
        "Floor plans retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectFloorPlans:", error);
      ApiResponse.error(res, "Failed to retrieve floor plans", 500);
    }
  };

  /**
   * @route GET /api/media/projects/:projectId/virtual-tours
   * @desc Get project virtual tours
   * @access Public
   */
  getProjectVirtualTours = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { projectId } = req.params;

    try {
      const tours = await db("virtual_tours")
        .where("project_id", Number(projectId))
        .orderBy("created_at", "desc");

      ApiResponse.success(
        res,
        tours.map((tour) => ({
          id: tour.id,
          url: tour.url,
          description: tour.description,
          thumbnailUrl: tour.thumbnail_url,
        })),
        "Virtual tours retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getProjectVirtualTours:", error);
      ApiResponse.error(res, "Failed to retrieve virtual tours", 500);
    }
  };

  // ============================================
  // APARTMENT MEDIA
  // ============================================

  /**
   * @route GET /api/media/apartments/:apartmentId
   * @desc Get all media for an apartment
   * @access Public
   */
  getApartmentMedia = async (req: Request, res: Response): Promise<void> => {
    const { apartmentId } = req.params;

    try {
      const [photos, floorPlans] = await Promise.all([
        db("apartment_photos")
          .where("apartment_id", Number(apartmentId))
          .orderBy("display_order", "asc"),
        db("apartment_floor_plans")
          .where("apartment_id", Number(apartmentId))
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
   * @route GET /api/media/apartments/:apartmentId/photos
   * @desc Get apartment photos only
   * @access Public
   */
  getApartmentPhotos = async (req: Request, res: Response): Promise<void> => {
    const { apartmentId } = req.params;

    try {
      const photos = await db("apartment_photos")
        .where("apartment_id", Number(apartmentId))
        .orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          externalUrl: photo.external_url,
          caption: photo.caption,
          displayOrder: photo.display_order,
        })),
        "Apartment photos retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getApartmentPhotos:", error);
      ApiResponse.error(res, "Failed to retrieve photos", 500);
    }
  };

  // ============================================
  // COMMERCIAL PROPERTY MEDIA
  // ============================================

  /**
   * @route GET /api/media/commercial/:propertyId
   * @desc Get commercial property media
   * @access Public
   */
  getCommercialMedia = async (req: Request, res: Response): Promise<void> => {
    const { propertyId } = req.params;

    try {
      const photos = await db("commercial_property_photos")
        .where("property_id", Number(propertyId))
        .orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        { photos },
        "Commercial property media retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getCommercialMedia:", error);
      ApiResponse.error(res, "Failed to retrieve media", 500);
    }
  };

  // ============================================
  // BULK QUERIES (Admin)
  // ============================================

  /**
   * @route GET /api/media/photos/all
   * @desc Get all photos across all entities
   * @access Private (Admin)
   */
  getAllPhotos = async (req: Request, res: Response): Promise<void> => {
    const { type } = req.query;

    try {
      let photos;

      switch (type) {
        case "project":
          photos = await db("project_photos").select("*");
          break;
        case "apartment":
          photos = await db("apartment_photos").select("*");
          break;
        case "commercial":
          photos = await db("commercial_property_photos").select("*");
          break;
        default:
          const [projectPhotos, apartmentPhotos, commercialPhotos] =
            await Promise.all([
              db("project_photos").select("*"),
              db("apartment_photos").select("*"),
              db("commercial_property_photos").select("*"),
            ]);
          photos = { projectPhotos, apartmentPhotos, commercialPhotos };
      }

      ApiResponse.success(res, photos, "Photos retrieved successfully");
    } catch (error) {
      console.error("Error in getAllPhotos:", error);
      ApiResponse.error(res, "Failed to retrieve photos", 500);
    }
  };

  /**
   * @route GET /api/media/statistics
   * @desc Get media statistics
   * @access Private (Admin)
   */
  getMediaStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const [
        projectPhotosCount,
        apartmentPhotosCount,
        commercialPhotosCount,
        floorPlansCount,
        virtualToursCount,
      ] = await Promise.all([
        db("project_photos").count("* as count").first(),
        db("apartment_photos").count("* as count").first(),
        db("commercial_property_photos").count("* as count").first(),
        db("floor_plans").count("* as count").first(),
        db("virtual_tours").count("* as count").first(),
      ]);

      ApiResponse.success(
        res,
        {
          projectPhotos: Number(projectPhotosCount?.count || 0),
          apartmentPhotos: Number(apartmentPhotosCount?.count || 0),
          commercialPhotos: Number(commercialPhotosCount?.count || 0),
          floorPlans: Number(floorPlansCount?.count || 0),
          virtualTours: Number(virtualToursCount?.count || 0),
          totalMedia:
            Number(projectPhotosCount?.count || 0) +
            Number(apartmentPhotosCount?.count || 0) +
            Number(commercialPhotosCount?.count || 0) +
            Number(floorPlansCount?.count || 0) +
            Number(virtualToursCount?.count || 0),
        },
        "Statistics retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getMediaStatistics:", error);
      ApiResponse.error(res, "Failed to retrieve statistics", 500);
    }
  };
}

export default new MediaController();
