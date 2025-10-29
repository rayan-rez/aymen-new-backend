/**
 * File: src/__tests__/unit/models/event-registration.model.test.ts
 * Comprehensive tests for EventRegistrationModel
 * Tests event registration, check-in/out, feedback, and statistics
 */

import EventRegistrationModel, {
  EventType,
} from "@models/event-registration.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

describe("EventRegistrationModel", () => {
  beforeEach(async () => {
    await cleanTables(["event_registrations"]);
  });

  afterAll(async () => {
    await cleanTables(["event_registrations"]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a new event registration with all fields", async () => {
      const eventDate = new Date("2025-11-15");
      const data = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        eventType: EventType.OPEN_HOUSE,
        eventDate,
        selectedTimeSlots: ["10:00-11:00", "14:00-15:00"],
        acceptedTerms: true,
        photoConsent: true,
        utmSource: "facebook",
        utmMedium: "social",
        utmCampaign: "fall_2025",
        registrationSource: "https://example.com/register",
        referrer: "https://facebook.com",
      };

      const registration = await EventRegistrationModel.create(data);

      expect(registration).toBeDefined();
      expect(registration.id).toBeDefined();
      expect(registration.firstName).toBe("John");
      expect(registration.lastName).toBe("Doe");
      expect(registration.email).toBe("john.doe@example.com");
      expect(registration.eventType).toBe(EventType.OPEN_HOUSE);
      expect(registration.selectedTimeSlots).toEqual([
        "10:00-11:00",
        "14:00-15:00",
      ]);
      expect(registration.acceptedTerms).toBe(true);
      expect(registration.utmSource).toBe("facebook");
    });

    it("should create with minimal required fields", async () => {
      const data = {
        firstName: "Jane",
        lastName: "Smith",
        eventType: EventType.TRADE_SHOW,
        eventDate: new Date("2025-12-01"),
      };

      const registration = await EventRegistrationModel.create(data);

      expect(registration.firstName).toBe("Jane");
      expect(registration.email).toBeNull();
      expect(registration.phone).toBeNull();
      expect(registration.selectedTimeSlots).toBeNull();
      expect(registration.acceptedTerms).toBe(false);
    });

    it("should create registrations for different event types", async () => {
      const eventTypes = [
        EventType.OPEN_HOUSE,
        EventType.TRADE_SHOW,
        EventType.INAUGURATION,
        EventType.NETWORKING,
        EventType.WEBINAR,
      ];

      for (const eventType of eventTypes) {
        const registration = await EventRegistrationModel.create({
          firstName: "Test",
          lastName: "User",
          eventType,
          eventDate: new Date("2025-11-20"),
        });

        expect(registration.eventType).toBe(eventType);
      }
    });
  });

  describe("findById", () => {
    it("should find registration by id", async () => {
      const created = await EventRegistrationModel.create({
        firstName: "Find",
        lastName: "Me",
        email: "find@example.com",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-20"),
      });

      const found = await EventRegistrationModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe("find@example.com");
    });

    it("should return null for non-existent id", async () => {
      const found = await EventRegistrationModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      await EventRegistrationModel.create({
        firstName: "Alice",
        lastName: "Admin",
        email: "alice@example.com",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      await EventRegistrationModel.create({
        firstName: "Bob",
        lastName: "Builder",
        email: "bob@example.com",
        eventType: EventType.TRADE_SHOW,
        eventDate: new Date("2025-11-20"),
      });

      await EventRegistrationModel.create({
        firstName: "Charlie",
        lastName: "Chaplin",
        email: "charlie@example.com",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });
    });

    it("should return all registrations", async () => {
      const registrations = await EventRegistrationModel.findAll();
      expect(registrations.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by event type", async () => {
      const openHouseRegs = await EventRegistrationModel.findAll({
        eventType: EventType.OPEN_HOUSE,
      });

      expect(openHouseRegs.length).toBeGreaterThanOrEqual(2);
      expect(
        openHouseRegs.every((r) => r.eventType === EventType.OPEN_HOUSE)
      ).toBe(true);
    });

    it("should filter by event date", async () => {
      const date = new Date("2025-11-15");
      const regs = await EventRegistrationModel.findAll({ eventDate: date });

      expect(regs.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by email", async () => {
      const regs = await EventRegistrationModel.findAll({
        email: "alice@example.com",
      });

      expect(regs.length).toBe(1);
      expect(regs[0].email).toBe("alice@example.com");
    });

    it("should support pagination", async () => {
      const results = await EventRegistrationModel.findAll({
        page: 1,
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getByEvent", () => {
    beforeEach(async () => {
      await EventRegistrationModel.create({
        firstName: "Event",
        lastName: "One",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      await EventRegistrationModel.create({
        firstName: "Event",
        lastName: "Two",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      await EventRegistrationModel.create({
        firstName: "Other",
        lastName: "Event",
        eventType: EventType.TRADE_SHOW,
        eventDate: new Date("2025-11-20"),
      });
    });

    it("should get registrations for specific event", async () => {
      const regs = await EventRegistrationModel.getByEvent(
        EventType.OPEN_HOUSE,
        new Date("2025-11-15")
      );

      expect(regs.length).toBe(2);
      expect(regs.every((r) => r.eventType === EventType.OPEN_HOUSE)).toBe(
        true
      );
    });

    it("should return empty array for event with no registrations", async () => {
      const regs = await EventRegistrationModel.getByEvent(
        EventType.WEBINAR,
        new Date("2025-12-01")
      );

      expect(regs).toHaveLength(0);
    });
  });

  describe("checkIn", () => {
    it("should check in an attendee", async () => {
      const registration = await EventRegistrationModel.create({
        firstName: "Check",
        lastName: "In",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      expect(registration.checkedInAt).toBeNull();

      const success = await EventRegistrationModel.checkIn(registration.id);
      expect(success).toBe(true);

      const updated = await EventRegistrationModel.findById(registration.id);
      expect(updated?.checkedInAt).toBeDefined();
      expect(updated?.checkedInAt).toBeInstanceOf(Date);
    });

    it("should return false for non-existent registration", async () => {
      const success = await EventRegistrationModel.checkIn(999999);
      expect(success).toBe(false);
    });
  });

  describe("checkOut", () => {
    it("should check out an attendee", async () => {
      const registration = await EventRegistrationModel.create({
        firstName: "Check",
        lastName: "Out",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      await EventRegistrationModel.checkIn(registration.id);

      const success = await EventRegistrationModel.checkOut(registration.id);
      expect(success).toBe(true);

      const updated = await EventRegistrationModel.findById(registration.id);
      expect(updated?.checkedOutAt).toBeDefined();
      expect(updated?.checkedOutAt).toBeInstanceOf(Date);
    });

    it("should return false for non-existent registration", async () => {
      const success = await EventRegistrationModel.checkOut(999999);
      expect(success).toBe(false);
    });
  });

  describe("submitFeedback", () => {
    it("should submit feedback for a registration", async () => {
      const registration = await EventRegistrationModel.create({
        firstName: "Feedback",
        lastName: "User",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      const feedback = {
        satisfactionScore: 9,
        recommendationScore: 10,
        comments: "Great event! Very informative.",
      };

      const success = await EventRegistrationModel.submitFeedback(
        registration.id,
        feedback
      );
      expect(success).toBe(true);

      const updated = await EventRegistrationModel.findById(registration.id);
      expect(updated?.satisfactionScore).toBe(9);
      expect(updated?.recommendationScore).toBe(10);
      expect(updated?.feedbackComments).toBe("Great event! Very informative.");
    });

    it("should submit feedback without comments", async () => {
      const registration = await EventRegistrationModel.create({
        firstName: "No",
        lastName: "Comments",
        eventType: EventType.TRADE_SHOW,
        eventDate: new Date("2025-11-20"),
      });

      const success = await EventRegistrationModel.submitFeedback(
        registration.id,
        {
          satisfactionScore: 8,
          recommendationScore: 9,
        }
      );

      expect(success).toBe(true);

      const updated = await EventRegistrationModel.findById(registration.id);
      expect(updated?.satisfactionScore).toBe(8);
      expect(updated?.feedbackComments).toBeNull();
    });

    it("should return false for non-existent registration", async () => {
      const success = await EventRegistrationModel.submitFeedback(999999, {
        satisfactionScore: 10,
        recommendationScore: 10,
      });

      expect(success).toBe(false);
    });
  });

  describe("assign", () => {
    it("should assign salesperson to registration", async () => {
      const registration = await EventRegistrationModel.create({
        firstName: "Assign",
        lastName: "Me",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      expect(registration.assignedSalesperson).toBeNull();

      const success = await EventRegistrationModel.assign(
        registration.id,
        "john_doe"
      );
      expect(success).toBe(true);

      const updated = await EventRegistrationModel.findById(registration.id);
      expect(updated?.assignedSalesperson).toBe("john_doe");
    });

    it("should return false for non-existent registration", async () => {
      const success = await EventRegistrationModel.assign(999999, "john_doe");
      expect(success).toBe(false);
    });
  });

  describe("getAssigned", () => {
    beforeEach(async () => {
      const reg1 = await EventRegistrationModel.create({
        firstName: "John",
        lastName: "Client1",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      const reg2 = await EventRegistrationModel.create({
        firstName: "Jane",
        lastName: "Client2",
        eventType: EventType.TRADE_SHOW,
        eventDate: new Date("2025-11-20"),
      });

      const reg3 = await EventRegistrationModel.create({
        firstName: "Bob",
        lastName: "Client3",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      await EventRegistrationModel.assign(reg1.id, "john_doe");
      await EventRegistrationModel.assign(reg2.id, "john_doe");
      await EventRegistrationModel.assign(reg3.id, "jane_smith");
    });

    it("should get registrations assigned to salesperson", async () => {
      const johnRegs = await EventRegistrationModel.getAssigned("john_doe");

      expect(johnRegs.length).toBe(2);
      expect(johnRegs.every((r) => r.assignedSalesperson === "john_doe")).toBe(
        true
      );
    });

    it("should return empty array for salesperson with no assignments", async () => {
      const regs = await EventRegistrationModel.getAssigned("no_one");
      expect(regs).toHaveLength(0);
    });
  });

  describe("getCheckedIn", () => {
    beforeEach(async () => {
      const reg1 = await EventRegistrationModel.create({
        firstName: "Checked",
        lastName: "In",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      const reg2 = await EventRegistrationModel.create({
        firstName: "Also",
        lastName: "Checked",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      const reg3 = await EventRegistrationModel.create({
        firstName: "Not",
        lastName: "Checked",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      await EventRegistrationModel.checkIn(reg1.id);
      await EventRegistrationModel.checkIn(reg2.id);
    });

    it("should get checked-in attendees for event", async () => {
      const attendees = await EventRegistrationModel.getCheckedIn(
        EventType.OPEN_HOUSE,
        new Date("2025-11-15")
      );

      expect(attendees.length).toBe(2);
      expect(attendees.every((a) => a.checkedInAt !== null)).toBe(true);
    });

    it("should return empty array for event with no check-ins", async () => {
      const attendees = await EventRegistrationModel.getCheckedIn(
        EventType.WEBINAR,
        new Date("2025-12-01")
      );

      expect(attendees).toHaveLength(0);
    });
  });

  describe("getAttendanceStats", () => {
    beforeEach(async () => {
      const reg1 = await EventRegistrationModel.create({
        firstName: "Stats",
        lastName: "One",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      const reg2 = await EventRegistrationModel.create({
        firstName: "Stats",
        lastName: "Two",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      const reg3 = await EventRegistrationModel.create({
        firstName: "Stats",
        lastName: "Three",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      await EventRegistrationModel.checkIn(reg1.id);
      await EventRegistrationModel.checkIn(reg2.id);
      await EventRegistrationModel.checkOut(reg1.id);

      await EventRegistrationModel.submitFeedback(reg1.id, {
        satisfactionScore: 9,
        recommendationScore: 10,
      });
    });

    it("should get attendance statistics for event", async () => {
      const stats = await EventRegistrationModel.getAttendanceStats(
        EventType.OPEN_HOUSE,
        new Date("2025-11-15")
      );

      expect(stats).toHaveProperty("totalRegistrations");
      expect(stats).toHaveProperty("checkedIn");
      expect(stats).toHaveProperty("checkedOut");
      expect(stats).toHaveProperty("feedbackSubmitted");

      expect(stats.totalRegistrations).toBe(3);
      expect(stats.checkedIn).toBe(2);
      expect(stats.checkedOut).toBe(1);
      expect(stats.feedbackSubmitted).toBe(1);
    });

    it("should return zeros for event with no registrations", async () => {
      const stats = await EventRegistrationModel.getAttendanceStats(
        EventType.WEBINAR,
        new Date("2025-12-01")
      );

      expect(stats.totalRegistrations).toBe(0);
      expect(stats.checkedIn).toBe(0);
      expect(stats.checkedOut).toBe(0);
      expect(stats.feedbackSubmitted).toBe(0);
    });
  });

  describe("update", () => {
    it("should update registration details", async () => {
      const registration = await EventRegistrationModel.create({
        firstName: "Update",
        lastName: "Me",
        email: "update@example.com",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      const updated = await EventRegistrationModel.update(registration.id, {
        firstName: "Updated",
        phone: "+9999999999",
        photoConsent: true,
      });

      expect(updated?.firstName).toBe("Updated");
      expect(updated?.phone).toBe("+9999999999");
      expect(updated?.photoConsent).toBe(true);
      expect(updated?.email).toBe("update@example.com");
    });

    it("should return null for non-existent registration", async () => {
      const updated = await EventRegistrationModel.update(999999, {
        firstName: "Non-existent",
      });

      expect(updated).toBeNull();
    });
  });

  describe("JSON field handling", () => {
    it("should handle time slots as JSON array", async () => {
      const timeSlots = ["09:00-10:00", "11:00-12:00", "14:00-15:00"];

      const registration = await EventRegistrationModel.create({
        firstName: "Time",
        lastName: "Slots",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
        selectedTimeSlots: timeSlots,
      });

      expect(registration.selectedTimeSlots).toEqual(timeSlots);

      const found = await EventRegistrationModel.findById(registration.id);
      expect(found?.selectedTimeSlots).toEqual(timeSlots);
      expect(Array.isArray(found?.selectedTimeSlots)).toBe(true);
    });

    it("should handle null time slots", async () => {
      const registration = await EventRegistrationModel.create({
        firstName: "No",
        lastName: "Slots",
        eventType: EventType.WEBINAR,
        eventDate: new Date("2025-11-20"),
      });

      expect(registration.selectedTimeSlots).toBeNull();

      const found = await EventRegistrationModel.findById(registration.id);
      expect(found?.selectedTimeSlots).toBeNull();
    });
  });

  describe("UTM tracking", () => {
    it("should store UTM parameters", async () => {
      const registration = await EventRegistrationModel.create({
        firstName: "UTM",
        lastName: "User",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "fall_2025",
        registrationSource: "https://example.com/register",
        referrer: "https://google.com",
      });

      expect(registration.utmSource).toBe("google");
      expect(registration.utmMedium).toBe("cpc");
      expect(registration.utmCampaign).toBe("fall_2025");
      expect(registration.registrationSource).toBe(
        "https://example.com/register"
      );
      expect(registration.referrer).toBe("https://google.com");
    });
  });

  describe("date filtering", () => {
    beforeEach(async () => {
      await EventRegistrationModel.create({
        firstName: "Old",
        lastName: "Registration",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      // Wait to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100));

      await EventRegistrationModel.create({
        firstName: "New",
        lastName: "Registration",
        eventType: EventType.TRADE_SHOW,
        eventDate: new Date("2025-11-20"),
      });
    });

    it("should filter by date range", async () => {
      const dateFrom = new Date("2025-10-01");
      const dateTo = new Date();

      const regs = await EventRegistrationModel.findAll({
        dateFrom,
        dateTo,
      });

      expect(regs.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by hasCheckedIn", async () => {
      const reg = await EventRegistrationModel.create({
        firstName: "Check",
        lastName: "Test",
        eventType: EventType.OPEN_HOUSE,
        eventDate: new Date("2025-11-15"),
      });

      await EventRegistrationModel.checkIn(reg.id);

      const checkedIn = await EventRegistrationModel.findAll({
        hasCheckedIn: true,
      });

      const notCheckedIn = await EventRegistrationModel.findAll({
        hasCheckedIn: false,
      });

      expect(checkedIn.length).toBeGreaterThanOrEqual(1);
      expect(notCheckedIn.length).toBeGreaterThanOrEqual(1);
    });
  });
});
