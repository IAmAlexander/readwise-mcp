const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const MANIFEST_PATH = path.join(__dirname, 'mcp-manifest.json');
const AUTH_TOKEN = 'YOUR_READWISE_TOKEN'; // Replace with your actual token

// Read the manifest file
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
console.log('Loaded MCP manifest:', manifest.name_for_human);

// Function to get the OpenAPI spec
async function getOpenAPISpec() {
  try {
    console.log('Fetching OpenAPI spec...');
    const response = await axios.get(`${SERVER_URL}/openapi.json`);
    console.log('OpenAPI spec version:', response.data.info.version);
    console.log('Available endpoints:');
    
    // Print all available endpoints
    const paths = Object.keys(response.data.paths);
    paths.forEach(path => {
      const methods = Object.keys(response.data.paths[path]);
      methods.forEach(method => {
        console.log(`  ${method.toUpperCase()} ${path}`);
      });
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching OpenAPI spec:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

// Function to test the status endpoint
async function testStatus() {
  try {
    console.log('\nTesting status endpoint...');
    const response = await axios.get(`${SERVER_URL}/status`);
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Error testing status:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Function to test the tags endpoint
async function testTags() {
  try {
    console.log('\nTesting tags endpoint...');
    const response = await axios.get(`${SERVER_URL}/tags`, {
      headers: {
        'Authorization': `Token ${AUTH_TOKEN}`
      }
    });
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Error testing tags:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== READWISE MCP CLIENT TESTS ===');
  
  // Get OpenAPI spec
  const spec = await getOpenAPISpec();
  if (!spec) {
    console.error('Failed to fetch OpenAPI spec. Exiting...');
    return;
  }
  
  // Test status endpoint
  await testStatus();
  
  // Only run authenticated tests if token is provided
  if (AUTH_TOKEN !== 'YOUR_READWISE_TOKEN') {
    await testTags();
  } else {
    console.log('\nSkipping authenticated tests. Replace YOUR_READWISE_TOKEN with your actual token to run all tests.');
  }
  
  console.log('\n=== TESTS COMPLETED ===');
}

// Run the tests
runTests(); 