/**
 * Export Utilities
 * ================
 * Functions for exporting data to CSV and other formats.
 * 
 * Usage:
 *   import { exportToCSV } from '$lib/utils/exportUtils';
 *   
 *   exportToCSV(data, 'people-report', [
 *     { key: 'first_name', label: 'First Name' },
 *     { key: 'email', label: 'Email' }
 *   ]);
 */

/**
 * Escapes a value for CSV (handles commas, quotes, newlines)
 * @param {any} value - Value to escape
 * @returns {string} Escaped string
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';

    const str = String(value);

    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/**
 * Converts data array to CSV string
 * @param {Array<Object>} data - Array of objects to convert
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @returns {string} CSV string
 */
export function dataToCSV(data, columns) {
    if (!data || data.length === 0) {
        return columns.map(c => escapeCSV(c.label)).join(',') + '\n';
    }

    // Header row
    const header = columns.map(c => escapeCSV(c.label)).join(',');

    // Data rows
    const rows = data.map(row => {
        return columns.map(col => {
            let value = row[col.key];

            // Apply formatter if provided
            if (col.format && typeof col.format === 'function') {
                value = col.format(value, row);
            }

            return escapeCSV(value);
        }).join(',');
    });

    return [header, ...rows].join('\n');
}

/**
 * Downloads data as a CSV file
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Filename (without extension)
 * @param {Array<{key: string, label: string, format?: function}>} columns - Column definitions
 */
export function exportToCSV(data, filename, columns) {
    const csv = dataToCSV(data, columns);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
}

/**
 * Formats a date for export
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateForExport(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Formats a boolean for export
 * @param {boolean} value - Boolean value
 * @param {string} [trueLabel='Yes'] - Label for true
 * @param {string} [falseLabel='No'] - Label for false
 * @returns {string} Formatted string
 */
export function formatBooleanForExport(value, trueLabel = 'Yes', falseLabel = 'No') {
    return value ? trueLabel : falseLabel;
}

/**
 * Pre-built column definitions for each module
 */
export const exportColumns = {
    people: [
        { key: 'first_name', label: 'First Name' },
        { key: 'last_name', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'member_status', label: 'Status' },
        { key: 'membership_date', label: 'Membership Date', format: formatDateForExport }
    ],

    evangelismContacts: [
        { key: 'first_name', label: 'First Name' },
        { key: 'last_name', label: 'Last Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'contact_date', label: 'Contact Date', format: formatDateForExport },
        { key: 'response', label: 'Response' },
        { key: 'converted', label: 'Converted', format: formatBooleanForExport },
        { key: 'conversion_date', label: 'Conversion Date', format: formatDateForExport }
    ],

    services: [
        { key: 'service_date', label: 'Date', format: formatDateForExport },
        { key: 'service_type', label: 'Type' },
        { key: 'sermon_topic', label: 'Topic' },
        { key: 'sermon_speaker', label: 'Speaker' },
        { key: 'total_attendance', label: 'Total Attendance' },
        { key: 'guests_count', label: 'Guests' },
        { key: 'salvation_decisions', label: 'Salvation Decisions' }
    ],

    meetings: [
        { key: 'meeting_date', label: 'Date', format: formatDateForExport },
        { key: 'meeting_type', label: 'Type' },
        { key: 'location', label: 'Location' },
        { key: 'duration_minutes', label: 'Duration (min)' },
        { key: 'attendance_count', label: 'Attendance' },
        { key: 'leaders_count', label: 'Leaders' }
    ],

    visitations: [
        { key: 'visit_date', label: 'Date', format: formatDateForExport },
        { key: 'person_visited_name', label: 'Person Visited' },
        { key: 'visited_by_name', label: 'Visitor' },
        { key: 'outcome', label: 'Outcome' },
        { key: 'follow_up_required', label: 'Follow-up Required', format: formatBooleanForExport },
        { key: 'follow_up_date', label: 'Follow-up Date', format: formatDateForExport },
        { key: 'notes', label: 'Notes' }
    ]
};
