/**
 * ============================================
 * EVENTS CONTROLLER (UNIFIED)
 * ============================================
 * Consolidates: event registration, check-in, time slots, special events
 * Merges duplicated functionality from form.controller.ts
 */

import { Request, Response } from "express";
import {
  EventRegistrationModel,
  LeadSourceModel,
  EventType,
  LeadType,
} from "@models";
import { InfluencerEventModel } from "@models/influencer-event.model";
import db from "@/config/database";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import { EVENT_CONFIG, CAMPAIGN_TABLES } from "@/constants/app.constants";

const { MIN_SCAN_INTERVAL_SECONDS, SLOT_LIMITS, DEFAULT_TIME_SLOTS } =
  EVENT_CONFIG;

class EventsController {
  // ============================================
  // REGISTRATION
  // ============================================

  /**
   * @route POST /api/events/registrations
   * @desc Register for an event
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
   * @route GET /api/events/registrations
   * @desc Get all registrations with filtering
   * @access Private (Admin)
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
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
   * @route GET /api/events/registrations/:id
   * @desc Get registration by ID
   * @access Private (Admin)
   */
  getOne = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const registration = await EventRegistrationModel.findById(Number(id));

    if (!registration) {
      ApiResponse.notFound(res, "Registration not found");
      return;
    }

    ApiResponse.success(
      res,
      registration,
      "Registration retrieved successfully"
    );
  };

  // ============================================
  // CHECK-IN/CHECK-OUT
  // ============================================

  /**
   * @route POST /api/events/checkin
   * @desc Process check-in or check-out
   * @access Public
   */
  processCheckIn = async (req: Request, res: Response): Promise<void> => {
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
   * @route POST /api/events/checkin/manual/:id
   * @desc Manual check-in (admin function)
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
   * @route POST /api/events/checkout/manual/:id
   * @desc Manual check-out (admin function)
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
   * @route GET /api/events/checkin/today
   * @desc Get today's check-ins
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
   * @route POST /api/events/slots
   * @desc Book a time slot
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
   * @route DELETE /api/events/slots
   * @desc Cancel a time slot booking
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
   * @route GET /api/events/slots/available/:date
   * @desc Get available slots for a date
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
   * @route GET /api/events/slots/bookings
   * @desc Get user's booked slots
   * @access Public
   */
  getUserSlots = async (req: Request, res: Response): Promise<void> => {
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
  // SPECIAL EVENTS (Merged from form.controller)
  // ============================================

  /**
   * @route POST /api/events/special/inauguration
   * @desc Register for inauguration event
   * @access Public
   */
  registerInauguration = async (req: Request, res: Response): Promise<void> => {
    const { nom, prenom, email, telephone, accept_cgu, accept_photo } =
      req.body;

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
   * @route POST /api/events/special/networking
   * @desc Register for networking event
   * @access Public
   */
  registerNetworking = async (req: Request, res: Response): Promise<void> => {
    const { identite, profession, soiree_du } =
      req.body;

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
   * @route POST /api/events/special/onsite
   * @desc Submit on-site registration (JPO/Open House)
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
   * @route POST /api/events/registrations/:id/feedback
   * @desc Submit event feedback
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
   * @route PATCH /api/events/registrations/:id/assign
   * @desc Assign salesperson to registration
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
   * @route GET /api/events/statistics/attendance
   * @desc Get attendance statistics
   * @access Private (Admin)
   */
  getAttendanceStats = async (req: Request, res: Response): Promise<void> => {
    const { eventType, eventDate } = req.query;

    if (
      !eventType ||
      !Object.values(EventType).includes(eventType as EventType)
    ) {
      ApiResponse.badRequest(res, "Valid event type is required");
      return;
    }

    if (!eventDate) {
      ApiResponse.badRequest(res, "Event date is required");
      return;
    }

    const stats = await EventRegistrationModel.getAttendanceStats(
      eventType as EventType,
      new Date(eventDate as string)
    );

    ApiResponse.success(res, stats, "Statistics retrieved successfully");
  };

  /**
   * @route GET /api/events/statistics/checkins
   * @desc Get check-in statistics
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

  // ============================================
  // INFLUENCER CAMPAIGNS
  // ============================================

  /**
   * @route POST /api/events/campaigns/:campaign/registrations
   * @desc Register for influencer event campaign
   * @access Public
   */
  registerForCampaign = async (req: Request, res: Response): Promise<void> => {
    const { campaign } = req.params;
    const {
      email,
      first_name,
      last_name,
      n_telephone,
      selected_days,
      selected_times,
    } = req.body;

    const tableName = CAMPAIGN_TABLES[campaign.toLowerCase()];
    if (!tableName) {
      ApiResponse.badRequest(res, "Invalid campaign specified");
      return;
    }

    if (!email || !first_name || !last_name || !n_telephone) {
      ApiResponse.badRequest(
        res,
        "Email, first name, last name, and phone are required"
      );
      return;
    }

    if (!validateEmail(email)) {
      ApiResponse.badRequest(res, "Invalid email format");
      return;
    }

    if (!validatePhone(n_telephone)) {
      ApiResponse.badRequest(res, "Invalid phone number format");
      return;
    }

    try {
      const model = new InfluencerEventModel(tableName);

      const existing = await model.findByEmail(email.toLowerCase());
      if (existing) {
        ApiResponse.conflict(res, "Vous vous êtes déjà inscrit");
        return;
      }

      const days = Array.isArray(selected_days) ? selected_days : [];
      const times = Array.isArray(selected_times) ? selected_times : [];

      const registration = await model.create({
        email: email.toLowerCase(),
        first_name,
        last_name,
        n_telephone,
        selected_days: days,
        selected_times: times,
      });

      ApiResponse.created(
        res,
        {
          id: registration.id,
          email: registration.email,
          firstName: registration.firstName,
          lastName: registration.lastName,
        },
        "Utilisateur enregistré avec succès !"
      );
    } catch (error) {
      console.error(`Error registering for ${campaign}:`, error);
      ApiResponse.error(
        res,
        "Erreur lors de l'enregistrement de l'utilisateur",
        500
      );
    }
  };

  /**
   * @route GET /api/events/campaigns/:campaign/registrations
   * @desc Get all campaign registrations
   * @access Private (Admin)
   */
  getCampaignRegistrations = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { campaign } = req.params;
    const {
      page = 1,
      limit = 50,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    const tableName = CAMPAIGN_TABLES[campaign.toLowerCase()];
    if (!tableName) {
      ApiResponse.badRequest(res, "Invalid campaign specified");
      return;
    }

    try {
      const model = new InfluencerEventModel(tableName);

      const registrations = await model.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      });

      ApiResponse.success(
        res,
        registrations,
        "Registrations retrieved successfully"
      );
    } catch (error) {
      console.error(`Error getting ${campaign} registrations:`, error);
      ApiResponse.error(res, "Erreur interne du serveur", 500);
    }
  };

  /**
   * @route GET /api/events/campaigns/:campaign/registrations/:id
   * @desc Get campaign registration by ID
   * @access Private (Admin)
   */
  getCampaignRegistration = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { campaign, id } = req.params;

    const tableName = CAMPAIGN_TABLES[campaign.toLowerCase()];
    if (!tableName) {
      ApiResponse.badRequest(res, "Invalid campaign specified");
      return;
    }

    try {
      const model = new InfluencerEventModel(tableName);
      const registration = await model.findById(Number(id));

      if (!registration) {
        ApiResponse.notFound(res, "Utilisateur non trouvé");
        return;
      }

      ApiResponse.success(
        res,
        registration,
        "Registration retrieved successfully"
      );
    } catch (error) {
      console.error(`Error getting ${campaign} registration:`, error);
      ApiResponse.error(res, "Erreur interne du serveur", 500);
    }
  };

  /**
   * @route GET /api/events/campaigns
   * @desc Get available campaigns
   * @access Public
   */
  getAvailableCampaigns = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const campaigns = Object.keys(CAMPAIGN_TABLES).map((key) => ({
      campaign: key,
      tableName: CAMPAIGN_TABLES[key],
    }));

    ApiResponse.success(
      res,
      campaigns,
      "Available campaigns retrieved successfully"
    );
  };

  /**
   * @route GET /api/events/campaigns/:campaign/statistics
   * @desc Get campaign statistics
   * @access Private (Admin)
   */
  getCampaignStatistics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { campaign } = req.params;

    const tableName = CAMPAIGN_TABLES[campaign.toLowerCase()];
    if (!tableName) {
      ApiResponse.badRequest(res, "Invalid campaign specified");
      return;
    }

    try {
      const model = new InfluencerEventModel(tableName);

      const [total, withDays, withTimes] = await Promise.all([
        model.count(),
        db(tableName).whereNotNull("selected_days").count("* as count").first(),
        db(tableName)
          .whereNotNull("selected_times")
          .count("* as count")
          .first(),
      ]);

      const stats = {
        totalRegistrations: total,
        withSelectedDays: Number(withDays?.count || 0),
        withSelectedTimes: Number(withTimes?.count || 0),
        completionRate:
          total > 0
            ? Math.round((Number(withDays?.count || 0) / total) * 1000) / 10
            : 0,
      };

      ApiResponse.success(res, stats, "Statistics retrieved successfully");
    } catch (error) {
      console.error(`Error getting ${campaign} statistics:`, error);
      ApiResponse.error(res, "Erreur interne du serveur", 500);
    }
  };
}

export default new EventsController();
