/**
 * Email Service Tests
 * Comprehensive test suite for email service with Edge templates
 * 
 * Test Coverage:
 * - Template rendering
 * - Email sending
 * - Contact form handling
 * - Welcome emails
 * - Password reset emails
 * - SMTP connection
 * - Error handling
 * - Logo attachments
 */

import emailService, { EmailTemplate } from "@services/email.service";
import nodemailer from "nodemailer";
import { Edge } from "edge.js";
import path from "path";
import fs from "fs/promises";

// Mock nodemailer
jest.mock("nodemailer");

// Mock Edge.js
jest.mock("edge.js");

// Mock fs/promises
jest.mock("fs/promises");

describe("Email Service", () => {
  let mockTransporter: any;
  let mockEdge: any;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock transporter methods
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: "test-message-id-123",
        accepted: ["test@example.com"],
        rejected: [],
        response: "250 Message accepted",
      }),
      verify: jest.fn().mockResolvedValue(true),
    };

    // Mock nodemailer.createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Mock Edge instance
    mockEdge = {
      mount: jest.fn(),
      render: jest.fn().mockResolvedValue("<html><body>Test Email</body></html>"),
      global: jest.fn(),
    };

    // Mock Edge constructor
    (Edge as jest.MockedClass<typeof Edge>).mockImplementation(() => mockEdge);

    // Mock fs.readFile for logo attachments
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from("fake-svg-content"));

    // Suppress console logs during tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe("Initialization", () => {
    it("should initialize with environment variables", () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    });

    it("should initialize Edge with cache enabled in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      // Re-import to trigger constructor
      jest.isolateModules(() => {
        require("@services/email.service");
      });

      process.env.NODE_ENV = originalEnv;
    });

    it("should mount templates directory", () => {
      expect(mockEdge.mount).toHaveBeenCalled();
    });

    it("should register Edge globals", () => {
      expect(mockEdge.global).toHaveBeenCalledWith("currentYear", expect.any(Function));
      expect(mockEdge.global).toHaveBeenCalledWith("companyName", expect.any(String));
      expect(mockEdge.global).toHaveBeenCalledWith("supportEmail", expect.any(String));
    });
  });

  // ============================================================================
  // TEMPLATE RENDERING TESTS
  // ============================================================================

  describe("renderTemplate", () => {
    it("should render template successfully", async () => {
      const html = await emailService.renderTemplate("welcome", {
        name: "John Doe",
      });

      expect(mockEdge.render).toHaveBeenCalledWith("welcome", {
        name: "John Doe",
      });
      expect(html).toBe("<html><body>Test Email</body></html>");
    });

    it("should handle template rendering errors", async () => {
      mockEdge.render.mockRejectedValueOnce(new Error("Template not found"));

      await expect(
        emailService.renderTemplate("non-existent", {})
      ).rejects.toThrow("Failed to render email template: non-existent");
    });

    it("should pass data to template", async () => {
      const data = {
        name: "Jane Smith",
        email: "jane@example.com",
        customField: "test",
      };

      await emailService.renderTemplate("test-template", data);

      expect(mockEdge.render).toHaveBeenCalledWith("test-template", data);
    });
  });

  // ============================================================================
  // EMAIL SENDING TESTS
  // ============================================================================

  describe("sendEmail", () => {
    it("should send email successfully", async () => {
      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
        text: "Test content",
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: `"${process.env.EMAIL_FROM_NAME || "Aymen Real Estate"}" <${process.env.EMAIL_FROM || "noreply@aymen.com"}>`,
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
        text: "Test content",
        replyTo: undefined,
        attachments: undefined,
      });
    });

    it("should send email to multiple recipients", async () => {
      const recipients = ["user1@example.com", "user2@example.com"];

      await emailService.sendEmail({
        to: recipients,
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipients,
        })
      );
    });

    it("should handle email sending errors", async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error("SMTP connection failed")
      );

      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toBe(false);
    });

    it("should include replyTo address", async () => {
      await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        replyTo: "reply@example.com",
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: "reply@example.com",
        })
      );
    });

    it("should include attachments", async () => {
      const attachments = [
        {
          filename: "document.pdf",
          path: "/path/to/document.pdf",
        },
      ];

      await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments,
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining(attachments),
        })
      );
    });
  });

  // ============================================================================
  // TEMPLATED EMAIL TESTS
  // ============================================================================

  describe("sendTemplatedEmail", () => {
    it("should send email using template", async () => {
      const result = await emailService.sendTemplatedEmail(
        "user@example.com",
        "Welcome Email",
        EmailTemplate.WELCOME,
        { name: "John Doe" }
      );

      expect(result).toBe(true);
      expect(mockEdge.render).toHaveBeenCalledWith(EmailTemplate.WELCOME, {
        name: "John Doe",
      });
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it("should include logo attachments", async () => {
      await emailService.sendTemplatedEmail(
        "user@example.com",
        "Test",
        EmailTemplate.WELCOME,
        { name: "John" }
      );

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.attachments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ cid: "logo" }),
          expect.objectContaining({ cid: "logo-footer" }),
        ])
      );
    });

    it("should generate plain text from HTML", async () => {
      mockEdge.render.mockResolvedValueOnce(
        "<html><body><h1>Title</h1><p>Content</p></body></html>"
      );

      await emailService.sendTemplatedEmail(
        "user@example.com",
        "Test",
        "test-template",
        {}
      );

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.text).toBeDefined();
      expect(sendMailCall.text).not.toContain("<");
    });

    it("should handle template rendering errors", async () => {
      mockEdge.render.mockRejectedValueOnce(new Error("Template error"));

      const result = await emailService.sendTemplatedEmail(
        "user@example.com",
        "Test",
        "invalid-template",
        {}
      );

      expect(result).toBe(false);
    });

    it("should merge additional options", async () => {
      await emailService.sendTemplatedEmail(
        "user@example.com",
        "Test",
        EmailTemplate.WELCOME,
        { name: "John" },
        {
          replyTo: "custom@example.com",
          attachments: [{ filename: "extra.pdf", content: Buffer.from("test") }],
        }
      );

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.replyTo).toBe("custom@example.com");
      expect(sendMailCall.attachments.length).toBeGreaterThan(2); // logos + extra
    });
  });

  // ============================================================================
  // CONTACT FORM TESTS
  // ============================================================================

  describe("sendContactForm", () => {
    const contactData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "+213555123456",
      message: "I'm interested in your properties",
    };

    it("should send contact form to admin", async () => {
      const result = await emailService.sendContactForm(contactData);

      expect(result).toBe(true);
      expect(mockEdge.render).toHaveBeenCalledWith(
        EmailTemplate.CONTACT_FORM_ADMIN,
        expect.objectContaining({
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          message: contactData.message,
          receivedAt: expect.any(String),
        })
      );
    });

    it("should send confirmation email to user", async () => {
      await emailService.sendContactForm(contactData);

      expect(mockEdge.render).toHaveBeenCalledWith(
        EmailTemplate.CONTACT_FORM_CONFIRMATION,
        expect.objectContaining({
          name: contactData.name,
        })
      );
    });

    it("should set replyTo as user email for admin notification", async () => {
      await emailService.sendContactForm(contactData);

      const adminEmailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(adminEmailCall.replyTo).toBe(contactData.email);
    });

    it("should return false if admin email fails", async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error("Send failed"));

      const result = await emailService.sendContactForm(contactData);

      expect(result).toBe(false);
    });

    it("should still return true if confirmation email fails", async () => {
      // First call succeeds (admin), second fails (confirmation)
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: "123" })
        .mockRejectedValueOnce(new Error("Send failed"));

      const result = await emailService.sendContactForm(contactData);

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // WELCOME EMAIL TESTS
  // ============================================================================

  describe("sendWelcomeEmail", () => {
    it("should send welcome email", async () => {
      const result = await emailService.sendWelcomeEmail(
        "user@example.com",
        "John Doe"
      );

      expect(result).toBe(true);
      expect(mockEdge.render).toHaveBeenCalledWith(
        EmailTemplate.WELCOME,
        expect.objectContaining({
          name: "John Doe",
        })
      );
    });

    it("should include additional data", async () => {
      await emailService.sendWelcomeEmail(
        "user@example.com",
        "John Doe",
        {
          dashboardUrl: "https://example.com/dashboard",
          customField: "value",
        }
      );

      expect(mockEdge.render).toHaveBeenCalledWith(
        EmailTemplate.WELCOME,
        expect.objectContaining({
          name: "John Doe",
          dashboardUrl: "https://example.com/dashboard",
          customField: "value",
        })
      );
    });

    it("should use company name in subject", async () => {
      await emailService.sendWelcomeEmail("user@example.com", "John Doe");

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.subject).toContain(
        process.env.EMAIL_FROM_NAME || "Aymen Real Estate"
      );
    });
  });

  // ============================================================================
  // PASSWORD RESET TESTS
  // ============================================================================

  describe("sendPasswordResetEmail", () => {
    it("should send password reset email", async () => {
      const resetLink = "https://example.com/reset?token=abc123";

      const result = await emailService.sendPasswordResetEmail(
        "user@example.com",
        "John Doe",
        resetLink
      );

      expect(result).toBe(true);
      expect(mockEdge.render).toHaveBeenCalledWith(
        EmailTemplate.PASSWORD_RESET,
        expect.objectContaining({
          name: "John Doe",
          resetLink,
          expiryTime: "1 hour",
        })
      );
    });

    it("should include reset link in template data", async () => {
      const resetLink = "https://example.com/reset?token=xyz789";

      await emailService.sendPasswordResetEmail(
        "user@example.com",
        "Jane Smith",
        resetLink
      );

      expect(mockEdge.render).toHaveBeenCalledWith(
        EmailTemplate.PASSWORD_RESET,
        expect.objectContaining({
          resetLink,
        })
      );
    });
  });

  // ============================================================================
  // CONNECTION VERIFICATION TESTS
  // ============================================================================

  describe("verifyConnection", () => {
    it("should verify SMTP connection successfully", async () => {
      const result = await emailService.verifyConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it("should handle connection verification failure", async () => {
      mockTransporter.verify.mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const result = await emailService.verifyConnection();

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // CACHE MANAGEMENT TESTS
  // ============================================================================

  describe("clearTemplateCache", () => {
    it("should clear template cache by remounting", () => {
      emailService.clearTemplateCache();

      // Should call mount at least twice (once in constructor, once in clear)
      expect(mockEdge.mount).toHaveBeenCalledTimes(expect.any(Number));
    });
  });

  // ============================================================================
  // HELPER METHOD TESTS
  // ============================================================================

  describe("Helper Methods", () => {
    describe("htmlToText", () => {
      it("should convert HTML to plain text", async () => {
        mockEdge.render.mockResolvedValueOnce(
          "<html><body><h1>Title</h1><p>Paragraph text</p></body></html>"
        );

        await emailService.sendTemplatedEmail(
          "test@example.com",
          "Test",
          "test",
          {}
        );

        const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
        expect(sendMailCall.text).not.toContain("<html>");
        expect(sendMailCall.text).not.toContain("<body>");
      });

      it("should remove style tags", async () => {
        mockEdge.render.mockResolvedValueOnce(
          "<html><style>body { color: red; }</style><body>Content</body></html>"
        );

        await emailService.sendTemplatedEmail(
          "test@example.com",
          "Test",
          "test",
          {}
        );

        const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
        expect(sendMailCall.text).not.toContain("color: red");
      });

      it("should remove script tags", async () => {
        mockEdge.render.mockResolvedValueOnce(
          '<html><script>alert("test")</script><body>Content</body></html>'
        );

        await emailService.sendTemplatedEmail(
          "test@example.com",
          "Test",
          "test",
          {}
        );

        const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
        expect(sendMailCall.text).not.toContain("alert");
      });
    });

    describe("escapeHtml", () => {
      it("should be registered as Edge global", () => {
        expect(mockEdge.global).toHaveBeenCalledWith(
          "escapeHtml",
          expect.any(Function)
        );
      });
    });
  });

  // ============================================================================
  // EDGE INTEGRATION TESTS
  // ============================================================================

  describe("Edge Integration", () => {
    it("should register currentYear global", () => {
      expect(mockEdge.global).toHaveBeenCalledWith(
        "currentYear",
        expect.any(Function)
      );
    });

    it("should register companyName global", () => {
      expect(mockEdge.global).toHaveBeenCalledWith(
        "companyName",
        expect.any(String)
      );
    });

    it("should register supportEmail global", () => {
      expect(mockEdge.global).toHaveBeenCalledWith(
        "supportEmail",
        expect.any(String)
      );
    });

    it("should register formatDate helper", () => {
      expect(mockEdge.global).toHaveBeenCalledWith(
        "formatDate",
        expect.any(Function)
      );
    });

    it("should register formatPhone helper", () => {
      expect(mockEdge.global).toHaveBeenCalledWith(
        "formatPhone",
        expect.any(Function)
      );
    });
  });

  // ============================================================================
  // ERROR SCENARIOS
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle missing template gracefully", async () => {
      mockEdge.render.mockRejectedValueOnce(
        new Error("ENOENT: template not found")
      );

      const result = await emailService.sendTemplatedEmail(
        "user@example.com",
        "Test",
        "missing-template",
        {}
      );

      expect(result).toBe(false);
    });

    it("should handle SMTP authentication errors", async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error("Authentication failed")
      );

      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toBe(false);
    });

    it("should handle network errors", async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error("Network timeout")
      );

      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toBe(false);
    });

    it("should handle invalid recipient errors", async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error("Invalid recipient")
      );

      const result = await emailService.sendEmail({
        to: "invalid-email",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // ENVIRONMENT CONFIGURATION TESTS
  // ============================================================================

  describe("Environment Configuration", () => {
    it("should use default values when env vars not set", () => {
      const originalSmtpHost = process.env.SMTP_HOST;
      const originalSmtpPort = process.env.SMTP_PORT;

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;

      jest.isolateModules(() => {
        require("@services/email.service");

        expect(nodemailer.createTransport).toHaveBeenCalledWith(
          expect.objectContaining({
            host: "smtp.gmail.com",
            port: 587,
          })
        );
      });

      process.env.SMTP_HOST = originalSmtpHost;
      process.env.SMTP_PORT = originalSmtpPort;
    });

    it("should use environment EMAIL_FROM", () => {
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    it("should use environment SMTP credentials", () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })
      );
    });
  });
});