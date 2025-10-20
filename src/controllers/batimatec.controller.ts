/**
 * Batimatec Controller
 * Handles Batimatec trade show related operations:
 * - General inquiry submissions
 * - Visitor feedback (avis)
 * - Interest tracking
 * - Exhibitor/promoter evaluations
 *
 * @module controllers/batimatec.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import db from "@/config/database";

/**
 * Batimatec inquiry interface
 */
interface BatimatecInquiryData {
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  pays: string;
  budget_estime?: string;
  wilaya?: string;
  profession?: string;
  type_financement?: string;
  interesse_par?: string;
  localisation_souhaitee?: string[];
  jour_contact?: string[];
  heure_contact?: string;
  statut_projet?: string;
  acceptation_regles: boolean;
  projet?: string;
  commercial?: string;
}

/**
 * Batimatec feedback (avis) interface
 */
interface BatimatecFeedbackData {
  satisfaction_aymen?: number;
  recommandation_aymen?: number;
  satisfaction_batimatec?: number;
  recommandation_batimatec?: number;
  langue?: string;
  commentaire?: string;
  suggestion?: string;
}

/**
 * Interest tracking interface
 */
interface BatimatecInterestData {
  type_interet: string;
  zones_geographiques?: string[];
  type_bien?: string[];
  typologie_bien?: string[];
  budget?: string;
  zones_alger?: string[];
}

/**
 * Promoter evaluation interface
 */
interface PromoterEvaluationData {
  nom_promoteur: string;
  taille_stand?: string;
  depliants_uniques?: number;
  depliants_presents?: string;
  banners?: number;
  residences_banners?: string;
  description_stand?: string;
  promotions_offres?: string;
  projet_phare?: boolean;
  projet_phare_details?: string;
  discours_marketing?: string;
  animations?: string;
  presence_hotesse?: boolean;
  nombre_hommes?: number;
  nombre_femmes?: number;
  cadres_seniors?: number;
  gamme_biens?: string;
  niveau_standing?: string;
  avancement_projets?: string;
}

/**
 * Batimatec Controller class
 * Manages all Batimatec trade show operations
 */
class BatimatecController {
  /**
   * Submit a Batimatec inquiry form
   * Captures detailed buyer information for trade show leads
   *
   * @route POST /api/batimatec/inquiry
   * @access Public
   *
   * @example
   * POST /api/batimatec/inquiry
   * {
   *   "nom": "Benali",
   *   "prenom": "Ahmed",
   *   "email": "ahmed@example.com",
   *   "telephone": "+213555123456",
   *   "pays": "Algérie",
   *   "acceptation_regles": true
   * }
   */
  submitInquiry = async (req: Request, res: Response): Promise<void> => {
    const data = req.body as BatimatecInquiryData;

    try {
      // Validate required fields
      if (
        !data.nom?.trim() ||
        !data.prenom?.trim() ||
        !data.telephone?.trim() ||
        !data.email?.trim()
      ) {
        ApiResponse.badRequest(
          res,
          "Les champs nom, prénom, téléphone et email sont obligatoires"
        );
        return;
      }

      // Validate email
      if (!validateEmail(data.email)) {
        ApiResponse.badRequest(res, "Format d'email invalide");
        return;
      }

      // Validate phone
      if (!validatePhone(data.telephone)) {
        ApiResponse.badRequest(res, "Format de téléphone invalide");
        return;
      }

      // Validate terms acceptance
      if (!data.acceptation_regles) {
        ApiResponse.badRequest(res, "Vous devez accepter les conditions");
        return;
      }

      // Prepare data for insertion
      const insertData: Record<string, any> = {
        email: data.email.trim().toLowerCase(),
        nom: data.nom.trim(),
        prenom: data.prenom.trim(),
        telephone: data.telephone.trim(),
        pays: data.pays?.trim() || "",
        budget_estime: data.budget_estime?.trim() || null,
        wilaya: data.wilaya?.trim() || null,
        profession: data.profession?.trim() || null,
        type_financement: data.type_financement?.trim() || null,
        interesse_par: data.interesse_par?.trim() || null,
        localisation_souhaitee: Array.isArray(data.localisation_souhaitee)
          ? data.localisation_souhaitee.join(", ")
          : null,
        jour_contact: Array.isArray(data.jour_contact)
          ? data.jour_contact.join(", ")
          : null,
        heure_contact: data.heure_contact?.trim() || null,
        statut_projet: data.statut_projet?.trim() || null,
        acceptation_regles: data.acceptation_regles ? 1 : 0,
        projet: data.projet?.trim() || null,
        commercial: data.commercial?.trim() || null,
        created_at: db.fn.now(),
      };

      // Insert into database
      const [id] = await db("batimatec").insert(insertData);

      ApiResponse.created(res, { id }, "Demande enregistrée avec succès");
    } catch (error) {
      console.error("Error submitting Batimatec inquiry:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Submit visitor feedback (avis) for Batimatec
   * Captures satisfaction scores and comments
   *
   * @route POST /api/batimatec/feedback
   * @access Public
   *
   * @example
   * POST /api/batimatec/feedback
   * {
   *   "satisfaction_aymen": 9,
   *   "recommandation_aymen": 10,
   *   "satisfaction_batimatec": 8,
   *   "recommandation_batimatec": 9,
   *   "langue": "fr"
   * }
   */
  submitFeedback = async (req: Request, res: Response): Promise<void> => {
    const data = req.body as BatimatecFeedbackData;

    try {
      const fields: string[] = [];
      const values: any[] = [];

      // Validate and add numeric scores (0-10)
      const numericFields = {
        satisfaction_aymen: data.satisfaction_aymen,
        recommandation_aymen: data.recommandation_aymen,
        satisfaction_batimatec: data.satisfaction_batimatec,
        recommandation_batimatec: data.recommandation_batimatec,
      };

      for (const [key, value] of Object.entries(numericFields)) {
        if (value !== undefined && value !== null) {
          const numValue = parseFloat(String(value));
          if (isNaN(numValue) || numValue < 0 || numValue > 10) {
            ApiResponse.badRequest(
              res,
              `Le champ '${key}' doit être un nombre entre 0 et 10`
            );
            return;
          }
          fields.push(key);
          values.push(numValue);
        }
      }

      // Add optional text fields
      if (data.langue) {
        fields.push("langue");
        values.push(data.langue);
      }

      if (data.commentaire) {
        fields.push("commentaire");
        values.push(data.commentaire);
      }

      if (data.suggestion) {
        fields.push("suggestion");
        values.push(data.suggestion);
      }

      // Ensure at least one field is provided
      if (fields.length === 0) {
        ApiResponse.badRequest(res, "Aucun champ à enregistrer");
        return;
      }

      // Build insert object
      const insertData: Record<string, any> = {};
      fields.forEach((field, index) => {
        insertData[field] = values[index];
      });
      insertData.created_at = db.fn.now();

      // Insert into database
      const [id] = await db("avis_batimatec").insert(insertData);

      ApiResponse.created(res, { id }, "Avis enregistré avec succès");
    } catch (error) {
      console.error("Error submitting Batimatec feedback:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Get all feedback entries
   *
   * @route GET /api/batimatec/feedback
   * @access Private (Admin)
   */
  getAllFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const feedback = await db("avis_batimatec")
        .select("*")
        .orderBy("created_at", "desc");

      ApiResponse.success(res, feedback, "Avis récupérés avec succès");
    } catch (error) {
      console.error("Error getting feedback:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Submit interest tracking data
   * Captures visitor property interests and preferences
   *
   * @route POST /api/batimatec/interest
   * @access Public
   *
   * @example
   * POST /api/batimatec/interest
   * {
   *   "type_interet": "achat",
   *   "zones_geographiques": ["Alger", "Oran"],
   *   "type_bien": ["appartement"],
   *   "typologie_bien": ["F3", "F4"],
   *   "budget": "5000000-10000000"
   * }
   */
  submitInterest = async (req: Request, res: Response): Promise<void> => {
    const data = req.body as BatimatecInterestData;

    try {
      // Validate required field
      if (!data.type_interet) {
        ApiResponse.badRequest(res, "Le type d'intérêt est requis");
        return;
      }

      // Prepare insert data with JSON arrays
      const insertData = {
        type_interet: data.type_interet,
        zones: JSON.stringify(data.zones_geographiques || []),
        types_bien: JSON.stringify(data.type_bien || []),
        typologies: JSON.stringify(data.typologie_bien || []),
        budget: data.budget || null,
        zones_alger: JSON.stringify(data.zones_alger || []),
        created_at: db.fn.now(),
      };

      // Insert into database
      const [id] = await db("interet_batimatec").insert(insertData);

      ApiResponse.created(res, { id }, "Intérêt enregistré avec succès");
    } catch (error) {
      console.error("Error submitting interest:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Get all interest entries
   *
   * @route GET /api/batimatec/interest
   * @access Private (Admin)
   */
  getAllInterests = async (req: Request, res: Response): Promise<void> => {
    try {
      const interests = await db("interet_batimatec")
        .select("*")
        .orderBy("created_at", "desc");

      ApiResponse.success(res, interests, "Intérêts récupérés avec succès");
    } catch (error) {
      console.error("Error getting interests:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Submit promoter/exhibitor evaluation
   * Staff evaluation of exhibitor booths and presentations
   *
   * @route POST /api/batimatec/promoter
   * @access Private (Staff)
   *
   * @example
   * POST /api/batimatec/promoter
   * {
   *   "nom_promoteur": "XYZ Promotions",
   *   "taille_stand": "Grand",
   *   "depliants_uniques": 5,
   *   "presence_hotesse": true
   * }
   */
  submitPromoterEvaluation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const data = req.body as PromoterEvaluationData;

    try {
      // Validate required field
      if (!data.nom_promoteur?.trim()) {
        ApiResponse.badRequest(res, "Le nom du promoteur est requis");
        return;
      }

      // Prepare insert data
      const insertData: Record<string, any> = {
        nom_promoteur: data.nom_promoteur.trim(),
        created_at: db.fn.now(),
      };

      // Add optional fields
      const optionalFields = [
        "taille_stand",
        "depliants_uniques",
        "depliants_presents",
        "banners",
        "residences_banners",
        "description_stand",
        "promotions_offres",
        "projet_phare",
        "projet_phare_details",
        "discours_marketing",
        "animations",
        "presence_hotesse",
        "nombre_hommes",
        "nombre_femmes",
        "cadres_seniors",
        "gamme_biens",
        "niveau_standing",
        "avancement_projets",
      ];

      optionalFields.forEach((field) => {
        if (data[field as keyof PromoterEvaluationData] !== undefined) {
          insertData[field] = data[field as keyof PromoterEvaluationData];
        }
      });

      // Insert into database
      const [id] = await db("promoteur_batimatec").insert(insertData);

      ApiResponse.created(res, { id }, "Évaluation enregistrée avec succès");
    } catch (error) {
      console.error("Error submitting promoter evaluation:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Get all promoter evaluations
   *
   * @route GET /api/batimatec/promoter
   * @access Private (Admin)
   */
  getAllPromoterEvaluations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const evaluations = await db("promoteur_batimatec")
        .select("*")
        .orderBy("created_at", "desc");

      ApiResponse.success(
        res,
        evaluations,
        "Évaluations récupérées avec succès"
      );
    } catch (error) {
      console.error("Error getting promoter evaluations:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Get all inquiries
   *
   * @route GET /api/batimatec/inquiries
   * @access Private (Admin)
   */
  getAllInquiries = async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 50, search } = req.query;

    try {
      let query = db("batimatec").select("*");

      // Add search filter
      if (search && typeof search === "string") {
        query = query.where((builder) => {
          builder
            .where("nom", "like", `%${search}%`)
            .orWhere("prenom", "like", `%${search}%`)
            .orWhere("email", "like", `%${search}%`);
        });
      }

      // Get total count
      const [{ count: total }] = await query.clone().count("* as count");

      // Apply pagination
      const offset = (Number(page) - 1) * Number(limit);
      const inquiries = await query
        .orderBy("created_at", "desc")
        .limit(Number(limit))
        .offset(offset);

      ApiResponse.success(
        res,
        {
          inquiries,
          pagination: {
            total: Number(total),
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(Number(total) / Number(limit)),
          },
        },
        "Demandes récupérées avec succès"
      );
    } catch (error) {
      console.error("Error getting inquiries:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };
}

export default new BatimatecController();
