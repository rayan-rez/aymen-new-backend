/**
 * Event Controller
 * Handles all event-related HTTP requests
 *
 * @module controllers/event.controller
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import EventModel, {
  EventType,
  EventStatus,
  EventsLocationType,
} from "@models/event.model";
import EventRegistrationModel from "@models/event-registration.model";
import EventInfluencerModel from "@models/event-influencer.model";
import { AppError } from "@/middlewares/error-handler.middleware";

/**
 * Event Controller Class
 */
export class EventController {
  /**
   * Get all events with filtering
   * GET /api/events
   */
  async getEvents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        eventType,
        status,
        locationType,
        isFeatured,
        isPublished,
        locationId,
        projectId,
        isUpcoming,
        isPast,
        search,
      } = req.query;

      const options: any = {
        page: Number(page),
        limit: Number(limit),
      };

      if (eventType) options.eventType = eventType;
      if (status) options.status = status;
      if (locationType) options.locationType = locationType;
      if (isFeatured !== undefined) options.isFeatured = isFeatured === "true";
      if (isPublished !== undefined)
        options.isPublished = isPublished === "true";
      if (locationId) options.locationId = Number(locationId);
      if (projectId) options.projectId = Number(projectId);
      if (isUpcoming !== undefined) options.isUpcoming = isUpcoming === "true";
      if (isPast !== undefined) options.isPast = isPast === "true";
      if (search) options.search = search;

      const result = await EventModel.paginateEvents(options);

      ApiResponse.success(res, result, "Events retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get upcoming events
   * GET /api/events/upcoming
   */
  async getUpcomingEvents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const events = await EventModel.findUpcoming({
        limit: Number(limit),
      });

      ApiResponse.success(
        res,
        events,
        "Upcoming events retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get featured events
   * GET /api/events/featured
   */
  async getFeaturedEvents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 5 } = req.query;

      const events = await EventModel.findFeatured({
        limit: Number(limit),
      });

      ApiResponse.success(
        res,
        events,
        "Featured events retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  async getEventById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { relations } = req.query;

      const relationsList = relations
        ? (relations as string).split(",")
        : ["location", "project"];

      const event = await EventModel.findById(Number(id), {
        relations: relationsList,
      });

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      ApiResponse.success(res, event, "Event retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event by slug
   * GET /api/events/slug/:slug
   */
  async getEventBySlug(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { slug } = req.params;
      const { relations } = req.query;

      const relationsList = relations
        ? (relations as string).split(",")
        : ["location", "project"];

      const event = await EventModel.findBySlug(slug, {
        relations: relationsList,
      });

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      ApiResponse.success(res, event, "Event retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event with statistics
   * GET /api/events/:id/stats
   */
  async getEventWithStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const event = await EventModel.getWithStats(Number(id));

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      ApiResponse.success(
        res,
        event,
        "Event statistics retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new event
   * POST /api/events
   */
  async createEvent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const event = await EventModel.create(req.body);

      ApiResponse.created(res, event, "Event created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update event
   * PUT /api/events/:id
   */
  async updateEvent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const event = await EventModel.update(Number(id), req.body);

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      ApiResponse.success(res, event, "Event updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete event
   * DELETE /api/events/:id
   */
  async deleteEvent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await EventModel.delete(Number(id));

      if (!deleted) {
        throw new AppError("Event not found", 404);
      }

      ApiResponse.success(res, null, "Event deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Publish event
   * PATCH /api/events/:id/publish
   */
  async publishEvent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const event = await EventModel.publish(Number(id));

      ApiResponse.success(res, event, "Event published successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unpublish event
   * PATCH /api/events/:id/unpublish
   */
  async unpublishEvent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const event = await EventModel.unpublish(Number(id));

      ApiResponse.success(res, event, "Event unpublished successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Open registration
   * PATCH /api/events/:id/open-registration
   */
  async openRegistration(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const event = await EventModel.openRegistration(Number(id));

      ApiResponse.success(res, event, "Registration opened successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close registration
   * PATCH /api/events/:id/close-registration
   */
  async closeRegistration(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const event = await EventModel.closeRegistration(Number(id));

      ApiResponse.success(res, event, "Registration closed successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event registrations
   * GET /api/events/:id/registrations
   */
  async getEventRegistrations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const options: any = {
        page: Number(page),
        limit: Number(limit),
        eventId: Number(id),
      };

      if (status) options.status = status;

      const result = await EventRegistrationModel.paginateRegistrations(
        options
      );

      ApiResponse.success(
        res,
        result,
        "Event registrations retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event influencers
   * GET /api/events/:id/influencers
   */
  async getEventInfluencers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const influencers = await EventInfluencerModel.findByEvent(Number(id));

      ApiResponse.success(
        res,
        influencers,
        "Event influencers retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Increment view count
   * POST /api/events/:id/view
   */
  async incrementViewCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      await EventModel.incrementViewCount(Number(id));

      ApiResponse.success(res, null, "View count incremented");
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new EventController();
