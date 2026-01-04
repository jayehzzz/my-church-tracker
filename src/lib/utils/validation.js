/**
 * Validation Utility
 * ==================
 * Centralized form validation functions for the Church Tracker application.
 * 
 * Usage:
 *   import { validateRequired, validateEmail, createValidator } from '$lib/utils/validation';
 *   
 *   // Simple validation
 *   const emailError = validateEmail(email);
 *   
 *   // Form validation
 *   const validator = createValidator({
 *     email: [validateRequired, validateEmail],
 *     name: [validateRequired]
 *   });
 *   const errors = validator({ email: 'test', name: '' });
 */

/**
 * Validates that a value is not empty
 * @param {any} value - The value to check
 * @param {string} [fieldName='This field'] - Optional field name for error message
 * @returns {string|null} Error message or null if valid
 */
export function validateRequired(value, fieldName = 'This field') {
    if (value === null || value === undefined || value === '') {
        return `${fieldName} is required`;
    }
    if (typeof value === 'string' && value.trim() === '') {
        return `${fieldName} is required`;
    }
    return null;
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email) {
    if (!email) return null; // Let validateRequired handle empty values

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Please enter a valid email address';
    }
    return null;
}

/**
 * Validates phone number format (flexible - accepts various formats)
 * @param {string} phone - Phone number to validate
 * @returns {string|null} Error message or null if valid
 */
export function validatePhone(phone) {
    if (!phone) return null; // Let validateRequired handle empty values

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');

    // Accept 10-15 digits (international numbers)
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return 'Please enter a valid phone number (10-15 digits)';
    }
    return null;
}

/**
 * Validates a date value
 * @param {string|Date} date - Date to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateDate(date) {
    if (!date) return null; // Let validateRequired handle empty values

    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
        return 'Please enter a valid date';
    }
    return null;
}

/**
 * Validates that end date is not before start date
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string|null} Error message or null if valid
 */
export function validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Invalid date range';
    }

    if (end < start) {
        return 'End date cannot be before start date';
    }
    return null;
}

/**
 * Validates minimum length
 * @param {number} min - Minimum length
 * @returns {function} Validator function
 */
export function validateMinLength(min) {
    return (value) => {
        if (!value) return null;
        if (typeof value === 'string' && value.length < min) {
            return `Must be at least ${min} characters`;
        }
        return null;
    };
}

/**
 * Validates maximum length
 * @param {number} max - Maximum length
 * @returns {function} Validator function
 */
export function validateMaxLength(max) {
    return (value) => {
        if (!value) return null;
        if (typeof value === 'string' && value.length > max) {
            return `Must be no more than ${max} characters`;
        }
        return null;
    };
}

/**
 * Creates a form validator from a rules object
 * @param {Object} rules - Object mapping field names to arrays of validator functions
 * @returns {function} Function that takes form data and returns errors object
 * 
 * @example
 * const validate = createValidator({
 *   first_name: [(v) => validateRequired(v, 'First name')],
 *   email: [validateEmail],
 *   phone: [validatePhone]
 * });
 * 
 * const errors = validate({ first_name: '', email: 'invalid', phone: '123' });
 * // { first_name: 'First name is required', email: 'Please enter a valid email...', phone: 'Please enter...' }
 */
export function createValidator(rules) {
    return (formData) => {
        const errors = {};

        for (const [field, validators] of Object.entries(rules)) {
            const value = formData[field];

            for (const validator of validators) {
                const error = validator(value);
                if (error) {
                    errors[field] = error;
                    break; // Stop at first error for this field
                }
            }
        }

        return errors;
    };
}

/**
 * Checks if an errors object has any errors
 * @param {Object} errors - Errors object from createValidator
 * @returns {boolean} True if there are errors
 */
export function hasErrors(errors) {
    return Object.keys(errors).length > 0;
}

/**
 * Pre-built validators for common form patterns
 */
export const validators = {
    // Person form validation rules
    person: {
        first_name: [(v) => validateRequired(v, 'First name')],
        last_name: [(v) => validateRequired(v, 'Last name')],
        email: [validateEmail],
        phone: [validatePhone]
    },

    // Evangelism contact validation rules
    evangelismContact: {
        first_name: [(v) => validateRequired(v, 'First name')],
        contact_date: [(v) => validateRequired(v, 'Contact date'), validateDate],
        email: [validateEmail],
        phone: [validatePhone]
    },

    // Service validation rules
    service: {
        service_date: [(v) => validateRequired(v, 'Service date'), validateDate],
        service_type: [(v) => validateRequired(v, 'Service type')]
    },

    // Meeting validation rules
    meeting: {
        meeting_date: [(v) => validateRequired(v, 'Meeting date'), validateDate],
        meeting_type: [(v) => validateRequired(v, 'Meeting type')]
    },

    // Visitation validation rules
    visitation: {
        visit_date: [(v) => validateRequired(v, 'Visit date'), validateDate],
        person_visited_name: [(v) => validateRequired(v, 'Person visited')]
    }
};
