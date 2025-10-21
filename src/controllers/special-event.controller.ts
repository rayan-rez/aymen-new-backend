// src/controllers/special-event.controller.ts (Fixed)
/**
 * Special Event Controller
 * Handles special events like inaugurations, networking events, and campaigns
 * All fixed with proper validation imports and using models instead of direct DB
 *
 * @module controllers/special-event.controller
 */

import { Request, Response } from "express";
import {
  EventRegistrationModel,
  EventType,
  LeadSourceModel,
  LeadType,
} from "@models";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";

/**
 * Special Event Controller class
 * Manages specialized event registrations and tracking
 */
class SpecialEventController {
  /**
   * Registers for inauguration event
   *
   * @route POST /api/events/inauguration
   * @access Public
   */
  registerInauguration = async (req: Request, res: Response): Promise<void> => {
    const { nom, prenom, email, telephone, accept_cgu, accept_photo } =
      req.body;

    try {
      // Validate required fields
      if (!nom || !prenom || !telephone) {
        ApiResponse.badRequest(res, "Nom, prénom et téléphone sont requis");
        return;
      }

      if (!accept_cgu) {
        ApiResponse.badRequest(
          res,
          "Vous devez accepter les conditions générales"
        );
        return;
      }

      // Validate email if provided
      if (email && !validateEmail(email)) {
        ApiResponse.badRequest(res, "Format d'email invalide");
        return;
      }

      // Validate phone
      if (!validatePhone(telephone)) {
        ApiResponse.badRequest(res, "Format de téléphone invalide");
        return;
      }

      // Check for duplicate registration by email
      if (email) {
        const existing = await EventRegistrationModel.findAll({
          email: email.toLowerCase(),
          eventType: EventType.INAUGURATION,
        });

        if (existing.length > 0) {
          ApiResponse.conflict(res, "Cet email est déjà enregistré");
          return;
        }
      }

      // Create registration
      const registration = await EventRegistrationModel.create({
        firstName: prenom,
        lastName: nom,
        email: email ? email.toLowerCase() : null,
        phone: telephone,
        eventType: EventType.INAUGURATION,
        eventDate: new Date(),
        acceptedTerms: Boolean(accept_cgu),
        photoConsent: Boolean(accept_photo),
      });

      ApiResponse.created(
        res,
        {
          id: registration.id,
          firstName: registration.firstName,
          lastName: registration.lastName,
        },
        "Invité enregistré avec succès"
      );
    } catch (error) {
      console.error("Error in registerInauguration:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Records check-out with optional feedback
   *
   * @route POST /api/events/inauguration/checkout
   * @access Public
   */
  checkoutInauguration = async (req: Request, res: Response): Promise<void> => {
    const { id, nps_score, recommandation_score } = req.body;

    try {
      if (!id) {
        ApiResponse.badRequest(res, "L'identifiant de l'invité est requis");
        return;
      }

      const registration = await EventRegistrationModel.findById(Number(id));
      if (!registration) {
        ApiResponse.notFound(res, "Aucun invité trouvé avec cet ID");
        return;
      }

      // Check out the guest
      await EventRegistrationModel.checkOut(Number(id));

      // Add feedback if provided
      if (
        typeof nps_score === "number" ||
        typeof recommandation_score === "number"
      ) {
        await EventRegistrationModel.submitFeedback(Number(id), {
          satisfactionScore: nps_score || 0,
          recommendationScore: recommandation_score || 0,
        });
      }

      ApiResponse.success(res, null, "Checkout enregistré avec succès");
    } catch (error) {
      console.error("Error in checkoutInauguration:", error);
      ApiResponse.error(res, "Erreur lors du checkout", 500);
    }
  };

  /**
   * Registers for networking soirée
   *
   * @route POST /api/events/networking
   * @access Public
   */
  registerNetworking = async (req: Request, res: Response): Promise<void> => {
    const { identite, profession, accompagne, nom_partenaire, soiree_du } =
      req.body;

    try {
      // Validate required fields
      if (!identite || !profession) {
        ApiResponse.badRequest(res, "Identité et profession sont requis");
        return;
      }

      // Parse name
      const nameParts = identite.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || firstName;

      // Create registration
      const registration = await EventRegistrationModel.create({
        firstName,
        lastName,
        eventType: EventType.NETWORKING,
        eventDate: soiree_du ? new Date(soiree_du) : new Date(),
        acceptedTerms: true,
      });

      ApiResponse.created(
        res,
        {
          id: registration.id,
          identite,
          profession,
        },
        "Inscription enregistrée avec succès"
      );
    } catch (error) {
      console.error("Error in registerNetworking:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Gets all networking event participants
   *
   * @route GET /api/events/networking
   * @access Private (Admin)
   */
  getNetworkingParticipants = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { soiree_du } = req.query;

    try {
      const registrations = await EventRegistrationModel.findAll({
        eventType: EventType.NETWORKING,
        eventDate: soiree_du ? new Date(soiree_du as string) : undefined,
        sortBy: "first_name",
        sortOrder: "asc",
      });

      const formatted = registrations.map((reg) => ({
        id: reg.id,
        identite: `${reg.firstName} ${reg.lastName}`,
        checkin: reg.checkedInAt,
      }));

      ApiResponse.success(res, formatted, "Participants récupérés avec succès");
    } catch (error) {
      console.error("Error in getNetworkingParticipants:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Submits holidays campaign form
   *
   * @route POST /api/events/holidays
   * @access Public
   */
  submitHolidaysCampaign = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const {
      nom,
      prenom,
      email,
      telephone,
      pays,
      budget_estime,
      wilaya,
      profession,
      type_financement,
      interesse_par,
      localisation_souhaitee,
      jour_contact,
      heure_contact,
      statut_projet,
      acceptation_regles,
      source_url,
    } = req.body;

    try {
      // Validate required fields
      if (
        !nom ||
        !prenom ||
        !email ||
        !telephone ||
        !pays ||
        !acceptation_regles
      ) {
        ApiResponse.badRequest(
          res,
          "Les champs obligatoires doivent être remplis"
        );
        return;
      }

      // Validate email
      if (!validateEmail(email)) {
        ApiResponse.badRequest(res, "Format d'email invalide");
        return;
      }

      // Validate phone
      if (!validatePhone(telephone)) {
        ApiResponse.badRequest(res, "Format de téléphone invalide");
        return;
      }

      const registration = await EventRegistrationModel.create({
        firstName: prenom,
        lastName: nom,
        email: email.toLowerCase(),
        phone: telephone,
        eventType: EventType.WEBINAR,
        eventDate: new Date(),
        acceptedTerms: Boolean(acceptation_regles),
      });

      // Track lead source
      if (source_url) {
        LeadSourceModel.create({
          leadEmail: email.toLowerCase(),
          leadType: LeadType.EVENT_REGISTRATION,
          leadReferenceId: registration.id,
          referrerUrl: source_url,
          sourceIp: req.ip || null,
          userAgent: req.get("user-agent") || null,
        }).catch((err) => console.error("Error tracking lead:", err));
      }

      ApiResponse.created(
        res,
        {
          id: registration.id,
          message: "Formulaire holidays soumis avec succès",
        },
        "Inscription enregistrée"
      );
    } catch (error) {
      console.error("Error in submitHolidaysCampaign:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Registers user for on-site event (JPO/Open House)
   *
   * @route POST /api/events/onsite-register
   * @access Public
   */
  registerOnsite = async (req: Request, res: Response): Promise<void> => {
    let { name, email, phone, source, other_source } = req.body;

    try {
      // If user selected "Autre" (Other), use other_source value
      if (source === "Autre" && other_source) {
        source = other_source;
      }

      // Validate that at least one field is provided
      if (!name && !email && !phone && !source) {
        ApiResponse.badRequest(
          res,
          "Au moins un champ doit être rempli"
        );
        return;
      }

      // Validate email if provided
      if (email && !validateEmail(email)) {
        ApiResponse.badRequest(res, "Format d'email invalide");
        return;
      }

      // Validate phone if provided
      if (phone && !validatePhone(phone)) {
        ApiResponse.badRequest(res, "Format de téléphone invalide");
        return;
      }

      const registration = await EventRegistrationModel.create({
        firstName: name || "Anonymous",
        lastName: "Visitor",
        email: email ? email.toLowerCase() : null,
        phone: phone || null,
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date(),
        acceptedTerms: true,
      });

      // Track lead source if email provided
      if (email && source) {
        LeadSourceModel.create({
          leadEmail: email.toLowerCase(),
          leadType: LeadType.EVENT_REGISTRATION,
          leadReferenceId: registration.id,
          utmSource: source,
          sourceIp: req.ip || null,
          userAgent: req.get("user-agent") || null,
        }).catch((err) => console.error("Error tracking lead:", err));
      }

      ApiResponse.created(
        res,
        {
          id: registration.id,
          name,
          source,
        },
        "Inscription réussie"
      );
    } catch (error) {
      console.error("Error in registerOnsite:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Gets all on-site registrations
   *
   * @route GET /api/events/onsite-registrations
   * @access Private (Admin)
   */
  getAllOnsiteRegistrations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { page = 1, limit = 50 } = req.query;

    try {
      const registrations = await EventRegistrationModel.findAll({
        eventType: EventType.OPEN_HOUSE,
        page: Number(page),
        limit: Number(limit),
        sortBy: "created_at",
        sortOrder: "desc",
      });

      ApiResponse.success(
        res,
        registrations,
        "Inscriptions récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getAllOnsiteRegistrations:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };
}

export default new SpecialEventController();