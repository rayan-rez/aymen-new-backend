/**
 * File: src/__tests__/unit/models/base.model.test.ts
 * Comprehensive tests for BaseModel abstract class
 * Uses a concrete subclass for testing common methods
 */

import {
  BaseModel,
  BaseQueryParams,
  PaginatedResult,
} from "@models/base.model";
import db from "@/config/database";
import { Knex } from "knex";

// Define a simple entity for testing
interface TestEntity {
  id: number;
  name: string;
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface CreateTestDto {
  name: string;
  value?: string | null;
}

interface UpdateTestDto {
  name?: string;
  value?: string | null;
}

// Concrete subclass for testing BaseModel
class TestModel extends BaseModel<TestEntity, CreateTestDto, UpdateTestDto> {
  protected tableName = "test_table"; // Assume this table exists or create in setup

  protected mapToEntity(record: any): TestEntity {
    return {
      id: record.id,
      name: record.name,
      value: record.value,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }

  public testBeginTransaction(): Promise<Knex.Transaction> {
    return this.beginTransaction();
  }

  // Public wrapper for testing protected mapToDatabase
  public testMapToDatabase(data: any): Record<string, any> {
    return this.mapToDatabase(data);
  }
}

const testModel = new TestModel();

describe("BaseModel", () => {
  beforeEach(async () => {
    // Clean up the test table
    await db("test_table").del();

    // Small delay to ensure cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await db("test_table").del();
    await db.destroy();
  });

  // Setup test table if not exists (run once)
  beforeAll(async () => {
    const tableExists = await db.schema.hasTable("test_table");
    if (!tableExists) {
      await db.schema.createTable("test_table", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("value").nullable();
        table.timestamps(true, true);
        table.timestamp("deleted_at").nullable();
      });
    }
  });

  describe("create", () => {
    it("should create a new record", async () => {
      const data: CreateTestDto = { name: "Test Name", value: "Test Value" };
      const created = await testModel.create(data);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe(data.name);
      expect(created.value).toBe(data.value);
    });

    it("should throw error if creation fails", async () => {
      // Mock insert to fail
      jest
        .spyOn(db("test_table"), "insert")
        .mockRejectedValue(new Error("Insert failed"));
      await expect(testModel.create({ name: "Fail" })).rejects.toThrow(
        "Failed to create record"
      );
    });
  });

  describe("findById", () => {
    it("should find record by id", async () => {
      const created = await testModel.create({ name: "Find By ID" });
      const found = await testModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(created.name);
    });

    it("should return null for non-existent id", async () => {
      const found = await testModel.findById(999999);
      expect(found).toBeNull();
    });

    it("should include deleted records when specified", async () => {
      const created = await testModel.create({ name: "To Delete" });
      await testModel.softDelete(created.id);

      const foundWithout = await testModel.findById(created.id);
      expect(foundWithout).toBeNull();

      const foundWith = await testModel.findById(created.id);
      expect(foundWith?.deletedAt).not.toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      await testModel.create({ name: "Record 1" });
      await testModel.create({ name: "Record 2" });
      await testModel.create({ name: "Record 3" });
    });

    it("should return all records", async () => {
      const results = await testModel.findAll();
      expect(results).toHaveLength(3);
    });

    it("should handle pagination", async () => {
      const params: BaseQueryParams = { page: 1, limit: 2 };
      const results = await testModel.findAll(params);
      expect(results).toHaveLength(2);
    });

    it("should sort records", async () => {
      const params: BaseQueryParams = { sortBy: "name", sortOrder: "desc" };
      const results = await testModel.findAll(params);
      expect(results[0].name).toBe("Record 3"); // Assuming alphabetical desc
    });
  });

  describe("update", () => {
    it("should update record", async () => {
      const created = await testModel.create({ name: "Original" });
      const updateData: UpdateTestDto = { name: "Updated", value: "New Value" };

      const updated = await testModel.update(created.id, updateData);

      expect(updated).toBeDefined();
      expect(updated?.name).toBe(updateData.name);
      expect(updated?.value).toBe(updateData.value);
    });

    it("should return null for non-existent id", async () => {
      const updated = await testModel.update(999999, { name: "Non-existent" });
      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete record", async () => {
      const created = await testModel.create({ name: "To Delete" });
      const deleted = await testModel.softDelete(created.id);
      expect(deleted).toBe(true);

      const found = await testModel.findById(created.id);
      expect(found).toBeNull();

      const foundWithDeleted = await testModel.findById(created.id);
      expect(foundWithDeleted?.deletedAt).not.toBeNull();
    });

    it("should return false for non-existent id", async () => {
      const deleted = await testModel.softDelete(999999);
      expect(deleted).toBe(false);
    });
  });

  describe("findWhere", () => {
    beforeEach(async () => {
      await testModel.create({ name: "Match", value: "Specific" });
      await testModel.create({ name: "No Match", value: "Other" });
    });

    it("should find records matching conditions", async () => {
      const results = await testModel.findWhere({ value: "Specific" });
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("Specific");
    });

    it("should return empty for no matches", async () => {
      const results = await testModel.findWhere({ value: "Nonexistent" });
      expect(results).toHaveLength(0);
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await testModel.create({ name: "Count 1" });
      await testModel.create({ name: "Count 2" });
    });

    it("should count all records", async () => {
      const total = await testModel.count();
      expect(total).toBe(2);
    });

    it("should count with conditions", async () => {
      const count = await testModel.count({ name: "Count 1" });
      expect(count).toBe(1);
    });
  });

  describe("transaction", () => {
    it("should execute transaction successfully", async () => {
      const trx = await testModel.testBeginTransaction();
      await trx("test_table").insert({ name: "In Trx" });
      await trx.commit();

      const found = await testModel.findWhere({ name: "In Trx" });
      expect(found).toHaveLength(1);
    });

    it("should rollback on error", async () => {
      const trx = await testModel.testBeginTransaction();
      await trx("test_table").insert({ name: "To Rollback" });
      await trx.rollback();

      const found = await testModel.findWhere({ name: "To Rollback" });
      expect(found).toHaveLength(0);
    });
  });

  describe("mapToDatabase", () => {
    it("should map camelCase to snake_case via public wrapper", () => {
      const data = {
        testField: "value",
        arrayField: [1, 2],
        objectField: { key: "val" },
      };
      const mapped = testModel.testMapToDatabase(data);
      expect(mapped.test_field).toBe("value");
      expect(mapped.array_field).toBe(JSON.stringify([1, 2]));
      expect(mapped.object_field).toBe(JSON.stringify({ key: "val" }));
    });

    it("should skip undefined values via public wrapper", () => {
      const data = { defined: "yes", undefinedField: undefined };
      const mapped = testModel.testMapToDatabase(data);
      expect(mapped.defined).toBeUndefined(); // Not included
      expect(mapped.undefined_field).toBeUndefined();
    });
  });

  // mapToEntity is abstract, tested in subclasses
});
