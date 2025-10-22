/**
 * Land Submission Controller
 * Manages land/terrain acquisition submissions and evaluation workflow
 *
 * @module controllers/land.controller
 */

import { Request, Response } from "express";
import { LandSubmissionModel, LandSubmissionStatus } from "@models";
import { ApiResponse } from "@utils/response.util";

class LandController {
  /**
   * @route POST /api/land/submissions
   * @access Public
   */
  create = async (req: Request, res: Response): Promise<void> => {
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

    if (!ownerName || !phone || !address) {
      ApiResponse.badRequest(
        res,
        "Owner name, phone, and address are required"
      );
      return;
    }

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
   * @route GET /api/land/submissions
   * @access Private (Admin/Evaluator)
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
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
   * @route GET /api/land/submissions/:id
   * @access Private (Admin/Evaluator)
   */
  getOne = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const submission = await LandSubmissionModel.findById(Number(id));

    if (!submission) {
      ApiResponse.notFound(res, "Submission not found");
      return;
    }

    ApiResponse.success(res, submission, "Submission retrieved successfully");
  };

  /**
   * @route PATCH /api/land/submissions/:id
   * @access Private (Admin/Evaluator)
   */
  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
      status,
      evaluator,
      estimatedValue,
      evaluationDate,
      notes,
    } = req.body;

    try {
      if (status && !Object.values(LandSubmissionStatus).includes(status)) {
        ApiResponse.badRequest(res, "Invalid status");
        return;
      }

      let success = false;

      if (status) {
        success = await LandSubmissionModel.updateStatus(
          Number(id),
          status as LandSubmissionStatus
        );
      } else if (evaluator) {
        success = await LandSubmissionModel.assign(Number(id), evaluator);
      } else if (estimatedValue && evaluationDate) {
        success = await LandSubmissionModel.setEvaluation(
          Number(id),
          Number(estimatedValue),
          new Date(evaluationDate)
        );
      } else if (notes) {
        success = await LandSubmissionModel.addNotes(Number(id), notes);
      }

      if (!success) {
        ApiResponse.notFound(res, "Submission not found or update failed");
        return;
      }

      ApiResponse.success(res, null, "Submission updated successfully");
    } catch (error) {
      console.error("Error in update:", error);
      ApiResponse.error(res, "Failed to update submission", 500);
    }
  };

  /**
   * @route GET /api/land/submissions/filter/status/:status
   * @access Private (Admin/Evaluator)
   */
  getByFilter = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.params;
    const { city, evaluator, limit } = req.query;

    try {
      let submissions;

      if (status === "new") {
        submissions = await LandSubmissionModel.getNew(
          limit ? Number(limit) : 20
        );
      } else if (status === "complete-docs") {
        submissions = await LandSubmissionModel.getWithCompleteDocuments();
      } else if (city) {
        submissions = await LandSubmissionModel.getByCity(city as string);
      } else if (evaluator) {
        submissions = await LandSubmissionModel.getAssigned(
          evaluator as string
        );
      } else {
        submissions = await LandSubmissionModel.findAll({
          status: status as LandSubmissionStatus,
          limit: limit ? Number(limit) : 50,
        });
      }

      ApiResponse.success(
        res,
        submissions,
        "Submissions retrieved successfully"
      );
    } catch (error) {
      console.error("Error in getByFilter:", error);
      ApiResponse.error(res, "Failed to retrieve submissions", 500);
    }
  };

  /**
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