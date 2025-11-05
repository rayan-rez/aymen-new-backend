/**
 * Express application setup
 * Configures middleware, routes, and error handling
 * Separated from server startup for testability
 */

import express, { Express, Request, Response } from "express";
import { corsMiddleware } from "@middlewares/cors.middleware";
import {
  errorHandler,
  notFoundHandler,
} from "@middlewares/error-handler.middleware";
import { ApiResponse } from "@utils/response.util";
import routes from "@/routes";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "@/config/swagger";
import redoc from "redoc-express";

/**
 * Creates and configures the Express application
 *
 * @returns Configured Express application
 *
 * @example
 * const app = createApp();
 * app.listen(3000);
 */
export const createApp = (): Express => {
  const app = express();

  // ============================================
  // Middleware: Request parsing and formatting
  // ============================================

  // Parse JSON request bodies (max 1MB)
  app.use(express.json({ limit: "1mb" }));

  // Parse URL-encoded request bodies
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ============================================
  // Middleware: CORS configuration
  // ============================================
  app.use(corsMiddleware);

  // ============================================
  // Swagger Documentation
  // ============================================

  // Serve Swagger JSON
  app.get("/api/docs/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Aymen API Documentation",
      customfavIcon: "/favicon.ico",
    })
  );

  app.get(
    "/api/redoc",
    redoc({
      title: "Aymen API Docs",
      specUrl: "/api/docs/swagger.json",
    })
  );

  // ============================================
  // Routes: Health check and root endpoint
  // ============================================

  /**
   * Health check endpoint
   * Returns database connectivity status
   * Used for monitoring and load balancer checks
   */
  app.get("/health", async (req: Request, res: Response): Promise<void> => {
    try {
      // In production, add database health check
      // const dbHealth = await db.raw("SELECT 1");

      ApiResponse.success(
        res,
        {
          status: "healthy",
          database: "connected",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
        "Health check passed",
        200
      );
    } catch (error) {
      ApiResponse.error(
        res,
        "Health check failed",
        503,
        error instanceof Error ? { error: error.message } : {}
      );
    }
  });

  /**
   * Root API endpoint
   * Returns API information and available endpoints
   */
  app.get("/", (req: Request, res: Response): void => {
    ApiResponse.success(
      res,
      {
        name: "Aymen Real Estate API",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime(),
        endpoints: {
          health: "/health",
          contacts: "/api/contacts",
          properties: "/api/properties",
        },
      },
      "Welcome to Aymen Real Estate API"
    );
  });

  // ============================================
  // Routes: API routes
  // ============================================
  app.use("/api", routes);

  // ============================================
  // Error Handling: 404 Not Found
  // ============================================
  app.use(notFoundHandler);

  // ============================================
  // Error Handling: Global error handler
  // MUST be last middleware mounted
  // ============================================
  app.use(errorHandler);

  return app;
};

export default createApp;
