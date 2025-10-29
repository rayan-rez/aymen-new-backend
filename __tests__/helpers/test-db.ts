/**
 * Test Database Helper
 * Utilities for managing database connections in tests
 * Prevents memory leaks by properly managing connection lifecycle
 */

import db from "@/config/database";

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
 * Wait utility
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  closeDatabase,
  cleanTables,
  waitFor,
};