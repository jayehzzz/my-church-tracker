/**
 * Comprehensive Dynamic Mock Data for Church Tracker
 * Automatically generated relative to current date so all filters
 * (This Month, This Quarter, This Year, Last 30 Days, Last 12 Months)
 * are always fully populated with rich, realistic data.
 */

import { addDemoTitheExamples } from "./demoTitheExamples.js";
import { addDemoOutreachExamples } from "./demoOutreachExamples.js";

// Church coordinates (Luton, UK)
export const churchLocation = {
    name: "St Margarets Social Club",
    address: "St Margarets Social Club, Luton, LU1 5JD",
    lat: 51.8887,
    lng: -0.4255
};

const CHURCH_LAT = 51.8787;
const CHURCH_LNG = -0.4200;

// Helper utilities for date generation
const now = new Date();
const toDateStr = (d) => d.toISOString().split("T")[0];
const subDays = (d, days) => {
    const res = new Date(d);
    res.setDate(res.getDate() - days);
    return res;
};
const addDays = (d, days) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
};
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ============================================
// PEOPLE - 30 Comprehensive Member Profiles
// ============================================
export const mockPeople = [
    // === LEADERS (5) ===
    {
        id: "1",
        first_name: "Samuel",
        last_name: "Owusu",
        email: "samuel.owusu@email.com",
        phone: "07700 100001",
        address: "15 Church Road, Luton, LU1 1AA",
        member_status: "leader",
        role: "bacenta_leader",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2020-03-15",
        membership_date: "2020-06-20",
        lat: CHURCH_LAT + 0.010,
        lng: CHURCH_LNG - 0.005,
        birthday: "1975-08-12",
        gender: "male",
        marital_status: "married",
        employment_status: "employed",
        basontas: ["worship", "choir"],
        created_at: "2020-06-20T10:00:00Z"
    },
    {
        id: "2",
        first_name: "Grace",
        last_name: "Mensah",
        email: "grace.mensah@email.com",
        phone: "07700 100002",
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
        gender: "female",
        marital_status: "married",
        employment_status: "employed",
        basontas: ["dancing_stars", "childrens"],
        created_at: "2021-04-15T10:00:00Z"
    },
    {
        id: "3",
        first_name: "David",
        last_name: "Boateng",
        email: "david.boateng@email.com",
        phone: "07700 100003",
        address: "42 Park Avenue, Luton, LU2 3CC",
        member_status: "leader",
        role: "basonta_leader",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2019-09-01",
        membership_date: "2019-12-15",
        lat: CHURCH_LAT - 0.008,
        lng: CHURCH_LNG + 0.012,
        birthday: "1988-11-30",
        gender: "male",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["media", "ushering"],
        created_at: "2019-12-15T10:00:00Z"
    },
    {
        id: "4",
        first_name: "Kwesi",
        last_name: "Bonsu",
        email: "kwesi.bonsu@email.com",
        phone: "07700 100006",
        address: "78 Dunstable Road, Luton, LU4 6FF",
        member_status: "leader",
        role: "bacenta_leader",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        contact_date: "2023-01-10",
        first_visit_date: "2023-02-05",
        membership_date: "2023-05-15",
        lat: CHURCH_LAT - 0.012,
        lng: CHURCH_LNG - 0.020,
        birthday: "1992-09-18",
        gender: "male",
        marital_status: "married",
        employment_status: "employed",
        basontas: ["ushering"],
        created_at: "2023-05-15T10:00:00Z"
    },
    {
        id: "5",
        first_name: "Ava",
        last_name: "Clark",
        email: "ava.clark@email.com",
        phone: "07700 900369",
        address: "Stockingstone Road, Luton, LU2 7NE",
        member_status: "leader",
        role: "bacenta_leader",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2022-03-12",
        membership_date: "2022-06-20",
        lat: CHURCH_LAT + 0.018,
        lng: CHURCH_LNG - 0.005,
        birthday: "1989-05-14",
        gender: "female",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["choir", "worship"],
        created_at: "2022-06-20T10:00:00Z"
    },

    // === REGULAR MEMBERS (15) ===
    {
        id: "6",
        first_name: "Sarah",
        last_name: "Johnson",
        email: "sarah.johnson@email.com",
        phone: "07700 100004",
        address: "55 Manor Road, Luton, LU3 4DD",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2022-02-20",
        membership_date: "2022-05-25",
        lat: CHURCH_LAT + 0.020,
        lng: CHURCH_LNG - 0.015,
        birthday: "1990-07-08",
        gender: "female",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["worship", "dancing_stars"],
        created_at: "2022-05-25T10:00:00Z"
    },
    {
        id: "7",
        first_name: "Michael",
        last_name: "Appiah",
        email: "michael.appiah@email.com",
        phone: "07700 100005",
        address: "12 The Crescent, Luton, LU1 5EE",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2024-10-15",
        membership_date: "2024-12-01",
        lat: CHURCH_LAT + 0.005,
        lng: CHURCH_LNG + 0.018,
        birthday: "1995-04-22",
        gender: "male",
        marital_status: "single",
        employment_status: "student",
        basontas: ["media"],
        created_at: "2024-12-01T10:00:00Z"
    },
    {
        id: "8",
        first_name: "Rebecca",
        last_name: "Asare",
        email: "rebecca.asare@email.com",
        phone: "07700 100007",
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
        gender: "female",
        marital_status: "married",
        employment_status: "employed",
        basontas: ["childrens"],
        created_at: "2023-09-20T10:00:00Z"
    },
    {
        id: "9",
        first_name: "James",
        last_name: "Okonkwo",
        email: "james.okonkwo@email.com",
        phone: "07700 100008",
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
        gender: "male",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["ushering"],
        created_at: "2024-07-10T10:00:00Z"
    },
    {
        id: "10",
        first_name: "Priscilla",
        last_name: "Danso",
        email: "priscilla.danso@email.com",
        phone: "07700 100009",
        address: "23 New Town Street, Luton, LU2 9II",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2022-11-20",
        membership_date: "2023-02-28",
        lat: CHURCH_LAT + 0.008,
        lng: CHURCH_LNG - 0.022,
        birthday: "1984-06-17",
        gender: "female",
        marital_status: "married",
        employment_status: "employed",
        basontas: ["ushering", "worship"],
        created_at: "2023-02-28T10:00:00Z"
    },
    {
        id: "11",
        first_name: "Peter",
        last_name: "Tetteh",
        email: "peter.tetteh@email.com",
        phone: "07700 100012",
        address: "45 Stockwood Crescent, Luton, LU1 2LL",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2023-01-15",
        membership_date: "2023-04-20",
        lat: CHURCH_LAT - 0.022,
        lng: CHURCH_LNG + 0.020,
        birthday: "1991-08-11",
        gender: "male",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["media"],
        created_at: "2023-04-20T10:00:00Z"
    },
    {
        id: "12",
        first_name: "Esther",
        last_name: "Frimpong",
        email: "esther.frimpong@email.com",
        phone: "07700 100013",
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
        gender: "female",
        marital_status: "married",
        employment_status: "employed",
        basontas: ["choir"],
        created_at: "2024-04-15T10:00:00Z"
    },
    {
        id: "13",
        first_name: "Mercy",
        last_name: "Opoku",
        email: "mercy.opoku@email.com",
        phone: "07700 100015",
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
        gender: "female",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["childrens"],
        created_at: "2024-06-01T10:00:00Z"
    },
    {
        id: "14",
        first_name: "Isaac",
        last_name: "Owusu",
        email: "isaac.owusu@email.com",
        phone: "07700 200007",
        address: "107 Old Bedford Road, Luton, LU2 7HN",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2023-08-10",
        membership_date: "2023-11-15",
        lat: CHURCH_LAT + 0.015,
        lng: CHURCH_LNG - 0.010,
        birthday: "1982-07-20",
        gender: "male",
        marital_status: "married",
        employment_status: "employed",
        basontas: ["ushering"],
        created_at: "2023-11-15T10:00:00Z"
    },
    {
        id: "15",
        first_name: "Victoria",
        last_name: "Yeboah",
        email: "victoria.yeboah@email.com",
        phone: "07700 100029",
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
        gender: "female",
        marital_status: "married",
        employment_status: "employed",
        basontas: ["worship"],
        created_at: "2024-10-05T10:00:00Z"
    },
    {
        id: "16",
        first_name: "Stephen",
        last_name: "Owusu",
        email: "stephen.owusu@email.com",
        phone: "07700 200019",
        address: "24 Crawley Green Road, Luton, LU2 0QX",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2024-05-12",
        membership_date: "2024-09-01",
        lat: CHURCH_LAT + 0.005,
        lng: CHURCH_LNG + 0.015,
        birthday: "1998-09-09",
        gender: "male",
        marital_status: "single",
        employment_status: "student",
        basontas: ["media"],
        created_at: "2024-09-01T10:00:00Z"
    },
    {
        id: "17",
        first_name: "John",
        last_name: "Tetteh",
        email: "john.tetteh@email.com",
        phone: "07700 200017",
        address: "88 Marsh Road, Luton, LU3 2NL",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2023-10-15",
        membership_date: "2024-02-20",
        lat: CHURCH_LAT + 0.022,
        lng: CHURCH_LNG - 0.018,
        birthday: "1996-07-07",
        gender: "male",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["worship", "choir"],
        created_at: "2024-02-20T10:00:00Z"
    },
    {
        id: "18",
        first_name: "Olivia",
        last_name: "Thomas",
        email: "olivia.thomas@email.com",
        phone: "07700 900753",
        address: "New Bedford Road, Luton, LU3 1LF",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2024-04-12",
        membership_date: "2024-07-08",
        lat: CHURCH_LAT + 0.014,
        lng: CHURCH_LNG + 0.005,
        birthday: "1993-01-18",
        gender: "female",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["ushering"],
        created_at: "2024-07-08T10:00:00Z"
    },
    {
        id: "19",
        first_name: "Daniel",
        last_name: "Robinson",
        email: "daniel.robinson@email.com",
        phone: "07700 900147",
        address: "Old Bedford Road, Luton, LU2 7HP",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2024-08-01",
        membership_date: "2024-11-05",
        lat: CHURCH_LAT + 0.008,
        lng: CHURCH_LNG + 0.010,
        birthday: "1995-10-12",
        gender: "male",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["media"],
        created_at: "2024-11-05T10:00:00Z"
    },
    {
        id: "20",
        first_name: "Mia",
        last_name: "Lewis",
        email: "mia.lewis@email.com",
        phone: "07700 900754",
        address: "Marsh Road, Luton, LU3 2NL",
        member_status: "member",
        role: "no_role",
        activity_status: "regular",
        is_baptised: true,
        is_tither: true,
        first_visit_date: "2024-09-15",
        membership_date: "2024-12-10",
        lat: CHURCH_LAT + 0.024,
        lng: CHURCH_LNG - 0.015,
        birthday: "1997-06-25",
        gender: "female",
        marital_status: "single",
        employment_status: "employed",
        basontas: ["dancing_stars"],
        created_at: "2024-12-10T10:00:00Z"
    },

    // === IRREGULAR & DORMANT (5) ===
    {
        id: "21",
        first_name: "Emmanuel",
        last_name: "Darko",
        email: "emmanuel.darko@email.com",
        phone: "07700 100010",
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
        gender: "male",
        marital_status: "married",
        employment_status: "employed",
        created_at: "2024-08-25T10:00:00Z"
    },
    {
        id: "22",
        first_name: "Comfort",
        last_name: "Adjei",
        email: "comfort.adjei@email.com",
        phone: "07700 100011",
        address: "89 Biscot Road, Luton, LU3 1KK",
        member_status: "member",
        role: "no_role",
        activity_status: "dormant",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2023-04-05",
        membership_date: "2023-08-10",
        lat: CHURCH_LAT + 0.030,
        lng: CHURCH_LNG + 0.015,
        birthday: "1980-01-28",
        gender: "female",
        marital_status: "married",
        employment_status: "employed",
        created_at: "2023-08-10T10:00:00Z"
    },
    {
        id: "23",
        first_name: "Daniel",
        last_name: "Adu",
        email: "daniel.adu@email.com",
        phone: "07700 100014",
        address: "72 Old Bedford Road, Luton, LU2 4NN",
        member_status: "member",
        role: "no_role",
        activity_status: "irregular",
        is_baptised: false,
        is_tither: false,
        first_visit_date: "2024-08-20",
        membership_date: "2024-11-30",
        lat: CHURCH_LAT - 0.010,
        lng: CHURCH_LNG - 0.018,
        birthday: "2001-03-07",
        gender: "male",
        marital_status: "single",
        employment_status: "student",
        created_at: "2024-11-30T10:00:00Z"
    },
    {
        id: "24",
        first_name: "Robert",
        last_name: "Martinez",
        email: "robert.m@example.com",
        phone: "07700 900369",
        address: "Farley Hill, Luton, LU1 5NR",
        member_status: "member",
        role: "no_role",
        activity_status: "irregular",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2024-06-15",
        membership_date: "2024-09-20",
        lat: CHURCH_LAT - 0.007,
        lng: CHURCH_LNG - 0.010,
        birthday: "1989-08-14",
        gender: "male",
        marital_status: "single",
        employment_status: "employed",
        created_at: "2024-09-20T10:00:00Z"
    },
    {
        id: "25",
        first_name: "William",
        last_name: "Rodriguez",
        email: "will.r@example.com",
        phone: "07700 900951",
        address: "Toddington Road, Luton, LU4 9DZ",
        member_status: "archived",
        role: "no_role",
        activity_status: "dormant",
        is_baptised: true,
        is_tither: false,
        first_visit_date: "2023-01-20",
        membership_date: "2023-05-10",
        lat: CHURCH_LAT + 0.026,
        lng: CHURCH_LNG - 0.035,
        birthday: "1982-12-05",
        gender: "male",
        marital_status: "married",
        employment_status: "retired",
        created_at: "2023-05-10T10:00:00Z"
    },

    // === VISITORS / GUESTS (5) ===
    {
        id: "26",
        first_name: "Sophia",
        last_name: "Garcia",
        email: "sophia.g@example.com",
        phone: "07700 900258",
        address: "Castle Street, Luton, LU1 3AJ",
        member_status: "guest",
        role: "no_role",
        activity_status: "dormant",
        is_baptised: false,
        is_tither: false,
        first_visit_date: toDateStr(subDays(now, 45)),
        lat: CHURCH_LAT + 0.002,
        lng: CHURCH_LNG + 0.003,
        birthday: "2000-04-18",
        gender: "female",
        marital_status: "single",
        employment_status: "student",
        created_at: subDays(now, 45).toISOString()
    },
    {
        id: "27",
        first_name: "Joseph",
        last_name: "Lee",
        email: "joseph.l@example.com",
        phone: "07700 900159",
        address: "Dunstable Road, Luton, LU4 8JS",
        member_status: "guest",
        role: "no_role",
        activity_status: "irregular",
        is_baptised: false,
        is_tither: false,
        first_visit_date: toDateStr(subDays(now, 14)),
        lat: CHURCH_LAT + 0.015,
        lng: CHURCH_LNG - 0.045,
        birthday: "1994-09-22",
        gender: "male",
        marital_status: "single",
        employment_status: "employed",
        created_at: subDays(now, 14).toISOString()
    },
    {
        id: "28",
        first_name: "Afia",
        last_name: "Mensah",
        email: "afia.mensah@email.com",
        phone: "07700 100101",
        address: "12 London Road, Luton, LU1 1AA",
        member_status: "guest",
        role: "no_role",
        activity_status: "regular",
        is_baptised: false,
        is_tither: false,
        first_visit_date: toDateStr(subDays(now, 21)),
        lat: CHURCH_LAT + 0.015,
        lng: CHURCH_LNG - 0.010,
        birthday: "1990-05-20",
        gender: "female",
        marital_status: "single",
        employment_status: "employed",
        created_at: subDays(now, 21).toISOString()
    },
    {
        id: "29",
        first_name: "Kofi",
        last_name: "Tetteh",
        email: "kofi.tetteh@email.com",
        phone: "07700 100108",
        address: "67 Oak Avenue, Luton, LU3 6HH",
        member_status: "guest",
        role: "no_role",
        activity_status: "irregular",
        is_baptised: false,
        is_tither: false,
        first_visit_date: toDateStr(subDays(now, 7)),
        lat: CHURCH_LAT - 0.015,
        lng: CHURCH_LNG - 0.008,
        birthday: "1993-12-05",
        gender: "male",
        marital_status: "single",
        employment_status: "employed",
        created_at: subDays(now, 7).toISOString()
    },
    {
        id: "30",
        first_name: "Ama",
        last_name: "Owusu",
        email: "ama.owusu@email.com",
        phone: "07800 200003",
        address: "78 Dunstable Road, Luton, LU4 6CD",
        member_status: "guest",
        role: "no_role",
        activity_status: "regular",
        is_baptised: false,
        is_tither: false,
        first_visit_date: toDateStr(subDays(now, 3)),
        lat: CHURCH_LAT - 0.010,
        lng: CHURCH_LNG - 0.020,
        birthday: "1996-03-12",
        gender: "female",
        marital_status: "single",
        employment_status: "employed",
        created_at: subDays(now, 3).toISOString()
    }
];

// ============================================
// SERVICES & ATTENDANCE - Generated Dynamically (Past 18 Months to Future)
// ============================================
const generateServicesData = () => {
    const services = [];
    const attendance = [];

    // Generate weekly services from 18 months ago up to 4 weeks in the future
    let currentDate = subDays(now, 18 * 30);
    const endDate = addDays(now, 28);

    let serviceIdCounter = 1;
    let attendanceIdCounter = 1;

    // Advance to Sunday
    while (currentDate.getDay() !== 0) {
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const sermonTopics = [
        "Walking in Kingdom Authority",
        "The Power of Persistent Prayer",
        "Harvest Season & Evangelism",
        "Faith that Moves Mountains",
        "Understanding Grace & Stewardship",
        "Building Strong Christian Families",
        "The Anointing for Ministry",
        "Overcoming Spiritual Battles",
        "Living as Salt and Light",
        "The Blessedness of Giving",
        "Revival and the Holy Spirit",
        "Discipleship and Multiplication"
    ];

    const speakers = [
        "Pastor Samuel Owusu",
        "Pastor Grace Mensah",
        "Pastor David Boateng",
        "Visiting Minister Rev. Emmanuel",
        "Pastor Kwesi Bonsu"
    ];

    while (currentDate <= endDate) {
        const dateStr = toDateStr(currentDate);
        const isSpecial = randomInt(1, 10) > 8;
        const month = currentDate.getMonth();

        let baseAttendance = 145;
        if (month === 11 || month === 0) baseAttendance += 35; // Christmas/New Year
        if (month === 3 || month === 4) baseAttendance += 25; // Easter
        if (month === 7 || month === 8) baseAttendance -= 15; // Summer

        const totalAttendance = baseAttendance + randomInt(-12, 20);
        const guestsCount = Math.floor(totalAttendance * (randomInt(6, 14) / 100));
        const salvationDecisions = Math.floor(guestsCount * (randomInt(15, 45) / 100));
        const tithersCount = Math.floor((totalAttendance - guestsCount) * 0.45);

        const serviceId = `s${serviceIdCounter++}`;

        // Select tracked individuals from mockPeople
        const attendees = mockPeople.filter(p => {
            if (p.activity_status === "regular") return Math.random() < 0.88;
            if (p.activity_status === "irregular") return Math.random() < 0.45;
            if (p.member_status === "guest") return Math.random() < 0.50;
            return Math.random() < 0.10;
        });

        const individualIds = attendees.map(p => p.id);

        services.push({
            id: serviceId,
            service_date: dateStr,
            service_type: isSpecial ? "special_service" : "sunday_service",
            service_time: "09:30",
            location: "Main Sanctuary",
            sermon_topic: isSpecial ? "Special Kingdom Celebration" : randomItem(sermonTopics),
            sermon_speaker: randomItem(speakers),
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

        individualIds.forEach(personId => {
            attendance.push({
                id: `a${attendanceIdCounter++}`,
                service_id: serviceId,
                person_id: personId,
                created_at: `${dateStr}T09:30:00Z`
            });
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    services.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));

    return { services, attendance };
};

const generatedData = generateServicesData();
addDemoTitheExamples(generatedData.services, generatedData.attendance);
export const mockServices = generatedData.services;
export const mockAttendance = generatedData.attendance;

// ============================================
// EVANGELISM CONTACTS & ACTIVITIES - Dynamic Timeline
// ============================================
const generateEvangelismData = () => {
    const contacts = [];
    const activities = [];

    let contactIdCounter = 1;
    let activityIdCounter = 1;

    let currentDate = subDays(now, 18 * 30);
    const endDate = now;

    const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Emmanuel", "Abigail", "Blessing", "Kofi", "Ama", "Kwame", "Akua"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Mensah", "Owusu", "Boateng", "Appiah", "Asare", "Tetteh", "Frimpong", "Opoku", "Yeboah", "Darko"];

    const inviters = mockPeople.filter(p => p.member_status === "leader" || p.activity_status === "regular");

    while (currentDate <= endDate) {
        const dateStr = toDateStr(currentDate);

        // Weekly/bi-weekly outreach activity
        if (randomInt(1, 10) > 4) {
            const types = ["evangelism", "community_service", "youth_event", "prayer", "training", "social"];
            const type = randomItem(types);
            let description = "Community outreach and witnessing";
            if (type === "community_service") description = "Food bank support and neighborhood aid";
            if (type === "youth_event") description = "Youth sports & gospel outreach";
            if (type === "prayer") description = "Town center evangelism & prayer walk";
            if (type === "training") description = "Soul-winning & follow-up workshop";
            if (type === "social") description = "Community BBQ & fellowship outreach";

            activities.push({
                id: `act${activityIdCounter++}`,
                activity_type: type,
                activity_date: dateStr,
                description: description,
                participants_count: randomInt(8, 45),
                notes: "Church outreach initiative",
                created_at: `${dateStr}T14:00:00Z`
            });
        }

        // 1-3 contacts every few days
        const newContacts = randomInt(1, 3);
        for (let i = 0; i < newContacts; i++) {
            const firstName = randomItem(firstNames);
            const lastName = randomItem(lastNames);
            const inviter = randomItem(inviters);
            const outcomes = ["responsive", "non_responsive", "events_only", "do_not_contact", "has_church"];
            const response = randomItem(outcomes);
            const isConverted = response === "responsive" && randomInt(1, 10) > 6;
            const followUpDate = response === "responsive" ? toDateStr(addDays(currentDate, 7)) : null;

            // Dynamic freshness calculation
            const daysSince = Math.floor((now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
            let freshness = "this_week";
            if (daysSince > 28) freshness = "month_plus";
            else if (daysSince > 14) freshness = "two_plus_weeks";
            else if (daysSince > 7) freshness = "last_week";

            // Stage and warmth simulation
            let stage = "new";
            let warmth = "hot";
            let followUpsCount = 0;
            let pMade = 0;
            let pKept = 0;

            if (isConverted) {
                stage = "showed_up";
                warmth = "hot";
                followUpsCount = randomInt(3, 6);
                pMade = randomInt(1, 2);
                pKept = pMade;
            } else if (response === "responsive") {
                stage = randomItem(["contacted", "promised", "showed_up", "no_show"]);
                warmth = freshness === "this_week" ? "hot" : freshness === "last_week" ? "warm" : "cool";
                followUpsCount = randomInt(1, 4);
                if (stage === "promised" || stage === "showed_up" || stage === "no_show") {
                    pMade = randomInt(1, 3);
                    pKept = stage === "showed_up" ? 1 : 0;
                }
            } else if (response === "do_not_contact") {
                stage = "cold";
                warmth = "dead";
                followUpsCount = 1;
            } else {
                stage = freshness === "this_week" ? "new" : "cold";
                warmth = freshness === "this_week" ? "warm" : "cold";
                followUpsCount = randomInt(0, 2);
            }

            contacts.push({
                id: `e${contactIdCounter++}`,
                first_name: firstName,
                last_name: lastName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
                phone: `07700 ${randomInt(100000, 999999)}`,
                address: `${randomInt(1, 120)} High Street, Luton, LU1`,
                contact_date: dateStr,
                response: response,
                follow_up_date: followUpDate,
                converted: isConverted,
                conversion_date: isConverted ? dateStr : null,
                status: isConverted ? "member" : "guest",
                attended_church: isConverted || (response === "responsive" && randomInt(1, 10) > 3),
                salvation_decision: isConverted,
                invited_by_id: inviter.id,
                comments: [`Contacted via ${randomItem(["street outreach", "friend invitation", "community event", "door-to-door"])}`],
                freshness,
                warmth_score: warmth,
                pipeline_stage: stage,
                total_follow_ups: followUpsCount,
                promises_made: pMade,
                promises_kept: pKept,
                created_at: `${dateStr}T10:00:00Z`
            });
        }

        currentDate = addDays(currentDate, randomInt(3, 6));
    }

    contacts.sort((a, b) => new Date(b.contact_date) - new Date(a.contact_date));
    activities.sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date));

    return { contacts, activities };
};

const generatedEvangelism = generateEvangelismData();
addDemoOutreachExamples(mockPeople, mockServices, mockAttendance, generatedEvangelism.contacts, now);
export const mockEvangelismContacts = generatedEvangelism.contacts;
export const mockActivities = generatedEvangelism.activities;

// ============================================
// MEETINGS - Bacenta, Prayer, and Ministry Gatherings
// ============================================
const generateMeetingsData = () => {
    const meetings = [];
    let idCounter = 1;
    let currentDate = subDays(now, 18 * 30);

    const leaders = mockPeople.filter(p => p.member_status === "leader");

    while (currentDate <= now) {
        const dateStr = toDateStr(currentDate);

        // 1. Bacenta Fellowship (Weekly)
        const bacentaLeader = randomItem(leaders);
        const bacentaAttendees = [bacentaLeader.id, ...mockPeople.slice(3, 14).map(p => p.id)];
        meetings.push({
            id: `m${idCounter++}`,
            meeting_date: dateStr,
            meeting_type: "bacenta",
            start_time: "18:30",
            end_time: "20:00",
            duration_minutes: 90,
            location: `${bacentaLeader.first_name}'s Residence, Luton`,
            leader_id: bacentaLeader.id,
            attendance_count: bacentaAttendees.length + randomInt(5, 15),
            leaders_count: randomInt(3, 6),
            topic: "Bacenta Fellowship: Building Faith in Community",
            attendees: bacentaAttendees,
            notes: "Great fellowship, prayer and word sharing.",
            created_at: `${dateStr}T18:30:00Z`
        });

        // 2. Flow Prayer (Early morning weekly)
        const flowDate = addDays(currentDate, 1);
        if (flowDate <= now) {
            const flowStr = toDateStr(flowDate);
            const flowAttendees = mockPeople.slice(0, 18).map(p => p.id);
            meetings.push({
                id: `m${idCounter++}`,
                meeting_date: flowStr,
                meeting_type: "flow_prayer",
                start_time: "06:00",
                end_time: "07:00",
                duration_minutes: 60,
                location: "Online / YouTube Live",
                leader_id: "1", // Samuel Owusu
                attendance_count: randomInt(60, 95),
                leaders_count: randomInt(8, 14),
                topic: "Early Morning Flow Prayer & Impartation",
                attendees: flowAttendees,
                notes: "High engagement and strong prayer atmosphere.",
                created_at: `${flowStr}T06:00:00Z`
            });
        }

        // 3. Acts Prayer (formerly Farley Morning Prayer)
        const farleyDate = addDays(currentDate, 3);
        if (farleyDate <= now) {
            const farleyStr = toDateStr(farleyDate);
            const farleyAttendees = mockPeople.slice(0, 12).map(p => p.id);
            meetings.push({
                id: `m${idCounter++}`,
                meeting_date: farleyStr,
                meeting_type: "acts_prayer",
                start_time: "06:00",
                end_time: "07:00",
                duration_minutes: 60,
                location: "Morning Prayer Meeting",
                leader_id: "3", // David Boateng
                attendance_count: randomInt(25, 45),
                leaders_count: randomInt(6, 10),
                topic: "Acts Prayer for Souls and Church Growth",
                attendees: farleyAttendees,
                notes: "Targeted intercession for outreach leads and evangelism.",
                created_at: `${farleyStr}T19:00:00Z`
            });
        }

        // 4. Shemen Prayer (Friday evening weekly)
        const basontaDate = addDays(currentDate, 5);
        if (basontaDate <= now) {
            const basontaStr = toDateStr(basontaDate);
            const basontaAttendees = mockPeople.slice(2, 16).map(p => p.id);
            meetings.push({
                id: `m${idCounter++}`,
                meeting_date: basontaStr,
                meeting_type: "shemen_prayer",
                start_time: "19:00",
                end_time: "21:00",
                duration_minutes: 120,
                location: "Main Sanctuary",
                leader_id: "2", // Grace Mensah
                attendance_count: randomInt(30, 55),
                leaders_count: randomInt(7, 12),
                topic: "Shemen Friday Prayer",
                attendees: basontaAttendees,
                notes: "Friday evening prayer and intercession.",
                created_at: `${basontaStr}T14:00:00Z`
            });
        }

        // 5. All Night Prayer (Monthly)
        if (currentDate.getDate() <= 7) {
            const allNightDate = addDays(currentDate, 4);
            if (allNightDate <= now) {
                const allNightStr = toDateStr(allNightDate);
                const allNightAttendees = mockPeople.slice(0, 22).map(p => p.id);
                meetings.push({
                    id: `m${idCounter++}`,
                    meeting_date: allNightStr,
                    meeting_type: "all_night_prayer",
                    start_time: "22:00",
                    end_time: "05:00",
                    duration_minutes: 420,
                    location: "Main Sanctuary",
                    leader_id: "1", // Samuel Owusu
                    attendance_count: randomInt(65, 110),
                    leaders_count: randomInt(12, 18),
                    topic: "Monthly Night of Wonders & Power",
                    attendees: allNightAttendees,
                    notes: "Full night of worship, warfare prayer, and prophetic declarations.",
                    created_at: `${allNightStr}T22:00:00Z`
                });
            }
        }

        // 6. Workers Meeting (Monthly as needed)
        if (currentDate.getDate() >= 14 && currentDate.getDate() <= 21) {
            const satDate = addDays(currentDate, 6);
            if (satDate <= now) {
                const satStr = toDateStr(satDate);
                const satAttendees = leaders.map(l => l.id);
                meetings.push({
                    id: `m${idCounter++}`,
                    meeting_date: satStr,
                    meeting_type: "workers_meeting",
                    start_time: "10:00",
                    end_time: "13:00",
                    duration_minutes: 180,
                    location: "Conference Room",
                    leader_id: "1", // Samuel Owusu
                    attendance_count: randomInt(15, 25),
                    leaders_count: randomInt(10, 16),
                    topic: "Workers Teaching and Church Planning",
                    attendees: satAttendees,
                    notes: "Equipping leaders for shepherd work and evangelism follow-up.",
                    created_at: `${satStr}T10:00:00Z`
                });
            }
        }

        currentDate = addDays(currentDate, 7);
    }

    meetings.sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date));
    return meetings;
};

export const mockMeetings = generateMeetingsData();

// ============================================
// VISITATIONS - Pastoral & Care Home Visits
// ============================================
const generateVisitationsData = () => {
    const visitations = [];
    let idCounter = 1;
    let currentDate = subDays(now, 18 * 30);

    const visitors = mockPeople.filter(p => p.member_status === "leader" || p.role?.includes("leader"));
    const membersToVisit = mockPeople.filter(p => p.member_status !== "leader");

    while (currentDate <= now) {
        const dateStr = toDateStr(currentDate);
        const person = randomItem(membersToVisit);
        const visitor = randomItem(visitors);
        const outcomes = [
            "welcomed_encouraged",
            "prayer_request_received",
            "concerns_shared",
            "invited_to_service",
            "follow_up_needed",
        ];
        const outcome = randomItem(outcomes);
        const needsFollowUp = outcome === "concerns_shared" || Math.random() < 0.25;

        visitations.push({
            id: `v${idCounter++}`,
            person_id: person.id,
            person_visited_name: `${person.first_name} ${person.last_name}`,
            visited_by_name: `${visitor.first_name} ${visitor.last_name}`,
            visited_by_id: visitor.id,
            visit_date: dateStr,
            status: outcome === "not_home" ? "unsuccessful" : "completed",
            interaction_type: randomItem(["home_visit", "home_visit", "phone_call", "church_meeting"]),
            purpose: person.member_status === "guest" ? "new_guest" : "general_care",
            outcome: outcome,
            follow_up_required: needsFollowUp,
            follow_up_date: needsFollowUp ? toDateStr(addDays(currentDate, 14)) : null,
            notes: `Home pastoral visit with ${person.first_name}. Outcome: ${outcome.replace(/_/g, " ")}.`,
            created_at: `${dateStr}T15:00:00Z`
        });

        currentDate = addDays(currentDate, randomInt(3, 7));
    }

    const demoCareHistory = [
        {
            id: "demo-care-history-1",
            personId: "26",
            leaderId: "1",
            interactionType: "home_visit",
            purpose: "attendance_concern",
            outcome: "welcomed_encouraged",
            followUpRequired: false,
            notes: "Checked in after two missed Sundays. Sophia was encouraged and plans to attend this weekend."
        },
        {
            id: "demo-care-history-2",
            personId: "28",
            leaderId: "2",
            interactionType: "phone_call",
            purpose: "prayer",
            outcome: "prayer_request_received",
            followUpRequired: true,
            followUpOffset: 2,
            notes: "Prayed together and recorded a request for continued support with a family situation."
        },
        {
            id: "demo-care-history-3",
            personId: "29",
            leaderId: "3",
            interactionType: "church_meeting",
            purpose: "new_guest",
            outcome: "invited_to_service",
            followUpRequired: false,
            notes: "Welcomed Kofi after the midweek gathering and introduced him to the young adults team."
        },
        {
            id: "demo-care-history-4",
            personId: "27",
            leaderId: "4",
            interactionType: "home_visit",
            purpose: "welfare",
            outcome: "concerns_shared",
            followUpRequired: true,
            followUpOffset: 3,
            notes: "Joseph shared a practical concern. The care team will check in again and coordinate support."
        },
        {
            id: "demo-care-history-5",
            personId: "30",
            leaderId: "5",
            interactionType: "message",
            purpose: "new_guest",
            outcome: "follow_up_needed",
            followUpRequired: true,
            followUpOffset: 1,
            notes: "Sent a welcome message with service details. Ama asked for a call before Sunday."
        }
    ];

    demoCareHistory.forEach((example, index) => {
        const person = mockPeople.find(p => String(p.id || p._id) === example.personId);
        const visitor = mockPeople.find(p => String(p.id || p._id) === example.leaderId);
        if (!person || !visitor) return;
        const dateStr = toDateStr(now);
        visitations.push({
            id: example.id,
            person_id: person.id || person._id,
            person_visited_name: `${person.first_name} ${person.last_name}`,
            visited_by_name: `${visitor.first_name} ${visitor.last_name}`,
            visited_by_id: visitor.id || visitor._id,
            visit_date: dateStr,
            status: "completed",
            interaction_type: example.interactionType,
            purpose: example.purpose,
            outcome: example.outcome,
            follow_up_required: example.followUpRequired,
            follow_up_date: example.followUpRequired
                ? toDateStr(addDays(now, example.followUpOffset || 1))
                : null,
            notes: example.notes,
            created_at: `${dateStr}T${String(9 + index).padStart(2, "0")}:00:00Z`
        });
    });

    visitations.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
    return visitations;
};

export const mockVisitations = generateVisitationsData();

// ============================================
// PRIORITY QUEUE - Guests Needing Follow-up
// ============================================
export const mockPriorityQueue = [
    { name: "Ama Owusu", phone: "07800 200003", lastAttended: toDateStr(subDays(now, 3)), daysSince: 3, personId: "30" },
    { name: "Kofi Tetteh", phone: "07700 100108", lastAttended: toDateStr(subDays(now, 7)), daysSince: 7, personId: "29" },
    { name: "Joseph Lee", phone: "07700 900159", lastAttended: toDateStr(subDays(now, 14)), daysSince: 14, personId: "27" },
    { name: "Afia Mensah", phone: "07700 100101", lastAttended: toDateStr(subDays(now, 21)), daysSince: 21, personId: "28" },
    { name: "Sophia Garcia", phone: "07700 900258", lastAttended: toDateStr(subDays(now, 45)), daysSince: 45, personId: "26" }
];

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getPersonById(id) {
    if (!id) return null;
    const targetId = String(id);
    const person = mockPeople.find(p => String(p.id || p._id) === targetId);
    if (person) return person;

    // Check evangelism contacts
    const contact = mockEvangelismContacts.find(c => String(c.id || c._id) === targetId);
    if (contact) {
        const inviter = contact.invited_by_id ? mockPeople.find(p => String(p.id || p._id) === String(contact.invited_by_id)) : null;
        return {
            id: contact.id || contact._id,
            _id: contact._id || contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name || "",
            email: contact.email || "",
            phone: contact.phone || "",
            address: contact.address || "",
            member_status: contact.member_status || contact.status || (contact.converted ? "member" : "guest"),
            role: contact.role || "no_role",
            activity_status: contact.activity_status || (contact.response === "responsive" ? "regular" : "irregular"),
            contact_category: contact.contact_category || contact.response,
            contact_date: contact.contact_date,
            first_visit_date: contact.contact_date,
            invited_by_id: contact.invited_by_id,
            invited_by: inviter ? `${inviter.first_name} ${inviter.last_name}` : null,
            salvation_decision: contact.salvation_decision || false,
            is_baptised: contact.converted || false,
            is_tither: false,
            notes: Array.isArray(contact.comments) ? contact.comments.join("\n") : (contact.notes || ""),
            birthday: contact.birthday || null,
            gender: contact.gender || null,
            marital_status: contact.marital_status || null,
            employment_status: contact.employment_status || null,
            lat: contact.lat || (CHURCH_LAT + 0.005),
            lng: contact.lng || (CHURCH_LNG + 0.005),
            created_at: contact.created_at || new Date().toISOString(),
            updated_at: contact.created_at || new Date().toISOString()
        };
    }

    return null;
}

export function getServiceById(id) {
    if (!id) return null;
    return mockServices.find(s => String(s.id || s._id) === String(id)) || null;
}

export function getAttendanceByPerson(personId) {
    if (!personId) return [];
    const targetId = String(personId);
    return mockAttendance
        .filter(a => String(a.person_id || a.personId) === targetId)
        .map(a => {
            const svc = mockServices.find(s => String(s.id || s._id) === String(a.service_id || a.serviceId));
            return {
                ...a,
                service_date: svc?.service_date || a.created_at?.split('T')[0] || "2024-01-01",
                service_type: svc?.service_type || a.service_type || "sunday_service",
                services: svc || {
                    service_date: a.created_at?.split('T')[0] || "2024-01-01",
                    service_type: a.service_type || "sunday_service",
                    service_time: "09:30",
                    sermon_topic: "Sunday Worship"
                }
            };
        });
}

export function getAttendanceByService(serviceId) {
    if (!serviceId) return [];
    const targetId = String(serviceId);
    return mockAttendance.filter(a => String(a.service_id || a.serviceId) === targetId);
}

export function getContactsByInviter(personId) {
    if (!personId) return [];
    const targetId = String(personId);
    return mockEvangelismContacts.filter(c => String(c.invited_by_id || c.invitedById) === targetId);
}

export function getVisitationsByPerson(personId) {
    if (!personId) return [];
    const targetId = String(personId);
    return mockVisitations.filter(v => String(v.person_id || v.personId) === targetId);
}

export function getMeetingsByLeader(personId) {
    if (!personId) return [];
    const targetId = String(personId);
    return mockMeetings.filter(m => String(m.leader_id || m.leaderId) === targetId);
}

export function getServiceIndividuals(service) {
    if (!service?.individuals || !Array.isArray(service.individuals)) return [];
    return service.individuals.map(id => getPersonById(id)).filter(Boolean);
}

export function getInviterProfile(contact) {
    if (!contact?.invited_by_id) return null;
    return getPersonById(contact.invited_by_id);
}

export function getMeetingLeader(meeting) {
    if (!meeting?.leader_id) return null;
    return getPersonById(meeting.leader_id);
}
