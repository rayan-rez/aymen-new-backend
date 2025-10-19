// src/utils/response.util.ts
import { Response } from "express";

export class ApiResponse {
  static success(
    res: Response,
    data: any,
    message: string = "Success",
    statusCode: number = 200
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(
    res: Response,
    message: string = "Error",
    statusCode: number = 500,
    errors?: any
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static notFound(res: Response, message: string = "Resource not found") {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  static badRequest(
    res: Response,
    message: string = "Bad request",
    errors?: any
  ) {
    return res.status(400).json({
      success: false,
      message,
      errors,
    });
  }
}
