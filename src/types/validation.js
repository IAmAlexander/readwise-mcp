/**
 * Create a successful validation result
 * @returns ValidationResult with success=true
 */
export function validationSuccess() {
    return {
        success: true
    };
}
/**
 * Create a failed validation result
 * @param errors - Validation errors
 * @returns ValidationResult with success=false and errors
 */
export function validationFailure(errors) {
    return {
        success: false,
        errors
    };
}
/**
 * Create a single validation error for a field
 * @param field - Field name that failed validation
 * @param message - Error message
 * @returns ValidationResult with success=false and single error
 */
export function validationError(field, message) {
    return validationFailure([{ field, message }]);
}
/**
 * Validate that a field is present
 * @param params - Parameters to validate
 * @param field - Field name to check
 * @param message - Optional custom error message
 * @returns ValidationResult indicating success or failure
 */
export function validateRequired(params, field, message) {
    if (params[field] === undefined || params[field] === null || params[field] === '') {
        return validationError(field, message || `${field} is required`);
    }
    return validationSuccess();
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
export function validateNumberRange(params, field, min, max, message) {
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
export function validateAllowedValues(params, field, allowedValues, message) {
    // Skip validation if field is not present
    if (params[field] === undefined || params[field] === null) {
        return validationSuccess();
    }
    if (!allowedValues.includes(params[field])) {
        return validationError(field, message || `${field} must be one of: ${allowedValues.join(', ')}`);
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
export function validateArray(params, field, message) {
    // Skip validation if field is not present
    if (params[field] === undefined || params[field] === null) {
        return validationSuccess();
    }
    if (!Array.isArray(params[field])) {
        return validationError(field, message || `${field} must be an array`);
    }
    return validationSuccess();
}
/**
 * Combine multiple validation results
 * @param results - Array of validation results
 * @returns Combined validation result
 */
export function combineValidationResults(results) {
    const errors = [];
    for (const result of results) {
        if (!result.success && result.errors) {
            errors.push(...result.errors);
        }
    }
    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
}
