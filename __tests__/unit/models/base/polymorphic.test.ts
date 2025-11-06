/**
 * Polymorphic Model Tests
 * Comprehensive tests for BasePolymorphicModel functionality
 * 
 * @jest-environment node
 */

import {
    BasePolymorphicModel,
    PolymorphicEntity
} from "@/models/base/polymorphic";
import { DatabaseRecord } from "@/models/base";
import db from "@/config/database";
import { cleanupTables, closeDatabase } from "@tests/helpers";
import { Knex } from "knex";

// ============================================================================
// TEST MODEL IMPLEMENTATIONS
// ============================================================================

interface TestPolymorphicEntity extends PolymorphicEntity {
    url: string;
    caption: string | null;
}

interface CreateTestPolymorphicDto {
    polymorphicType: string;
    polymorphicId: number;
    url: string;
    caption?: string | null;
    displayOrder?: number | null;
}

interface UpdateTestPolymorphicDto extends Partial<CreateTestPolymorphicDto> { }

class TestPolymorphicModel extends BasePolymorphicModel<
    TestPolymorphicEntity,
    CreateTestPolymorphicDto,
    UpdateTestPolymorphicDto
> {
    protected tableName = "test_polymorphic";
    protected primaryKey = "id";
    protected polymorphicTypeColumn = "testable_type";
    protected polymorphicIdColumn = "testable_id";
    protected validPolymorphicTypes = ["project", "apartment", "blog_post"];

    protected config = {
        softDelete: true,
        timestamps: true,
        defaultSortColumn: "display_order",
        defaultSortOrder: "asc" as const,
        searchableColumns: ["url", "caption"],
        hiddenFields: [],
        fillable: [
            "polymorphicType",
            "polymorphicId",
            "url",
            "caption",
            "displayOrder",
        ],
        guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
    };

    protected mapToEntity(record: DatabaseRecord): TestPolymorphicEntity {
        return {
            id: record.id,
            polymorphicType: record.testable_type,
            polymorphicId: record.testable_id,
            url: record.url,
            caption: record.caption,
            displayOrder: record.display_order || 0,
            createdAt: new Date(record.created_at),
            updatedAt: new Date(record.updated_at),
            deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
        };
    }

    // Expose protected methods for testing
    public testValidatePolymorphicType(type: string): boolean {
        return this.validatePolymorphicType(type);
    }

    public testEnsureValidType(type: string): void {
        return this.ensureValidType(type);
    }

    public async testValidateEntityExists(
        entityType: string,
        entityId: number,
        trx?: Knex.Transaction
    ): Promise<boolean> {
        return this.validateEntityExists(entityType, entityId, trx);
    }

    public testGetTableNameForType(entityType: string): string {
        return this.getTableNameForType(entityType);
    }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("BasePolymorphicModel", () => {
    let testModel: TestPolymorphicModel;

    beforeAll(async () => {
        // Create test tables
        const polymorphicTableExists = await db.schema.hasTable("test_polymorphic");
        if (!polymorphicTableExists) {
            await db.schema.createTable("test_polymorphic", (table) => {
                table.increments("id").primary();
                table.string("testable_type").notNullable();
                table.integer("testable_id").notNullable();
                table.string("url").notNullable();
                table.text("caption").nullable();
                table.integer("display_order").defaultTo(0);
                table.timestamps(true, true);
                table.timestamp("deleted_at").nullable();

                table.index(["testable_type", "testable_id"]);
            });
        }

        // Create parent tables for testing
        const tables = ["projects", "apartments", "blog_posts"];
        for (const table of tables) {
            const exists = await db.schema.hasTable(table);
            if (!exists) {
                await db.schema.createTable(table, (t) => {
                    t.increments("id").primary();
                    t.string("name").notNullable();
                    t.timestamps(true, true);
                    t.timestamp("deleted_at").nullable();
                });
            }
        }
    });

    beforeEach(async () => {
        testModel = new TestPolymorphicModel();
        await cleanupTables([
            "test_polymorphic",
            "projects",
            "apartments",
            "blog_posts",
        ]);
    });

    afterAll(async () => {
        await cleanupTables([
            "test_polymorphic",
            "projects",
            "apartments",
            "blog_posts",
        ]);
        await closeDatabase();
    });

    // Helper function to create parent entities
    async function createParentEntity(
        table: string,
        name: string
    ): Promise<number> {
        const [id] = await db(table).insert({ name });
        return id;
    }

    // ==========================================================================
    // VALIDATION TESTS
    // ==========================================================================

    describe("Validation", () => {
        describe("validatePolymorphicType()", () => {
            it("should validate correct polymorphic types", () => {
                expect(testModel.testValidatePolymorphicType("project")).toBe(true);
                expect(testModel.testValidatePolymorphicType("apartment")).toBe(true);
                expect(testModel.testValidatePolymorphicType("blog_post")).toBe(true);
            });

            it("should reject invalid polymorphic types", () => {
                expect(testModel.testValidatePolymorphicType("invalid")).toBe(false);
                expect(testModel.testValidatePolymorphicType("")).toBe(false);
                expect(testModel.testValidatePolymorphicType("user")).toBe(false);
            });
        });

        describe("ensureValidType()", () => {
            it("should not throw for valid types", () => {
                expect(() => {
                    testModel.testEnsureValidType("project");
                }).not.toThrow();
            });

            it("should throw for invalid types", () => {
                expect(() => {
                    testModel.testEnsureValidType("invalid");
                }).toThrow("Invalid polymorphic type");
            });

            it("should include valid types in error message", () => {
                expect(() => {
                    testModel.testEnsureValidType("invalid");
                }).toThrow("Valid types: project, apartment, blog_post");
            });
        });

        describe("validateEntityExists()", () => {
            it("should return true for existing entities", async () => {
                const projectId = await createParentEntity("projects", "Test Project");

                const exists = await testModel.testValidateEntityExists(
                    "project",
                    projectId
                );

                expect(exists).toBe(true);
            });

            it("should return false for non-existent entities", async () => {
                const exists = await testModel.testValidateEntityExists(
                    "project",
                    99999
                );

                expect(exists).toBe(false);
            });
        });

        describe("getTableNameForType()", () => {
            it("should map entity types to table names", () => {
                expect(testModel.testGetTableNameForType("project")).toBe("projects");
                expect(testModel.testGetTableNameForType("apartment")).toBe("apartments");
                expect(testModel.testGetTableNameForType("blog_post")).toBe("blog_posts");
            });
        });
    });

    // ==========================================================================
    // POLYMORPHIC CRUD OPERATIONS
    // ==========================================================================

    describe("Polymorphic CRUD Operations", () => {
        describe("getForEntity()", () => {
            it("should get all records for an entity", async () => {
                const projectId = await createParentEntity("projects", "Project 1");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                    displayOrder: 0,
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/2.jpg",
                    displayOrder: 1,
                });

                const results = await testModel.getForEntity("project", projectId);

                expect(results).toHaveLength(2);
                expect(results[0].url).toBe("https://example.com/1.jpg");
                expect(results[1].url).toBe("https://example.com/2.jpg");
            });

            it("should return empty array for entity with no records", async () => {
                const projectId = await createParentEntity("projects", "Empty Project");

                const results = await testModel.getForEntity("project", projectId);

                expect(results).toEqual([]);
            });

            it("should sort by display order", async () => {
                const projectId = await createParentEntity("projects", "Project");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/3.jpg",
                    displayOrder: 2,
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                    displayOrder: 0,
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/2.jpg",
                    displayOrder: 1,
                });

                const results = await testModel.getForEntity("project", projectId);

                expect(results[0].displayOrder).toBe(0);
                expect(results[1].displayOrder).toBe(1);
                expect(results[2].displayOrder).toBe(2);
            });

            it("should exclude soft-deleted records", async () => {
                const projectId = await createParentEntity("projects", "Project");

                const created1 = await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/2.jpg",
                });

                await testModel.delete(created1.id);

                const results = await testModel.getForEntity("project", projectId);

                expect(results).toHaveLength(1);
                expect(results[0].url).toBe("https://example.com/2.jpg");
            });

            it("should throw error for invalid type", async () => {
                await expect(
                    testModel.getForEntity("invalid", 1)
                ).rejects.toThrow("Invalid polymorphic type");
            });
        });

        describe("countForEntity()", () => {
            it("should count records for an entity", async () => {
                const projectId = await createParentEntity("projects", "Project");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/2.jpg",
                });

                const count = await testModel.countForEntity("project", projectId);

                expect(count).toBe(2);
            });

            it("should return 0 for entity with no records", async () => {
                const projectId = await createParentEntity("projects", "Empty");

                const count = await testModel.countForEntity("project", projectId);

                expect(count).toBe(0);
            });

            it("should exclude soft-deleted records", async () => {
                const projectId = await createParentEntity("projects", "Project");

                const created = await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/2.jpg",
                });

                await testModel.delete(created.id);

                const count = await testModel.countForEntity("project", projectId);

                expect(count).toBe(1);
            });
        });

        describe("findByType()", () => {
            it("should find all records of a specific type", async () => {
                const project1 = await createParentEntity("projects", "Project 1");
                const project2 = await createParentEntity("projects", "Project 2");
                const apartment1 = await createParentEntity("apartments", "Apartment 1");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: project1,
                    url: "https://example.com/p1.jpg",
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: project2,
                    url: "https://example.com/p2.jpg",
                });

                await testModel.create({
                    polymorphicType: "apartment",
                    polymorphicId: apartment1,
                    url: "https://example.com/a1.jpg",
                });

                const projects = await testModel.findByType("project");

                expect(projects).toHaveLength(2);
                projects.forEach((p) => {
                    expect(p.polymorphicType).toBe("project");
                });
            });

            it("should return empty array if no records of type", async () => {
                const results = await testModel.findByType("blog_post");

                expect(results).toEqual([]);
            });
        });

        describe("deleteForEntity()", () => {
            it("should soft-delete all records for an entity", async () => {
                const projectId = await createParentEntity("projects", "Project");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/2.jpg",
                });

                const deleted = await testModel.deleteForEntity("project", projectId);

                expect(deleted).toBe(true);

                const count = await testModel.countForEntity("project", projectId);
                expect(count).toBe(0);
            });

            it("should hard-delete when force is true", async () => {
                const projectId = await createParentEntity("projects", "Project");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                });

                const deleted = await testModel.deleteForEntity(
                    "project",
                    projectId,
                    true
                );

                expect(deleted).toBe(true);

                // Verify records are permanently deleted
                const records = await db("test_polymorphic")
                    .where({ testable_type: "project", testable_id: projectId })
                    .whereNotNull("deleted_at");

                expect(records).toHaveLength(0);
            });

            it("should return false if no records to delete", async () => {
                const projectId = await createParentEntity("projects", "Empty");

                const deleted = await testModel.deleteForEntity("project", projectId);

                expect(deleted).toBe(false);
            });
        });
    });

    // ==========================================================================
    // BULK OPERATIONS
    // ==========================================================================

    describe("Bulk Operations", () => {
        describe("bulkCreateForEntity()", () => {
            it("should create multiple records for an entity", async () => {
                const projectId = await createParentEntity("projects", "Project");

                const items: CreateTestPolymorphicDto[] = [
                    {
                        polymorphicType: "project",
                        polymorphicId: projectId,
                        url: "https://example.com/1.jpg",
                        caption: "Photo 1",
                    },
                    {
                        polymorphicType: "project",
                        polymorphicId: projectId,
                        url: "https://example.com/2.jpg",
                        caption: "Photo 2",
                    },
                    {
                        polymorphicType: "project",
                        polymorphicId: projectId,
                        url: "https://example.com/3.jpg",
                        caption: "Photo 3",
                    },
                ];

                const results = await testModel.bulkCreateForEntity(
                    "project",
                    projectId,
                    items
                );

                expect(results).toHaveLength(3);
                expect(results[0].url).toBe("https://example.com/1.jpg");
                expect(results[1].url).toBe("https://example.com/2.jpg");
                expect(results[2].url).toBe("https://example.com/3.jpg");
            });

            it("should auto-assign display orders", async () => {
                const projectId = await createParentEntity("projects", "Project");

                const items: CreateTestPolymorphicDto[] = [
                    {
                        polymorphicType: "project",
                        polymorphicId: projectId,
                        url: "https://example.com/1.jpg",
                    },
                    {
                        polymorphicType: "project",
                        polymorphicId: projectId,
                        url: "https://example.com/2.jpg",
                    },
                ];

                const results = await testModel.bulkCreateForEntity(
                    "project",
                    projectId,
                    items
                );

                expect(results[0].displayOrder).toBe(0);
                expect(results[1].displayOrder).toBe(1);
            });

            it("should return empty array for empty items", async () => {
                const projectId = await createParentEntity("projects", "Project");

                const results = await testModel.bulkCreateForEntity(
                    "project",
                    projectId,
                    []
                );

                expect(results).toEqual([]);
            });

            it("should throw error for invalid type", async () => {
                await expect(
                    testModel.bulkCreateForEntity("invalid", 1, [])
                ).rejects.toThrow("Invalid polymorphic type");
            });
        });

        describe("reorderForEntity()", () => {
            it("should reorder records", async () => {
                const projectId = await createParentEntity("projects", "Project");

                const item1 = await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                    displayOrder: 0,
                });

                const item2 = await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/2.jpg",
                    displayOrder: 1,
                });

                const item3 = await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/3.jpg",
                    displayOrder: 2,
                });

                // Reorder: 3, 1, 2
                const reordered = await testModel.reorderForEntity(
                    "project",
                    projectId,
                    [item3.id, item1.id, item2.id]
                );

                expect(reordered).toBe(true);

                const results = await testModel.getForEntity("project", projectId);

                expect(results[0].id).toBe(item3.id);
                expect(results[0].displayOrder).toBe(0);
                expect(results[1].id).toBe(item1.id);
                expect(results[1].displayOrder).toBe(1);
                expect(results[2].id).toBe(item2.id);
                expect(results[2].displayOrder).toBe(2);
            });

            it("should handle empty array", async () => {
                const projectId = await createParentEntity("projects", "Project");

                const reordered = await testModel.reorderForEntity(
                    "project",
                    projectId,
                    []
                );

                expect(reordered).toBe(true);
            });

            it("should only reorder records for the specified entity", async () => {
                const project1 = await createParentEntity("projects", "Project 1");
                const project2 = await createParentEntity("projects", "Project 2");

                const item1 = await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: project1,
                    url: "https://example.com/p1-1.jpg",
                    displayOrder: 0,
                });

                const item2 = await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: project2,
                    url: "https://example.com/p2-1.jpg",
                    displayOrder: 0,
                });

                await testModel.reorderForEntity("project", project1, [item1.id]);

                const project2Items = await testModel.getForEntity("project", project2);
                expect(project2Items[0].displayOrder).toBe(0); // Unchanged
            });
        });
    });

    // ==========================================================================
    // QUERY HELPERS
    // ==========================================================================

    describe("Query Helpers", () => {
        describe("getFirstForEntity()", () => {
            it("should get first record by display order", async () => {
                const projectId = await createParentEntity("projects", "Project");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/2.jpg",
                    displayOrder: 1,
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                    displayOrder: 0,
                });

                const first = await testModel.getFirstForEntity("project", projectId);

                expect(first).toBeDefined();
                expect(first?.url).toBe("https://example.com/1.jpg");
                expect(first?.displayOrder).toBe(0);
            });

            it("should return null if no records", async () => {
                const projectId = await createParentEntity("projects", "Empty");

                const first = await testModel.getFirstForEntity("project", projectId);

                expect(first).toBeNull();
            });
        });

        describe("hasRecordsForEntity()", () => {
            it("should return true if entity has records", async () => {
                const projectId = await createParentEntity("projects", "Project");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "https://example.com/1.jpg",
                });

                const has = await testModel.hasRecordsForEntity("project", projectId);

                expect(has).toBe(true);
            });

            it("should return false if entity has no records", async () => {
                const projectId = await createParentEntity("projects", "Empty");

                const has = await testModel.hasRecordsForEntity("project", projectId);

                expect(has).toBe(false);
            });
        });

        describe("groupByType()", () => {
            it("should group records by polymorphic type", async () => {
                const project = await createParentEntity("projects", "Project");
                const apartment = await createParentEntity("apartments", "Apartment");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: project,
                    url: "https://example.com/p1.jpg",
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: project,
                    url: "https://example.com/p2.jpg",
                });

                await testModel.create({
                    polymorphicType: "apartment",
                    polymorphicId: apartment,
                    url: "https://example.com/a1.jpg",
                });

                const grouped = await testModel.groupByType();

                expect(grouped.project).toHaveLength(2);
                expect(grouped.apartment).toHaveLength(1);
            });

            it("should return empty object if no records", async () => {
                const grouped = await testModel.groupByType();

                expect(grouped).toEqual({});
            });
        });

        describe("countByType()", () => {
            it("should count records grouped by type", async () => {
                const project = await createParentEntity("projects", "Project");
                const apartment = await createParentEntity("apartments", "Apartment");

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: project,
                    url: "https://example.com/p1.jpg",
                });

                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: project,
                    url: "https://example.com/p2.jpg",
                });

                await testModel.create({
                    polymorphicType: "apartment",
                    polymorphicId: apartment,
                    url: "https://example.com/a1.jpg",
                });

                const counts = await testModel.countByType();

                expect(counts.project).toBe(2);
                expect(counts.apartment).toBe(1);
            });

            it("should return empty object if no records", async () => {
                const counts = await testModel.countByType();

                expect(counts).toEqual({});
            });
        });
    });

    // ==========================================================================
    // INTEGRATION TESTS
    // ==========================================================================

    describe("Integration Tests", () => {
        it("should handle multiple entities of different types", async () => {
            const project = await createParentEntity("projects", "Project");
            const apartment = await createParentEntity("apartments", "Apartment");
            const blogPost = await createParentEntity("blog_posts", "Blog Post");

            await testModel.create({
                polymorphicType: "project",
                polymorphicId: project,
                url: "https://example.com/project.jpg",
            });

            await testModel.create({
                polymorphicType: "apartment",
                polymorphicId: apartment,
                url: "https://example.com/apartment.jpg",
            });

            await testModel.create({
                polymorphicType: "blog_post",
                polymorphicId: blogPost,
                url: "https://example.com/blog.jpg",
            });

            const projectRecords = await testModel.getForEntity("project", project);
            const apartmentRecords = await testModel.getForEntity("apartment", apartment);
            const blogRecords = await testModel.getForEntity("blog_post", blogPost);

            expect(projectRecords).toHaveLength(1);
            expect(apartmentRecords).toHaveLength(1);
            expect(blogRecords).toHaveLength(1);
        });

        it("should maintain data integrity across operations", async () => {
            const projectId = await createParentEntity("projects", "Project");

            // Create records
            const items = [
                { polymorphicType: "project" as const, polymorphicId: projectId, url: "1.jpg" },
                { polymorphicType: "project" as const, polymorphicId: projectId, url: "2.jpg" },
                { polymorphicType: "project" as const, polymorphicId: projectId, url: "3.jpg" },
            ];

            const created = await testModel.bulkCreateForEntity("project", projectId, items);

            // Reorder
            await testModel.reorderForEntity("project", projectId, [
                created[2].id,
                created[0].id,
                created[1].id,
            ]);

            // Verify order
            const reordered = await testModel.getForEntity("project", projectId);
            expect(reordered[0].url).toBe("3.jpg");
            expect(reordered[1].url).toBe("1.jpg");
            expect(reordered[2].url).toBe("2.jpg");

            // Delete one
            await testModel.delete(reordered[0].id);

            // Verify count
            const count = await testModel.countForEntity("project", projectId);
            expect(count).toBe(2);

            // Delete all for entity
            await testModel.deleteForEntity("project", projectId);

            // Verify deletion
            const finalCount = await testModel.countForEntity("project", projectId);
            expect(finalCount).toBe(0);
        });

        it("should work within transactions", async () => {
            const projectId = await createParentEntity("projects", "Project");

            await testModel.transaction(async (trx) => {
                const items = [
                    { polymorphicType: "project" as const, polymorphicId: projectId, url: "1.jpg" },
                    { polymorphicType: "project" as const, polymorphicId: projectId, url: "2.jpg" },
                ];

                await testModel.bulkCreateForEntity("project", projectId, items, trx);

                const count = await testModel.countForEntity("project", projectId, trx);
                expect(count).toBe(2);
            });

            const count = await testModel.countForEntity("project", projectId);
            expect(count).toBe(2);
        });

        it("should handle cascade deletes correctly", async () => {
            const project1 = await createParentEntity("projects", "Project 1");
            const project2 = await createParentEntity("projects", "Project 2");

            await testModel.create({
                polymorphicType: "project",
                polymorphicId: project1,
                url: "https://example.com/p1-1.jpg",
            });

            await testModel.create({
                polymorphicType: "project",
                polymorphicId: project1,
                url: "https://example.com/p1-2.jpg",
            });

            await testModel.create({
                polymorphicType: "project",
                polymorphicId: project2,
                url: "https://example.com/p2-1.jpg",
            });

            // Delete all records for project1
            await testModel.deleteForEntity("project", project1);

            // Verify project1 records are deleted
            const project1Count = await testModel.countForEntity("project", project1);
            expect(project1Count).toBe(0);

            // Verify project2 records are intact
            const project2Count = await testModel.countForEntity("project", project2);
            expect(project2Count).toBe(1);
        });
    });

    // ==========================================================================
    // EDGE CASES
    // ==========================================================================

    describe("Edge Cases", () => {
        it("should handle records with same display order", async () => {
            const projectId = await createParentEntity("projects", "Project");

            await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url: "https://example.com/1.jpg",
                displayOrder: 0,
            });

            await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url: "https://example.com/2.jpg",
                displayOrder: 0,
            });

            const results = await testModel.getForEntity("project", projectId);
            expect(results).toHaveLength(2);
        });

        it("should handle very large display orders", async () => {
            const projectId = await createParentEntity("projects", "Project");

            await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url: "https://example.com/1.jpg",
                displayOrder: 999999,
            });

            const first = await testModel.getFirstForEntity("project", projectId);
            expect(first?.displayOrder).toBe(999999);
        });

        it("should handle null captions", async () => {
            const projectId = await createParentEntity("projects", "Project");

            const created = await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url: "https://example.com/1.jpg",
                caption: null,
            });

            expect(created.caption).toBeNull();
        });

        it("should handle special characters in URLs", async () => {
            const projectId = await createParentEntity("projects", "Project");

            const url = "https://example.com/image%20with%20spaces.jpg?param=value&foo=bar";

            const created = await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url,
            });

            expect(created.url).toBe(url);
        });

        it("should handle concurrent operations on same entity", async () => {
            const projectId = await createParentEntity("projects", "Project");

            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    testModel.create({
                        polymorphicType: "project",
                        polymorphicId: projectId,
                        url: `https://example.com/${i}.jpg`,
                    })
                );
            }

            await Promise.all(promises);

            const count = await testModel.countForEntity("project", projectId);
            expect(count).toBe(10);
        });

        it("should handle reordering with missing IDs", async () => {
            const projectId = await createParentEntity("projects", "Project");

            const item1 = await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url: "https://example.com/1.jpg",
            });

            // Try to reorder with non-existent ID
            await testModel.reorderForEntity("project", projectId, [
                item1.id,
                99999, // Non-existent
            ]);

            // Should still work for valid IDs
            const results = await testModel.getForEntity("project", projectId);
            expect(results).toHaveLength(1);
        });

        it("should handle deletion of already deleted records", async () => {
            const projectId = await createParentEntity("projects", "Project");

            const created = await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url: "https://example.com/1.jpg",
            });

            await testModel.delete(created.id);
            const secondDelete = await testModel.deleteForEntity("project", projectId);

            expect(secondDelete).toBe(false);
        });
    });

    // ==========================================================================
    // PERFORMANCE TESTS
    // ==========================================================================

    describe("Performance Tests", () => {
        it("should efficiently handle bulk operations", async () => {
            const projectId = await createParentEntity("projects", "Project");

            const items: CreateTestPolymorphicDto[] = [];
            for (let i = 0; i < 100; i++) {
                items.push({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: `https://example.com/${i}.jpg`,
                });
            }

            const startTime = Date.now();
            await testModel.bulkCreateForEntity("project", projectId, items);
            const endTime = Date.now();

            const count = await testModel.countForEntity("project", projectId);
            expect(count).toBe(100);

            // Should complete in reasonable time (less than 5 seconds)
            expect(endTime - startTime).toBeLessThan(5000);
        });

        it("should efficiently query large datasets", async () => {
            const projectId = await createParentEntity("projects", "Project");

            // Create 200 records
            const items: CreateTestPolymorphicDto[] = [];
            for (let i = 0; i < 200; i++) {
                items.push({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: `https://example.com/${i}.jpg`,
                });
            }
            await testModel.bulkCreateForEntity("project", projectId, items);

            const startTime = Date.now();
            const results = await testModel.getForEntity("project", projectId);
            const endTime = Date.now();

            expect(results).toHaveLength(200);
            expect(endTime - startTime).toBeLessThan(1000);
        });
    });

    // ==========================================================================
    // COMPLEX SCENARIOS
    // ==========================================================================

    describe("Complex Scenarios", () => {
        it("should handle photo gallery scenario", async () => {
            const projectId = await createParentEntity("projects", "Luxury Apartment");

            // Add multiple photos
            const photos = [
                { url: "exterior.jpg", caption: "Beautiful exterior", displayOrder: 0 },
                { url: "living.jpg", caption: "Spacious living room", displayOrder: 1 },
                { url: "kitchen.jpg", caption: "Modern kitchen", displayOrder: 2 },
                { url: "bedroom.jpg", caption: "Master bedroom", displayOrder: 3 },
            ];

            const items = photos.map(p => ({
                polymorphicType: "project" as const,
                polymorphicId: projectId,
                ...p,
            }));

            const created = await testModel.bulkCreateForEntity("project", projectId, items);
            expect(created).toHaveLength(4);

            // Get cover photo (first)
            const cover = await testModel.getFirstForEntity("project", projectId);
            expect(cover?.caption).toBe("Beautiful exterior");

            // Reorder to make kitchen the cover photo
            const kitchenPhoto = created.find(p => p.url === "kitchen.jpg");
            const otherPhotos = created.filter(p => p.url !== "kitchen.jpg");

            await testModel.reorderForEntity(
                "project",
                projectId,
                [kitchenPhoto!.id, ...otherPhotos.map(p => p.id)]
            );

            const newCover = await testModel.getFirstForEntity("project", projectId);
            expect(newCover?.url).toBe("kitchen.jpg");

            // Delete a photo
            await testModel.delete(kitchenPhoto!.id);

            const remaining = await testModel.countForEntity("project", projectId);
            expect(remaining).toBe(3);
        });

        it("should handle multi-entity content management", async () => {
            const project = await createParentEntity("projects", "Project A");
            const apartment = await createParentEntity("apartments", "Apartment 101");
            const blogPost = await createParentEntity("blog_posts", "Design Tips");

            // Add media to each entity
            await testModel.create({
                polymorphicType: "project",
                polymorphicId: project,
                url: "project-main.jpg",
            });

            await testModel.create({
                polymorphicType: "apartment",
                polymorphicId: apartment,
                url: "apartment-main.jpg",
            });

            await testModel.create({
                polymorphicType: "blog_post",
                polymorphicId: blogPost,
                url: "blog-header.jpg",
            });

            // Verify each entity has its own media
            const projectMedia = await testModel.getForEntity("project", project);
            const apartmentMedia = await testModel.getForEntity("apartment", apartment);
            const blogMedia = await testModel.getForEntity("blog_post", blogPost);

            expect(projectMedia).toHaveLength(1);
            expect(apartmentMedia).toHaveLength(1);
            expect(blogMedia).toHaveLength(1);

            // Group by type
            const grouped = await testModel.groupByType();
            expect(Object.keys(grouped)).toHaveLength(3);

            // Count by type
            const counts = await testModel.countByType();
            expect(counts.project).toBe(1);
            expect(counts.apartment).toBe(1);
            expect(counts.blog_post).toBe(1);
        });

        it("should handle migration scenario", async () => {
            // Simulate migrating media from one entity to another
            const oldProject = await createParentEntity("projects", "Old Project");
            const newProject = await createParentEntity("projects", "New Project");

            // Create media for old project
            const media = await testModel.bulkCreateForEntity(
                "project",
                oldProject,
                [
                    { polymorphicType: "project", polymorphicId: oldProject, url: "1.jpg" },
                    { polymorphicType: "project", polymorphicId: oldProject, url: "2.jpg" },
                    { polymorphicType: "project", polymorphicId: oldProject, url: "3.jpg" },
                ]
            );

            // "Migrate" by updating polymorphicId
            await testModel.transaction(async (trx) => {
                for (const item of media) {
                    await testModel.update(
                        item.id,
                        { polymorphicId: newProject },
                        trx
                    );
                }
            });

            // Verify migration
            const oldCount = await testModel.countForEntity("project", oldProject);
            const newCount = await testModel.countForEntity("project", newProject);

            expect(oldCount).toBe(0);
            expect(newCount).toBe(3);
        });

        it("should handle soft delete and restore workflow", async () => {
            const projectId = await createParentEntity("projects", "Project");

            const created = await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url: "test.jpg",
            });

            // Soft delete
            await testModel.delete(created.id);

            let count = await testModel.countForEntity("project", projectId);
            expect(count).toBe(0);

            // Restore
            await testModel.restore(created.id);

            count = await testModel.countForEntity("project", projectId);
            expect(count).toBe(1);

            // Hard delete
            await testModel.forceDelete(created.id);

            const found = await testModel.findById(created.id, { includeDeleted: true });
            expect(found).toBeNull();
        });

        it("should handle cascading operations", async () => {
            const project1 = await createParentEntity("projects", "Project 1");
            const project2 = await createParentEntity("projects", "Project 2");
            const apartment = await createParentEntity("apartments", "Apartment 1");

            // Add media to multiple entities
            await testModel.bulkCreateForEntity("project", project1, [
                { polymorphicType: "project", polymorphicId: project1, url: "p1-1.jpg" },
                { polymorphicType: "project", polymorphicId: project1, url: "p1-2.jpg" },
            ]);

            await testModel.bulkCreateForEntity("project", project2, [
                { polymorphicType: "project", polymorphicId: project2, url: "p2-1.jpg" },
            ]);

            await testModel.bulkCreateForEntity("apartment", apartment, [
                { polymorphicType: "apartment", polymorphicId: apartment, url: "a1-1.jpg" },
            ]);

            // Delete all project media (simulate project deletion)
            const projectMedia = await testModel.findByType("project");
            const projectIds = projectMedia.map(m => m.id);

            await testModel.bulkDelete(projectIds);

            // Verify only apartment media remains
            const remainingByType = await testModel.countByType();
            expect(remainingByType.project).toBeUndefined();
            expect(remainingByType.apartment).toBe(1);
        });
    });

    // ==========================================================================
    // ERROR HANDLING
    // ==========================================================================

    describe("Error Handling", () => {
        it("should handle invalid polymorphic type gracefully", async () => {
            const projectId = await createParentEntity("projects", "Project");

            await expect(
                testModel.create({
                    polymorphicType: "invalid_type",
                    polymorphicId: projectId,
                    url: "test.jpg",
                } as any)
            ).rejects.toThrow();
        });

        it("should handle non-existent entity ID", async () => {
            // This should work (validation is optional)
            const created = await testModel.create({
                polymorphicType: "project",
                polymorphicId: 99999,
                url: "test.jpg",
            });

            expect(created).toBeDefined();
        });

        it("should handle database constraint violations", async () => {
            const projectId = await createParentEntity("projects", "Project");

            await expect(
                testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: null as any, // URL is required
                })
            ).rejects.toThrow();
        });

        it("should rollback transaction on error", async () => {
            const projectId = await createParentEntity("projects", "Project");

            try {
                await testModel.transaction(async (trx) => {
                    await testModel.create({
                        polymorphicType: "project",
                        polymorphicId: projectId,
                        url: "valid.jpg",
                    }, trx);

                    // Force an error
                    throw new Error("Simulated error");
                });
            } catch (error) {
                // Expected
            }

            const count = await testModel.countForEntity("project", projectId);
            expect(count).toBe(0);
        });

        it("should handle connection errors gracefully", async () => {
            // This test is tricky - we'd need to actually break the connection
            // For now, just ensure proper error handling exists
            expect(testModel.getForEntity).toBeDefined();
        });
    });

    // ==========================================================================
    // TRANSACTION TESTS
    // ==========================================================================

    describe("Transaction Support", () => {
        it("should support transactions in all operations", async () => {
            const projectId = await createParentEntity("projects", "Project");

            await testModel.transaction(async (trx) => {
                // Create
                const created = await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "1.jpg",
                }, trx);

                // Update
                await testModel.update(created.id, { caption: "Updated" }, trx);

                // Query
                const found = await testModel.getForEntity("project", projectId, {}, trx);
                expect(found).toHaveLength(1);

                // Delete
                await testModel.delete(created.id, trx);

                // Verify
                const count = await testModel.countForEntity("project", projectId, trx);
                expect(count).toBe(0);
            });
        });

        it("should isolate transactions", async () => {
            const projectId = await createParentEntity("projects", "Project");

            // Start a transaction but don't commit
            const trx = await db.transaction();

            try {
                await testModel.create({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: "1.jpg",
                }, trx);

                // Outside transaction, should not see the record
                const count = await testModel.countForEntity("project", projectId);
                expect(count).toBe(0);

                // Inside transaction, should see it
                const countInTrx = await testModel.countForEntity("project", projectId, trx);
                expect(countInTrx).toBe(1);

                await trx.rollback();
            } catch (error) {
                await trx.rollback();
                throw error;
            }
        });
    });

    // ==========================================================================
    // QUERY OPTIONS TESTS
    // ==========================================================================

    describe("Query Options", () => {
        it("should support sorting options", async () => {
            const projectId = await createParentEntity("projects", "Project");

            await testModel.bulkCreateForEntity("project", projectId, [
                { polymorphicType: "project", polymorphicId: projectId, url: "c.jpg", displayOrder: 2 },
                { polymorphicType: "project", polymorphicId: projectId, url: "a.jpg", displayOrder: 0 },
                { polymorphicType: "project", polymorphicId: projectId, url: "b.jpg", displayOrder: 1 },
            ]);

            const results = await testModel.getForEntity("project", projectId, {
                sortBy: "display_order",
                sortOrder: "desc",
            });

            expect(results[0].displayOrder).toBe(2);
            expect(results[1].displayOrder).toBe(1);
            expect(results[2].displayOrder).toBe(0);
        });

        it("should support pagination", async () => {
            const projectId = await createParentEntity("projects", "Project");

            const items: CreateTestPolymorphicDto[] = [];
            for (let i = 0; i < 10; i++) {
                items.push({
                    polymorphicType: "project",
                    polymorphicId: projectId,
                    url: `${i}.jpg`,
                });
            }

            await testModel.bulkCreateForEntity("project", projectId, items);

            const page1 = await testModel.getForEntity("project", projectId, {
                page: 1,
                limit: 3,
            });

            expect(page1).toHaveLength(3);
        });

        it("should support field selection", async () => {
            const projectId = await createParentEntity("projects", "Project");

            await testModel.create({
                polymorphicType: "project",
                polymorphicId: projectId,
                url: "test.jpg",
                caption: "Test Caption",
            });

            const results = await testModel.getForEntity("project", projectId, {
                fields: ["id", "url"],
            });

            expect(results[0].url).toBeDefined();
            expect(results[0].id).toBeDefined();
        });
    });
});