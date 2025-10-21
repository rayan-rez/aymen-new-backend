/**
 * Media & Gallery Controller
 * Unified controller for managing all media galleries
 * Handles project photos, apartment photos, commercial property photos, floor plans, and virtual tours
 *
 * Consolidates:
 * - projectsPhoto.controller.js
 * - appartmentsPhoto.controller.js
 * - locauxPhoto.controller.js
 * - plan.controller.js
 * - visitVirtuel.controller.js
 *
 * @module controllers/media-gallery.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import db from "@/config/database";

/**
 * Media & Gallery Controller class
 * Centralized management for all photo galleries and media
 */
class MediaGalleryController {
  // ============================================
  // PROJECT PHOTOS
  // ============================================

  /**
   * Gets all project photos
   *
   * @route GET /api/media/projects/photos
   * @access Public
   *
   * @query projectId - Filter by project ID
   * @query projectType - Filter by project type
   *
   * @example
   * GET /api/media/projects/photos?projectId=1
   */
  getProjectPhotos = async (req: Request, res: Response): Promise<void> => {
    const { projectId, projectType } = req.query;

    try {
      let query = db("project_photos").select("*");

      if (projectId) {
        query = query.where("project_id", Number(projectId));
      }

      if (projectType) {
        query = query.where("project_type", projectType);
      }

      const photos = await query.orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        photos.map((photo) => ({
          id: photo.id,
          projectId: photo.project_id,
          url: photo.url,
          caption: photo.caption,
          displayOrder: photo.display_order,
          isCover: Boolean(photo.is_cover),
          createdAt: photo.created_at,
        })),
        "Photos récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getProjectPhotos:", error);
      ApiResponse.error(res, "Erreur lors de la récupération des photos", 500);
    }
  };

  /**
   * Gets photos for a specific project
   *
   * @route GET /api/media/projects/:projectId/photos
   * @access Public
   *
   * @example
   * GET /api/media/projects/1/photos
   */
  getPhotosByProject = async (req: Request, res: Response): Promise<void> => {
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
        "Photos du projet récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getPhotosByProject:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  // ============================================
  // APARTMENT PHOTOS
  // ============================================

  /**
   * Gets all apartment photos
   *
   * @route GET /api/media/apartments/photos
   * @access Public
   *
   * @example
   * GET /api/media/apartments/photos
   */
  getAllApartmentPhotos = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const photos = await db("apartment_photos")
        .select("*")
        .orderBy("apartment_id", "asc")
        .orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        photos.map((photo) => ({
          id: photo.id,
          apartmentId: photo.apartment_id,
          url: photo.url,
          externalUrl: photo.external_url,
          caption: photo.caption,
          displayOrder: photo.display_order,
        })),
        "Photos des appartements récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getAllApartmentPhotos:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Gets photos for a specific apartment
   *
   * @route GET /api/media/apartments/:apartmentId/photos
   * @access Public
   *
   * @example
   * GET /api/media/apartments/1/photos
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
        "Photos de l'appartement récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getApartmentPhotos:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  // ============================================
  // COMMERCIAL PROPERTY PHOTOS (LOCAUX)
  // ============================================

  /**
   * Gets all commercial property photos
   *
   * @route GET /api/media/commercial/photos
   * @access Public
   *
   * @example
   * GET /api/media/commercial/photos
   */
  getAllCommercialPhotos = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const photos = await db("commercial_property_photos")
        .select("*")
        .orderBy("property_id", "asc")
        .orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        photos.map((photo) => ({
          id: photo.id,
          propertyId: photo.property_id,
          url: photo.url,
          caption: photo.caption,
          displayOrder: photo.display_order,
          isCover: Boolean(photo.is_cover),
        })),
        "Photos des locaux récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getAllCommercialPhotos:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Gets photos for a specific commercial property
   *
   * @route GET /api/media/commercial/:propertyId/photos
   * @access Public
   *
   * @example
   * GET /api/media/commercial/1/photos
   */
  getCommercialPhotos = async (req: Request, res: Response): Promise<void> => {
    const { propertyId } = req.params;

    try {
      const photos = await db("commercial_property_photos")
        .where("property_id", Number(propertyId))
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
        "Photos du local récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getCommercialPhotos:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  // ============================================
  // FLOOR PLANS
  // ============================================

  /**
   * Gets all floor plans
   *
   * @route GET /api/media/floor-plans
   * @access Public
   *
   * @query projectId - Filter by project ID
   *
   * @example
   * GET /api/media/floor-plans?projectId=1
   */
  getAllFloorPlans = async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.query;

    try {
      let query = db("floor_plans").select("*");

      if (projectId) {
        query = query.where("project_id", Number(projectId));
      }

      const plans = await query.orderBy("display_order", "asc");

      ApiResponse.success(
        res,
        plans.map((plan) => ({
          id: plan.id,
          projectId: plan.project_id,
          name: plan.name,
          imageUrl: plan.image_url,
          pdfUrl: plan.pdf_url,
          displayOrder: plan.display_order,
        })),
        "Plans récupérés avec succès"
      );
    } catch (error) {
      console.error("Error in getAllFloorPlans:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Gets floor plans for a specific project
   *
   * @route GET /api/media/projects/:projectId/floor-plans
   * @access Public
   *
   * @example
   * GET /api/media/projects/1/floor-plans
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
        "Plans du projet récupérés avec succès"
      );
    } catch (error) {
      console.error("Error in getProjectFloorPlans:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  // ============================================
  // VIRTUAL TOURS
  // ============================================

  /**
   * Gets all virtual tours
   *
   * @route GET /api/media/virtual-tours
   * @access Public
   *
   * @query projectId - Filter by project ID
   *
   * @example
   * GET /api/media/virtual-tours?projectId=1
   */
  getAllVirtualTours = async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.query;

    try {
      let query = db("virtual_tours as vt")
        .leftJoin("projects as p", "vt.project_id", "p.id")
        .select("vt.*", "p.name as project_name", "p.slug as project_slug");

      if (projectId) {
        query = query.where("vt.project_id", Number(projectId));
      }

      const tours = await query.orderBy("vt.created_at", "desc");

      ApiResponse.success(
        res,
        tours.map((tour) => ({
          id: tour.id,
          projectId: tour.project_id,
          projectName: tour.project_name,
          projectSlug: tour.project_slug,
          url: tour.url,
          description: tour.description,
          thumbnailUrl: tour.thumbnail_url,
          createdAt: tour.created_at,
        })),
        "Visites virtuelles récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getAllVirtualTours:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Gets virtual tours for a specific project
   *
   * @route GET /api/media/projects/:projectId/virtual-tours
   * @access Public
   *
   * @example
   * GET /api/media/projects/1/virtual-tours
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
        "Visites virtuelles du projet récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getProjectVirtualTours:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Gets media statistics across all types
   *
   * @route GET /api/media/statistics
   * @access Private (Admin)
   *
   * @example
   * GET /api/media/statistics
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
        "Statistiques des médias récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getMediaStatistics:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };
}

export default new MediaGalleryController();
