/**
 * Test Helpers
 * Reusable utilities for tests
 */

import db from "@/config/database";
import ProjectModel from "@models/project.model";
import { ProjectStatus } from "@models/project.model";
import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from 'express';


/**
 * Properly closes database connection for test cleanup
 * Call this in afterAll() of each test file
 */
export async function closeDatabase(): Promise<void> {
  try {
    // Check if connection is still available
    await db.raw('SELECT 1');
    
    // Give pending operations time to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Destroy the connection pool
    await db.destroy();
  } catch (error) {
    // Connection already closed or error - silently ignore
    if (error instanceof Error && !error.message.includes('destroy')) {
      console.warn('Database cleanup warning:', error.message);
    }
  }
}

/**
 * Cleans specific tables in the correct order
 */
export async function cleanTables(tables: string[]): Promise<void> {
  try {
    // Check if connection is available
    await db.raw('SELECT 1');
    
    for (const table of tables) {
      try {
        const tableExists = await db.schema.hasTable(table);
        if (tableExists) {
          await db(table).del();
        }
      } catch (error) {
        // Skip if table doesn't exist or other errors
        continue;
      }
    }
    
    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    // Connection not available, skip cleanup
  }
}
/**
 * Generates a unique identifier
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generates a unique slug
 */
export function uniqueSlug(prefix: string): string {
  return `${prefix}-${generateUniqueId()}`;
}

/**
 * Generates a unique email
 */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.com`;
}

/**
 * Waits for specified milliseconds
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a test project
 */
export async function createTestProject(overrides: any = {}) {
  const slug = uniqueSlug("test-project");
  return await ProjectModel.create({
    name: "Test Project",
    slug,
    address: "123 Test St",
    status: ProjectStatus.PLANNING,
    ...overrides,
  });
}

/**
 * Cleans up specific tables in correct order (respects FK constraints)
 */
export async function cleanupTables(tables: string[]): Promise<void> {
  try {
    // Check connection
    await db.raw("SELECT 1");
    
    // Disable FK checks for cleanup
    await db.raw("SET FOREIGN_KEY_CHECKS = 0");
    
    for (const table of tables) {
      try {
        const tableExists = await db.schema.hasTable(table);
        if (tableExists) {
          await db(table).del();
        }
      } catch (error) {
        console.warn(`Could not clean table ${table}:`, error);
      }
    }
    
    // Re-enable FK checks
    await db.raw("SET FOREIGN_KEY_CHECKS = 1");
    
    await waitFor(100);
  } catch (error) {
    // Connection not available
  }
}

/**
 * Cleans up all test data in correct dependency order
 */
export async function cleanupAllTables(): Promise<void> {
  const tables = [
    // Analytics tables (deepest children)
    "page_views",
    "user_events", 
    "property_interactions",
    "event_analytics",
    
    // Event relationships
    "event_influencers",
    "event_registrations",
    
    // Form submissions and leads
    "lead_mirrors",
    "form_submissions",
    
    // User sessions
    "user_sessions",
    
    // Media (polymorphic)
    "photos",
    "floor_plans",
    
    // Blog
    "blog_post_sections",
    "blog_posts",
    
    // Feedback
    "trade_show_feedback",
    "customer_feedback",
    
    // Properties
    "apartments",
    "commercial_properties",
    
    // Project relationships
    "project_features",
    "project_media",
    
    // Events
    "events",
    
    // Projects
    "projects",
    
    // Reference data
    "features",
    "locations",
    
    // Test table
    "test_table",
  ];

  await cleanupTables(tables);
}

/**
 * Creates a date without timezone issues
 */
export function createTestDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00.000Z");
}

/**
 * Compares dates ignoring milliseconds
 */
export function datesEqual(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return date1 === date2;
  return Math.abs(date1.getTime() - date2.getTime()) < 1000;
}

/**
 * Creates multiple test records
 */
export async function createBulkRecords<T>(
  createFn: (data: any) => Promise<T>,
  count: number,
  dataGenerator: (index: number) => any
): Promise<T[]> {
  const records: T[] = [];
  for (let i = 0; i < count; i++) {
    const record = await createFn(dataGenerator(i));
    records.push(record);
  }
  return records;
}

/**
 * Asserts that an async function throws
 */
export async function expectAsyncThrow(
  fn: () => Promise<any>,
  errorMessage?: string
): Promise<void> {
  let error: Error | null = null;
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).not.toBeNull();
  if (errorMessage) {
    expect(error?.message).toContain(errorMessage);
  }
}

/**
 * Retry function for flaky tests
 * Retries a function up to `retries` times with a delay between attempts
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 200
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) throw error;
      await waitFor(delayMs);
    }
  }
}

/**
 * Wraps a function in a database transaction (for isolated tests)
 * Automatically rolls back after execution
 */
export async function withTransaction<T>(
  fn: (trx: any) => Promise<T>
): Promise<T> {
  return await db.transaction(async (trx) => {
    try {
      const result = await fn(trx);
      await trx.rollback(); // rollback to avoid persisting test data
      return result;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  });
}

/**
 * Creates mock Express.js request and response objects
 */
export function mockRequestResponse(overrides: any = {}) {
  const req: any = {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides.req,
  };

  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.jsonPayload = payload;
      return this;
    },
    send(payload: any) {
      this.sentPayload = payload;
      return this;
    },
    ...overrides.res,
  };

  const next = overrides.next || jest.fn();

  return { req, res, next };
}

/**
 * Creates a temporary test file (useful for upload/multipart tests)
 */
export async function createTempFile(
  name: string,
  content = "Temporary test file"
): Promise<string> {
  const tempDir = path.resolve(__dirname, "../../tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const filePath = path.join(tempDir, `${name}-${Date.now()}.txt`);
  await fs.promises.writeFile(filePath, content);
  return filePath;
}

/**
 * Deletes all temporary test files
 */
export async function cleanupTempFiles(): Promise<void> {
  const tempDir = path.resolve(__dirname, "../../tmp");
  if (!fs.existsSync(tempDir)) return;
  const files = await fs.promises.readdir(tempDir);
  for (const file of files) {
    await fs.promises.unlink(path.join(tempDir, file));
  }
}

/**
 * Generates fake photo data (for photo-related tests)
 */
export function generateFakePhotoData(overrides: any = {}) {
  return {
    url: `https://example.com/photo-${generateUniqueId()}.jpg`,
    caption: "Test Photo",
    is_cover: false,
    photoable_type: "project",
    photoable_id: 1,
    ...overrides,
  };
}

/**
 * Gracefully disconnects the database after tests
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await db.destroy();
  } catch (err) {
    console.error("Failed to close database connection:", err);
  }
}


export const mockRequest = (data: Partial<Request> = {}): Request =>
  data as Request;

export const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = (): NextFunction => jest.fn();