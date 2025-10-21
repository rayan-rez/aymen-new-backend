/**
 * Influencer Event Registration Controller
 * Handles event registrations for various influencer campaigns
 * Manages time-slotted registrations with duplicate prevention
 *
 * Supported campaigns:
 * - aminawissem_user
 * - attitude_user
 * - chaibi_user
 * - fahd_user
 * - fake_user
 * - hanaghezzar_user
 * - influenceur_user
 * - lyeskohlanta_user
 * - mohinoo_user
 * - myriamk_user
 * - nourhene_user
 * - romi_user
 * - salaheddine_user
 * - salimsouakri_user
 * - vipplatinium_user
 * - yasminejoevent_user
 * - lilaborsali
 *
 * @module controllers/influencer-event.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import db from "@/config/database";
import { CAMPAIGN_TABLES } from "@constants/app.constants";
import { InfluencerEventModel } from "@models/influencer-event.model";

/**
 * Influencer Event Controller class
 * Manages registrations for influencer-specific events
 */
class InfluencerEventController {
  /**
   * Registers a user for an influencer event campaign
   * Prevents duplicate registrations based on email
   *
   * @route POST /api/influencer-events/:campaign/register
   * @access Public
   *
   * @example
   * POST /api/influencer-events/aminawissem/register
   * {
   *   "email": "user@example.com",
   *   "first_name": "John",
   *   "last_name": "Doe",
   *   "n_telephone": "+213555123456",
   *   "selected_days": ["2025-11-01", "2025-11-02"],
   *   "selected_times": ["10:00", "14:00"]
   * }
   */
  registerForCampaign = async (req: Request, res: Response): Promise<void> => {
    const { campaign } = req.params;
    const {
      email,
      first_name,
      last_name,
      n_telephone,
      selected_days,
      selected_times,
    } = req.body;

    // Validate campaign
    const tableName = CAMPAIGN_TABLES[campaign.toLowerCase()];
    if (!tableName) {
      ApiResponse.badRequest(res, "Invalid campaign specified");
      return;
    }

    // Validate required fields
    if (!email || !first_name || !last_name || !n_telephone) {
      ApiResponse.badRequest(
        res,
        "Email, first name, last name, and phone are required"
      );
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      ApiResponse.badRequest(res, "Invalid email format");
      return;
    }

    // Validate phone format
    if (!validatePhone(n_telephone)) {
      ApiResponse.badRequest(res, "Invalid phone number format");
      return;
    }

    try {
      const model = new InfluencerEventModel(tableName);

      // Check for duplicate registration
      const existing = await model.findByEmail(email.toLowerCase());
      if (existing) {
        ApiResponse.conflict(res, "Vous vous êtes déjà inscrit");
        return;
      }

      // Transform and validate arrays
      const days = Array.isArray(selected_days) ? selected_days : [];
      const times = Array.isArray(selected_times) ? selected_times : [];

      // Create registration
      const registration = await model.create({
        email: email.toLowerCase(),
        first_name,
        last_name,
        n_telephone,
        selected_days: days,
        selected_times: times,
      });

      ApiResponse.created(
        res,
        {
          id: registration.id,
          email: registration.email,
          firstName: registration.firstName,
          lastName: registration.lastName,
        },
        "Utilisateur enregistré avec succès !"
      );
    } catch (error) {
      console.error(`Error registering for ${campaign}:`, error);
      ApiResponse.error(
        res,
        "Erreur lors de l'enregistrement de l'utilisateur",
        500
      );
    }
  };

  /**
   * Gets all registrations for a specific campaign
   *
   * @route GET /api/influencer-events/:campaign
   * @access Private (Admin)
   *
   * @example
   * GET /api/influencer-events/aminawissem?page=1&limit=50
   */
  getAllRegistrations = async (req: Request, res: Response): Promise<void> => {
    const { campaign } = req.params;
    const {
      page = 1,
      limit = 50,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    // Validate campaign
    const tableName = CAMPAIGN_TABLES[campaign.toLowerCase()];
    if (!tableName) {
      ApiResponse.badRequest(res, "Invalid campaign specified");
      return;
    }

    try {
      const model = new InfluencerEventModel(tableName);

      const registrations = await model.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      });

      ApiResponse.success(
        res,
        registrations,
        "Registrations retrieved successfully"
      );
    } catch (error) {
      console.error(`Error getting ${campaign} registrations:`, error);
      ApiResponse.error(res, "Erreur interne du serveur", 500);
    }
  };

  /**
   * Gets a single registration by ID
   *
   * @route GET /api/influencer-events/:campaign/:id
   * @access Private (Admin)
   *
   * @example
   * GET /api/influencer-events/aminawissem/123
   */
  getRegistrationById = async (req: Request, res: Response): Promise<void> => {
    const { campaign, id } = req.params;

    // Validate campaign
    const tableName = CAMPAIGN_TABLES[campaign.toLowerCase()];
    if (!tableName) {
      ApiResponse.badRequest(res, "Invalid campaign specified");
      return;
    }

    try {
      const model = new InfluencerEventModel(tableName);
      const registration = await model.findById(Number(id));

      if (!registration) {
        ApiResponse.notFound(res, "Utilisateur non trouvé");
        return;
      }

      ApiResponse.success(
        res,
        registration,
        "Registration retrieved successfully"
      );
    } catch (error) {
      console.error(`Error getting ${campaign} registration:`, error);
      ApiResponse.error(res, "Erreur interne du serveur", 500);
    }
  };

  /**
   * Gets list of available campaigns
   *
   * @route GET /api/influencer-events/campaigns
   * @access Public
   *
   * @example
   * GET /api/influencer-events/campaigns
   */
  getAvailableCampaigns = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const campaigns = Object.keys(CAMPAIGN_TABLES).map((key) => ({
      campaign: key,
      tableName: CAMPAIGN_TABLES[key],
    }));

    ApiResponse.success(
      res,
      campaigns,
      "Available campaigns retrieved successfully"
    );
  };

  /**
   * Gets registration statistics for a campaign
   *
   * @route GET /api/influencer-events/:campaign/statistics
   * @access Private (Admin)
   *
   * @example
   * GET /api/influencer-events/aminawissem/statistics
   */
  getCampaignStatistics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { campaign } = req.params;

    // Validate campaign
    const tableName = CAMPAIGN_TABLES[campaign.toLowerCase()];
    if (!tableName) {
      ApiResponse.badRequest(res, "Invalid campaign specified");
      return;
    }

    try {
      const model = new InfluencerEventModel(tableName);

      const [total, withDays, withTimes] = await Promise.all([
        model.count(),
        db(tableName).whereNotNull("selected_days").count("* as count").first(),
        db(tableName)
          .whereNotNull("selected_times")
          .count("* as count")
          .first(),
      ]);

      const stats = {
        totalRegistrations: total,
        withSelectedDays: Number(withDays?.count || 0),
        withSelectedTimes: Number(withTimes?.count || 0),
        completionRate:
          total > 0
            ? Math.round((Number(withDays?.count || 0) / total) * 1000) / 10
            : 0,
      };

      ApiResponse.success(res, stats, "Statistics retrieved successfully");
    } catch (error) {
      console.error(`Error getting ${campaign} statistics:`, error);
      ApiResponse.error(res, "Erreur interne du serveur", 500);
    }
  };
}

export default new InfluencerEventController();
