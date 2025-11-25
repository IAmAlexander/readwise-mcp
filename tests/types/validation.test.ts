import {
  ValidationError,
  ValidationResult,
  validationSuccess,
  validationFailure,
  validationError,
  validateRequired,
  validateNumberRange,
  validateAllowedValues,
  validateArray,
  validateString,
  validateNumber,
  validateBoolean,
  validateObject,
  combineValidationResults
} from '../../src/types/validation.js';

describe('Validation Utilities', () => {
  describe('validationSuccess', () => {
    it('should return a successful validation result', () => {
      const result = validationSuccess();

      expect(result.valid).toBe(true);
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validationFailure', () => {
    it('should return a failed validation result with errors', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Email is invalid' }
      ];

      const result = validationFailure(errors);

      expect(result.valid).toBe(false);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(errors);
    });

    it('should handle empty errors array', () => {
      const result = validationFailure([]);

      expect(result.valid).toBe(false);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validationError', () => {
    it('should create a validation result with a single error', () => {
      const result = validationError('password', 'Password is too short');

      expect(result.valid).toBe(false);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'password',
        message: 'Password is too short'
      });
    });
  });

  describe('validateRequired', () => {
    it('should pass when required field is present', () => {
      const result = validateRequired({ name: 'John' }, 'name');

      expect(result.valid).toBe(true);
    });

    it('should fail when required field is missing', () => {
      const result = validateRequired({}, 'name');

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].message).toBe('name is required');
    });

    it('should fail when required field is null', () => {
      const result = validateRequired({ name: null }, 'name');

      expect(result.valid).toBe(false);
    });

    it('should fail when required field is empty string', () => {
      const result = validateRequired({ name: '' }, 'name');

      expect(result.valid).toBe(false);
    });

    it('should validate multiple required fields', () => {
      const result = validateRequired(
        { name: 'John' },
        ['name', 'email', 'age']
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map(e => e.field)).toContain('email');
      expect(result.errors.map(e => e.field)).toContain('age');
    });

    it('should pass when all multiple required fields are present', () => {
      const result = validateRequired(
        { name: 'John', email: 'john@example.com', age: 30 },
        ['name', 'email', 'age']
      );

      expect(result.valid).toBe(true);
    });

    it('should use custom error message when provided', () => {
      const result = validateRequired({}, 'apiKey', 'API key must be provided');

      expect(result.errors[0].message).toBe('API key must be provided');
    });
  });

  describe('validateNumberRange', () => {
    it('should pass when number is within range', () => {
      const result = validateNumberRange({ page: 5 }, 'page', 1, 100);

      expect(result.valid).toBe(true);
    });

    it('should pass when number equals minimum', () => {
      const result = validateNumberRange({ page: 1 }, 'page', 1, 100);

      expect(result.valid).toBe(true);
    });

    it('should pass when number equals maximum', () => {
      const result = validateNumberRange({ page: 100 }, 'page', 1, 100);

      expect(result.valid).toBe(true);
    });

    it('should fail when number is below minimum', () => {
      const result = validateNumberRange({ page: 0 }, 'page', 1, 100);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('page must be at least 1');
    });

    it('should fail when number is above maximum', () => {
      const result = validateNumberRange({ page: 101 }, 'page', 1, 100);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('page must be at most 100');
    });

    it('should fail when value is not a number', () => {
      const result = validateNumberRange({ page: 'abc' }, 'page', 1, 100);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('page must be a number');
    });

    it('should skip validation when field is not present', () => {
      const result = validateNumberRange({}, 'page', 1, 100);

      expect(result.valid).toBe(true);
    });

    it('should validate with only minimum constraint', () => {
      const result = validateNumberRange({ count: 5 }, 'count', 1);

      expect(result.valid).toBe(true);
    });

    it('should validate with only maximum constraint', () => {
      const result = validateNumberRange({ count: 5 }, 'count', undefined, 10);

      expect(result.valid).toBe(true);
    });

    it('should use custom error message', () => {
      const result = validateNumberRange(
        { page: -1 },
        'page',
        1,
        100,
        'Page number must be positive'
      );

      expect(result.errors[0].message).toBe('Page number must be positive');
    });
  });

  describe('validateAllowedValues', () => {
    it('should pass when value is in allowed list', () => {
      const result = validateAllowedValues(
        { status: 'active' },
        'status',
        ['active', 'inactive', 'pending']
      );

      expect(result.valid).toBe(true);
    });

    it('should fail when value is not in allowed list', () => {
      const result = validateAllowedValues(
        { status: 'unknown' },
        'status',
        ['active', 'inactive', 'pending']
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe(
        'status must be one of: active, inactive, pending'
      );
    });

    it('should skip validation when field is not present', () => {
      const result = validateAllowedValues({}, 'status', ['active', 'inactive']);

      expect(result.valid).toBe(true);
    });

    it('should work with numeric values', () => {
      const result = validateAllowedValues({ priority: 2 }, 'priority', [1, 2, 3]);

      expect(result.valid).toBe(true);
    });

    it('should use custom error message', () => {
      const result = validateAllowedValues(
        { format: 'xml' },
        'format',
        ['json', 'csv'],
        'Only JSON and CSV formats are supported'
      );

      expect(result.errors[0].message).toBe('Only JSON and CSV formats are supported');
    });
  });

  describe('validateArray', () => {
    it('should pass when value is an array', () => {
      const result = validateArray({ tags: ['a', 'b'] }, 'tags');

      expect(result.valid).toBe(true);
    });

    it('should pass with empty array', () => {
      const result = validateArray({ tags: [] }, 'tags');

      expect(result.valid).toBe(true);
    });

    it('should fail when value is not an array', () => {
      const result = validateArray({ tags: 'not-array' }, 'tags');

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('tags must be an array');
    });

    it('should fail when value is an object', () => {
      const result = validateArray({ tags: {} }, 'tags');

      expect(result.valid).toBe(false);
    });

    it('should use custom error message', () => {
      const result = validateArray(
        { items: 'string' },
        'items',
        'Items should be provided as a list'
      );

      expect(result.errors[0].message).toBe('Items should be provided as a list');
    });
  });

  describe('validateString', () => {
    it('should pass when value is a string', () => {
      const result = validateString({ name: 'John' }, 'name');

      expect(result.valid).toBe(true);
    });

    it('should pass with empty string', () => {
      const result = validateString({ name: '' }, 'name');

      expect(result.valid).toBe(true);
    });

    it('should fail when value is not a string', () => {
      const result = validateString({ name: 123 }, 'name');

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('name must be a string');
    });

    it('should fail when value is null', () => {
      const result = validateString({ name: null }, 'name');

      expect(result.valid).toBe(false);
    });

    it('should use custom error message', () => {
      const result = validateString(
        { title: 42 },
        'title',
        'Title must be text'
      );

      expect(result.errors[0].message).toBe('Title must be text');
    });
  });

  describe('validateNumber', () => {
    it('should pass when value is a number', () => {
      const result = validateNumber({ count: 42 }, 'count');

      expect(result.valid).toBe(true);
    });

    it('should pass with zero', () => {
      const result = validateNumber({ count: 0 }, 'count');

      expect(result.valid).toBe(true);
    });

    it('should pass with negative numbers', () => {
      const result = validateNumber({ offset: -5 }, 'offset');

      expect(result.valid).toBe(true);
    });

    it('should pass with decimals', () => {
      const result = validateNumber({ rate: 3.14 }, 'rate');

      expect(result.valid).toBe(true);
    });

    it('should fail when value is not a number', () => {
      const result = validateNumber({ count: 'five' }, 'count');

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('count must be a number');
    });

    it('should fail when value is NaN', () => {
      const result = validateNumber({ count: NaN }, 'count');

      expect(result.valid).toBe(false);
    });

    it('should use custom error message', () => {
      const result = validateNumber(
        { quantity: 'abc' },
        'quantity',
        'Quantity should be numeric'
      );

      expect(result.errors[0].message).toBe('Quantity should be numeric');
    });
  });

  describe('validateBoolean', () => {
    it('should pass when value is true', () => {
      const result = validateBoolean({ active: true }, 'active');

      expect(result.valid).toBe(true);
    });

    it('should pass when value is false', () => {
      const result = validateBoolean({ active: false }, 'active');

      expect(result.valid).toBe(true);
    });

    it('should fail when value is not a boolean', () => {
      const result = validateBoolean({ active: 'yes' }, 'active');

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('active must be a boolean');
    });

    it('should fail when value is 1 or 0', () => {
      const result = validateBoolean({ active: 1 }, 'active');

      expect(result.valid).toBe(false);
    });

    it('should use custom error message', () => {
      const result = validateBoolean(
        { enabled: 'true' },
        'enabled',
        'Enabled must be true or false'
      );

      expect(result.errors[0].message).toBe('Enabled must be true or false');
    });
  });

  describe('validateObject', () => {
    it('should pass when value is an object', () => {
      const result = validateObject({ config: { key: 'value' } }, 'config');

      expect(result.valid).toBe(true);
    });

    it('should pass with empty object', () => {
      const result = validateObject({ config: {} }, 'config');

      expect(result.valid).toBe(true);
    });

    it('should fail when value is an array', () => {
      const result = validateObject({ config: [] }, 'config');

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('config must be an object');
    });

    it('should fail when value is null', () => {
      const result = validateObject({ config: null }, 'config');

      expect(result.valid).toBe(false);
    });

    it('should fail when value is a string', () => {
      const result = validateObject({ config: 'string' }, 'config');

      expect(result.valid).toBe(false);
    });

    it('should use custom error message', () => {
      const result = validateObject(
        { options: 'not-object' },
        'options',
        'Options must be a key-value configuration'
      );

      expect(result.errors[0].message).toBe('Options must be a key-value configuration');
    });
  });

  describe('combineValidationResults', () => {
    it('should return success when all results are valid', () => {
      const results = [
        validationSuccess(),
        validationSuccess(),
        validationSuccess()
      ];

      const combined = combineValidationResults(results);

      expect(combined.valid).toBe(true);
      expect(combined.errors).toEqual([]);
    });

    it('should combine errors from multiple failed results', () => {
      const results = [
        validationError('name', 'Name is required'),
        validationSuccess(),
        validationError('email', 'Email is invalid')
      ];

      const combined = combineValidationResults(results);

      expect(combined.valid).toBe(false);
      expect(combined.errors).toHaveLength(2);
      expect(combined.errors.map(e => e.field)).toContain('name');
      expect(combined.errors.map(e => e.field)).toContain('email');
    });

    it('should handle empty results array', () => {
      const combined = combineValidationResults([]);

      expect(combined.valid).toBe(true);
      expect(combined.errors).toEqual([]);
    });

    it('should combine multiple errors from single result', () => {
      const results = [
        validationFailure([
          { field: 'password', message: 'Too short' },
          { field: 'password', message: 'Needs uppercase' }
        ])
      ];

      const combined = combineValidationResults(results);

      expect(combined.errors).toHaveLength(2);
    });
  });
});
