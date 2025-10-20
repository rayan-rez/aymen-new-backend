/**
 * Special Event Controller
 * Handles special events like inaugurations, networking events, and holidays campaigns
 * Consolidates multiple event-specific controllers into one
 *
 * @module controllers/special-event.controller
 */

import { Request, Response } from "express";
import {
  EventRegistrationModel,
  EventType,
  LeadSourceModel,
  LeadType,
  MarketingConsentModel,
} from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Special event types beyond standard EventType
 */
enum SpecialEventType {
  INAUGURATION = "inauguration",
  NETWORKING = "networking",
  HOLIDAYS_CAMPAIGN = "holidays_campaign",
}

/**
 * Special Event Controller class
 * Manages specialized event registrations and tracking
 */
class SpecialEventController {
  /**
   * Registers for inauguration event
   * Handles guest registration with optional partner
   *
   * @route POST /api/events/inauguration
   * @access Public
   *
   * @example
   * POST /api/events/inauguration
   * {
   *   "nom": "Doe",
   *   "prenom": "John",
   *   "email": "john@example.com",
   *   "telephone": "+213555123456",
   *   "accept_cgu": true,
   *   "accept_photo": false
   * }
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
        eventDate: new Date(), // Set actual event date
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
   * Allows guests to provide NPS scores on exit
   *
   * @route POST /api/events/inauguration/checkout
   * @access Public
   *
   * @example
   * POST /api/events/inauguration/checkout
   * {
   *   "id": 123,
   *   "nps_score": 9,
   *   "recommandation_score": 10
   * }
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

      ApiResponse.success(res, null, "Checkout enregistré avec ou sans avis");
    } catch (error) {
      console.error("Error in checkoutInauguration:", error);
      ApiResponse.error(res, "Erreur lors du checkout", 500);
    }
  };

  /**
   * Registers for networking soirée
   * Handles professional networking events with company details
   *
   * @route POST /api/events/networking
   * @access Public
   *
   * @example
   * POST /api/events/networking
   * {
   *   "identite": "John Doe",
   *   "profession": "Sales Manager",
   *   "accompagne": true,
   *   "nom_partenaire": "Jane Doe",
   *   "soiree_du": "2025-11-01"
   * }
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

      // Parse name (simple split, assumes "FirstName LastName" format)
      const nameParts = identite.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || firstName;

      // Create registration with custom data in preferences JSON
      const registration = await EventRegistrationModel.create({
        firstName,
        lastName,
        eventType: EventType.NETWORKING,
        eventDate: soiree_du ? new Date(soiree_du) : new Date(),
        acceptedTerms: true,
      });

      // Note: Additional fields like profession, accompagne, nom_partenaire
      // could be stored in a separate table or in preferences JSON
      // For now, they're accepted but not persisted beyond the base model

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
   *
   * @example
   * GET /api/events/networking?soiree_du=2025-11-01
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
   * Updates networking participant details
   * Allows updating partner name, check-in status, and feedback
   *
   * @route PATCH /api/events/networking/:id
   * @access Private (Admin)
   *
   * @example
   * PATCH /api/events/networking/123
   * {
   *   "nom_partenaire": "Jane Doe",
   *   "checkin": "2025-11-01T18:00:00Z",
   *   "avis": 9,
   *   "recommandation": 10
   * }
   */
  updateNetworkingParticipant = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const { nom_partenaire, checkin, avis, recommandation } = req.body;

    try {
      // Note: nom_partenaire would require custom table or preferences storage
      // For now, handle check-in and feedback

      if (checkin) {
        await EventRegistrationModel.checkIn(Number(id));
      }

      if (avis !== undefined || recommandation !== undefined) {
        await EventRegistrationModel.submitFeedback(Number(id), {
          satisfactionScore: avis || 0,
          recommendationScore: recommandation || 0,
        });
      }

      ApiResponse.success(res, null, "Mise à jour réussie");
    } catch (error) {
      console.error("Error in updateNetworkingParticipant:", error);
      ApiResponse.error(res, "Erreur lors de la mise à jour", 500);
    }
  };

  /**
   * Submits holidays campaign form
   * Special campaign form with extended project details
   *
   * @route POST /api/events/holidays
   * @access Public
   *
   * @example
   * POST /api/events/holidays
   * {
   *   "nom": "Doe",
   *   "prenom": "John",
   *   "email": "john@example.com",
   *   "telephone": "+213555123456",
   *   "pays": "Algeria",
   *   "budget_estime": "5000000-10000000",
   *   "wilaya": "Alger",
   *   "profession": "Engineer",
   *   "type_financement": "cash",
   *   "interesse_par": "apartment",
   *   "localisation_souhaitee": ["Alger", "Oran"],
   *   "jour_contact": ["lundi", "mardi"],
   *   "heure_contact": "morning",
   *   "statut_projet": "immediate",
   *   "acceptation_regles": true,
   *   "source_url": "facebook.com"
   * }
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
        !budget_estime ||
        !wilaya ||
        !profession ||
        !type_financement ||
        !interesse_par ||
        !heure_contact ||
        !statut_projet ||
        !source_url ||
        !acceptation_regles
      ) {
        ApiResponse.badRequest(
          res,
          "Tous les champs obligatoires doivent être remplis"
        );
        return;
      }

      // This is essentially a project inquiry, use ProjectInquiryModel
      // But since we're in EventRegistration context, we'll use EventRegistration
      // with custom event type and store additional data in preferences

      const registration = await EventRegistrationModel.create({
        firstName: prenom,
        lastName: nom,
        email: email.toLowerCase(),
        phone: telephone,
        eventType: EventType.WEBINAR, // Use webinar as placeholder for special campaigns
        eventDate: new Date(),
        acceptedTerms: Boolean(acceptation_regles),
        // Additional fields can be stored in a custom table or preferences
      });

      // Track lead source
      LeadSourceModel.create({
        leadEmail: email.toLowerCase(),
        leadType: LeadType.EVENT_REGISTRATION,
        leadReferenceId: registration.id,
        referrerUrl: source_url,
        sourceIp: req.ip || null,
        userAgent: req.get("user-agent") || null,
      }).catch((err) => console.error("Error tracking lead:", err));

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
}

export default new SpecialEventController();
