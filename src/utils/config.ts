import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Configuration for the MCP server
 */
export interface ServerConfig {
  /**
   * Readwise API key
   */
  readwiseApiKey: string;
  
  /**
   * Readwise API base URL
   */
  readwiseApiBaseUrl: string;
  
  /**
   * Port to listen on for HTTP transport
   */
  port: number;
  
  /**
   * Transport type
   */
  transport: 'stdio' | 'sse';
  
  /**
   * Whether debug mode is enabled
   */
  debug: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: ServerConfig = {
  readwiseApiKey: '',
  readwiseApiBaseUrl: 'https://readwise.io/api/v2',
  port: 3000,
  transport: 'stdio',
  debug: false
};

/**
 * Get the path to the config directory
 * @returns The path to the config directory
 */
function getConfigDir(): string {
  // Check if running in Docker
  if (process.env.DOCKER_CONTAINER) {
    return '/app/config';
  }
  
  // Otherwise use user home directory
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.readwise-mcp');
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  return configDir;
}

/**
 * Get the path to the credentials file
 * @returns The path to the credentials file
 */
function getCredentialsPath(): string {
  return path.join(getConfigDir(), 'credentials.json');
}

/**
 * Get the path to the config file
 * @returns The path to the config file
 */
function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * Load configuration from environment variables
 * @returns Partial configuration from environment variables
 */
function loadEnvConfig(): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {};
  
  if (process.env.READWISE_API_KEY) {
    config.readwiseApiKey = process.env.READWISE_API_KEY;
  }
  
  if (process.env.READWISE_API_BASE_URL) {
    config.readwiseApiBaseUrl = process.env.READWISE_API_BASE_URL;
  }
  
  if (process.env.PORT) {
    config.port = parseInt(process.env.PORT, 10);
  }
  
  if (process.env.TRANSPORT && ['stdio', 'sse'].includes(process.env.TRANSPORT)) {
    config.transport = process.env.TRANSPORT as 'stdio' | 'sse';
  }
  
  if (process.env.DEBUG) {
    config.debug = process.env.DEBUG === 'true';
  }
  
  return config;
}

/**
 * Save the API key to the credentials file
 * @param apiKey - The API key to save
 */
export function saveApiKey(apiKey: string): void {
  const credentialsPath = getCredentialsPath();
  fs.writeFileSync(credentialsPath, JSON.stringify({ readwiseApiKey: apiKey }), 'utf8');
}

/**
 * Save the configuration to the config file
 * @param config - Partial configuration to save
 */
export function saveConfig(config: Partial<ServerConfig>): void {
  const configPath = getConfigPath();
  
  // Load existing config
  let existingConfig: Partial<ServerConfig> = {};
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      existingConfig = JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }
  
  // Merge existing config with new config
  const mergedConfig = { ...existingConfig, ...config };
  
  // Save config
  fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
  
  // If API key is provided, also save to credentials file for backward compatibility
  if (config.readwiseApiKey) {
    saveApiKey(config.readwiseApiKey);
  }
}

/**
 * Check if the credentials file exists
 * @returns Whether the credentials file exists
 */
export function hasCredentials(): boolean {
  const credentialsPath = getCredentialsPath();
  return fs.existsSync(credentialsPath);
}

/**
 * Load the API key from the credentials file
 * @returns The API key, or undefined if not found
 */
function loadApiKey(): string | undefined {
  const credentialsPath = getCredentialsPath();
  
  if (fs.existsSync(credentialsPath)) {
    try {
      const data = fs.readFileSync(credentialsPath, 'utf8');
      const json = JSON.parse(data);
      return json.readwiseApiKey;
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }
  
  return undefined;
}

/**
 * Load configuration from the config file
 * @returns Partial configuration from the config file
 */
function loadFileConfig(): Partial<ServerConfig> {
  const configPath = getConfigPath();
  
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config file:', error);
    }
  }
  
  return {};
}

/**
 * Get the server configuration
 * @returns The server configuration
 */
export function getConfig(): ServerConfig {
  // Start with default configuration
  const config = { ...defaultConfig };
  
  // Load configuration from files
  const fileConfig = loadFileConfig();
  Object.assign(config, fileConfig);
  
  // If API key not provided in config file, try to load from credentials file
  if (!config.readwiseApiKey) {
    const apiKey = loadApiKey();
    if (apiKey) {
      config.readwiseApiKey = apiKey;
    }
  }
  
  // Load configuration from environment variables (highest priority)
  const envConfig = loadEnvConfig();
  Object.assign(config, envConfig);
  
  return config;
}
