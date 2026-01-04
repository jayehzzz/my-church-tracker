/**
 * Date utility functions for the Global Filtering System
 * @module dateUtils
 */

/**
 * Month names for display
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

/**
 * Short month names
 */
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Quarter definitions
 */
export const QUARTERS = {
  Q1: { start: 0, end: 2, label: 'Q1 (Jan-Mar)' },
  Q2: { start: 3, end: 5, label: 'Q2 (Apr-Jun)' },
  Q3: { start: 6, end: 8, label: 'Q3 (Jul-Sep)' },
  Q4: { start: 9, end: 11, label: 'Q4 (Oct-Dec)' }
};

/**
 * Format date as ISO string (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} ISO formatted date string
 */
export function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Format date range for display
 * @param {string} startDate - Start date ISO string
 * @param {string} endDate - End date ISO string
 * @returns {string} Formatted date range string
 */
export function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startStr = `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()}`;
  const endStr = `${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;

  return `${startStr} - ${endStr}`;
}

/**
 * Get start and end dates for a year
 * @param {number} year - The year
 * @returns {{ startDate: string, endDate: string }} Date range object
 */
export function getYearRange(year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate)
  };
}

/**
 * Get start and end dates for a month
 * @param {number} year - The year
 * @param {number} month - The month (0-11, January = 0)
 * @returns {{ startDate: string, endDate: string }} Date range object
 */
export function getMonthRange(year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate)
  };
}

/**
 * Get start and end dates for a quarter
 * @param {number} year - The year
 * @param {string} quarter - The quarter ('Q1', 'Q2', 'Q3', or 'Q4')
 * @returns {{ startDate: string, endDate: string }} Date range object
 */
export function getQuarterRange(year, quarter) {
  const quarterDef = QUARTERS[quarter];
  if (!quarterDef) {
    throw new Error(`Invalid quarter: ${quarter}. Must be Q1, Q2, Q3, or Q4.`);
  }

  const startDate = new Date(year, quarterDef.start, 1);
  const endDate = new Date(year, quarterDef.end + 1, 0); // Last day of quarter

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate)
  };
}

/**
 * Generate array of available years (2020 to current year)
 * @returns {number[]} Array of years in descending order
 */
export function getAvailableYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 2020; year--) {
    years.push(year);
  }
  return years;
}

/**
 * Get array of month names
 * @returns {string[]} Array of full month names
 */
export function getMonthNames() {
  return [...MONTH_NAMES];
}

/**
 * Get current quarter
 * @returns {string} Current quarter ('Q1', 'Q2', 'Q3', or 'Q4')
 */
export function getCurrentQuarter() {
  const month = new Date().getMonth();
  return `Q${Math.floor(month / 3) + 1}`;
}

/**
 * Check if a date falls within a range
 * @param {string|Date} date - Date to check
 * @param {string} startDate - Start date ISO string
 * @param {string} endDate - End date ISO string
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(date, startDate, endDate) {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return d >= start && d <= end;
}

/**
 * Calculate date range based on filter state
 * @param {Object} filter - Current filter state
 * @param {string} filter.type - Filter type
 * @param {number|null} filter.year - Selected year
 * @param {number|null} filter.month - Selected month (0-11)
 * @param {string|null} filter.quarter - Selected quarter
 * @param {string|null} filter.customStart - Custom start date
 * @param {string|null} filter.customEnd - Custom end date
 * @returns {{ startDate: string, endDate: string, label: string }} Computed date range with label
 */
export function getDateRange(filter) {
  const today = new Date();
  let startDate, endDate, label;

  switch (filter.type) {
    case 'thisYear': {
      const year = today.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      label = `This Year (${year})`;
      break;
    }

    case 'thisMonth': {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      label = `This Month (${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()})`;
      break;
    }

    case 'last30Days': {
      endDate = new Date(today);
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      label = 'Last 30 Days';
      break;
    }

    case 'thisQuarter': {
      const quarterIndex = Math.floor(today.getMonth() / 3);
      const quarterKey = `Q${quarterIndex + 1}`;
      const quarter = QUARTERS[quarterKey];
      startDate = new Date(today.getFullYear(), quarter.start, 1);
      endDate = new Date(today.getFullYear(), quarter.end + 1, 0);
      label = `This Quarter (${quarterKey} ${today.getFullYear()})`;
      break;
    }

    case 'specificYear': {
      startDate = new Date(filter.year, 0, 1);
      endDate = new Date(filter.year, 11, 31);
      label = `Year ${filter.year}`;
      break;
    }

    case 'specificMonth': {
      startDate = new Date(filter.year, filter.month, 1);
      endDate = new Date(filter.year, filter.month + 1, 0);
      label = `${MONTH_NAMES[filter.month]} ${filter.year}`;
      break;
    }

    case 'specificQuarter': {
      const quarter = QUARTERS[filter.quarter];
      startDate = new Date(filter.year, quarter.start, 1);
      endDate = new Date(filter.year, quarter.end + 1, 0);
      label = `${filter.quarter} ${filter.year}`;
      break;
    }

    case 'customRange': {
      startDate = new Date(filter.customStart);
      endDate = new Date(filter.customEnd);
      label = formatDateRange(filter.customStart, filter.customEnd);
      break;
    }

    case 'lastMonth': {
      // First day of previous month
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      // Last day of previous month
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      label = `Last Month (${MONTH_NAMES[startDate.getMonth()]} ${startDate.getFullYear()})`;
      break;
    }

    case 'last3Months': {
      endDate = new Date(today);
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 90);
      label = 'Last 3 Months';
      break;
    }

    case 'last6Months': {
      endDate = new Date(today);
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 180);
      label = 'Last 6 Months';
      break;
    }

    case 'last12Months': {
      endDate = new Date(today);
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 365);
      label = 'Last 12 Months';
      break;
    }

    default: {
      // Fallback to this year
      const year = today.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      label = `This Year (${year})`;
    }
  }

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate),
    label
  };
}