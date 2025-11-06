/**
 * Test Sequencer
 * Controls the order in which test files run
 * Ensures base tests run before dependent tests
 */

const Sequencer = require("@jest/test-sequencer").default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Define test priority order
    const priority = {
      "base.model.test.ts": 1,
      "photo.model.test.ts": 2,
      "floor-plan.model.test.ts": 2,
      "project.model.test.ts": 3,
      "apartment.model.test.ts": 4,
      "blog-post.model.test.ts": 4,
      "catalog-download-request.model.test.ts": 4,
      "appointment-request.model.test.ts": 4,
    };

    // Sort tests by priority, then alphabetically
    const sortedTests = tests.sort((testA, testB) => {
      const testAName = testA.path.split("/").pop();
      const testBName = testB.path.split("/").pop();

      const priorityA = priority[testAName] || 999;
      const priorityB = priority[testBName] || 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return testAName.localeCompare(testBName);
    });

    return sortedTests;
  }
}

module.exports = CustomSequencer;
