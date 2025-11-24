// This file contains setup code that will be run before each test

// Set up environment variables for testing
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.READWISE_API_KEY = 'test-api-key';
process.env.READWISE_API_BASE_URL = 'https://readwise.io/api/v2';

// Global test timeout (5 seconds)
jest.setTimeout(5000);

// Add global mocks here if needed
// For example:
// global.fetch = jest.fn();

// Add custom matchers if needed
// expect.extend({
//   // Custom matchers here
// });

// Clean up after all tests
afterAll(() => {
  // Any cleanup needed after all tests run
  jest.clearAllMocks();
});
