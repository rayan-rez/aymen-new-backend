/**
 * Marketing Consent Model
 * Represents GDPR-compliant marketing consent management
 * Manages user preferences for marketing communications
 *
 * @module models/marketing-consent.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Marketing consent entity interface
 * Represents user marketing consent preferences
 */
export interface MarketingConsent {
  /** Unique identifier */
  id: number;

  /** Email address */
  email: string;

  /** Email marketing consent */
  emailMarketingConsent: boolean;

  /** SMS marketing consent */
  smsMarketingConsent: boolean;

  /** Phone marketing consent */
  phoneMarketingConsent: boolean;

  /** Consent given timestamp */
  consentGivenAt: Date | null;

  /** Consent revoked timestamp */
  consentRevokedAt: Date | null;

  /** Consent source (form/page where given) */
  consentSource: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create marketing consent DTO
 */
export interface CreateMarketingConsentDto {
  email: string;
  emailMarketingConsent?: boolean;
  smsMarketingConsent?: boolean;
  phoneMarketingConsent?: boolean;
  consentSource?: string | null;
}

/**
 * Update marketing consent DTO
 */
export interface UpdateMarketingConsentDto {
  email?: string;
  emailMarketingConsent?: boolean;
  smsMarketingConsent?: boolean;
  phoneMarketingConsent?: boolean;
  consentSource?: string | null;
}

/**
 * Marketing consent query parameters
 */
export interface MarketingConsentQueryParams extends BaseQueryParams {
  email?: string;
  hasEmailConsent?: boolean;
  hasSmsConsent?: boolean;
  hasPhoneConsent?: boolean;
  hasAnyConsent?: boolean;
  isRevoked?: boolean;
}

/**
 * Marketing Consent Model class
 * Handles all database operations for marketing consents
 */
class MarketingConsentModel extends BaseModel<
  MarketingConsent,
  CreateMarketingConsentDto,
  UpdateMarketingConsentDto
> {
  protected tableName = "marketing_consents";

  /**
   * Finds all marketing consents matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<MarketingConsent[]> - Array of consents
   *
   * @example
   * const consents = await MarketingConsentModel.findAll({
   *   hasEmailConsent: true,
   *   isRevoked: false
   * });
   */
  async findAll(
    params: MarketingConsentQueryParams = {}
  ): Promise<MarketingConsent[]> {
    let query = this.db(this.tableName);

    if (params.email) {
      query = query.where({ email: params.email });
    }

    if (params.hasEmailConsent !== undefined) {
      query = query.where({
        email_marketing_consent: params.hasEmailConsent,
      });
    }

    if (params.hasSmsConsent !== undefined) {
      query = query.where({ sms_marketing_consent: params.hasSmsConsent });
    }

    if (params.hasPhoneConsent !== undefined) {
      query = query.where({
        phone_marketing_consent: params.hasPhoneConsent,
      });
    }

    if (params.hasAnyConsent) {
      query = query.where((builder) => {
        builder
          .where({ email_marketing_consent: true })
          .orWhere({ sms_marketing_consent: true })
          .orWhere({ phone_marketing_consent: true });
      });
    }

    if (params.isRevoked !== undefined) {
      if (params.isRevoked) {
        query = query.whereNotNull("consent_revoked_at");
      } else {
        query = query.whereNull("consent_revoked_at");
      }
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "desc");
    } else {
      query = query.orderBy("created_at", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const consents = await query;
    return consents.map(this.mapToEntity);
  }

  /**
   * Finds consent by email
   *
   * @param email - Email address
   * @returns Promise<MarketingConsent | null> - Consent record or null
   *
   * @example
   * const consent = await MarketingConsentModel.findByEmail("john@example.com");
   */
  async findByEmail(email: string): Promise<MarketingConsent | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Creates or updates consent for an email
   *
   * @param email - Email address
   * @param consents - Consent preferences
   * @param source - Consent source
   * @returns Promise<MarketingConsent> - Created/updated consent
   *
   * @example
   * const consent = await MarketingConsentModel.upsertConsent(
   *   "john@example.com",
   *   { email: true, sms: false, phone: true },
   *   "contact-form"
   * );
   */
  async upsertConsent(
    email: string,
    consents: {
      email?: boolean;
      sms?: boolean;
      phone?: boolean;
    },
    source?: string
  ): Promise<MarketingConsent> {
    const normalizedEmail = email.toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);

    const data = {
      email: normalizedEmail,
      emailMarketingConsent: consents.email ?? false,
      smsMarketingConsent: consents.sms ?? false,
      phoneMarketingConsent: consents.phone ?? false,
      consentSource: source || null,
    };

    if (existing) {
      const hasAnyConsent =
        data.emailMarketingConsent ||
        data.smsMarketingConsent ||
        data.phoneMarketingConsent;

      await this.db(this.tableName)
        .where({ email: normalizedEmail })
        .update({
          email_marketing_consent: data.emailMarketingConsent,
          sms_marketing_consent: data.smsMarketingConsent,
          phone_marketing_consent: data.phoneMarketingConsent,
          consent_source: data.consentSource,
          consent_given_at: hasAnyConsent
            ? this.db.fn.now()
            : existing.consentGivenAt,
          consent_revoked_at: hasAnyConsent ? null : this.db.fn.now(),
          updated_at: this.db.fn.now(),
        });

      return (await this.findByEmail(normalizedEmail))!;
    } else {
      return this.create(data);
    }
  }

  /**
   * Grants all marketing consents
   *
   * @param email - Email address
   * @param source - Consent source
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await MarketingConsentModel.grantAllConsents("john@example.com", "newsletter-signup");
   */
  async grantAllConsents(email: string, source?: string): Promise<boolean> {
    await this.upsertConsent(
      email,
      { email: true, sms: true, phone: true },
      source
    );
    return true;
  }

  /**
   * Revokes all marketing consents
   *
   * @param email - Email address
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await MarketingConsentModel.revokeAllConsents("john@example.com");
   */
  async revokeAllConsents(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);

    if (!existing) return false;

    const updated = await this.db(this.tableName)
      .where({ email: normalizedEmail })
      .update({
        email_marketing_consent: false,
        sms_marketing_consent: false,
        phone_marketing_consent: false,
        consent_revoked_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Updates email consent only
   *
   * @param email - Email address
   * @param consent - Email consent status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await MarketingConsentModel.updateEmailConsent("john@example.com", true);
   */
  async updateEmailConsent(email: string, consent: boolean): Promise<boolean> {
    await this.upsertConsent(email, { email: consent });
    return true;
  }

  /**
   * Updates SMS consent only
   *
   * @param email - Email address
   * @param consent - SMS consent status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await MarketingConsentModel.updateSmsConsent("john@example.com", false);
   */
  async updateSmsConsent(email: string, consent: boolean): Promise<boolean> {
    await this.upsertConsent(email, { sms: consent });
    return true;
  }

  /**
   * Updates phone consent only
   *
   * @param email - Email address
   * @param consent - Phone consent status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await MarketingConsentModel.updatePhoneConsent("john@example.com", true);
   */
  async updatePhoneConsent(email: string, consent: boolean): Promise<boolean> {
    await this.upsertConsent(email, { phone: consent });
    return true;
  }

  /**
   * Gets all emails with email marketing consent
   *
   * @returns Promise<string[]> - Array of email addresses
   *
   * @example
   * const emailList = await MarketingConsentModel.getEmailMarketingList();
   */
  async getEmailMarketingList(): Promise<string[]> {
    const results = await this.db(this.tableName)
      .where({ email_marketing_consent: true })
      .whereNull("consent_revoked_at")
      .select("email");

    return results.map((row: any) => row.email);
  }

  /**
   * Gets all emails with SMS marketing consent
   *
   * @returns Promise<string[]> - Array of email addresses
   *
   * @example
   * const smsList = await MarketingConsentModel.getSmsMarketingList();
   */
  async getSmsMarketingList(): Promise<string[]> {
    const results = await this.db(this.tableName)
      .where({ sms_marketing_consent: true })
      .whereNull("consent_revoked_at")
      .select("email");

    return results.map((row: any) => row.email);
  }

  /**
   * Gets all emails with phone marketing consent
   *
   * @returns Promise<string[]> - Array of email addresses
   *
   * @example
   * const phoneList = await MarketingConsentModel.getPhoneMarketingList();
   */
  async getPhoneMarketingList(): Promise<string[]> {
    const results = await this.db(this.tableName)
      .where({ phone_marketing_consent: true })
      .whereNull("consent_revoked_at")
      .select("email");

    return results.map((row: any) => row.email);
  }

  /**
   * Gets consent statistics
   *
   * @returns Promise<any> - Consent statistics
   *
   * @example
   * const stats = await MarketingConsentModel.getConsentStatistics();
   */
  async getConsentStatistics(): Promise<any> {
    const [total, email, sms, phone, revoked] = await Promise.all([
      this.db(this.tableName).count("* as count").first(),

      this.db(this.tableName)
        .where({ email_marketing_consent: true })
        .whereNull("consent_revoked_at")
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .where({ sms_marketing_consent: true })
        .whereNull("consent_revoked_at")
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .where({ phone_marketing_consent: true })
        .whereNull("consent_revoked_at")
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .whereNotNull("consent_revoked_at")
        .count("* as count")
        .first(),
    ]);

    return {
      total: Number(total?.count || 0),
      emailConsents: Number(email?.count || 0),
      smsConsents: Number(sms?.count || 0),
      phoneConsents: Number(phone?.count || 0),
      revoked: Number(revoked?.count || 0),
    };
  }

  /**
   * Checks if user has any active consent
   *
   * @param email - Email address
   * @returns Promise<boolean> - Whether user has any consent
   *
   * @example
   * const hasConsent = await MarketingConsentModel.hasAnyConsent("john@example.com");
   */
  async hasAnyConsent(email: string): Promise<boolean> {
    const consent = await this.findByEmail(email);
    if (!consent || consent.consentRevokedAt) return false;

    return (
      consent.emailMarketingConsent ||
      consent.smsMarketingConsent ||
      consent.phoneMarketingConsent
    );
  }

  /**
   * Maps database record to MarketingConsent entity
   *
   * @param record - Database record
   * @returns MarketingConsent entity
   *
   * @protected
   */
  protected mapToEntity(record: any): MarketingConsent {
    return {
      id: record.id,
      email: record.email,
      emailMarketingConsent: Boolean(record.email_marketing_consent),
      smsMarketingConsent: Boolean(record.sms_marketing_consent),
      phoneMarketingConsent: Boolean(record.phone_marketing_consent),
      consentGivenAt: record.consent_given_at
        ? new Date(record.consent_given_at)
        : null,
      consentRevokedAt: record.consent_revoked_at
        ? new Date(record.consent_revoked_at)
        : null,
      consentSource: record.consent_source,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new MarketingConsentModel();
