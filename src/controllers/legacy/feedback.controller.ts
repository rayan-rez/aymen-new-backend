/**
 * Feedback Controller
 * Handles customer feedback, reviews, and satisfaction surveys
 * Manages NPS scoring, kiosk feedback, and trade show evaluations
 *
 * @module controllers/feedback.controller
 */

import { Request, Response } from "express";
import { CustomerFeedbackModel, FeedbackType, FeedbackLanguage } from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Feedback Controller class
 * Manages all customer feedback operations
 */
class FeedbackController {
  /**
   * Submit customer feedback
   * Supports multiple feedback types (event, property visit, kiosk, etc.)
   *
   * @route POST /api/feedback
   * @access Public
   */
  submitFeedback = async (req: Request, res: Response): Promise<void> => {
    const {
      fullName,
      email,
      phone,
      feedbackType,
      overallSatisfaction,
      recommendationLikelihood,
      feedbackComments,
      suggestions,
      projectId,
      relatedEvent,
      language = FeedbackLanguage.FR,
    } = req.body;

    // Validate required fields
    if (!feedbackType) {
      ApiResponse.badRequest(res, "Feedback type is required");
      return;
    }

    // Validate scores if provided
    if (overallSatisfaction !== undefined) {
      const score = Number(overallSatisfaction);
      if (isNaN(score) || score < 1 || score > 10) {
        ApiResponse.badRequest(
          res,
          "Overall satisfaction must be between 1 and 10"
        );
        return;
      }
    }

    if (recommendationLikelihood !== undefined) {
      const score = Number(recommendationLikelihood);
      if (isNaN(score) || score < 1 || score > 10) {
        ApiResponse.badRequest(
          res,
          "Recommendation likelihood must be between 1 and 10"
        );
        return;
      }
    }

    // Create feedback
    const feedback = await CustomerFeedbackModel.create({
      fullName: fullName || null,
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
      feedbackType: feedbackType as FeedbackType,
      overallSatisfaction: overallSatisfaction
        ? Number(overallSatisfaction)
        : null,
      recommendationLikelihood: recommendationLikelihood
        ? Number(recommendationLikelihood)
        : null,
      feedbackComments: feedbackComments || null,
      suggestions: suggestions || null,
      projectId: projectId ? Number(projectId) : null,
      relatedEvent: relatedEvent || null,
      language: (language as FeedbackLanguage) || FeedbackLanguage.FR,
    });

    ApiResponse.created(
      res,
      { id: feedback.id },
      "Feedback submitted successfully. Thank you!"
    );
  };

  /**
   * Submit kiosk feedback
   * Quick feedback collection from physical kiosks
   * Requires at least one contact field OR feedback score
   *
   * @route POST /api/feedback/kiosk
   * @access Public
   */
  submitKioskFeedback = async (req: Request, res: Response): Promise<void> => {
    const {
      fullName,
      email,
      phone,
      question,
      overallSatisfaction,
      language = FeedbackLanguage.FR,
    } = req.body;

    // Validate that at least satisfaction score is provided
    if (overallSatisfaction === undefined) {
      ApiResponse.badRequest(res, "Satisfaction rating is required");
      return;
    }

    // Validate satisfaction score
    const score = Number(overallSatisfaction);
    if (isNaN(score) || score < 0 || score > 10) {
      ApiResponse.badRequest(
        res,
        "Satisfaction rating must be between 0 and 10"
      );
      return;
    }

    // Create kiosk feedback
    const feedback = await CustomerFeedbackModel.create({
      fullName: fullName || null,
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
      feedbackType: FeedbackType.KIOSK,
      overallSatisfaction: score,
      feedbackComments: question || null,
      language: (language as FeedbackLanguage) || FeedbackLanguage.FR,
    });

    ApiResponse.created(
      res,
      { id: feedback.id },
      "Thank you for your feedback!"
    );
  };

  /**
   * Submit trade show feedback
   * Includes company and event satisfaction ratings
   *
   * @route POST /api/feedback/trade-show
   * @access Public
   */
  submitTradeShowFeedback = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const {
      companySatisfaction,
      companyRecommendation,
      eventSatisfaction,
      eventRecommendation,
      positiveFeedback,
      suggestions,
      language = FeedbackLanguage.FR,
      tradeShowName,
    } = req.body;

    // Validate required fields
    if (
      companySatisfaction === undefined ||
      companyRecommendation === undefined
    ) {
      ApiResponse.badRequest(
        res,
        "Company satisfaction and recommendation ratings are required"
      );
      return;
    }

    if (eventSatisfaction === undefined || eventRecommendation === undefined) {
      ApiResponse.badRequest(
        res,
        "Event satisfaction and recommendation ratings are required"
      );
      return;
    }

    // Validate all scores (0-10)
    const scores = [
      companySatisfaction,
      companyRecommendation,
      eventSatisfaction,
      eventRecommendation,
    ];

    for (const score of scores) {
      const numScore = Number(score);
      if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        ApiResponse.badRequest(res, "All ratings must be between 0 and 10");
        return;
      }
    }

    // Create combined feedback comment
    const feedbackComments = [
      positiveFeedback ? `Positive: ${positiveFeedback}` : null,
      suggestions ? `Suggestions: ${suggestions}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Create feedback for company
    await CustomerFeedbackModel.create({
      feedbackType: FeedbackType.EVENT_FEEDBACK,
      overallSatisfaction: Number(companySatisfaction),
      recommendationLikelihood: Number(companyRecommendation),
      feedbackComments: feedbackComments || null,
      relatedEvent: tradeShowName || "Trade Show",
      language: (language as FeedbackLanguage) || FeedbackLanguage.FR,
    });

    ApiResponse.created(res, null, "Thank you for your valuable feedback!");
  };

  /**
   * Get all feedback with filtering
   *
   * @route GET /api/feedback
   * @access Private (Admin)
   */
  getAllFeedback = async (req: Request, res: Response): Promise<void> => {
    const {
      feedbackType,
      projectId,
      language,
      minSatisfaction,
      dateFrom,
      dateTo,
      page,
      limit,
    } = req.query;

    const feedback = await CustomerFeedbackModel.findAll({
      feedbackType: feedbackType as FeedbackType,
      projectId: projectId ? Number(projectId) : undefined,
      language: language as FeedbackLanguage,
      minSatisfaction: minSatisfaction ? Number(minSatisfaction) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    ApiResponse.success(res, feedback, "Feedback retrieved successfully");
  };

  /**
   * Get feedback by type
   *
   * @route GET /api/feedback/type/:type
   * @access Private (Admin)
   */
  getFeedbackByType = async (req: Request, res: Response): Promise<void> => {
    const { type } = req.params;

    if (!Object.values(FeedbackType).includes(type as FeedbackType)) {
      ApiResponse.badRequest(res, "Invalid feedback type");
      return;
    }

    const feedback = await CustomerFeedbackModel.getByType(
      type as FeedbackType
    );

    ApiResponse.success(res, feedback, "Feedback retrieved successfully");
  };

  /**
   * Get NPS statistics
   * Calculates Net Promoter Score metrics
   *
   * @route GET /api/feedback/nps
   * @access Private (Admin)
   */
  getNPSStatistics = async (req: Request, res: Response): Promise<void> => {
    const stats = await CustomerFeedbackModel.getNPSStatistics();

    ApiResponse.success(res, stats, "NPS statistics retrieved successfully");
  };

  /**
   * Get average satisfaction score
   *
   * @route GET /api/feedback/satisfaction
   * @access Private (Admin)
   */
  getAverageSatisfaction = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { feedbackType } = req.query;

    const avgScore = await CustomerFeedbackModel.getAverageSatisfaction(
      feedbackType as FeedbackType
    );

    ApiResponse.success(
      res,
      { averageSatisfaction: avgScore },
      "Average satisfaction retrieved successfully"
    );
  };

  /**
   * Get positive feedback (satisfaction >= 8)
   *
   * @route GET /api/feedback/positive
   * @access Private (Admin/Marketing)
   */
  getPositiveFeedback = async (req: Request, res: Response): Promise<void> => {
    const { limit = 10 } = req.query;

    const feedback = await CustomerFeedbackModel.getPositive(Number(limit));

    ApiResponse.success(
      res,
      feedback,
      "Positive feedback retrieved successfully"
    );
  };

  /**
   * Get negative feedback (satisfaction <= 5)
   * Helps identify areas for improvement
   *
   * @route GET /api/feedback/negative
   * @access Private (Admin)
   */
  getNegativeFeedback = async (req: Request, res: Response): Promise<void> => {
    const { limit = 20 } = req.query;

    const feedback = await CustomerFeedbackModel.getNegative(Number(limit));

    ApiResponse.success(
      res,
      feedback,
      "Negative feedback retrieved successfully"
    );
  };

  /**
   * Get feedback statistics by type
   *
   * @route GET /api/feedback/statistics
   * @access Private (Admin)
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    const stats = await CustomerFeedbackModel.getStatisticsByType();

    ApiResponse.success(res, stats, "Statistics retrieved successfully");
  };

  /**
   * Get recent feedback
   *
   * @route GET /api/feedback/recent
   * @access Private (Admin)
   */
  getRecentFeedback = async (req: Request, res: Response): Promise<void> => {
    const { limit = 10 } = req.query;

    const feedback = await CustomerFeedbackModel.getRecent(Number(limit));

    ApiResponse.success(
      res,
      feedback,
      "Recent feedback retrieved successfully"
    );
  };
}

export default new FeedbackController();
