/**
 * Email Service
 * Handles all email sending operations using Nodemailer
 * Supports various email templates and scenarios
 */

import nodemailer, { Transporter } from "nodemailer";

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
 * Email Service class
 * Manages email operations with Nodemailer
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
   * Initializes the Email Service
   * Sets up Nodemailer transporter with SMTP configuration
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