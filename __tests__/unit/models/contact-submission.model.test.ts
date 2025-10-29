/**
 * File: src/__tests__/unit/models/contact-submission.model.test.ts
 * Comprehensive tests for ContactSubmissionModel
 * Tests general contact form submissions and lead management
 */

import ContactSubmissionModel, {
  ContactSubmissionStatus,
} from "@models/contact-submission.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

describe("ContactSubmissionModel", () => {
  beforeEach(async () => {
    await cleanTables(["contact_submissions"]);
  });

  afterAll(async () => {
    await cleanTables(["contact_submissions"]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a new contact submission", async () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+1234567890",
        subject: "General Inquiry",
        message: "I'm interested in your properties",
      };

      const submission = await ContactSubmissionModel.create(data);

      expect(submission).toBeDefined();
      expect(submission.id).toBeDefined();
      expect(submission.firstName).toBe(data.firstName);
      expect(submission.email).toBe(data.email);
      expect(submission.status).toBe(ContactSubmissionStatus.NEW);
    });

    it("should create with optional tracking fields", async () => {
      const data = {
        email: "tracked@example.com",
        message: "Test message",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "summer-2025",
        sourcePage: "/contact",
        referrer: "https://google.com",
      };

      const submission = await ContactSubmissionModel.create(data);

      expect(submission.utmSource).toBe("google");
      expect(submission.utmCampaign).toBe("summer-2025");
      expect(submission.sourcePage).toBe("/contact");
    });

    it("should create with minimal required fields", async () => {
      const data = {
        email: "minimal@example.com",
        message: "Quick question",
      };

      const submission = await ContactSubmissionModel.create(data);

      expect(submission.email).toBe(data.email);
      expect(submission.firstName).toBeNull();
      expect(submission.lastName).toBeNull();
    });
  });

  describe("findById", () => {
    it("should find submission by id", async () => {
      const created = await ContactSubmissionModel.create({
        email: "find@example.com",
        message: "Find me",
      });

      const found = await ContactSubmissionModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe("find@example.com");
    });

    it("should return null for non-existent id", async () => {
      const found = await ContactSubmissionModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      await ContactSubmissionModel.create({
        email: "sub1@example.com",
        message: "Message 1",
      });
      const sub2 = await ContactSubmissionModel.create({
        email: "sub2@example.com",
        message: "Message 2",
      });
      // Update status separately
      await ContactSubmissionModel.updateStatus(
        sub2.id,
        ContactSubmissionStatus.CONTACTED
      );
      await ContactSubmissionModel.create({
        email: "sub3@example.com",
        message: "Message 3",
      });
    });

    it("should return all submissions", async () => {
      const results = await ContactSubmissionModel.findAll();
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by status", async () => {
      const newSubmissions = await ContactSubmissionModel.findAll({
        status: ContactSubmissionStatus.NEW,
      });

      expect(newSubmissions.length).toBeGreaterThanOrEqual(2);
      expect(
        newSubmissions.every((s) => s.status === ContactSubmissionStatus.NEW)
      ).toBe(true);
    });

    it("should filter by email", async () => {
      const results = await ContactSubmissionModel.findAll({
        email: "sub1@example.com",
      });

      expect(results).toHaveLength(1);
      expect(results[0].email).toBe("sub1@example.com");
    });

    it("should support pagination", async () => {
      const results = await ContactSubmissionModel.findAll({
        page: 1,
        limit: 2,
      });

      expect(results).toHaveLength(2);
    });

    it("should filter by UTM parameters", async () => {
      await ContactSubmissionModel.create({
        email: "utm@example.com",
        message: "UTM test",
        utmSource: "facebook",
        utmCampaign: "spring-2025",
      });

      const results = await ContactSubmissionModel.findAll({
        utmSource: "facebook",
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter by date range", async () => {
      const dateFrom = new Date("2025-10-01");
      const dateTo = new Date("2025-10-31");

      const results = await ContactSubmissionModel.findAll({
        dateFrom,
        dateTo,
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("getNew", () => {
    beforeEach(async () => {
      await ContactSubmissionModel.create({
        email: "new1@example.com",
        message: "New 1",
      });
      await ContactSubmissionModel.create({
        email: "new2@example.com",
        message: "New 2",
      });
      const contacted = await ContactSubmissionModel.create({
        email: "contacted@example.com",
        message: "Contacted",
      });
      // Update status separately
      await ContactSubmissionModel.updateStatus(
        contacted.id,
        ContactSubmissionStatus.CONTACTED
      );
    });

    it("should return only new submissions", async () => {
      const newSubs = await ContactSubmissionModel.getNew();

      expect(newSubs.length).toBeGreaterThanOrEqual(2);
      expect(
        newSubs.every((s) => s.status === ContactSubmissionStatus.NEW)
      ).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const newSubs = await ContactSubmissionModel.getNew(1);

      expect(newSubs.length).toBeLessThanOrEqual(1);
    });
  });

  describe("updateStatus", () => {
    it("should update submission status", async () => {
      const created = await ContactSubmissionModel.create({
        email: "status@example.com",
        message: "Status test",
      });

      const updated = await ContactSubmissionModel.updateStatus(
        created.id,
        ContactSubmissionStatus.QUALIFIED
      );

      expect(updated).toBe(true);

      const found = await ContactSubmissionModel.findById(created.id);
      expect(found?.status).toBe(ContactSubmissionStatus.QUALIFIED);
    });

    it("should update status with notes", async () => {
      const created = await ContactSubmissionModel.create({
        email: "notes@example.com",
        message: "Notes test",
      });

      const updated = await ContactSubmissionModel.updateStatus(
        created.id,
        ContactSubmissionStatus.CONTACTED,
        "Called and left voicemail"
      );

      expect(updated).toBe(true);

      const found = await ContactSubmissionModel.findById(created.id);
      expect(found?.internalNotes).toBe("Called and left voicemail");
    });

    it("should return false for non-existent submission", async () => {
      const updated = await ContactSubmissionModel.updateStatus(
        999999,
        ContactSubmissionStatus.CONTACTED
      );

      expect(updated).toBe(false);
    });
  });

  describe("addNotes", () => {
    it("should add notes to existing submission", async () => {
      const created = await ContactSubmissionModel.create({
        email: "notes@example.com",
        message: "Notes test",
      });

      // Add initial note separately
      await ContactSubmissionModel.addNotes(created.id, "Initial note");

      const added = await ContactSubmissionModel.addNotes(
        created.id,
        "Follow-up note"
      );

      expect(added).toBe(true);

      const found = await ContactSubmissionModel.findById(created.id);
      expect(found?.internalNotes).toContain("Initial note");
      expect(found?.internalNotes).toContain("Follow-up note");
      expect(found?.internalNotes).toContain("[");
    });

    it("should handle first note", async () => {
      const created = await ContactSubmissionModel.create({
        email: "first-note@example.com",
        message: "First note test",
      });

      await ContactSubmissionModel.addNotes(created.id, "First note");

      const found = await ContactSubmissionModel.findById(created.id);
      expect(found?.internalNotes).toContain("First note");
    });

    it("should return false for non-existent submission", async () => {
      const added = await ContactSubmissionModel.addNotes(999999, "Note");
      expect(added).toBe(false);
    });
  });

  describe("findByEmail", () => {
    beforeEach(async () => {
      await ContactSubmissionModel.create({
        email: "repeat@example.com",
        message: "First submission",
      });
      await ContactSubmissionModel.create({
        email: "repeat@example.com",
        message: "Second submission",
      });
      await ContactSubmissionModel.create({
        email: "other@example.com",
        message: "Other submission",
      });
    });

    it("should find all submissions by email", async () => {
      const results = await ContactSubmissionModel.findByEmail(
        "repeat@example.com"
      );

      expect(results).toHaveLength(2);
      expect(results.every((s) => s.email === "repeat@example.com")).toBe(true);
    });

    it("should return empty array for no matches", async () => {
      const results = await ContactSubmissionModel.findByEmail(
        "nonexistent@example.com"
      );

      expect(results).toHaveLength(0);
    });
  });

  describe("findByCampaign", () => {
    beforeEach(async () => {
      await ContactSubmissionModel.create({
        email: "camp1@example.com",
        message: "Campaign 1",
        utmCampaign: "summer-2025",
      });
      await ContactSubmissionModel.create({
        email: "camp2@example.com",
        message: "Campaign 2",
        utmCampaign: "summer-2025",
      });
      await ContactSubmissionModel.create({
        email: "camp3@example.com",
        message: "Campaign 3",
        utmCampaign: "winter-2025",
      });
    });

    it("should find submissions by campaign", async () => {
      const results = await ContactSubmissionModel.findByCampaign(
        "summer-2025"
      );

      expect(results).toHaveLength(2);
      expect(results.every((s) => s.utmCampaign === "summer-2025")).toBe(true);
    });
  });

  describe("getStatusStatistics", () => {
    beforeEach(async () => {
      await ContactSubmissionModel.create({
        email: "stat1@example.com",
        message: "Stat 1",
      });
      await ContactSubmissionModel.create({
        email: "stat2@example.com",
        message: "Stat 2",
      });
      const stat3 = await ContactSubmissionModel.create({
        email: "stat3@example.com",
        message: "Stat 3",
      });
      // Update status separately
      await ContactSubmissionModel.updateStatus(
        stat3.id,
        ContactSubmissionStatus.CONTACTED
      );
    });

    it("should return status statistics", async () => {
      const stats = await ContactSubmissionModel.getStatusStatistics();

      expect(stats.new).toBeGreaterThanOrEqual(2);
      expect(stats.contacted).toBeGreaterThanOrEqual(1);
    });

    it("should return empty object when no submissions", async () => {
      await cleanTables(["contact_submissions"]);

      const stats = await ContactSubmissionModel.getStatusStatistics();
      expect(stats).toEqual({});
    });
  });

  describe("update", () => {
    it("should update submission fields", async () => {
      const created = await ContactSubmissionModel.create({
        email: "update@example.com",
        message: "Original message",
      });

      const updated = await ContactSubmissionModel.update(created.id, {
        firstName: "Updated",
        lastName: "User",
        status: ContactSubmissionStatus.QUALIFIED,
      });

      expect(updated?.firstName).toBe("Updated");
      expect(updated?.lastName).toBe("User");
      expect(updated?.status).toBe(ContactSubmissionStatus.QUALIFIED);
    });

    it("should return null for non-existent submission", async () => {
      const updated = await ContactSubmissionModel.update(999999, {
        firstName: "Non-existent",
      });

      expect(updated).toBeNull();
    });
  });
});
