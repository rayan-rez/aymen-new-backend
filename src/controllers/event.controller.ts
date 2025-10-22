/**
 * Events Controller (Unified)
 * Consolidates all event-related operations:
 * - Event registration
 * - Check-in/Check-out management
 * - Time slot booking
 * - Special events (inaugurations, networking, etc.)
 * - Attendance tracking and statistics
 *
 * @module controllers/events.controller
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
import { EVENT_CONFIG } from "@/constants/app.constants";

const { MIN_SCAN_INTERVAL_SECONDS, SLOT_LIMITS, DEFAULT_TIME_SLOTS } = EVENT_CONFIG;

/**
 * Unified Events Controller
 * Manages all event-related operations in one place
 */
class EventsController {
  // ============================================
  // REGISTRATION
  // ============================================

  /**
   * Register for an event
   * @route POST /api/events/register
   * @access Public
   */
  register = async (req: Request, res: Response): Promise<void> => {
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
   * @access Private (Admin)
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
   * Get registration by ID
   * @route GET /api/events/registrations/:id
   * @access Private (Admin)
   */
  getRegistrationById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const registration = await EventRegistrationModel.findById(Number(id));

    if (!registration) {
      ApiResponse.notFound(res, "Registration not found");
      return;
    }

    ApiResponse.success(res, registration, "Registration retrieved successfully");
  };

  // ============================================
  // CHECK-IN/CHECK-OUT
  // ============================================

  /**
   * Process check-in or check-out
   * @route POST /api/events/check-in
   * @access Public
   */
  checkIn = async (req: Request, res: Response): Promise<void> => {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      ApiResponse.badRequest(res, "First name and last name are required");
      return;
    }

    try {
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
   * Manual check-in (admin function)
   * @route POST /api/events/check-in/manual/:id
   * @access Private (Admin)
   */
  manualCheckIn = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const success = await EventRegistrationModel.checkIn(Number(id));

      if (!success) {
        ApiResponse.notFound(res, "Registration not found");
        return;
      }

      ApiResponse.success(res, null, "Manual check-in successful");
    } catch (error) {
      console.error("Error in manual check-in:", error);
      ApiResponse.error(res, "Failed to check in", 500);
    }
  };

  /**
   * Manual check-out (admin function)
   * @route POST /api/events/check-out/manual/:id
   * @access Private (Admin)
   */
  manualCheckOut = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const success = await EventRegistrationModel.checkOut(Number(id));

      if (!success) {
        ApiResponse.notFound(res, "Registration not found or not checked in");
        return;
      }

      ApiResponse.success(res, null, "Manual check-out successful");
    } catch (error) {
      console.error("Error in manual check-out:", error);
      ApiResponse.error(res, "Failed to check out", 500);
    }
  };

  /**
   * Get today's check-ins
   * @route GET /api/events/check-ins/today
   * @access Private (Admin)
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
   * @access Public
   */
  bookSlot = async (req: Request, res: Response): Promise<void> => {
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

      const maxCapacity = SLOT_LIMITS.DEFAULT;
      if (slotCount >= maxCapacity) {
        ApiResponse.badRequest(
          res,
          "This time slot is fully booked. Please select another time slot."
        );
        return;
      }

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
   * Cancel a time slot booking
   * @route DELETE /api/events/slots/cancel
   * @access Public
   */
  cancelSlot = async (req: Request, res: Response): Promise<void> => {
    const { email, eventDate, timeSlot } = req.body;

    if (!email || !eventDate || !timeSlot) {
      ApiResponse.badRequest(
        res,
        "Email, event date, and time slot are required"
      );
      return;
    }

    try {
      const registrations = await EventRegistrationModel.findAll({
        email: email.toLowerCase(),
        eventDate: new Date(eventDate),
      });

      if (registrations.length === 0) {
        ApiResponse.notFound(res, "Registration not found");
        return;
      }

      const registration = registrations[0];
      const currentSlots = registration.selectedTimeSlots || [];

      if (!currentSlots.includes(timeSlot)) {
        ApiResponse.notFound(res, "Time slot booking not found");
        return;
      }

      const updatedSlots = currentSlots.filter((slot) => slot !== timeSlot);

      const updated = await EventRegistrationModel.update(registration.id, {
        selectedTimeSlots: updatedSlots.length > 0 ? updatedSlots : null,
      });

      if (!updated) {
        ApiResponse.error(res, "Failed to cancel time slot", 500);
        return;
      }

      ApiResponse.success(res, null, "Time slot cancelled successfully");
    } catch (error) {
      console.error("Error cancelling time slot:", error);
      ApiResponse.error(res, "Failed to cancel time slot", 500);
    }
  };

  /**
   * Get available slots for a date
   * @route GET /api/events/slots/available/:date
   * @access Public
   */
  getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
    const { date } = req.params;

    try {
      const registrations = await EventRegistrationModel.findAll({
        eventDate: new Date(date),
      });

      const slotCounts: Record<string, number> = {};
      DEFAULT_TIME_SLOTS.forEach((slot) => {
        slotCounts[slot] = registrations.filter((reg) =>
          reg.selectedTimeSlots?.includes(slot)
        ).length;
      });

      const maxCapacity = SLOT_LIMITS.DEFAULT;
      const availableSlots = DEFAULT_TIME_SLOTS.map((slot) => ({
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

  /**
   * Get user's booked slots
   * @route GET /api/events/slots/my-bookings
   * @access Public
   */
  getMySlots = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      ApiResponse.badRequest(res, "Email is required");
      return;
    }

    try {
      const registrations = await EventRegistrationModel.findAll({
        email: email.toLowerCase(),
      });

      const bookedSlots = registrations
        .filter(
          (reg) => reg.selectedTimeSlots && reg.selectedTimeSlots.length > 0
        )
        .map((reg) => ({
          eventId: reg.id,
          eventType: reg.eventType,
          eventDate: reg.eventDate,
          timeSlots: reg.selectedTimeSlots,
          status: reg.checkedInAt ? "checked-in" : "pending",
        }));

      ApiResponse.success(
        res,
        bookedSlots,
        "Your booked slots retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting user slots:", error);
      ApiResponse.error(res, "Failed to retrieve booked slots", 500);
    }
  };

  // ============================================
  // SPECIAL EVENTS
  // ============================================

  /**
   * Register for inauguration event
   * @route POST /api/events/special/inauguration
   * @access Public
   */
  registerInauguration = async (req: Request, res: Response): Promise<void> => {
    const { nom, prenom, email, telephone, accept_cgu, accept_photo } = req.body;

    if (!nom || !prenom || !telephone) {
      ApiResponse.badRequest(res, "Nom, prénom et téléphone sont requis");
      return;
    }

    if (!accept_cgu) {
      ApiResponse.badRequest(
        res,
        "Vous devez accepter les conditions générales"
      );
      return;
    }

    if (email && !validateEmail(email)) {
      ApiResponse.badRequest(res, "Format d'email invalide");
      return;
    }

    if (!validatePhone(telephone)) {
      ApiResponse.badRequest(res, "Format de téléphone invalide");
      return;
    }

    if (email) {
      const existing = await EventRegistrationModel.findAll({
        email: email.toLowerCase(),
        eventType: EventType.INAUGURATION,
      });

      if (existing.length > 0) {
        ApiResponse.conflict(res, "Cet email est déjà enregistré");
        return;
      }
    }

    const registration = await EventRegistrationModel.create({
      firstName: prenom,
      lastName: nom,
      email: email ? email.toLowerCase() : null,
      phone: telephone,
      eventType: EventType.INAUGURATION,
      eventDate: new Date(),
      acceptedTerms: Boolean(accept_cgu),
      photoConsent: Boolean(accept_photo),
    });

    ApiResponse.created(
      res,
      {
        id: registration.id,
        firstName: registration.firstName,
        lastName: registration.lastName,
      },
      "Invité enregistré avec succès"
    );
  };

  /**
   * Register for networking event
   * @route POST /api/events/special/networking
   * @access Public
   */
  registerNetworking = async (req: Request, res: Response): Promise<void> => {
    const { identite, profession, accompagne, nom_partenaire, soiree_du } = req.body;

    if (!identite || !profession) {
      ApiResponse.badRequest(res, "Identité et profession sont requis");
      return;
    }

    const nameParts = identite.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const registration = await EventRegistrationModel.create({
      firstName,
      lastName,
      eventType: EventType.NETWORKING,
      eventDate: soiree_du ? new Date(soiree_du) : new Date(),
      acceptedTerms: true,
    });

    ApiResponse.created(
      res,
      {
        id: registration.id,
        identite,
        profession,
      },
      "Inscription enregistrée avec succès"
    );
  };

  /**
   * Submit on-site registration (JPO/Open House)
   * @route POST /api/events/special/onsite
   * @access Public
   */
  registerOnsite = async (req: Request, res: Response): Promise<void> => {
    let { name, email, phone, source, other_source } = req.body;

    if (source === "Autre" && other_source) {
      source = other_source;
    }

    if (!name && !email && !phone && !source) {
      ApiResponse.badRequest(res, "Au moins un champ doit être rempli");
      return;
    }

    if (email && !validateEmail(email)) {
      ApiResponse.badRequest(res, "Format d'email invalide");
      return;
    }

    if (phone && !validatePhone(phone)) {
      ApiResponse.badRequest(res, "Format de téléphone invalide");
      return;
    }

    const registration = await EventRegistrationModel.create({
      firstName: name || "Anonymous",
      lastName: "Visitor",
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
      eventType: EventType.OPEN_HOUSE,
      eventDate: new Date(),
      acceptedTerms: true,
    });

    if (email && source) {
      LeadSourceModel.create({
        leadEmail: email.toLowerCase(),
        leadType: LeadType.EVENT_REGISTRATION,
        leadReferenceId: registration.id,
        utmSource: source,
        sourceIp: req.ip || null,
        userAgent: req.get("user-agent") || null,
      }).catch((err) => console.error("Error tracking lead:", err));
    }

    ApiResponse.created(
      res,
      {
        id: registration.id,
        name,
        source,
      },
      "Inscription réussie"
    );
  };

  // ============================================
  // FEEDBACK
  // ============================================

  /**
   * Submit event feedback
   * @route POST /api/events/feedback/:id
   * @access Public
   */
  submitFeedback = async (req: Request, res: Response): Promise<void> => {
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
   * Assign salesperson to registration
   * @route PATCH /api/events/registrations/:id/assign
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
   * Get attendance statistics
   * @route GET /api/events/statistics/attendance/:eventType/:eventDate
   * @access Private (Admin)
   */
  getAttendanceStats = async (req: Request, res: Response): Promise<void> => {
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
   * Get check-in statistics
   * @route GET /api/events/statistics/check-ins
   * @access Private (Admin)
   */
  getCheckInStats = async (req: Request, res: Response): Promise<void> => {
    const { dateFrom, dateTo } = req.query;

    try {
      const registrations = await EventRegistrationModel.findAll({
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        hasCheckedIn: true,
      });

      const totalRegistrations = registrations.length;
      const checkedOut = registrations.filter((reg) => reg.checkedOutAt).length;
      const averageStayMinutes =
        checkedOut > 0
          ? Math.floor(
              registrations
                .filter((reg) => reg.checkedOutAt)
                .reduce((sum, reg) => {
                  const duration =
                    new Date(reg.checkedOutAt!).getTime() -
                    new Date(reg.checkedInAt!).getTime();
                  return sum + duration;
                }, 0) /
                checkedOut /
                60000
            )
          : 0;

      const byDay: Record<string, number> = {};
      registrations.forEach((reg) => {
        const day = new Date(reg.checkedInAt!).toISOString().split("T")[0];
        byDay[day] = (byDay[day] || 0) + 1;
      });

      ApiResponse.success(
        res,
        {
          totalCheckIns: totalRegistrations,
          completedVisits: checkedOut,
          averageStayMinutes,
          checkInsByDay: byDay,
        },
        "Statistics retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting statistics:", error);
      ApiResponse.error(res, "Failed to retrieve statistics", 500);
    }
  };
}

export default new EventsController();