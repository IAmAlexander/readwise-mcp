import fs from 'fs';
import path from 'path';
import axios, { AxiosResponse, AxiosError } from 'axios';

// Configuration
const SERVER_URL = 'http://localhost:3000';
const MANIFEST_PATH = path.join(__dirname, 'mcp-manifest.json');

// Interfaces
interface MCPManifest {
  schema_version: string;
  name: string;
  name_for_human: string;
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

// Read the manifest file
const manifest: MCPManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
console.log('Loaded MCP manifest:', manifest.name_for_human);

// Function to get the OpenAPI spec
async function getOpenAPISpec(): Promise<OpenAPISpec | null> {
  try {
    console.log('Fetching OpenAPI spec...');
    const response: AxiosResponse<OpenAPISpec> = await axios.get(`${SERVER_URL}/openapi.json`);
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

// Function to validate the MCP manifest
async function validateManifest(): Promise<boolean> {
  try {
    console.log('Validating MCP manifest...');
    
    // Check required fields
    const requiredFields: (keyof MCPManifest)[] = [
      'schema_version', 'name', 'name_for_human', 'description_for_human', 
      'description_for_model', 'auth', 'api', 'logo_url', 'contact_email', 'legal_info_url'
    ];
    
    const missingFields = requiredFields.filter(field => !manifest[field]);
    if (missingFields.length > 0) {
      console.error('Missing required fields in manifest:', missingFields.join(', '));
      return false;
    }
    
    // Check auth fields
    const requiredAuthFields: (keyof MCPManifest['auth'])[] = [
      'type', 'client_url', 'authorization_url', 'authorization_content_type'
    ];
    
    const missingAuthFields = requiredAuthFields.filter(field => !manifest.auth[field]);
    if (missingAuthFields.length > 0) {
      console.error('Missing required auth fields in manifest:', missingAuthFields.join(', '));
      return false;
    }
    
    // Check API fields
    const requiredApiFields: (keyof MCPManifest['api'])[] = ['type', 'url'];
    
    const missingApiFields = requiredApiFields.filter(field => !manifest.api[field]);
    if (missingApiFields.length > 0) {
      console.error('Missing required API fields in manifest:', missingApiFields.join(', '));
      return false;
    }
    
    console.log('Manifest validation successful!');
    return true;
  } catch (error) {
    console.error('Error validating manifest:', (error as Error).message);
    return false;
  }
}

// Function to validate the OpenAPI spec
async function validateOpenAPISpec(spec: OpenAPISpec | null): Promise<boolean> {
  if (!spec) {
    console.error('No OpenAPI spec provided for validation');
    return false;
  }
  
  try {
    console.log('Validating OpenAPI spec...');
    
    // Check required fields
    if (!spec.openapi) {
      console.error('Missing openapi version in spec');
      return false;
    }
    
    if (!spec.info || !spec.info.title || !spec.info.version) {
      console.error('Missing info fields in spec');
      return false;
    }
    
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      console.error('No paths defined in spec');
      return false;
    }
    
    // Check for required endpoints
    const requiredEndpoints = ['/status', '/manifest.json', '/openapi.json'];
    const missingEndpoints = requiredEndpoints.filter(endpoint => !spec.paths[endpoint]);
    
    if (missingEndpoints.length > 0) {
      console.error('Missing required endpoints in spec:', missingEndpoints.join(', '));
      return false;
    }
    
    // Print summary of endpoints
    console.log('OpenAPI spec contains the following endpoints:');
    Object.keys(spec.paths).forEach(path => {
      const methods = Object.keys(spec.paths[path]);
      methods.forEach(method => {
        console.log(`  ${method.toUpperCase()} ${path}`);
      });
    });
    
    console.log('OpenAPI spec validation successful!');
    return true;
  } catch (error) {
    console.error('Error validating OpenAPI spec:', (error as Error).message);
    return false;
  }
}

// Function to test the manifest endpoint
async function testManifestEndpoint(): Promise<boolean> {
  try {
    console.log('Testing manifest endpoint...');
    const response: AxiosResponse<MCPManifest> = await axios.get(`${SERVER_URL}/manifest.json`);
    
    if (response.status !== 200) {
      console.error('Manifest endpoint returned non-200 status:', response.status);
      return false;
    }
    
    const serverManifest = response.data;
    
    // Compare with local manifest
    const localManifestStr = JSON.stringify(manifest, null, 2);
    const serverManifestStr = JSON.stringify(serverManifest, null, 2);
    
    if (localManifestStr !== serverManifestStr) {
      console.error('Server manifest differs from local manifest');
      console.log('Local manifest:', localManifestStr);
      console.log('Server manifest:', serverManifestStr);
      return false;
    }
    
    console.log('Manifest endpoint test successful!');
    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error testing manifest endpoint:', axiosError.message);
    if (axiosError.response) {
      console.error('Response data:', axiosError.response.data);
    }
    return false;
  }
}

// Run tests
async function runTests(): Promise<void> {
  console.log('=== MCP VALIDATION TESTS ===');
  
  // Validate manifest
  const manifestValid = await validateManifest();
  if (!manifestValid) {
    console.error('Manifest validation failed. Exiting...');
    return;
  }
  
  // Get OpenAPI spec
  const spec = await getOpenAPISpec();
  if (!spec) {
    console.error('Failed to fetch OpenAPI spec. Exiting...');
    return;
  }
  
  // Validate OpenAPI spec
  const specValid = await validateOpenAPISpec(spec);
  if (!specValid) {
    console.error('OpenAPI spec validation failed. Exiting...');
    return;
  }
  
  // Test manifest endpoint
  const manifestEndpointValid = await testManifestEndpoint();
  if (!manifestEndpointValid) {
    console.error('Manifest endpoint test failed. Exiting...');
    return;
  }
  
  console.log('\n=== ALL TESTS PASSED ===');
}

// Run the tests
runTests(); 