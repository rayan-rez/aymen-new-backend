/**
 * File: src/__tests__/unit/models/catalog-download-request.model.test.ts
 * Comprehensive tests for CatalogDownloadRequestModel
 * Covers CRUD operations and custom methods
 */

import CatalogDownloadRequestModel from "@models/catalog-download-request.model";
import db from "@/config/database";

describe("CatalogDownloadRequestModel", () => {
  beforeEach(async () => {
    // Clean up the table
    await db("catalog_download_requests").del(); // Assuming table name based on migration patterns

    // Small delay to ensure cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await db("catalog_download_requests").del();
    await db.destroy();
  });

  describe("create", () => {
    it("should create a new catalog download request", async () => {
      const requestData = {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        marketingConsent: true,
      };

      const request = await CatalogDownloadRequestModel.create(requestData);

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.fullName).toBe(requestData.fullName);
      expect(request.email).toBe(requestData.email);
      expect(request.phone).toBe(requestData.phone);
      expect(request.marketingConsent).toBe(true);
      expect(request.downloadedAt).toBeNull(); // Default
    });

    it("should create with optional fields", async () => {
      const requestData = {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: "+0987654321",
        catalogType: "Brochure",
        projectId: 1,
        downloadIp: "192.168.1.1",
      };

      const request = await CatalogDownloadRequestModel.create(requestData);

      expect(request.catalogType).toBe(requestData.catalogType);
      expect(request.projectId).toBe(requestData.projectId);
      expect(request.downloadIp).toBe(requestData.downloadIp);
    });
  });

  describe("findById", () => {
    it("should find catalog download request by id", async () => {
      const created = await CatalogDownloadRequestModel.create({
        fullName: "Find By ID",
        email: "find@example.com",
        phone: "+1112223334",
      });

      const found = await CatalogDownloadRequestModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.fullName).toBe(created.fullName);
    });

    it("should return null for non-existent id", async () => {
      const found = await CatalogDownloadRequestModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      // Create multiple requests for testing
      await CatalogDownloadRequestModel.create({
        fullName: "Req1",
        email: "req1@example.com",
        phone: "+1",
        catalogType: "TypeA",
      });
      await CatalogDownloadRequestModel.create({
        fullName: "Req2",
        email: "req2@example.com",
        phone: "+2",
        catalogType: "TypeB",
      });
      await CatalogDownloadRequestModel.create({
        fullName: "Req3",
        email: "req3@example.com",
        phone: "+3",
        catalogType: "TypeA",
      });
    });

    it("should return all requests with pagination", async () => {
      const results = await CatalogDownloadRequestModel.findAll({
        page: 1,
        limit: 2,
      });
      expect(results).toHaveLength(2);
    });

    it("should filter by catalogType", async () => {
      const typeA = await CatalogDownloadRequestModel.findAll({
        catalogType: "TypeA",
      });
      expect(typeA).toHaveLength(2);
      expect(typeA[0].catalogType).toBe("TypeA");
    });

    it("should filter by email", async () => {
      const byEmail = await CatalogDownloadRequestModel.findAll({
        email: "req1@example.com",
      });
      expect(byEmail).toHaveLength(1);
    });

    it("should filter by hasDownloaded", async () => {
      const created = await CatalogDownloadRequestModel.create({
        fullName: "Downloaded",
        email: "downloaded@example.com",
        phone: "+downloaded",
      });
      await CatalogDownloadRequestModel.markAsDownloaded(
        created.id,
        "127.0.0.1"
      );

      const downloaded = await CatalogDownloadRequestModel.findAll({
        hasDownloaded: true,
      });
      expect(downloaded.length).toBeGreaterThan(0);
      expect(downloaded[0].downloadedAt).not.toBeNull();
    });

    it("should filter by date range", async () => {
      const dateFrom = new Date("2025-10-01");
      const dateTo = new Date("2025-10-31");
      const results = await CatalogDownloadRequestModel.findAll({
        dateFrom,
        dateTo,
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty array for no matches", async () => {
      const results = await CatalogDownloadRequestModel.findAll({
        catalogType: "Nonexistent",
      });
      expect(results).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update catalog download request fields", async () => {
      const created = await CatalogDownloadRequestModel.create({
        fullName: "Original",
        email: "original@example.com",
        phone: "+original",
      });

      const updateData = {
        fullName: "Updated",
        catalogType: "Updated Type",
        marketingConsent: false,
      };

      const updated = await CatalogDownloadRequestModel.update(
        created.id,
        updateData
      );

      expect(updated).toBeDefined();
      expect(updated?.fullName).toBe(updateData.fullName);
      expect(updated?.catalogType).toBe(updateData.catalogType);
      expect(updated?.marketingConsent).toBe(false);
    });

    it("should return null when updating non-existent request", async () => {
      const updated = await CatalogDownloadRequestModel.update(999999, {
        fullName: "Non-existent",
      });
      expect(updated).toBeNull();
    });
  });

  describe("markAsDownloaded", () => {
    it("should mark request as downloaded and set IP", async () => {
      const created = await CatalogDownloadRequestModel.create({
        fullName: "To Download",
        email: "download@example.com",
        phone: "+download",
      });

      const marked = await CatalogDownloadRequestModel.markAsDownloaded(
        created.id,
        "192.168.0.1"
      );
      expect(marked).toBe(true);

      const found = await CatalogDownloadRequestModel.findById(created.id);
      expect(found?.downloadedAt).not.toBeNull();
      expect(found?.downloadIp).toBe("192.168.0.1");
    });

    it("should return false for non-existent request", async () => {
      const marked = await CatalogDownloadRequestModel.markAsDownloaded(
        999999,
        "127.0.0.1"
      );
      expect(marked).toBe(false);
    });
  });

  describe("getDownloadStatistics", () => {
    beforeEach(async () => {
      const req1 = await CatalogDownloadRequestModel.create({
        fullName: "Stat1",
        email: "stat1@example.com",
        phone: "+1",
        catalogType: "TypeA",
      });
      await CatalogDownloadRequestModel.markAsDownloaded(req1.id, "ip1");

      await CatalogDownloadRequestModel.create({
        fullName: "Stat2",
        email: "stat2@example.com",
        phone: "+2",
        catalogType: "TypeB",
      }); // Not downloaded

      const req3 = await CatalogDownloadRequestModel.create({
        fullName: "Stat3",
        email: "stat3@example.com",
        phone: "+3",
        catalogType: "TypeA",
      });
      await CatalogDownloadRequestModel.markAsDownloaded(req3.id, "ip3");
    });

    it("should return download statistics", async () => {
      const stats = await CatalogDownloadRequestModel.getDownloadStatistics();
      expect(stats.totalRequests).toBe(3);
      expect(stats.downloaded).toBe(2);
      expect(stats.byType.TypeA).toBe(2);
      expect(stats.byType.TypeB).toBe(1);
    });

    it("should handle no requests", async () => {
      await db("catalog_download_requests").del();
      const stats = await CatalogDownloadRequestModel.getDownloadStatistics();
      expect(stats.totalRequests).toBe(0);
      expect(stats.downloaded).toBe(0);
      expect(stats.byType).toEqual({});
    });
  });

  describe("getMarketingConsents", () => {
    beforeEach(async () => {
      await CatalogDownloadRequestModel.create({
        fullName: "Consent1",
        email: "consent1@example.com",
        phone: "+consent1",
        marketingConsent: true,
      });
      await CatalogDownloadRequestModel.create({
        fullName: "NoConsent",
        email: "noconsent@example.com",
        phone: "+noconsent",
        marketingConsent: false,
      });
      await CatalogDownloadRequestModel.create({
        fullName: "Consent2",
        email: "consent2@example.com",
        phone: "+consent2",
        marketingConsent: true,
      });
    });

    it("should return requests with marketing consent", async () => {
      const consented =
        await CatalogDownloadRequestModel.getMarketingConsents();
      expect(consented).toHaveLength(2);
      expect(consented[0].marketingConsent).toBe(true);
    });

    it("should return empty array for no consents", async () => {
      await db("catalog_download_requests").del();
      const consented =
        await CatalogDownloadRequestModel.getMarketingConsents();
      expect(consented).toHaveLength(0);
    });
  });
});
