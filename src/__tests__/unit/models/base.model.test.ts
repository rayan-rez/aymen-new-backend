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
  protected tableName = "test_table";

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

  public testMapToDatabase(data: any): Record<string, any> {
    return this.mapToDatabase(data);
  }
}

const testModel = new TestModel();

describe("BaseModel", () => {
  beforeEach(async () => {
    await db("test_table").del();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await db("test_table").del();
    await db.destroy();
  });

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

    it("should handle creation with null values", async () => {
      const data: CreateTestDto = { name: "Test Name", value: null };
      const created = await testModel.create(data);

      expect(created).toBeDefined();
      expect(created.value).toBeNull();
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

    it("should exclude soft-deleted records by default", async () => {
      const created = await testModel.create({ name: "To Delete" });
      await testModel.softDelete(created.id);

      const foundWithout = await testModel.findById(created.id);
      expect(foundWithout).toBeNull();
    });

    it("should include deleted records when specified", async () => {
      const created = await testModel.create({ name: "To Delete 2" });
      await testModel.softDelete(created.id);

      const foundWith = await testModel.findById(created.id, true);
      expect(foundWith).toBeDefined();
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
      expect(results[0].name).toBe("Record 3");
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

    it("should not update soft-deleted records", async () => {
      const created = await testModel.create({ name: "To Delete" });
      await testModel.softDelete(created.id);

      const updated = await testModel.update(created.id, { name: "Updated" });
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

      const foundWithDeleted = await testModel.findById(created.id, true);
      expect(foundWithDeleted?.deletedAt).not.toBeNull();
    });

    it("should return false for non-existent id", async () => {
      const deleted = await testModel.softDelete(999999);
      expect(deleted).toBe(false);
    });

    it("should return false when already deleted", async () => {
      const created = await testModel.create({ name: "To Delete" });
      await testModel.softDelete(created.id);

      const deletedAgain = await testModel.softDelete(created.id);
      expect(deletedAgain).toBe(false);
    });
  });

  describe("restore", () => {
    it("should restore soft-deleted record", async () => {
      const created = await testModel.create({ name: "To Restore" });
      await testModel.softDelete(created.id);

      const restored = await testModel.restore(created.id);
      expect(restored).toBe(true);

      const found = await testModel.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.deletedAt).toBeNull();
    });

    it("should return false for non-deleted record", async () => {
      const created = await testModel.create({ name: "Not Deleted" });
      const restored = await testModel.restore(created.id);
      expect(restored).toBe(false);
    });
  });

  describe("findOne", () => {
    beforeEach(async () => {
      await testModel.create({ name: "Unique", value: "Special" });
      await testModel.create({ name: "Other", value: "Normal" });
    });

    it("should find one record matching conditions", async () => {
      const found = await testModel.findOne({ value: "Special" });
      expect(found).toBeDefined();
      expect(found?.name).toBe("Unique");
    });

    it("should return null when no match", async () => {
      const found = await testModel.findOne({ value: "Nonexistent" });
      expect(found).toBeNull();
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

  describe("exists", () => {
    beforeEach(async () => {
      await testModel.create({ name: "Exists Test" });
    });

    it("should return true when record exists", async () => {
      const exists = await testModel.exists({ name: "Exists Test" });
      expect(exists).toBe(true);
    });

    it("should return false when record does not exist", async () => {
      const exists = await testModel.exists({ name: "Nonexistent" });
      expect(exists).toBe(false);
    });
  });

  describe("paginate", () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        await testModel.create({ name: `Item ${i}` });
      }
    });

    it("should return paginated results", async () => {
      const result = await testModel.paginate({ page: 1, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(3);
    });
  });

  describe("delete (hard delete)", () => {
    it("should permanently delete record", async () => {
      const created = await testModel.create({ name: "To Hard Delete" });
      const deleted = await testModel.delete(created.id);
      expect(deleted).toBe(true);

      const found = await testModel.findById(created.id, true);
      expect(found).toBeNull();
    });
  });

  describe("transaction", () => {
    it("should execute transaction successfully", async () => {
      const trx = await testModel.testBeginTransaction();

      try {
        await trx("test_table").insert({ name: "In Trx" });
        await trx.commit();

        const found = await testModel.findWhere({ name: "In Trx" });
        expect(found).toHaveLength(1);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });

    it("should rollback on error", async () => {
      const trx = await testModel.testBeginTransaction();

      try {
        await trx("test_table").insert({ name: "To Rollback" });
        await trx.rollback();

        const found = await testModel.findWhere({ name: "To Rollback" });
        expect(found).toHaveLength(0);
      } catch (error) {
        await trx.rollback();
      }
    });
  });

  describe("mapToDatabase", () => {
    it("should map camelCase to snake_case", () => {
      const data = {
        testField: "value",
        anotherField: "value2",
      };
      const mapped = testModel.testMapToDatabase(data);
      expect(mapped.test_field).toBe("value");
      expect(mapped.another_field).toBe("value2");
    });

    it("should serialize arrays to JSON", () => {
      const data = { arrayField: [1, 2, 3] };
      const mapped = testModel.testMapToDatabase(data);
      expect(mapped.array_field).toBe(JSON.stringify([1, 2, 3]));
    });

    it("should serialize objects to JSON", () => {
      const data = { objectField: { key: "val" } };
      const mapped = testModel.testMapToDatabase(data);
      expect(mapped.object_field).toBe(JSON.stringify({ key: "val" }));
    });

    it("should skip undefined values", () => {
      const data = { defined: "yes", undefinedField: undefined };
      const mapped = testModel.testMapToDatabase(data);
      expect(mapped.defined).toBe("yes");
      expect("undefined_field" in mapped).toBe(false);
    });

    it("should not serialize Date objects", () => {
      const date = new Date();
      const data = { dateField: date };
      const mapped = testModel.testMapToDatabase(data);
      expect(mapped.date_field).toBe(date);
    });
  });
});
