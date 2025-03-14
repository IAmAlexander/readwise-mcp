# Readwise MCP Server Tests

This directory contains tests for the Readwise MCP server features. The tests use Jest as the testing framework and Supertest for API testing.

## Test Structure

The tests are organized by feature:

- `status.test.ts`: Tests for the status endpoint
- `tags.test.ts`: Tests for tag management features
- `advanced-search.test.ts`: Tests for advanced search functionality
- `reading-progress.test.ts`: Tests for reading progress tracking
- `bulk-operations.test.ts`: Tests for bulk operations with confirmation
- `delete-confirmation.test.ts`: Tests for delete confirmation mechanism

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run tests in watch mode (automatically re-run when files change)
npm run test:watch

# Generate test coverage report
npm run test:coverage

# Run specific test suites
npm run test:tags
npm run test:search
npm run test:bulk
npm run test:progress
npm run test:delete
```

## Test Coverage

To view the test coverage report, run:

```bash
npm run test:coverage
```

This will generate a coverage report in the `coverage` directory.

## Adding New Tests

When adding new features to the Readwise MCP server, please follow these guidelines for creating tests:

1. Create a new test file named `feature-name.test.ts`
2. Use the existing test files as templates
3. Mock the necessary endpoints using Express
4. Write tests for both success and error cases
5. Ensure all tests are independent and don't rely on the state of other tests

## Mock Server Approach

The tests use a mock Express server to simulate the API endpoints. This approach allows us to:

1. Test the API contract without requiring a real Readwise API token
2. Test error handling and edge cases that might be difficult to reproduce with the real API
3. Run tests quickly without making actual network requests

Each test file creates its own isolated Express app with mock endpoints that match the behavior of the real API.

## Test Helpers

Common testing utilities and helper functions may be added to a `test-utils.ts` file in the future to reduce duplication across test files. 