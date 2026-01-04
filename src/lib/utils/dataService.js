/**
 * Data Service for the Church Dashboard
 * Provides mock data and filtering functions for dashboard components
 * @module dataService
 */

import { isDateInRange } from './dateUtils';

// ============================================================================
// MOCK DATA ARRAYS
// ============================================================================

/**
 * Generate dates spanning the last 2 years for realistic mock data
 */
const today = new Date();
const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());

/**
 * Helper function to generate a date string in ISO format
 * @param {number} daysAgo - Number of days ago from today
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function getDateDaysAgo(daysAgo) {
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Helper function to generate a timestamp string
 * @param {number} daysAgo - Number of days ago from today
 * @param {number} [hoursOffset=0] - Additional hours offset
 * @returns {string} ISO timestamp string
 */
function getTimestampDaysAgo(daysAgo, hoursOffset = 0) {
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(10 + hoursOffset, 30, 0, 0);
  return date.toISOString();
}

/**
 * Weekly attendance records with dates, counts, and service types
 * Spans the last 2 years with weekly entries
 * @type {Array<{date: string, count: number, serviceType: string, salvations: number}>}
 */
export const attendanceData = (() => {
  const data = [];
  const serviceTypes = ['sunday', 'wednesday', 'friday'];
  
  // Generate weekly data for the last 104 weeks (2 years)
  for (let week = 0; week < 104; week++) {
    const daysAgo = week * 7;
    const baseAttendance = 120 + Math.floor(Math.random() * 80); // 120-200 range
    
    // Add seasonal variation (higher in spring/fall, lower in summer/winter holidays)
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const month = date.getMonth();
    let seasonalModifier = 1;
    if (month === 6 || month === 7) seasonalModifier = 0.85; // Summer dip
    if (month === 11 || month === 0) seasonalModifier = 0.9; // Holiday dip
    if (month === 3 || month === 4 || month === 9 || month === 10) seasonalModifier = 1.1; // Spring/Fall boost
    
    // Add growth trend (slight increase over time)
    const growthModifier = 1 + (104 - week) * 0.002;
    
    const adjustedAttendance = Math.round(baseAttendance * seasonalModifier * growthModifier);
    
    data.push({
      date: getDateDaysAgo(daysAgo),
      count: adjustedAttendance,
      serviceType: 'sunday',
      salvations: Math.random() > 0.7 ? Math.floor(Math.random() * 4) + 1 : 0
    });
    
    // Add midweek service (Wednesday) with lower attendance
    if (week < 52) { // Only last year for midweek
      data.push({
        date: getDateDaysAgo(daysAgo + 3),
        count: Math.round(adjustedAttendance * 0.4),
        serviceType: 'wednesday',
        salvations: Math.random() > 0.9 ? 1 : 0
      });
    }
  }
  
  return data.sort((a, b) => new Date(a.date) - new Date(b.date));
})();

/**
 * KPI metrics with historical values for trend calculation
 * @type {Array<{id: string, label: string, currentValue: number, previousValue: number, format: string}>}
 */
export const kpiData = [
  {
    id: 'members',
    label: 'Total Members',
    currentValue: 1247,
    previousValue: 1112,
    format: 'number'
  },
  {
    id: 'attendance',
    label: 'Weekly Attendance',
    currentValue: 892,
    previousValue: 825,
    format: 'number'
  },
  {
    id: 'visitors',
    label: 'New Visitors',
    currentValue: 34,
    previousValue: 36,
    format: 'number'
  },
  {
    id: 'retention',
    label: 'Retention Rate',
    currentValue: 94,
    previousValue: 91,
    format: 'percentage'
  }
];

/**
 * Historical KPI snapshots for different time periods
 * @type {Array<{date: string, members: number, attendance: number, visitors: number, retention: number}>}
 */
export const kpiHistory = (() => {
  const data = [];
  
  // Generate monthly snapshots for the last 24 months
  for (let month = 0; month < 24; month++) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - month);
    date.setDate(1);
    
    // Base values with growth trend
    const growthFactor = 1 + (24 - month) * 0.01;
    
    data.push({
      date: date.toISOString().split('T')[0],
      members: Math.round(1000 * growthFactor + Math.random() * 50),
      attendance: Math.round(750 * growthFactor + Math.random() * 100),
      visitors: Math.round(25 + Math.random() * 20),
      retention: Math.round(88 + Math.random() * 8)
    });
  }
  
  return data.sort((a, b) => new Date(a.date) - new Date(b.date));
})();

/**
 * Activity types for categorization
 * @type {Object<string, {icon: string, color: string}>}
 */
export const activityTypes = {
  new_member: { icon: 'user-plus', color: '#06b6d4' },
  visitor: { icon: 'user', color: '#10b981' },
  salvation: { icon: 'heart', color: '#f59e0b' },
  baptism: { icon: 'droplet', color: '#3b82f6' },
  event: { icon: 'calendar', color: '#8b5cf6' },
  note: { icon: 'file-text', color: '#6b7280' },
  contact: { icon: 'phone', color: '#06b6d4' },
  attendance: { icon: 'check-circle', color: '#10b981' },
  conversion: { icon: 'star', color: '#f59e0b' }
};

/**
 * Recent activities with timestamps
 * @type {Array<{id: number, type: string, description: string, person: string, action: string, timestamp: string, icon: string}>}
 */
export const activityData = (() => {
  const activities = [];
  const names = [
    'Sarah Johnson', 'Michael Chen', 'Emily Davis', 'James Wilson', 'Lisa Anderson',
    'David Brown', 'Jennifer Martinez', 'Robert Taylor', 'Amanda White', 'Christopher Lee',
    'Jessica Garcia', 'Matthew Robinson', 'Ashley Clark', 'Daniel Lewis', 'Stephanie Hall',
    'Andrew Young', 'Nicole King', 'Joshua Wright', 'Megan Scott', 'Ryan Green'
  ];
  
  const activityTemplates = [
    { type: 'new_member', action: 'joined the church', description: 'New member registration' },
    { type: 'visitor', action: 'visited for the first time', description: 'First-time visitor' },
    { type: 'salvation', action: 'made a salvation decision', description: 'Salvation decision recorded' },
    { type: 'baptism', action: 'was baptized', description: 'Baptism completed' },
    { type: 'event', action: 'registered for Youth Camp', description: 'Event registration' },
    { type: 'note', action: 'had a follow-up note added', description: 'Follow-up note added' },
    { type: 'contact', action: 'was contacted', description: 'New contact added' },
    { type: 'attendance', action: 'attended Sunday Service', description: 'Marked present at Sunday Service' },
    { type: 'conversion', action: 'completed new believers class', description: 'New believers class completion' }
  ];
  
  // Generate activities for the last 2 years
  let id = 1;
  for (let day = 0; day < 730; day++) {
    // Random number of activities per day (0-5)
    const activitiesPerDay = Math.floor(Math.random() * 6);
    
    for (let i = 0; i < activitiesPerDay; i++) {
      const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
      const person = names[Math.floor(Math.random() * names.length)];
      
      activities.push({
        id: id++,
        type: template.type,
        description: `${person} ${template.action}`,
        person: person,
        action: template.description,
        timestamp: getTimestampDaysAgo(day, Math.floor(Math.random() * 12)),
        icon: activityTypes[template.type].icon
      });
    }
  }
  
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
})();

/**
 * Evangelism contact records with dates and status progression
 * @type {Array<{id: number, name: string, dateContacted: string, status: string, followUpDate: string|null, notes: string}>}
 */
export const evangelismData = (() => {
  const data = [];
  const names = [
    'Thomas Anderson', 'Maria Garcia', 'William Johnson', 'Patricia Brown', 'Richard Davis',
    'Linda Martinez', 'Charles Wilson', 'Barbara Taylor', 'Joseph Moore', 'Susan Jackson',
    'Mark Thompson', 'Nancy White', 'Steven Harris', 'Karen Martin', 'Paul Robinson'
  ];
  
  const statuses = ['initial_contact', 'follow_up', 'interested', 'attending', 'member', 'inactive'];
  
  let id = 1;
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 730);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const hasFollowUp = status !== 'member' && status !== 'inactive' && Math.random() > 0.3;
    
    data.push({
      id: id++,
      name: names[Math.floor(Math.random() * names.length)],
      dateContacted: getDateDaysAgo(daysAgo),
      status: status,
      followUpDate: hasFollowUp ? getDateDaysAgo(Math.max(0, daysAgo - 7)) : null,
      notes: `Contact made during ${['Sunday service', 'community event', 'door-to-door', 'online outreach'][Math.floor(Math.random() * 4)]}`
    });
  }
  
  return data.sort((a, b) => new Date(b.dateContacted) - new Date(a.dateContacted));
})();

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

/**
 * Generic date range filter for any data array with a date field
 * @param {Array<Object>} data - Array of objects with date fields
 * @param {string} startDate - Start date ISO string (YYYY-MM-DD)
 * @param {string} endDate - End date ISO string (YYYY-MM-DD)
 * @param {string} [dateField='date'] - Name of the date field to filter on
 * @returns {Array<Object>} Filtered array
 */
export function filterByDateRange(data, startDate, endDate, dateField = 'date') {
  if (!startDate || !endDate) return data;
  
  return data.filter(item => {
    const itemDate = item[dateField];
    if (!itemDate) return false;
    return isDateInRange(itemDate, startDate, endDate);
  });
}

/**
 * Get attendance data filtered by date range
 * @param {{startDate: string, endDate: string}} dateRange - Date range object from filterStore
 * @returns {Array<{date: string, count: number, serviceType: string, salvations: number}>} Filtered attendance data
 */
export function getFilteredAttendance(dateRange) {
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return attendanceData;
  }
  
  return filterByDateRange(attendanceData, dateRange.startDate, dateRange.endDate, 'date');
}

/**
 * Get attendance data formatted for chart display (aggregated by month)
 * @param {{startDate: string, endDate: string}} dateRange - Date range object from filterStore
 * @returns {Array<{month: string, attendance: number}>} Chart-ready attendance data
 */
export function getAttendanceChartData(dateRange) {
  const filtered = getFilteredAttendance(dateRange);
  
  if (filtered.length === 0) {
    return [];
  }
  
  // Group by month and calculate average attendance
  const monthlyData = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  filtered.forEach(record => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthLabel,
        total: 0,
        count: 0,
        key: monthKey
      };
    }
    
    // Only count Sunday services for main attendance
    if (record.serviceType === 'sunday') {
      monthlyData[monthKey].total += record.count;
      monthlyData[monthKey].count += 1;
    }
  });
  
  // Convert to array and calculate averages
  return Object.values(monthlyData)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(item => ({
      month: item.month,
      attendance: item.count > 0 ? Math.round(item.total / item.count) : 0
    }));
}

/**
 * Calculate KPI values for a specific date range
 * @param {{startDate: string, endDate: string}} dateRange - Date range object from filterStore
 * @returns {Array<{title: string, value: number, trend: number, format: string}>} KPI data for display
 */
export function getFilteredKPIs(dateRange) {
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    // Return current values with default trends
    return kpiData.map(kpi => ({
      title: kpi.label,
      value: kpi.currentValue,
      trend: calculateTrendPercentage(kpi.currentValue, kpi.previousValue),
      format: kpi.format
    }));
  }
  
  // Get attendance data for the period
  const filteredAttendance = getFilteredAttendance(dateRange);
  const sundayServices = filteredAttendance.filter(a => a.serviceType === 'sunday');
  
  // Get activities for the period
  const filteredActivities = getFilteredActivities(dateRange);
  
  // Calculate metrics based on filtered data
  const avgAttendance = sundayServices.length > 0
    ? Math.round(sundayServices.reduce((sum, a) => sum + a.count, 0) / sundayServices.length)
    : 0;
  
  const newVisitors = filteredActivities.filter(a => a.type === 'visitor').length;
  const newMembers = filteredActivities.filter(a => a.type === 'new_member').length;
  
  // Calculate previous period for trend comparison
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);
  const periodLength = endDate - startDate;
  const previousStart = new Date(startDate - periodLength);
  const previousEnd = new Date(startDate);
  
  const previousRange = {
    startDate: previousStart.toISOString().split('T')[0],
    endDate: previousEnd.toISOString().split('T')[0]
  };
  
  const previousAttendance = getFilteredAttendance(previousRange);
  const previousSunday = previousAttendance.filter(a => a.serviceType === 'sunday');
  const prevAvgAttendance = previousSunday.length > 0
    ? Math.round(previousSunday.reduce((sum, a) => sum + a.count, 0) / previousSunday.length)
    : avgAttendance;
  
  const previousActivities = getFilteredActivities(previousRange);
  const prevVisitors = previousActivities.filter(a => a.type === 'visitor').length;
  const prevMembers = previousActivities.filter(a => a.type === 'new_member').length;
  
  // Find the closest KPI history snapshot for member count
  const closestSnapshot = kpiHistory.find(h => h.date <= dateRange.endDate) || kpiHistory[0];
  const prevSnapshot = kpiHistory.find(h => h.date <= previousRange.endDate) || kpiHistory[0];
  
  return [
    {
      title: 'Total Members',
      value: closestSnapshot?.members || kpiData[0].currentValue,
      trend: calculateTrendPercentage(closestSnapshot?.members, prevSnapshot?.members),
      format: 'number'
    },
    {
      title: 'Weekly Attendance',
      value: avgAttendance || kpiData[1].currentValue,
      trend: calculateTrendPercentage(avgAttendance, prevAvgAttendance),
      format: 'number'
    },
    {
      title: 'New Visitors',
      value: newVisitors || kpiData[2].currentValue,
      trend: calculateTrendPercentage(newVisitors, prevVisitors),
      format: 'number'
    },
    {
      title: 'Retention Rate',
      value: closestSnapshot?.retention || kpiData[3].currentValue,
      trend: calculateTrendPercentage(closestSnapshot?.retention, prevSnapshot?.retention),
      format: 'percentage'
    }
  ];
}

/**
 * Get activities filtered by date range
 * @param {{startDate: string, endDate: string}} dateRange - Date range object from filterStore
 * @returns {Array<Object>} Filtered activities
 */
export function getFilteredActivities(dateRange) {
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return activityData.slice(0, 50); // Return recent 50 if no filter
  }
  
  return filterByDateRange(activityData, dateRange.startDate, dateRange.endDate, 'timestamp');
}

/**
 * Get evangelism contacts filtered by date range
 * @param {{startDate: string, endDate: string}} dateRange - Date range object from filterStore
 * @returns {Array<Object>} Filtered evangelism data
 */
export function getFilteredEvangelism(dateRange) {
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return evangelismData;
  }
  
  return filterByDateRange(evangelismData, dateRange.startDate, dateRange.endDate, 'dateContacted');
}

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change (positive or negative)
 */
export function calculateTrendPercentage(current, previous) {
  if (!previous || previous === 0) return 0;
  if (!current) return 0;
  
  const change = ((current - previous) / previous) * 100;
  return Math.round(change);
}

/**
 * Calculate KPI trends comparing current range to previous range
 * @param {{startDate: string, endDate: string}} currentRange - Current date range
 * @param {{startDate: string, endDate: string}} previousRange - Previous date range for comparison
 * @returns {Object} Object with trend percentages for each KPI
 */
export function calculateKPITrends(currentRange, previousRange) {
  const currentKPIs = getFilteredKPIs(currentRange);
  const previousKPIs = getFilteredKPIs(previousRange);
  
  const trends = {};
  
  currentKPIs.forEach((kpi, index) => {
    const prevKPI = previousKPIs[index];
    trends[kpi.title.toLowerCase().replace(/\s+/g, '_')] = {
      current: kpi.value,
      previous: prevKPI?.value || 0,
      trend: calculateTrendPercentage(kpi.value, prevKPI?.value),
      trendUp: kpi.value > (prevKPI?.value || 0)
    };
  });
  
  return trends;
}

/**
 * Get summary statistics for a date range
 * @param {{startDate: string, endDate: string}} dateRange - Date range object
 * @returns {Object} Summary statistics
 */
export function getSummaryStats(dateRange) {
  const attendance = getFilteredAttendance(dateRange);
  const activities = getFilteredActivities(dateRange);
  const evangelism = getFilteredEvangelism(dateRange);
  
  const sundayServices = attendance.filter(a => a.serviceType === 'sunday');
  const totalSalvations = attendance.reduce((sum, a) => sum + (a.salvations || 0), 0);
  
  return {
    totalServices: attendance.length,
    sundayServices: sundayServices.length,
    averageAttendance: sundayServices.length > 0
      ? Math.round(sundayServices.reduce((sum, a) => sum + a.count, 0) / sundayServices.length)
      : 0,
    peakAttendance: sundayServices.length > 0
      ? Math.max(...sundayServices.map(a => a.count))
      : 0,
    totalSalvations,
    totalActivities: activities.length,
    newContacts: evangelism.filter(e => e.status === 'initial_contact').length,
    activeFollowUps: evangelism.filter(e => e.status === 'follow_up' || e.status === 'interested').length
  };
}
