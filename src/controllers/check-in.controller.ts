/**
 * Check-In/Check-Out Controller
 * Manages visitor check-in and check-out for events and premises
 * Implements time-based validation to prevent rapid duplicate scans
 *
 * @module controllers/check-in.controller
 */

import { Request, Response } from "express";
import { EventRegistrationModel } from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Minimum seconds between check-in and check-out
 * Prevents accidental double scans
 */
const MIN_SCAN_INTERVAL_SECONDS = 5;

/**
 * Check-In Controller class
 * Handles physical presence tracking with QR code scanning
 */
class CheckInController {
  /**
   * Processes check-in or check-out based on current status
   * First scan = check-in, second scan = check-out
   * Implements rate limiting to prevent accidental double scans
   *
   * @route POST /api/check-in
   * @access Public
   *
   * @example
   * POST /api/check-in
   * {
   *   "firstName": "John",
   *   "lastName": "Doe"
   * }
   */
  processCheckIn = async (req: Request, res: Response): Promise<void> => {
    const { firstName, lastName } = req.body;

    // Validate required fields
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

      // Filter by name (case-insensitive)
      const userRegistrations = registrations.filter(
        (reg) =>
          reg.firstName.toLowerCase() === firstName.toLowerCase() &&
          reg.lastName.toLowerCase() === lastName.toLowerCase()
      );

      if (userRegistrations.length === 0) {
        ApiResponse.notFound(
          res,
          "Registration not found. Please ensure you are registered for this event."
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
        // Calculate time since check-in
        const checkInTime = new Date(registration.checkedInAt).getTime();
        const currentTime = Date.now();
        const secondsSinceCheckIn = Math.floor(
          (currentTime - checkInTime) / 1000
        );

        // Prevent rapid double scanning
        if (secondsSinceCheckIn < MIN_SCAN_INTERVAL_SECONDS) {
          ApiResponse.badRequest(
            res,
            `Please wait ${
              MIN_SCAN_INTERVAL_SECONDS - secondsSinceCheckIn
            } seconds before scanning again.`,
            { waitTime: MIN_SCAN_INTERVAL_SECONDS - secondsSinceCheckIn }
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
          "You have already checked in and checked out for this event.",
          {
            checkedInAt: registration.checkedInAt,
            checkedOutAt: registration.checkedOutAt,
          }
        );
        return;
      }
    } catch (error) {
      console.error("Error processing check-in:", error);
      ApiResponse.error(res, "Failed to process check-in", 500);
    }
  };

  /**
   * Gets all check-ins for the current day
   *
   * @route GET /api/check-in/today
   * @access Private (Admin)
   *
   * @example
   * GET /api/check-in/today
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

      // Calculate statistics
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
              ? Math.floor(
                  (new Date(reg.checkedOutAt).getTime() -
                    new Date(reg.checkedInAt!).getTime()) /
                    60000
                ) + " minutes"
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

  /**
   * Gets check-in statistics for a date range
   *
   * @route GET /api/check-in/statistics
   * @access Private (Admin)
   *
   * @example
   * GET /api/check-in/statistics?dateFrom=2025-11-01&dateTo=2025-11-02
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    const { dateFrom, dateTo } = req.query;

    try {
      const registrations = await EventRegistrationModel.findAll({
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        hasCheckedIn: true,
      });

      // Calculate statistics
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

      // Group by day
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

  /**
   * Manually checks in a user (admin function)
   *
   * @route POST /api/check-in/manual/:id
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
   * Manually checks out a user (admin function)
   *
   * @route POST /api/check-in/manual-checkout/:id
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
}

export default new CheckInController();
