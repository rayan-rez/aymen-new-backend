/**
 * Apartment Model Tests
 * Comprehensive tests for ApartmentModel functionality
 * 
 * @jest-environment node
 */

import ApartmentModel, {
    ApartmentStatus,
    Apartment,
} from "@/models/apartment.model";
import { ProjectStatus } from "@/models/project.model";
import PhotoModel, { PhotoableType } from "@/models/photo.model";
import FloorPlanModel, { PlannableType } from "@/models/floor-plan.model";
import db from "@/config/database";
import {
    cleanupTables,
    closeDatabase,
    uniqueSlug
} from "@tests/helpers";
import { createApartmentDto, createFloorPlanDto, createPhotoDto, createProjectDto, createProject } from "../data-factory"



// ============================================================================
// TEST SUITE
// ============================================================================

describe("ApartmentModel", () => {
    let testProject: any;

    beforeAll(async () => {
        // Ensure required tables exist
        const tables = ["projects", "apartments", "photos", "floor_plans"];
        for (const table of tables) {
            const exists = await db.schema.hasTable(table);
            if (!exists) {
                throw new Error(`Required table ${table} does not exist`);
            }
        }
    });

    beforeEach(async () => {
        await cleanupTables([
            "photos",
            "floor_plans",
            "apartments",
            "projects",
        ]);

        // Create test project
        testProject = createProjectDto({
            name: "Test Project for Apartments",
            slug: uniqueSlug("test-project"),
            status: ProjectStatus.PLANNING,
        });
    });

    afterAll(async () => {
        await cleanupTables([
            "photos",
            "floor_plans",
            "apartments",
            "projects",
        ]);
        await closeDatabase();
    });

    // ==========================================================================
    // CRUD OPERATIONS
    // ==========================================================================

    describe("CRUD Operations", () => {
        describe("create()", () => {
            it("should create a new apartment", async () => {
                const data = createApartmentDto(testProject.id);
                const apartment = await ApartmentModel.create(data);

                expect(apartment).toBeDefined();
                expect(apartment.id).toBeGreaterThan(0);
                expect(apartment.projectId).toBe(testProject.id);
                expect(apartment.name).toBe(data.name);
                expect(apartment.unitNumber).toBe(data.unitNumber);
                expect(apartment.floorNumber).toBe(data.floorNumber);
                expect(apartment.areaSqm).toBe(data.areaSqm);
                expect(apartment.bedrooms).toBe(data.bedrooms);
                expect(apartment.bathrooms).toBe(data.bathrooms);
                expect(apartment.price).toBe(data.price);
                expect(apartment.status).toBe(ApartmentStatus.AVAILABLE);
                expect(apartment.isModelUnit).toBe(false);
                expect(apartment.isPublished).toBe(false);
                expect(apartment.createdAt).toBeInstanceOf(Date);
                expect(apartment.updatedAt).toBeInstanceOf(Date);
            });

            it("should set default status to available", async () => {
                const data = createApartmentDto(testProject.id);
                delete data.status;

                const apartment = await ApartmentModel.create(data);

                expect(apartment.status).toBe(ApartmentStatus.AVAILABLE);
            });

            it("should validate area is greater than 0", async () => {
                const data = createApartmentDto({ projectId: testProject.id, areaSqm: 0 });

                await expect(ApartmentModel.create(data)).rejects.toThrow(
                    "Area must be greater than 0"
                );
            });

            it("should validate price is greater than 0", async () => {
                const data = createApartmentDto({ projectId: testProject.id, price: -100 });

                await expect(ApartmentModel.create(data)).rejects.toThrow(
                    "Price must be greater than 0"
                );
            });

            it("should validate room counts are non-negative", async () => {
                const data = createApartmentDto({ projectId: testProject.id, bedrooms: -1 });

                await expect(ApartmentModel.create(data)).rejects.toThrow(
                    "bedrooms cannot be negative"
                );
            });

            it("should validate unit number uniqueness within project", async () => {
                const unitNumber = "A101";
                await ApartmentModel.create(
                    createApartmentDto({ projectId: testProject.id, unitNumber })
                );

                await expect(
                    ApartmentModel.create(
                        createApartmentDto({ projectId: testProject.id, unitNumber })
                    )
                ).rejects.toThrow(`Unit number "${unitNumber}" already exists`);
            });

            it("should allow same unit number in different projects", async () => {
                const project2 = await createProject({
                    name: "Another Project",
                    slug: uniqueSlug("another-project"),
                });

                const unitNumber = "A101";
                await ApartmentModel.create(
                    createApartmentDto({ projectId: testProject.id, unitNumber })
                );

                const apartment2 = await ApartmentModel.create(
                    createApartmentDto({ projectId: project2.id, unitNumber: unitNumber })
                );

                expect(apartment2.unitNumber).toBe(unitNumber);
            });

            it("should validate project exists", async () => {
                const data = createApartmentDto({ projectId: 99999 });

                await expect(ApartmentModel.create(data)).rejects.toThrow(
                    "Project with ID 99999 not found"
                );
            });

            it("should handle null optional fields", async () => {
                const data = createApartmentDto({
                    projectId: testProject.id,
                    unitNumber: undefined,
                    floorNumber: undefined,
                    title: undefined,
                    subtitle: undefined,
                    description: undefined,
                    bedrooms: undefined,
                    bathrooms: undefined,
                });

                const apartment = await ApartmentModel.create(data);

                expect(apartment).toBeDefined();
                expect(apartment.unitNumber).toBeNull();
                expect(apartment.floorNumber).toBeNull();
                expect(apartment.title).toBeNull();
            });

            it("should work within transaction", async () => {
                await db.transaction(async (trx) => {
                    const data = createApartmentDto(testProject.id);
                    const apartment = await ApartmentModel.create(data, trx);

                    expect(apartment).toBeDefined();
                    expect(apartment.projectId).toBe(testProject.id);
                });
            });
        });

        describe("findById()", () => {
            it("should find apartment by id", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                const found = await ApartmentModel.findById(created.id);

                expect(found).toBeDefined();
                expect(found?.id).toBe(created.id);
                expect(found?.name).toBe(created.name);
            });

            it("should return null for non-existent id", async () => {
                const found = await ApartmentModel.findById(99999);
                expect(found).toBeNull();
            });

            it("should exclude soft-deleted apartments by default", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await ApartmentModel.delete(created.id);

                const found = await ApartmentModel.findById(created.id);
                expect(found).toBeNull();
            });

            it("should include soft-deleted apartments when requested", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await ApartmentModel.delete(created.id);

                const found = await ApartmentModel.findById(created.id, {
                    includeDeleted: true,
                });

                expect(found).toBeDefined();
                expect(found?.deletedAt).not.toBeNull();
            });
        });

        describe("update()", () => {
            it("should update apartment", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const updated = await ApartmentModel.update(created.id, {
                    name: "Updated Name",
                    price: 300000,
                    bedrooms: 4,
                });

                expect(updated).toBeDefined();
                expect(updated?.name).toBe("Updated Name");
                expect(updated?.price).toBe(300000);
                expect(updated?.bedrooms).toBe(4);
                expect(updated?.updatedAt.getTime()).toBeGreaterThan(
                    created.updatedAt.getTime()
                );
            });

            it("should validate area on update", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                await expect(
                    ApartmentModel.update(created.id, { areaSqm: 0 })
                ).rejects.toThrow("Area must be greater than 0");
            });

            it("should validate price on update", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                await expect(
                    ApartmentModel.update(created.id, { price: -1000 })
                ).rejects.toThrow("Price must be greater than 0");
            });

            it("should validate unit number uniqueness on update", async () => {
                const apt1 = await ApartmentModel.create(
                    createApartmentDto({ projectId: testProject.id, unitNumber: "A101" })
                );
                const apt2 = await ApartmentModel.create(
                    createApartmentDto({ projectId: testProject.id, unitNumber: "A102" })
                );

                await expect(
                    ApartmentModel.update(apt2.id, { unitNumber: "A101" })
                ).rejects.toThrow('Unit number "A101" already exists');
            });

            it("should return null for non-existent id", async () => {
                const updated = await ApartmentModel.update(99999, {
                    name: "Ghost",
                });
                expect(updated).toBeNull();
            });

            it("should update only provided fields", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto({
                        projectId: testProject.id,
                        name: "Original",
                        price: 250000,
                        bedrooms: 3,
                    })
                );

                const updated = await ApartmentModel.update(created.id, {
                    price: 300000,
                });

                expect(updated?.name).toBe("Original");
                expect(updated?.price).toBe(300000);
                expect(updated?.bedrooms).toBe(3);
            });
        });

        describe("delete()", () => {
            it("should soft-delete apartment", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const deleted = await ApartmentModel.delete(created.id);

                expect(deleted).toBe(true);

                const found = await ApartmentModel.findById(created.id);
                expect(found).toBeNull();

                const foundWithDeleted = await ApartmentModel.findById(created.id, {
                    includeDeleted: true,
                });
                expect(foundWithDeleted?.deletedAt).not.toBeNull();
            });

            it("should return false for non-existent id", async () => {
                const deleted = await ApartmentModel.delete(99999);
                expect(deleted).toBe(false);
            });
        });

        describe("restore()", () => {
            it("should restore soft-deleted apartment", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await ApartmentModel.delete(created.id);

                const restored = await ApartmentModel.restore(created.id);

                expect(restored).toBe(true);

                const found = await ApartmentModel.findById(created.id);
                expect(found).toBeDefined();
                expect(found?.deletedAt).toBeNull();
            });
        });

        describe("forceDelete()", () => {
            it("should permanently delete apartment", async () => {
                const created = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const deleted = await ApartmentModel.forceDelete(created.id);

                expect(deleted).toBe(true);

                const found = await ApartmentModel.findById(created.id, {
                    includeDeleted: true,
                });
                expect(found).toBeNull();
            });
        });
    });

    // ==========================================================================
    // MEDIA LOADING
    // ==========================================================================

    describe("Media Loading", () => {
        describe("loadPhotos()", () => {
            it("should load photos for apartment", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));
                await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: false }));

                const photos = await ApartmentModel.loadPhotos(apartment.id);

                expect(photos).toHaveLength(2);
                expect(photos[0].photoableId).toBe(apartment.id);
                expect(photos[0].photoableType).toBe(PhotoableType.APARTMENT);
            });

            it("should return empty array if no photos", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const photos = await ApartmentModel.loadPhotos(apartment.id);

                expect(photos).toHaveLength(0);
            });
        });

        describe("loadFloorPlans()", () => {
            it("should load floor plans for apartment", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                await FloorPlanModel.create(createFloorPlanDto({ plannableId: apartment.id }));
                await FloorPlanModel.create(createFloorPlanDto({ plannableId: apartment.id }));

                const plans = await ApartmentModel.loadFloorPlans(apartment.id);

                expect(plans).toHaveLength(2);
                expect(plans[0].plannableId).toBe(apartment.id);
                expect(plans[0].plannableType).toBe(PlannableType.APARTMENT);
            });

            it("should return empty array if no floor plans", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const plans = await ApartmentModel.loadFloorPlans(apartment.id);

                expect(plans).toHaveLength(0);
            });
        });

        describe("loadMedia()", () => {
            it("should load both photos and floor plans", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));
                await FloorPlanModel.create(createFloorPlanDto({ plannableId: apartment.id }));

                const media = await ApartmentModel.loadMedia(apartment.id);

                expect(media.photos).toHaveLength(1);
                expect(media.floorPlans).toHaveLength(1);
            });
        });

        describe("findByIdWithMedia()", () => {
            it("should find apartment with photos", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));

                const found = await ApartmentModel.findByIdWithMedia(apartment.id, {
                    includePhotos: true,
                });

                expect(found).toBeDefined();
                expect(found?.photos).toHaveLength(1);
            });

            it("should find apartment with floor plans", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await FloorPlanModel.create(createFloorPlanDto({ plannableId: apartment.id }));

                const found = await ApartmentModel.findByIdWithMedia(apartment.id, {
                    includeFloorPlans: true,
                });

                expect(found).toBeDefined();
                expect(found?.floorPlans).toHaveLength(1);
            });

            it("should find apartment with both media types", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));
                await FloorPlanModel.create(createFloorPlanDto({ plannableId: apartment.id }));

                const found = await ApartmentModel.findByIdWithMedia(apartment.id, {
                    includePhotos: true,
                    includeFloorPlans: true,
                });

                expect(found).toBeDefined();
                expect(found?.photos).toHaveLength(1);
                expect(found?.floorPlans).toHaveLength(1);
            });

            it("should return null for non-existent apartment", async () => {
                const found = await ApartmentModel.findByIdWithMedia(99999, {
                    includePhotos: true,
                });

                expect(found).toBeNull();
            });
        });

        describe("validateMediaForPublishing()", () => {
            it("should validate apartment has required media", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));

                const validation = await ApartmentModel.validateMediaForPublishing(
                    apartment.id
                );

                expect(validation.valid).toBe(true);
                expect(validation.errors).toHaveLength(0);
            });

            it("should require at least one photo", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const validation = await ApartmentModel.validateMediaForPublishing(
                    apartment.id
                );

                expect(validation.valid).toBe(false);
                expect(validation.errors).toContain("At least one photo is required");
            });

            it("should require cover photo", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));

                const validation = await ApartmentModel.validateMediaForPublishing(
                    apartment.id
                );

                expect(validation.valid).toBe(false);
                expect(validation.errors).toContain("Cover photo is required");
            });
        });
    });

    // ==========================================================================
    // QUERY METHODS
    // ==========================================================================

    describe("Query Methods", () => {
        beforeEach(async () => {
            // Create test apartments with different statuses
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.AVAILABLE,
                    isPublished: true,
                    bedrooms: 2,
                    price: 200000,
                })
            );
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.RESERVED,
                    isPublished: true,
                    bedrooms: 3,
                    price: 250000,
                })
            );
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.SOLD,
                    isPublished: false,
                    bedrooms: 4,
                    price: 300000,
                })
            );
        });

        describe("findApartments()", () => {
            it("should find all apartments", async () => {
                const apartments = await ApartmentModel.findApartments();
                expect(apartments.length).toBeGreaterThanOrEqual(3);
            });

            it("should filter by status", async () => {
                const available = await ApartmentModel.findApartments({
                    status: ApartmentStatus.AVAILABLE,
                });

                expect(available.length).toBeGreaterThan(0);
                available.forEach((apt) => {
                    expect(apt.status).toBe(ApartmentStatus.AVAILABLE);
                });
            });

            it("should filter by published status", async () => {
                const published = await ApartmentModel.findApartments({
                    isPublished: true,
                });

                expect(published.length).toBeGreaterThan(0);
                published.forEach((apt) => {
                    expect(apt.isPublished).toBe(true);
                });
            });

            it("should filter by price range", async () => {
                const apartments = await ApartmentModel.findApartments({
                    minPrice: 200000,
                    maxPrice: 260000,
                });

                expect(apartments.length).toBeGreaterThan(0);
                apartments.forEach((apt) => {
                    expect(apt.price).toBeGreaterThanOrEqual(200000);
                    expect(apt.price).toBeLessThanOrEqual(260000);
                });
            });

            it("should filter by bedrooms", async () => {
                const apartments = await ApartmentModel.findApartments({
                    bedrooms: 3,
                });

                expect(apartments.length).toBeGreaterThan(0);
                apartments.forEach((apt) => {
                    expect(apt.bedrooms).toBe(3);
                });
            });

            it("should apply sorting", async () => {
                const apartments = await ApartmentModel.findApartments({
                    sortBy: "price",
                    sortOrder: "asc",
                });

                expect(apartments.length).toBeGreaterThan(1);
                for (let i = 1; i < apartments.length; i++) {
                    expect(apartments[i].price).toBeGreaterThanOrEqual(
                        apartments[i - 1].price
                    );
                }
            });

            it("should apply pagination", async () => {
                const page1 = await ApartmentModel.findApartments({
                    page: 1,
                    limit: 2,
                });

                expect(page1.length).toBeLessThanOrEqual(2);
            });

            it("should load photos when requested", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));

                const apartments = await ApartmentModel.findApartments({
                    includePhotos: true,
                    where: { id: apartment.id },
                });

                expect(apartments[0].photos).toBeDefined();
                expect(apartments[0].photos).toHaveLength(1);
            });

            it("should load floor plans when requested", async () => {
                const apartment = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                await FloorPlanModel.create(createFloorPlanDto({ plannableId: apartment.id }));

                const apartments = await ApartmentModel.findApartments({
                    includeFloorPlans: true,
                    where: { id: apartment.id },
                });

                expect(apartments[0].floorPlans).toBeDefined();
                expect(apartments[0].floorPlans).toHaveLength(1);
            });
        });

        describe("paginateApartments()", () => {
            it("should return paginated results", async () => {
                const result = await ApartmentModel.paginateApartments({
                    page: 1,
                    limit: 2,
                });

                expect(result.items).toBeDefined();
                expect(result.items.length).toBeLessThanOrEqual(2);
                expect(result.pagination.total).toBeGreaterThanOrEqual(3);
                expect(result.pagination.page).toBe(1);
                expect(result.pagination.limit).toBe(2);
                expect(result.pagination.totalPages).toBeGreaterThan(0);
            });

            it("should calculate pagination metadata correctly", async () => {
                const result = await ApartmentModel.paginateApartments({
                    page: 1,
                    limit: 2,
                });

                expect(result.pagination.hasPrevPage).toBe(false);
                expect(result.pagination.hasNextPage).toBe(
                    result.pagination.page < result.pagination.totalPages
                );
            });
        });

        describe("countApartments()", () => {
            it("should count all apartments", async () => {
                const count = await ApartmentModel.countApartments();
                expect(count).toBeGreaterThanOrEqual(3);
            });

            it("should count with filters", async () => {
                const count = await ApartmentModel.countApartments({
                    status: ApartmentStatus.AVAILABLE,
                });

                expect(count).toBeGreaterThan(0);
            });
        });

        describe("findByProject()", () => {
            it("should find apartments by project", async () => {
                const apartments = await ApartmentModel.findByProject(testProject.id);

                expect(apartments.length).toBeGreaterThanOrEqual(3);
                apartments.forEach((apt) => {
                    expect(apt.projectId).toBe(testProject.id);
                });
            });

            it("should return empty array for project with no apartments", async () => {
                const project2 = await createProject({
                    name: "Empty Project",
                    slug: uniqueSlug("empty"),
                });

                const apartments = await ApartmentModel.findByProject(project2.id);

                expect(apartments).toHaveLength(0);
            });
        });

        describe("findAvailable()", () => {
            it("should find available apartments", async () => {
                const available = await ApartmentModel.findAvailable();

                expect(available.length).toBeGreaterThan(0);
                available.forEach((apt) => {
                    expect(apt.status).toBe(ApartmentStatus.AVAILABLE);
                    expect(apt.isPublished).toBe(true);
                });
            });

            it("should find available apartments for project", async () => {
                const available = await ApartmentModel.findAvailable(testProject.id);

                expect(available.length).toBeGreaterThan(0);
                available.forEach((apt) => {
                    expect(apt.projectId).toBe(testProject.id);
                    expect(apt.status).toBe(ApartmentStatus.AVAILABLE);
                });
            });
        });

        describe("findSold()", () => {
            it("should find sold apartments", async () => {
                const sold = await ApartmentModel.findSold();

                expect(sold.length).toBeGreaterThan(0);
                sold.forEach((apt) => {
                    expect(apt.status).toBe(ApartmentStatus.SOLD);
                });
            });
        });

        describe("findReserved()", () => {
            it("should find reserved apartments", async () => {
                const reserved = await ApartmentModel.findReserved();

                expect(reserved.length).toBeGreaterThan(0);
                reserved.forEach((apt) => {
                    expect(apt.status).toBe(ApartmentStatus.RESERVED);
                });
            });
        });

        describe("findModelUnits()", () => {
            it("should find model units", async () => {
                await ApartmentModel.create(
                    createApartmentDto({
                        projectId: testProject.id,
                        isModelUnit: true,
                        isPublished: true,
                    })
                );

                const models = await ApartmentModel.findModelUnits();

                expect(models.length).toBeGreaterThan(0);
                models.forEach((apt) => {
                    expect(apt.isModelUnit).toBe(true);
                    expect(apt.isPublished).toBe(true);
                });
            });
        });

        describe("findByFloor()", () => {
            it("should find apartments by floor number", async () => {
                const floorNumber = 5;
                await ApartmentModel.create(
                    createApartmentDto({ projectId: testProject.id, floorNumber })
                );

                const apartments = await ApartmentModel.findByFloor(
                    testProject.id,
                    floorNumber
                );

                expect(apartments.length).toBeGreaterThan(0);
                apartments.forEach((apt) => {
                    expect(apt.floorNumber).toBe(floorNumber);
                });
            });
        });

        describe("findByUnitNumber()", () => {
            it("should find apartments by unit number", async () => {
                const unitNumber = "A999";
                await ApartmentModel.create(
                    createApartmentDto({ projectId: testProject.id, unitNumber })
                );

                const apartments = await ApartmentModel.findByUnitNumber(unitNumber);

                expect(apartments.length).toBeGreaterThan(0);
                expect(apartments[0].unitNumber).toBe(unitNumber);
            });
        });
    });

    // ==========================================================================
    // STATUS MANAGEMENT
    // ==========================================================================

    describe("Status Management", () => {
        let testApartment: Apartment;

        beforeEach(async () => {
            testApartment = await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.AVAILABLE,
                })
            );
        });

        describe("updateStatus()", () => {
            it("should update apartment status", async () => {
                const updated = await ApartmentModel.updateStatus(
                    testApartment.id,
                    ApartmentStatus.RESERVED
                );

                expect(updated).toBeDefined();
                expect(updated?.status).toBe(ApartmentStatus.RESERVED);
            });

            it("should return null for non-existent apartment", async () => {
                const updated = await ApartmentModel.updateStatus(
                    99999,
                    ApartmentStatus.SOLD
                );

                expect(updated).toBeNull();
            });
        });

        describe("markAsSold()", () => {
            it("should mark apartment as sold", async () => {
                const updated = await ApartmentModel.markAsSold(testApartment.id);

                expect(updated).toBeDefined();
                expect(updated?.status).toBe(ApartmentStatus.SOLD);
            });
        });

        describe("markAsReserved()", () => {
            it("should mark apartment as reserved", async () => {
                const updated = await ApartmentModel.markAsReserved(testApartment.id);

                expect(updated).toBeDefined();
                expect(updated?.status).toBe(ApartmentStatus.RESERVED);
            });
        });

        describe("markAsAvailable()", () => {
            it("should mark apartment as available", async () => {
                await ApartmentModel.updateStatus(
                    testApartment.id,
                    ApartmentStatus.SOLD
                );

                const updated = await ApartmentModel.markAsAvailable(testApartment.id);

                expect(updated).toBeDefined();
                expect(updated?.status).toBe(ApartmentStatus.AVAILABLE);
            });
        });

        describe("bulkUpdateStatus()", () => {
            it("should update multiple apartment statuses", async () => {
                const apt1 = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                const apt2 = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const updated = await ApartmentModel.bulkUpdateStatus(
                    [apt1.id, apt2.id],
                    ApartmentStatus.RESERVED
                );

                expect(updated).toBe(2);

                const found1 = await ApartmentModel.findById(apt1.id);
                const found2 = await ApartmentModel.findById(apt2.id);

                expect(found1?.status).toBe(ApartmentStatus.RESERVED);
                expect(found2?.status).toBe(ApartmentStatus.RESERVED);
            });

            it("should return 0 for empty array", async () => {
                const updated = await ApartmentModel.bulkUpdateStatus(
                    [],
                    ApartmentStatus.SOLD
                );

                expect(updated).toBe(0);
            });

            it("should skip non-existent apartments", async () => {
                const updated = await ApartmentModel.bulkUpdateStatus(
                    [99999, 99998],
                    ApartmentStatus.SOLD
                );

                expect(updated).toBe(0);
            });
        });
    });

    // ==========================================================================
    // STATISTICS & ANALYTICS
    // ==========================================================================

    describe("Statistics & Analytics", () => {
        beforeEach(async () => {
            // Create apartments with different statuses
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.AVAILABLE,
                    price: 200000,
                    areaSqm: 100,
                    bedrooms: 2,
                    floorNumber: 1,
                })
            );
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.AVAILABLE,
                    price: 250000,
                    areaSqm: 120,
                    bedrooms: 3,
                    floorNumber: 2,
                })
            );
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.RESERVED,
                    price: 300000,
                    areaSqm: 150,
                    bedrooms: 3,
                    floorNumber: 3,
                })
            );
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.SOLD,
                    price: 350000,
                    areaSqm: 180,
                    bedrooms: 4,
                    floorNumber: 4,
                })
            );
        });

        describe("getAvailabilitySummary()", () => {
            it("should return availability summary", async () => {
                const summary = await ApartmentModel.getAvailabilitySummary(
                    testProject.id
                );

                expect(summary.total).toBe(4);
                expect(summary.available).toBe(2);
                expect(summary.reserved).toBe(1);
                expect(summary.sold).toBe(1);
                expect(summary.availabilityRate).toBe(50);
                expect(summary.soldRate).toBe(25);
            });

            it("should handle project with no apartments", async () => {
                const project2 = await createProject({
                    name: "Empty Project",
                    slug: uniqueSlug("empty"),
                });

                const summary = await ApartmentModel.getAvailabilitySummary(
                    project2.id
                );

                expect(summary.total).toBe(0);
                expect(summary.available).toBe(0);
                expect(summary.availabilityRate).toBe(0);
                expect(summary.soldRate).toBe(0);
            });
        });

        describe("getProjectStatistics()", () => {
            it("should return comprehensive project statistics", async () => {
                const stats = await ApartmentModel.getProjectStatistics(
                    testProject.id
                );

                expect(stats.total).toBe(4);
                expect(stats.available).toBe(2);
                expect(stats.reserved).toBe(1);
                expect(stats.sold).toBe(1);

                expect(stats.pricing.min).toBe(200000);
                expect(stats.pricing.max).toBe(350000);
                expect(stats.pricing.avg).toBeGreaterThan(0);

                expect(stats.area.min).toBe(100);
                expect(stats.area.max).toBe(180);
                expect(stats.area.avg).toBeGreaterThan(0);

                expect(stats.floors.min).toBe(1);
                expect(stats.floors.max).toBe(4);
            });

            it("should include published and model unit counts", async () => {
                await ApartmentModel.create(
                    createApartmentDto({
                        projectId: testProject.id,
                        isPublished: true,
                        isModelUnit: true,
                    })
                );

                const stats = await ApartmentModel.getProjectStatistics(
                    testProject.id
                );

                expect(stats.published).toBeGreaterThanOrEqual(1);
                expect(stats.modelUnits).toBeGreaterThanOrEqual(1);
            });
        });

        describe("getFloorDistribution()", () => {
            it("should return floor distribution", async () => {
                const distribution = await ApartmentModel.getFloorDistribution(
                    testProject.id
                );

                expect(distribution.length).toBeGreaterThan(0);
                expect(distribution[0]).toHaveProperty("floor_number");
                expect(distribution[0]).toHaveProperty("count");
            });

            it("should be sorted by floor number", async () => {
                const distribution = await ApartmentModel.getFloorDistribution(
                    testProject.id
                );

                for (let i = 1; i < distribution.length; i++) {
                    expect(distribution[i].floor_number).toBeGreaterThanOrEqual(
                        distribution[i - 1].floor_number
                    );
                }
            });
        });

        describe("getBedroomDistribution()", () => {
            it("should return bedroom distribution", async () => {
                const distribution = await ApartmentModel.getBedroomDistribution(
                    testProject.id
                );

                expect(distribution.length).toBeGreaterThan(0);
                expect(distribution[0]).toHaveProperty("bedrooms");
                expect(distribution[0]).toHaveProperty("count");
            });

            it("should be sorted by bedroom count", async () => {
                const distribution = await ApartmentModel.getBedroomDistribution(
                    testProject.id
                );

                for (let i = 1; i < distribution.length; i++) {
                    expect(distribution[i].bedrooms).toBeGreaterThanOrEqual(
                        distribution[i - 1].bedrooms
                    );
                }
            });
        });

        describe("getPriceDistribution()", () => {
            it("should return price distribution in buckets", async () => {
                const distribution = await ApartmentModel.getPriceDistribution(
                    testProject.id,
                    3
                );

                expect(distribution.length).toBe(3);
                distribution.forEach((bucket) => {
                    expect(bucket).toHaveProperty("min");
                    expect(bucket).toHaveProperty("max");
                    expect(bucket).toHaveProperty("count");
                });
            });

            it("should return empty array for project with no apartments", async () => {
                const project2 = await createProject({
                    name: "Empty Project",
                    slug: uniqueSlug("empty"),
                });

                const distribution = await ApartmentModel.getPriceDistribution(
                    project2.id
                );

                expect(distribution).toHaveLength(0);
            });

            it("should handle custom bucket count", async () => {
                const distribution = await ApartmentModel.getPriceDistribution(
                    testProject.id,
                    5
                );

                expect(distribution.length).toBe(5);
            });
        });
    });

    // ==========================================================================
    // BATCH OPERATIONS
    // ==========================================================================

    describe("Batch Operations", () => {
        describe("bulkCreate()", () => {
            it("should create multiple apartments", async () => {
                const items = [
                    createApartmentDto({ projectId: testProject.id, unitNumber: "B101" }),
                    createApartmentDto({ projectId: testProject.id, unitNumber: "B102" }),
                    createApartmentDto({ projectId: testProject.id, unitNumber: "B103" }),
                ];

                const result = await ApartmentModel.bulkCreate(items);

                expect(result.success).toBe(true);
                expect(result.processed).toBe(3);
                expect(result.failed).toBe(0);

                const apartments = await ApartmentModel.findByProject(testProject.id);
                expect(apartments.length).toBeGreaterThanOrEqual(3);
            });

            it("should handle large batches with chunking", async () => {
                const items = [];
                for (let i = 0; i < 150; i++) {
                    items.push(
                        createApartmentDto({
                            projectId: testProject.id,
                            unitNumber: `BULK${i}`,
                        })
                    );
                }

                const result = await ApartmentModel.bulkCreate(items, {
                    chunkSize: 50,
                });

                expect(result.success).toBe(true);
                expect(result.processed).toBe(150);
            });

            it("should rollback on error", async () => {
                const items: any[] = [
                    createApartmentDto({ projectId: testProject.id, unitNumber: "C101" }),
                    createApartmentDto({ projectId: testProject.id, areaSqm: -10 }), // Invalid
                    createApartmentDto({ projectId: testProject.id, unitNumber: "C102" }),
                ];

                const result = await ApartmentModel.bulkCreate(items);

                expect(result.success).toBe(false);
                expect(result.failed).toBeGreaterThan(0);

                // None should be created due to rollback
                const apartments = await ApartmentModel.findByUnitNumber("C101");
                expect(apartments).toHaveLength(0);
            });
        });

        describe("bulkUpdate()", () => {
            it("should update multiple apartments", async () => {
                const apt1 = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                const apt2 = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const updates = [
                    { id: apt1.id, data: { price: 300000 } },
                    { id: apt2.id, data: { price: 320000 } },
                ];

                const result = await ApartmentModel.bulkUpdate(updates);

                expect(result.success).toBe(true);
                expect(result.processed).toBe(2);
                expect(result.failed).toBe(0);

                const updated1 = await ApartmentModel.findById(apt1.id);
                const updated2 = await ApartmentModel.findById(apt2.id);

                expect(updated1?.price).toBe(300000);
                expect(updated2?.price).toBe(320000);
            });

            it("should handle partial failures", async () => {
                const apt = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const updates = [
                    { id: apt.id, data: { price: 300000 } },
                    { id: 99999, data: { price: 320000 } }, // Non-existent
                ];

                const result = await ApartmentModel.bulkUpdate(updates);

                expect(result.processed).toBe(1);
                expect(result.failed).toBe(1);
                expect(result.errors).toHaveLength(1);
            });
        });

        describe("bulkDelete()", () => {
            it("should soft-delete multiple apartments", async () => {
                const apt1 = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                const apt2 = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );
                const apt3 = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const result = await ApartmentModel.bulkDelete([apt1.id, apt2.id]);

                expect(result.success).toBe(true);
                expect(result.processed).toBe(2);

                const remaining = await ApartmentModel.findByProject(testProject.id);
                expect(remaining.length).toBe(1);
                expect(remaining[0].id).toBe(apt3.id);
            });

            it("should force delete when specified", async () => {
                const apt = await ApartmentModel.create(
                    createApartmentDto(testProject.id)
                );

                const result = await ApartmentModel.bulkDelete([apt.id], {
                    force: true,
                });

                expect(result.success).toBe(true);

                const found = await ApartmentModel.findById(apt.id, {
                    includeDeleted: true,
                });
                expect(found).toBeNull();
            });
        });
    });

    // ==========================================================================
    // SEARCH & FILTERING
    // ==========================================================================

    describe("Search & Filtering", () => {
        beforeEach(async () => {
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    name: "Luxury Penthouse",
                    title: "Premium Living Space",
                    unitNumber: "PH01",
                })
            );
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    name: "Modern Studio",
                    title: "Compact Urban Living",
                    unitNumber: "ST01",
                })
            );
            await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    name: "Family Apartment",
                    title: "Spacious Family Home",
                    unitNumber: "FA01",
                })
            );
        });

        describe("search()", () => {
            it("should search apartments by name", async () => {
                const results = await ApartmentModel.search("Luxury");

                expect(results.length).toBeGreaterThan(0);
                expect(results.some((apt) => apt.name.includes("Luxury"))).toBe(true);
            });

            it("should search apartments by title", async () => {
                const results = await ApartmentModel.search("Premium");

                expect(results.length).toBeGreaterThan(0);
                expect(results.some((apt) => apt.title?.includes("Premium"))).toBe(
                    true
                );
            });

            it("should search apartments by unit number", async () => {
                const results = await ApartmentModel.search("PH01");

                expect(results.length).toBeGreaterThan(0);
                expect(results[0].unitNumber).toBe("PH01");
            });

            it("should be case-insensitive", async () => {
                const results = await ApartmentModel.search("luxury");

                expect(results.length).toBeGreaterThan(0);
            });

            it("should return all if search term is empty", async () => {
                const results = await ApartmentModel.search("");

                expect(results.length).toBeGreaterThanOrEqual(3);
            });
        });

        describe("Advanced Filters", () => {
            beforeEach(async () => {
                await ApartmentModel.create(
                    createApartmentDto({
                        projectId: testProject.id,
                        price: 150000,
                        areaSqm: 80,
                        bedrooms: 1,
                        floorNumber: 1,
                    })
                );
                await ApartmentModel.create(
                    createApartmentDto({
                        projectId: testProject.id,
                        price: 250000,
                        areaSqm: 120,
                        bedrooms: 2,
                        floorNumber: 5,
                    })
                );
                await ApartmentModel.create(
                    createApartmentDto({
                        projectId: testProject.id,
                        price: 350000,
                        areaSqm: 160,
                        bedrooms: 3,
                        floorNumber: 10,
                    })
                );
            });

            it("should filter by bedroom range", async () => {
                const results = await ApartmentModel.findApartments({
                    minBedrooms: 2,
                    maxBedrooms: 3,
                });

                expect(results.length).toBeGreaterThan(0);
                results.forEach((apt) => {
                    expect(apt.bedrooms).toBeGreaterThanOrEqual(2);
                    expect(apt.bedrooms).toBeLessThanOrEqual(3);
                });
            });

            it("should filter by area range", async () => {
                const results = await ApartmentModel.findApartments({
                    minArea: 100,
                    maxArea: 150,
                });

                expect(results.length).toBeGreaterThan(0);
                results.forEach((apt) => {
                    expect(apt.areaSqm).toBeGreaterThanOrEqual(100);
                    expect(apt.areaSqm).toBeLessThanOrEqual(150);
                });
            });

            it("should filter by floor range", async () => {
                const results = await ApartmentModel.findApartments({
                    minFloor: 3,
                    maxFloor: 8,
                });

                expect(results.length).toBeGreaterThan(0);
                results.forEach((apt) => {
                    expect(apt.floorNumber).toBeGreaterThanOrEqual(3);
                    expect(apt.floorNumber).toBeLessThanOrEqual(8);
                });
            });

            it("should filter by multiple bedrooms", async () => {
                const results = await ApartmentModel.findApartments({
                    bedrooms: [1, 3],
                });

                expect(results.length).toBeGreaterThan(0);
                results.forEach((apt) => {
                    expect([1, 3]).toContain(apt.bedrooms);
                });
            });

            it("should combine multiple filters", async () => {
                const results = await ApartmentModel.findApartments({
                    minPrice: 200000,
                    maxPrice: 400000,
                    minBedrooms: 2,
                    status: ApartmentStatus.AVAILABLE,
                });

                expect(results.length).toBeGreaterThan(0);
                results.forEach((apt) => {
                    expect(apt.price).toBeGreaterThanOrEqual(200000);
                    expect(apt.price).toBeLessThanOrEqual(400000);
                    expect(apt.bedrooms).toBeGreaterThanOrEqual(2);
                    expect(apt.status).toBe(ApartmentStatus.AVAILABLE);
                });
            });

            it("should filter by virtual visit availability", async () => {
                await ApartmentModel.create(
                    createApartmentDto({
                        projectId: testProject.id,
                        virtualVisitUrl: "https://example.com/tour",
                    })
                );

                const withTour = await ApartmentModel.findApartments({
                    hasVirtualVisit: true,
                });

                expect(withTour.length).toBeGreaterThan(0);
                withTour.forEach((apt) => {
                    expect(apt.virtualVisitUrl).not.toBeNull();
                });

                const withoutTour = await ApartmentModel.findApartments({
                    hasVirtualVisit: false,
                });

                withoutTour.forEach((apt) => {
                    expect(apt.virtualVisitUrl).toBeNull();
                });
            });
        });
    });

    // ==========================================================================
    // TRANSACTIONS
    // ==========================================================================

    describe("Transactions", () => {
        it("should commit transaction on success", async () => {
            await ApartmentModel.transaction(async (trx) => {
                await ApartmentModel.create(
                    createApartmentDto(testProject.id),
                    trx
                );
                await ApartmentModel.create(
                    createApartmentDto(testProject.id),
                    trx
                );
            });

            const apartments = await ApartmentModel.findByProject(testProject.id);
            expect(apartments.length).toBe(2);
        });

        it("should rollback transaction on error", async () => {
            try {
                await ApartmentModel.transaction(async (trx) => {
                    await ApartmentModel.create(
                        createApartmentDto(testProject.id),
                        trx
                    );
                    throw new Error("Simulated error");
                });
            } catch (error) {
                // Expected error
            }

            const apartments = await ApartmentModel.findByProject(testProject.id);
            expect(apartments.length).toBe(0);
        });

        it("should handle nested transactions", async () => {
            await ApartmentModel.transaction(async (trx) => {
                await ApartmentModel.create(
                    createApartmentDto(testProject.id),
                    trx
                );

                await ApartmentModel.transaction(async (nestedTrx) => {
                    await ApartmentModel.create(
                        createApartmentDto(testProject.id),
                        nestedTrx
                    );
                }, trx);
            });

            const apartments = await ApartmentModel.findByProject(testProject.id);
            expect(apartments.length).toBe(2);
        });
    });

    // ==========================================================================
    // EDGE CASES
    // ==========================================================================

    describe("Edge Cases", () => {
        it("should handle empty results", async () => {
            const apartments = await ApartmentModel.findApartments({
                status: ApartmentStatus.SOLD,
            });

            expect(Array.isArray(apartments)).toBe(true);
        });

        it("should handle null values", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    unitNumber: undefined,
                    floorNumber: undefined,
                    bedrooms: undefined,
                })
            );

            expect(apartment.unitNumber).toBeNull();
            expect(apartment.floorNumber).toBeNull();
            expect(apartment.bedrooms).toBeNull();
        });

        it("should handle concurrent operations", async () => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    ApartmentModel.create(
                        createApartmentDto({
                            projectId: testProject.id,
                            unitNumber: `CONC${i}`,
                        })
                    )
                );
            }

            await Promise.all(promises);

            const apartments = await ApartmentModel.findByProject(testProject.id);
            expect(apartments.length).toBeGreaterThanOrEqual(10);
        });

        it("should handle very large area values", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({ projectId: testProject.id, areaSqm: 10000 })
            );

            expect(apartment.areaSqm).toBe(10000);
        });

        it("should handle very high floor numbers", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({ projectId: testProject.id, floorNumber: 100 })
            );

            expect(apartment.floorNumber).toBe(100);
        });

        it("should handle basement floors", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({ projectId: testProject.id, floorNumber: -1 })
            );

            expect(apartment.floorNumber).toBe(-1);
        });

        it("should validate basement floor limit", async () => {
            await expect(
                ApartmentModel.create(
                    createApartmentDto({ projectId: testProject.id, floorNumber: -6 })
                )
            ).rejects.toThrow("Floor number cannot be less than -5");
        });

        it("should handle special characters in text fields", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    name: "Apartment with 'quotes' and \"double quotes\"",
                    description: "Special chars: & < > % $",
                })
            );

            expect(apartment.name).toContain("quotes");
            expect(apartment.description).toContain("&");
        });

        it("should handle very long descriptions", async () => {
            const longDescription = "A".repeat(5000);
            const apartment = await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    description: longDescription,
                })
            );

            expect(apartment.description?.length).toBe(5000);
        });

        it("should handle URL validation for virtual tours", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    virtualVisitUrl: "https://example.com/tour/123",
                })
            );

            expect(apartment.virtualVisitUrl).toBe("https://example.com/tour/123");
        });

        it("should handle zero bedrooms (studio)", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({ projectId: testProject.id, bedrooms: 0 })
            );

            expect(apartment.bedrooms).toBe(0);
        });

        it("should handle multiple bathrooms", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({ projectId: testProject.id, bathrooms: 5 })
            );

            expect(apartment.bathrooms).toBe(5);
        });
    });

    // ==========================================================================
    // INTEGRATION TESTS
    // ==========================================================================

    describe("Integration Tests", () => {
        it("should handle complete workflow", async () => {
            // Create apartment
            const created = await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.AVAILABLE,
                    isPublished: false,
                })
            );

            expect(created.id).toBeGreaterThan(0);

            // Add media
            await PhotoModel.create(createPhotoDto({ photoableId: created.id, isCover: true }));
            await FloorPlanModel.create(createFloorPlanDto({ plannableId: created.id }));

            // Validate media
            const validation = await ApartmentModel.validateMediaForPublishing(
                created.id
            );
            expect(validation.valid).toBe(true);

            // Publish
            const published = await ApartmentModel.update(created.id, {
                isPublished: true,
            });
            expect(published?.isPublished).toBe(true);

            // Reserve
            const reserved = await ApartmentModel.markAsReserved(created.id);
            expect(reserved?.status).toBe(ApartmentStatus.RESERVED);

            // Sell
            const sold = await ApartmentModel.markAsSold(created.id);
            expect(sold?.status).toBe(ApartmentStatus.SOLD);

            // Check statistics
            const stats = await ApartmentModel.getProjectStatistics(testProject.id);
            expect(stats.sold).toBeGreaterThanOrEqual(1);

            // Soft delete
            await ApartmentModel.delete(created.id);
            const afterDelete = await ApartmentModel.findById(created.id);
            expect(afterDelete).toBeNull();

            // Restore
            await ApartmentModel.restore(created.id);
            const restored = await ApartmentModel.findById(created.id);
            expect(restored).toBeDefined();

            // Force delete
            await ApartmentModel.forceDelete(created.id);
            const forceDeleted = await ApartmentModel.findById(created.id, {
                includeDeleted: true,
            });
            expect(forceDeleted).toBeNull();
        });

        it("should handle complex filtering with media", async () => {
            const apt1 = await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.AVAILABLE,
                    isPublished: true,
                    bedrooms: 2,
                    price: 220000,
                })
            );
            await PhotoModel.create(createPhotoDto({ photoableId: apt1.id, isCover: true }));

            const apt2 = await ApartmentModel.create(
                createApartmentDto({
                    projectId: testProject.id,
                    status: ApartmentStatus.AVAILABLE,
                    isPublished: true,
                    bedrooms: 3,
                    price: 280000,
                })
            );
            await PhotoModel.create(createPhotoDto({ photoableId: apt2.id, isCover: true }));

            const results = await ApartmentModel.findApartments({
                status: ApartmentStatus.AVAILABLE,
                isPublished: true,
                minBedrooms: 2,
                maxPrice: 300000,
                includePhotos: true,
                sortBy: "price",
                sortOrder: "asc",
            });

            expect(results.length).toBeGreaterThanOrEqual(2);
            expect(results[0].photos).toBeDefined();
            expect(results[0].photos?.length).toBeGreaterThan(0);

            // Verify sorting
            for (let i = 1; i < results.length; i++) {
                expect(results[i].price).toBeGreaterThanOrEqual(
                    results[i - 1].price
                );
            }
        });

        it("should maintain referential integrity across operations", async () => {
            await ApartmentModel.transaction(async (trx) => {
                const apt1 = await ApartmentModel.create(
                    createApartmentDto(testProject.id),
                    trx
                );
                const apt2 = await ApartmentModel.create(
                    createApartmentDto(testProject.id),
                    trx
                );

                await ApartmentModel.update(
                    apt1.id,
                    { status: ApartmentStatus.SOLD },
                    trx
                );
                await ApartmentModel.delete(apt2.id, trx);

                const available = await ApartmentModel.findAvailable(
                    testProject.id,
                    {},
                    trx
                );
                const sold = await ApartmentModel.findSold(testProject.id, {}, trx);

                expect(sold.length).toBeGreaterThanOrEqual(1);
            });
        });

        it("should handle pagination with complex filters", async () => {
            // Create more test data
            for (let i = 0; i < 20; i++) {
                await ApartmentModel.create(
                    createApartmentDto({
                        projectId: testProject.id,
                        unitNumber: `PAGE${i}`,
                        bedrooms: (i % 4) + 1,
                        price: 200000 + i * 10000,
                    })
                );
            }

            const page1 = await ApartmentModel.paginateApartments({
                page: 1,
                limit: 5,
                minBedrooms: 2,
                sortBy: "price",
                sortOrder: "asc",
            });

            expect(page1.items.length).toBeLessThanOrEqual(5);
            expect(page1.pagination.page).toBe(1);
            expect(page1.pagination.hasNextPage).toBe(
                page1.pagination.page < page1.pagination.totalPages
            );

            if (page1.pagination.hasNextPage) {
                const page2 = await ApartmentModel.paginateApartments({
                    page: 2,
                    limit: 5,
                    minBedrooms: 2,
                    sortBy: "price",
                    sortOrder: "asc",
                });

                expect(page2.items.length).toBeGreaterThan(0);
                expect(page2.pagination.page).toBe(2);
                expect(page2.pagination.hasPrevPage).toBe(true);

                // Verify pagination continuity
                expect(page2.items[0].price).toBeGreaterThanOrEqual(
                    page1.items[page1.items.length - 1].price
                );
            }
        });
    });

    // ==========================================================================
    // PUBLISHING WORKFLOW
    // ==========================================================================

    describe("Publishing Workflow", () => {
        it("should prevent publishing without required media", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({ projectId: testProject.id, isPublished: false })
            );

            await expect(
                ApartmentModel.update(apartment.id, { isPublished: true })
            ).rejects.toThrow("Cannot publish apartment");
        });

        it("should allow publishing with required media", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({ projectId: testProject.id, isPublished: false })
            );

            await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));

            const published = await ApartmentModel.update(apartment.id, {
                isPublished: true,
            });

            expect(published?.isPublished).toBe(true);
        });

        it("should allow unpublishing", async () => {
            const apartment = await ApartmentModel.create(
                createApartmentDto({ projectId: testProject.id, isPublished: false })
            );

            await PhotoModel.create(createPhotoDto({ photoableId: apartment.id, isCover: true }));
            await ApartmentModel.update(apartment.id, { isPublished: true });

            const unpublished = await ApartmentModel.update(apartment.id, {
                isPublished: false,
            });

            expect(unpublished?.isPublished).toBe(false);
        });
    });
});