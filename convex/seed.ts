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
        testScenario: "Senior pastor figure, prolific visitor, high attendance"
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
        testScenario: "Active female leader, leads women's ministry"
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
        testScenario: "Prayer meeting leader, high prayer hours"
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
        testScenario: "Regular tither, fully trained, active worker"
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
        testScenario: "NEW MEMBER - joined 30 days ago, not yet baptised"
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
        testScenario: "FULL JOURNEY: Contact→Guest→Member→Leader in 9 months"
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
        testScenario: "Long-term regular member"
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
        testScenario: "Young adult member, regular but not yet tithing"
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
        testScenario: "Active worker in evangelism team"
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
        testScenario: "IRREGULAR: Work schedule conflicts, attends ~50%"
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
        testScenario: "DORMANT: Last attended 60+ days ago, needs re-engagement"
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
        testScenario: "Solid member, regular attender"
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
        testScenario: "Active in women's fellowship"
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
        testScenario: "Young member, still establishing attendance pattern"
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
        testScenario: "Single mother, very committed"
    },

    // === GUESTS / FIRST TIMERS (8) ===
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
        testScenario: "FIRST TIMER: Visited 1 week ago, responsive"
    },
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
        testScenario: "4 VISITS: Should trigger membership promotion prompt"
    },
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
        testScenario: "NON-RESPONSIVE: Contacted but never visited"
    },
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
        testScenario: "HAS CHURCH: Do not actively pursue"
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
        testScenario: "ACTIVE FIRST TIMER: 4 visits, ready for membership"
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
        testScenario: "EVENTS ONLY: Only comes to special events (Christmas)"
    },
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
        testScenario: "Young adult first timer, 3 visits"
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
        testScenario: "Responsive guest, interested in Alpha course"
    },

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
        testScenario: "Standard regular member"
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
        testScenario: "Irregular - shift worker"
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
        testScenario: "Experienced worker, helps with new members"
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
        testScenario: "Recent member, very enthusiastic"
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
        testScenario: "DORMANT: Health issues, needs pastoral care"
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
            peopleIdMap.set(`${person.first_name} ${person.last_name}`, id);
        }
        log(`Created ${NAMED_PEOPLE.length} people.`);

        const allPeopleIds = Array.from(peopleIdMap.values());
        const leaderIds = NAMED_PEOPLE.filter(p => p.member_status === "leader").map(p => peopleIdMap.get(`${p.first_name} ${p.last_name}`));
        const memberIds = NAMED_PEOPLE.filter(p => p.member_status === "member" || p.member_status === "leader").map(p => peopleIdMap.get(`${p.first_name} ${p.last_name}`));
        const guestIds = NAMED_PEOPLE.filter(p => p.member_status === "guest").map(p => peopleIdMap.get(`${p.first_name} ${p.last_name}`));

        // 3. LINK INVITERS FOR GUESTS
        log("Linking inviters to guests...");
        const inviterPairs = [
            ["Kwame Asante", "Samuel Owusu"],
            ["Akosua Frimpong", "Grace Mensah"],
            ["Yaw Mensah", "David Boateng"],
            ["Ama Gyamfi", "Sarah Johnson"],
            ["Nana Amoako", "Priscilla Danso"],
            ["Efua Mensah", "Rebecca Asare"],
            ["Kofi Amponsah", "Peter Tetteh"],
            ["Abena Osei", "Esther Frimpong"],
        ];

        for (const [guestName, inviterName] of inviterPairs) {
            const guestId = peopleIdMap.get(guestName);
            const inviterId = peopleIdMap.get(inviterName);
            if (guestId && inviterId) {
                await ctx.db.patch(guestId, { invited_by_id: inviterId });
            }
        }

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

            // Create attendance records for named people (based on their activity status)
            for (const person of NAMED_PEOPLE) {
                if (person.member_status === "archived") continue;

                let attendanceProb = 0.85; // regular
                if (person.activity_status === "irregular") attendanceProb = 0.5;
                if (person.activity_status === "dormant") {
                    // Dormant people only attended early in the year
                    if (currentDate > subDays(now, 60)) attendanceProb = 0;
                    else attendanceProb = 0.6;
                }

                // Guests only attended after their first visit
                if (person.first_visit_date && new Date(person.first_visit_date) > currentDate) {
                    continue;
                }

                if (randomBool(attendanceProb)) {
                    const personId = peopleIdMap.get(`${person.first_name} ${person.last_name}`);
                    await ctx.db.insert("attendance", {
                        service_id: serviceId,
                        person_id: personId,
                        made_salvation_decision: randomBool(0.02),
                        gave_tithe: person.is_tither ? randomBool(0.8) : randomBool(0.1),
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

            // Add meeting attendance for some members
            for (const pId of memberIds.slice(0, 10)) {
                if (randomBool(0.6)) {
                    await ctx.db.insert("meeting_attendance", {
                        meeting_id: mId,
                        person_id: pId,
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

            // Leaders more likely to attend prayer
            for (const pId of leaderIds) {
                if (randomBool(0.9)) {
                    await ctx.db.insert("meeting_attendance", {
                        meeting_id: mId,
                        person_id: pId,
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

                // High leader attendance at all-night
                for (const pId of leaderIds) {
                    await ctx.db.insert("meeting_attendance", {
                        meeting_id: mId,
                        person_id: pId,
                        attended: true,
                        created_at: lastFriday.toISOString(),
                    });
                }
            }

            // Move to next month
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }

        log(`Created ${meetingCount} meetings with attendance.`);

        // 6. GENERATE VISITATIONS
        log("Generating visitations...");
        const visitations = [
            { visited: "Kwame Asante", visitor: "Samuel Owusu", date: "2025-12-30", outcome: "welcomed_encouraged", followUp: false, notes: "First-timer follow-up. Very warm reception." },
            { visited: "Akosua Frimpong", visitor: "Grace Mensah", date: "2025-11-15", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-11-25", notes: "Interested in joining women's fellowship." },
            { visited: "Ama Gyamfi", visitor: "Sarah Johnson", date: "2025-11-05", outcome: "welcomed_encouraged", followUp: false, notes: "Enthusiastic about Alpha course." },
            { visited: "Akosua Frimpong", visitor: "Grace Mensah", date: "2025-12-01", outcome: "invited_to_service", followUp: false, notes: "Follow-up visit. Ready for membership class." },
            { visited: "Nana Amoako", visitor: "Priscilla Danso", date: "2025-12-12", outcome: "welcomed_encouraged", followUp: false, notes: "Young adult, connected with youth group." },
            { visited: "Efua Mensah", visitor: "Rebecca Asare", date: "2025-11-28", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-12-10", notes: "Job search support needed." },
            { visited: "Emmanuel Darko", visitor: "David Boateng", date: "2025-10-20", outcome: "concerns_shared", followUp: true, followUpDate: "2025-11-01", notes: "Work schedule conflicts. Discussed online options." },
            { visited: "Comfort Adjei", visitor: "Samuel Owusu", date: "2025-09-15", outcome: "not_home", followUp: true, followUpDate: "2025-09-25", notes: "Will try again next week." },
            { visited: "Comfort Adjei", visitor: "Grace Mensah", date: "2025-09-28", outcome: "concerns_shared", followUp: true, followUpDate: "2025-10-10", notes: "Family issues. Needs pastoral support." },
            { visited: "Anthony Baffour", visitor: "David Boateng", date: "2025-08-05", outcome: "prayer_request_received", followUp: true, followUpDate: "2025-08-20", notes: "Health challenges. Prayed together." },
            { visited: "Michael Appiah", visitor: "Charles Antwi", date: "2025-12-05", outcome: "welcomed_encouraged", followUp: false, notes: "New member welcome visit. Very positive." },
            { visited: "Kofi Amponsah", visitor: "Peter Tetteh", date: "2025-12-26", outcome: "invited_to_service", followUp: true, followUpDate: "2026-01-05", notes: "Only comes for special events. Invited to New Year service." },
            { visited: "Daniel Adu", visitor: "James Okonkwo", date: "2025-11-22", outcome: "welcomed_encouraged", followUp: false, notes: "Young member check-in." },
            { visited: "Felicia Owusu", visitor: "Esther Frimpong", date: "2025-10-10", outcome: "concerns_shared", followUp: false, notes: "Shift work challenges discussed." },
        ];

        for (const v of visitations) {
            const visitedId = peopleIdMap.get(v.visited);
            const visitorId = peopleIdMap.get(v.visitor);
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
