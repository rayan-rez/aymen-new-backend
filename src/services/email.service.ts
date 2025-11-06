/**
 * Email Service with Edge.js Template Support
 * Handles all email sending operations using Nodemailer with Edge templates
 * Supports various email templates and scenarios
 */

import nodemailer, { Transporter } from "nodemailer";
import { Edge } from "edge.js";
import path from "path";

/**
 * Email configuration interface
 * Defines structure for email sending options
 */
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

/**
 * Template data interface for type safety
 */
interface TemplateData {
  [key: string]: any;
}

/**
 * Contact form data interface
 */
interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/**
 * Available email templates enum
 */
export enum EmailTemplate {
  CONTACT_FORM_ADMIN = "contact-form-admin",
  CONTACT_FORM_CONFIRMATION = "contact-form-confirmation",
  WELCOME = "welcome",
  PASSWORD_RESET = "password-reset",
  BOOKING_CONFIRMATION = "booking-confirmation",
  PROPERTY_INQUIRY = "property-inquiry",
}

/**
 * Email Service class
 * Manages email operations with Nodemailer and Edge templates
 */
class EmailService {
  /**
   * Nodemailer transporter instance
   * Configured from environment variables
   */
  private transporter: Transporter;

  /**
   * Email from address
   * Sender email for outgoing messages
   */
  private emailFrom: string;

  /**
   * Email from name
   * Display name for sender
   */
  private emailFromName: string;

  /**
   * Admin contact email
   * Where contact forms are sent
   */
  private adminEmail: string;

  /**
   * Edge template engine instance
   */
  private edge: Edge;

  /**
   * Templates directory path
   */
  private templatesDir: string;

  /**
   * Initializes the Email Service
   * Sets up Nodemailer transporter and Edge template engine
   *
   * Environment variables required:
   * - SMTP_HOST: SMTP server hostname
   * - SMTP_PORT: SMTP server port
   * - SMTP_USER: SMTP authentication username
   * - SMTP_PASS: SMTP authentication password
   * - EMAIL_FROM: Sender email address
   * - EMAIL_FROM_NAME: Display name for sender
   * - CONTACT_EMAIL: Admin email for contact forms
   */
  constructor() {
    // Initialize email configuration from environment
    this.emailFrom = process.env.EMAIL_FROM || "noreply@aymen.com";
    this.emailFromName = process.env.EMAIL_FROM_NAME || "Aymen Real Estate";
    this.adminEmail = process.env.CONTACT_EMAIL || "contact@aymen.com";

    // Set templates directory path
    this.templatesDir = path.join(__dirname, "../templates/emails");

    // Initialize Edge template engine
    this.edge = new Edge({ cache: process.env.NODE_ENV === "production" });

    // Mount the templates directory
    this.edge.mount(this.templatesDir);

    // Register custom Edge globals (available in all templates)
    this.registerEdgeGlobals();

    // Create Nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // Use TLS (not SSL)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Registers global variables and helpers for Edge templates
   * These will be available in all templates
   *
   * @private
   */
  private registerEdgeGlobals(): void {
    // Register global variables
    this.edge.global("currentYear", () => new Date().getFullYear());
    this.edge.global("companyName", this.emailFromName);
    this.edge.global("supportEmail", this.adminEmail);

    // Register custom helper for escaping HTML
    this.edge.global("escapeHtml", (text: string) => this.escapeHtml(text));

    // Register helper for formatting dates
    this.edge.global("formatDate", (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    });

    // Register helper for formatting phone numbers
    this.edge.global("formatPhone", (phone: string) => {
      // Add your phone formatting logic here
      return phone;
    });
  }

  /**
   * Renders an Edge template with provided data
   *
   * @param templateName - Name of the template file (without .edge extension)
   * @param data - Data to pass to the template
   * @returns Promise<string> - Rendered HTML
   *
   * @example
   * const html = await emailService.renderTemplate('welcome', { name: 'John' });
   */
  async renderTemplate(
    templateName: string,
    data: TemplateData = {}
  ): Promise<string> {
    try {
      // Render template using Edge
      const html = await this.edge.render(templateName, data);
      return html;
    } catch (error) {
      console.error(`❌ Error rendering template "${templateName}":`, error);
      throw new Error(`Failed to render email template: ${templateName}`);
    }
  }

  /**
   * Embeds logo images as inline attachments
   *
   * @param logoType - 'row' or 'block' logo style
   * @returns Array of attachment objects
   *
   * @private
   */
  private getLogoAttachments(
    logoType: "row" | "block" = "row"
  ): Array<{ filename: string; path: string; cid: string }> {
    const logoPath = path.join(__dirname, `../assets/logo-${logoType}.svg`);

    return [
      {
        filename: `logo-${logoType}.svg`,
        path: logoPath,
        cid: "logo", // Used in template as: src="cid:logo"
      },
      {
        filename: `logo-${logoType}.svg`,
        path: logoPath,
        cid: "logo-footer", // Used in footer as: src="cid:logo-footer"
      },
    ];
  }

  /**
   * Sends an email using a template
   *
   * @param to - Recipient email address(es)
   * @param subject - Email subject
   * @param templateName - Name of the template to use
   * @param data - Data to pass to the template
   * @param options - Additional email options
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await emailService.sendTemplatedEmail(
   *   'user@example.com',
   *   'Welcome to Aymen',
   *   EmailTemplate.WELCOME,
   *   { name: 'John', propertyCount: 150 }
   * );
   */
  async sendTemplatedEmail(
    to: string | string[],
    subject: string,
    templateName: EmailTemplate | string,
    data: TemplateData = {},
    options: Partial<EmailOptions> = {}
  ): Promise<boolean> {
    try {
      // Render the template
      const html = await this.renderTemplate(templateName, data);

      // Generate plain text version
      const text = this.htmlToText(html);

      // Get logo attachments
      const logoAttachments = this.getLogoAttachments("row"); // or 'block'

      // Send email with embedded logos
      return await this.sendEmail({
        to,
        subject,
        html,
        text,
        attachments: [...logoAttachments, ...(options.attachments || [])],
        ...options,
      });
    } catch (error) {
      console.error("❌ Error sending templated email:", error);
      return false;
    }
  }

  /**
   * Sends a generic email
   * Base method for all email operations
   *
   * @param options - Email configuration
   * @returns Promise<boolean> - Success status
   *
   * @example
   * const sent = await emailService.sendEmail({
   *   to: "user@example.com",
   *   subject: "Welcome",
   *   html: "<h1>Welcome!</h1>",
   *   text: "Welcome"
   * });
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Send email
      const info = await this.transporter.sendMail({
        from: `"${this.emailFromName}" <${this.emailFrom}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        attachments: options.attachments,
      });

      // Log success
      console.log("✅ Email sent successfully. Message ID:", info.messageId);
      return true;
    } catch (error) {
      console.error("❌ Error sending email:", error);
      return false;
    }
  }

  /**
   * Sends a contact form notification email
   * Notifies admin of new contact form submission
   *
   * @param data - Contact form data
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await emailService.sendContactForm({
   *   name: "John Doe",
   *   email: "john@example.com",
   *   phone: "+213555123456",
   *   message: "I'm interested in..."
   * });
   */
  async sendContactForm(data: ContactFormData): Promise<boolean> {
    // Send email to admin using template
    const adminEmailSent = await this.sendTemplatedEmail(
      this.adminEmail,
      `New Contact Form from ${data.name}`,
      EmailTemplate.CONTACT_FORM_ADMIN,
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        receivedAt: new Date().toLocaleString(),
      },
      {
        replyTo: data.email,
      }
    );

    if (!adminEmailSent) {
      return false;
    }

    // Send confirmation email to user using template
    await this.sendTemplatedEmail(
      data.email,
      "We received your message - Aymen Real Estate",
      EmailTemplate.CONTACT_FORM_CONFIRMATION,
      {
        name: data.name,
      }
    );

    return true;
  }

  /**
   * Sends a welcome email to a new user
   *
   * @param to - User email address
   * @param name - User name
   * @param additionalData - Additional data for the template
   * @returns Promise<boolean> - Success status
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    additionalData: TemplateData = {}
  ): Promise<boolean> {
    return await this.sendTemplatedEmail(
      to,
      `Welcome to ${this.emailFromName}`,
      EmailTemplate.WELCOME,
      {
        name,
        ...additionalData,
      }
    );
  }

  /**
   * Sends a password reset email
   *
   * @param to - User email address
   * @param name - User name
   * @param resetLink - Password reset link
   * @returns Promise<boolean> - Success status
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetLink: string
  ): Promise<boolean> {
    return await this.sendTemplatedEmail(
      to,
      "Password Reset Request",
      EmailTemplate.PASSWORD_RESET,
      {
        name,
        resetLink,
        expiryTime: "1 hour",
      }
    );
  }

  /**
   * Verifies SMTP connection
   * Useful for testing email configuration
   *
   * @returns Promise<boolean> - Connection status
   *
   * @example
   * const isConnected = await emailService.verifyConnection();
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("✅ SMTP connection verified");
      return true;
    } catch (error) {
      console.error("❌ SMTP connection failed:", error);
      return false;
    }
  }

  /**
   * Clears the Edge template cache
   * Useful for development or when templates are updated
   */
  clearTemplateCache(): void {
    // Edge handles cache internally, we can remount to force reload
    this.edge.mount(this.templatesDir);
    console.log("✅ Template cache cleared");
  }

  /**
   * Converts HTML to plain text
   * Simple implementation for email fallback
   *
   * @param html - HTML content
   * @returns Plain text version
   *
   * @private
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Escapes HTML special characters
   * Prevents HTML injection in email templates
   *
   * @param text - Text to escape
   * @returns Escaped text safe for HTML
   *
   * @private
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

// Export singleton instance
export default new EmailService();
