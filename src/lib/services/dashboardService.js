/**
 * Dashboard Service - Aggregates data from multiple Convex services
 * 
 * Provides KPIs and chart data for the main dashboard using real backend data.
 */
import * as peopleService from "./peopleService.js";
import * as servicesService from "./servicesService.js";
import * as evangelismService from "./evangelismService.js";
import * as visitationsService from "./visitationsService.js";

/**
 * Get dashboard KPIs based on date range
 * @param {{ startDate: string, endDate: string }} dateRange 
 * @returns {Promise<{ kpis: Array, periodLabel: string }>}
 */
export async function getDashboardKPIs(dateRange) {
    const periodLabel = formatPeriodLabel(dateRange);

    // Fetch data in parallel for performance
    const [
        membersResult,
        leadersResult,
        servicesResult,
        evangelismFollowUpsResult,
        visitationFollowUpsResult
    ] = await Promise.all([
        peopleService.getByStatus("member"),
        peopleService.getByStatus("leader"),
        dateRange?.startDate && dateRange?.endDate
            ? servicesService.getByDateRange(dateRange.startDate, dateRange.endDate)
            : servicesService.getAll(),
        evangelismService.getRequiringFollowUp(),
        visitationsService.getRequiringFollowUp()
    ]);

    // Calculate Total Members (members + leaders)
    const memberCount = (membersResult.data?.length || 0) + (leadersResult.data?.length || 0);

    // Calculate attendance stats from services in date range
    const services = servicesResult.data || [];

    // Filter to main Sunday services (handles various naming conventions)
    const sundayServices = services.filter(s => {
        const type = s.service_type?.toLowerCase() || '';
        return type === 'sunday' ||
            type === 'sunday service' ||
            type === 'sunday_service' ||
            type.includes('sunday');
    });

    // Calculate attendance: prefer total_attendance, fallback to individuals array length
    const getAttendanceCount = (service) => {
        if (service.total_attendance && service.total_attendance > 0) {
            return service.total_attendance;
        }
        // Fallback: count individuals array if available
        if (service.individuals && Array.isArray(service.individuals)) {
            return service.individuals.length;
        }
        return 0;
    };

    // Average attendance from services
    const avgAttendance = sundayServices.length > 0
        ? Math.round(
            sundayServices.reduce((sum, s) => sum + getAttendanceCount(s), 0) / sundayServices.length
        )
        : 0;

    // Sum of guests from all services in range
    const totalGuests = services.reduce((sum, s) => sum + (s.guests_count || 0), 0);

    // Follow-ups needed (combine evangelism + visitation)
    const evangelismFollowUps = evangelismFollowUpsResult.data?.length || 0;
    const visitationFollowUps = visitationFollowUpsResult.data?.length || 0;
    const totalFollowUps = evangelismFollowUps + visitationFollowUps;

    return {
        periodLabel,
        kpis: [
            {
                id: 'members',
                title: 'Total Members',
                value: memberCount,
                format: 'number',
                description: 'Active members & leaders'
            },
            {
                id: 'attendance',
                title: 'Avg Attendance',
                value: avgAttendance,
                format: 'number',
                description: periodLabel || 'All time'
            },
            {
                id: 'visitors',
                title: 'New Visitors',
                value: totalGuests,
                format: 'number',
                description: periodLabel || 'All time'
            },
            {
                id: 'followups',
                title: 'Follow-ups Needed',
                value: totalFollowUps,
                format: 'number',
                description: `${evangelismFollowUps} contacts, ${visitationFollowUps} visits`
            }
        ]
    };
}

/**
 * Get attendance chart data grouped by month
 * @param {{ startDate: string, endDate: string }} dateRange 
 * @returns {Promise<Array<{ month: string, attendance: number }>>}
 */
export async function getAttendanceChartData(dateRange) {
    const servicesResult = dateRange?.startDate && dateRange?.endDate
        ? await servicesService.getByDateRange(dateRange.startDate, dateRange.endDate)
        : await servicesService.getAll();

    const services = servicesResult.data || [];

    // Filter to Sunday services only for main attendance chart (handles various naming conventions)
    const sundayServices = services.filter(s => {
        const type = s.service_type?.toLowerCase() || '';
        return type === 'sunday' ||
            type === 'sunday service' ||
            type === 'sunday_service' ||
            type.includes('sunday');
    });

    // Calculate attendance: prefer total_attendance, fallback to individuals array length
    const getAttendanceCount = (service) => {
        if (service.total_attendance && service.total_attendance > 0) {
            return service.total_attendance;
        }
        if (service.individuals && Array.isArray(service.individuals)) {
            return service.individuals.length;
        }
        return 0;
    };

    // Group by month and calculate average
    const monthlyData = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    sundayServices.forEach(service => {
        const date = new Date(service.service_date);
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

        monthlyData[monthKey].total += getAttendanceCount(service);
        monthlyData[monthKey].count += 1;
    });

    // Convert to array with averages, sorted by date
    return Object.values(monthlyData)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(item => ({
            month: item.month,
            attendance: item.count > 0 ? Math.round(item.total / item.count) : 0
        }));
}

/**
 * Get recent activities from evangelism and visitations
 * @param {number} limit - Maximum activities to return
 * @returns {Promise<Array<{ id: string, type: string, description: string, timestamp: string }>>}
 */
export async function getRecentActivities(limit = 10) {
    const [evangelismResult, visitationsResult] = await Promise.all([
        evangelismService.getAll(),
        visitationsService.getAll()
    ]);

    const activities = [];

    // Add evangelism contacts as activities
    (evangelismResult.data || []).forEach(contact => {
        const person = contact.people;
        const name = person
            ? `${person.first_name} ${person.last_name}`
            : contact.person_name || 'Unknown';

        activities.push({
            id: `evangelism-${contact._id}`,
            type: 'contact',
            description: `${name} was contacted`,
            person: name,
            personId: person?._id || null,
            action: `Response: ${contact.response || 'Pending'}`,
            timestamp: contact.contact_date || contact.created_at,
            icon: 'phone'
        });
    });

    // Add visitations as activities
    (visitationsResult.data || []).forEach(visit => {
        const person = visit.people;
        const name = person
            ? `${person.first_name} ${person.last_name}`
            : visit.person_visited_name || 'Unknown';

        activities.push({
            id: `visitation-${visit._id}`,
            type: 'visitation',
            description: `${name} was visited`,
            person: name,
            personId: person?._id || null,
            action: `Outcome: ${visit.outcome || 'Not recorded'}`,
            timestamp: visit.visit_date || visit.created_at,
            icon: 'home'
        });
    });

    // Sort by timestamp descending and limit
    return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
}

/**
 * Format a human-readable period label from date range
 * @param {{ startDate: string, endDate: string }} dateRange 
 * @returns {string}
 */
function formatPeriodLabel(dateRange) {
    if (!dateRange?.startDate || !dateRange?.endDate) {
        return '';
    }

    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Same year?
    if (start.getFullYear() === end.getFullYear()) {
        // Same month?
        if (start.getMonth() === end.getMonth()) {
            return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
        }
        return `${monthNames[start.getMonth()]} - ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    }

    return `${monthNames[start.getMonth()]} ${start.getFullYear()} - ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
}
