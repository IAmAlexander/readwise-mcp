/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Result of parameter validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Create a successful validation result
 * @returns ValidationResult with success=true
 */
export function validationSuccess(): ValidationResult {
  return {
    valid: true,
    errors: []
  };
}

/**
 * Create a failed validation result
 * @param errors - Validation errors
 * @returns ValidationResult with success=false and errors
 */
export function validationFailure(errors: ValidationError[]): ValidationResult {
  return {
    valid: false,
    errors
  };
}

/**
 * Create a single validation error for a field
 * @param field - Field name that failed validation
 * @param message - Error message
 * @returns ValidationResult with success=false and single error
 */
export function validationError(field: string, message: string): ValidationResult {
  return validationFailure([{ field, message }]);
}

/**
 * Validate required fields in parameters
 * @param params - Parameters to validate
 * @param required - Required field name or array of field names
 * @param message - Optional custom error message
 * @returns ValidationResult indicating success or failure
 */
export function validateRequired(
  params: Record<string, any>,
  required: string | string[],
  message?: string
): ValidationResult {
  const requiredFields = Array.isArray(required) ? required : [required];
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    if (params[field] === undefined || params[field] === null || params[field] === '') {
      errors.push({
        field,
        message: message || `${field} is required`
      });
    }
  }

  return errors.length > 0 ? validationFailure(errors) : validationSuccess();
}

/**
 * Validate that a field is a number in range
 * @param params - Parameters to validate
 * @param field - Field name to check
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param message - Optional custom error message
 * @returns ValidationResult indicating success or failure
 */
export function validateNumberRange(
  params: Record<string, any>,
  field: string,
  min?: number,
  max?: number,
  message?: string
): ValidationResult {
  // Skip validation if field is not present
  if (params[field] === undefined || params[field] === null) {
    return validationSuccess();
  }
  
  const value = Number(params[field]);
  
  if (isNaN(value)) {
    return validationError(field, message || `${field} must be a number`);
  }
  
  if (min !== undefined && value < min) {
    return validationError(field, message || `${field} must be at least ${min}`);
  }
  
  if (max !== undefined && value > max) {
    return validationError(field, message || `${field} must be at most ${max}`);
  }
  
  return validationSuccess();
}

/**
 * Validate that a field is one of a set of allowed values
 * @param params - Parameters to validate
 * @param field - Field name to check
 * @param allowedValues - Array of allowed values
 * @param message - Optional custom error message
 * @returns ValidationResult indicating success or failure
 */
export function validateAllowedValues<T>(
  params: Record<string, any>,
  field: string,
  allowedValues: T[],
  message?: string
): ValidationResult {
  // Skip validation if field is not present
  if (params[field] === undefined || params[field] === null) {
    return validationSuccess();
  }
  
  if (!allowedValues.includes(params[field] as T)) {
    return validationError(
      field,
      message || `${field} must be one of: ${allowedValues.join(', ')}`
    );
  }
  
  return validationSuccess();
}

/**
 * Validate that a field is an array
 * @param params - Parameters to validate
 * @param field - Field name to check
 * @param message - Optional custom error message
 * @returns ValidationResult indicating success or failure
 */
export function validateArray(value: any, field: string): ValidationResult {
  if (!Array.isArray(value)) {
    return validationError(field, `${field} must be an array`);
  }
  return validationSuccess();
}

/**
 * Validate that a field is a string
 * @param value - Value to validate
 * @param field - Field name to check
 * @returns ValidationResult indicating success or failure
 */
export function validateString(value: any, field: string): ValidationResult {
  if (typeof value !== 'string') {
    return validationError(field, `${field} must be a string`);
  }
  return validationSuccess();
}

/**
 * Validate that a field is a number
 * @param value - Value to validate
 * @param field - Field name to check
 * @returns ValidationResult indicating success or failure
 */
export function validateNumber(value: any, field: string): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return validationError(field, `${field} must be a number`);
  }
  return validationSuccess();
}

/**
 * Validate that a field is a boolean
 * @param value - Value to validate
 * @param field - Field name to check
 * @returns ValidationResult indicating success or failure
 */
export function validateBoolean(value: any, field: string): ValidationResult {
  if (typeof value !== 'boolean') {
    return validationError(field, `${field} must be a boolean`);
  }
  return validationSuccess();
}

/**
 * Validate that a field is an object
 * @param value - Value to validate
 * @param field - Field name to check
 * @returns ValidationResult indicating success or failure
 */
export function validateObject(value: any, field: string): ValidationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return validationError(field, `${field} must be an object`);
  }
  return validationSuccess();
}

/**
 * Combine multiple validation results
 * @param results - Array of validation results
 * @returns Combined validation result
 */
export function combineValidationResults(results: ValidationResult[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  for (const result of results) {
    if (!result.valid && result.errors) {
      errors.push(...result.errors);
    }
  }
  
  return errors.length > 0 ? validationFailure(errors) : validationSuccess();
} 