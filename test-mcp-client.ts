import fs from 'fs';
import path from 'path';
import axios, { AxiosResponse, AxiosError } from 'axios';

// Configuration
const SERVER_URL = 'http://localhost:3000';
const MANIFEST_PATH = path.join(__dirname, 'mcp-manifest.json');
const AUTH_TOKEN = 'YOUR_READWISE_TOKEN'; // Replace with your actual token

// Interfaces
interface MCPManifest {
  name: string;
  name_for_human: string;
  schema_version: string;
  description_for_human: string;
  description_for_model: string;
  auth: {
    type: string;
    client_url: string;
    scope: string;
    authorization_url: string;
    authorization_content_type: string;
  };
  api: {
    type: string;
    url: string;
  };
  logo_url: string;
  contact_email: string;
  legal_info_url: string;
}

interface OpenAPIPath {
  [path: string]: {
    [method: string]: {
      operationId: string;
      summary: string;
      description: string;
      parameters?: any[];
      responses: {
        [statusCode: string]: {
          description: string;
          content?: {
            [contentType: string]: {
              schema: {
                type: string;
              };
            };
          };
        };
      };
    };
  };
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: {
    url: string;
    description: string;
  }[];
  paths: OpenAPIPath;
}

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

// Read the manifest file
const manifest: MCPManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
console.log('Loaded MCP manifest:', manifest.name_for_human);

// Function to get the OpenAPI spec
async function getOpenAPISpec(): Promise<OpenAPISpec | null> {
  try {
    console.log('Fetching OpenAPI spec...');
    const response: AxiosResponse<OpenAPISpec> = await axios.get(`${SERVER_URL}/openapi.json`);
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
    const axiosError = error as AxiosError;
    console.error('Error fetching OpenAPI spec:', axiosError.message);
    if (axiosError.response) {
      console.error('Response data:', axiosError.response.data);
    }
    return null;
  }
}

// Function to test the status endpoint
async function testStatus(): Promise<boolean> {
  try {
    console.log('\nTesting status endpoint...');
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

// Function to test the tags endpoint
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

// Run tests
async function runTests(): Promise<void> {
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