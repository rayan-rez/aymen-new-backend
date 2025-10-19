// src/middleware/validate.ts
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/response.util";

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const re = /^[\d\s\+\-\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, "").length >= 8;
};

export const validateContactForm = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, phone, message } = req.body;
  const errors: any = {};

  if (!name || name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (!email || !validateEmail(email)) {
    errors.email = "Valid email is required";
  }

  if (!phone || !validatePhone(phone)) {
    errors.phone = "Valid phone number is required";
  }

  if (!message || message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters";
  }

  if (Object.keys(errors).length > 0) {
    return ApiResponse.badRequest(res, "Validation failed", errors);
  }

  next();
};
