/**
 * Server entry point
 * Starts the Express server and handles graceful shutdown
 */

import dotenv from "dotenv";
import { createApp } from "./app";

// Load environment variables
dotenv.config();

/**
 * Application port
 * Reads from environment variable or defaults to 3000
 */
const PORT = process.env.PORT || 3000;

/**
 * Application environment
 * Indicates development, staging, or production mode
 */
const NODE_ENV = process.env.NODE_ENV || "development";

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
      console.log(
        "\n╔════════════════════════════════════════════════════════════╗"
      );
      console.log(
        "║                  🚀 Server Started                         ║"
      );
      console.log(
        "╠════════════════════════════════════════════════════════════╣"
      );
      console.log(
        `║ 📍 URL:         http://localhost:${PORT.toString().padEnd(26)}║`
      );
      console.log(`║ 🌍 Environment: ${NODE_ENV.padEnd(43)}║`);
      console.log(
        `║ 💚 Health:     http://localhost:${PORT}/health${" ".repeat(16)}║`
      );
      console.log(
        "╚════════════════════════════════════════════════════════════╝\n"
      );
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
