/**
 * Children Activity Controller
 * Handles children's activity registration with parental consent
 * Manages GDPR-compliant child data collection including photo rights
 *
 * Features:
 * - Parental responsibility acknowledgment
 * - Photo consent (droit d'image)
 * - Email and phone validation
 * - Comprehensive error handling
 *
 * @module controllers/children-activity.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import db from "@/config/database";

/**
 * Children activity registration interface
 */
interface ChildActivityRegistration {
  childName: string;
  email: string;
  phone: string;
  parentalResponsibility: boolean;
  photoConsent: boolean;
}

/**
 * Children Activity Controller class
 * Manages child activity registrations with parental consent
 */
class ChildrenActivityController {
  /**
   * Registers a child for an activity
   * Requires parental consent and photo rights acknowledgment
   *
   * @route POST /api/children-activities/register
   * @access Public
   *
   * @example
   * POST /api/children-activities/register
   * {
   *   "nom_enfant": "Jean Dupont",
   *   "email": "parent@example.com",
   *   "telephone": "+213555123456",
   *   "responsabilite_parent": true,
   *   "droit_image": true
   * }
   */
  registerChild = async (req: Request, res: Response): Promise<void> => {
    const { nom_enfant, email, telephone, responsabilite_parent, droit_image } =
      req.body;

    try {
      // Validate required fields
      if (!nom_enfant || !email || !telephone) {
        ApiResponse.badRequest(
          res,
          "Le nom de l'enfant, l'email et le téléphone sont requis"
        );
        return;
      }

      // Validate parental responsibility acceptance
      if (responsabilite_parent === undefined || !responsabilite_parent) {
        ApiResponse.badRequest(
          res,
          "La responsabilité parentale doit être acceptée"
        );
        return;
      }

      // Validate photo consent is provided (can be true or false)
      if (droit_image === undefined) {
        ApiResponse.badRequest(
          res,
          "Le consentement pour le droit à l'image doit être fourni"
        );
        return;
      }

      // Validate email format
      if (!validateEmail(email)) {
        ApiResponse.badRequest(res, "Format d'email invalide");
        return;
      }

      // Validate phone format
      if (!validatePhone(telephone)) {
        ApiResponse.badRequest(res, "Format de téléphone invalide");
        return;
      }

      // Check for duplicate registration (same email + child name)
      const existing = await db("activite_enfant")
        .where({
          email: email.toLowerCase(),
          nom_enfant: nom_enfant.trim(),
        })
        .first();

      if (existing) {
        ApiResponse.conflict(
          res,
          "Cet enfant est déjà inscrit pour cette activité"
        );
        return;
      }

      // Insert registration
      const [id] = await db("activite_enfant").insert({
        nom_enfant: nom_enfant.trim(),
        email: email.toLowerCase(),
        telephone: telephone.trim(),
        responsabilite_parent: responsabilite_parent ? 1 : 0,
        droit_image: droit_image ? 1 : 0,
        created_at: db.fn.now(),
      });

      ApiResponse.created(
        res,
        {
          id,
          childName: nom_enfant.trim(),
          email: email.toLowerCase(),
          photoConsent: Boolean(droit_image),
        },
        "Inscription enregistrée avec succès"
      );
    } catch (error) {
      console.error("Error in registerChild:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Gets all child activity registrations
   *
   * @route GET /api/children-activities
   * @access Private (Admin)
   *
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 50)
   * @query email - Filter by parent email
   * @query photoConsent - Filter by photo consent status
   *
   * @example
   * GET /api/children-activities?page=1&limit=20&photoConsent=true
   */
  getAllRegistrations = async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 50, email, photoConsent, search } = req.query;

    try {
      let query = db("activite_enfant").select("*");

      // Apply filters
      if (email && typeof email === "string") {
        query = query.where("email", "like", `%${email}%`);
      }

      if (photoConsent !== undefined) {
        query = query.where("droit_image", photoConsent === "true" ? 1 : 0);
      }

      if (search && typeof search === "string") {
        query = query.where((builder) => {
          builder
            .where("nom_enfant", "like", `%${search}%`)
            .orWhere("email", "like", `%${search}%`);
        });
      }

      // Get total count
      const [{ count: total }] = await query.clone().count("* as count");

      // Apply pagination
      const offset = (Number(page) - 1) * Number(limit);
      const registrations = await query
        .orderBy("created_at", "desc")
        .limit(Number(limit))
        .offset(offset);

      // Format response
      const formatted = registrations.map((reg) => ({
        id: reg.id,
        childName: reg.nom_enfant,
        email: reg.email,
        phone: reg.telephone,
        parentalResponsibility: Boolean(reg.responsabilite_parent),
        photoConsent: Boolean(reg.droit_image),
        createdAt: reg.created_at,
      }));

      ApiResponse.success(
        res,
        {
          registrations: formatted,
          pagination: {
            total: Number(total),
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(Number(total) / Number(limit)),
          },
        },
        "Inscriptions récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getAllRegistrations:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Gets registration by ID
   *
   * @route GET /api/children-activities/:id
   * @access Private (Admin)
   *
   * @example
   * GET /api/children-activities/123
   */
  getRegistrationById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const registration = await db("activite_enfant")
        .where({ id: Number(id) })
        .first();

      if (!registration) {
        ApiResponse.notFound(res, "Inscription non trouvée");
        return;
      }

      ApiResponse.success(
        res,
        {
          id: registration.id,
          childName: registration.nom_enfant,
          email: registration.email,
          phone: registration.telephone,
          parentalResponsibility: Boolean(registration.responsabilite_parent),
          photoConsent: Boolean(registration.droit_image),
          createdAt: registration.created_at,
        },
        "Inscription récupérée avec succès"
      );
    } catch (error) {
      console.error("Error in getRegistrationById:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Gets registration statistics
   *
   * @route GET /api/children-activities/statistics
   * @access Private (Admin)
   *
   * @example
   * GET /api/children-activities/statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const [totalCount, photoConsentCount, parentalConsentCount] =
        await Promise.all([
          db("activite_enfant").count("* as count").first(),
          db("activite_enfant")
            .where("droit_image", 1)
            .count("* as count")
            .first(),
          db("activite_enfant")
            .where("responsabilite_parent", 1)
            .count("* as count")
            .first(),
        ]);

      const total = Number(totalCount?.count || 0);
      const withPhotoConsent = Number(photoConsentCount?.count || 0);
      const withParentalConsent = Number(parentalConsentCount?.count || 0);

      ApiResponse.success(
        res,
        {
          totalRegistrations: total,
          withPhotoConsent,
          withParentalConsent,
          photoConsentRate:
            total > 0 ? Math.round((withPhotoConsent / total) * 1000) / 10 : 0,
        },
        "Statistiques récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getStatistics:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Deletes a registration
   *
   * @route DELETE /api/children-activities/:id
   * @access Private (Admin)
   *
   * @example
   * DELETE /api/children-activities/123
   */
  deleteRegistration = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const deleted = await db("activite_enfant")
        .where({ id: Number(id) })
        .del();

      if (!deleted) {
        ApiResponse.notFound(res, "Inscription non trouvée");
        return;
      }

      ApiResponse.success(res, null, "Inscription supprimée avec succès");
    } catch (error) {
      console.error("Error in deleteRegistration:", error);
      ApiResponse.error(res, "Erreur lors de la suppression", 500);
    }
  };
}

export default new ChildrenActivityController();
