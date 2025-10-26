/**
 * Global Teardown
 * Runs once after all tests
 */

export default async function globalTeardown() {
  console.log("\n🏁 Jest Test Suite Complete");
  console.log("✨ All tests finished\n");

  // Force close any remaining connections
  await new Promise((resolve) => setTimeout(resolve, 500));
}
