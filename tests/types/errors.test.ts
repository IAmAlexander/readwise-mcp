import {
  ReadwiseMCPException,
  ValidationException,
  APIException,
  TransportException,
  isValidationException,
  isAPIException,
  isTransportException,
  isReadwiseMCPException
} from '../../src/types/errors.js';

describe('ReadwiseMCPException', () => {
  it('should create an exception with the correct message', () => {
    const error = new ReadwiseMCPException('Test error message');

    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('ReadwiseMCPException');
  });

  it('should be an instance of Error', () => {
    const error = new ReadwiseMCPException('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReadwiseMCPException);
  });

  it('should have a stack trace', () => {
    const error = new ReadwiseMCPException('Test error');

    expect(error.stack).toBeDefined();
  });
});

describe('ValidationException', () => {
  it('should create an exception with validation details', () => {
    const details = [
      { field: 'name', message: 'Name is required' },
      { field: 'email', message: 'Email is invalid' }
    ];

    const error = new ValidationException(details);

    expect(error.name).toBe('ValidationException');
    expect(error.type).toBe('validation');
    expect(error.details).toEqual(details);
    expect(error.message).toBe('name: Name is required, email: Email is invalid');
  });

  it('should handle single field validation error', () => {
    const details = [{ field: 'password', message: 'Password too short' }];

    const error = new ValidationException(details);

    expect(error.message).toBe('password: Password too short');
    expect(error.details).toHaveLength(1);
  });

  it('should be an instance of ReadwiseMCPException', () => {
    const error = new ValidationException([{ field: 'test', message: 'test' }]);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReadwiseMCPException);
    expect(error).toBeInstanceOf(ValidationException);
  });

  describe('forField', () => {
    it('should create a validation exception for a single field', () => {
      const error = ValidationException.forField('username', 'Username is taken');

      expect(error.details).toHaveLength(1);
      expect(error.details[0]).toEqual({
        field: 'username',
        message: 'Username is taken'
      });
      expect(error.message).toBe('username: Username is taken');
    });
  });
});

describe('APIException', () => {
  it('should create an exception with status and code', () => {
    const error = new APIException(400, 'bad_request', 'Invalid parameters');

    expect(error.name).toBe('APIException');
    expect(error.type).toBe('api');
    expect(error.status).toBe(400);
    expect(error.code).toBe('bad_request');
    expect(error.message).toBe('Invalid parameters');
  });

  it('should be an instance of ReadwiseMCPException', () => {
    const error = new APIException(500, 'server_error', 'Internal error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReadwiseMCPException);
    expect(error).toBeInstanceOf(APIException);
  });

  describe('isRateLimited', () => {
    it('should return true for 429 status', () => {
      const error = new APIException(429, 'too_many_requests', 'Rate limited');

      expect(error.isRateLimited()).toBe(true);
    });

    it('should return true for rate_limit_exceeded code', () => {
      const error = new APIException(400, 'rate_limit_exceeded', 'Too many requests');

      expect(error.isRateLimited()).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new APIException(500, 'server_error', 'Internal error');

      expect(error.isRateLimited()).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('should return true for 401 status', () => {
      const error = new APIException(401, 'unauthorized', 'Invalid token');

      expect(error.isAuthError()).toBe(true);
    });

    it('should return true for 403 status', () => {
      const error = new APIException(403, 'forbidden', 'Access denied');

      expect(error.isAuthError()).toBe(true);
    });

    it('should return false for other status codes', () => {
      const error = new APIException(404, 'not_found', 'Resource not found');

      expect(error.isAuthError()).toBe(false);
    });
  });
});

describe('TransportException', () => {
  it('should create an exception with code', () => {
    const error = new TransportException('network_error', 'Connection failed');

    expect(error.name).toBe('TransportException');
    expect(error.type).toBe('transport');
    expect(error.code).toBe('network_error');
    expect(error.message).toBe('Connection failed');
  });

  it('should be an instance of ReadwiseMCPException', () => {
    const error = new TransportException('timeout', 'Request timed out');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ReadwiseMCPException);
    expect(error).toBeInstanceOf(TransportException);
  });
});

describe('Type Guards', () => {
  describe('isValidationException', () => {
    it('should return true for ValidationException instances', () => {
      const error = new ValidationException([{ field: 'test', message: 'test' }]);

      expect(isValidationException(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      const apiError = new APIException(400, 'bad_request', 'Error');
      const transportError = new TransportException('error', 'Error');
      const genericError = new Error('Generic');

      expect(isValidationException(apiError)).toBe(false);
      expect(isValidationException(transportError)).toBe(false);
      expect(isValidationException(genericError)).toBe(false);
      expect(isValidationException(null)).toBe(false);
      expect(isValidationException(undefined)).toBe(false);
      expect(isValidationException('string')).toBe(false);
    });
  });

  describe('isAPIException', () => {
    it('should return true for APIException instances', () => {
      const error = new APIException(400, 'bad_request', 'Error');

      expect(isAPIException(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      const validationError = new ValidationException([{ field: 'test', message: 'test' }]);
      const transportError = new TransportException('error', 'Error');
      const genericError = new Error('Generic');

      expect(isAPIException(validationError)).toBe(false);
      expect(isAPIException(transportError)).toBe(false);
      expect(isAPIException(genericError)).toBe(false);
      expect(isAPIException(null)).toBe(false);
      expect(isAPIException(undefined)).toBe(false);
    });
  });

  describe('isTransportException', () => {
    it('should return true for TransportException instances', () => {
      const error = new TransportException('error', 'Error');

      expect(isTransportException(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      const validationError = new ValidationException([{ field: 'test', message: 'test' }]);
      const apiError = new APIException(400, 'bad_request', 'Error');
      const genericError = new Error('Generic');

      expect(isTransportException(validationError)).toBe(false);
      expect(isTransportException(apiError)).toBe(false);
      expect(isTransportException(genericError)).toBe(false);
      expect(isTransportException(null)).toBe(false);
      expect(isTransportException(undefined)).toBe(false);
    });
  });

  describe('isReadwiseMCPException', () => {
    it('should return true for all MCP exception types', () => {
      const baseError = new ReadwiseMCPException('Base');
      const validationError = new ValidationException([{ field: 'test', message: 'test' }]);
      const apiError = new APIException(400, 'bad_request', 'Error');
      const transportError = new TransportException('error', 'Error');

      expect(isReadwiseMCPException(baseError)).toBe(true);
      expect(isReadwiseMCPException(validationError)).toBe(true);
      expect(isReadwiseMCPException(apiError)).toBe(true);
      expect(isReadwiseMCPException(transportError)).toBe(true);
    });

    it('should return false for non-MCP exceptions', () => {
      const genericError = new Error('Generic');
      const typeError = new TypeError('Type error');

      expect(isReadwiseMCPException(genericError)).toBe(false);
      expect(isReadwiseMCPException(typeError)).toBe(false);
      expect(isReadwiseMCPException(null)).toBe(false);
      expect(isReadwiseMCPException(undefined)).toBe(false);
      expect(isReadwiseMCPException({ type: 'validation' })).toBe(false);
    });
  });
});
