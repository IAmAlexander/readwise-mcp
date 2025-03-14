const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'YOUR_READWISE_TOKEN'; // Replace with your actual token

// Test functions
async function testStatus() {
  try {
    console.log('Testing status endpoint...');
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

async function testAdvancedSearch() {
  try {
    console.log('\nTesting advanced search endpoint...');
    const response = await axios.get(`${SERVER_URL}/search/advanced?query=test`, {
      headers: {
        'Authorization': `Token ${AUTH_TOKEN}`
      }
    });
    console.log('Status:', response.status);
    console.log('Data (first 2 results):', JSON.stringify(response.data.results.slice(0, 2), null, 2));
    console.log(`Total results: ${response.data.count}`);
    return true;
  } catch (error) {
    console.error('Error testing advanced search:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testReadingProgress() {
  try {
    console.log('\nTesting reading progress endpoint...');
    const response = await axios.get(`${SERVER_URL}/reading/progress?status=reading`, {
      headers: {
        'Authorization': `Token ${AUTH_TOKEN}`
      }
    });
    console.log('Status:', response.status);
    console.log('Data (first 2 results):', JSON.stringify(response.data.results.slice(0, 2), null, 2));
    console.log(`Total results: ${response.data.count}`);
    return true;
  } catch (error) {
    console.error('Error testing reading progress:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== READWISE MCP SERVER TESTS ===');
  
  // Always test status (doesn't require auth)
  await testStatus();
  
  // Only run authenticated tests if token is provided
  if (AUTH_TOKEN !== 'YOUR_READWISE_TOKEN') {
    await testTags();
    await testAdvancedSearch();
    await testReadingProgress();
  } else {
    console.log('\nSkipping authenticated tests. Replace YOUR_READWISE_TOKEN with your actual token to run all tests.');
  }
  
  console.log('\n=== TESTS COMPLETED ===');
}

// Run the tests
runTests(); 