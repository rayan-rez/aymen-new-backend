/**
 * Server entry point
 * Starts the Express server and handles graceful shutdown
 */

import { createApp } from "@/app";
import { loadEnv } from "@/config/load-env"
import { table } from "table";


// Load environment variables
loadEnv();
/**
 * Application port
 * Reads from environment variable or defaults to 8080
 */
const PORT = process.env.PORT || 8080;

/**
 * Application environment
 * Indicates development, staging, or production mode
 */
const NODE_ENV = process.env.NODE_ENV || "development";
const APP_URL = process.env.APP_URL || "http://localhost";

/**
 * Creates and starts the Express server
 * Sets up graceful shutdown handlers
 */
const startServer = (): void => {
  try {
    // Create Express application
    const app = createApp();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      const port = ":"+PORT.toString();
      console.log(table([
        ["📍 URL:", `${APP_URL}${port === "80" ? "" : port}`],
        ["💚 Health:", `${APP_URL}${port === "80" ? "" : port}/health`],
        ["🌍 Environment:", NODE_ENV]
      ],{
        header: {
          alignment: "center",
          content: "🚀 Server Started"
        },
        columns: {
          1: {
            width: 50
          }
        }
      }))
    });

    // ============================================
    // Graceful shutdown handlers
    // ============================================

    /**
     * Handle SIGTERM signal (from process manager)
     * Gracefully shuts down the server
     */
    process.on("SIGTERM", () => {
      console.log(
        "\n📛 SIGTERM signal received: closing HTTP server gracefully"
      );
      server.close(() => {
        console.log("✅ HTTP server closed");
        process.exit(0);
      });
    });

    /**
     * Handle SIGINT signal (Ctrl+C)
     * Gracefully shuts down the server
     */
    process.on("SIGINT", () => {
      console.log(
        "\n📛 SIGINT signal received: closing HTTP server gracefully"
      );
      server.close(() => {
        console.log("✅ HTTP server closed");
        process.exit(0);
      });
    });

    /**
     * Handle uncaught exceptions
     * Logs error and exits process
     */
    process.on("uncaughtException", (error: Error) => {
      console.error("❌ Uncaught Exception:", error);
      console.error(error.stack);
      process.exit(1);
    });

    /**
     * Handle unhandled promise rejections
     * Logs error and exits process
     */
    process.on("unhandledRejection", (reason: any) => {
      console.error("❌ Unhandled Rejection:", reason);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
