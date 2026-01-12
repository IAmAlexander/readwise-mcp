import { Buffer } from 'node:buffer';
import { MCPResponse, MCPContentItem } from '../mcp/types.js';

/**
 * Convert any value to an MCPResponse.
 * - null/undefined returns empty content array
 * - Pre-built MCPResponse objects are returned as-is
 * - All other values are converted to MCPContentItem(s)
 */
export function toMCPResponse<T>(result: T): MCPResponse {
  // null/undefined returns empty content (not JSON "null")
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
 * Convert a value to an array of MCPContentItems.
 * - Pre-built MCPContentItem arrays are preserved as-is
 * - All other values are wrapped in a single content item
 */
function toContentItems<T>(value: T): MCPContentItem[] {
  // Preserve already-built content items (e.g., multi-part image/resource responses)
  if (Array.isArray(value) && value.every(isContentItem)) {
    return value;
  }

  // Otherwise serialize the entire value as a single item for consistent behavior
  return [toContentItem(value)];
}

/**
 * Convert a single value to an MCPContentItem.
 * - null/undefined → empty string (not JSON "null")
 * - strings → returned raw (not JSON-quoted)
 * - numbers/booleans → String() conversion
 * - Buffer/Uint8Array → base64-encoded resource
 * - objects/arrays → JSON.stringify with pretty printing
 * - other types → type indicator string
 */
function toContentItem<T>(value: T): MCPContentItem {
  // null/undefined returns empty text, not JSON "null"
  if (value === null || value === undefined) {
    return {
      type: 'text',
      text: ''
    };
  }

  // Strings are returned raw, not JSON-quoted
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
      // Uint8Array.toString() ignores encoding arg, so convert to Buffer first
      const buf = Buffer.isBuffer(value) ? value : Buffer.from(value);
      return {
        type: 'resource',
        resource: {
          uri: '',
          blob: buf.toString('base64'),
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