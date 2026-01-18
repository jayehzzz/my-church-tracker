/**
 * Comprehensive Mock Data for Church Tracker
 * All entities use consistent IDs for proper cross-referencing.
 * 
 * Data Models:
 * - people: Church members, visitors, and leaders
 * - services: Sunday and special church services
 * - attendance: Links people to services they attended
 * - evangelismContacts: Outreach contacts with inviter relationships
 * - meetings: Prayer meetings and group gatherings
 * - meetingAttendance: Links people to meetings
 * - visitations: Home visit records
 * - activities: Activity log entries
 */

// ============================================
// PEOPLE - Core entity (15 members)
// Enhanced from mockPeopleWithLocation with additional fields
// ============================================
export const mockPeople = [
    {
        id: "1",
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "07700 900123",
        member_status: "member",
        role: "basonta_leader",
        activity_status: "regular",
        address: "123 Dunstable Road, Luton, LU1 1AA",
        lat: 51.8800,
        lng: -0.4280,
        avatar_url: null,
        membership_date: "2024-03-15",
        created_at: "2024-03-15T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "2",
        first_name: "Sarah",
        last_name: "Smith",
        email: "sarah.s@example.com",
        phone: "07700 900456",
        member_status: "leader",
        role: "bacenta_leader",
        activity_status: "regular",
        address: "45 Leagrave Road, Luton, LU4 8HT",
        lat: 51.8950,
        lng: -0.4500,
        avatar_url: null,
        membership_date: "2023-06-20",
        created_at: "2023-06-20T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "3",
        first_name: "Michael",
        last_name: "Chen",
        email: "m.chen@example.com",
        phone: "07700 900789",
        member_status: "visitor",
        role: "no_role",
        activity_status: "irregular",
        leader_id: "2", // Sarah Smith
        address: "89 London Road, Luton, LU1 3UE",
        lat: 51.8750,
        lng: -0.4100,
        avatar_url: null,
        membership_date: null,
        created_at: "2025-11-10T10:00:00Z",
        updated_at: "2025-11-10T10:00:00Z"
    },
    {
        id: "4",
        first_name: "Emma",
        last_name: "Wilson",
        email: "emma.w@example.com",
        phone: "07700 900321",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        leader_id: "1", // John Doe
        address: "12 Biscot Road, Luton, LU3 1AR",
        lat: 51.8900,
        lng: -0.4350,
        avatar_url: null,
        membership_date: "2024-01-10",
        created_at: "2024-01-10T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "5",
        first_name: "David",
        last_name: "Brown",
        email: "david.b@example.com",
        phone: "07700 900654",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        leader_id: "7", // James Anderson
        address: "High Street, Markyate, AL3 8JG",
        lat: 51.8380,
        lng: -0.4600,
        avatar_url: null,
        membership_date: "2024-05-22",
        created_at: "2024-05-22T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "6",
        first_name: "Lisa",
        last_name: "Taylor",
        email: "lisa.t@example.com",
        phone: "07700 900987",
        member_status: "visitor",
        role: "no_role",
        activity_status: "irregular",
        leader_id: "2", // Sarah Smith
        address: "Sundon Park Road, Luton, LU3 3BL",
        lat: 51.9150,
        lng: -0.4650,
        avatar_url: null,
        membership_date: null,
        created_at: "2025-12-01T10:00:00Z",
        updated_at: "2025-12-01T10:00:00Z"
    },
    {
        id: "7",
        first_name: "James",
        last_name: "Anderson",
        email: "j.anderson@example.com",
        phone: "07700 900159",
        member_status: "leader",
        role: "bacenta_leader",
        activity_status: "regular",
        address: "Hitchin Road, Luton, LU2 7UG",
        lat: 51.8850,
        lng: -0.4050,
        avatar_url: null,
        membership_date: "2022-09-15",
        created_at: "2022-09-15T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "8",
        first_name: "Olivia",
        last_name: "Thomas",
        email: "olivia.t@example.com",
        phone: "07700 900753",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        leader_id: "1", // John Doe
        address: "New Bedford Road, Luton, LU3 1LF",
        lat: 51.8920,
        lng: -0.4200,
        avatar_url: null,
        membership_date: "2024-07-08",
        created_at: "2024-07-08T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "9",
        first_name: "Robert",
        last_name: "Martinez",
        email: "robert.m@example.com",
        phone: "07700 900369",
        member_status: "member",
        role: "no_role",
        activity_status: "irregular",
        leader_id: "12", // Ava Clark
        address: "Farley Hill, Luton, LU1 5NR",
        lat: 51.8720,
        lng: -0.4300,
        avatar_url: null,
        membership_date: "2024-09-20",
        created_at: "2024-09-20T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "10",
        first_name: "Sophia",
        last_name: "Garcia",
        email: "sophia.g@example.com",
        phone: "07700 900258",
        member_status: "visitor",
        role: "no_role",
        activity_status: "dormant",
        leader_id: "7", // James Anderson
        address: "Castle Street, Luton, LU1 3AJ",
        lat: 51.8790,
        lng: -0.4180,
        avatar_url: null,
        membership_date: null,
        created_at: "2025-10-15T10:00:00Z",
        updated_at: "2025-10-15T10:00:00Z"
    },
    {
        id: "11",
        first_name: "Daniel",
        last_name: "Robinson",
        email: "daniel.r@example.com",
        phone: "07700 900147",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        leader_id: "12", // Ava Clark
        address: "Old Bedford Road, Luton, LU2 7HP",
        lat: 51.8860,
        lng: -0.4150,
        avatar_url: null,
        membership_date: "2024-11-05",
        created_at: "2024-11-05T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "12",
        first_name: "Ava",
        last_name: "Clark",
        email: "ava.c@example.com",
        phone: "07700 900369",
        member_status: "leader",
        role: "bacenta_leader",
        activity_status: "regular",
        address: "Stockingstone Road, Luton, LU2 7NE",
        lat: 51.8980,
        lng: -0.4250,
        avatar_url: null,
        membership_date: "2023-03-12",
        created_at: "2023-03-12T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "13",
        first_name: "William",
        last_name: "Rodriguez",
        email: "will.r@example.com",
        phone: "07700 900951",
        member_status: "archived",
        role: "no_role",
        activity_status: "dormant",
        leader_id: "1", // John Doe
        address: "Toddington Road, Luton, LU4 9DZ",
        lat: 51.9050,
        lng: -0.4550,
        avatar_url: null,
        membership_date: "2023-01-20",
        created_at: "2023-01-20T10:00:00Z",
        updated_at: "2024-06-01T10:00:00Z"
    },
    {
        id: "14",
        first_name: "Mia",
        last_name: "Lewis",
        email: "mia.l@example.com",
        phone: "07700 900753",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        leader_id: "7", // James Anderson
        address: "Marsh Road, Luton, LU3 2NL",
        lat: 51.9020,
        lng: -0.4400,
        avatar_url: null,
        membership_date: "2024-12-10",
        created_at: "2024-12-10T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z"
    },
    {
        id: "15",
        first_name: "Joseph",
        last_name: "Lee",
        email: "joseph.l@example.com",
        phone: "07700 900159",
        member_status: "visitor",
        role: "no_role",
        activity_status: "irregular",
        leader_id: "12", // Ava Clark
        address: "Dunstable Road, Luton, LU4 8JS",
        lat: 51.8930,
        lng: -0.4650,
        avatar_url: null,
        membership_date: null,
        created_at: "2025-12-20T10:00:00Z",
        updated_at: "2025-12-20T10:00:00Z"
    }
];

// Church location
export const churchLocation = {
    name: "St Margarets Social Club",
    address: "St Margarets Social Club, Luton, LU1 5JD",
    lat: 51.8887,
    lng: -0.4255
};

// ============================================
// SERVICES - Church services (Generated for 2025-2026)
// ============================================

// Helper to generate services
const generateServicesData = () => {
    const services = [];
    const attendance = [];

    // Start from Jan 1, 2025
    let currentDate = new Date('2025-01-01');
    const endDate = new Date('2026-03-01'); // Go into 2026

    let serviceIdCounter = 1;
    let attendanceIdCounter = 1;

    // Helper to get random number between min and max
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Helper to get random item from array
    const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Find next Sunday
    while (currentDate.getDay() !== 0) {
        currentDate.setDate(currentDate.getDate() + 1);
    }

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isSpecial = randomInt(1, 10) > 9; // 10% chance of special service
        const isMidweek = false; // Simplified loop for Sundays for now

        // Determine base attendance with seasonal trends
        // Higher in Dec/Jan/Easter, lower in Summer
        const month = currentDate.getMonth();
        let baseAttendance = 140;

        if (month === 11 || month === 0) baseAttendance += 30; // Dec/Jan
        if (month === 3 || month === 4) baseAttendance += 20; // Easter approx
        if (month === 7 || month === 8) baseAttendance -= 20; // Summer

        // Add noise
        const totalAttendance = baseAttendance + randomInt(-15, 25);
        const guestsCount = Math.floor(totalAttendance * (randomInt(5, 15) / 100));
        const salvationDecisions = Math.floor(guestsCount * (randomInt(10, 40) / 100));
        const tithersCount = Math.floor((totalAttendance - guestsCount) * 0.4);

        const serviceId = `s${serviceIdCounter++}`;

        // Select random individuals from mockPeople for the "individuals" tracking list
        // We'll pick 8-12 random people to be "tracked" explicitly
        const trackedPeople = mockPeople
            .sort(() => 0.5 - Math.random()) // Shuffle
            .slice(0, randomInt(8, 14));

        const individualIds = trackedPeople.map(p => p.id);

        services.push({
            id: serviceId,
            service_date: dateStr,
            service_type: isSpecial ? "special_service" : "sunday_service",
            service_time: "09:00",
            location: "Main Sanctuary",
            sermon_topic: isSpecial ? "Special Celebration" : `Sunday Service - Week ${serviceIdCounter}`,
            sermon_speaker: "Pastor John",
            total_attendance: totalAttendance,
            guests_count: guestsCount,
            salvation_decisions: salvationDecisions,
            tithers_count: tithersCount,
            individuals: individualIds,
            photos: randomInt(1, 5) > 3 ? [
                "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=100&h=100&fit=crop"
            ] : [],
            created_at: `${dateStr}T12:00:00Z`
        });

        // Generate attendance records for tracked individuals
        individualIds.forEach(personId => {
            attendance.push({
                id: `a${attendanceIdCounter++}`,
                service_id: serviceId,
                person_id: personId,
                created_at: `${dateStr}T09:00:00Z`
            });
        });

        // Next week
        currentDate.setDate(currentDate.getDate() + 7);
    }

    // Sort descending by date
    services.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));

    return { services, attendance };
};

const generatedData = generateServicesData();

export const mockServices = generatedData.services;

// ============================================
// ATTENDANCE - Links people to services
// ============================================
export const mockAttendance = generatedData.attendance;

// ============================================
// EVANGELISM CONTACTS - Outreach records
// invited_by_id references people IDs
// ============================================
// ============================================
// EVANGELISM CONTACTS - Outreach records (Generated for 2025-2026)
// ============================================

const generateEvangelismData = () => {
    const contacts = [];
    const activities = [];

    let contactIdCounter = 1;
    let activityIdCounter = 1;

    // Helper to get random number between min and max
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Start from Jan 1, 2025
    let currentDate = new Date('2025-01-01');
    const endDate = new Date('2026-03-01');

    // Names for contacts
    const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

    // Iterate week by week
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        // 1. Generate Outreach Activity (once every 1-2 weeks)
        if (randomInt(1, 10) > 4) { // ~60% chance of activity per week
            const types = ["evangelism", "community_service", "youth_event", "prayer", "training", "social"];
            const type = randomItem(types);

            let description = "";
            switch (type) {
                case "evangelism": description = "Community outreach and witnessing"; break;
                case "community_service": description = "Food bank support and aid"; break;
                case "youth_event": description = "Youth gathering and games"; break;
                case "prayer": description = "Community prayer walk"; break;
                case "training": description = "Leadership training session"; break;
                case "social": description = "Get-together and fellowship"; break;
            }

            activities.push({
                id: `act${activityIdCounter++}`,
                activity_type: type,
                activity_date: dateStr,
                description: description,
                participants_count: randomInt(5, 50),
                notes: "Generated activity entry",
                created_at: `${dateStr}T14:00:00Z`
            });
        }

        // 2. Generate Evangelism Contacts (1-3 per week)
        const newContactsCount = randomInt(0, 3);

        for (let i = 0; i < newContactsCount; i++) {
            const firstName = randomItem(firstNames);
            const lastName = randomItem(lastNames);
            const inviter = randomItem(mockPeople); // Random inviter from members

            // Randomize outcome
            const outcomes = ["responsive", "non_responsive", "events_only", "do_not_contact", "has_church"];
            const response = randomItem(outcomes);

            // Determine conversion status
            const isConverted = response === "responsive" && randomInt(1, 10) > 7; // 30% conversion for responsive
            const conversionDate = isConverted ? new Date(currentDate.getTime() + (randomInt(7, 30) * 86400000)).toISOString().split('T')[0] : null;

            contacts.push({
                id: `e${contactIdCounter++}`,
                first_name: firstName,
                last_name: lastName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
                phone: `07700 ${randomInt(100000, 999999)}`,
                address: `${randomInt(1, 100)} High Street, Luton`,
                contact_date: dateStr,
                response: response,
                follow_up_date: response === "responsive" ? new Date(currentDate.getTime() + (7 * 86400000)).toISOString().split('T')[0] : null,
                converted: isConverted,
                conversion_date: conversionDate,
                status: isConverted ? "member" : "guest",
                attended_church: isConverted || (response === "responsive" && randomInt(1, 10) > 3),
                salvation_decision: isConverted,
                invited_by_id: inviter.id,
                comments: ["Generated mock contact"],
                created_at: `${dateStr}T10:00:00Z`
            });
        }

        // Advance 3-5 days to spread dates slightly differently than Sundays
        currentDate.setDate(currentDate.getDate() + randomInt(3, 5));
    }

    // Sort mostly by date descending
    contacts.sort((a, b) => new Date(b.contact_date) - new Date(a.contact_date));
    activities.sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date));

    return { contacts, activities };
};

const generatedEvangelism = generateEvangelismData();

export const mockEvangelismContacts = generatedEvangelism.contacts;

// ============================================
// MEETINGS - Prayer meetings and gatherings
// leader_id references people IDs
// ============================================
export const mockMeetings = [
    {
        id: "m1",
        meeting_date: "2025-12-28",
        meeting_type: "bacenta",
        start_time: "18:00",
        end_time: "20:00",
        duration_minutes: 120,
        location: "Zone 1 - Fellowship Hall",
        attendance_count: 18,
        leaders_count: 18,
        leader_id: "2", // Sarah Smith
        notes: "Great fellowship and prayer time",
        created_at: "2025-12-28T20:00:00Z"
    },
    {
        id: "m2",
        meeting_date: "2025-12-21",
        meeting_type: "flow_prayer",
        start_time: "06:00",
        end_time: "07:00",
        duration_minutes: 60,
        location: "Main Sanctuary",
        attendance_count: 25,
        leaders_count: 20,
        leader_id: "7", // James Anderson
        notes: "Early morning prayer before Christmas",
        created_at: "2025-12-21T07:00:00Z"
    },
    {
        id: "m3",
        meeting_date: "2025-12-14",
        meeting_type: "bacenta",
        start_time: "18:00",
        end_time: "20:00",
        duration_minutes: 120,
        location: "Zone 1 - Fellowship Hall",
        attendance_count: 22,
        leaders_count: 18,
        leader_id: "2", // Sarah Smith
        notes: "House fellowship and Bible study",
        created_at: "2025-12-14T20:00:00Z"
    },
    {
        id: "m4",
        meeting_date: "2025-12-13",
        meeting_type: "all_night_prayer",
        start_time: "22:00",
        end_time: "05:00",
        duration_minutes: 420,
        location: "Main Sanctuary",
        attendance_count: 45,
        leaders_count: 40,
        leader_id: "1", // John Doe
        notes: "Year-end thanksgiving prayer vigil",
        created_at: "2025-12-14T05:00:00Z"
    },
    {
        id: "m5",
        meeting_date: "2025-12-08",
        meeting_type: "basonta",
        start_time: "14:00",
        end_time: "16:00",
        duration_minutes: 120,
        location: "Conference Room",
        attendance_count: 22,
        leaders_count: 22,
        leader_id: "12", // Ava Clark
        notes: "Leadership development session",
        created_at: "2025-12-08T16:00:00Z"
    },
    {
        id: "m6",
        meeting_date: "2025-12-01",
        meeting_type: "sat",
        start_time: "10:00",
        end_time: "13:00",
        duration_minutes: 180,
        location: "Training Center",
        attendance_count: 18,
        leaders_count: 18,
        leader_id: "7", // James Anderson
        notes: "Soul winning training session",
        created_at: "2025-12-01T13:00:00Z"
    },
    {
        id: "m7",
        meeting_date: "2025-11-30",
        meeting_type: "farley_prayer",
        start_time: "19:00",
        end_time: "21:00",
        duration_minutes: 120,
        location: "Farley Hill Community Center",
        attendance_count: 15,
        leaders_count: 12,
        leader_id: "8", // Olivia Thomas
        notes: "Community prayer gathering",
        created_at: "2025-11-30T21:00:00Z"
    },
    {
        id: "m8",
        meeting_date: "2025-11-23",
        meeting_type: "bacenta",
        start_time: "18:00",
        end_time: "20:00",
        duration_minutes: 120,
        location: "Zone 2 - Member's Home",
        attendance_count: 16,
        leaders_count: 14,
        leader_id: "12", // Ava Clark
        notes: "Thanksgiving preparation fellowship",
        created_at: "2025-11-23T20:00:00Z"
    }
];

// ============================================
// MEETING ATTENDANCE - Links people to meetings
// ============================================
export const mockMeetingAttendance = [
    // Meeting m1 (Bacenta)
    { id: "ma1", meeting_id: "m1", person_id: "1", created_at: "2025-12-28T18:00:00Z" },
    { id: "ma2", meeting_id: "m1", person_id: "2", created_at: "2025-12-28T18:00:00Z" },
    { id: "ma3", meeting_id: "m1", person_id: "4", created_at: "2025-12-28T18:00:00Z" },
    { id: "ma4", meeting_id: "m1", person_id: "5", created_at: "2025-12-28T18:00:00Z" },
    { id: "ma5", meeting_id: "m1", person_id: "8", created_at: "2025-12-28T18:00:00Z" },
    // Meeting m2 (Flow Prayer)
    { id: "ma6", meeting_id: "m2", person_id: "1", created_at: "2025-12-21T06:00:00Z" },
    { id: "ma7", meeting_id: "m2", person_id: "2", created_at: "2025-12-21T06:00:00Z" },
    { id: "ma8", meeting_id: "m2", person_id: "7", created_at: "2025-12-21T06:00:00Z" },
    { id: "ma9", meeting_id: "m2", person_id: "8", created_at: "2025-12-21T06:00:00Z" },
    { id: "ma10", meeting_id: "m2", person_id: "11", created_at: "2025-12-21T06:00:00Z" },
    { id: "ma11", meeting_id: "m2", person_id: "12", created_at: "2025-12-21T06:00:00Z" },
    // Meeting m4 (All Night Prayer)
    { id: "ma12", meeting_id: "m4", person_id: "1", created_at: "2025-12-13T22:00:00Z" },
    { id: "ma13", meeting_id: "m4", person_id: "2", created_at: "2025-12-13T22:00:00Z" },
    { id: "ma14", meeting_id: "m4", person_id: "4", created_at: "2025-12-13T22:00:00Z" },
    { id: "ma15", meeting_id: "m4", person_id: "7", created_at: "2025-12-13T22:00:00Z" },
    { id: "ma16", meeting_id: "m4", person_id: "8", created_at: "2025-12-13T22:00:00Z" },
    { id: "ma17", meeting_id: "m4", person_id: "11", created_at: "2025-12-13T22:00:00Z" },
    { id: "ma18", meeting_id: "m4", person_id: "12", created_at: "2025-12-13T22:00:00Z" }
];

// ============================================
// VISITATIONS - Home visit records
// person_id references the visited person
// ============================================
export const mockVisitations = [
    {
        id: "v1",
        person_id: "3", // Michael Chen - visitor
        person_visited_name: "Michael Chen",
        visited_by_name: "Pastor John",
        visited_by_id: "1",
        visit_date: "2025-12-27",
        outcome: "welcomed_encouraged",
        follow_up_required: false,
        follow_up_date: null,
        notes: "First-time visitor follow-up. Very warm reception, interested in Alpha course.",
        created_at: "2025-12-27T15:00:00Z"
    },
    {
        id: "v2",
        person_id: "6", // Lisa Taylor - visitor
        person_visited_name: "Lisa Taylor",
        visited_by_name: "Sarah Smith",
        visited_by_id: "2",
        visit_date: "2025-12-20",
        outcome: "prayer_request_received",
        follow_up_required: true,
        follow_up_date: "2026-01-03",
        notes: "Requested prayer for family situation. Scheduled follow-up counseling.",
        created_at: "2025-12-20T14:00:00Z"
    },
    {
        id: "v3",
        person_id: "10", // Sophia Garcia - visitor
        person_visited_name: "Sophia Garcia",
        visited_by_name: "James Anderson",
        visited_by_id: "7",
        visit_date: "2025-12-15",
        outcome: "not_home",
        follow_up_required: true,
        follow_up_date: "2025-12-22",
        notes: "No one home. Left welcome card and literature.",
        created_at: "2025-12-15T16:00:00Z"
    },
    {
        id: "v4",
        person_id: "15", // Joseph Lee - visitor
        person_visited_name: "Joseph Lee",
        visited_by_name: "Ava Clark",
        visited_by_id: "12",
        visit_date: "2025-12-28",
        outcome: "welcomed_encouraged",
        follow_up_required: false,
        follow_up_date: null,
        notes: "Very receptive! Planning to bring family next Sunday.",
        created_at: "2025-12-28T17:00:00Z"
    },
    {
        id: "v5",
        person_id: "9", // Robert Martinez - irregular member
        person_visited_name: "Robert Martinez",
        visited_by_name: "John Doe",
        visited_by_id: "1",
        visit_date: "2025-12-18",
        outcome: "concerns_shared",
        follow_up_required: true,
        follow_up_date: "2025-12-30",
        notes: "Work schedule making attendance difficult. Discussing online options.",
        created_at: "2025-12-18T19:00:00Z"
    },
    {
        id: "v6",
        person_id: "14", // Mia Lewis - new member
        person_visited_name: "Mia Lewis",
        visited_by_name: "Olivia Thomas",
        visited_by_id: "8",
        visit_date: "2025-12-22",
        outcome: "invited_to_service",
        follow_up_required: false,
        follow_up_date: null,
        notes: "New member welcome visit. Invited to Christmas service and small group.",
        created_at: "2025-12-22T11:00:00Z"
    }
];

// ============================================
// ACTIVITIES - Activity log entries
// ============================================
export const mockActivities = generatedEvangelism.activities;

// ============================================
// PRIORITY QUEUE - Guests needing visitation
// ============================================
export const mockPriorityQueue = [
    { name: "Michael Chen", phone: "07700 900789", lastAttended: "2025-12-22", daysSince: 7, personId: "3" },
    { name: "Lisa Taylor", phone: "07700 900987", lastAttended: "2025-12-15", daysSince: 14, personId: "6" },
    { name: "Sophia Garcia", phone: "07700 900258", lastAttended: "2025-12-01", daysSince: 28, personId: "10" },
    { name: "Joseph Lee", phone: "07700 900159", lastAttended: "2025-12-22", daysSince: 7, personId: "15" }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get person by ID
 */
export function getPersonById(id) {
    return mockPeople.find(p => p.id === id) || null;
}

/**
 * Get service by ID
 */
export function getServiceById(id) {
    return mockServices.find(s => s.id === id) || null;
}

/**
 * Get meeting by ID
 */
export function getMeetingById(id) {
    return mockMeetings.find(m => m.id === id) || null;
}

/**
 * Get attendance records for a person
 */
export function getAttendanceByPerson(personId) {
    return mockAttendance.filter(a => a.person_id === personId);
}

/**
 * Get attendance records for a service
 */
export function getAttendanceByService(serviceId) {
    return mockAttendance.filter(a => a.service_id === serviceId);
}

/**
 * Get evangelism contacts by inviter
 */
export function getContactsByInviter(personId) {
    return mockEvangelismContacts.filter(c => c.invited_by_id === personId);
}

/**
 * Get visitations for a person
 */
export function getVisitationsByPerson(personId) {
    return mockVisitations.filter(v => v.person_id === personId);
}

/**
 * Get meetings led by a person
 */
export function getMeetingsByLeader(personId) {
    return mockMeetings.filter(m => m.leader_id === personId);
}

/**
 * Get individuals (people objects) for a service
 */
export function getServiceIndividuals(service) {
    if (!service?.individuals || !Array.isArray(service.individuals)) return [];
    return service.individuals.map(id => getPersonById(id)).filter(Boolean);
}

/**
 * Get inviter profile for an evangelism contact
 */
export function getInviterProfile(contact) {
    if (!contact?.invited_by_id) return null;
    return getPersonById(contact.invited_by_id);
}

/**
 * Get leader profile for a meeting
 */
export function getMeetingLeader(meeting) {
    if (!meeting?.leader_id) return null;
    return getPersonById(meeting.leader_id);
}
