/**
 * Unified Forms Controller
 * Consolidates all form submission endpoints:
 * - General contact forms
 * - Children activity registrations
 * - Trade show submissions (Batimatec)
 * - Kiosk feedback terminals
 * - Popup contact forms
 *
 * @module controllers/forms.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import {
  ContactSubmissionModel,
  LeadSourceModel,
  MarketingConsentModel,
  ContactSubmissionStatus,
  LeadType,
} from "@models";
import emailService from "@/services/email.service";
import db from "@/config/database";

/**
 * Unified Forms Controller class
 * Manages all form submission types in one place
 */
class FormsController {
  // ============================================
  // GENERAL CONTACT FORMS
  // ============================================

  /**
   * Submit general contact form
   * Standard contact form for inquiries
   *
   * @route POST /api/forms/contact
   * @access Public
   *
   * @example
   * POST /api/forms/contact
   * {
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "email": "john@example.com",
   *   "phone": "+213555123456",
   *   "subject": "General Inquiry",
   *   "message": "I would like more information..."
   * }
   */
  submitContactForm = async (req: Request, res: Response): Promise<void> => {
    const {
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      // Tracking data
      utmSource,
      utmMedium,
      utmCampaign,
      sourcePage,
      referrer,
    } = req.body;

    try {
      // Validate required fields
      if (!email || !message) {
        ApiResponse.badRequest(res, "Email and message are required");
        return;
      }

      if (!validateEmail(email)) {
        ApiResponse.badRequest(res, "Invalid email format");
        return;
      }

      // Create contact submission
      const contact = await ContactSubmissionModel.create({
        firstName: firstName || null,
        lastName: lastName || null,
        email: email.toLowerCase(),
        phone: phone || null,
        subject: subject || null,
        message,
        sourcePage: sourcePage || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        referrer: referrer || null,
      });

      // Track lead source (async)
      LeadSourceModel.create({
        leadEmail: email.toLowerCase(),
        leadType: LeadType.CONTACT_FORM,
        leadReferenceId: contact.id,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        referrerUrl: referrer || null,
        landingPageUrl: sourcePage || null,
        sourceIp: req.ip || null,
        userAgent: req.get("user-agent") || null,
      }).catch((err) => console.error("Error tracking lead:", err));

      // Send email notification (async)
      emailService
        .sendContactForm({
          name: `${firstName || ""} ${lastName || ""}`.trim() || email,
          email,
          phone: phone || "Not provided",
          message,
        })
        .catch((err) => console.error("Error sending email:", err));

      ApiResponse.created(
        res,
        { id: contact.id },
        "Contact form submitted successfully"
      );
    } catch (error) {
      console.error("Error in submitContactForm:", error);
      ApiResponse.error(res, "Failed to submit contact form", 500);
    }
  };

  /**
   * Submit popup contact form
   * Includes marketing consent and additional fields
   *
   * @route POST /api/forms/contact/popup
   * @access Public
   *
   * @example
   * POST /api/forms/contact/popup
   * {
   *   "firstName": "Jane",
   *   "lastName": "Smith",
   *   "email": "jane@example.com",
   *   "phone": "+213555987654",
   *   "interest": "Buying Property",
   *   "acceptedTerms": true,
   *   "emailConsent": true,
   *   "smsConsent": false
   * }
   */
  submitPopupContact = async (req: Request, res: Response): Promise<void> => {
    const {
      firstName,
      lastName,
      email,
      phone,
      postalCode,
      interest,
      propertyType,
      comments,
      acceptedTerms,
      emailConsent,
      smsConsent,
      // Tracking
      utmSource,
      utmMedium,
      utmCampaign,
    } = req.body;

    try {
      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !acceptedTerms) {
        ApiResponse.badRequest(
          res,
          "Required fields missing or terms not accepted"
        );
        return;
      }

      if (!validateEmail(email)) {
        ApiResponse.badRequest(res, "Invalid email format");
        return;
      }

      if (!validatePhone(phone)) {
        ApiResponse.badRequest(res, "Invalid phone format");
        return;
      }

      // Create contact submission
      const contact = await ContactSubmissionModel.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        subject: interest || "Popup Contact",
        message:
          comments || `Interest: ${interest}\nProperty Type: ${propertyType}`,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
      });

      // Track marketing consent (async)
      if (emailConsent || smsConsent) {
        MarketingConsentModel.upsertConsent(
          email.toLowerCase(),
          {
            email: emailConsent || false,
            sms: smsConsent || false,
            phone: false,
          },
          "popup-form"
        ).catch((err) => console.error("Error tracking consent:", err));
      }

      ApiResponse.created(
        res,
        { id: contact.id },
        "Contact submitted successfully"
      );
    } catch (error) {
      console.error("Error in submitPopupContact:", error);
      ApiResponse.error(res, "Failed to submit popup contact", 500);
    }
  };

  // ============================================
  // CHILDREN ACTIVITY REGISTRATION
  // ============================================

  /**
   * Register child for activity
   * Requires parental consent and photo rights acknowledgment
   *
   * @route POST /api/forms/children/register
   * @access Public
   *
   * @example
   * POST /api/forms/children/register
   * {
   *   "nom_enfant": "Jean Dupont",
   *   "email": "parent@example.com",
   *   "telephone": "+213555123456",
   *   "responsabilite_parent": true,
   *   "droit_image": true
   * }
   */
  registerChildActivity = async (
    req: Request,
    res: Response
  ): Promise<void> => {
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

      // Validate photo consent is provided
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

      // Check for duplicate registration
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
      console.error("Error in registerChildActivity:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Get all child activity registrations
   *
   * @route GET /api/forms/children/registrations
   * @access Private (Admin)
   */
  getChildRegistrations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
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
      console.error("Error in getChildRegistrations:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  // ============================================
  // BATIMATEC TRADE SHOW
  // ============================================

  /**
   * Submit Batimatec trade show inquiry
   * Captures detailed buyer information for trade show leads
   *
   * @route POST /api/forms/batimatec/inquiry
   * @access Public
   *
   * @example
   * POST /api/forms/batimatec/inquiry
   * {
   *   "nom": "Benali",
   *   "prenom": "Ahmed",
   *   "email": "ahmed@example.com",
   *   "telephone": "+213555123456",
   *   "pays": "Algérie",
   *   "acceptation_regles": true
   * }
   */
  submitBatimatecInquiry = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const {
      email,
      nom,
      prenom,
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
      projet,
      commercial,
    } = req.body;

    try {
      // Validate required fields
      if (
        !nom?.trim() ||
        !prenom?.trim() ||
        !telephone?.trim() ||
        !email?.trim()
      ) {
        ApiResponse.badRequest(
          res,
          "Les champs nom, prénom, téléphone et email sont obligatoires"
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

      // Validate terms acceptance
      if (!acceptation_regles) {
        ApiResponse.badRequest(res, "Vous devez accepter les conditions");
        return;
      }

      // Prepare data for insertion
      const insertData: Record<string, any> = {
        email: email.trim().toLowerCase(),
        nom: nom.trim(),
        prenom: prenom.trim(),
        telephone: telephone.trim(),
        pays: pays?.trim() || "",
        budget_estime: budget_estime?.trim() || null,
        wilaya: wilaya?.trim() || null,
        profession: profession?.trim() || null,
        type_financement: type_financement?.trim() || null,
        interesse_par: interesse_par?.trim() || null,
        localisation_souhaitee: Array.isArray(localisation_souhaitee)
          ? localisation_souhaitee.join(", ")
          : null,
        jour_contact: Array.isArray(jour_contact)
          ? jour_contact.join(", ")
          : null,
        heure_contact: heure_contact?.trim() || null,
        statut_projet: statut_projet?.trim() || null,
        acceptation_regles: acceptation_regles ? 1 : 0,
        projet: projet?.trim() || null,
        commercial: commercial?.trim() || null,
        created_at: db.fn.now(),
      };

      // Insert into database
      const [id] = await db("batimatec").insert(insertData);

      ApiResponse.created(res, { id }, "Demande enregistrée avec succès");
    } catch (error) {
      console.error("Error in submitBatimatecInquiry:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Submit Batimatec trade show feedback
   * Captures satisfaction scores and comments
   *
   * @route POST /api/forms/batimatec/feedback
   * @access Public
   *
   * @example
   * POST /api/forms/batimatec/feedback
   * {
   *   "satisfaction_aymen": 9,
   *   "recommandation_aymen": 10,
   *   "satisfaction_batimatec": 8,
   *   "recommandation_batimatec": 9,
   *   "langue": "fr"
   * }
   */
  submitBatimatecFeedback = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const {
      satisfaction_aymen,
      recommandation_aymen,
      satisfaction_batimatec,
      recommandation_batimatec,
      langue,
      commentaire,
      suggestion,
    } = req.body;

    try {
      const fields: string[] = [];
      const values: any[] = [];

      // Validate and add numeric scores (0-10)
      const numericFields = {
        satisfaction_aymen,
        recommandation_aymen,
        satisfaction_batimatec,
        recommandation_batimatec,
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
      if (langue) {
        fields.push("langue");
        values.push(langue);
      }

      if (commentaire) {
        fields.push("commentaire");
        values.push(commentaire);
      }

      if (suggestion) {
        fields.push("suggestion");
        values.push(suggestion);
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
      console.error("Error in submitBatimatecFeedback:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Submit Batimatec interest tracking
   * Captures visitor property interests and preferences
   *
   * @route POST /api/forms/batimatec/interest
   * @access Public
   *
   * @example
   * POST /api/forms/batimatec/interest
   * {
   *   "type_interet": "achat",
   *   "zones_geographiques": ["Alger", "Oran"],
   *   "type_bien": ["appartement"],
   *   "typologie_bien": ["F3", "F4"]
   * }
   */
  submitBatimatecInterest = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const {
      type_interet,
      zones_geographiques,
      type_bien,
      typologie_bien,
      budget,
      zones_alger,
    } = req.body;

    try {
      // Validate required field
      if (!type_interet) {
        ApiResponse.badRequest(res, "Le type d'intérêt est requis");
        return;
      }

      // Prepare insert data with JSON arrays
      const insertData = {
        type_interet,
        zones: JSON.stringify(zones_geographiques || []),
        types_bien: JSON.stringify(type_bien || []),
        typologies: JSON.stringify(typologie_bien || []),
        budget: budget || null,
        zones_alger: JSON.stringify(zones_alger || []),
        created_at: db.fn.now(),
      };

      // Insert into database
      const [id] = await db("interet_batimatec").insert(insertData);

      ApiResponse.created(res, { id }, "Intérêt enregistré avec succès");
    } catch (error) {
      console.error("Error in submitBatimatecInterest:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  /**
   * Submit promoter/exhibitor evaluation
   * Staff evaluation of exhibitor booths and presentations
   *
   * @route POST /api/forms/batimatec/promoter
   * @access Private (Staff)
   *
   * @example
   * POST /api/forms/batimatec/promoter
   * {
   *   "nom_promoteur": "XYZ Promotions",
   *   "taille_stand": "Grand",
   *   "depliants_uniques": 5
   * }
   */
  submitPromoterEvaluation = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const data = req.body;

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
        if (data[field] !== undefined) {
          insertData[field] = data[field];
        }
      });

      // Insert into database
      const [id] = await db("promoteur_batimatec").insert(insertData);

      ApiResponse.created(res, { id }, "Évaluation enregistrée avec succès");
    } catch (error) {
      console.error("Error in submitPromoterEvaluation:", error);
      ApiResponse.error(res, "Erreur lors de l'enregistrement", 500);
    }
  };

  // ============================================
  // KIOSK FEEDBACK TERMINAL
  // ============================================

  /**
   * Submit kiosk feedback
   * Allows anonymous submissions from tactile terminals
   *
   * @route POST /api/forms/kiosk/feedback
   * @access Public
   *
   * @example
   * POST /api/forms/kiosk/feedback
   * {
   *   "nomComplet": "John Doe",
   *   "email": "john@example.com",
   *   "telephone": "+213555123456",
   *   "question": "When will the new project open?",
   *   "evaluation": 9
   * }
   */
  submitKioskFeedback = async (req: Request, res: Response): Promise<void> => {
    const { nomComplet, email, telephone, question, evaluation } = req.body;

    try {
      // Validate that at least one field is provided (besides evaluation)
      if (!nomComplet && !email && !telephone && !question) {
        ApiResponse.badRequest(
          res,
          "Au moins un champ doit être rempli (nom, email, téléphone ou question)"
        );
        return;
      }

      // Validate evaluation is required and in range
      if (
        evaluation === undefined ||
        evaluation === null ||
        isNaN(Number(evaluation))
      ) {
        ApiResponse.badRequest(res, "L'évaluation est obligatoire");
        return;
      }

      const evaluationNum = Number(evaluation);
      if (evaluationNum < 0 || evaluationNum > 10) {
        ApiResponse.badRequest(
          res,
          "L'évaluation doit être un nombre entre 0 et 10"
        );
        return;
      }

      // Validate email format if provided
      if (email && !validateEmail(email)) {
        ApiResponse.badRequest(res, "Format d'email invalide");
        return;
      }

      // Validate phone format if provided
      if (telephone && !validatePhone(telephone)) {
        ApiResponse.badRequest(res, "Format de téléphone invalide");
        return;
      }

      // Prepare insert data
      const insertData: Record<string, any> = {
        evaluation: evaluationNum,
        created_at: db.fn.now(),
      };

      // Add optional fields if provided
      if (nomComplet?.trim()) {
        insertData.nom_complet = nomComplet.trim();
      }
      if (email?.trim()) {
        insertData.email = email.trim().toLowerCase();
      }
      if (telephone?.trim()) {
        insertData.telephone = telephone.trim();
      }
      if (question?.trim()) {
        insertData.question = question.trim();
      }

      // Insert into database
      const [id] = await db("borne_tactile").insert(insertData);

      console.log(
        `✅ Kiosk feedback submitted: ID ${id}, Rating: ${evaluationNum}/10`
      );

      ApiResponse.created(
        res,
        {
          id,
          evaluation: evaluationNum,
          hasContact: !!(nomComplet || email || telephone),
        },
        "Question enregistrée avec succès"
      );
    } catch (error) {
      console.error("Error in submitKioskFeedback:", error);
      ApiResponse.error(
        res,
        "Erreur lors de l'enregistrement de la question",
        500
      );
    }
  };

  /**
   * Get all kiosk feedback
   *
   * @route GET /api/forms/kiosk/feedback
   * @access Private (Admin)
   */
  getKioskFeedback = async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 50,
      minEvaluation,
      maxEvaluation,
      hasContact,
    } = req.query;

    try {
      let query = db("borne_tactile").select("*");

      // Apply evaluation filters
      if (minEvaluation !== undefined) {
        query = query.where("evaluation", ">=", Number(minEvaluation));
      }

      if (maxEvaluation !== undefined) {
        query = query.where("evaluation", "<=", Number(maxEvaluation));
      }

      // Filter by contact presence
      if (hasContact === "true") {
        query = query.where((builder) => {
          builder
            .whereNotNull("nom_complet")
            .orWhereNotNull("email")
            .orWhereNotNull("telephone");
        });
      } else if (hasContact === "false") {
        query = query
          .whereNull("nom_complet")
          .whereNull("email")
          .whereNull("telephone");
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count: total }] = await countQuery.count("* as count");

      // Apply pagination and ordering
      const offset = (Number(page) - 1) * Number(limit);
      const questions = await query
        .orderBy("created_at", "desc")
        .limit(Number(limit))
        .offset(offset);

      // Transform to response format
      const formatted = questions.map((q) => ({
        id: q.id,
        fullName: q.nom_complet,
        email: q.email,
        phone: q.telephone,
        question: q.question,
        evaluation: q.evaluation,
        createdAt: new Date(q.created_at),
      }));

      ApiResponse.success(
        res,
        {
          feedback: formatted,
          pagination: {
            total: Number(total),
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(Number(total) / Number(limit)),
          },
        },
        "Questions récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getKioskFeedback:", error);
      ApiResponse.error(
        res,
        "Erreur lors de la récupération des questions",
        500
      );
    }
  };

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * Get all contact submissions
   *
   * @route GET /api/forms/contacts
   * @access Private (Admin)
   */
  getAllContacts = async (req: Request, res: Response): Promise<void> => {
    const {
      status,
      email,
      utmSource,
      utmCampaign,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    try {
      const contacts = await ContactSubmissionModel.findAll({
        status: status as ContactSubmissionStatus,
        email: email as string,
        utmSource: utmSource as string,
        utmCampaign: utmCampaign as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      });

      ApiResponse.success(res, contacts, "Contacts retrieved successfully");
    } catch (error) {
      console.error("Error in getAllContacts:", error);
      ApiResponse.error(res, "Failed to retrieve contacts", 500);
    }
  };

  /**
   * Update contact status
   *
   * @route PATCH /api/forms/contacts/:id/status
   * @access Private (Admin)
   */
  updateContactStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, notes } = req.body;

    try {
      if (!status || !Object.values(ContactSubmissionStatus).includes(status)) {
        ApiResponse.badRequest(res, "Valid status is required");
        return;
      }

      const updated = await ContactSubmissionModel.updateStatus(
        Number(id),
        status as ContactSubmissionStatus,
        notes
      );

      if (!updated) {
        ApiResponse.notFound(res, "Contact not found");
        return;
      }

      ApiResponse.success(res, null, "Contact status updated successfully");
    } catch (error) {
      console.error("Error in updateContactStatus:", error);
      ApiResponse.error(res, "Failed to update contact status", 500);
    }
  };

  /**
   * Add notes to contact
   *
   * @route POST /api/forms/contacts/:id/notes
   * @access Private (Admin)
   */
  addContactNotes = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { notes } = req.body;

    try {
      if (!notes) {
        ApiResponse.badRequest(res, "Notes are required");
        return;
      }

      const updated = await ContactSubmissionModel.addNotes(Number(id), notes);

      if (!updated) {
        ApiResponse.notFound(res, "Contact not found");
        return;
      }

      ApiResponse.success(res, null, "Notes added successfully");
    } catch (error) {
      console.error("Error in addContactNotes:", error);
      ApiResponse.error(res, "Failed to add notes", 500);
    }
  };

  /**
   * Get contact statistics
   *
   * @route GET /api/forms/statistics/contacts
   * @access Private (Admin)
   */
  getContactStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await ContactSubmissionModel.getStatusStatistics();

      ApiResponse.success(res, stats, "Statistics retrieved successfully");
    } catch (error) {
      console.error("Error in getContactStatistics:", error);
      ApiResponse.error(res, "Failed to retrieve statistics", 500);
    }
  };

  /**
   * Get Batimatec inquiries
   *
   * @route GET /api/forms/batimatec/inquiries
   * @access Private (Admin)
   */
  getBatimatecInquiries = async (
    req: Request,
    res: Response
  ): Promise<void> => {
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
      console.error("Error in getBatimatecInquiries:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Get all Batimatec feedback
   *
   * @route GET /api/forms/batimatec/feedback
   * @access Private (Admin)
   */
  getAllBatimatecFeedback = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const feedback = await db("avis_batimatec")
        .select("*")
        .orderBy("created_at", "desc");

      ApiResponse.success(res, feedback, "Avis récupérés avec succès");
    } catch (error) {
      console.error("Error in getAllBatimatecFeedback:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Get all Batimatec interests
   *
   * @route GET /api/forms/batimatec/interests
   * @access Private (Admin)
   */
  getAllBatimatecInterests = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const interests = await db("interet_batimatec")
        .select("*")
        .orderBy("created_at", "desc");

      ApiResponse.success(res, interests, "Intérêts récupérés avec succès");
    } catch (error) {
      console.error("Error in getAllBatimatecInterests:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Get all promoter evaluations
   *
   * @route GET /api/forms/batimatec/promoters
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
      console.error("Error in getAllPromoterEvaluations:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Get kiosk statistics
   *
   * @route GET /api/forms/kiosk/statistics
   * @access Private (Admin)
   */
  getKioskStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get total submissions
      const [totalCount] = await db("borne_tactile").count("* as count");

      // Get average evaluation
      const [avgEval] = await db("borne_tactile").avg("evaluation as avg");

      // Get evaluation distribution
      const distribution = await db("borne_tactile")
        .select("evaluation")
        .count("* as count")
        .groupBy("evaluation")
        .orderBy("evaluation", "asc");

      // Get submissions with contact info
      const [withContact] = await db("borne_tactile")
        .where((builder) => {
          builder
            .whereNotNull("nom_complet")
            .orWhereNotNull("email")
            .orWhereNotNull("telephone");
        })
        .count("* as count");

      // Get submissions with questions
      const [withQuestions] = await db("borne_tactile")
        .whereNotNull("question")
        .count("* as count");

      // Calculate NPS-style scores (9-10 = promoters, 0-6 = detractors)
      const [promoters] = await db("borne_tactile")
        .where("evaluation", ">=", 9)
        .count("* as count");

      const [detractors] = await db("borne_tactile")
        .where("evaluation", "<=", 6)
        .count("* as count");

      const total = Number(totalCount.count);
      const npsScore =
        total > 0
          ? Math.round(
              ((Number(promoters.count) - Number(detractors.count)) / total) *
                100
            )
          : 0;

      // Recent submissions (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [recentCount] = await db("borne_tactile")
        .where("created_at", ">=", sevenDaysAgo)
        .count("* as count");

      ApiResponse.success(
        res,
        {
          totalSubmissions: total,
          averageEvaluation: avgEval.avg
            ? parseFloat(avgEval.avg).toFixed(2)
            : 0,
          evaluationDistribution: distribution.map((d) => ({
            rating: d.evaluation,
            count: Number(d.count),
          })),
          npsScore,
          withContactInfo: Number(withContact.count),
          withQuestions: Number(withQuestions.count),
          recentSubmissions: Number(recentCount.count),
          contactRate:
            total > 0
              ? Math.round((Number(withContact.count) / total) * 1000) / 10
              : 0,
          questionRate:
            total > 0
              ? Math.round((Number(withQuestions.count) / total) * 1000) / 10
              : 0,
        },
        "Statistiques récupérées avec succès"
      );
    } catch (error) {
      console.error("Error in getKioskStatistics:", error);
      ApiResponse.error(
        res,
        "Erreur lors de la récupération des statistiques",
        500
      );
    }
  };

  /**
   * Get child activity statistics
   *
   * @route GET /api/forms/children/statistics
   * @access Private (Admin)
   */
  getChildActivityStatistics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
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
      console.error("Error in getChildActivityStatistics:", error);
      ApiResponse.error(res, "Erreur lors de la récupération", 500);
    }
  };

  /**
   * Get overall forms statistics
   * Provides a dashboard overview of all form types
   *
   * @route GET /api/forms/statistics/overview
   * @access Private (Admin)
   */
  getOverviewStatistics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const [
        contactsCount,
        childrenCount,
        batimatecInquiriesCount,
        batimatecFeedbackCount,
        kioskFeedbackCount,
      ] = await Promise.all([
        db("contact_submissions").count("* as count").first(),
        db("activite_enfant").count("* as count").first(),
        db("batimatec").count("* as count").first(),
        db("avis_batimatec").count("* as count").first(),
        db("borne_tactile").count("* as count").first(),
      ]);

      // Get recent submissions (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [recentContacts, recentChildren, recentBatimatec, recentKiosk] =
        await Promise.all([
          db("contact_submissions")
            .where("created_at", ">=", sevenDaysAgo)
            .count("* as count")
            .first(),
          db("activite_enfant")
            .where("created_at", ">=", sevenDaysAgo)
            .count("* as count")
            .first(),
          db("batimatec")
            .where("created_at", ">=", sevenDaysAgo)
            .count("* as count")
            .first(),
          db("borne_tactile")
            .where("created_at", ">=", sevenDaysAgo)
            .count("* as count")
            .first(),
        ]);

      ApiResponse.success(
        res,
        {
          totalSubmissions: {
            contacts: Number(contactsCount?.count || 0),
            childrenActivities: Number(childrenCount?.count || 0),
            batimatecInquiries: Number(batimatecInquiriesCount?.count || 0),
            batimatecFeedback: Number(batimatecFeedbackCount?.count || 0),
            kioskFeedback: Number(kioskFeedbackCount?.count || 0),
            total:
              Number(contactsCount?.count || 0) +
              Number(childrenCount?.count || 0) +
              Number(batimatecInquiriesCount?.count || 0) +
              Number(batimatecFeedbackCount?.count || 0) +
              Number(kioskFeedbackCount?.count || 0),
          },
          recentSubmissions: {
            contacts: Number(recentContacts?.count || 0),
            childrenActivities: Number(recentChildren?.count || 0),
            batimatecInquiries: Number(recentBatimatec?.count || 0),
            kioskFeedback: Number(recentKiosk?.count || 0),
            total:
              Number(recentContacts?.count || 0) +
              Number(recentChildren?.count || 0) +
              Number(recentBatimatec?.count || 0) +
              Number(recentKiosk?.count || 0),
          },
        },
        "Overview statistics retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getOverviewStatistics:", error);
      ApiResponse.error(res, "Failed to retrieve overview statistics", 500);
    }
  };
}

export default new FormsController();
