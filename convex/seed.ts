import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * COMPREHENSIVE SEEDING SCRIPT
 * Run via: npx convex run seed:seed
 * 
 * Generates detailed, named test data for workflow testing:
 * - 30 Named People (Leaders, Members, Guests, Archived)
 * - 12 months of Services with attendance records
 * - All meeting types with realistic patterns
 * - Visitation records with various outcomes
 * - Complete spiritual journey scenarios
 */

const LOG = true;
const log = (msg: string) => { if (LOG) console.log(`[SEED] ${msg}`); };

// --- DATE HELPERS ---
const subDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d;
};

const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const toDateStr = (date: Date) => date.toISOString().split('T')[0];
const randomBool = (prob = 0.5) => Math.random() < prob;
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- NAMED TEST PEOPLE DATA ---
// Detailed profiles for comprehensive testing

interface PersonData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    member_status: "guest" | "member" | "leader" | "archived";
    role?: string;
    activity_status: "regular" | "irregular" | "dormant";
    is_baptised?: boolean;
    is_tither?: boolean;
    contact_category?: string;
    contact_date?: string;
    first_visit_date?: string;
    membership_date?: string;
    lat: number;
    lng: number;
    birthday?: string;
    testScenario?: string; // For documentation
    // Engagement profile for radar chart variety (0-1 probability scale)
    engagementProfile?: {
        serviceAttendance: number;  // How often they attend Sunday services
        prayerMeetings: number;     // How often they attend prayer meetings
        cellGroups: number;         // How often they attend bacenta/basonta
        tithing: number;            // How consistently they tithe
    };
}

// Church is in Luton, UK - coordinates around that area
const CHURCH_LAT = 51.8787;
const CHURCH_LNG = -0.4200;

const NAMED_PEOPLE: PersonData[] = [
    // === LEADERS (3) ===
    {
        first_name: "Samuel",
        last_name: "Owusu",
        email: "samuel.owusu@email.com",
        phone: "+44 7700 100001",
        address: "15 Church Road, Luton, LU1 1AA",
        member_status: "leader",
        role: "bacenta_leader",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2020-03-15",
        membership_date: "2020-06-20",
        lat: CHURCH_LAT + 0.01,
        lng: CHURCH_LNG - 0.005,
        birthday: "1975-08-12",
        testScenario: "Senior pastor figure, prolific visitor, high attendance",
        engagementProfile: { serviceAttendance: 0.98, prayerMeetings: 0.95, cellGroups: 0.90, tithing: 0.95 }
    },
    {
        first_name: "Grace",
        last_name: "Mensah",
        email: "grace.mensah@email.com",
        phone: "+44 7700 100002",
        address: "28 High Street, Luton, LU1 2BB",
        member_status: "leader",
        role: "bacenta_leader",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2021-01-10",
        membership_date: "2021-04-15",
        lat: CHURCH_LAT + 0.015,
        lng: CHURCH_LNG + 0.008,
        birthday: "1982-03-25",
        testScenario: "Active female leader, leads women's ministry",
        engagementProfile: { serviceAttendance: 0.95, prayerMeetings: 0.70, cellGroups: 0.95, tithing: 0.85 }
    },
    {
        first_name: "David",
        last_name: "Boateng",
        email: "david.boateng@email.com",
        phone: "+44 7700 100003",
        address: "42 Park Avenue, Luton, LU2 3CC",
        member_status: "leader",
        role: "basonta_worker",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2019-09-01",
        membership_date: "2019-12-15",
        lat: CHURCH_LAT - 0.008,
        lng: CHURCH_LNG + 0.012,
        birthday: "1988-11-30",
        testScenario: "Prayer meeting leader, high prayer hours",
        engagementProfile: { serviceAttendance: 0.90, prayerMeetings: 0.98, cellGroups: 0.75, tithing: 0.90 }
    },

    // === ACTIVE MEMBERS (12) ===
    {
        first_name: "Sarah",
        last_name: "Johnson",
        email: "sarah.johnson@email.com",
        phone: "+44 7700 100004",
        address: "55 Manor Road, Luton, LU3 4DD",
        member_status: "member",
        role: "basonta_worker",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2022-02-20",
        membership_date: "2022-05-25",
        lat: CHURCH_LAT + 0.02,
        lng: CHURCH_LNG - 0.015,
        birthday: "1990-07-08",
        testScenario: "Regular tither, fully trained, active worker",
        engagementProfile: { serviceAttendance: 0.88, prayerMeetings: 0.45, cellGroups: 0.70, tithing: 0.92 }
    },
    {
        first_name: "Michael",
        last_name: "Appiah",
        email: "michael.appiah@email.com",
        phone: "+44 7700 100005",
        address: "12 The Crescent, Luton, LU1 5EE",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: false,
        is_tither: false,
        first_visit_date: "2025-10-15",
        membership_date: "2025-12-01",
        lat: CHURCH_LAT + 0.005,
        lng: CHURCH_LNG + 0.018,
        birthday: "1995-04-22",
        testScenario: "NEW MEMBER - joined 30 days ago, not yet baptised",
        engagementProfile: { serviceAttendance: 0.75, prayerMeetings: 0.20, cellGroups: 0.30, tithing: 0.10 }
    },
    {
        first_name: "Kwesi",
        last_name: "Bonsu",
        email: "kwesi.bonsu@email.com",
        phone: "+44 7700 100006",
        address: "78 Dunstable Road, Luton, LU4 6FF",
        member_status: "leader",
        role: "basonta_worker",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        contact_date: "2025-01-10",
        first_visit_date: "2025-02-05",
        membership_date: "2025-05-15",
        lat: CHURCH_LAT - 0.012,
        lng: CHURCH_LNG - 0.02,
        birthday: "1992-09-18",
        testScenario: "FULL JOURNEY: Contact→Guest→Member→Leader in 9 months",
        engagementProfile: { serviceAttendance: 0.92, prayerMeetings: 0.85, cellGroups: 0.90, tithing: 0.88 }
    },
    {
        first_name: "Rebecca",
        last_name: "Asare",
        email: "rebecca.asare@email.com",
        phone: "+44 7700 100007",
        address: "34 Leagrave Road, Luton, LU3 7GG",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2023-06-10",
        membership_date: "2023-09-20",
        lat: CHURCH_LAT + 0.025,
        lng: CHURCH_LNG + 0.005,
        birthday: "1987-12-03",
        testScenario: "Long-term regular member",
        engagementProfile: { serviceAttendance: 0.85, prayerMeetings: 0.55, cellGroups: 0.60, tithing: 0.80 }
    },
    {
        first_name: "James",
        last_name: "Okonkwo",
        email: "james.okonkwo@email.com",
        phone: "+44 7700 100008",
        address: "91 London Road, Luton, LU1 8HH",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2024-03-15",
        membership_date: "2024-07-10",
        lat: CHURCH_LAT - 0.018,
        lng: CHURCH_LNG + 0.008,
        birthday: "1999-02-14",
        testScenario: "Young adult member, regular but not yet tithing",
        engagementProfile: { serviceAttendance: 0.80, prayerMeetings: 0.35, cellGroups: 0.25, tithing: 0.05 }
    },
    {
        first_name: "Priscilla",
        last_name: "Danso",
        email: "priscilla.danso@email.com",
        phone: "+44 7700 100009",
        address: "23 New Town Street, Luton, LU2 9II",
        member_status: "member",
        role: "basonta_worker",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2022-11-20",
        membership_date: "2023-02-28",
        lat: CHURCH_LAT + 0.008,
        lng: CHURCH_LNG - 0.022,
        birthday: "1984-06-17",
        testScenario: "Active worker in evangelism team",
        engagementProfile: { serviceAttendance: 0.88, prayerMeetings: 0.40, cellGroups: 0.85, tithing: 0.78 }
    },
    {
        first_name: "Emmanuel",
        last_name: "Darko",
        email: "emmanuel.darko@email.com",
        phone: "+44 7700 100010",
        address: "67 Hitchin Road, Luton, LU2 0JJ",
        member_status: "member",
        role: "no_role",
        activity_status: "irregular",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2024-05-10",
        membership_date: "2024-08-25",
        lat: CHURCH_LAT - 0.015,
        lng: CHURCH_LNG - 0.012,
        birthday: "1978-10-05",
        testScenario: "IRREGULAR: Work schedule conflicts, attends ~50%",
        engagementProfile: { serviceAttendance: 0.50, prayerMeetings: 0.15, cellGroups: 0.30, tithing: 0.20 }
    },
    {
        first_name: "Comfort",
        last_name: "Adjei",
        email: "comfort.adjei@email.com",
        phone: "+44 7700 100011",
        address: "89 Biscot Road, Luton, LU3 1KK",
        member_status: "member",
        role: "no_role",
        activity_status: "dormant",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2023-04-05",
        membership_date: "2023-08-10",
        lat: CHURCH_LAT + 0.03,
        lng: CHURCH_LNG + 0.015,
        birthday: "1980-01-28",
        testScenario: "DORMANT: Last attended 60+ days ago, needs re-engagement",
        engagementProfile: { serviceAttendance: 0.10, prayerMeetings: 0.05, cellGroups: 0.08, tithing: 0.02 }
    },
    {
        first_name: "Peter",
        last_name: "Tetteh",
        email: "peter.tetteh@email.com",
        phone: "+44 7700 100012",
        address: "45 Stockwood Crescent, Luton, LU1 2LL",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2023-01-15",
        membership_date: "2023-04-20",
        lat: CHURCH_LAT - 0.022,
        lng: CHURCH_LNG + 0.02,
        birthday: "1991-08-11",
        testScenario: "Solid member, regular attender",
        engagementProfile: { serviceAttendance: 0.90, prayerMeetings: 0.65, cellGroups: 0.55, tithing: 0.88 }
    },
    {
        first_name: "Esther",
        last_name: "Frimpong",
        email: "esther.frimpong@email.com",
        phone: "+44 7700 100013",
        address: "16 Beech Hill, Luton, LU2 3MM",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2024-01-08",
        membership_date: "2024-04-15",
        lat: CHURCH_LAT + 0.012,
        lng: CHURCH_LNG - 0.028,
        birthday: "1986-05-30",
        testScenario: "Active in women's fellowship",
        engagementProfile: { serviceAttendance: 0.85, prayerMeetings: 0.70, cellGroups: 0.75, tithing: 0.82 }
    },
    {
        first_name: "Daniel",
        last_name: "Adu",
        email: "daniel.adu@email.com",
        phone: "+44 7700 100014",
        address: "72 Old Bedford Road, Luton, LU2 4NN",
        member_status: "member",
        role: "no_role",
        activity_status: "irregular",
        is_baptised: false,
        is_tither: false,
        first_visit_date: "2024-08-20",
        membership_date: "2024-11-30",
        lat: CHURCH_LAT - 0.01,
        lng: CHURCH_LNG - 0.018,
        birthday: "2001-03-07",
        testScenario: "Young member, still establishing attendance pattern",
        engagementProfile: { serviceAttendance: 0.55, prayerMeetings: 0.10, cellGroups: 0.45, tithing: 0.08 }
    },
    {
        first_name: "Mercy",
        last_name: "Opoku",
        email: "mercy.opoku@email.com",
        phone: "+44 7700 100015",
        address: "38 Wardown Crescent, Luton, LU2 5OO",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2024-02-14",
        membership_date: "2024-06-01",
        lat: CHURCH_LAT + 0.018,
        lng: CHURCH_LNG + 0.022,
        birthday: "1994-11-22",
        testScenario: "Single mother, very committed",
        engagementProfile: { serviceAttendance: 0.92, prayerMeetings: 0.25, cellGroups: 0.40, tithing: 0.15 }
    },

    // === GUESTS / EVANGELISM CONTACTS (40+ spread across all months) ===
    // January 2025 contacts
    {
        first_name: "Afia",
        last_name: "Mensah",
        email: "afia.mensah@email.com",
        phone: "+44 7700 100101",
        address: "12 London Road, Luton, LU1 1AA",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-01-05",
        first_visit_date: "2025-01-12",
        lat: CHURCH_LAT + 0.015,
        lng: CHURCH_LNG - 0.01,
        birthday: "1990-05-20",
        testScenario: "JAN contact - now regular attender"
    },
    {
        first_name: "Kojo",
        last_name: "Owusu",
        email: "kojo.owusu@email.com",
        phone: "+44 7700 100102",
        address: "45 Park Street, Luton, LU1 2BB",
        member_status: "guest",
        activity_status: "dormant",
        contact_category: "non_responsive",
        contact_date: "2025-01-18",
        lat: CHURCH_LAT - 0.02,
        lng: CHURCH_LNG + 0.015,
        birthday: "1985-11-10",
        testScenario: "JAN contact - never responded"
    },
    // February 2025 contacts
    {
        first_name: "Adwoa",
        last_name: "Boateng",
        email: "adwoa.boateng@email.com",
        phone: "+44 7700 100103",
        address: "78 High Street, Luton, LU2 1CC",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "events_only",
        contact_date: "2025-02-02",
        first_visit_date: "2025-04-20",
        lat: CHURCH_LAT + 0.025,
        lng: CHURCH_LNG - 0.018,
        birthday: "1992-08-15",
        testScenario: "FEB contact - came to Easter only"
    },
    {
        first_name: "Yaw",
        last_name: "Appiah",
        email: "yaw.appiah@email.com",
        phone: "+44 7700 100104",
        address: "23 Mill Road, Luton, LU3 2DD",
        member_status: "member",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-02-10",
        first_visit_date: "2025-02-16",
        membership_date: "2025-06-01",
        is_baptised: true,
        is_tither: false,
        lat: CHURCH_LAT - 0.012,
        lng: CHURCH_LNG - 0.022,
        birthday: "1988-03-25",
        testScenario: "FEB contact - FULL CONVERSION to member",
        engagementProfile: { serviceAttendance: 0.85, prayerMeetings: 0.40, cellGroups: 0.55, tithing: 0.25 }
    },
    {
        first_name: "Akua",
        last_name: "Darko",
        email: "akua.darko@email.com",
        phone: "+44 7700 100105",
        address: "56 Chapel Lane, Luton, LU4 3EE",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-02-22",
        first_visit_date: "2025-03-01",
        lat: CHURCH_LAT + 0.018,
        lng: CHURCH_LNG + 0.012,
        birthday: "1995-01-08",
        testScenario: "FEB contact - now regular first timer"
    },
    // March 2025 contacts
    {
        first_name: "Kwabena",
        last_name: "Antwi",
        email: "kwabena.antwi@email.com",
        phone: "+44 7700 100106",
        address: "89 Church Road, Luton, LU1 4FF",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-03-05",
        first_visit_date: "2025-03-09",
        lat: CHURCH_LAT - 0.008,
        lng: CHURCH_LNG + 0.025,
        birthday: "1991-06-30",
        testScenario: "MAR contact - active attender"
    },
    {
        first_name: "Yaa",
        last_name: "Asare",
        email: "yaa.asare@email.com",
        phone: "+44 7700 100107",
        address: "34 Station Road, Luton, LU2 5GG",
        member_status: "guest",
        activity_status: "dormant",
        contact_category: "has_church",
        contact_date: "2025-03-15",
        lat: CHURCH_LAT + 0.022,
        lng: CHURCH_LNG - 0.028,
        birthday: "1987-09-12",
        testScenario: "MAR contact - already has church"
    },
    {
        first_name: "Kofi",
        last_name: "Tetteh",
        email: "kofi.tetteh@email.com",
        phone: "+44 7700 100108",
        address: "67 Oak Avenue, Luton, LU3 6HH",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "responsive",
        contact_date: "2025-03-28",
        first_visit_date: "2025-04-06",
        lat: CHURCH_LAT - 0.015,
        lng: CHURCH_LNG - 0.008,
        birthday: "1993-12-05",
        testScenario: "MAR contact - sporadic attendance"
    },
    // April 2025 contacts (Easter period - higher activity)
    {
        first_name: "Ama",
        last_name: "Ofori",
        email: "ama.ofori@email.com",
        phone: "+44 7700 100109",
        address: "12 Elm Street, Luton, LU4 7II",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-04-01",
        first_visit_date: "2025-04-06",
        lat: CHURCH_LAT + 0.03,
        lng: CHURCH_LNG + 0.02,
        birthday: "1994-07-18",
        testScenario: "APR Easter contact - regular now"
    },
    {
        first_name: "Kweku",
        last_name: "Mensah",
        email: "kweku.mensah@email.com",
        phone: "+44 7700 100110",
        address: "45 Pine Road, Luton, LU1 8JJ",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "events_only",
        contact_date: "2025-04-08",
        first_visit_date: "2025-04-20",
        lat: CHURCH_LAT - 0.025,
        lng: CHURCH_LNG + 0.018,
        birthday: "1986-02-28",
        testScenario: "APR Easter contact - special events only"
    },
    {
        first_name: "Efua",
        last_name: "Osei",
        email: "efua.osei@email.com",
        phone: "+44 7700 100111",
        address: "78 Birch Close, Luton, LU2 9KK",
        member_status: "member",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-04-15",
        first_visit_date: "2025-04-20",
        membership_date: "2025-08-15",
        is_baptised: true,
        is_tither: true,
        lat: CHURCH_LAT + 0.012,
        lng: CHURCH_LNG - 0.015,
        birthday: "1989-10-22",
        testScenario: "APR contact - FULL CONVERSION, now tithing",
        engagementProfile: { serviceAttendance: 0.90, prayerMeetings: 0.55, cellGroups: 0.70, tithing: 0.85 }
    },
    {
        first_name: "Kobina",
        last_name: "Gyamfi",
        email: "kobina.gyamfi@email.com",
        phone: "+44 7700 100112",
        address: "23 Maple Drive, Luton, LU3 0LL",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-04-22",
        first_visit_date: "2025-04-27",
        lat: CHURCH_LAT - 0.018,
        lng: CHURCH_LNG - 0.022,
        birthday: "1996-04-10",
        testScenario: "APR contact - young adult, active"
    },
    // May 2025 contacts
    {
        first_name: "Adjoa",
        last_name: "Bonsu",
        email: "adjoa.bonsu@email.com",
        phone: "+44 7700 100113",
        address: "56 Ash Lane, Luton, LU4 1MM",
        member_status: "guest",
        activity_status: "dormant",
        contact_category: "non_responsive",
        contact_date: "2025-05-03",
        lat: CHURCH_LAT + 0.028,
        lng: CHURCH_LNG + 0.025,
        birthday: "1984-08-05",
        testScenario: "MAY contact - never responded"
    },
    {
        first_name: "Kwame",
        last_name: "Frimpong",
        email: "kwame.frimpong2@email.com",
        phone: "+44 7700 100114",
        address: "89 Cedar Road, Luton, LU1 2NN",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-05-12",
        first_visit_date: "2025-05-18",
        lat: CHURCH_LAT - 0.022,
        lng: CHURCH_LNG + 0.012,
        birthday: "1990-11-15",
        testScenario: "MAY contact - regular attender"
    },
    {
        first_name: "Abena",
        last_name: "Adjei",
        email: "abena.adjei@email.com",
        phone: "+44 7700 100115",
        address: "34 Willow Way, Luton, LU2 3OO",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "bacenta_mainly",
        contact_date: "2025-05-20",
        first_visit_date: "2025-05-27",
        lat: CHURCH_LAT + 0.008,
        lng: CHURCH_LNG - 0.03,
        birthday: "1997-03-08",
        testScenario: "MAY contact - prefers cell groups"
    },
    // June 2025 contacts
    {
        first_name: "Yaw",
        last_name: "Amponsah",
        email: "yaw.amponsah@email.com",
        phone: "+44 7700 100116",
        address: "67 Poplar Street, Luton, LU3 4PP",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-06-01",
        first_visit_date: "2025-06-08",
        lat: CHURCH_LAT - 0.01,
        lng: CHURCH_LNG + 0.028,
        birthday: "1992-12-20",
        testScenario: "JUN contact - committed attender"
    },
    {
        first_name: "Akosua",
        last_name: "Danso",
        email: "akosua.danso@email.com",
        phone: "+44 7700 100117",
        address: "12 Beech Road, Luton, LU4 5QQ",
        member_status: "guest",
        activity_status: "dormant",
        contact_category: "do_not_contact",
        contact_date: "2025-06-15",
        lat: CHURCH_LAT + 0.02,
        lng: CHURCH_LNG - 0.02,
        birthday: "1983-06-25",
        testScenario: "JUN contact - requested no contact"
    },
    {
        first_name: "Kofi",
        last_name: "Opoku",
        email: "kofi.opoku@email.com",
        phone: "+44 7700 100118",
        address: "45 Sycamore Avenue, Luton, LU1 6RR",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "responsive",
        contact_date: "2025-06-28",
        first_visit_date: "2025-07-06",
        lat: CHURCH_LAT - 0.028,
        lng: CHURCH_LNG - 0.012,
        birthday: "1988-09-30",
        testScenario: "JUN contact - irregular attendance"
    },
    // July 2025 contacts (summer - lower activity)
    {
        first_name: "Ama",
        last_name: "Asante",
        email: "ama.asante@email.com",
        phone: "+44 7700 100119",
        address: "78 Hazel Close, Luton, LU2 7SS",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-07-05",
        first_visit_date: "2025-07-13",
        lat: CHURCH_LAT + 0.015,
        lng: CHURCH_LNG + 0.022,
        birthday: "1995-01-12",
        testScenario: "JUL summer contact - stayed engaged"
    },
    {
        first_name: "Kwabena",
        last_name: "Kusi",
        email: "kwabena.kusi@email.com",
        phone: "+44 7700 100120",
        address: "23 Holly Road, Luton, LU3 8TT",
        member_status: "guest",
        activity_status: "dormant",
        contact_category: "non_responsive",
        contact_date: "2025-07-18",
        lat: CHURCH_LAT - 0.015,
        lng: CHURCH_LNG + 0.018,
        birthday: "1986-04-08",
        testScenario: "JUL contact - summer, no response"
    },
    // August 2025 contacts
    {
        first_name: "Yaa",
        last_name: "Owusu",
        email: "yaa.owusu@email.com",
        phone: "+44 7700 100121",
        address: "56 Ivy Lane, Luton, LU4 9UU",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-08-02",
        first_visit_date: "2025-08-10",
        lat: CHURCH_LAT + 0.025,
        lng: CHURCH_LNG - 0.008,
        birthday: "1991-07-22",
        testScenario: "AUG contact - regular attender"
    },
    {
        first_name: "Kofi",
        last_name: "Amponsah",
        email: "kofi.amponsah@email.com",
        phone: "+44 7700 100021",
        address: "17 Bramingham Road, Luton, LU3 1UU",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "events_only",
        contact_date: "2025-08-10",
        first_visit_date: "2025-12-25",
        lat: CHURCH_LAT - 0.018,
        lng: CHURCH_LNG + 0.035,
        birthday: "1985-06-12",
        testScenario: "AUG contact - EVENTS ONLY (Christmas)"
    },
    {
        first_name: "Adwoa",
        last_name: "Mensah",
        email: "adwoa.mensah@email.com",
        phone: "+44 7700 100122",
        address: "89 Laurel Way, Luton, LU1 0VV",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "responsive",
        contact_date: "2025-08-25",
        first_visit_date: "2025-09-01",
        lat: CHURCH_LAT - 0.02,
        lng: CHURCH_LNG - 0.025,
        birthday: "1993-10-18",
        testScenario: "AUG contact - settling into routine"
    },
    // September 2025 contacts (back to school - activity picks up)
    {
        first_name: "Yaw",
        last_name: "Mensah",
        email: "yaw.mensah@email.com",
        phone: "+44 7700 100018",
        address: "29 Bury Park Road, Luton, LU1 8RR",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "non_responsive",
        contact_date: "2025-09-15",
        lat: CHURCH_LAT + 0.032,
        lng: CHURCH_LNG + 0.012,
        birthday: "1988-12-01",
        testScenario: "SEP contact - NON-RESPONSIVE"
    },
    {
        first_name: "Akua",
        last_name: "Boateng",
        email: "akua.boateng@email.com",
        phone: "+44 7700 100123",
        address: "34 Rowan Road, Luton, LU2 1WW",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-09-08",
        first_visit_date: "2025-09-14",
        lat: CHURCH_LAT + 0.018,
        lng: CHURCH_LNG + 0.015,
        birthday: "1989-05-30",
        testScenario: "SEP back-to-school contact - engaged"
    },
    {
        first_name: "Kweku",
        last_name: "Tetteh",
        email: "kweku.tetteh@email.com",
        phone: "+44 7700 100124",
        address: "67 Chestnut Close, Luton, LU3 2XX",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-09-20",
        first_visit_date: "2025-09-28",
        lat: CHURCH_LAT - 0.012,
        lng: CHURCH_LNG - 0.018,
        birthday: "1994-08-14",
        testScenario: "SEP contact - active attender"
    },
    // October 2025 contacts
    {
        first_name: "Abena",
        last_name: "Osei",
        email: "abena.osei@email.com",
        phone: "+44 7700 100019",
        address: "83 Stopsley Way, Luton, LU2 9SS",
        member_status: "guest",
        activity_status: "dormant",
        contact_category: "has_church",
        contact_date: "2025-10-05",
        lat: CHURCH_LAT - 0.028,
        lng: CHURCH_LNG - 0.025,
        birthday: "1993-04-17",
        testScenario: "OCT contact - has own church"
    },
    {
        first_name: "Ama",
        last_name: "Gyamfi",
        email: "ama.gyamfi@email.com",
        phone: "+44 7700 100020",
        address: "62 Lewsey Road, Luton, LU4 0TT",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-10-20",
        first_visit_date: "2025-10-27",
        lat: CHURCH_LAT + 0.022,
        lng: CHURCH_LNG - 0.032,
        birthday: "1997-09-25",
        testScenario: "OCT contact - ACTIVE, ready for membership"
    },
    {
        first_name: "Kobina",
        last_name: "Frimpong",
        email: "kobina.frimpong@email.com",
        phone: "+44 7700 100125",
        address: "12 Alder Lane, Luton, LU4 3YY",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "responsive",
        contact_date: "2025-10-12",
        first_visit_date: "2025-10-19",
        lat: CHURCH_LAT + 0.028,
        lng: CHURCH_LNG + 0.008,
        birthday: "1990-02-05",
        testScenario: "OCT contact - sporadic attendance"
    },
    {
        first_name: "Adjoa",
        last_name: "Asare",
        email: "adjoa.asare@email.com",
        phone: "+44 7700 100126",
        address: "45 Fir Road, Luton, LU1 4ZZ",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-10-28",
        first_visit_date: "2025-11-02",
        lat: CHURCH_LAT - 0.008,
        lng: CHURCH_LNG + 0.022,
        birthday: "1996-11-20",
        testScenario: "OCT contact - engaged attender"
    },
    // November 2025 contacts
    {
        first_name: "Akosua",
        last_name: "Frimpong",
        email: "akosua.frimpong@email.com",
        phone: "+44 7700 100017",
        address: "54 Round Green, Luton, LU2 7QQ",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-11-01",
        first_visit_date: "2025-11-10",
        lat: CHURCH_LAT - 0.025,
        lng: CHURCH_LNG + 0.028,
        birthday: "1989-02-08",
        testScenario: "NOV contact - 4+ visits, membership ready"
    },
    {
        first_name: "Efua",
        last_name: "Mensah",
        email: "efua.mensah@email.com",
        phone: "+44 7700 100023",
        address: "86 Sundon Park Road, Luton, LU3 3WW",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-11-15",
        first_visit_date: "2025-11-22",
        lat: CHURCH_LAT - 0.032,
        lng: CHURCH_LNG - 0.015,
        birthday: "1991-08-19",
        testScenario: "NOV contact - interested in Alpha"
    },
    {
        first_name: "Kwame",
        last_name: "Ofori",
        email: "kwame.ofori@email.com",
        phone: "+44 7700 100127",
        address: "78 Spruce Way, Luton, LU2 5AB",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-11-08",
        first_visit_date: "2025-11-16",
        lat: CHURCH_LAT + 0.012,
        lng: CHURCH_LNG - 0.028,
        birthday: "1987-06-12",
        testScenario: "NOV contact - family man, committed"
    },
    {
        first_name: "Yaa",
        last_name: "Antwi",
        email: "yaa.antwi@email.com",
        phone: "+44 7700 100128",
        address: "23 Juniper Close, Luton, LU3 6BC",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "events_only",
        contact_date: "2025-11-22",
        lat: CHURCH_LAT - 0.015,
        lng: CHURCH_LNG + 0.012,
        birthday: "1992-09-08",
        testScenario: "NOV contact - waiting for Christmas"
    },
    // December 2025 contacts (Christmas - high activity)
    {
        first_name: "Nana",
        last_name: "Amoako",
        email: "nana.amoako@email.com",
        phone: "+44 7700 100022",
        address: "39 Hart Lane, Luton, LU2 2VV",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-12-01",
        first_visit_date: "2025-12-08",
        lat: CHURCH_LAT + 0.015,
        lng: CHURCH_LNG + 0.028,
        birthday: "2000-01-30",
        testScenario: "DEC contact - young adult, 3+ visits"
    },
    {
        first_name: "Kofi",
        last_name: "Darko",
        email: "kofi.darko@email.com",
        phone: "+44 7700 100129",
        address: "56 Cypress Road, Luton, LU4 7CD",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-12-05",
        first_visit_date: "2025-12-08",
        lat: CHURCH_LAT + 0.02,
        lng: CHURCH_LNG - 0.015,
        birthday: "1988-03-18",
        testScenario: "DEC contact - Christmas visitor, stayed"
    },
    {
        first_name: "Ama",
        last_name: "Bonsu",
        email: "ama.bonsu@email.com",
        phone: "+44 7700 100130",
        address: "89 Linden Avenue, Luton, LU1 8DE",
        member_status: "guest",
        activity_status: "irregular",
        contact_category: "big_events_only",
        contact_date: "2025-12-10",
        first_visit_date: "2025-12-25",
        lat: CHURCH_LAT - 0.022,
        lng: CHURCH_LNG + 0.02,
        birthday: "1984-12-25",
        testScenario: "DEC contact - Christmas only"
    },
    {
        first_name: "Kwame",
        last_name: "Asante",
        email: "kwame.asante@email.com",
        phone: "+44 7700 100016",
        address: "101 Marsh Road, Luton, LU3 6PP",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-12-20",
        first_visit_date: "2025-12-29",
        lat: CHURCH_LAT + 0.028,
        lng: CHURCH_LNG - 0.008,
        birthday: "1996-07-15",
        testScenario: "DEC contact - first timer, responsive"
    },
    {
        first_name: "Adjoa",
        last_name: "Opoku",
        email: "adjoa.opoku@email.com",
        phone: "+44 7700 100131",
        address: "34 Walnut Street, Luton, LU2 9EF",
        member_status: "guest",
        activity_status: "regular",
        contact_category: "responsive",
        contact_date: "2025-12-15",
        first_visit_date: "2025-12-22",
        lat: CHURCH_LAT - 0.01,
        lng: CHURCH_LNG - 0.022,
        birthday: "1993-07-05",
        testScenario: "DEC contact - engaged, promising"
    },
    {
        first_name: "Yaw",
        last_name: "Kusi",
        email: "yaw.kusi@email.com",
        phone: "+44 7700 100132",
        address: "67 Hawthorn Lane, Luton, LU3 0FG",
        member_status: "guest",
        activity_status: "dormant",
        contact_category: "non_responsive",
        contact_date: "2025-12-28",
        lat: CHURCH_LAT + 0.025,
        lng: CHURCH_LNG + 0.018,
        birthday: "1985-10-02",
        testScenario: "DEC late contact - no response yet"
    },

    // === SCALED DATA: 50 ADDED MEMBERS ===
    {
        first_name: "Emmanuel", last_name: "Osei", email: "emmanuel.osei@email.com", phone: "+44 7700 200001",
        address: "101 Dunstable Road, Luton", member_status: "member", activity_status: "regular",
        lat: CHURCH_LAT + 0.01, lng: CHURCH_LNG + 0.01, birthday: "1980-01-15",
        testScenario: "Regular member, average engagement",
        engagementProfile: { serviceAttendance: 0.8, prayerMeetings: 0.2, cellGroups: 0.7, tithing: 0.5 }
    },
    {
        first_name: "Patricia", last_name: "Darko", email: "patricia.darko@email.com", phone: "+44 7700 200002",
        address: "102 Biscot Road, Luton", member_status: "member", activity_status: "regular",
        lat: CHURCH_LAT - 0.01, lng: CHURCH_LNG - 0.01, birthday: "1985-02-20",
        testScenario: "Prayer warrior",
        engagementProfile: { serviceAttendance: 0.9, prayerMeetings: 0.9, cellGroups: 0.8, tithing: 0.8 }
    },
    {
        first_name: "Solomon", last_name: "Appiah", email: "solomon.appiah@email.com", phone: "+44 7700 200003",
        address: "103 Leagrave Road, Luton", member_status: "member", activity_status: "irregular",
        lat: CHURCH_LAT + 0.02, lng: CHURCH_LNG - 0.02, birthday: "1990-03-25",
        testScenario: "Irregular attendee",
        engagementProfile: { serviceAttendance: 0.4, prayerMeetings: 0.1, cellGroups: 0.2, tithing: 0.1 }
    },
    {
        first_name: "Rita", last_name: "Mensah", email: "rita.mensah@email.com", phone: "+44 7700 200004",
        address: "104 Marsh Road, Luton", member_status: "member", activity_status: "regular",
        lat: CHURCH_LAT - 0.02, lng: CHURCH_LNG + 0.02, birthday: "1975-04-10",
        testScenario: "Cell group leader potential",
        engagementProfile: { serviceAttendance: 0.95, prayerMeetings: 0.4, cellGroups: 0.95, tithing: 0.7 }
    },
    {
        first_name: "Joseph", last_name: "Antwi", email: "joseph.antwi@email.com", phone: "+44 7700 200005",
        address: "105 Montrose Avenue, Luton", member_status: "member", activity_status: "dormant",
        lat: CHURCH_LAT + 0.03, lng: CHURCH_LNG + 0.03, birthday: "1995-05-05",
        testScenario: "Drifting away",
        engagementProfile: { serviceAttendance: 0.1, prayerMeetings: 0.0, cellGroups: 0.1, tithing: 0.0 }
    },
    {
        first_name: "Esther", last_name: "Bonsu", email: "esther.bonsu@email.com", phone: "+44 7700 200006",
        address: "106 New Bedford Road, Luton", member_status: "member", activity_status: "regular",
        lat: CHURCH_LAT - 0.03, lng: CHURCH_LNG - 0.03, birthday: "1988-06-15",
        testScenario: "New convert, growing",
        engagementProfile: { serviceAttendance: 0.9, prayerMeetings: 0.5, cellGroups: 0.6, tithing: 0.3 }
    },
    {
        first_name: "Isaac", last_name: "Owusu", email: "isaac.owusu@email.com", phone: "+44 7700 200007",
        address: "107 Old Bedford Road, Luton", member_status: "member", activity_status: "regular",
        lat: CHURCH_LAT + 0.015, lng: CHURCH_LNG - 0.015, birthday: "1982-07-20",
        testScenario: "Consistent tither",
        engagementProfile: { serviceAttendance: 0.85, prayerMeetings: 0.2, cellGroups: 0.5, tithing: 1.0 }
    },
    {
        first_name: "Mary", last_name: "Boateng", email: "mary.boateng@email.com", phone: "+44 7700 200008",
        address: "108 Stockingstone Road, Luton", member_status: "member", activity_status: "regular",
        lat: CHURCH_LAT - 0.015, lng: CHURCH_LNG + 0.015, birthday: "1992-08-30",
        testScenario: "Youth mentor",
        engagementProfile: { serviceAttendance: 0.9, prayerMeetings: 0.6, cellGroups: 0.8, tithing: 0.5 }
    },
    {
        first_name: "Daniel", last_name: "Kyei", email: "daniel.kyei@email.com", phone: "+44 7700 200009",
        address: "109 Toddington Road, Luton", member_status: "member", activity_status: "regular",
        lat: CHURCH_LAT + 0.025, lng: CHURCH_LNG + 0.005, birthday: "1987-09-10",
        testScenario: "Tech team volunteer",
        engagementProfile: { serviceAttendance: 0.98, prayerMeetings: 0.1, cellGroups: 0.4, tithing: 0.6 }
    },
    {
        first_name: "Sarah", last_name: "Badu", email: "sarah.badu@email.com", phone: "+44 7700 200010",
        address: "110 Trinity Road, Luton", member_status: "member", activity_status: "regular",
        lat: CHURCH_LAT - 0.025, lng: CHURCH_LNG - 0.005, birthday: "1998-10-05",
        testScenario: "Choir member",
        engagementProfile: { serviceAttendance: 0.95, prayerMeetings: 0.7, cellGroups: 0.5, tithing: 0.4 }
    },
    // Adding 10 more...
    { first_name: "Paul", last_name: "Ansah", email: "paul.ansah@email.com", phone: "+44 7700 200011", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1990-01-01", engagementProfile: { serviceAttendance: 0.7, prayerMeetings: 0.3, cellGroups: 0.5, tithing: 0.5 } },
    { first_name: "Hannah", last_name: "Danso", email: "hannah.danso@email.com", phone: "+44 7700 200012", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1991-02-02", engagementProfile: { serviceAttendance: 0.8, prayerMeetings: 0.4, cellGroups: 0.6, tithing: 0.6 } },
    { first_name: "Peter", last_name: "Mensah", email: "peter.mensah2@email.com", phone: "+44 7700 200013", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1992-03-03", engagementProfile: { serviceAttendance: 0.9, prayerMeetings: 0.5, cellGroups: 0.7, tithing: 0.7 } },
    { first_name: "Grace", last_name: "Asare", email: "grace.asare2@email.com", phone: "+44 7700 200014", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1993-04-04", engagementProfile: { serviceAttendance: 0.6, prayerMeetings: 0.2, cellGroups: 0.4, tithing: 0.4 } },
    { first_name: "James", last_name: "Opoku", email: "james.opoku2@email.com", phone: "+44 7700 200015", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1994-05-05", engagementProfile: { serviceAttendance: 0.5, prayerMeetings: 0.1, cellGroups: 0.3, tithing: 0.3 } },
    { first_name: "Elizabeth", last_name: "Amoah", email: "elizabeth.amoah@email.com", phone: "+44 7700 200016", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1995-06-06", engagementProfile: { serviceAttendance: 0.9, prayerMeetings: 0.8, cellGroups: 0.9, tithing: 0.9 } },
    { first_name: "John", last_name: "Tetteh", email: "john.tetteh@email.com", phone: "+44 7700 200017", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1996-07-07", engagementProfile: { serviceAttendance: 0.75, prayerMeetings: 0.35, cellGroups: 0.55, tithing: 0.55 } },
    { first_name: "Victoria", last_name: "Kusi", email: "victoria.kusi2@email.com", phone: "+44 7700 200018", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1997-08-08", engagementProfile: { serviceAttendance: 0.85, prayerMeetings: 0.45, cellGroups: 0.65, tithing: 0.65 } },
    { first_name: "Stephen", last_name: "Owusu", email: "stephen.owusu@email.com", phone: "+44 7700 200019", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1998-09-09", engagementProfile: { serviceAttendance: 0.95, prayerMeetings: 0.65, cellGroups: 0.85, tithing: 0.85 } },
    { first_name: "Joyce", last_name: "Appiah", email: "joyce.appiah@email.com", phone: "+44 7700 200020", address: "Luton", member_status: "member", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1999-10-10", engagementProfile: { serviceAttendance: 0.65, prayerMeetings: 0.25, cellGroups: 0.45, tithing: 0.45 } },
    // And 10 guests/prospects
    { first_name: "Frank", last_name: "Adom", email: "frank.adom@email.com", phone: "+44 7700 200021", address: "Luton", member_status: "guest", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "2000-01-01", contact_date: "2025-10-01", engagementProfile: { serviceAttendance: 0.5, prayerMeetings: 0.0, cellGroups: 0.0, tithing: 0.0 } },
    { first_name: "Alice", last_name: "Boadi", email: "alice.boadi@email.com", phone: "+44 7700 200022", address: "Luton", member_status: "guest", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "2001-02-02", contact_date: "2025-10-15", engagementProfile: { serviceAttendance: 0.6, prayerMeetings: 0.0, cellGroups: 0.2, tithing: 0.0 } },
    { first_name: "George", last_name: "Cudjoe", email: "george.cudjoe@email.com", phone: "+44 7700 200023", address: "Luton", member_status: "guest", activity_status: "irregular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "2002-03-03", contact_date: "2025-11-01", engagementProfile: { serviceAttendance: 0.3, prayerMeetings: 0.0, cellGroups: 0.0, tithing: 0.0 } },
    { first_name: "Beatrice", last_name: "Donkor", email: "beatrice.donkor@email.com", phone: "+44 7700 200024", address: "Luton", member_status: "guest", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "2003-04-04", contact_date: "2025-11-15", engagementProfile: { serviceAttendance: 0.7, prayerMeetings: 0.1, cellGroups: 0.1, tithing: 0.0 } },
    { first_name: "Charles", last_name: "Eshun", email: "charles.eshun@email.com", phone: "+44 7700 200025", address: "Luton", member_status: "guest", activity_status: "dormant", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "2004-05-05", contact_date: "2025-12-01", engagementProfile: { serviceAttendance: 0.0, prayerMeetings: 0.0, cellGroups: 0.0, tithing: 0.0 } },
    { first_name: "Doris", last_name: "Fosu", email: "doris.fosu@email.com", phone: "+44 7700 200026", address: "Luton", member_status: "guest", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "2005-06-06", contact_date: "2025-12-15", engagementProfile: { serviceAttendance: 0.8, prayerMeetings: 0.2, cellGroups: 0.3, tithing: 0.0 } },
    { first_name: "Edward", last_name: "Gyamfi", email: "edward.gyamfi@email.com", phone: "+44 7700 200027", address: "Luton", member_status: "guest", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1990-07-07", contact_date: "2025-09-01", engagementProfile: { serviceAttendance: 0.55, prayerMeetings: 0.0, cellGroups: 0.0, tithing: 0.0 } },
    { first_name: "Felicity", last_name: "Hagan", email: "felicity.hagan@email.com", phone: "+44 7700 200028", address: "Luton", member_status: "guest", activity_status: "irregular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1991-08-08", contact_date: "2025-08-01", engagementProfile: { serviceAttendance: 0.2, prayerMeetings: 0.0, cellGroups: 0.0, tithing: 0.0 } },
    { first_name: "Gideon", last_name: "Inkoom", email: "gideon.inkoom@email.com", phone: "+44 7700 200029", address: "Luton", member_status: "guest", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1992-09-09", contact_date: "2025-07-01", engagementProfile: { serviceAttendance: 0.65, prayerMeetings: 0.1, cellGroups: 0.1, tithing: 0.0 } },
    { first_name: "Harriet", last_name: "Jonah", email: "harriet.jonah@email.com", phone: "+44 7700 200030", address: "Luton", member_status: "guest", activity_status: "regular", lat: CHURCH_LAT, lng: CHURCH_LNG, birthday: "1993-10-10", contact_date: "2025-06-01", engagementProfile: { serviceAttendance: 0.75, prayerMeetings: 0.2, cellGroups: 0.2, tithing: 0.0 } },

    // === ARCHIVED (2) ===
    {
        first_name: "Joseph",
        last_name: "Mensah",
        email: "joseph.mensah@email.com",
        phone: "+44 7700 100024",
        address: "Previously: 44 Farley Hill, Luton",
        member_status: "archived",
        role: "no_role",
        activity_status: "dormant",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2022-06-15",
        membership_date: "2022-10-01",
        lat: CHURCH_LAT + 0.035,
        lng: CHURCH_LNG - 0.035,
        birthday: "1983-05-10",
        testScenario: "FORMER MEMBER: Moved to Manchester"
    },
    {
        first_name: "Agnes",
        last_name: "Ampong",
        email: "agnes.ampong@email.com",
        phone: "+44 7700 100025",
        address: "Previously: 22 Icknield Way, Luton",
        member_status: "archived",
        role: "no_role",
        activity_status: "dormant",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2021-03-20",
        membership_date: "2021-07-15",
        lat: CHURCH_LAT - 0.035,
        lng: CHURCH_LNG + 0.04,
        birthday: "1976-11-28",
        testScenario: "FORMER MEMBER: Returned to Ghana"
    },

    // === ADDITIONAL MEMBERS FOR VOLUME (5 more) ===
    {
        first_name: "Benjamin",
        last_name: "Kusi",
        email: "benjamin.kusi@email.com",
        phone: "+44 7700 100026",
        address: "95 Vauxhall Way, Luton, LU2 8XX",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2023-09-05",
        membership_date: "2024-01-10",
        lat: CHURCH_LAT + 0.038,
        lng: CHURCH_LNG + 0.018,
        birthday: "1990-04-15",
        testScenario: "Standard regular member",
        engagementProfile: { serviceAttendance: 0.82, prayerMeetings: 0.50, cellGroups: 0.60, tithing: 0.75 }
    },
    {
        first_name: "Felicia",
        last_name: "Owusu",
        email: "felicia.owusu@email.com",
        phone: "+44 7700 100027",
        address: "31 People's Park, Luton, LU1 9YY",
        member_status: "member",
        role: "no_role",
        activity_status: "irregular",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2024-04-12",
        membership_date: "2024-08-20",
        lat: CHURCH_LAT - 0.04,
        lng: CHURCH_LNG - 0.008,
        birthday: "1998-07-22",
        testScenario: "Irregular - shift worker",
        engagementProfile: { serviceAttendance: 0.45, prayerMeetings: 0.12, cellGroups: 0.20, tithing: 0.30 }
    },
    {
        first_name: "Charles",
        last_name: "Antwi",
        email: "charles.antwi@email.com",
        phone: "+44 7700 100028",
        address: "58 Warden Hill, Luton, LU2 1ZZ",
        member_status: "member",
        role: "basonta_worker",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2022-08-30",
        membership_date: "2023-01-15",
        lat: CHURCH_LAT + 0.042,
        lng: CHURCH_LNG - 0.022,
        birthday: "1979-12-03",
        testScenario: "Experienced worker, helps with new members",
        engagementProfile: { serviceAttendance: 0.88, prayerMeetings: 0.60, cellGroups: 0.85, tithing: 0.80 }
    },
    {
        first_name: "Victoria",
        last_name: "Yeboah",
        email: "victoria.yeboah@email.com",
        phone: "+44 7700 100029",
        address: "73 Kingsway, Luton, LU4 8AB",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2024-06-18",
        membership_date: "2024-10-05",
        lat: CHURCH_LAT - 0.038,
        lng: CHURCH_LNG + 0.032,
        birthday: "1987-03-14",
        testScenario: "Recent member, very enthusiastic",
        engagementProfile: { serviceAttendance: 0.95, prayerMeetings: 0.80, cellGroups: 0.70, tithing: 0.65 }
    },
    {
        first_name: "Anthony",
        last_name: "Baffour",
        email: "anthony.baffour@email.com",
        phone: "+44 7700 100030",
        address: "11 Chapel Street, Luton, LU1 5CD",
        member_status: "member",
        role: "no_role",
        activity_status: "dormant",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2023-02-28",
        membership_date: "2023-06-15",
        lat: CHURCH_LAT + 0.028,
        lng: CHURCH_LNG + 0.038,
        birthday: "1982-08-09",
        testScenario: "DORMANT: Health issues, needs pastoral care",
        engagementProfile: { serviceAttendance: 0.08, prayerMeetings: 0.03, cellGroups: 0.05, tithing: 0.10 }
    }
];

// --- SERMON TOPICS ---
const SERMON_TOPICS = [
    "The Power of Faith",
    "Walking in Love",
    "Grace for Every Season",
    "Building Strong Foundations",
    "The Heart of Worship",
    "Living in Victory",
    "Trusting God's Plan",
    "The Joy of Giving",
    "Overcoming Obstacles",
    "Family Blessings",
    "Prayer That Moves Mountains",
    "The Good Shepherd",
    "New Beginnings",
    "Faithful in Little Things",
    "The Armor of God"
];

const SERMON_SPEAKERS = ["Rev. Samuel Owusu", "Pastor Grace Mensah", "Elder David Boateng", "Guest Speaker"];

const MEETING_TYPES = ["bacenta", "flow_prayer", "farley_prayer", "all_night_prayer", "basonta", "sat"];
const VISITATION_OUTCOMES = ["welcomed_encouraged", "prayer_request_received", "not_home", "concerns_shared", "invited_to_service"];

// --- MAIN SEED MUTATION ---
export const seed = mutation({
    args: {
        clearFirst: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // 🚨 SAFETY CHECK: Prevent seeding production database
        // This checks if we're running against a production deployment
        const deploymentUrl = process.env.CONVEX_CLOUD_URL || '';
        if (deploymentUrl.includes('prod') || deploymentUrl.includes('production')) {
            throw new Error(
                '🚨 SAFETY BLOCK: Cannot seed production database! ' +
                'This script is only for development/test environments.'
            );
        }
        log('✅ Safety check passed - running in development environment');

        const shouldClear = args.clearFirst ?? true;
        const now = new Date();
        const oneYearAgo = subDays(now, 365);

        // 1. CLEAR EXISTING DATA
        if (shouldClear) {
            log("Clearing existing data...");
            const tables = ["people", "services", "attendance", "meetings", "meeting_attendance", "visitations", "activities"];
            for (const table of tables) {
                const records = await ctx.db.query(table as any).collect();
                for (const r of records) await ctx.db.delete(r._id);
            }
            log("Cleared all tables.");
        }

        // 2. INSERT NAMED PEOPLE
        log("Creating named test people...");
        const peopleIdMap: Map<string, any> = new Map(); // name -> id

        for (const person of NAMED_PEOPLE) {
            const personData = {
                first_name: person.first_name,
                last_name: person.last_name,
                email: person.email,
                phone: person.phone,
                address: person.address,
                birthday: person.birthday,
                member_status: person.member_status,
                role: person.role || "no_role",
                activity_status: person.activity_status,
                is_baptised: person.is_baptised ?? false,
                is_tither: person.is_tither ?? false,
                contact_category: person.contact_category,
                contact_date: person.contact_date,
                first_visit_date: person.first_visit_date,
                membership_date: person.membership_date,
                lat: person.lat,
                lng: person.lng,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
            };

            const id = await ctx.db.insert("people", personData);
            // Use phone as unique key to handle duplicate names (more common than email for church contacts)
            peopleIdMap.set(person.phone, id);
        }
        log(`Created ${NAMED_PEOPLE.length} people.`);

        // Create a name-to-phone lookup for convenience (first match wins)
        const nameToPhone: Map<string, string> = new Map();
        for (const person of NAMED_PEOPLE) {
            const fullName = `${person.first_name} ${person.last_name}`;
            if (!nameToPhone.has(fullName)) {
                nameToPhone.set(fullName, person.phone);
            }
        }
        // Helper to get ID by name (uses phone lookup)
        const getIdByName = (name: string) => {
            const phone = nameToPhone.get(name);
            return phone ? peopleIdMap.get(phone) : undefined;
        };

        const allPeopleIds = Array.from(peopleIdMap.values());
        const leaderIds = NAMED_PEOPLE.filter(p => p.member_status === "leader").map(p => peopleIdMap.get(p.phone));
        const memberIds = NAMED_PEOPLE.filter(p => p.member_status === "member" || p.member_status === "leader").map(p => peopleIdMap.get(p.phone));
        const guestIds = NAMED_PEOPLE.filter(p => p.member_status === "guest").map(p => peopleIdMap.get(p.phone));

        // 3. LINK INVITERS FOR GUESTS - comprehensive linkages
        log("Linking inviters to guests...");
        const inviterPairs = [
            // January contacts
            ["Afia Mensah", "Samuel Owusu"],
            ["Kojo Owusu", "David Boateng"],
            // February contacts
            ["Adwoa Boateng", "Grace Mensah"],
            ["Yaw Appiah", "Kwesi Bonsu"],
            ["Akua Darko", "Sarah Johnson"],
            // March contacts
            ["Kwabena Antwi", "Peter Tetteh"],
            ["Yaa Asare", "Rebecca Asare"],
            ["Kofi Tetteh", "James Okonkwo"],
            // April contacts
            ["Ama Ofori", "Priscilla Danso"],
            ["Kweku Mensah", "Esther Frimpong"],
            ["Efua Osei", "Benjamin Kusi"],
            ["Kobina Gyamfi", "Charles Antwi"],
            // May contacts
            ["Adjoa Bonsu", "Victoria Yeboah"],
            ["Kwame Frimpong", "Samuel Owusu"],
            ["Abena Adjei", "Grace Mensah"],
            // June contacts
            ["Yaw Amponsah", "David Boateng"],
            ["Akosua Danso", "Sarah Johnson"],
            ["Kofi Opoku", "Mercy Opoku"],
            // July contacts
            ["Ama Asante", "Priscilla Danso"],
            ["Kwabena Kusi", "Peter Tetteh"],
            // August contacts
            ["Yaa Owusu", "Rebecca Asare"],
            ["Kofi Amponsah", "Peter Tetteh"],
            ["Adwoa Mensah", "Esther Frimpong"],
            // September contacts
            ["Yaw Mensah", "David Boateng"],
            ["Akua Boateng", "Grace Mensah"],
            ["Kweku Tetteh", "Samuel Owusu"],
            // October contacts
            ["Abena Osei", "Esther Frimpong"],
            ["Ama Gyamfi", "Sarah Johnson"],
            ["Kobina Frimpong", "Charles Antwi"],
            ["Adjoa Asare", "Victoria Yeboah"],
            // November contacts
            ["Akosua Frimpong", "Grace Mensah"],
            ["Efua Mensah", "Rebecca Asare"],
            ["Kwame Ofori", "Benjamin Kusi"],
            ["Yaa Antwi", "Priscilla Danso"],
            // December contacts
            ["Nana Amoako", "Priscilla Danso"],
            ["Kofi Darko", "Samuel Owusu"],
            ["Ama Bonsu", "Grace Mensah"],
            ["Kwame Asante", "Samuel Owusu"],
            ["Adjoa Opoku", "Sarah Johnson"],
            ["Yaw Kusi", "David Boateng"],
            // === NEW GUEST LINKS ===
            ["Frank Adom", "Emmanuel Osei"],
            ["Alice Boadi", "Patricia Darko"],
            ["George Cudjoe", "Rita Mensah"],
            ["Beatrice Donkor", "Esther Bonsu"],
            ["Charles Eshun", "Isaac Owusu"],
            ["Doris Fosu", "Mary Boateng"],
            ["Edward Gyamfi", "Daniel Kyei"],
            ["Felicity Hagan", "Sarah Badu"],
            ["Gideon Inkoom", "Paul Ansah"],
            ["Harriet Jonah", "Hannah Danso"],
        ];

        let linkedCount = 0;
        for (const [guestName, inviterName] of inviterPairs) {
            const guestId = getIdByName(guestName);
            const inviterId = getIdByName(inviterName);
            if (guestId && inviterId) {
                await ctx.db.patch(guestId, { invited_by_id: inviterId });
                linkedCount++;
            }
        }
        log(`Linked ${linkedCount} guests to inviters.`);

        // 4. GENERATE SUNDAY SERVICES (52 weeks)
        log("Generating Sunday services...");
        const serviceIds: any[] = [];

        let currentDate = new Date(oneYearAgo);
        // Align to Sunday
        while (currentDate.getDay() !== 0) {
            currentDate = addDays(currentDate, 1);
        }

        let weekNum = 0;
        while (currentDate <= now) {
            weekNum++;
            const dateStr = toDateStr(currentDate);
            const month = currentDate.getMonth();

            // Seasonal attendance adjustment
            let baseAttendance = 140;
            if (month === 11 || month === 0) baseAttendance += 25; // Christmas/NY
            if (month === 3) baseAttendance += 15; // Easter
            if (month === 7 || month === 8) baseAttendance -= 20; // Summer

            const totalAttendance = baseAttendance + randomInt(-10, 20);
            const guestsCount = randomInt(5, 15);
            const salvationDecisions = randomInt(0, 3);
            const tithersCount = Math.floor((totalAttendance - guestsCount) * 0.4);

            const serviceId = await ctx.db.insert("services", {
                service_date: dateStr,
                service_type: "sunday_service",
                service_time: "09:00",
                location: "Main Sanctuary",
                sermon_topic: SERMON_TOPICS[weekNum % SERMON_TOPICS.length],
                sermon_speaker: random(SERMON_SPEAKERS),
                total_attendance: totalAttendance,
                guests_count: guestsCount,
                salvation_decisions: salvationDecisions,
                tithers_count: tithersCount,
                created_at: currentDate.toISOString(),
            });
            serviceIds.push(serviceId);

            // Create attendance records for named people using engagement profiles
            for (const person of NAMED_PEOPLE) {
                if (person.member_status === "archived") continue;

                // Use engagement profile if available, otherwise fall back to activity status
                let attendanceProb = person.engagementProfile?.serviceAttendance ?? 0.85;

                // Override for dormant - they don't attend recent services
                if (person.activity_status === "dormant") {
                    if (currentDate > subDays(now, 60)) attendanceProb = 0;
                }

                // Guests only attended after their first visit
                if (person.first_visit_date && new Date(person.first_visit_date) > currentDate) {
                    continue;
                }

                if (randomBool(attendanceProb)) {
                    const personId = peopleIdMap.get(person.phone);
                    // Use engagement profile for tithing probability
                    const titheProb = person.engagementProfile?.tithing ?? (person.is_tither ? 0.8 : 0.1);
                    await ctx.db.insert("attendance", {
                        service_id: serviceId,
                        person_id: personId,
                        made_salvation_decision: randomBool(0.02),
                        gave_tithe: randomBool(titheProb),
                        first_timer: person.first_visit_date === dateStr,
                        created_at: currentDate.toISOString(),
                    });
                }
            }

            currentDate = addDays(currentDate, 7);
        }
        log(`Created ${serviceIds.length} Sunday services with attendance.`);

        // 5. GENERATE MEETINGS (various types)
        log("Generating meetings...");
        let meetingCount = 0;

        // Bacenta meetings (weekly Tuesday)
        currentDate = new Date(oneYearAgo);
        while (currentDate.getDay() !== 2) currentDate = addDays(currentDate, 1);
        while (currentDate <= now) {
            const mId = await ctx.db.insert("meetings", {
                meeting_date: toDateStr(currentDate),
                meeting_type: "bacenta",
                start_time: "19:00",
                end_time: "21:00",
                duration_minutes: 120,
                location: "Fellowship Hall",
                attendance_count: randomInt(15, 30),
                leaders_count: randomInt(3, 6),
                leader_id: leaderIds[0]?.toString(),
                notes: "Midweek fellowship and Bible study",
                created_at: currentDate.toISOString(),
            });
            meetingCount++;

            // Add meeting attendance using engagement profiles for cell groups
            for (const person of NAMED_PEOPLE) {
                if (person.member_status === "archived" || person.member_status === "guest") continue;
                const personId = peopleIdMap.get(person.phone);
                const cellProb = person.engagementProfile?.cellGroups ?? 0.6;
                if (randomBool(cellProb)) {
                    await ctx.db.insert("meeting_attendance", {
                        meeting_id: mId,
                        person_id: personId,
                        attended: true,
                        created_at: currentDate.toISOString(),
                    });
                }
            }

            currentDate = addDays(currentDate, 7);
        }

        // Flow Prayer (weekly Monday 6am)
        currentDate = new Date(oneYearAgo);
        while (currentDate.getDay() !== 1) currentDate = addDays(currentDate, 1);
        while (currentDate <= now) {
            const mId = await ctx.db.insert("meetings", {
                meeting_date: toDateStr(currentDate),
                meeting_type: "flow_prayer",
                start_time: "06:00",
                end_time: "07:00",
                duration_minutes: 60,
                location: "Online - YouTube",
                attendance_count: randomInt(20, 45),
                leaders_count: randomInt(5, 10),
                leader_id: leaderIds[1]?.toString(),
                notes: "Morning prayer session",
                created_at: currentDate.toISOString(),
            });
            meetingCount++;

            // Add prayer meeting attendance using engagement profiles
            for (const person of NAMED_PEOPLE) {
                if (person.member_status === "archived") continue;
                const personId = peopleIdMap.get(person.phone);
                const prayerProb = person.engagementProfile?.prayerMeetings ?? 0.3;
                if (randomBool(prayerProb)) {
                    await ctx.db.insert("meeting_attendance", {
                        meeting_id: mId,
                        person_id: personId,
                        attended: true,
                        created_at: currentDate.toISOString(),
                    });
                }
            }

            currentDate = addDays(currentDate, 7);
        }

        // All Night Prayer (monthly, last Friday)
        currentDate = new Date(oneYearAgo);
        while (currentDate <= now) {
            // Find last Friday of month
            const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            let lastFriday = nextMonth;
            while (lastFriday.getDay() !== 5) lastFriday = subDays(lastFriday, 1);

            if (lastFriday <= now && lastFriday >= oneYearAgo) {
                const mId = await ctx.db.insert("meetings", {
                    meeting_date: toDateStr(lastFriday),
                    meeting_type: "all_night_prayer",
                    start_time: "22:00",
                    end_time: "05:00",
                    duration_minutes: 420,
                    location: "Main Sanctuary",
                    attendance_count: randomInt(35, 60),
                    leaders_count: randomInt(8, 12),
                    leader_id: leaderIds[2]?.toString(),
                    notes: "Monthly all-night prayer vigil",
                    created_at: lastFriday.toISOString(),
                });
                meetingCount++;

                // Add all-night prayer attendance using engagement profiles
                for (const person of NAMED_PEOPLE) {
                    if (person.member_status === "archived") continue;
                    const personId = peopleIdMap.get(person.phone);
                    // All-night needs higher commitment - use prayer profile but slightly lower
                    const prayerProb = (person.engagementProfile?.prayerMeetings ?? 0.3) * 0.7;
                    if (randomBool(prayerProb)) {
                        await ctx.db.insert("meeting_attendance", {
                            meeting_id: mId,
                            person_id: personId,
                            attended: true,
                            created_at: lastFriday.toISOString(),
                        });
                    }
                }
            }

            // Move to next month
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }

        log(`Created ${meetingCount} meetings with attendance.`);

        // 6. GENERATE VISITATIONS - spread across all months
        log("Generating visitations...");
        const visitations = [
            // January 2025
            { visited: "Afia Mensah", visitor: "Samuel Owusu", date: "2025-01-15", outcome: "welcomed_encouraged", followUp: false, notes: "First-timer follow-up. Very welcoming." },
            { visited: "Kojo Owusu", visitor: "David Boateng", date: "2025-01-25", outcome: "not_home", followUp: true, followUpDate: "2025-02-02", notes: "Will try again next week." },
            // February 2025
            { visited: "Yaw Appiah", visitor: "Kwesi Bonsu", date: "2025-02-18", outcome: "welcomed_encouraged", followUp: false, notes: "Very positive. Interested in membership." },
            { visited: "Akua Darko", visitor: "Sarah Johnson", date: "2025-02-28", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-03-10", notes: "Work stress. Prayed together." },
            // March 2025
            { visited: "Kwabena Antwi", visitor: "Peter Tetteh", date: "2025-03-12", outcome: "welcomed_encouraged", followUp: false, notes: "Enthusiastic about church community." },
            { visited: "Yaa Asare", visitor: "Rebecca Asare", date: "2025-03-20", outcome: "concerns_shared", followUp: false, notes: "Already has church but appreciates connection." },
            { visited: "Kofi Tetteh", visitor: "James Okonkwo", date: "2025-03-30", outcome: "invited_to_service", followUp: true, followUpDate: "2025-04-06", notes: "Invited to Easter service." },
            // April 2025 (Easter)
            { visited: "Ama Ofori", visitor: "Priscilla Danso", date: "2025-04-10", outcome: "welcomed_encouraged", followUp: false, notes: "Easter visitor follow-up. Very positive." },
            { visited: "Kweku Mensah", visitor: "Esther Frimpong", date: "2025-04-15", outcome: "invited_to_service", followUp: false, notes: "Invited to special events." },
            { visited: "Efua Osei", visitor: "Benjamin Kusi", date: "2025-04-25", outcome: "welcomed_encouraged", followUp: false, notes: "Ready for membership class." },
            { visited: "Kobina Gyamfi", visitor: "Charles Antwi", date: "2025-04-28", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-05-05", notes: "Family challenges. Pastoral support needed." },
            // May 2025
            { visited: "Kwame Frimpong", visitor: "Samuel Owusu", date: "2025-05-15", outcome: "welcomed_encouraged", followUp: false, notes: "Connected with men's ministry." },
            { visited: "Abena Adjei", visitor: "Grace Mensah", date: "2025-05-22", outcome: "welcomed_encouraged", followUp: false, notes: "Prefers cell groups. Connected to bacenta." },
            { visited: "Adjoa Bonsu", visitor: "Victoria Yeboah", date: "2025-05-10", outcome: "not_home", followUp: true, followUpDate: "2025-05-18", notes: "Will reschedule." },
            // June 2025
            { visited: "Yaw Amponsah", visitor: "David Boateng", date: "2025-06-12", outcome: "welcomed_encouraged", followUp: false, notes: "Very committed. Regular attender now." },
            { visited: "Akosua Danso", visitor: "Sarah Johnson", date: "2025-06-20", outcome: "concerns_shared", followUp: false, notes: "Requested no further contact." },
            { visited: "Kofi Opoku", visitor: "Mercy Opoku", date: "2025-06-30", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-07-10", notes: "Health concerns in family." },
            // July 2025 (Summer)
            { visited: "Ama Asante", visitor: "Priscilla Danso", date: "2025-07-15", outcome: "welcomed_encouraged", followUp: false, notes: "Summer visitor. Stayed engaged." },
            { visited: "Kwabena Kusi", visitor: "Peter Tetteh", date: "2025-07-25", outcome: "not_home", followUp: true, followUpDate: "2025-08-01", notes: "Away on holiday." },
            // August 2025
            { visited: "Yaa Owusu", visitor: "Rebecca Asare", date: "2025-08-14", outcome: "welcomed_encouraged", followUp: false, notes: "Connected with women's fellowship." },
            { visited: "Anthony Baffour", visitor: "David Boateng", date: "2025-08-05", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-08-20", notes: "Health challenges. Prayed together." },
            { visited: "Adwoa Mensah", visitor: "Esther Frimpong", date: "2025-08-28", outcome: "welcomed_encouraged", followUp: false, notes: "Back to school season. Connected with parents group." },
            // September 2025
            { visited: "Comfort Adjei", visitor: "Samuel Owusu", date: "2025-09-15", outcome: "not_home", followUp: true, followUpDate: "2025-09-25", notes: "Will try again next week." },
            { visited: "Akua Boateng", visitor: "Grace Mensah", date: "2025-09-18", outcome: "welcomed_encouraged", followUp: false, notes: "Engaged attender. Good connection." },
            { visited: "Kweku Tetteh", visitor: "Samuel Owusu", date: "2025-09-25", outcome: "welcomed_encouraged", followUp: false, notes: "Young adult. Connected with youth ministry." },
            { visited: "Comfort Adjei", visitor: "Grace Mensah", date: "2025-09-28", outcome: "concerns_shared", followUp: true, followUpDate: "2025-10-10", notes: "Family issues. Needs pastoral support." },
            // October 2025
            { visited: "Felicia Owusu", visitor: "Esther Frimpong", date: "2025-10-10", outcome: "concerns_shared", followUp: false, notes: "Shift work challenges discussed." },
            { visited: "Kobina Frimpong", visitor: "Charles Antwi", date: "2025-10-18", outcome: "welcomed_encouraged", followUp: false, notes: "Sporadic attender. Encouraged consistency." },
            { visited: "Emmanuel Darko", visitor: "David Boateng", date: "2025-10-20", outcome: "concerns_shared", followUp: true, followUpDate: "2025-11-01", notes: "Work schedule conflicts. Discussed online options." },
            { visited: "Adjoa Asare", visitor: "Victoria Yeboah", date: "2025-10-30", outcome: "welcomed_encouraged", followUp: false, notes: "Engaged attender. Connected with small group." },
            // November 2025
            { visited: "Ama Gyamfi", visitor: "Sarah Johnson", date: "2025-11-05", outcome: "welcomed_encouraged", followUp: false, notes: "Enthusiastic about Alpha course." },
            { visited: "Akosua Frimpong", visitor: "Grace Mensah", date: "2025-11-15", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-11-25", notes: "Interested in joining women's fellowship." },
            { visited: "Daniel Adu", visitor: "James Okonkwo", date: "2025-11-22", outcome: "welcomed_encouraged", followUp: false, notes: "Young member check-in." },
            { visited: "Kwame Ofori", visitor: "Benjamin Kusi", date: "2025-11-28", outcome: "welcomed_encouraged", followUp: false, notes: "Family man. Connected with couples ministry." },
            { visited: "Efua Mensah", visitor: "Rebecca Asare", date: "2025-11-28", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-12-10", notes: "Job search support needed." },
            // December 2025 (Christmas)
            { visited: "Akosua Frimpong", visitor: "Grace Mensah", date: "2025-12-01", outcome: "invited_to_service", followUp: false, notes: "Follow-up visit. Ready for membership class." },
            { visited: "Michael Appiah", visitor: "Charles Antwi", date: "2025-12-05", outcome: "welcomed_encouraged", followUp: false, notes: "New member welcome visit. Very positive." },
            { visited: "Kofi Darko", visitor: "Samuel Owusu", date: "2025-12-10", outcome: "welcomed_encouraged", followUp: false, notes: "Christmas visitor. Strong interest." },
            { visited: "Nana Amoako", visitor: "Priscilla Danso", date: "2025-12-12", outcome: "welcomed_encouraged", followUp: false, notes: "Young adult, connected with youth group." },
            { visited: "Adjoa Opoku", visitor: "Sarah Johnson", date: "2025-12-20", outcome: "welcomed_encouraged", followUp: false, notes: "Christmas season visitor. Warm reception." },
            { visited: "Kofi Amponsah", visitor: "Peter Tetteh", date: "2025-12-26", outcome: "invited_to_service", followUp: true, followUpDate: "2026-01-05", notes: "Only comes for special events. Invited to New Year service." },
            { visited: "Kwame Asante", visitor: "Samuel Owusu", date: "2025-12-30", outcome: "welcomed_encouraged", followUp: false, notes: "First-timer follow-up. Very warm reception." },
        ];

        for (const v of visitations) {
            const visitedId = getIdByName(v.visited);
            const visitorId = getIdByName(v.visitor);
            if (visitedId && visitorId) {
                await ctx.db.insert("visitations", {
                    person_id: visitedId,
                    person_visited_name: v.visited,
                    visited_by_id: visitorId,
                    visited_by_name: v.visitor,
                    visit_date: v.date,
                    outcome: v.outcome,
                    follow_up_required: v.followUp,
                    follow_up_date: v.followUpDate,
                    notes: v.notes,
                    created_at: new Date(v.date).toISOString(),
                });
            }
        }
        log(`Created ${visitations.length} visitations.`);

        // 7. GENERATE ACTIVITIES
        log("Generating activities...");
        const activities = [
            { type: "evangelism", date: "2025-12-15", desc: "Community outreach at Luton Mall", participants: 12 },
            { type: "community_service", date: "2025-12-20", desc: "Food bank support", participants: 8 },
            { type: "youth_event", date: "2025-11-30", desc: "Youth games night", participants: 25 },
            { type: "training", date: "2025-11-15", desc: "Leadership development session", participants: 15 },
            { type: "evangelism", date: "2025-10-25", desc: "Door-to-door outreach", participants: 10 },
            { type: "social", date: "2025-10-10", desc: "Fellowship lunch after service", participants: 45 },
            { type: "prayer", date: "2025-09-20", desc: "Community prayer walk", participants: 20 },
            { type: "training", date: "2025-08-15", desc: "Evangelism training workshop", participants: 18 },
        ];

        for (const a of activities) {
            await ctx.db.insert("activities", {
                activity_type: a.type,
                activity_date: a.date,
                description: a.desc,
                participants_count: a.participants,
                notes: "Test activity data",
                created_at: new Date(a.date).toISOString(),
            });
        }
        log(`Created ${activities.length} activities.`);

        return `Seeding Complete! ${NAMED_PEOPLE.length} named people, 12 months of services/meetings, ${visitations.length} visitations generated.`;
    },
});
