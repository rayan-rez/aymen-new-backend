/**
 * File: src/__tests__/unit/models/project-inquiry.model.test.ts
 * Comprehensive tests for ProjectInquiryModel
 * Tests detailed project-specific inquiry forms and sales pipeline
 */

import ProjectInquiryModel, {
  ProjectInquiryStatus,
  FinancingMethod,
  PurchaseTimeline,
} from "@models/project-inquiry.model";
import ProjectModel from "@models/project.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

describe("ProjectInquiryModel", () => {
  let projectId: number;

  beforeEach(async () => {
    await cleanTables([
      "project_inquiries",
      "floor_plans",
      "photos",
      "apartments",
      "project_features",
      "projects",
    ]);

    // Create test project
    const project = await ProjectModel.create({
      name: "Luxury Apartments",
      slug: `inquiry-test-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`,
      address: "123 Main St",
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await cleanTables([
      "project_inquiries",
      "floor_plans",
      "photos",
      "apartments",
      "project_features",
      "projects",
    ]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a project inquiry with all fields", async () => {
      const data = {
        projectId,
        firstName: "John",
        lastName: "Buyer",
        email: "john.buyer@example.com",
        phone: "+1234567890",
        country: "USA",
        stateProvince: "California",
        city: "Los Angeles",
        profession: "Software Engineer",
        budgetRange: "$500k-$700k",
        financingMethod: FinancingMethod.MORTGAGE,
        interestTypes: ["buy", "invest"],
        propertyTypes: ["apartment", "villa"],
        preferredLocations: ["Downtown", "Beach"],
        preferredContactDay: "Monday",
        preferredContactTime: "Morning",
        purchaseTimeline: PurchaseTimeline.WITHIN_3_MONTHS,
        acceptedTerms: true,
        marketingConsent: true,
      };

      const inquiry = await ProjectInquiryModel.create(data);

      expect(inquiry).toBeDefined();
      expect(inquiry.id).toBeDefined();
      expect(inquiry.projectId).toBe(projectId);
      expect(inquiry.firstName).toBe("John");
      expect(inquiry.email).toBe("john.buyer@example.com");
      expect(inquiry.financingMethod).toBe(FinancingMethod.MORTGAGE);
      expect(inquiry.interestTypes).toEqual(["buy", "invest"]);
      expect(inquiry.propertyTypes).toEqual(["apartment", "villa"]);
      expect(inquiry.status).toBe(ProjectInquiryStatus.NEW);
      expect(inquiry.acceptedTerms).toBe(true);
      expect(inquiry.marketingConsent).toBe(true);
    });

    it("should create with minimal required fields", async () => {
      const data = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "+9876543210",
        country: "UK",
      };

      const inquiry = await ProjectInquiryModel.create(data);

      expect(inquiry.firstName).toBe("Jane");
      expect(inquiry.projectId).toBeNull();
      expect(inquiry.interestTypes).toBeNull();
      expect(inquiry.status).toBe(ProjectInquiryStatus.NEW);
    });

    it("should create without project reference", async () => {
      const data = {
        firstName: "Bob",
        lastName: "General",
        email: "bob@example.com",
        phone: "+1111111111",
        country: "Canada",
      };

      const inquiry = await ProjectInquiryModel.create(data);

      expect(inquiry.projectId).toBeNull();
      expect(inquiry.firstName).toBe("Bob");
    });

    it("should handle JSON array fields correctly", async () => {
      const data = {
        firstName: "Alice",
        lastName: "Investor",
        email: "alice@example.com",
        phone: "+2222222222",
        country: "France",
        interestTypes: ["invest", "rent"],
        propertyTypes: ["studio", "apartment"],
        preferredLocations: ["City Center", "Suburbs"],
      };

      const inquiry = await ProjectInquiryModel.create(data);

      expect(Array.isArray(inquiry.interestTypes)).toBe(true);
      expect(inquiry.interestTypes).toHaveLength(2);
      expect(inquiry.propertyTypes).toContain("studio");
      expect(inquiry.preferredLocations).toContain("City Center");
    });
  });

  describe("findById", () => {
    it("should find inquiry by id", async () => {
      const created = await ProjectInquiryModel.create({
        projectId,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "+3333333333",
        country: "Germany",
      });

      const found = await ProjectInquiryModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe("test@example.com");
    });

    it("should return null for non-existent id", async () => {
      const found = await ProjectInquiryModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      await ProjectInquiryModel.create({
        projectId,
        firstName: "User1",
        lastName: "Test",
        email: "user1@example.com",
        phone: "+1111111111",
        country: "USA",
        financingMethod: FinancingMethod.CASH,
      });

      const inquiry2 = await ProjectInquiryModel.create({
        projectId,
        firstName: "User2",
        lastName: "Test",
        email: "user2@example.com",
        phone: "+2222222222",
        country: "UK",
        financingMethod: FinancingMethod.MORTGAGE,
      });
      await ProjectInquiryModel.updateStatus(
        inquiry2.id,
        ProjectInquiryStatus.CONTACTED
      );

      await ProjectInquiryModel.create({
        firstName: "User3",
        lastName: "Test",
        email: "user3@example.com",
        phone: "+3333333333",
        country: "Canada",
        purchaseTimeline: PurchaseTimeline.IMMEDIATE,
      });
    });

    it("should return all inquiries", async () => {
      const results = await ProjectInquiryModel.findAll();
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by projectId", async () => {
      const results = await ProjectInquiryModel.findAll({ projectId });
      expect(results.length).toBe(2);
      expect(results.every((i) => i.projectId === projectId)).toBe(true);
    });

    it("should filter by status", async () => {
      const results = await ProjectInquiryModel.findAll({
        status: ProjectInquiryStatus.NEW,
      });
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((i) => i.status === ProjectInquiryStatus.NEW)).toBe(
        true
      );
    });

    it("should filter by email", async () => {
      const results = await ProjectInquiryModel.findAll({
        email: "user1@example.com",
      });
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe("user1@example.com");
    });

    it("should filter by financingMethod", async () => {
      const results = await ProjectInquiryModel.findAll({
        financingMethod: FinancingMethod.CASH,
      });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(
        results.every((i) => i.financingMethod === FinancingMethod.CASH)
      ).toBe(true);
    });

    it("should filter by purchaseTimeline", async () => {
      const results = await ProjectInquiryModel.findAll({
        purchaseTimeline: PurchaseTimeline.IMMEDIATE,
      });
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should support pagination", async () => {
      const results = await ProjectInquiryModel.findAll({
        page: 1,
        limit: 2,
      });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should filter by date range", async () => {
      const dateFrom = new Date("2025-10-01");
      const dateTo = new Date("2025-12-31");

      const results = await ProjectInquiryModel.findAll({
        dateFrom,
        dateTo,
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("getByProject", () => {
    beforeEach(async () => {
      await ProjectInquiryModel.create({
        projectId,
        firstName: "Project",
        lastName: "Inquiry1",
        email: "proj1@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      await ProjectInquiryModel.create({
        projectId,
        firstName: "Project",
        lastName: "Inquiry2",
        email: "proj2@example.com",
        phone: "+2222222222",
        country: "UK",
      });

      await ProjectInquiryModel.create({
        firstName: "General",
        lastName: "Inquiry",
        email: "general@example.com",
        phone: "+3333333333",
        country: "Canada",
      });
    });

    it("should return inquiries for specific project", async () => {
      const inquiries = await ProjectInquiryModel.getByProject(projectId);

      expect(inquiries).toHaveLength(2);
      expect(inquiries.every((i) => i.projectId === projectId)).toBe(true);
    });

    it("should return empty array for project with no inquiries", async () => {
      const inquiries = await ProjectInquiryModel.getByProject(999999);
      expect(inquiries).toHaveLength(0);
    });
  });

  describe("getNew", () => {
    beforeEach(async () => {
      await ProjectInquiryModel.create({
        firstName: "New1",
        lastName: "Inquiry",
        email: "new1@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      await ProjectInquiryModel.create({
        firstName: "New2",
        lastName: "Inquiry",
        email: "new2@example.com",
        phone: "+2222222222",
        country: "UK",
      });

      const contacted = await ProjectInquiryModel.create({
        firstName: "Contacted",
        lastName: "Inquiry",
        email: "contacted@example.com",
        phone: "+3333333333",
        country: "Canada",
      });
      await ProjectInquiryModel.updateStatus(
        contacted.id,
        ProjectInquiryStatus.CONTACTED
      );
    });

    it("should return only new inquiries", async () => {
      const newInquiries = await ProjectInquiryModel.getNew();

      expect(newInquiries.length).toBeGreaterThanOrEqual(2);
      expect(
        newInquiries.every((i) => i.status === ProjectInquiryStatus.NEW)
      ).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const newInquiries = await ProjectInquiryModel.getNew(1);
      expect(newInquiries.length).toBeLessThanOrEqual(1);
    });
  });

  describe("assign and getAssigned", () => {
    it("should assign inquiry to salesperson", async () => {
      const inquiry = await ProjectInquiryModel.create({
        firstName: "Assign",
        lastName: "Test",
        email: "assign@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      const assigned = await ProjectInquiryModel.assign(
        inquiry.id,
        "john_sales"
      );

      expect(assigned).toBe(true);

      const found = await ProjectInquiryModel.findById(inquiry.id);
      expect(found?.assignedTo).toBe("john_sales");
    });

    it("should get inquiries assigned to salesperson", async () => {
      await ProjectInquiryModel.create({
        firstName: "John",
        lastName: "Lead1",
        email: "lead1@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      const inquiry1 = await ProjectInquiryModel.create({
        firstName: "John",
        lastName: "Lead2",
        email: "lead2@example.com",
        phone: "+2222222222",
        country: "UK",
      });

      const inquiry2 = await ProjectInquiryModel.create({
        firstName: "John",
        lastName: "Lead3",
        email: "lead3@example.com",
        phone: "+3333333333",
        country: "Canada",
      });

      await ProjectInquiryModel.assign(inquiry1.id, "jane_sales");
      await ProjectInquiryModel.assign(inquiry2.id, "jane_sales");

      const assigned = await ProjectInquiryModel.getAssigned("jane_sales");

      expect(assigned).toHaveLength(2);
      expect(assigned.every((i) => i.assignedTo === "jane_sales")).toBe(true);
    });

    it("should return false for non-existent inquiry", async () => {
      const assigned = await ProjectInquiryModel.assign(999999, "john_sales");
      expect(assigned).toBe(false);
    });
  });

  describe("updateStatus", () => {
    it("should update inquiry status", async () => {
      const inquiry = await ProjectInquiryModel.create({
        firstName: "Status",
        lastName: "Test",
        email: "status@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      const updated = await ProjectInquiryModel.updateStatus(
        inquiry.id,
        ProjectInquiryStatus.QUALIFIED
      );

      expect(updated).toBe(true);

      const found = await ProjectInquiryModel.findById(inquiry.id);
      expect(found?.status).toBe(ProjectInquiryStatus.QUALIFIED);
    });

    it("should update through various pipeline stages", async () => {
      const inquiry = await ProjectInquiryModel.create({
        firstName: "Pipeline",
        lastName: "Test",
        email: "pipeline@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      await ProjectInquiryModel.updateStatus(
        inquiry.id,
        ProjectInquiryStatus.CONTACTED
      );
      let found = await ProjectInquiryModel.findById(inquiry.id);
      expect(found?.status).toBe(ProjectInquiryStatus.CONTACTED);

      await ProjectInquiryModel.updateStatus(
        inquiry.id,
        ProjectInquiryStatus.QUALIFIED
      );
      found = await ProjectInquiryModel.findById(inquiry.id);
      expect(found?.status).toBe(ProjectInquiryStatus.QUALIFIED);

      await ProjectInquiryModel.updateStatus(
        inquiry.id,
        ProjectInquiryStatus.VIEWING_SCHEDULED
      );
      found = await ProjectInquiryModel.findById(inquiry.id);
      expect(found?.status).toBe(ProjectInquiryStatus.VIEWING_SCHEDULED);
    });

    it("should return false for non-existent inquiry", async () => {
      const updated = await ProjectInquiryModel.updateStatus(
        999999,
        ProjectInquiryStatus.CONTACTED
      );
      expect(updated).toBe(false);
    });
  });

  describe("getByFinancingMethod", () => {
    beforeEach(async () => {
      await ProjectInquiryModel.create({
        firstName: "Cash",
        lastName: "Buyer",
        email: "cash@example.com",
        phone: "+1111111111",
        country: "USA",
        financingMethod: FinancingMethod.CASH,
      });

      await ProjectInquiryModel.create({
        firstName: "Mortgage",
        lastName: "Buyer",
        email: "mortgage@example.com",
        phone: "+2222222222",
        country: "UK",
        financingMethod: FinancingMethod.MORTGAGE,
      });

      await ProjectInquiryModel.create({
        firstName: "Cash2",
        lastName: "Buyer",
        email: "cash2@example.com",
        phone: "+3333333333",
        country: "Canada",
        financingMethod: FinancingMethod.CASH,
      });
    });

    it("should find inquiries by financing method", async () => {
      const cashBuyers = await ProjectInquiryModel.getByFinancingMethod(
        FinancingMethod.CASH
      );

      expect(cashBuyers).toHaveLength(2);
      expect(
        cashBuyers.every((i) => i.financingMethod === FinancingMethod.CASH)
      ).toBe(true);
    });

    it("should return empty array for no matches", async () => {
      const installment = await ProjectInquiryModel.getByFinancingMethod(
        FinancingMethod.INSTALLMENT
      );
      expect(installment).toHaveLength(0);
    });
  });

  describe("getByTimeline", () => {
    beforeEach(async () => {
      await ProjectInquiryModel.create({
        firstName: "Urgent",
        lastName: "Buyer",
        email: "urgent@example.com",
        phone: "+1111111111",
        country: "USA",
        purchaseTimeline: PurchaseTimeline.IMMEDIATE,
      });

      await ProjectInquiryModel.create({
        firstName: "Soon",
        lastName: "Buyer",
        email: "soon@example.com",
        phone: "+2222222222",
        country: "UK",
        purchaseTimeline: PurchaseTimeline.WITHIN_3_MONTHS,
      });

      await ProjectInquiryModel.create({
        firstName: "Urgent2",
        lastName: "Buyer",
        email: "urgent2@example.com",
        phone: "+3333333333",
        country: "Canada",
        purchaseTimeline: PurchaseTimeline.IMMEDIATE,
      });
    });

    it("should find inquiries by purchase timeline", async () => {
      const immediate = await ProjectInquiryModel.getByTimeline(
        PurchaseTimeline.IMMEDIATE
      );

      expect(immediate).toHaveLength(2);
      expect(
        immediate.every(
          (i) => i.purchaseTimeline === PurchaseTimeline.IMMEDIATE
        )
      ).toBe(true);
    });

    it("should return empty array for no matches", async () => {
      const exploring = await ProjectInquiryModel.getByTimeline(
        PurchaseTimeline.EXPLORING
      );
      expect(exploring).toHaveLength(0);
    });
  });

  describe("getQualified", () => {
    beforeEach(async () => {
      const inq1 = await ProjectInquiryModel.create({
        firstName: "Qualified1",
        lastName: "Lead",
        email: "qual1@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      const inq2 = await ProjectInquiryModel.create({
        firstName: "Qualified2",
        lastName: "Lead",
        email: "qual2@example.com",
        phone: "+2222222222",
        country: "UK",
      });

      const inq3 = await ProjectInquiryModel.create({
        firstName: "New",
        lastName: "Lead",
        email: "new@example.com",
        phone: "+3333333333",
        country: "Canada",
      });

      await ProjectInquiryModel.updateStatus(
        inq1.id,
        ProjectInquiryStatus.QUALIFIED
      );
      await ProjectInquiryModel.updateStatus(
        inq2.id,
        ProjectInquiryStatus.QUALIFIED
      );
    });

    it("should return only qualified inquiries", async () => {
      const qualified = await ProjectInquiryModel.getQualified();

      expect(qualified.length).toBeGreaterThanOrEqual(2);
      expect(
        qualified.every((i) => i.status === ProjectInquiryStatus.QUALIFIED)
      ).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const qualified = await ProjectInquiryModel.getQualified(1);
      expect(qualified.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getStatusStatistics", () => {
    beforeEach(async () => {
      const inq1 = await ProjectInquiryModel.create({
        firstName: "New1",
        lastName: "Stat",
        email: "stat1@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      const inq2 = await ProjectInquiryModel.create({
        firstName: "New2",
        lastName: "Stat",
        email: "stat2@example.com",
        phone: "+2222222222",
        country: "UK",
      });

      const inq3 = await ProjectInquiryModel.create({
        firstName: "Contacted",
        lastName: "Stat",
        email: "stat3@example.com",
        phone: "+3333333333",
        country: "Canada",
      });

      await ProjectInquiryModel.updateStatus(
        inq3.id,
        ProjectInquiryStatus.CONTACTED
      );
    });

    it("should return status statistics", async () => {
      const stats = await ProjectInquiryModel.getStatusStatistics();

      expect(stats.new).toBeGreaterThanOrEqual(2);
      expect(stats.contacted).toBeGreaterThanOrEqual(1);
    });

    it("should return empty object when no inquiries", async () => {
      await cleanTables(["project_inquiries"]);

      const stats = await ProjectInquiryModel.getStatusStatistics();
      expect(stats).toEqual({});
    });
  });

  describe("getPipelineStatistics", () => {
    beforeEach(async () => {
      const inq1 = await ProjectInquiryModel.create({
        firstName: "Pipeline1",
        lastName: "Test",
        email: "pipe1@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      const inq2 = await ProjectInquiryModel.create({
        firstName: "Pipeline2",
        lastName: "Test",
        email: "pipe2@example.com",
        phone: "+2222222222",
        country: "UK",
      });

      const inq3 = await ProjectInquiryModel.create({
        firstName: "Pipeline3",
        lastName: "Test",
        email: "pipe3@example.com",
        phone: "+3333333333",
        country: "Canada",
      });

      await ProjectInquiryModel.updateStatus(
        inq2.id,
        ProjectInquiryStatus.QUALIFIED
      );
      await ProjectInquiryModel.updateStatus(
        inq3.id,
        ProjectInquiryStatus.CLOSED_WON
      );
    });

    it("should return pipeline statistics", async () => {
      const pipeline = await ProjectInquiryModel.getPipelineStatistics();

      expect(pipeline).toHaveProperty("total");
      expect(pipeline).toHaveProperty("byStatus");
      expect(pipeline).toHaveProperty("conversionRate");
      expect(pipeline).toHaveProperty("closedWon");
      expect(pipeline).toHaveProperty("closedLost");

      expect(pipeline.total).toBeGreaterThanOrEqual(3);
      expect(pipeline.closedWon).toBeGreaterThanOrEqual(1);
    });

    it("should calculate conversion rate correctly", async () => {
      const pipeline = await ProjectInquiryModel.getPipelineStatistics();

      expect(typeof pipeline.conversionRate).toBe("number");
      expect(pipeline.conversionRate).toBeGreaterThanOrEqual(0);
      expect(pipeline.conversionRate).toBeLessThanOrEqual(100);
    });
  });

  describe("findByEmail", () => {
    beforeEach(async () => {
      await ProjectInquiryModel.create({
        firstName: "Repeat",
        lastName: "Customer",
        email: "repeat@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      await ProjectInquiryModel.create({
        firstName: "Repeat",
        lastName: "Customer",
        email: "repeat@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      await ProjectInquiryModel.create({
        firstName: "Other",
        lastName: "Customer",
        email: "other@example.com",
        phone: "+2222222222",
        country: "UK",
      });
    });

    it("should find all inquiries by email", async () => {
      const inquiries = await ProjectInquiryModel.findByEmail(
        "repeat@example.com"
      );

      expect(inquiries).toHaveLength(2);
      expect(inquiries.every((i) => i.email === "repeat@example.com")).toBe(
        true
      );
    });

    it("should return empty array for no matches", async () => {
      const inquiries = await ProjectInquiryModel.findByEmail(
        "nonexistent@example.com"
      );
      expect(inquiries).toHaveLength(0);
    });
  });

  describe("getWithMarketingConsent", () => {
    beforeEach(async () => {
      await ProjectInquiryModel.create({
        firstName: "Consent",
        lastName: "Yes",
        email: "yes@example.com",
        phone: "+1111111111",
        country: "USA",
        marketingConsent: true,
      });

      await ProjectInquiryModel.create({
        firstName: "Consent",
        lastName: "No",
        email: "no@example.com",
        phone: "+2222222222",
        country: "UK",
        marketingConsent: false,
      });

      await ProjectInquiryModel.create({
        firstName: "Consent",
        lastName: "Yes2",
        email: "yes2@example.com",
        phone: "+3333333333",
        country: "Canada",
        marketingConsent: true,
      });
    });

    it("should return only inquiries with marketing consent", async () => {
      const consented = await ProjectInquiryModel.getWithMarketingConsent();

      expect(consented).toHaveLength(2);
      expect(consented.every((i) => i.marketingConsent === true)).toBe(true);
    });
  });

  describe("update", () => {
    it("should update inquiry fields", async () => {
      const inquiry = await ProjectInquiryModel.create({
        firstName: "Original",
        lastName: "Name",
        email: "original@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      const updated = await ProjectInquiryModel.update(inquiry.id, {
        firstName: "Updated",
        lastName: "Person",
        profession: "Doctor",
        status: ProjectInquiryStatus.QUALIFIED,
      });

      expect(updated?.firstName).toBe("Updated");
      expect(updated?.lastName).toBe("Person");
      expect(updated?.profession).toBe("Doctor");
      expect(updated?.status).toBe(ProjectInquiryStatus.QUALIFIED);
    });

    it("should update JSON array fields", async () => {
      const inquiry = await ProjectInquiryModel.create({
        firstName: "JSON",
        lastName: "Test",
        email: "json@example.com",
        phone: "+1111111111",
        country: "USA",
      });

      const updated = await ProjectInquiryModel.update(inquiry.id, {
        interestTypes: ["buy", "invest"],
        propertyTypes: ["apartment"],
        preferredLocations: ["Downtown"],
      });

      expect(updated?.interestTypes).toEqual(["buy", "invest"]);
      expect(updated?.propertyTypes).toEqual(["apartment"]);
      expect(updated?.preferredLocations).toEqual(["Downtown"]);
    });

    it("should return null for non-existent inquiry", async () => {
      const updated = await ProjectInquiryModel.update(999999, {
        firstName: "Non-existent",
      });

      expect(updated).toBeNull();
    });
  });
});
