import { MCPResponse, MCPContentItem } from '../mcp/types.js';

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
 * Always returns a single content item with JSON-stringified result for consistency
 */
function toContentItems<T>(value: T): MCPContentItem[] {
  // Always serialize the entire value as a single JSON string
  // This ensures consistent behavior for arrays, objects, and primitives
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

  // Handle objects and arrays - both have typeof === 'object'
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

    // Convert object or array to JSON string
    // Use try-catch to handle circular references or other serialization issues
    try {
      const serialized = JSON.stringify(value, null, 2);
      // JSON.stringify returns undefined for certain values, ensure we always have a string
      return {
        type: 'text',
        text: serialized ?? '[Unserializable object]'
      };
    } catch (error) {
      // Fallback for objects that can't be stringified (circular refs, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unable to serialize object';
      return {
        type: 'text',
        text: `[Serialization Error: ${errorMessage}]`
      };
    }
  }

  // Handle symbols, bigint, functions, etc.
  // JSON.stringify returns undefined for symbols and functions, throws for bigint
  try {
    const serialized = JSON.stringify(value);
    // Ensure we always return a string - JSON.stringify returns undefined for symbols/functions
    return {
      type: 'text',
      text: serialized ?? `[${typeof value}]`
    };
  } catch {
    // BigInt and other non-serializable types end up here
    return {
      type: 'text',
      text: `[${typeof value}]`
    };
  }
} 