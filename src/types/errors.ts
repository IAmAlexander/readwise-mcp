/**
 * Custom error classes for consistent error handling
 * Note: These are suffixed with 'Exception' to avoid conflicts with the
 * error interfaces in types/index.ts
 */

import type { ValidationError as ValidationErrorType } from './validation.js';

/**
 * Base error class for Readwise MCP errors
 */
export class ReadwiseMCPException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadwiseMCPException';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation exception with field-level details
 */
export class ValidationException extends ReadwiseMCPException {
  public readonly type = 'validation' as const;
  public readonly details: ValidationErrorType[];

  constructor(details: ValidationErrorType[]) {
    const message = details.map(d => `${d.field}: ${d.message}`).join(', ');
    super(message);
    this.name = 'ValidationException';
    this.details = details;
  }

  /**
   * Create a validation exception for a single field
   */
  static forField(field: string, message: string): ValidationException {
    return new ValidationException([{ field, message }]);
  }
}

/**
 * API exception from Readwise
 */
export class APIException extends ReadwiseMCPException {
  public readonly type = 'api' as const;
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'APIException';
    this.status = status;
    this.code = code;
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimited(): boolean {
    return this.status === 429 || this.code === 'rate_limit_exceeded';
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * Transport/network exception
 */
export class TransportException extends ReadwiseMCPException {
  public readonly type = 'transport' as const;
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TransportException';
    this.code = code;
  }
}

/**
 * Type guard to check if an error is a ValidationException class instance
 */
export function isValidationException(error: unknown): error is ValidationException {
  return error instanceof ValidationException;
}

/**
 * Type guard to check if an error is an APIException class instance
 */
export function isAPIException(error: unknown): error is APIException {
  return error instanceof APIException;
}

/**
 * Type guard to check if an error is a TransportException class instance
 */
export function isTransportException(error: unknown): error is TransportException {
  return error instanceof TransportException;
}

/**
 * Type guard to check if an error is any ReadwiseMCPException class instance
 */
export function isReadwiseMCPException(error: unknown): error is ReadwiseMCPException {
  return error instanceof ReadwiseMCPException;
}
