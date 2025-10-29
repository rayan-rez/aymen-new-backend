/**
 * Validators Utility Tests
 * Tests for validation utility functions
 */

import {
  validateEmail,
  validatePhone,
  validateStringLength,
  isNotEmpty,
  sanitizeString,
  createValidationResult,
} from "@utils/validators.util";

describe("Validators Utility", () => {
  describe("validateEmail", () => {
    it("should validate correct email formats", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name+tag@example.co.uk")).toBe(true);
      expect(validateEmail("test123@test-domain.com")).toBe(true);
    });

    it("should reject invalid email formats", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test @example.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });

    it("should handle null and undefined", () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });

    it("should trim whitespace before validation", () => {
      expect(validateEmail("  test@example.com  ")).toBe(true);
    });
  });

  describe("validatePhone", () => {
    it("should validate correct phone formats", () => {
      expect(validatePhone("+213555123456")).toBe(true);
      expect(validatePhone("0555123456")).toBe(true);
      expect(validatePhone("555-123-456")).toBe(true);
      expect(validatePhone("(555) 123-456")).toBe(true);
    });

    it("should reject invalid phone formats", () => {
      expect(validatePhone("abc")).toBe(false);
      expect(validatePhone("123")).toBe(false); // Less than 8 digits
      expect(validatePhone("")).toBe(false);
    });

    it("should require minimum 8 digits", () => {
      expect(validatePhone("1234567")).toBe(false); // 7 digits
      expect(validatePhone("12345678")).toBe(true); // 8 digits
      expect(validatePhone("123456789")).toBe(true); // 9 digits
    });

    it("should handle null and undefined", () => {
      expect(validatePhone(null as any)).toBe(false);
      expect(validatePhone(undefined as any)).toBe(false);
    });
  });

  describe("validateStringLength", () => {
    it("should validate string length correctly", () => {
      expect(validateStringLength("hello", 2, 10)).toBe(true);
      expect(validateStringLength("hi", 2)).toBe(true);
    });

    it("should reject strings that are too short", () => {
      expect(validateStringLength("a", 2)).toBe(false);
      expect(validateStringLength("", 1)).toBe(false);
    });

    it("should reject strings that are too long", () => {
      expect(validateStringLength("very long string", 5, 10)).toBe(false);
    });

    it("should handle maxLength as optional", () => {
      expect(validateStringLength("very long string", 5)).toBe(true);
    });

    it("should trim whitespace before checking length", () => {
      expect(validateStringLength("  hi  ", 2, 10)).toBe(true);
    });

    it("should handle null and undefined", () => {
      expect(validateStringLength(null as any, 2)).toBe(false);
      expect(validateStringLength(undefined as any, 2)).toBe(false);
    });
  });

  describe("isNotEmpty", () => {
    it("should return true for non-empty values", () => {
      expect(isNotEmpty("hello")).toBe(true);
      expect(isNotEmpty([1, 2, 3])).toBe(true);
      expect(isNotEmpty({ key: "value" })).toBe(true);
      expect(isNotEmpty(123)).toBe(true);
      expect(isNotEmpty(true)).toBe(true);
    });

    it("should return false for empty values", () => {
      expect(isNotEmpty("")).toBe(false);
      expect(isNotEmpty("   ")).toBe(false);
      expect(isNotEmpty([])).toBe(false);
      expect(isNotEmpty({})).toBe(false);
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("should remove HTML tags", () => {
      expect(sanitizeString('hello<script>alert("xss")</script>world')).toBe(
        'helloalert("xss")world'
      );
      expect(sanitizeString("test<>test")).toBe("testtest");
    });

    it("should normalize whitespace", () => {
      expect(sanitizeString("hello    world")).toBe("hello world");
      expect(sanitizeString("  hello  world  ")).toBe("hello world");
    });

    it("should trim leading and trailing whitespace", () => {
      expect(sanitizeString("  hello  ")).toBe("hello");
    });

    it("should handle empty strings", () => {
      expect(sanitizeString("")).toBe("");
      expect(sanitizeString("   ")).toBe("");
    });

    it("should handle null and undefined", () => {
      expect(sanitizeString(null as any)).toBe("");
      expect(sanitizeString(undefined as any)).toBe("");
    });
  });

  describe("createValidationResult", () => {
    it("should create valid result", () => {
      const result = createValidationResult(true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should create invalid result with errors", () => {
      const errors = { email: "Invalid email", phone: "Invalid phone" };
      const result = createValidationResult(false, errors);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(errors);
    });

    it("should handle empty errors object", () => {
      const result = createValidationResult(false);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual({});
    });
  });
});
