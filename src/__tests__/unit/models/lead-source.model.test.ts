/**
 * File: src/__tests__/unit/models/lead-source.model.test.ts
 * Comprehensive tests for LeadSourceModel
 * Tests marketing analytics, campaign tracking, and lead attribution
 */

import LeadSourceModel, {
  LeadType,
  DeviceType,
  CreateLeadSourceDto,
} from "@models/lead-source.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

describe("LeadSourceModel", () => {
  beforeEach(async () => {
    await cleanTables(["lead_sources"]);
  });

  afterAll(async () => {
    await cleanTables(["lead_sources"]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a new lead source with all fields", async () => {
      const data = {
        leadEmail: "john.doe@example.com",
        leadType: LeadType.CONTACT_FORM,
        leadReferenceId: 123,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "summer-2025",
        utmTerm: "real estate",
        utmContent: "ad-variant-a",
        referrerUrl: "https://google.com/search",
        landingPageUrl: "https://example.com/contact",
        sourceIp: "192.168.1.1",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        deviceType: DeviceType.DESKTOP,
        browser: "Chrome",
        operatingSystem: "Windows 10",
      };

      const leadSource = await LeadSourceModel.create(data);

      expect(leadSource).toBeDefined();
      expect(leadSource.id).toBeDefined();
      expect(leadSource.leadEmail).toBe("john.doe@example.com");
      expect(leadSource.leadType).toBe(LeadType.CONTACT_FORM);
      expect(leadSource.leadReferenceId).toBe(123);
      expect(leadSource.utmSource).toBe("google");
      expect(leadSource.utmMedium).toBe("cpc");
      expect(leadSource.utmCampaign).toBe("summer-2025");
      expect(leadSource.utmTerm).toBe("real estate");
      expect(leadSource.utmContent).toBe("ad-variant-a");
      expect(leadSource.deviceType).toBe(DeviceType.DESKTOP);
      expect(leadSource.browser).toBe("Chrome");
    });

    it("should create with minimal required fields", async () => {
      const data = {
        leadEmail: "minimal@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
      };

      const leadSource = await LeadSourceModel.create(data);

      expect(leadSource.leadEmail).toBe("minimal@example.com");
      expect(leadSource.leadType).toBe(LeadType.PROJECT_INQUIRY);
      expect(leadSource.utmSource).toBeNull();
      expect(leadSource.utmMedium).toBeNull();
      expect(leadSource.deviceType).toBeNull();
      expect(leadSource.leadReferenceId).toBeNull();
    });

    it("should create leads for all lead types", async () => {
      const leadTypes = [
        LeadType.CONTACT_FORM,
        LeadType.PROJECT_INQUIRY,
        LeadType.EVENT_REGISTRATION,
        LeadType.APPOINTMENT,
        LeadType.CATALOG_DOWNLOAD,
      ];

      for (const leadType of leadTypes) {
        const lead = await LeadSourceModel.create({
          leadEmail: `${leadType}@example.com`,
          leadType,
          utmCampaign: "test-campaign",
        });

        expect(lead.leadType).toBe(leadType);
      }
    });

    it("should create leads for all device types", async () => {
      const deviceTypes = [
        DeviceType.DESKTOP,
        DeviceType.MOBILE,
        DeviceType.TABLET,
        DeviceType.UNKNOWN,
      ];

      for (const deviceType of deviceTypes) {
        const lead = await LeadSourceModel.create({
          leadEmail: `${deviceType}@example.com`,
          leadType: LeadType.CONTACT_FORM,
          deviceType,
        });

        expect(lead.deviceType).toBe(deviceType);
      }
    });
  });

  describe("findById", () => {
    it("should find lead source by id", async () => {
      const created = await LeadSourceModel.create({
        leadEmail: "find@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmCampaign: "find-test",
      });

      const found = await LeadSourceModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.leadEmail).toBe("find@example.com");
    });

    it("should return null for non-existent id", async () => {
      const found = await LeadSourceModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "user1@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "summer-2025",
        deviceType: DeviceType.DESKTOP,
      });

      await LeadSourceModel.create({
        leadEmail: "user2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        utmSource: "facebook",
        utmMedium: "social",
        utmCampaign: "fall-2025",
        deviceType: DeviceType.MOBILE,
      });

      await LeadSourceModel.create({
        leadEmail: "user3@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmSource: "google",
        utmMedium: "organic",
        utmCampaign: "summer-2025",
        deviceType: DeviceType.DESKTOP,
      });
    });

    it("should return all lead sources", async () => {
      const leads = await LeadSourceModel.findAll();
      expect(leads.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by lead email", async () => {
      const leads = await LeadSourceModel.findAll({
        leadEmail: "user1@example.com",
      });

      expect(leads.length).toBe(1);
      expect(leads[0].leadEmail).toBe("user1@example.com");
    });

    it("should filter by lead type", async () => {
      const leads = await LeadSourceModel.findAll({
        leadType: LeadType.CONTACT_FORM,
      });

      expect(leads.length).toBeGreaterThanOrEqual(2);
      expect(leads.every((l) => l.leadType === LeadType.CONTACT_FORM)).toBe(
        true
      );
    });

    it("should filter by UTM source", async () => {
      const leads = await LeadSourceModel.findAll({
        utmSource: "google",
      });

      expect(leads.length).toBeGreaterThanOrEqual(2);
      expect(leads.every((l) => l.utmSource === "google")).toBe(true);
    });

    it("should filter by UTM medium", async () => {
      const leads = await LeadSourceModel.findAll({
        utmMedium: "cpc",
      });

      expect(leads.length).toBeGreaterThanOrEqual(1);
      expect(leads.every((l) => l.utmMedium === "cpc")).toBe(true);
    });

    it("should filter by UTM campaign", async () => {
      const leads = await LeadSourceModel.findAll({
        utmCampaign: "summer-2025",
      });

      expect(leads.length).toBeGreaterThanOrEqual(2);
      expect(leads.every((l) => l.utmCampaign === "summer-2025")).toBe(true);
    });

    it("should filter by device type", async () => {
      const leads = await LeadSourceModel.findAll({
        deviceType: DeviceType.DESKTOP,
      });

      expect(leads.length).toBeGreaterThanOrEqual(2);
      expect(leads.every((l) => l.deviceType === DeviceType.DESKTOP)).toBe(
        true
      );
    });

    it("should support pagination", async () => {
      const results = await LeadSourceModel.findAll({
        page: 1,
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should support sorting", async () => {
      const results = await LeadSourceModel.findAll({
        sortBy: "lead_email",
        sortOrder: "asc",
      });

      expect(results.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("findByEmail", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "multi@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmCampaign: "campaign-1",
      });

      await LeadSourceModel.create({
        leadEmail: "multi@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        utmCampaign: "campaign-2",
      });

      await LeadSourceModel.create({
        leadEmail: "single@example.com",
        leadType: LeadType.CATALOG_DOWNLOAD,
      });
    });

    it("should find all leads for an email", async () => {
      const leads = await LeadSourceModel.findByEmail("multi@example.com");

      expect(leads.length).toBe(2);
      expect(leads.every((l) => l.leadEmail === "multi@example.com")).toBe(
        true
      );
    });

    it("should return empty array for email with no leads", async () => {
      const leads = await LeadSourceModel.findByEmail("noleads@example.com");
      expect(leads).toHaveLength(0);
    });
  });

  describe("getByCampaign", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "campaign1@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmCampaign: "summer-promo",
      });

      await LeadSourceModel.create({
        leadEmail: "campaign2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        utmCampaign: "summer-promo",
      });

      await LeadSourceModel.create({
        leadEmail: "other@example.com",
        leadType: LeadType.APPOINTMENT,
        utmCampaign: "winter-sale",
      });
    });

    it("should get leads by campaign", async () => {
      const leads = await LeadSourceModel.getByCampaign("summer-promo");

      expect(leads.length).toBe(2);
      expect(leads.every((l) => l.utmCampaign === "summer-promo")).toBe(true);
    });

    it("should return empty array for campaign with no leads", async () => {
      const leads = await LeadSourceModel.getByCampaign("nonexistent");
      expect(leads).toHaveLength(0);
    });
  });

  describe("getBySourceMedium", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "google1@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmSource: "google",
        utmMedium: "cpc",
      });

      await LeadSourceModel.create({
        leadEmail: "google2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        utmSource: "google",
        utmMedium: "cpc",
      });

      await LeadSourceModel.create({
        leadEmail: "facebook@example.com",
        leadType: LeadType.EVENT_REGISTRATION,
        utmSource: "facebook",
        utmMedium: "social",
      });
    });

    it("should get leads by source and medium", async () => {
      const leads = await LeadSourceModel.getBySourceMedium("google", "cpc");

      expect(leads.length).toBe(2);
      expect(leads.every((l) => l.utmSource === "google")).toBe(true);
      expect(leads.every((l) => l.utmMedium === "cpc")).toBe(true);
    });

    it("should return empty array for non-matching source/medium", async () => {
      const leads = await LeadSourceModel.getBySourceMedium("twitter", "post");
      expect(leads).toHaveLength(0);
    });
  });

  describe("getCampaignStatistics", () => {
    beforeEach(async () => {
      // Campaign A - 3 leads, 2 unique
      await LeadSourceModel.create({
        leadEmail: "user1@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmCampaign: "campaign-a",
      });

      await LeadSourceModel.create({
        leadEmail: "user2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        utmCampaign: "campaign-a",
      });

      await LeadSourceModel.create({
        leadEmail: "user1@example.com",
        leadType: LeadType.APPOINTMENT,
        utmCampaign: "campaign-a",
      });

      // Campaign B - 2 leads, 2 unique
      await LeadSourceModel.create({
        leadEmail: "user3@example.com",
        leadType: LeadType.CATALOG_DOWNLOAD,
        utmCampaign: "campaign-b",
      });

      await LeadSourceModel.create({
        leadEmail: "user4@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmCampaign: "campaign-b",
      });

      // Direct traffic (no campaign)
      await LeadSourceModel.create({
        leadEmail: "direct@example.com",
        leadType: LeadType.CONTACT_FORM,
      });
    });

    it("should get campaign statistics", async () => {
      const stats = await LeadSourceModel.getCampaignStatistics();

      expect(stats.length).toBeGreaterThanOrEqual(3);

      const campaignA = stats.find((s) => s.campaign === "campaign-a");
      expect(campaignA).toBeDefined();
      expect(campaignA?.leadCount).toBe(3);
      expect(campaignA?.uniqueLeads).toBe(2);

      const campaignB = stats.find((s) => s.campaign === "campaign-b");
      expect(campaignB).toBeDefined();
      expect(campaignB?.leadCount).toBe(2);
      expect(campaignB?.uniqueLeads).toBe(2);
    });

    it("should include direct traffic", async () => {
      const stats = await LeadSourceModel.getCampaignStatistics();

      const direct = stats.find((s) => s.campaign === "direct");
      expect(direct).toBeDefined();
      expect(direct?.leadCount).toBeGreaterThanOrEqual(1);
    });

    it("should order by lead count descending", async () => {
      const stats = await LeadSourceModel.getCampaignStatistics();

      for (let i = 0; i < stats.length - 1; i++) {
        expect(stats[i].leadCount).toBeGreaterThanOrEqual(
          stats[i + 1].leadCount
        );
      }
    });
  });

  describe("getSourceMediumStatistics", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "google1@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmSource: "google",
        utmMedium: "cpc",
      });

      await LeadSourceModel.create({
        leadEmail: "google2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        utmSource: "google",
        utmMedium: "cpc",
      });

      await LeadSourceModel.create({
        leadEmail: "facebook@example.com",
        leadType: LeadType.EVENT_REGISTRATION,
        utmSource: "facebook",
        utmMedium: "social",
      });

      await LeadSourceModel.create({
        leadEmail: "direct@example.com",
        leadType: LeadType.CATALOG_DOWNLOAD,
      });
    });

    it("should get source/medium statistics", async () => {
      const stats = await LeadSourceModel.getSourceMediumStatistics();

      expect(stats.length).toBeGreaterThanOrEqual(3);

      const googleCpc = stats.find(
        (s) => s.source === "google" && s.medium === "cpc"
      );
      expect(googleCpc).toBeDefined();
      expect(googleCpc?.leadCount).toBe(2);

      const fbSocial = stats.find(
        (s) => s.source === "facebook" && s.medium === "social"
      );
      expect(fbSocial).toBeDefined();
      expect(fbSocial?.leadCount).toBe(1);
    });

    it("should include direct traffic", async () => {
      const stats = await LeadSourceModel.getSourceMediumStatistics();

      const direct = stats.find(
        (s) => s.source === "direct" && s.medium === "none"
      );
      expect(direct).toBeDefined();
    });
  });

  describe("getDeviceStatistics", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "desktop1@example.com",
        leadType: LeadType.CONTACT_FORM,
        deviceType: DeviceType.DESKTOP,
      });

      await LeadSourceModel.create({
        leadEmail: "desktop2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        deviceType: DeviceType.DESKTOP,
      });

      await LeadSourceModel.create({
        leadEmail: "mobile@example.com",
        leadType: LeadType.APPOINTMENT,
        deviceType: DeviceType.MOBILE,
      });

      await LeadSourceModel.create({
        leadEmail: "tablet@example.com",
        leadType: LeadType.CATALOG_DOWNLOAD,
        deviceType: DeviceType.TABLET,
      });

      await LeadSourceModel.create({
        leadEmail: "unknown@example.com",
        leadType: LeadType.CONTACT_FORM,
      });
    });

    it("should get device statistics", async () => {
      const stats = await LeadSourceModel.getDeviceStatistics();

      expect(stats[DeviceType.DESKTOP]).toBe(2);
      expect(stats[DeviceType.MOBILE]).toBe(1);
      expect(stats[DeviceType.TABLET]).toBe(1);
      expect(stats["unknown"]).toBeGreaterThanOrEqual(1);
    });

    it("should handle all device types", async () => {
      const stats = await LeadSourceModel.getDeviceStatistics();

      expect(Object.keys(stats).length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("getLeadTypeStatistics", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "contact1@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      await LeadSourceModel.create({
        leadEmail: "contact2@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      await LeadSourceModel.create({
        leadEmail: "project@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
      });

      await LeadSourceModel.create({
        leadEmail: "event@example.com",
        leadType: LeadType.EVENT_REGISTRATION,
      });

      await LeadSourceModel.create({
        leadEmail: "appointment@example.com",
        leadType: LeadType.APPOINTMENT,
      });
    });

    it("should get lead type statistics", async () => {
      const stats = await LeadSourceModel.getLeadTypeStatistics();

      expect(stats[LeadType.CONTACT_FORM]).toBe(2);
      expect(stats[LeadType.PROJECT_INQUIRY]).toBe(1);
      expect(stats[LeadType.EVENT_REGISTRATION]).toBe(1);
      expect(stats[LeadType.APPOINTMENT]).toBe(1);
    });

    it("should include all created lead types", async () => {
      const stats = await LeadSourceModel.getLeadTypeStatistics();

      expect(Object.keys(stats).length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("getTopReferrers", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "ref1a@example.com",
        leadType: LeadType.CONTACT_FORM,
        referrerUrl: "https://google.com/search",
      });

      await LeadSourceModel.create({
        leadEmail: "ref1b@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        referrerUrl: "https://google.com/search",
      });

      await LeadSourceModel.create({
        leadEmail: "ref1c@example.com",
        leadType: LeadType.APPOINTMENT,
        referrerUrl: "https://google.com/search",
      });

      await LeadSourceModel.create({
        leadEmail: "ref2a@example.com",
        leadType: LeadType.CATALOG_DOWNLOAD,
        referrerUrl: "https://facebook.com",
      });

      await LeadSourceModel.create({
        leadEmail: "ref2b@example.com",
        leadType: LeadType.CONTACT_FORM,
        referrerUrl: "https://facebook.com",
      });

      await LeadSourceModel.create({
        leadEmail: "ref3@example.com",
        leadType: LeadType.EVENT_REGISTRATION,
        referrerUrl: "https://twitter.com",
      });

      await LeadSourceModel.create({
        leadEmail: "direct@example.com",
        leadType: LeadType.CONTACT_FORM,
      });
    });

    it("should get top referrers", async () => {
      const referrers = await LeadSourceModel.getTopReferrers(10);

      expect(referrers.length).toBeGreaterThanOrEqual(3);

      const topReferrer = referrers[0];
      expect(topReferrer.referrer).toBe("https://google.com/search");
      expect(topReferrer.count).toBe(3);
    });

    it("should respect limit parameter", async () => {
      const referrers = await LeadSourceModel.getTopReferrers(2);

      expect(referrers.length).toBeLessThanOrEqual(2);
    });

    it("should order by count descending", async () => {
      const referrers = await LeadSourceModel.getTopReferrers(10);

      for (let i = 0; i < referrers.length - 1; i++) {
        expect(referrers[i].count).toBeGreaterThanOrEqual(
          referrers[i + 1].count
        );
      }
    });

    it("should not include null referrers", async () => {
      const referrers = await LeadSourceModel.getTopReferrers(10);

      expect(referrers.every((r) => r.referrer !== null)).toBe(true);
    });
  });

  describe("getConversionFunnel", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "funnel1@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      await LeadSourceModel.create({
        leadEmail: "funnel2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
      });

      await LeadSourceModel.create({
        leadEmail: "funnel3@example.com",
        leadType: LeadType.APPOINTMENT,
      });

      await LeadSourceModel.create({
        leadEmail: "funnel4@example.com",
        leadType: LeadType.CATALOG_DOWNLOAD,
      });
    });

    it("should get conversion funnel data", async () => {
      const funnel = await LeadSourceModel.getConversionFunnel();

      expect(funnel).toHaveProperty(LeadType.CONTACT_FORM);
      expect(funnel).toHaveProperty(LeadType.PROJECT_INQUIRY);
      expect(funnel).toHaveProperty(LeadType.APPOINTMENT);
      expect(funnel).toHaveProperty(LeadType.CATALOG_DOWNLOAD);

      expect(funnel[LeadType.CONTACT_FORM]).toBeGreaterThanOrEqual(1);
      expect(funnel[LeadType.PROJECT_INQUIRY]).toBeGreaterThanOrEqual(1);
    });
  });

  describe("update", () => {
    it("should update lead source details", async () => {
      const leadSource = await LeadSourceModel.create({
        leadEmail: "update@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      const updated = await LeadSourceModel.update(leadSource.id, {
        deviceType: DeviceType.MOBILE,
        browser: "Safari",
        operatingSystem: "iOS",
      });

      expect(updated?.deviceType).toBe(DeviceType.MOBILE);
      expect(updated?.browser).toBe("Safari");
      expect(updated?.operatingSystem).toBe("iOS");
      expect(updated?.leadEmail).toBe("update@example.com");
    });

    it("should return null for non-existent lead", async () => {
      const updated = await LeadSourceModel.update(999999, {
        deviceType: DeviceType.DESKTOP,
      });

      expect(updated).toBeNull();
    });
  });

  describe("date filtering", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "old@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await LeadSourceModel.create({
        leadEmail: "new@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
      });
    });

    it("should filter by date range", async () => {
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const dateTo = new Date();

      const leads = await LeadSourceModel.findAll({
        dateFrom,
        dateTo,
      });

      expect(leads.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by dateFrom only", async () => {
      const dateFrom = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      const leads = await LeadSourceModel.findAll({ dateFrom });

      expect(leads.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter by dateTo only", async () => {
      const dateTo = new Date();

      const leads = await LeadSourceModel.findAll({ dateTo });

      expect(leads.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("complex filtering", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "complex1@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "summer-2025",
        deviceType: DeviceType.DESKTOP,
      });

      await LeadSourceModel.create({
        leadEmail: "complex2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        utmSource: "google",
        utmMedium: "organic",
        utmCampaign: "summer-2025",
        deviceType: DeviceType.MOBILE,
      });

      await LeadSourceModel.create({
        leadEmail: "complex3@example.com",
        leadType: LeadType.APPOINTMENT,
        utmSource: "facebook",
        utmMedium: "social",
        utmCampaign: "fall-2025",
        deviceType: DeviceType.DESKTOP,
      });
    });

    it("should filter by multiple parameters", async () => {
      const leads = await LeadSourceModel.findAll({
        utmSource: "google",
        utmCampaign: "summer-2025",
        deviceType: DeviceType.DESKTOP,
      });

      expect(leads.length).toBe(1);
      expect(leads[0].leadEmail).toBe("complex1@example.com");
    });

    it("should handle no matches", async () => {
      const leads = await LeadSourceModel.findAll({
        utmSource: "twitter",
        utmCampaign: "nonexistent",
      });

      expect(leads).toHaveLength(0);
    });
  });

  describe("tracking data validation", () => {
    it("should store complete UTM parameters", async () => {
      const lead = await LeadSourceModel.create({
        leadEmail: "utm@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "test-campaign",
        utmTerm: "keyword phrase",
        utmContent: "text-ad-variant-b",
      });

      expect(lead.utmSource).toBe("google");
      expect(lead.utmMedium).toBe("cpc");
      expect(lead.utmCampaign).toBe("test-campaign");
      expect(lead.utmTerm).toBe("keyword phrase");
      expect(lead.utmContent).toBe("text-ad-variant-b");
    });

    it("should store technical tracking data", async () => {
      const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)";
      const lead = await LeadSourceModel.create({
        leadEmail: "tech@example.com",
        leadType: LeadType.CONTACT_FORM,
        sourceIp: "203.0.113.42",
        userAgent,
        referrerUrl: "https://google.com/search",
        landingPageUrl: "https://example.com/landing",
      });

      expect(lead.sourceIp).toBe("203.0.113.42");
      expect(lead.userAgent).toBe(userAgent);
      expect(lead.referrerUrl).toBe("https://google.com/search");
      expect(lead.landingPageUrl).toBe("https://example.com/landing");
    });

    it("should handle null values for optional tracking fields", async () => {
      const lead = await LeadSourceModel.create({
        leadEmail: "notracking@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      expect(lead.utmSource).toBeNull();
      expect(lead.utmMedium).toBeNull();
      expect(lead.utmCampaign).toBeNull();
      expect(lead.utmTerm).toBeNull();
      expect(lead.utmContent).toBeNull();
      expect(lead.referrerUrl).toBeNull();
      expect(lead.landingPageUrl).toBeNull();
      expect(lead.sourceIp).toBeNull();
      expect(lead.userAgent).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid lead type", async () => {
      const data = {
        leadEmail: "invalid@example.com",
        leadType: "invalid_type" as LeadType,
      };

      await expect(LeadSourceModel.create(data)).rejects.toThrow();
    });

    it("should throw error for invalid email format", async () => {
      const data = {
        leadEmail: "invalid-email",
        leadType: LeadType.CONTACT_FORM,
      };

      await expect(LeadSourceModel.create(data)).rejects.toThrow();
    });

    it("should throw error for missing required fields", async () => {
      const data = {
        utmSource: "google",
      } as CreateLeadSourceDto;

      await expect(LeadSourceModel.create(data)).rejects.toThrow();
    });
  });

  describe("data consistency", () => {
    it("should maintain createdAt and updatedAt timestamps", async () => {
      const lead = await LeadSourceModel.create({
        leadEmail: "timestamp@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      expect(lead.createdAt).toBeInstanceOf(Date);
      expect(lead.updatedAt).toBeInstanceOf(Date);
      expect(lead.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(lead.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updated = await LeadSourceModel.update(lead.id, {
        deviceType: DeviceType.MOBILE,
      });

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        lead.updatedAt.getTime()
      );
    });

    it("should maintain consistent data after update", async () => {
      const lead = await LeadSourceModel.create({
        leadEmail: "consistent@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmSource: "google",
        utmMedium: "cpc",
      });

      const updated = await LeadSourceModel.update(lead.id, {
        leadEmail: "updated@example.com",
        deviceType: DeviceType.MOBILE,
      });

      expect(updated?.leadEmail).toBe("updated@example.com");
      expect(updated?.leadType).toBe(LeadType.CONTACT_FORM);
      expect(updated?.utmSource).toBe("google");
      expect(updated?.utmMedium).toBe("cpc");
      expect(updated?.deviceType).toBe(DeviceType.MOBILE);
    });
  });

  describe("concurrent operations", () => {
    it("should handle concurrent creates", async () => {
      const createPromises = Array(5)
        .fill(null)
        .map((_, i) =>
          LeadSourceModel.create({
            leadEmail: `concurrent${i}@example.com`,
            leadType: LeadType.CONTACT_FORM,
            utmCampaign: "concurrent-test",
          })
        );

      const results = await Promise.all(createPromises);

      expect(results.length).toBe(5);
      expect(results.every((lead) => lead.id !== undefined)).toBe(true);
      expect(new Set(results.map((lead) => lead.leadEmail)).size).toBe(5);
    });

    it("should handle concurrent updates", async () => {
      const lead = await LeadSourceModel.create({
        leadEmail: "concurrent-update@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      const updatePromises = Array(3)
        .fill(null)
        .map((_, i) =>
          LeadSourceModel.update(lead.id, {
            deviceType: [
              DeviceType.DESKTOP,
              DeviceType.MOBILE,
              DeviceType.TABLET,
            ][i],
          })
        );

      const results = await Promise.all(updatePromises);

      // Only one update should succeed, others may return null or the same updated record
      expect(results.some((r) => r !== null)).toBe(true);
      const successfulUpdate = results.find((r) => r !== null);
      expect(successfulUpdate?.id).toBe(lead.id);
    });
  });

  describe("edge cases", () => {
    it("should handle long URLs", async () => {
      const longUrl = "https://example.com/" + "a".repeat(450);
      const lead = await LeadSourceModel.create({
        leadEmail: "longurl@example.com",
        leadType: LeadType.CONTACT_FORM,
        referrerUrl: longUrl,
        landingPageUrl: longUrl,
      });

      expect(lead.referrerUrl).toBe(longUrl);
      expect(lead.landingPageUrl).toBe(longUrl);
    });

    it("should handle special characters in email", async () => {
      const lead = await LeadSourceModel.create({
        leadEmail: "test+special@domain.com",
        leadType: LeadType.CONTACT_FORM,
      });

      expect(lead.leadEmail).toBe("test+special@domain.com");
    });

    it("should handle empty strings for nullable fields", async () => {
      const lead = await LeadSourceModel.create({
        leadEmail: "empty@example.com",
        leadType: LeadType.CONTACT_FORM,
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
      });

      expect(lead.utmSource).toBeNull();
      expect(lead.utmMedium).toBeNull();
      expect(lead.utmCampaign).toBeNull();
    });
  });

  describe("statistics edge cases", () => {
    it("should handle empty database for statistics", async () => {
      await cleanTables(["lead_sources"]);

      const campaignStats = await LeadSourceModel.getCampaignStatistics();
      expect(campaignStats).toHaveLength(0);

      const sourceMediumStats =
        await LeadSourceModel.getSourceMediumStatistics();
      expect(sourceMediumStats).toHaveLength(0);

      const deviceStats = await LeadSourceModel.getDeviceStatistics();
      expect(Object.keys(deviceStats)).toHaveLength(0);

      const leadTypeStats = await LeadSourceModel.getLeadTypeStatistics();
      expect(Object.keys(leadTypeStats)).toHaveLength(0);

      const referrers = await LeadSourceModel.getTopReferrers(10);
      expect(referrers).toHaveLength(0);

      const funnel = await LeadSourceModel.getConversionFunnel();
      expect(Object.keys(funnel)).toHaveLength(0);
    });

    it("should handle null campaign values in statistics", async () => {
      await LeadSourceModel.create({
        leadEmail: "nocampaign@example.com",
        leadType: LeadType.CONTACT_FORM,
      });

      const stats = await LeadSourceModel.getCampaignStatistics();
      const direct = stats.find((s) => s.campaign === "direct");
      expect(direct).toBeDefined();
      expect(direct?.leadCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("chart generation", () => {
    beforeEach(async () => {
      await LeadSourceModel.create({
        leadEmail: "desktop1@example.com",
        leadType: LeadType.CONTACT_FORM,
        deviceType: DeviceType.DESKTOP,
      });

      await LeadSourceModel.create({
        leadEmail: "desktop2@example.com",
        leadType: LeadType.PROJECT_INQUIRY,
        deviceType: DeviceType.DESKTOP,
      });

      await LeadSourceModel.create({
        leadEmail: "mobile@example.com",
        leadType: LeadType.APPOINTMENT,
        deviceType: DeviceType.MOBILE,
      });

      await LeadSourceModel.create({
        leadEmail: "tablet@example.com",
        leadType: LeadType.CATALOG_DOWNLOAD,
        deviceType: DeviceType.TABLET,
      });
    });

    it("should generate device type distribution chart", async () => {
      const stats = await LeadSourceModel.getDeviceStatistics();

      const chart = {
        type: "pie",
        data: {
          labels: Object.keys(stats),
          datasets: [
            {
              data: Object.values(stats),
              backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0"],
            },
          ],
        },
        options: {
          plugins: {
            title: {
              display: true,
              text: "Lead Distribution by Device Type",
            },
            legend: {
              position: "bottom",
            },
          },
        },
      };

      expect(chart.data.labels).toContain(DeviceType.DESKTOP);
      expect(chart.data.labels).toContain(DeviceType.MOBILE);
      expect(chart.data.labels).toContain(DeviceType.TABLET);
      expect(chart.data.datasets[0].data).toContain(2); // Desktop
      expect(chart.data.datasets[0].data).toContain(1); // Mobile
      expect(chart.data.datasets[0].data).toContain(1); // Tablet
    });
  });
});

export default describe;
