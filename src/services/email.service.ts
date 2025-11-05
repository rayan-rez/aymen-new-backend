/**
 * Email Service
 * Handles all email sending operations using Nodemailer
 * Supports various email templates and scenarios
 *
 * @module services/email
 *
 * @swagger
 * components:
 *   schemas:
 *     EmailOptions:
 *       type: object
 *       required:
 *         - to
 *         - subject
 *         - html
 *       properties:
 *         to:
 *           oneOf:
 *             - type: string
 *               format: email
 *             - type: array
 *               items:
 *                 type: string
 *                 format: email
 *           description: Recipient email address(es)
 *           example: "user@example.com"
 *         subject:
 *           type: string
 *           maxLength: 255
 *           description: Email subject line
 *           example: "Welcome to Aymen Real Estate"
 *         html:
 *           type: string
 *           description: HTML body content
 *           example: "<h1>Welcome!</h1><p>Thank you for joining us.</p>"
 *         text:
 *           type: string
 *           description: Plain text body content (optional)
 *           example: "Welcome! Thank you for joining us."
 *         from:
 *           type: string
 *           format: email
 *           description: Sender email address (optional, uses default)
 *           example: "noreply@aymen.com"
 *         replyTo:
 *           type: string
 *           format: email
 *           description: Reply-to email address (optional)
 *           example: "support@aymen.com"
 *
 *     ContactFormData:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - phone
 *         - message
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *           description: Full name of the person submitting the form
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           description: Email address for follow-up
 *           example: "john.doe@example.com"
 *         phone:
 *           type: string
 *           pattern: '^\+?[\d\s\-\(\)]+$'
 *           description: Contact phone number
 *           example: "+213555123456"
 *         message:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           description: Message or inquiry content
 *           example: "I'm interested in learning more about your properties."
 *
 *     EmailSendRequest:
 *       type: object
 *       required:
 *         - to
 *         - subject
 *         - content
 *       properties:
 *         to:
 *           type: string
 *           format: email
 *           description: Recipient email address
 *           example: "user@example.com"
 *         subject:
 *           type: string
 *           description: Email subject
 *           example: "Welcome to our platform"
 *         content:
 *           type: string
 *           description: Email content (HTML or plain text)
 *           example: "<h1>Welcome!</h1>"
 *         replyTo:
 *           type: string
 *           format: email
 *           description: Reply-to address
 *           example: "support@aymen.com"
 *
 *     EmailSendResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Email sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             messageId:
 *               type: string
 *               description: Unique message identifier from email server
 *               example: "<abc123@mail.example.com>"
 *             recipients:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of recipient email addresses
 *               example: ["user@example.com"]
 *             timestamp:
 *               type: string
 *               format: date-time
 *               description: When the email was sent
 *               example: "2025-11-05T10:30:00.000Z"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     EmailSendError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Failed to send email"
 *         errors:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: "SMTP_CONNECTION_ERROR"
 *             details:
 *               type: string
 *               example: "Could not connect to SMTP server"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     SMTPConfiguration:
 *       type: object
 *       required:
 *         - host
 *         - port
 *         - user
 *         - pass
 *       properties:
 *         host:
 *           type: string
 *           description: SMTP server hostname
 *           example: "smtp.gmail.com"
 *         port:
 *           type: integer
 *           description: SMTP server port
 *           example: 587
 *         secure:
 *           type: boolean
 *           default: false
 *           description: Use SSL/TLS
 *           example: false
 *         user:
 *           type: string
 *           description: SMTP authentication username
 *           example: "user@example.com"
 *         pass:
 *           type: string
 *           format: password
 *           description: SMTP authentication password
 *           example: "your-password"
 *
 *     ConnectionVerificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "SMTP connection verified"
 *         data:
 *           type: object
 *           properties:
 *             connected:
 *               type: boolean
 *               example: true
 *             server:
 *               type: string
 *               example: "smtp.gmail.com"
 *             port:
 *               type: integer
 *               example: 587
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *   examples:
 *     BasicEmailExample:
 *       summary: Basic email with HTML content
 *       value:
 *         to: "user@example.com"
 *         subject: "Welcome to Aymen Real Estate"
 *         html: "<h1>Welcome!</h1><p>Thank you for joining us.</p>"
 *         text: "Welcome! Thank you for joining us."
 *
 *     MultipleRecipientsExample:
 *       summary: Email to multiple recipients
 *       value:
 *         to: ["user1@example.com", "user2@example.com", "user3@example.com"]
 *         subject: "Team Announcement"
 *         html: "<h1>Important Update</h1><p>Please review the attached information.</p>"
 *
 *     EmailWithReplyToExample:
 *       summary: Email with custom reply-to address
 *       value:
 *         to: "customer@example.com"
 *         subject: "Your Inquiry Response"
 *         html: "<p>Thank you for your inquiry. We will respond within 24 hours.</p>"
 *         replyTo: "support@aymen.com"
 *
 *     ContactFormSubmissionExample:
 *       summary: Contact form submission
 *       value:
 *         name: "John Doe"
 *         email: "john.doe@example.com"
 *         phone: "+213555123456"
 *         message: "I'm interested in learning more about Green Heights Residence. Could you provide more information about availability and pricing?"
 *
 *     EmailSentSuccessExample:
 *       summary: Successful email send response
 *       value:
 *         success: true
 *         message: "Email sent successfully"
 *         data:
 *           messageId: "<abc123@mail.example.com>"
 *           recipients: ["user@example.com"]
 *           timestamp: "2025-11-05T10:30:00.000Z"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 *     EmailSendFailureExample:
 *       summary: Failed email send response
 *       value:
 *         success: false
 *         message: "Failed to send email"
 *         errors:
 *           code: "SMTP_CONNECTION_ERROR"
 *           details: "Could not connect to SMTP server"
 *         timestamp: "2025-11-05T10:30:00.000Z"
 *
 * Features:
 * - SMTP email delivery via Nodemailer
 * - HTML and plain text email support
 * - Multiple recipient support
 * - Custom reply-to addresses
 * - Email template generation
 * - Contact form notifications
 * - Auto-confirmation emails
 * - HTML injection prevention
 * - Connection verification
 * - Error handling and logging
 * - Environment-based configuration
 *
 * Configuration (Environment Variables):
 * - **SMTP_HOST**: SMTP server hostname (default: smtp.gmail.com)
 * - **SMTP_PORT**: SMTP server port (default: 587)
 * - **SMTP_USER**: SMTP authentication username
 * - **SMTP_PASS**: SMTP authentication password
 * - **EMAIL_FROM**: Sender email address (default: noreply@aymen.com)
 * - **EMAIL_FROM_NAME**: Display name for sender (default: Aymen Real Estate)
 * - **CONTACT_EMAIL**: Admin email for contact forms (default: contact@aymen.com)
 *
 * @example
 * ```typescript
 * // Send basic email
 * await emailService.sendEmail({
 *   to: "user@example.com",
 *   subject: "Welcome",
 *   html: "<h1>Welcome!</h1>",
 *   text: "Welcome"
 * });
 *
 * // Send contact form notification
 * await emailService.sendContactForm({
 *   name: "John Doe",
 *   email: "john@example.com",
 *   phone: "+213555123456",
 *   message: "I'm interested in your properties"
 * });
 *
 * // Verify SMTP connection
 * const isConnected = await emailService.verifyConnection();
 * ```
 */

import nodemailer, { Transporter } from "nodemailer";

/**
 * @openapi
 * Email configuration interface
 * Defines structure for email sending options
 *
 * @interface EmailOptions
 */
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * @openapi
 * Contact form data interface
 *
 * @interface ContactFormData
 */
interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/**
 * @openapi
 * Email Service class
 * Manages email operations with Nodemailer
 *
 * @class EmailService
 */
class EmailService {
  /**
   * @openapi
   * Nodemailer transporter instance
   * Configured from environment variables
   *
   * @private
   */
  private transporter: Transporter;

  /**
   * @openapi
   * Email from address
   * Sender email for outgoing messages
   *
   * @private
   */
  private emailFrom: string;

  /**
   * @openapi
   * Email from name
   * Display name for sender
   *
   * @private
   */
  private emailFromName: string;

  /**
   * @openapi
   * Admin contact email
   * Where contact forms are sent
   *
   * @private
   */
  private adminEmail: string;

  /**
   * @openapi
   * Initializes the Email Service
   * Sets up Nodemailer transporter with SMTP configuration
   *
   * Environment variables required:
   * - **SMTP_HOST**: SMTP server hostname
   * - **SMTP_PORT**: SMTP server port
   * - **SMTP_USER**: SMTP authentication username
   * - **SMTP_PASS**: SMTP authentication password
   * - **EMAIL_FROM**: Sender email address
   * - **EMAIL_FROM_NAME**: Display name for sender
   * - **CONTACT_EMAIL**: Admin email for contact forms
   *
   * @constructor
   */
  constructor() {
    // Initialize email configuration from environment
    this.emailFrom = process.env.EMAIL_FROM || "noreply@aymen.com";
    this.emailFromName = process.env.EMAIL_FROM_NAME || "Aymen Real Estate";
    this.adminEmail = process.env.CONTACT_EMAIL || "contact@aymen.com";

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
   * @openapi
   * Sends a generic email
   * Base method for all email operations
   *
   * @param {EmailOptions} options - Email configuration
   * @returns {Promise<boolean>} Success status
   *
   * @example
   * ```typescript
   * // Simple email
   * const sent = await emailService.sendEmail({
   *   to: "user@example.com",
   *   subject: "Welcome",
   *   html: "<h1>Welcome!</h1>",
   *   text: "Welcome"
   * });
   *
   * // Email with reply-to
   * await emailService.sendEmail({
   *   to: "customer@example.com",
   *   subject: "Your Inquiry",
   *   html: "<p>Thank you for your inquiry.</p>",
   *   replyTo: "support@aymen.com"
   * });
   *
   * // Multiple recipients
   * await emailService.sendEmail({
   *   to: ["user1@example.com", "user2@example.com"],
   *   subject: "Team Update",
   *   html: "<p>Important announcement</p>"
   * });
   * ```
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
   * @openapi
   * Sends a contact form notification email
   * Notifies admin of new contact form submission and sends confirmation to user
   *
   * @param {ContactFormData} data - Contact form data
   * @returns {Promise<boolean>} Success status
   *
   * @example
   * ```typescript
   * // Send contact form notification
   * const sent = await emailService.sendContactForm({
   *   name: "John Doe",
   *   email: "john@example.com",
   *   phone: "+213555123456",
   *   message: "I'm interested in your properties in Algiers."
   * });
   *
   * if (sent) {
   *   console.log("Contact form email sent successfully");
   * }
   * ```
   */
  async sendContactForm(data: ContactFormData): Promise<boolean> {
    // Generate HTML email template
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
          .content { margin: 20px 0; }
          .field { margin: 15px 0; }
          .label { font-weight: bold; color: #555; }
          .value { margin: 5px 0 0 0; color: #333; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📧 New Contact Form Submission</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Name:</div>
              <div class="value">${this.escapeHtml(data.name)}</div>
            </div>
            <div class="field">
              <div class="label">Email:</div>
              <div class="value">
                <a href="mailto:${this.escapeHtml(data.email)}">${this.escapeHtml(data.email)}</a>
              </div>
            </div>
            <div class="field">
              <div class="label">Phone:</div>
              <div class="value">
                <a href="tel:${this.escapeHtml(data.phone)}">${this.escapeHtml(data.phone)}</a>
              </div>
            </div>
            <div class="field">
              <div class="label">Message:</div>
              <div class="value">${this.escapeHtml(data.message).replace(/\n/g, "<br>")}</div>
            </div>
          </div>
          <div class="footer">
            <p>This message was sent from your website's contact form.</p>
            <p>Received at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate plain text version
    const text = `
New Contact Form Submission

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone}

Message:
${data.message}

---
Received at: ${new Date().toLocaleString()}
    `.trim();

    // Send email to admin
    const adminEmailSent = await this.sendEmail({
      to: this.adminEmail,
      subject: `New Contact Form from ${data.name}`,
      html,
      text,
      replyTo: data.email,
    });

    if (!adminEmailSent) {
      return false;
    }

    // Optionally send confirmation email to user
    const confirmationHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
          .content { margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Thank You for Contacting Us</h2>
          </div>
          <div class="content">
            <p>Dear ${this.escapeHtml(data.name)},</p>
            <p>We have received your message and will get back to you as soon as possible.</p>
            <p>In the meantime, if you have any questions, please feel free to reach out to us.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>Aymen Real Estate Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send confirmation to user
    await this.sendEmail({
      to: data.email,
      subject: "We received your message - Aymen Real Estate",
      html: confirmationHtml,
      text: `Dear ${data.name},\n\nWe have received your message and will get back to you as soon as possible.\n\nBest regards,\nAymen Real Estate Team`,
    });

    return true;
  }

  /**
   * @openapi
   * Verifies SMTP connection
   * Useful for testing email configuration on startup or health checks
   *
   * @returns {Promise<boolean>} Connection status
   *
   * @example
   * ```typescript
   * // Check SMTP connection on startup
   * const isConnected = await emailService.verifyConnection();
   * if (!isConnected) {
   *   console.error("SMTP configuration error!");
   * }
   *
   * // Health check endpoint
   * app.get('/health/email', async (req, res) => {
   *   const healthy = await emailService.verifyConnection();
   *   res.json({ email: healthy ? 'ok' : 'error' });
   * });
   * ```
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
   * @openapi
   * Escapes HTML special characters
   * Prevents HTML injection in email templates
   *
   * @param {string} text - Text to escape
   * @returns {string} Escaped text safe for HTML
   *
   * @private
   *
   * @example
   * ```typescript
   * // Internal usage only
   * const safe = this.escapeHtml("<script>alert('xss')</script>");
   * // Returns: "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
   * ```
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