/**
 * Contact Service Tests
 * Test suite for contact form business logic
 *
 * Test Coverage:
 * - Contact form creation
 * - Email notification handling
 * - Error handling
 * - Data validation
 */

import contactService from "@services/contact.service";
import emailService from "@services/email.service";
import { AppError } from "@middlewares/error-handler.middleware";

// Mock email service
jest.mock("@services/email.service");

describe("Contact Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // CREATE CONTACT TESTS
  // ============================================================================

  describe("createContact", () => {
    const validContactData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "+213555123456",
      message: "I'm interested in your properties",
    };

    it("should create contact successfully", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(true);

      const result = await contactService.createContact(validContactData);

      expect(result).toBe(true);
      expect(emailService.sendContactForm).toHaveBeenCalledWith(
        validContactData
      );
      expect(emailService.sendContactForm).toHaveBeenCalledTimes(1);
    });

    it("should call email service with correct data", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(true);

      await contactService.createContact(validContactData);

      expect(emailService.sendContactForm).toHaveBeenCalledWith({
        name: validContactData.name,
        email: validContactData.email,
        phone: validContactData.phone,
        message: validContactData.message,
      });
    });

    it("should throw AppError if email sending fails", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        contactService.createContact(validContactData)
      ).rejects.toThrow(AppError);

      await expect(
        contactService.createContact(validContactData)
      ).rejects.toThrow("Failed to send contact form notification");
    });

    it("should throw AppError with 500 status on email failure", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(false);

      try {
        await contactService.createContact(validContactData);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(500);
      }
    });

    it("should handle email service errors", async () => {
      const emailError = new Error("SMTP connection failed");
      (emailService.sendContactForm as jest.Mock).mockRejectedValueOnce(
        emailError
      );

      await expect(
        contactService.createContact(validContactData)
      ).rejects.toThrow(emailError);
    });

    it("should log errors", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error");
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(false);

      try {
        await contactService.createContact(validContactData);
      } catch (error) {
        // Expected error
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error creating contact:",
        expect.any(Error)
      );
    });

    it("should handle missing required fields gracefully", async () => {
      const invalidData = {
        name: "",
        email: "test@example.com",
        phone: "",
        message: "",
      };

      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(true);

      // Service should still call email service (validation happens in controller)
      await contactService.createContact(invalidData as any);

      expect(emailService.sendContactForm).toHaveBeenCalledWith(invalidData);
    });
  });

  // ============================================================================
  // GET ALL CONTACTS TESTS
  // ============================================================================

  describe("getAllContacts", () => {
    it("should throw AppError with 501 status (not implemented)", async () => {
      const filters = { status: "pending", page: 1, limit: 10 };

      try {
        await contactService.getAllContacts(filters);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(501);
        expect((error as AppError).message).toBe("Not implemented yet");
      }
    });

    it("should log error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error");

      try {
        await contactService.getAllContacts({});
      } catch (error) {
        // Expected error
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting contacts:",
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // GET CONTACT BY ID TESTS
  // ============================================================================

  describe("getContactById", () => {
    it("should throw AppError with 501 status (not implemented)", async () => {
      try {
        await contactService.getContactById(123);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(501);
      }
    });

    it("should accept numeric ID", async () => {
      try {
        await contactService.getContactById(999);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
      }
    });
  });

  // ============================================================================
  // UPDATE CONTACT STATUS TESTS
  // ============================================================================

  describe("updateContactStatus", () => {
    it("should throw AppError with 501 status (not implemented)", async () => {
      try {
        await contactService.updateContactStatus(123, "contacted");
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(501);
      }
    });

    it("should accept status parameter", async () => {
      try {
        await contactService.updateContactStatus(1, "resolved");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
      }
    });
  });

  // ============================================================================
  // DELETE CONTACT TESTS
  // ============================================================================

  describe("deleteContact", () => {
    it("should throw AppError with 501 status (not implemented)", async () => {
      try {
        await contactService.deleteContact(123);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(501);
      }
    });

    it("should accept numeric ID", async () => {
      try {
        await contactService.deleteContact(456);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
      }
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe("Integration Scenarios", () => {
    it("should handle complete contact submission flow", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(true);

      const contactData = {
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "+213661234567",
        message: "Request for property information",
      };

      const result = await contactService.createContact(contactData);

      expect(result).toBe(true);
      expect(emailService.sendContactForm).toHaveBeenCalledTimes(1);
    });

    it("should handle simultaneous contact submissions", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValue(true);

      const contacts = [
        {
          name: "User 1",
          email: "user1@example.com",
          phone: "+213551111111",
          message: "Message 1",
        },
        {
          name: "User 2",
          email: "user2@example.com",
          phone: "+213552222222",
          message: "Message 2",
        },
        {
          name: "User 3",
          email: "user3@example.com",
          phone: "+213553333333",
          message: "Message 3",
        },
      ];

      const results = await Promise.all(
        contacts.map((contact) => contactService.createContact(contact))
      );

      expect(results).toEqual([true, true, true]);
      expect(emailService.sendContactForm).toHaveBeenCalledTimes(3);
    });

    it("should handle partial failures in batch submissions", async () => {
      (emailService.sendContactForm as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const contacts = [
        {
          name: "User 1",
          email: "user1@example.com",
          phone: "+213551111111",
          message: "Message 1",
        },
        {
          name: "User 2",
          email: "user2@example.com",
          phone: "+213552222222",
          message: "Message 2",
        },
        {
          name: "User 3",
          email: "user3@example.com",
          phone: "+213553333333",
          message: "Message 3",
        },
      ];

      const results = await Promise.allSettled(
        contacts.map((contact) => contactService.createContact(contact))
      );

      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      expect(results[2].status).toBe("fulfilled");
    });
  });

  // ============================================================================
  // ERROR PROPAGATION TESTS
  // ============================================================================

  describe("Error Propagation", () => {
    it("should propagate network errors", async () => {
      const networkError = new Error("Network timeout");
      (emailService.sendContactForm as jest.Mock).mockRejectedValueOnce(
        networkError
      );

      await expect(
        contactService.createContact({
          name: "Test",
          email: "test@example.com",
          phone: "123",
          message: "Test",
        })
      ).rejects.toThrow(networkError);
    });

    it("should propagate SMTP errors", async () => {
      const smtpError = new Error("SMTP authentication failed");
      (emailService.sendContactForm as jest.Mock).mockRejectedValueOnce(
        smtpError
      );

      await expect(
        contactService.createContact({
          name: "Test",
          email: "test@example.com",
          phone: "123",
          message: "Test",
        })
      ).rejects.toThrow(smtpError);
    });

    it("should propagate template rendering errors", async () => {
      const templateError = new Error("Template not found");
      (emailService.sendContactForm as jest.Mock).mockRejectedValueOnce(
        templateError
      );

      await expect(
        contactService.createContact({
          name: "Test",
          email: "test@example.com",
          phone: "123",
          message: "Test",
        })
      ).rejects.toThrow(templateError);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle very long messages", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(true);

      const longMessage = "A".repeat(10000);
      const contactData = {
        name: "Test User",
        email: "test@example.com",
        phone: "+213555123456",
        message: longMessage,
      };

      const result = await contactService.createContact(contactData);

      expect(result).toBe(true);
      expect(emailService.sendContactForm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: longMessage,
        })
      );
    });

    it("should handle special characters in message", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(true);

      const specialMessage =
        "<script>alert('test')</script> & special chars: é à ñ";
      const contactData = {
        name: "Test User",
        email: "test@example.com",
        phone: "+213555123456",
        message: specialMessage,
      };

      const result = await contactService.createContact(contactData);

      expect(result).toBe(true);
    });

    it("should handle international phone numbers", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(true);

      const contactData = {
        name: "International User",
        email: "international@example.com",
        phone: "+44 20 7946 0958", // UK number
        message: "Test message",
      };

      const result = await contactService.createContact(contactData);

      expect(result).toBe(true);
    });

    it("should handle unicode characters in name", async () => {
      (emailService.sendContactForm as jest.Mock).mockResolvedValueOnce(true);

      const contactData = {
        name: "José García 王伟",
        email: "unicode@example.com",
        phone: "+213555123456",
        message: "Test message with émojis 😀🎉",
      };

      const result = await contactService.createContact(contactData);

      expect(result).toBe(true);
    });
  });
});
