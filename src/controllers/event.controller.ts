/**
 * Event Controller
 * Handles event registrations, check-ins, and event management
 * Supports multiple event types: open houses, trade shows, inaugurations, networking
 *
 * @module controllers/event.controller
 */

import { Request, Response } from "express";
import {
  EventRegistrationModel,
  LeadSourceModel,
  MarketingConsentModel,
  EventType,
  LeadType,
} from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Event Controller class
 * Manages all event-related operations
 */
class EventController {
  /**
   * Register for an event
   * Creates event registration with optional time slot selection
   *
   * @route POST /api/events/register
   * @access Public
   */
  registerForEvent = async (req: Request, res: Response): Promise<void> => {
    const {
      firstName,
      lastName,
      email,
      phone,
      eventType,
      eventDate,
      selectedTimeSlots,
      acceptedTerms,
      photoConsent = false,
      // Tracking
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
      sourcePage,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !eventType || !eventDate) {
      ApiResponse.badRequest(
        res,
        "First name, last name, event type, and event date are required"
      );
      return;
    }

    // Validate that at least email or phone is provided
    if (!email && !phone) {
      ApiResponse.badRequest(
        res,
        "Either email or phone number must be provided"
      );
      return;
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      ApiResponse.badRequest(res, "You must accept the terms and conditions");
      return;
    }

    // Check for duplicate registration
    if (email) {
      const existing = await EventRegistrationModel.findAll({
        email: email.toLowerCase(),
        eventType: eventType as EventType,
        eventDate: new Date(eventDate),
      });

      if (existing.length > 0) {
        ApiResponse.conflict(res, "You have already registered for this event");
        return;
      }
    }

    // Create registration
    const registration = await EventRegistrationModel.create({
      firstName,
      lastName,
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
      eventType: eventType as EventType,
      eventDate: new Date(eventDate),
      selectedTimeSlots: selectedTimeSlots || null,
      acceptedTerms: Boolean(acceptedTerms),
      photoConsent: Boolean(photoConsent),
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      registrationSource: sourcePage || null,
      referrer: referrer || null,
    });

    // Track lead source if email provided
    if (email) {
      LeadSourceModel.create({
        leadEmail: email.toLowerCase(),
        leadType: LeadType.EVENT_REGISTRATION,
        leadReferenceId: registration.id,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        referrerUrl: referrer || null,
        landingPageUrl: sourcePage || null,
        sourceIp: req.ip || null,
        userAgent: req.get("user-agent") || null,
      }).catch((err) => console.error("Error tracking lead:", err));
    }

    ApiResponse.created(
      res,
      {
        id: registration.id,
        firstName: registration.firstName,
        lastName: registration.lastName,
        eventDate: registration.eventDate,
      },
      "Successfully registered for the event!"
    );
  };

  /**
   * Get all event registrations with filtering
   *
   * @route GET /api/events/registrations
   * @access Private (Admin/Sales)
   */
  getAllRegistrations = async (req: Request, res: Response): Promise<void> => {
    const {
      eventType,
      eventDate,
      email,
      phone,
      assignedSalesperson,
      hasCheckedIn,
      dateFrom,
      dateTo,
      page,
      limit,
    } = req.query;

    const registrations = await EventRegistrationModel.findAll({
      eventType: eventType as EventType,
      eventDate: eventDate ? new Date(eventDate as string) : undefined,
      email: email as string,
      phone: phone as string,
      assignedSalesperson: assignedSalesperson as string,
      hasCheckedIn: hasCheckedIn === "true",
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    ApiResponse.success(
      res,
      registrations,
      "Registrations retrieved successfully"
    );
  };

  /**
   * Get registrations for a specific event
   *
   * @route GET /api/events/:eventType/:eventDate
   * @access Private (Admin/Sales)
   */
  getEventRegistrations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { eventType, eventDate } = req.params;

    if (!Object.values(EventType).includes(eventType as EventType)) {
      ApiResponse.badRequest(res, "Invalid event type");
      return;
    }

    const registrations = await EventRegistrationModel.getByEvent(
      eventType as EventType,
      new Date(eventDate)
    );

    ApiResponse.success(
      res,
      registrations,
      "Event registrations retrieved successfully"
    );
  };

  /**
   * Check in an attendee
   * Records arrival time for event tracking
   *
   * @route POST /api/events/check-in/:id
   * @access Private (Admin/Staff)
   */
  checkIn = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const registration = await EventRegistrationModel.findById(Number(id));
    if (!registration) {
      ApiResponse.notFound(res, "Registration not found");
      return;
    }

    // Check if already checked in
    if (registration.checkedInAt) {
      ApiResponse.badRequest(res, "Attendee already checked in");
      return;
    }

    const success = await EventRegistrationModel.checkIn(Number(id));

    if (success) {
      ApiResponse.success(res, null, "Check-in successful");
    } else {
      ApiResponse.error(res, "Failed to check in", 500);
    }
  };

  /**
   * Check out an attendee
   * Records departure time for attendance tracking
   *
   * @route POST /api/events/check-out/:id
   * @access Private (Admin/Staff)
   */
  checkOut = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const registration = await EventRegistrationModel.findById(Number(id));
    if (!registration) {
      ApiResponse.notFound(res, "Registration not found");
      return;
    }

    // Check if checked in
    if (!registration.checkedInAt) {
      ApiResponse.badRequest(res, "Attendee must check in first");
      return;
    }

    // Check if already checked out
    if (registration.checkedOutAt) {
      ApiResponse.badRequest(res, "Attendee already checked out");
      return;
    }

    const success = await EventRegistrationModel.checkOut(Number(id));

    if (success) {
      ApiResponse.success(res, null, "Check-out successful");
    } else {
      ApiResponse.error(res, "Failed to check out", 500);
    }
  };

  /**
   * Submit event feedback
   * Collects satisfaction and recommendation scores
   *
   * @route POST /api/events/feedback/:id
   * @access Public
   */
  submitEventFeedback = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { satisfactionScore, recommendationScore, comments } = req.body;

    // Validate scores
    if (satisfactionScore === undefined || recommendationScore === undefined) {
      ApiResponse.badRequest(
        res,
        "Satisfaction and recommendation scores are required"
      );
      return;
    }

    // Validate score ranges (1-10)
    const satisfaction = Number(satisfactionScore);
    const recommendation = Number(recommendationScore);

    if (
      isNaN(satisfaction) ||
      satisfaction < 1 ||
      satisfaction > 10 ||
      isNaN(recommendation) ||
      recommendation < 1 ||
      recommendation > 10
    ) {
      ApiResponse.badRequest(res, "Scores must be between 1 and 10");
      return;
    }

    const success = await EventRegistrationModel.submitFeedback(Number(id), {
      satisfactionScore: satisfaction,
      recommendationScore: recommendation,
      comments: comments || undefined,
    });

    if (success) {
      ApiResponse.success(res, null, "Thank you for your feedback!");
    } else {
      ApiResponse.notFound(res, "Registration not found");
    }
  };

  /**
   * Assign salesperson to registration
   *
   * @route PATCH /api/events/assign/:id
   * @access Private (Admin/Sales Manager)
   */
  assignSalesperson = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { salesperson } = req.body;

    if (!salesperson) {
      ApiResponse.badRequest(res, "Salesperson is required");
      return;
    }

    const success = await EventRegistrationModel.assign(
      Number(id),
      salesperson
    );

    if (success) {
      ApiResponse.success(res, null, "Salesperson assigned successfully");
    } else {
      ApiResponse.notFound(res, "Registration not found");
    }
  };

  /**
   * Get checked-in attendees for an event
   *
   * @route GET /api/events/:eventType/:eventDate/attendees
   * @access Private (Admin/Staff)
   */
  getCheckedInAttendees = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { eventType, eventDate } = req.params;

    if (!Object.values(EventType).includes(eventType as EventType)) {
      ApiResponse.badRequest(res, "Invalid event type");
      return;
    }

    const attendees = await EventRegistrationModel.getCheckedIn(
      eventType as EventType,
      new Date(eventDate)
    );

    ApiResponse.success(
      res,
      attendees,
      "Checked-in attendees retrieved successfully"
    );
  };

  /**
   * Get event attendance statistics
   *
   * @route GET /api/events/:eventType/:eventDate/stats
   * @access Private (Admin)
   */
  getAttendanceStatistics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { eventType, eventDate } = req.params;

    if (!Object.values(EventType).includes(eventType as EventType)) {
      ApiResponse.badRequest(res, "Invalid event type");
      return;
    }

    const stats = await EventRegistrationModel.getAttendanceStats(
      eventType as EventType,
      new Date(eventDate)
    );

    ApiResponse.success(res, stats, "Statistics retrieved successfully");
  };

  /**
   * Get registrations assigned to a salesperson
   *
   * @route GET /api/events/assigned/:salesperson
   * @access Private (Sales)
   */
  getAssignedRegistrations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { salesperson } = req.params;

    const registrations = await EventRegistrationModel.getAssigned(salesperson);

    ApiResponse.success(
      res,
      registrations,
      "Assigned registrations retrieved successfully"
    );
  };
}

export default new EventController();
