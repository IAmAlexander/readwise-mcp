import { MCPResponse, MCPContentItem } from '../mcp/types';

/**
 * Convert any value to an MCPResponse
 */
export function toMCPResponse<T>(result: T): MCPResponse {
  if (result === null || result === undefined) {
    return {
      content: [],
      isError: false
    };
  }

  // If already an MCPResponse, return as is
  if (isMCPResponse(result)) {
    return result;
  }

  // Convert to content items
  const content = toContentItems(result);

  return {
    content,
    isError: false
  };
}

/**
 * Check if a value is an MCPResponse
 */
function isMCPResponse(value: any): value is MCPResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray(value.content) &&
    value.content.every(isContentItem)
  );
}

/**
 * Check if a value is an MCPContentItem
 */
function isContentItem(value: any): value is MCPContentItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.type === 'string' &&
    ['text', 'image', 'resource'].includes(value.type)
  );
}

/**
 * Convert a value to an array of MCPContentItems
 */
function toContentItems<T>(value: T): MCPContentItem[] {
  if (Array.isArray(value)) {
    return value.map(item => toContentItem(item));
  }
  return [toContentItem(value)];
}

/**
 * Convert a single value to an MCPContentItem
 */
function toContentItem<T>(value: T): MCPContentItem {
  if (value === null || value === undefined) {
    return {
      type: 'text',
      text: ''
    };
  }

  if (typeof value === 'string') {
    return {
      type: 'text',
      text: value
    };
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return {
      type: 'text',
      text: String(value)
    };
  }

  if (typeof value === 'object') {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      return {
        type: 'resource',
        resource: {
          uri: '',
          blob: value.toString('base64'),
          mimeType: 'application/octet-stream'
        }
      };
    }

    // Convert object to JSON string
    return {
      type: 'text',
      text: JSON.stringify(value, null, 2)
    };
  }

  return {
    type: 'text',
    text: String(value)
  };
} 