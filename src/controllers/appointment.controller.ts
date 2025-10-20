/**
 * Appointment Controller
 * Handles property viewing appointments and scheduling
 *
 * @module controllers/appointment.controller
 */

import { Request, Response } from "express";
import { AppointmentRequestModel, LeadSourceModel } from "@models";
import { AppointmentRequestStatus, LeadType } from "@models";
import { ApiResponse } from "@utils/response.util";
import { asyncHandler } from "@middlewares/error-handler.middleware";

/**
 * Appointment Controller class
 * Manages appointment requests and scheduling
 */
class AppointmentController {
  /**
   * Create appointment request
   * Validates time slots and prevents spam
   *
   * @route POST /api/v1/appointments
   * @access Public
   */
  createAppointment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        fullName,
        email,
        phone,
        preferredLocation,
        budgetRange,
        preferredDate,
        preferredTime,
        notes,
        // Tracking
        utmSource,
        utmMedium,
        utmCampaign,
      } = req.body;

      // Validate required fields
      if (!fullName || !email || !phone) {
        ApiResponse.badRequest(res, "Name, email and phone are required");
        return;
      }

      // Anti-spam check (72 hours cooldown)
      const recentAppointments = await AppointmentRequestModel.findByEmail(
        email.toLowerCase()
      );

      if (recentAppointments.length > 0) {
        const lastAppointment = recentAppointments[0];
        const hoursSince =
          (Date.now() - lastAppointment.createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursSince < 72) {
          ApiResponse.badRequest(
            res,
            "You already have a pending appointment. Please wait 72 hours before requesting another."
          );
          return;
        }
      }

      // Create appointment
      const appointment = await AppointmentRequestModel.create({
        fullName,
        email: email.toLowerCase(),
        phone,
        preferredLocation: preferredLocation || null,
        budgetRange: budgetRange || null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTime: preferredTime || null,
        notes: notes || null,
      });

      // Track lead source
      LeadSourceModel.create({
        leadEmail: email.toLowerCase(),
        leadType: LeadType.APPOINTMENT,
        leadReferenceId: appointment.id,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        sourceIp: req.ip || null,
        userAgent: req.get("user-agent") || null,
      }).catch((err) => console.error("Error tracking lead:", err));

      ApiResponse.created(
        res,
        {
          id: appointment.id,
          fullName: appointment.fullName,
          email: appointment.email,
          preferredDate: appointment.preferredDate,
          preferredTime: appointment.preferredTime,
        },
        "Appointment request submitted successfully"
      );
    }
  );

  /**
   * Get all appointments with filtering
   *
   * @route GET /api/v1/appointments
   * @access Private (Admin/Sales)
   */
  getAllAppointments = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        status,
        email,
        preferredDate,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50,
        sortBy,
        sortOrder = "desc",
      } = req.query;

      const appointments = await AppointmentRequestModel.findAll({
        status: status as AppointmentRequestStatus,
        email: email as string,
        preferredDate: preferredDate
          ? new Date(preferredDate as string)
          : undefined,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      });

      ApiResponse.success(
        res,
        appointments,
        "Appointments retrieved successfully"
      );
    }
  );

  /**
   * Get pending appointments
   *
   * @route GET /api/v1/appointments/pending
   * @access Private (Admin/Sales)
   */
  getPendingAppointments = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { limit = 20 } = req.query;

      const appointments = await AppointmentRequestModel.getPending(
        Number(limit)
      );

      ApiResponse.success(
        res,
        appointments,
        "Pending appointments retrieved successfully"
      );
    }
  );

  /**
   * Get upcoming confirmed appointments
   *
   * @route GET /api/v1/appointments/upcoming
   * @access Private (Admin/Sales)
   */
  getUpcomingAppointments = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { limit = 10 } = req.query;

      const appointments = await AppointmentRequestModel.getUpcoming(
        Number(limit)
      );

      ApiResponse.success(
        res,
        appointments,
        "Upcoming appointments retrieved successfully"
      );
    }
  );

  /**
   * Get appointments by date
   *
   * @route GET /api/v1/appointments/date/:date
   * @access Private (Admin/Sales)
   */
  getAppointmentsByDate = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { date } = req.params;

      const appointments = await AppointmentRequestModel.getByDate(
        new Date(date)
      );

      ApiResponse.success(
        res,
        appointments,
        "Appointments retrieved successfully"
      );
    }
  );

  /**
   * Get appointment by ID
   *
   * @route GET /api/v1/appointments/:id
   * @access Private (Admin/Sales)
   */
  getAppointmentById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const appointment = await AppointmentRequestModel.findById(Number(id));

      if (!appointment) {
        ApiResponse.notFound(res, "Appointment not found");
        return;
      }

      ApiResponse.success(
        res,
        appointment,
        "Appointment retrieved successfully"
      );
    }
  );

  /**
   * Update appointment status
   *
   * @route PATCH /api/v1/appointments/:id/status
   * @access Private (Admin/Sales)
   */
  updateAppointmentStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { status } = req.body;

      if (
        !status ||
        !Object.values(AppointmentRequestStatus).includes(status)
      ) {
        ApiResponse.badRequest(res, "Valid status is required");
        return;
      }

      const updated = await AppointmentRequestModel.updateStatus(
        Number(id),
        status as AppointmentRequestStatus
      );

      if (!updated) {
        ApiResponse.notFound(res, "Appointment not found");
        return;
      }

      ApiResponse.success(res, null, "Appointment status updated successfully");
    }
  );

  /**
   * Add notes to appointment
   *
   * @route POST /api/v1/appointments/:id/notes
   * @access Private (Admin/Sales)
   */
  addAppointmentNotes = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { notes } = req.body;

      if (!notes) {
        ApiResponse.badRequest(res, "Notes are required");
        return;
      }

      const updated = await AppointmentRequestModel.addNotes(Number(id), notes);

      if (!updated) {
        ApiResponse.notFound(res, "Appointment not found");
        return;
      }

      ApiResponse.success(res, null, "Notes added successfully");
    }
  );

  /**
   * Get appointment statistics
   *
   * @route GET /api/v1/appointments/statistics
   * @access Private (Admin/Sales Manager)
   */
  getStatistics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const stats = await AppointmentRequestModel.getStatusStatistics();

      ApiResponse.success(res, stats, "Statistics retrieved successfully");
    }
  );
}

export default new AppointmentController();
