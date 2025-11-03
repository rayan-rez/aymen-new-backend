/**
 * Recruitment Controller
 * Handles job applications and hiring workflow
 * Manages resume uploads, interview scheduling, and candidate tracking
 *
 * @module controllers/recruitment.controller
 */

import { Request, Response } from "express";
import { JobApplicationModel, JobApplicationStatus } from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Recruitment Controller class
 * Manages all recruitment and hiring operations
 */
class RecruitmentController {
  /**
   * Submit a job application
   * Handles resume upload and application data
   *
   * @route POST /api/recruitment/apply
   * @access Public
   *
   * @example
   * POST /api/recruitment/apply
   * Content-Type: multipart/form-data
   * {
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "email": "john@example.com",
   *   "phone": "+213555123456",
   *   "appliedPosition": "Sales Manager",
   *   "coverLetter": "I am interested...",
   *   "portfolioUrl": "https://...",
   *   "linkedinUrl": "https://linkedin.com/in/..."
   * }
   */
  submitApplication = async (req: Request, res: Response): Promise<void> => {
    const {
      firstName,
      lastName,
      email,
      phone,
      appliedPosition,
      coverLetter,
      portfolioUrl,
      linkedinUrl,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !appliedPosition) {
      ApiResponse.badRequest(res, "Required fields missing");
      return;
    }

    // Handle file upload (if using multer)
    // const resumeFile = req.file;
    // const resumeUrl = resumeFile ? `/uploads/resumes/${resumeFile.filename}` : null;
    // const resumeFilename = resumeFile?.filename || null;

    // For now, mock the resume handling
    const resumeUrl = null;
    const resumeFilename = null;

    // Create application
    const application = await JobApplicationModel.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      appliedPosition,
      coverLetter: coverLetter || null,
      portfolioUrl: portfolioUrl || null,
      linkedinUrl: linkedinUrl || null,
      resumeUrl,
      resumeFilename,
    });

    ApiResponse.created(
      res,
      {
        id: application.id,
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        appliedPosition: application.appliedPosition,
      },
      "Application submitted successfully"
    );
  };

  /**
   * Get all job applications with filtering
   *
   * @route GET /api/recruitment/applications
   * @access Private (Admin/HR)
   *
   * @query status - Filter by status
   * @query appliedPosition - Filter by position
   * @query email - Filter by email
   * @query dateFrom - Start date filter
   * @query dateTo - End date filter
   * @query page - Page number
   * @query limit - Items per page
   */
  getAllApplications = async (req: Request, res: Response): Promise<void> => {
    const {
      status,
      appliedPosition,
      email,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = "desc",
    } = req.query;

    const applications = await JobApplicationModel.findAll({
      status: status as JobApplicationStatus,
      appliedPosition: appliedPosition as string,
      email: email as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    });

    ApiResponse.success(
      res,
      applications,
      "Applications retrieved successfully"
    );
  };

  /**
   * Get new applications (received status)
   *
   * @route GET /api/recruitment/applications/new
   * @access Private (Admin/HR)
   *
   * @query limit - Maximum number of applications
   */
  getNewApplications = async (req: Request, res: Response): Promise<void> => {
    const { limit = 20 } = req.query;

    const applications = await JobApplicationModel.getNew(Number(limit));

    ApiResponse.success(
      res,
      applications,
      "New applications retrieved successfully"
    );
  };

  /**
   * Get application by ID
   *
   * @route GET /api/recruitment/applications/:id
   * @access Private (Admin/HR)
   */
  getApplicationById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const application = await JobApplicationModel.findById(Number(id));

    if (!application) {
      ApiResponse.notFound(res, "Application not found");
      return;
    }

    ApiResponse.success(res, application, "Application retrieved successfully");
  };

  /**
   * Get applications by position
   *
   * @route GET /api/recruitment/applications/position/:position
   * @access Private (Admin/HR)
   */
  getApplicationsByPosition = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { position } = req.params;

    const applications = await JobApplicationModel.getByPosition(position);

    ApiResponse.success(
      res,
      applications,
      "Applications retrieved successfully"
    );
  };

  /**
   * Update application status
   *
   * @route PATCH /api/recruitment/applications/:id/status
   * @access Private (Admin/HR)
   *
   * @body status - New status
   */
  updateApplicationStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(JobApplicationStatus).includes(status)) {
      ApiResponse.badRequest(res, "Valid status is required");
      return;
    }

    const updated = await JobApplicationModel.updateStatus(
      Number(id),
      status as JobApplicationStatus
    );

    if (!updated) {
      ApiResponse.notFound(res, "Application not found");
      return;
    }

    ApiResponse.success(res, null, "Status updated successfully");
  };

  /**
   * Schedule an interview
   *
   * @route POST /api/recruitment/applications/:id/interview
   * @access Private (Admin/HR)
   *
   * @body interviewDate - Interview date and time
   * @body interviewer - Interviewer name
   */
  scheduleInterview = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { interviewDate, interviewer } = req.body;

    if (!interviewDate || !interviewer) {
      ApiResponse.badRequest(
        res,
        "Interview date and interviewer are required"
      );
      return;
    }

    const success = await JobApplicationModel.scheduleInterview(
      Number(id),
      new Date(interviewDate),
      interviewer
    );

    if (!success) {
      ApiResponse.notFound(res, "Application not found");
      return;
    }

    ApiResponse.success(res, null, "Interview scheduled successfully");
  };

  /**
   * Get upcoming interviews
   *
   * @route GET /api/recruitment/interviews/upcoming
   * @access Private (Admin/HR)
   *
   * @query limit - Maximum number of interviews
   */
  getUpcomingInterviews = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { limit = 10 } = req.query;

    const interviews = await JobApplicationModel.getUpcomingInterviews(
      Number(limit)
    );

    ApiResponse.success(
      res,
      interviews,
      "Upcoming interviews retrieved successfully"
    );
  };

  /**
   * Add HR notes to application
   *
   * @route POST /api/recruitment/applications/:id/notes
   * @access Private (Admin/HR)
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

    const success = await JobApplicationModel.addNotes(Number(id), notes);

    if (!success) {
      ApiResponse.notFound(res, "Application not found");
      return;
    }

    ApiResponse.success(res, null, "Notes added successfully");
  };

  /**
   * Get application statistics
   *
   * @route GET /api/recruitment/statistics
   * @access Private (Admin/HR Manager)
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    const [statusStats, positionStats] = await Promise.all([
      JobApplicationModel.getStatusStatistics(),
      JobApplicationModel.getPositionStatistics(),
    ]);

    ApiResponse.success(
      res,
      {
        byStatus: statusStats,
        byPosition: positionStats,
      },
      "Statistics retrieved successfully"
    );
  };
}

export default new RecruitmentController();
