/**
 * Kiosk Controller
 * Handles tactile kiosk/terminal interactions
 * Manages anonymous questions and satisfaction ratings
 *
 * @module controllers/kiosk.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import db from "@/config/database";

/**
 * Kiosk question interface
 */
interface KioskQuestion {
  id: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  question: string | null;
  evaluation: number;
  createdAt: Date;
}

/**
 * Kiosk submission data
 */
interface KioskSubmissionData {
  nomComplet?: string;
  email?: string;
  telephone?: string;
  question?: string;
  evaluation: number;
}

/**
 * Kiosk Controller class
 * Manages tactile terminal interactions and feedback
 */
class KioskController {
  /**
   * Submits a kiosk question with evaluation
   * Allows anonymous submissions with optional contact info
   *
   * @route POST /api/kiosk/questions
   * @access Public
   *
   * @example
   * POST /api/kiosk/questions
   * {
   *   "nomComplet": "John Doe",
   *   "email": "john@example.com",
   *   "telephone": "+213555123456",
   *   "question": "When will the new project open?",
   *   "evaluation": 9
   * }
   */
  submitQuestion = async (req: Request, res: Response): Promise<void> => {
    const { nomComplet, email, telephone, question, evaluation } =
      req.body as KioskSubmissionData;

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
        `✅ Kiosk question submitted: ID ${id}, Rating: ${evaluationNum}/10`
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
      console.error("Error submitting kiosk question:", error);
      ApiResponse.error(
        res,
        "Erreur lors de l'enregistrement de la question",
        500
      );
    }
  };

  /**
   * Gets all kiosk questions
   * Admin endpoint with pagination and filtering
   *
   * @route GET /api/kiosk/questions
   * @access Private (Admin)
   *
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 50)
   * @query minEvaluation - Minimum evaluation filter
   * @query maxEvaluation - Maximum evaluation filter
   *
   * @example
   * GET /api/kiosk/questions?page=1&limit=20&minEvaluation=8
   */
  getAllQuestions = async (req: Request, res: Response): Promise<void> => {
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
      const formatted: KioskQuestion[] = questions.map((q) => ({
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
          questions: formatted,
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
      console.error("Error getting kiosk questions:", error);
      ApiResponse.error(
        res,
        "Erreur lors de la récupération des questions",
        500
      );
    }
  };

  /**
   * Gets kiosk statistics
   * Provides insights on ratings and response patterns
   *
   * @route GET /api/kiosk/statistics
   * @access Private (Admin)
   *
   * @example
   * GET /api/kiosk/statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
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
      console.error("Error getting kiosk statistics:", error);
      ApiResponse.error(
        res,
        "Erreur lors de la récupération des statistiques",
        500
      );
    }
  };

  /**
   * Gets high-rated submissions (evaluation >= 8)
   * Useful for positive feedback review
   *
   * @route GET /api/kiosk/positive-feedback
   * @access Private (Admin)
   *
   * @example
   * GET /api/kiosk/positive-feedback?limit=20
   */
  getPositiveFeedback = async (req: Request, res: Response): Promise<void> => {
    const { limit = 20 } = req.query;

    try {
      const questions = await db("borne_tactile")
        .where("evaluation", ">=", 8)
        .orderBy("evaluation", "desc")
        .orderBy("created_at", "desc")
        .limit(Number(limit));

      const formatted: KioskQuestion[] = questions.map((q) => ({
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
        formatted,
        "Retours positifs récupérés avec succès"
      );
    } catch (error) {
      console.error("Error getting positive feedback:", error);
      ApiResponse.error(
        res,
        "Erreur lors de la récupération des retours positifs",
        500
      );
    }
  };

  /**
   * Gets low-rated submissions (evaluation <= 5)
   * Useful for identifying issues
   *
   * @route GET /api/kiosk/negative-feedback
   * @access Private (Admin)
   *
   * @example
   * GET /api/kiosk/negative-feedback?limit=20
   */
  getNegativeFeedback = async (req: Request, res: Response): Promise<void> => {
    const { limit = 20 } = req.query;

    try {
      const questions = await db("borne_tactile")
        .where("evaluation", "<=", 5)
        .orderBy("evaluation", "asc")
        .orderBy("created_at", "desc")
        .limit(Number(limit));

      const formatted: KioskQuestion[] = questions.map((q) => ({
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
        formatted,
        "Retours négatifs récupérés avec succès"
      );
    } catch (error) {
      console.error("Error getting negative feedback:", error);
      ApiResponse.error(
        res,
        "Erreur lors de la récupération des retours négatifs",
        500
      );
    }
  };
}

export default new KioskController();
