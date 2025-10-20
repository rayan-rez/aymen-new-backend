/**
 * User Event Slot Controller
 * Handles user-specific event registrations with time slot booking
 * Manages slot availability and prevents overbooking
 *
 * @module controllers/user-event-slot.controller
 */

import { Request, Response } from "express";
import {
  EventRegistrationModel,
  EventType,
  LeadSourceModel,
  LeadType,
} from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Configuration for slot limits
 * Maximum participants per time slot
 */
const SLOT_LIMITS = {
  default: 50,
  vip: 30,
  workshop: 25,
};

/**
 * User Event Slot Controller class
 * Manages time-slotted event registrations with capacity control
 */
class UserEventSlotController {
  /**
   * Books an event time slot for a registered user
   * Validates user registration and slot availability
   *
   * @route POST /api/user-events/book-slot
   * @access Public
   *
   * @example
   * POST /api/user-events/book-slot
   * {
   *   "email": "john@example.com",
   *   "eventDate": "2025-11-01",
   *   "timeSlot": "10:00"
   * }
   */
  bookTimeSlot = async (req: Request, res: Response): Promise<void> => {
    const { email, eventDate, timeSlot } = req.body;

    // Validate required fields
    if (!email || !eventDate || !timeSlot) {
      ApiResponse.badRequest(
        res,
        "Email, event date, and time slot are required"
      );
      return;
    }

    try {
      // Check if user has already registered for this event
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

      // Check if user already has a slot for this date
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

      // Check capacity (default to 50 participants per slot)
      const maxCapacity = SLOT_LIMITS.default;
      if (slotCount >= maxCapacity) {
        ApiResponse.badRequest(
          res,
          `This time slot is fully booked. Please select another time slot.`,
          { availableSlots: maxCapacity - slotCount }
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
   * Gets available time slots for a specific date
   * Returns slots with remaining capacity
   *
   * @route GET /api/user-events/available-slots/:date
   * @access Public
   *
   * @example
   * GET /api/user-events/available-slots/2025-11-01
   */
  getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
    const { date } = req.params;

    try {
      // Define available time slots
      const allTimeSlots = [
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
      ];

      // Get all registrations for this date
      const registrations = await EventRegistrationModel.findAll({
        eventDate: new Date(date),
      });

      // Count participants per slot
      const slotCounts: Record<string, number> = {};
      allTimeSlots.forEach((slot) => {
        slotCounts[slot] = registrations.filter((reg) =>
          reg.selectedTimeSlots?.includes(slot)
        ).length;
      });

      // Build available slots list
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

  /**
   * Cancels a time slot booking
   *
   * @route DELETE /api/user-events/cancel-slot
   * @access Public
   *
   * @example
   * DELETE /api/user-events/cancel-slot
   * {
   *   "email": "john@example.com",
   *   "eventDate": "2025-11-01",
   *   "timeSlot": "10:00"
   * }
   */
  cancelTimeSlot = async (req: Request, res: Response): Promise<void> => {
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

      // Remove the time slot
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
   * Gets user's booked slots
   *
   * @route GET /api/user-events/my-slots
   * @access Public
   *
   * @example
   * GET /api/user-events/my-slots?email=john@example.com
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
}

export default new UserEventSlotController();
