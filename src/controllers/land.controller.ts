/**
 * Land Submission Controller
 * Handles land/terrain acquisition submissions
 * Manages property owner submissions and evaluation workflow
 *
 * @module controllers/land.controller
 */

import { Request, Response } from "express";
import { LandSubmissionModel, LandSubmissionStatus } from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Land Controller class
 * Manages land acquisition submissions and evaluations
 */
class LandController {
  /**
   * Submit a land property
   * Property owners can submit their land for acquisition
   *
   * @route POST /api/land/submit
   * @access Public
   *
   * @example
   * POST /api/land/submit
   * {
   *   "ownerName": "Ahmed Ben Ali",
   *   "email": "ahmed@example.com",
   *   "phone": "+213555123456",
   *   "address": "123 Main Street, Annaba",
   *   "city": "Annaba",
   *   "stateProvince": "Annaba",
   *   "areaSqm": 500,
   *   "facadeCount": 2,
   *   "hasBuildingPermit": true,
   *   "hasLandTitle": true,
   *   "hasPropertyDeed": true,
   *   "hasCadastralPlan": false,
   *   "hasUrbanPlanningCertificate": false,
   *   "hasFeridaCertificate": false
   * }
   */
  submitLand = async (req: Request, res: Response): Promise<void> => {
    const {
      ownerName,
      email,
      phone,
      address,
      city,
      stateProvince,
      areaSqm,
      facadeCount,
      hasBuildingPermit,
      hasLandTitle,
      hasPropertyDeed,
      hasCadastralPlan,
      hasUrbanPlanningCertificate,
      hasFeridaCertificate,
    } = req.body;

    // Validate required fields
    if (!ownerName || !phone || !address) {
      ApiResponse.badRequest(
        res,
        "Owner name, phone, and address are required"
      );
      return;
    }

    // Create land submission
    const submission = await LandSubmissionModel.create({
      ownerName,
      email: email ? email.toLowerCase() : null,
      phone,
      address,
      city: city || null,
      stateProvince: stateProvince || null,
      areaSqm: areaSqm ? Number(areaSqm) : null,
      facadeCount: facadeCount ? Number(facadeCount) : null,
      hasBuildingPermit: Boolean(hasBuildingPermit),
      hasLandTitle: Boolean(hasLandTitle),
      hasPropertyDeed: Boolean(hasPropertyDeed),
      hasCadastralPlan: Boolean(hasCadastralPlan),
      hasUrbanPlanningCertificate: Boolean(hasUrbanPlanningCertificate),
      hasFeridaCertificate: Boolean(hasFeridaCertificate),
    });

    ApiResponse.created(
      res,
      {
        id: submission.id,
        ownerName: submission.ownerName,
        address: submission.address,
        status: submission.status,
      },
      "Land submission received successfully"
    );
  };

  /**
   * Get all land submissions with filtering
   *
   * @route GET /api/land/submissions
   * @access Private (Admin/Evaluator)
   *
   * @query status - Filter by status
   * @query city - Filter by city
   * @query assignedEvaluator - Filter by evaluator
   * @query hasAllDocuments - Filter by document completeness
   * @query minArea - Minimum area filter
   * @query maxArea - Maximum area filter
   * @query page - Page number
   * @query limit - Items per page
   */
  getAllSubmissions = async (req: Request, res: Response): Promise<void> => {
    const {
      status,
      city,
      assignedEvaluator,
      email,
      phone,
      hasAllDocuments,
      minArea,
      maxArea,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = "desc",
    } = req.query;

    const submissions = await LandSubmissionModel.findAll({
      status: status as LandSubmissionStatus,
      city: city as string,
      assignedEvaluator: assignedEvaluator as string,
      email: email as string,
      phone: phone as string,
      hasAllDocuments: hasAllDocuments === "true",
      minArea: minArea ? Number(minArea) : undefined,
      maxArea: maxArea ? Number(maxArea) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    });

    ApiResponse.success(res, submissions, "Submissions retrieved successfully");
  };

  /**
   * Get new submissions (submitted status)
   *
   * @route GET /api/land/submissions/new
   * @access Private (Admin/Evaluator)
   *
   * @query limit - Maximum number of submissions
   */
  getNewSubmissions = async (req: Request, res: Response): Promise<void> => {
    const { limit = 20 } = req.query;

    const submissions = await LandSubmissionModel.getNew(Number(limit));

    ApiResponse.success(
      res,
      submissions,
      "New submissions retrieved successfully"
    );
  };

  /**
   * Get submission by ID
   *
   * @route GET /api/land/submissions/:id
   * @access Private (Admin/Evaluator)
   */
  getSubmissionById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const submission = await LandSubmissionModel.findById(Number(id));

    if (!submission) {
      ApiResponse.notFound(res, "Submission not found");
      return;
    }

    ApiResponse.success(res, submission, "Submission retrieved successfully");
  };

  /**
   * Get submissions by city
   *
   * @route GET /api/land/submissions/city/:city
   * @access Private (Admin/Evaluator)
   */
  getSubmissionsByCity = async (req: Request, res: Response): Promise<void> => {
    const { city } = req.params;

    const submissions = await LandSubmissionModel.getByCity(city);

    ApiResponse.success(res, submissions, "Submissions retrieved successfully");
  };

  /**
   * Get submissions with complete documentation
   *
   * @route GET /api/land/submissions/complete-documents
   * @access Private (Admin/Evaluator)
   */
  getWithCompleteDocuments = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const submissions = await LandSubmissionModel.getWithCompleteDocuments();

    ApiResponse.success(
      res,
      submissions,
      "Complete submissions retrieved successfully"
    );
  };

  /**
   * Update submission status
   *
   * @route PATCH /api/land/submissions/:id/status
   * @access Private (Admin/Evaluator)
   *
   * @body status - New status
   */
  updateSubmissionStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(LandSubmissionStatus).includes(status)) {
      ApiResponse.badRequest(res, "Valid status is required");
      return;
    }

    const updated = await LandSubmissionModel.updateStatus(
      Number(id),
      status as LandSubmissionStatus
    );

    if (!updated) {
      ApiResponse.notFound(res, "Submission not found");
      return;
    }

    ApiResponse.success(res, null, "Status updated successfully");
  };

  /**
   * Assign evaluator to submission
   *
   * @route PATCH /api/land/submissions/:id/assign
   * @access Private (Admin/Manager)
   *
   * @body evaluator - Evaluator name/ID
   */
  assignEvaluator = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { evaluator } = req.body;

    if (!evaluator) {
      ApiResponse.badRequest(res, "Evaluator is required");
      return;
    }

    const success = await LandSubmissionModel.assign(Number(id), evaluator);

    if (!success) {
      ApiResponse.notFound(res, "Submission not found");
      return;
    }

    ApiResponse.success(res, null, "Evaluator assigned successfully");
  };

  /**
   * Get evaluator's assigned submissions
   *
   * @route GET /api/land/submissions/assigned/:evaluator
   * @access Private (Evaluator)
   */
  getAssignedSubmissions = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { evaluator } = req.params;

    const submissions = await LandSubmissionModel.getAssigned(evaluator);

    ApiResponse.success(
      res,
      submissions,
      "Assigned submissions retrieved successfully"
    );
  };

  /**
   * Set evaluation results
   *
   * @route POST /api/land/submissions/:id/evaluation
   * @access Private (Evaluator)
   *
   * @body estimatedValue - Estimated property value
   * @body evaluationDate - Date of evaluation
   */
  setEvaluation = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { estimatedValue, evaluationDate } = req.body;

    if (!estimatedValue || !evaluationDate) {
      ApiResponse.badRequest(
        res,
        "Estimated value and evaluation date are required"
      );
      return;
    }

    const success = await LandSubmissionModel.setEvaluation(
      Number(id),
      Number(estimatedValue),
      new Date(evaluationDate)
    );

    if (!success) {
      ApiResponse.notFound(res, "Submission not found");
      return;
    }

    ApiResponse.success(res, null, "Evaluation completed successfully");
  };

  /**
   * Add internal notes
   *
   * @route POST /api/land/submissions/:id/notes
   * @access Private (Admin/Evaluator)
   *
   * @body notes - Notes to add
   */
  addNotes = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes) {
      ApiResponse.badRequest(res, "Notes are required");
      return;
    }

    const success = await LandSubmissionModel.addNotes(Number(id), notes);

    if (!success) {
      ApiResponse.notFound(res, "Submission not found");
      return;
    }

    ApiResponse.success(res, null, "Notes added successfully");
  };

  /**
   * Get submission statistics
   *
   * @route GET /api/land/statistics
   * @access Private (Admin/Manager)
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    const [statusStats, documentStats] = await Promise.all([
      LandSubmissionModel.getStatusStatistics(),
      LandSubmissionModel.getDocumentStatistics(),
    ]);

    ApiResponse.success(
      res,
      {
        byStatus: statusStats,
        documents: documentStats,
      },
      "Statistics retrieved successfully"
    );
  };
}

export default new LandController();
