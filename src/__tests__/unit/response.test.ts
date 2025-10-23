/**
 * Response Utility Tests
 * Tests for API response formatting
 */

import { Response } from "express";
import { ApiResponse } from "@utils/response.util";

describe("ApiResponse Utility", () => {
  let mockRes: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("success", () => {
    it("should send success response with default values", () => {
      ApiResponse.success(mockRes as Response, { id: 1 });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Success",
          data: { id: 1 },
          timestamp: expect.any(String),
        })
      );
    });

    it("should send success response with custom message and status", () => {
      ApiResponse.success(mockRes as Response, { id: 1 }, "User created", 201);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User created",
          data: { id: 1 },
        })
      );
    });

    it("should handle null data", () => {
      ApiResponse.success(mockRes as Response, null, "Success");

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null,
        })
      );
    });
  });

  describe("created", () => {
    it("should send 201 created response", () => {
      ApiResponse.created(mockRes as Response, { id: 1 });

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Resource created successfully",
          data: { id: 1 },
        })
      );
    });

    it("should accept custom message", () => {
      ApiResponse.created(mockRes as Response, { id: 1 }, "User created");

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User created",
        })
      );
    });
  });

  describe("error", () => {
    it("should send error response with default values", () => {
      ApiResponse.error(mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Internal server error",
          timestamp: expect.any(String),
        })
      );
    });

    it("should send error response with custom message and status", () => {
      ApiResponse.error(mockRes as Response, "Not found", 404);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Not found",
        })
      );
    });

    it("should include error details when provided", () => {
      const errors = { email: "Invalid email" };
      ApiResponse.error(mockRes as Response, "Validation failed", 400, errors);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Validation failed",
          errors,
        })
      );
    });
  });

  describe("notFound", () => {
    it("should send 404 not found response", () => {
      ApiResponse.notFound(mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Resource not found",
        })
      );
    });

    it("should accept custom message", () => {
      ApiResponse.notFound(mockRes as Response, "User not found");

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User not found",
        })
      );
    });
  });

  describe("badRequest", () => {
    it("should send 400 bad request response", () => {
      ApiResponse.badRequest(mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Bad request",
        })
      );
    });

    it("should include validation errors", () => {
      const errors = { email: "Invalid", phone: "Required" };
      ApiResponse.badRequest(mockRes as Response, "Validation failed", errors);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation failed",
          errors,
        })
      );
    });
  });

  describe("unauthorized", () => {
    it("should send 401 unauthorized response", () => {
      ApiResponse.unauthorized(mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Unauthorized access",
        })
      );
    });
  });

  describe("forbidden", () => {
    it("should send 403 forbidden response", () => {
      ApiResponse.forbidden(mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Access forbidden",
        })
      );
    });
  });

  describe("conflict", () => {
    it("should send 409 conflict response", () => {
      ApiResponse.conflict(mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Resource conflict",
        })
      );
    });
  });

  describe("unprocessable", () => {
    it("should send 422 unprocessable entity response", () => {
      ApiResponse.unprocessable(mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Unable to process request",
        })
      );
    });

    it("should include error details", () => {
      const errors = { data: "Invalid format" };
      ApiResponse.unprocessable(
        mockRes as Response,
        "Processing failed",
        errors
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Processing failed",
          errors,
        })
      );
    });
  });
});
