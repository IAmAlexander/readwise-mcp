/**
 * Constants used throughout the Readwise MCP server
 */

/**
 * Confirmation strings required for destructive operations
 * These must be passed exactly as-is to confirm the operation
 */
export const CONFIRMATIONS = {
  /** Confirmation for deleting a single document */
  DELETE_DOCUMENT: 'I confirm deletion',
  /** Confirmation for deleting multiple documents in bulk */
  BULK_DELETE_DOCUMENTS: 'I confirm deletion of these documents',
  /** Confirmation for saving multiple documents in bulk */
  BULK_SAVE_DOCUMENTS: 'I confirm saving these items',
  /** Confirmation for updating multiple documents in bulk */
  BULK_UPDATE_DOCUMENTS: 'I confirm these updates',
} as const;

/**
 * API endpoints for different Readwise API versions
 */
export const API_ENDPOINTS = {
  V2: {
    HIGHLIGHTS: '/highlights',
    BOOKS: '/books',
    DOCUMENTS: '/documents',
    TAGS: '/tags',
    SEARCH: '/search',
  },
  V3: {
    SAVE: '/v3/save/',
    UPDATE: '/v3/update/',
    DELETE: '/v3/delete/',
  },
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Default port for the server */
  PORT: 3000,
  /** Default transport type */
  TRANSPORT: 'stdio' as const,
  /** Default page size for pagination */
  PAGE_SIZE: 20,
  /** Maximum page size for pagination */
  MAX_PAGE_SIZE: 100,
  /** Default rate limit (requests per minute) */
  RATE_LIMIT_PER_MINUTE: 60,
  /** SSE heartbeat interval in milliseconds */
  SSE_HEARTBEAT_INTERVAL_MS: 30000,
} as const;

/**
 * Reading status options
 */
export const READING_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

/**
 * Document location options
 */
export const DOCUMENT_LOCATIONS = {
  NEW: 'new',
  LATER: 'later',
  ARCHIVE: 'archive',
  FEED: 'feed',
} as const;

export type ReadingStatus = typeof READING_STATUS[keyof typeof READING_STATUS];
export type DocumentLocation = typeof DOCUMENT_LOCATIONS[keyof typeof DOCUMENT_LOCATIONS];
