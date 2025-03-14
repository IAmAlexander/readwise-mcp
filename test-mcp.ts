import axios, { AxiosResponse, AxiosError } from 'axios';

// Configuration
const SERVER_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'YOUR_READWISE_TOKEN'; // Replace with your actual token

// Interfaces for response types
interface StatusResponse {
  status: string;
  version: string;
  timestamp: string;
}

interface Tag {
  id: number;
  name: string;
}

interface TagsResponse {
  count: number;
  results: Tag[];
}

interface SearchResult {
  id: number;
  title: string;
  author: string;
  category: string;
  source: string;
  highlights_count: number;
  updated: string;
  cover_image_url: string;
  tags: Tag[];
  [key: string]: any; // For any additional properties
}

interface SearchResponse {
  count: number;
  results: SearchResult[];
}

interface ReadingProgressItem {
  id: number;
  title: string;
  author: string;
  status: string;
  progress_percentage: number;
  updated: string;
  [key: string]: any; // For any additional properties
}

interface ReadingProgressResponse {
  count: number;
  results: ReadingProgressItem[];
}

// Test functions
async function testStatus(): Promise<boolean> {
  try {
    console.log('Testing status endpoint...');
    const response: AxiosResponse<StatusResponse> = await axios.get(`${SERVER_URL}/status`);
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error testing status:', axiosError.message);
    if (axiosError.response) {
      console.error('Response data:', axiosError.response.data);
    }
    return false;
  }
}

async function testTags(): Promise<boolean> {
  try {
    console.log('\nTesting tags endpoint...');
    const response: AxiosResponse<TagsResponse> = await axios.get(`${SERVER_URL}/tags`, {
      headers: {
        'Authorization': `Token ${AUTH_TOKEN}`
      }
    });
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error testing tags:', axiosError.message);
    if (axiosError.response) {
      console.error('Response data:', axiosError.response.data);
    }
    return false;
  }
}

async function testAdvancedSearch(): Promise<boolean> {
  try {
    console.log('\nTesting advanced search endpoint...');
    const response: AxiosResponse<SearchResponse> = await axios.get(`${SERVER_URL}/search/advanced?query=test`, {
      headers: {
        'Authorization': `Token ${AUTH_TOKEN}`
      }
    });
    console.log('Status:', response.status);
    console.log('Data (first 2 results):', JSON.stringify(response.data.results.slice(0, 2), null, 2));
    console.log(`Total results: ${response.data.count}`);
    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error testing advanced search:', axiosError.message);
    if (axiosError.response) {
      console.error('Response data:', axiosError.response.data);
    }
    return false;
  }
}

async function testReadingProgress(): Promise<boolean> {
  try {
    console.log('\nTesting reading progress endpoint...');
    const response: AxiosResponse<ReadingProgressResponse> = await axios.get(`${SERVER_URL}/reading/progress?status=reading`, {
      headers: {
        'Authorization': `Token ${AUTH_TOKEN}`
      }
    });
    console.log('Status:', response.status);
    console.log('Data (first 2 results):', JSON.stringify(response.data.results.slice(0, 2), null, 2));
    console.log(`Total results: ${response.data.count}`);
    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error testing reading progress:', axiosError.message);
    if (axiosError.response) {
      console.error('Response data:', axiosError.response.data);
    }
    return false;
  }
}

// Run tests
async function runTests(): Promise<void> {
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