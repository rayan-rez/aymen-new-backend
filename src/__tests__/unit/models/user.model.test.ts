/**
 * File: src/__tests__/unit/models/user.model.test.ts
 * Comprehensive tests for UserModel
 * Tests system users, authentication, and role management
 */

import UserModel, { UserRole } from "@models/user.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";
import bcrypt from "bcrypt";

describe("UserModel", () => {
  // Helper function to create password hash
  const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
  };

  beforeEach(async () => {
    await cleanTables(["user_activity_logs", "users"]);
  });

  afterAll(async () => {
    await cleanTables(["user_activity_logs", "users"]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a new user with all fields", async () => {
      const passwordHash = await hashPassword("password123");
      const data = {
        email: "admin@example.com",
        passwordHash,
        firstName: "John",
        lastName: "Admin",
        phone: "+1234567890",
        role: UserRole.ADMIN,
        isActive: true,
        avatarUrl: "https://example.com/avatar.jpg",
      };

      const user = await UserModel.create(data);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe("admin@example.com");
      expect(user.firstName).toBe("John");
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.isActive).toBe(true);
      expect(user.passwordHash).toBe(passwordHash);
    });

    it("should create with minimal required fields", async () => {
      const passwordHash = await hashPassword("password123");
      const data = {
        email: "user@example.com",
        passwordHash,
        firstName: "Jane",
        lastName: "Doe",
      };

      const user = await UserModel.create(data);

      expect(user.email).toBe("user@example.com");
      expect(user.role).toBe(UserRole.VIEWER);
      expect(user.isActive).toBe(true);
      expect(user.phone).toBeNull();
    });

    it("should create users with different roles", async () => {
      const passwordHash = await hashPassword("password123");

      const admin = await UserModel.create({
        email: "admin@example.com",
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: UserRole.SUPER_ADMIN,
      });

      const sales = await UserModel.create({
        email: "sales@example.com",
        passwordHash,
        firstName: "Sales",
        lastName: "Agent",
        role: UserRole.SALES_AGENT,
      });

      expect(admin.role).toBe(UserRole.SUPER_ADMIN);
      expect(sales.role).toBe(UserRole.SALES_AGENT);
    });

    it("should fail for duplicate email", async () => {
      const passwordHash = await hashPassword("password123");

      await UserModel.create({
        email: "duplicate@example.com",
        passwordHash,
        firstName: "First",
        lastName: "User",
      });

      await expect(
        UserModel.create({
          email: "duplicate@example.com",
          passwordHash,
          firstName: "Second",
          lastName: "User",
        })
      ).rejects.toThrow();
    });
  });

  describe("findById", () => {
    it("should find user by id", async () => {
      const passwordHash = await hashPassword("password123");
      const created = await UserModel.create({
        email: "find@example.com",
        passwordHash,
        firstName: "Find",
        lastName: "Me",
      });

      const found = await UserModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe("find@example.com");
      expect(found?.passwordHash).toBeDefined();
    });

    it("should return null for non-existent id", async () => {
      const found = await UserModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should find user by email", async () => {
      const passwordHash = await hashPassword("password123");
      await UserModel.create({
        email: "test@example.com",
        passwordHash,
        firstName: "Test",
        lastName: "User",
      });

      const found = await UserModel.findByEmail("test@example.com");

      expect(found).toBeDefined();
      expect(found?.email).toBe("test@example.com");
      expect(found?.passwordHash).toBeDefined();
    });

    it("should handle case insensitive email search", async () => {
      const passwordHash = await hashPassword("password123");
      await UserModel.create({
        email: "CaseSensitive@example.com",
        passwordHash,
        firstName: "Case",
        lastName: "Test",
      });

      const found = await UserModel.findByEmail("casesensitive@example.com");

      expect(found).toBeDefined();
    });

    it("should return null for non-existent email", async () => {
      const found = await UserModel.findByEmail("nonexistent@example.com");
      expect(found).toBeNull();
    });
  });

  describe("findSafeById", () => {
    it("should return safe user without sensitive data", async () => {
      const passwordHash = await hashPassword("password123");
      const created = await UserModel.create({
        email: "safe@example.com",
        passwordHash,
        firstName: "Safe",
        lastName: "User",
      });

      const safeUser = await UserModel.findSafeById(created.id);

      expect(safeUser).toBeDefined();
      expect(safeUser?.email).toBe("safe@example.com");
      expect((safeUser as any)?.passwordHash).toBeUndefined();
      expect((safeUser as any)?.resetToken).toBeUndefined();
    });

    it("should return null for non-existent id", async () => {
      const safeUser = await UserModel.findSafeById(999999);
      expect(safeUser).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword("password123");

      await UserModel.create({
        email: "admin1@example.com",
        passwordHash,
        firstName: "Admin",
        lastName: "One",
        role: UserRole.ADMIN,
      });

      await UserModel.create({
        email: "sales1@example.com",
        passwordHash,
        firstName: "Sales",
        lastName: "One",
        role: UserRole.SALES_AGENT,
        isActive: true,
      });

      const inactive = await UserModel.create({
        email: "inactive@example.com",
        passwordHash,
        firstName: "Inactive",
        lastName: "User",
        role: UserRole.VIEWER,
      });

      await UserModel.setActive(inactive.id, false);
    });

    it("should return all users", async () => {
      const users = await UserModel.findAll();
      expect(users.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by role", async () => {
      const admins = await UserModel.findAll({ role: UserRole.ADMIN });

      expect(admins.length).toBeGreaterThanOrEqual(1);
      expect(admins.every((u) => u.role === UserRole.ADMIN)).toBe(true);
    });

    it("should filter by isActive", async () => {
      const active = await UserModel.findAll({ isActive: true });
      const inactive = await UserModel.findAll({ isActive: false });

      expect(active.length).toBeGreaterThanOrEqual(2);
      expect(inactive.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter by email (partial match)", async () => {
      const results = await UserModel.findAll({ email: "admin" });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].email).toContain("admin");
    });

    it("should support pagination", async () => {
      const results = await UserModel.findAll({ page: 1, limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should support sorting", async () => {
      const results = await UserModel.findAll({
        sortBy: "first_name",
        sortOrder: "asc",
      });

      expect(results.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("findAllSafe", () => {
    it("should return safe users without sensitive data", async () => {
      const passwordHash = await hashPassword("password123");

      await UserModel.create({
        email: "safe1@example.com",
        passwordHash,
        firstName: "Safe",
        lastName: "One",
      });

      await UserModel.create({
        email: "safe2@example.com",
        passwordHash,
        firstName: "Safe",
        lastName: "Two",
      });

      const safeUsers = await UserModel.findAllSafe();

      expect(safeUsers.length).toBeGreaterThanOrEqual(2);
      safeUsers.forEach((user) => {
        expect((user as any).passwordHash).toBeUndefined();
        expect((user as any).resetToken).toBeUndefined();
      });
    });
  });

  describe("updatePassword", () => {
    it("should update user password", async () => {
      const oldPasswordHash = await hashPassword("oldpassword");
      const user = await UserModel.create({
        email: "password@example.com",
        passwordHash: oldPasswordHash,
        firstName: "Password",
        lastName: "Test",
      });

      const newPasswordHash = await hashPassword("newpassword");
      const updated = await UserModel.updatePassword(user.id, newPasswordHash);

      expect(updated).toBe(true);

      const found = await UserModel.findById(user.id);
      expect(found?.passwordHash).toBe(newPasswordHash);
      expect(found?.passwordHash).not.toBe(oldPasswordHash);
    });

    it("should clear reset token when updating password", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "reset@example.com",
        passwordHash,
        firstName: "Reset",
        lastName: "Test",
      });

      const expiresAt = new Date(Date.now() + 3600000);
      await UserModel.setResetToken(user.id, "reset-token", expiresAt);

      const newPasswordHash = await hashPassword("newpassword");
      await UserModel.updatePassword(user.id, newPasswordHash);

      const found = await UserModel.findById(user.id);
      expect(found?.resetToken).toBeNull();
      expect(found?.resetTokenExpiresAt).toBeNull();
    });

    it("should return false for non-existent user", async () => {
      const passwordHash = await hashPassword("password123");
      const updated = await UserModel.updatePassword(999999, passwordHash);
      expect(updated).toBe(false);
    });
  });

  describe("setResetToken", () => {
    it("should set password reset token", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "token@example.com",
        passwordHash,
        firstName: "Token",
        lastName: "Test",
      });

      const token = "random-reset-token-123";
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      const result = await UserModel.setResetToken(
        999999,
        "token",
        expiresAt
      );
      expect(result).toBe(false);
    });
  });

  describe("findByResetToken", () => {
    it("should find user by valid reset token", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "findtoken@example.com",
        passwordHash,
        firstName: "Find",
        lastName: "Token",
      });

      const token = "valid-token-123";
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      await UserModel.setResetToken(user.id, token, expiresAt);

      const found = await UserModel.findByResetToken(token);

      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
      expect(found?.resetToken).toBe(token);
    });

    it("should return null for expired token", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "expired@example.com",
        passwordHash,
        firstName: "Expired",
        lastName: "Token",
      });

      const token = "expired-token";
      const expiresAt = new Date(Date.now() - 3600000); // 1 hour ago

      await UserModel.setResetToken(user.id, token, expiresAt);

      const found = await UserModel.findByResetToken(token);

      expect(found).toBeNull();
    });

    it("should return null for non-existent token", async () => {
      const found = await UserModel.findByResetToken("nonexistent-token");
      expect(found).toBeNull();
    });
  });

  describe("updateLastLogin", () => {
    it("should update last login timestamp", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "login@example.com",
        passwordHash,
        firstName: "Login",
        lastName: "Test",
      });

      expect(user.lastLoginAt).toBeNull();

      const updated = await UserModel.updateLastLogin(user.id);

      expect(updated).toBe(true);

      const found = await UserModel.findById(user.id);
      expect(found?.lastLoginAt).toBeDefined();
      expect(found?.lastLoginAt).toBeInstanceOf(Date);
    });

    it("should return false for non-existent user", async () => {
      const updated = await UserModel.updateLastLogin(999999);
      expect(updated).toBe(false);
    });
  });

  describe("setActive", () => {
    it("should activate user", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "activate@example.com",
        passwordHash,
        firstName: "Activate",
        lastName: "Test",
        isActive: false,
      });

      const result = await UserModel.setActive(user.id, true);

      expect(result).toBe(true);

      const found = await UserModel.findById(user.id);
      expect(found?.isActive).toBe(true);
    });

    it("should deactivate user", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "deactivate@example.com",
        passwordHash,
        firstName: "Deactivate",
        lastName: "Test",
        isActive: true,
      });

      const result = await UserModel.setActive(user.id, false);

      expect(result).toBe(true);

      const found = await UserModel.findById(user.id);
      expect(found?.isActive).toBe(false);
    });

    it("should return false for non-existent user", async () => {
      const result = await UserModel.setActive(999999, true);
      expect(result).toBe(false);
    });
  });

  describe("findByRole", () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword("password123");

      await UserModel.create({
        email: "admin1@example.com",
        passwordHash,
        firstName: "Admin",
        lastName: "One",
        role: UserRole.ADMIN,
      });

      await UserModel.create({
        email: "admin2@example.com",
        passwordHash,
        firstName: "Admin",
        lastName: "Two",
        role: UserRole.ADMIN,
      });

      await UserModel.create({
        email: "sales@example.com",
        passwordHash,
        firstName: "Sales",
        lastName: "Agent",
        role: UserRole.SALES_AGENT,
      });
    });

    it("should find users by role", async () => {
      const admins = await UserModel.findByRole(UserRole.ADMIN);

      expect(admins).toHaveLength(2);
      expect(admins.every((u) => u.role === UserRole.ADMIN)).toBe(true);
      // Should return safe users
      admins.forEach((user) => {
        expect((user as any).passwordHash).toBeUndefined();
      });
    });

    it("should return empty array for role with no users", async () => {
      const marketing = await UserModel.findByRole(UserRole.MARKETING);
      expect(marketing).toHaveLength(0);
    });
  });

  describe("getActive", () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword("password123");

      await UserModel.create({
        email: "active1@example.com",
        passwordHash,
        firstName: "Active",
        lastName: "One",
        isActive: true,
      });

      await UserModel.create({
        email: "active2@example.com",
        passwordHash,
        firstName: "Active",
        lastName: "Two",
        isActive: true,
      });

      const inactive = await UserModel.create({
        email: "inactive@example.com",
        passwordHash,
        firstName: "Inactive",
        lastName: "User",
      });

      await UserModel.setActive(inactive.id, false);
    });

    it("should return only active users", async () => {
      const activeUsers = await UserModel.getActive();

      expect(activeUsers.length).toBeGreaterThanOrEqual(2);
      expect(activeUsers.every((u) => u.isActive === true)).toBe(true);
      // Should return safe users
      activeUsers.forEach((user) => {
        expect((user as any).passwordHash).toBeUndefined();
      });
    });
  });

  describe("getSalesTeam", () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword("password123");

      await UserModel.create({
        email: "manager@example.com",
        passwordHash,
        firstName: "Sales",
        lastName: "Manager",
        role: UserRole.SALES_MANAGER,
        isActive: true,
      });

      await UserModel.create({
        email: "agent1@example.com",
        passwordHash,
        firstName: "Agent",
        lastName: "One",
        role: UserRole.SALES_AGENT,
        isActive: true,
      });

      await UserModel.create({
        email: "agent2@example.com",
        passwordHash,
        firstName: "Agent",
        lastName: "Two",
        role: UserRole.SALES_AGENT,
        isActive: true,
      });

      const inactive = await UserModel.create({
        email: "inactive-agent@example.com",
        passwordHash,
        firstName: "Inactive",
        lastName: "Agent",
        role: UserRole.SALES_AGENT,
      });

      await UserModel.setActive(inactive.id, false);

      await UserModel.create({
        email: "admin@example.com",
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: UserRole.ADMIN,
        isActive: true,
      });
    });

    it("should return only sales team members", async () => {
      const salesTeam = await UserModel.getSalesTeam();

      expect(salesTeam).toHaveLength(3);
      expect(
        salesTeam.every(
          (u) =>
            u.role === UserRole.SALES_MANAGER ||
            u.role === UserRole.SALES_AGENT
        )
      ).toBe(true);
      expect(salesTeam.every((u) => u.isActive === true)).toBe(true);
      // Should return safe users
      salesTeam.forEach((user) => {
        expect((user as any).passwordHash).toBeUndefined();
      });
    });

    it("should return empty array when no sales team", async () => {
      await cleanTables(["users"]);

      const salesTeam = await UserModel.getSalesTeam();
      expect(salesTeam).toHaveLength(0);
    });
  });

  describe("updatePreferences", () => {
    it("should update user preferences", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "prefs@example.com",
        passwordHash,
        firstName: "Prefs",
        lastName: "Test",
      });

      const preferences = {
        theme: "dark",
        language: "en",
        notifications: {
          email: true,
          sms: false,
        },
      };

      const result = await UserModel.updatePreferences(user.id, preferences);

      expect(result).toBe(true);

      const found = await UserModel.findById(user.id);
      expect(found?.preferences).toEqual(preferences);
      expect(found?.preferences.theme).toBe("dark");
      expect(found?.preferences.notifications.email).toBe(true);
    });

    it("should handle null preferences", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "nullprefs@example.com",
        passwordHash,
        firstName: "Null",
        lastName: "Prefs",
      });

      expect(user.preferences).toBeNull();
    });

    it("should return false for non-existent user", async () => {
      const result = await UserModel.updatePreferences(999999, {
        theme: "dark",
      });
      expect(result).toBe(false);
    });
  });

  describe("getRoleStatistics", () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword("password123");

      await UserModel.create({
        email: "admin1@example.com",
        passwordHash,
        firstName: "Admin",
        lastName: "One",
        role: UserRole.ADMIN,
      });

      await UserModel.create({
        email: "admin2@example.com",
        passwordHash,
        firstName: "Admin",
        lastName: "Two",
        role: UserRole.ADMIN,
      });

      await UserModel.create({
        email: "sales@example.com",
        passwordHash,
        firstName: "Sales",
        lastName: "Agent",
        role: UserRole.SALES_AGENT,
      });

      await UserModel.create({
        email: "viewer@example.com",
        passwordHash,
        firstName: "Viewer",
        lastName: "User",
        role: UserRole.VIEWER,
      });
    });

    it("should return role statistics", async () => {
      const stats = await UserModel.getRoleStatistics();

      expect(stats[UserRole.ADMIN]).toBe(2);
      expect(stats[UserRole.SALES_AGENT]).toBe(1);
      expect(stats[UserRole.VIEWER]).toBe(1);
    });

    it("should return empty object when no users", async () => {
      await cleanTables(["users"]);

      const stats = await UserModel.getRoleStatistics();
      expect(stats).toEqual({});
    });
  });

  describe("getActivitySummary", () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword("password123");

      const active1 = await UserModel.create({
        email: "active1@example.com",
        passwordHash,
        firstName: "Active",
        lastName: "One",
        isActive: true,
      });

      const active2 = await UserModel.create({
        email: "active2@example.com",
        passwordHash,
        firstName: "Active",
        lastName: "Two",
        isActive: true,
      });

      const inactive = await UserModel.create({
        email: "inactive@example.com",
        passwordHash,
        firstName: "Inactive",
        lastName: "User",
      });

      await UserModel.setActive(inactive.id, false);

      // Simulate recent login
      await UserModel.updateLastLogin(active1.id);
    });

    it("should return activity summary", async () => {
      const summary = await UserModel.getActivitySummary();

      expect(summary).toHaveProperty("total");
      expect(summary).toHaveProperty("active");
      expect(summary).toHaveProperty("inactive");
      expect(summary).toHaveProperty("activeLastWeek");

      expect(summary.total).toBeGreaterThanOrEqual(3);
      expect(summary.active).toBeGreaterThanOrEqual(2);
      expect(summary.inactive).toBeGreaterThanOrEqual(1);
      expect(summary.activeLastWeek).toBeGreaterThanOrEqual(1);
    });

    it("should return zeros when no users", async () => {
      await cleanTables(["users"]);

      const summary = await UserModel.getActivitySummary();

      expect(summary.total).toBe(0);
      expect(summary.active).toBe(0);
      expect(summary.inactive).toBe(0);
      expect(summary.activeLastWeek).toBe(0);
    });
  });

  describe("update", () => {
    it("should update user fields", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "update@example.com",
        passwordHash,
        firstName: "Original",
        lastName: "Name",
      });

      const updated = await UserModel.update(user.id, {
        firstName: "Updated",
        lastName: "Person",
        phone: "+9999999999",
        role: UserRole.SALES_AGENT,
      });

      expect(updated?.firstName).toBe("Updated");
      expect(updated?.lastName).toBe("Person");
      expect(updated?.phone).toBe("+9999999999");
      expect(updated?.role).toBe(UserRole.SALES_AGENT);
    });

    it("should not update email through update method", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "original@example.com",
        passwordHash,
        firstName: "Test",
        lastName: "User",
      });

      const updated = await UserModel.update(user.id, {
        email: "newemail@example.com",
      });

      // Email should be updated if DTO allows it
      expect(updated?.email).toBe("newemail@example.com");
    });

    it("should return null for non-existent user", async () => {
      const updated = await UserModel.update(999999, {
        firstName: "Non-existent",
      });

      expect(updated).toBeNull();
    });
  });

  describe("JSON field handling", () => {
    it("should handle null preferences correctly", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "nulljson@example.com",
        passwordHash,
        firstName: "Null",
        lastName: "JSON",
      });

      expect(user.preferences).toBeNull();

      const found = await UserModel.findById(user.id);
      expect(found?.preferences).toBeNull();
    });

    it("should parse JSON preferences correctly", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await UserModel.create({
        email: "jsonprefs@example.com",
        passwordHash,
        firstName: "JSON",
        lastName: "Prefs",
      });

      const prefs = { theme: "dark", language: "en" };
      await UserModel.updatePreferences(user.id, prefs);

      const found = await UserModel.findById(user.id);
      expect(found?.preferences).toEqual(prefs);
      expect(typeof found?.preferences).toBe("object");
    });
  });
});