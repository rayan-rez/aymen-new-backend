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
import { BaseModel } from "@models/base.model";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import db from "@/config/database";

/**
 * Influencer event registration entity
 */
interface InfluencerEventRegistration {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  selectedDays: string[] | null;
  selectedTimes: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create registration DTO
 */
interface CreateInfluencerRegistrationDto {
  email: string;
  first_name: string;
  last_name: string;
  n_telephone: string;
  selected_days?: string[] | null;
  selected_times?: string[] | null;
}

/**
 * Base model for influencer event registrations
 * Provides common CRUD operations for all influencer campaigns
 */
class InfluencerEventModel extends BaseModel<
  InfluencerEventRegistration,
  CreateInfluencerRegistrationDto,
  Partial<CreateInfluencerRegistrationDto>
> {
  protected tableName: string;

  constructor(tableName: string) {
    super();
    this.tableName = tableName;
  }

  protected mapToEntity(record: any): InfluencerEventRegistration {
    return {
      id: record.id,
      email: record.email,
      firstName: record.first_name,
      lastName: record.last_name,
      phone: record.n_telephone,
      selectedDays: record.selected_days
        ? JSON.parse(record.selected_days)
        : null,
      selectedTimes: record.selected_times
        ? JSON.parse(record.selected_times)
        : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  protected mapToDatabase(data: any): Record<string, any> {
    const mapped: Record<string, any> = {};

    if (data.email !== undefined) mapped.email = data.email;
    if (data.first_name !== undefined) mapped.first_name = data.first_name;
    if (data.last_name !== undefined) mapped.last_name = data.last_name;
    if (data.n_telephone !== undefined) mapped.n_telephone = data.n_telephone;

    if (data.selected_days !== undefined) {
      mapped.selected_days = Array.isArray(data.selected_days)
        ? JSON.stringify(data.selected_days)
        : "[]";
    }

    if (data.selected_times !== undefined) {
      mapped.selected_times = Array.isArray(data.selected_times)
        ? JSON.stringify(data.selected_times)
        : "[]";
    }

    return mapped;
  }

  /**
   * Finds registration by email
   */
  async findByEmail(
    email: string
  ): Promise<InfluencerEventRegistration | null> {
    return this.findOne({ email: email.toLowerCase() });
  }
}

/**
 * Available campaign tables mapping
 */
const CAMPAIGN_TABLES: Record<string, string> = {
  aminawissem: "aminawissem_user",
  attitude: "attitude_user",
  chaibi: "chaibi_user",
  fahd: "fahd_user",
  fake: "fake_user",
  hanaghezzar: "hanaghezzar_user",
  influenceur: "influenceur_user",
  lyeskohlanta: "lyeskohlanta_user",
  mohinoo: "mohinoo_user",
  myriamk: "myriamk_user",
  nourhene: "nourhene_user",
  romi: "romi_user",
  salaheddine: "salaheddine_user",
  salimsouakri: "salimsouakri_user",
  vipplatinium: "vipplatinium_user",
  yasminejoevent: "yasminejoevent_user",
  lilaborsali: "lilaborsali",
};

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
