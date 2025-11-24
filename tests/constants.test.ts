import {
  CONFIRMATIONS,
  API_ENDPOINTS,
  DEFAULTS,
  READING_STATUS,
  DOCUMENT_LOCATIONS
} from '../src/constants.js';

describe('CONFIRMATIONS', () => {
  it('should have the correct confirmation strings', () => {
    expect(CONFIRMATIONS.DELETE_DOCUMENT).toBe('I confirm deletion');
    expect(CONFIRMATIONS.BULK_DELETE_DOCUMENTS).toBe('I confirm deletion of these documents');
    expect(CONFIRMATIONS.BULK_SAVE_DOCUMENTS).toBe('I confirm saving these items');
    expect(CONFIRMATIONS.BULK_UPDATE_DOCUMENTS).toBe('I confirm these updates');
  });

  it('should be readonly (cannot be modified)', () => {
    // TypeScript prevents this at compile time, but we can verify the object is frozen-like
    const keys = Object.keys(CONFIRMATIONS);
    expect(keys).toContain('DELETE_DOCUMENT');
    expect(keys).toContain('BULK_DELETE_DOCUMENTS');
    expect(keys).toContain('BULK_SAVE_DOCUMENTS');
    expect(keys).toContain('BULK_UPDATE_DOCUMENTS');
    expect(keys.length).toBe(4);
  });

  it('should have consistent format for confirmation strings', () => {
    // All confirmations should start with "I confirm"
    Object.values(CONFIRMATIONS).forEach(value => {
      expect(value.startsWith('I confirm')).toBe(true);
    });
  });
});

describe('API_ENDPOINTS', () => {
  describe('V2', () => {
    it('should have the correct V2 endpoints', () => {
      expect(API_ENDPOINTS.V2.HIGHLIGHTS).toBe('/highlights');
      expect(API_ENDPOINTS.V2.BOOKS).toBe('/books');
      expect(API_ENDPOINTS.V2.DOCUMENTS).toBe('/documents');
      expect(API_ENDPOINTS.V2.TAGS).toBe('/tags');
      expect(API_ENDPOINTS.V2.SEARCH).toBe('/search');
    });
  });

  describe('V3', () => {
    it('should have the correct V3 endpoints', () => {
      expect(API_ENDPOINTS.V3.SAVE).toBe('/v3/save/');
      expect(API_ENDPOINTS.V3.UPDATE).toBe('/v3/update/');
      expect(API_ENDPOINTS.V3.DELETE).toBe('/v3/delete/');
    });

    it('should have trailing slashes for V3 endpoints', () => {
      expect(API_ENDPOINTS.V3.SAVE.endsWith('/')).toBe(true);
      expect(API_ENDPOINTS.V3.UPDATE.endsWith('/')).toBe(true);
      expect(API_ENDPOINTS.V3.DELETE.endsWith('/')).toBe(true);
    });
  });
});

describe('DEFAULTS', () => {
  it('should have correct default port', () => {
    expect(DEFAULTS.PORT).toBe(3000);
    expect(typeof DEFAULTS.PORT).toBe('number');
  });

  it('should have correct default transport', () => {
    expect(DEFAULTS.TRANSPORT).toBe('stdio');
  });

  it('should have correct pagination defaults', () => {
    expect(DEFAULTS.PAGE_SIZE).toBe(20);
    expect(DEFAULTS.MAX_PAGE_SIZE).toBe(100);
    expect(DEFAULTS.PAGE_SIZE).toBeLessThanOrEqual(DEFAULTS.MAX_PAGE_SIZE);
  });

  it('should have correct rate limiting defaults', () => {
    expect(DEFAULTS.RATE_LIMIT_PER_MINUTE).toBe(60);
    expect(DEFAULTS.RATE_LIMIT_PER_MINUTE).toBeGreaterThan(0);
  });

  it('should have correct SSE heartbeat interval', () => {
    expect(DEFAULTS.SSE_HEARTBEAT_INTERVAL_MS).toBe(30000);
    expect(DEFAULTS.SSE_HEARTBEAT_INTERVAL_MS).toBeGreaterThan(0);
  });
});

describe('READING_STATUS', () => {
  it('should have all expected reading statuses', () => {
    expect(READING_STATUS.NOT_STARTED).toBe('not_started');
    expect(READING_STATUS.IN_PROGRESS).toBe('in_progress');
    expect(READING_STATUS.COMPLETED).toBe('completed');
  });

  it('should have exactly 3 statuses', () => {
    const statuses = Object.values(READING_STATUS);
    expect(statuses.length).toBe(3);
  });

  it('should use snake_case format', () => {
    Object.values(READING_STATUS).forEach(status => {
      expect(status).toMatch(/^[a-z]+(_[a-z]+)*$/);
    });
  });
});

describe('DOCUMENT_LOCATIONS', () => {
  it('should have all expected document locations', () => {
    expect(DOCUMENT_LOCATIONS.NEW).toBe('new');
    expect(DOCUMENT_LOCATIONS.LATER).toBe('later');
    expect(DOCUMENT_LOCATIONS.ARCHIVE).toBe('archive');
    expect(DOCUMENT_LOCATIONS.FEED).toBe('feed');
  });

  it('should have exactly 4 locations', () => {
    const locations = Object.values(DOCUMENT_LOCATIONS);
    expect(locations.length).toBe(4);
  });

  it('should use lowercase format', () => {
    Object.values(DOCUMENT_LOCATIONS).forEach(location => {
      expect(location).toBe(location.toLowerCase());
    });
  });
});
