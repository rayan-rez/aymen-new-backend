/**
 * Event Management Controller
 * Consolidated controller for all event-related operations
 * Handles: Events, Check-ins, Special Events, User Slots
 *
 * @module controllers/event-management.controller
 */

import { Request, Response } from "express";
import {
  EventRegistrationModel,
  LeadSourceModel,
  EventType,
  LeadType,
} from "@models";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";

// Configuration constants
const MIN_SCAN_INTERVAL_SECONDS = parseInt(
  process.env.MIN_SCAN_INTERVAL_SECONDS || "5",
  10
);
const SLOT_LIMITS = {
  default: parseInt(process.env.SLOT_LIMIT_DEFAULT || "50", 10),
  vip: parseInt(process.env.SLOT_LIMIT_VIP || "30", 10),
  workshop: parseInt(process.env.SLOT_LIMIT_WORKSHOP || "25", 10),
};

/**
 * Event Management Controller
 * Centralized event operations
 */
class EventManagementController {
  // ============================================
  // REGISTRATION
  // ============================================

  /**
   * Register for an event
   * @route POST /api/events/register
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

    if (!email && !phone) {
      ApiResponse.badRequest(res, "Either email or phone must be provided");
      return;
    }

    if (email && !validateEmail(email)) {
      ApiResponse.badRequest(res, "Invalid email format");
      return;
    }

    if (phone && !validatePhone(phone)) {
      ApiResponse.badRequest(res, "Invalid phone format");
      return;
    }

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

    // Track lead source
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
   * Get all registrations with filtering
   * @route GET /api/events/registrations
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

  // ============================================
  // CHECK-IN/CHECK-OUT
  // ============================================

  /**
   * Process check-in or check-out
   * @route POST /api/events/check-in
   */
  processCheckIn = async (req: Request, res: Response): Promise<void> => {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      ApiResponse.badRequest(res, "First name and last name are required");
      return;
    }

    try {
      // Find user's most recent registration
      const registrations = await EventRegistrationModel.findAll({
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 1,
      });

      const userRegistrations = registrations.filter(
        (reg) =>
          reg.firstName.toLowerCase() === firstName.toLowerCase() &&
          reg.lastName.toLowerCase() === lastName.toLowerCase()
      );

      if (userRegistrations.length === 0) {
        ApiResponse.notFound(
          res,
          "Registration not found. Please ensure you are registered."
        );
        return;
      }

      const registration = userRegistrations[0];

      // First scan: Check-in
      if (!registration.checkedInAt) {
        const success = await EventRegistrationModel.checkIn(registration.id);

        if (!success) {
          ApiResponse.error(res, "Failed to check in", 500);
          return;
        }

        ApiResponse.success(
          res,
          {
            id: registration.id,
            firstName: registration.firstName,
            lastName: registration.lastName,
            action: "check-in",
            timestamp: new Date(),
          },
          "Successfully checked in! Welcome!"
        );
        return;
      }

      // Second scan: Check-out (with rate limiting)
      if (registration.checkedInAt && !registration.checkedOutAt) {
        const checkInTime = new Date(registration.checkedInAt).getTime();
        const currentTime = Date.now();
        const secondsSinceCheckIn = Math.floor(
          (currentTime - checkInTime) / 1000
        );

        if (secondsSinceCheckIn < MIN_SCAN_INTERVAL_SECONDS) {
          ApiResponse.badRequest(
            res,
            `Please wait ${
              MIN_SCAN_INTERVAL_SECONDS - secondsSinceCheckIn
            } seconds before scanning again.`
          );
          return;
        }

        const success = await EventRegistrationModel.checkOut(registration.id);

        if (!success) {
          ApiResponse.error(res, "Failed to check out", 500);
          return;
        }

        ApiResponse.success(
          res,
          {
            id: registration.id,
            firstName: registration.firstName,
            lastName: registration.lastName,
            action: "check-out",
            timestamp: new Date(),
            duration: `${Math.floor(secondsSinceCheckIn / 60)} minutes`,
          },
          "Successfully checked out! Thank you for visiting!"
        );
        return;
      }

      // Already checked out
      if (registration.checkedOutAt) {
        ApiResponse.badRequest(
          res,
          "You have already checked in and checked out."
        );
        return;
      }
    } catch (error) {
      console.error("Error processing check-in:", error);
      ApiResponse.error(res, "Failed to process check-in", 500);
    }
  };

  /**
   * Get today's check-ins
   * @route GET /api/events/check-ins/today
   */
  getTodayCheckIns = async (req: Request, res: Response): Promise<void> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const registrations = await EventRegistrationModel.findAll({
        dateFrom: today,
        dateTo: tomorrow,
        hasCheckedIn: true,
      });

      const totalCheckIns = registrations.length;
      const checkedOut = registrations.filter((reg) => reg.checkedOutAt).length;
      const stillPresent = totalCheckIns - checkedOut;

      ApiResponse.success(
        res,
        {
          date: today,
          totalCheckIns,
          checkedOut,
          stillPresent,
          registrations: registrations.map((reg) => ({
            id: reg.id,
            name: `${reg.firstName} ${reg.lastName}`,
            checkedInAt: reg.checkedInAt,
            checkedOutAt: reg.checkedOutAt,
            duration: reg.checkedOutAt
              ? `${Math.floor(
                  (new Date(reg.checkedOutAt).getTime() -
                    new Date(reg.checkedInAt!).getTime()) /
                    60000
                )} minutes`
              : "Still present",
          })),
        },
        "Today's check-ins retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting today's check-ins:", error);
      ApiResponse.error(res, "Failed to retrieve check-ins", 500);
    }
  };

  // ============================================
  // TIME SLOTS
  // ============================================

  /**
   * Book a time slot
   * @route POST /api/events/slots/book
   */
  bookTimeSlot = async (req: Request, res: Response): Promise<void> => {
    const { email, eventDate, timeSlot } = req.body;

    if (!email || !eventDate || !timeSlot) {
      ApiResponse.badRequest(
        res,
        "Email, event date, and time slot are required"
      );
      return;
    }

    try {
      const existingRegistrations = await EventRegistrationModel.findAll({
        email: email.toLowerCase(),
        eventDate: new Date(eventDate),
      });

      if (existingRegistrations.length === 0) {
        ApiResponse.notFound(
          res,
          "You must register for the event first before booking a slot"
        );
        return;
      }

      const existingSlot = existingRegistrations.find(
        (reg) =>
          reg.selectedTimeSlots && reg.selectedTimeSlots.includes(timeSlot)
      );

      if (existingSlot) {
        ApiResponse.conflict(
          res,
          "You have already booked a time slot for this event"
        );
        return;
      }

      // Count participants in this time slot
      const slotRegistrations = await EventRegistrationModel.findAll({
        eventDate: new Date(eventDate),
      });

      const slotCount = slotRegistrations.filter((reg) =>
        reg.selectedTimeSlots?.includes(timeSlot)
      ).length;

      const maxCapacity = SLOT_LIMITS.default;
      if (slotCount >= maxCapacity) {
        ApiResponse.badRequest(
          res,
          "This time slot is fully booked. Please select another time slot."
        );
        return;
      }

      // Update registration with time slot
      const registration = existingRegistrations[0];
      const currentSlots = registration.selectedTimeSlots || [];
      const updatedSlots = [...currentSlots, timeSlot];

      const updated = await EventRegistrationModel.update(registration.id, {
        selectedTimeSlots: updatedSlots,
      });

      if (!updated) {
        ApiResponse.error(res, "Failed to book time slot", 500);
        return;
      }

      ApiResponse.success(
        res,
        {
          timeSlot,
          eventDate,
          remainingSlots: maxCapacity - slotCount - 1,
        },
        "Time slot booked successfully"
      );
    } catch (error) {
      console.error("Error booking time slot:", error);
      ApiResponse.error(res, "Failed to book time slot", 500);
    }
  };

  /**
   * Get available slots for a date
   * @route GET /api/events/slots/available/:date
   */
  getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
    const { date } = req.params;

    try {
      const allTimeSlots = process.env.EVENT_TIME_SLOTS?.split(",") || [
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
      ];

      const registrations = await EventRegistrationModel.findAll({
        eventDate: new Date(date),
      });

      const slotCounts: Record<string, number> = {};
      allTimeSlots.forEach((slot) => {
        slotCounts[slot] = registrations.filter((reg) =>
          reg.selectedTimeSlots?.includes(slot)
        ).length;
      });

      const maxCapacity = SLOT_LIMITS.default;
      const availableSlots = allTimeSlots.map((slot) => ({
        time: slot,
        available: maxCapacity - slotCounts[slot],
        capacity: maxCapacity,
        isFull: slotCounts[slot] >= maxCapacity,
      }));

      ApiResponse.success(
        res,
        { date, slots: availableSlots },
        "Available slots retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting available slots:", error);
      ApiResponse.error(res, "Failed to retrieve available slots", 500);
    }
  };

  // ============================================
  // FEEDBACK
  // ============================================

  /**
   * Submit event feedback
   * @route POST /api/events/:id/feedback
   */
  submitEventFeedback = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { satisfactionScore, recommendationScore, comments } = req.body;

    if (satisfactionScore === undefined || recommendationScore === undefined) {
      ApiResponse.badRequest(
        res,
        "Satisfaction and recommendation scores are required"
      );
      return;
    }

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

  // ============================================
  // ASSIGNMENT & STATISTICS
  // ============================================

  /**
   * Assign salesperson
   * @route PATCH /api/events/:id/assign
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
   * Get attendance statistics
   * @route GET /api/events/:eventType/:eventDate/stats
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
}

export default new EventManagementController();
