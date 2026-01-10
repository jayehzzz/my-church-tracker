import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * SEEDING SCRIPT
 * Run via: npx convex run seed:seed
 * 
 * Generates:
 * - People (Leaders, Members, Guests)
 * - Services (Sunday) & Meetings (Bacenta, Flow) for past 6 months
 * - Attendance records
 * - Visitations
 * - Evangelism Contacts
 */

const LOG = true;
const log = (msg: string) => { if (LOG) console.log(`[SEED] ${msg}`); };

// --- CONSTANTS ---

const FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Kwame", "Ama", "Kofi", "Abena", "Yaw", "Akosua"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Mensah", "Osei", "Appiah", "Boateng", "Owusu"];
const LOCATIONS = [
    { name: "Main Auditorium", lat: 5.6037, lng: -0.1870 },
    { name: "East Legon Branch", lat: 5.6356, lng: -0.1601 },
    { name: "Dansoman Center", lat: 5.5688, lng: -0.2670 },
    { name: "Spintex Hub", lat: 5.6267, lng: -0.1064 }
];
const OUTCOMES = ["welcomed_encouraged", "prayer_request_received", "not_home", "concerns_shared", "invited_to_service"];
const MEETING_TYPES = ["bacenta", "flow_prayer", "all_night_prayer", "basonta"];

// --- HELPERS ---

const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBool = (prob = 0.5) => Math.random() < prob;

const randomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const subDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d;
};

// --- GENERATORS ---

function generatePerson(role: "leader" | "member" | "guest" = "member") {
    const first = random(FIRST_NAMES);
    const last = random(LAST_NAMES);
    const loc = random(LOCATIONS);

    // Random offset for location to spread them out on the map
    const lat = loc.lat + (Math.random() - 0.5) * 0.05;
    const lng = loc.lng + (Math.random() - 0.5) * 0.05;

    let member_status = "member";
    if (role === 'guest') member_status = "guest";

    // Contact logic
    const isContact = role === 'guest';
    const contactCategory = isContact ? random(["responsive", "non_responsive", "events_only"]) : undefined;
    const contactDate = isContact ? new Date().toISOString() : undefined;

    return {
        first_name: first,
        last_name: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        phone: `+233${randomInt(20, 59)}${randomInt(1000000, 9999999)}`,
        address: `${randomInt(1, 100)} Random St, Accra`,
        member_status,
        role: role === 'leader' ? "bacenta_leader" : "no_role",
        activity_status: "regular",
        lat,
        lng,
        contact_category: contactCategory,
        contact_date: contactDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

// --- MAIN MUTATION ---

export const seed = mutation({
    args: {
        clearFirst: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // Default to TRUE for now to ensure clean slate during debugging
        const shouldClear = args.clearFirst ?? true;

        if (shouldClear) {
            log("Clearing existing data...");
            const people = await ctx.db.query("people").collect();
            for (const p of people) await ctx.db.delete(p._id);
            const services = await ctx.db.query("services").collect();
            for (const s of services) await ctx.db.delete(s._id);
            const meetings = await ctx.db.query("meetings").collect();
            for (const m of meetings) await ctx.db.delete(m._id);
            const attendance = await ctx.db.query("attendance").collect();
            for (const a of attendance) await ctx.db.delete(a._id);
            const visitations = await ctx.db.query("visitations").collect();
            for (const v of visitations) await ctx.db.delete(v._id);
            const meeting_attendance = await ctx.db.query("meeting_attendance").collect();
            for (const ma of meeting_attendance) await ctx.db.delete(ma._id);
            log("Use --clearFirst=false to append instead.");
        }

        // 1. GENERATE PEOPLE
        log("Generating People...");
        const peopleIds = [];

        // Leaders
        for (let i = 0; i < 5; i++) {
            peopleIds.push(await ctx.db.insert("people", generatePerson("leader")));
        }
        // Members
        for (let i = 0; i < 30; i++) {
            peopleIds.push(await ctx.db.insert("people", generatePerson("member")));
        }
        // Guests/Contacts
        const guestIds: typeof peopleIds = [];
        for (let i = 0; i < 15; i++) {
            const pId = await ctx.db.insert("people", generatePerson("guest"));
            guestIds.push(pId);
            peopleIds.push(pId);
        }

        const allPeople = peopleIds;
        log(`Created ${allPeople.length} people.`);

        // 2. PAIR CONTACTS WITH INVITERS (Evangelism)
        log("Linking Contacts to Inviters...");
        for (const guestId of guestIds) {
            // 70% chance they were invited by someone
            if (randomBool(0.7)) {
                const inviterId = random(peopleIds.filter(id => !guestIds.includes(id))); // Valid member
                await ctx.db.patch(guestId, { invited_by_id: inviterId });
            }
        }

        // 3. GENERATE SERVICES (Past 6 Months)
        log("Generating Services...");
        const servicesIds = [];
        const today = new Date();
        const sixMonthsAgo = subDays(today, 180);

        let currentDate = new Date(sixMonthsAgo);
        // Align to Sunday
        currentDate.setDate(currentDate.getDate() + (7 - currentDate.getDay()) % 7);

        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            // Generate Attendance first to calculate aggregates
            const attendees = allPeople.filter(() => randomBool(0.7)); // 70% attendance rate

            // Calculate Aggregates
            const total_attendance = attendees.length;
            const guests_count = attendees.filter(id => guestIds.includes(id)).length;
            const tithers_count = Math.floor(total_attendance * 0.4); // Approx 40%
            const salvation_decisions = Math.floor(guests_count * 0.1); // Approx 10% of guests

            const sId = await ctx.db.insert("services", {
                service_date: dateStr,
                service_type: "sunday_service",
                service_time: "09:00",
                location: "Main Auditorium",
                sermon_topic: `The Power of ${random(['Faith', 'Grace', 'Love', 'Giving', 'Prayer'])}`,
                sermon_speaker: "Rev. Dr. Nana",

                // Aggregates for Dashboard
                total_attendance,
                guests_count,
                tithers_count,
                salvation_decisions,

                created_at: currentDate.toISOString(),
            });
            servicesIds.push(sId);

            // Insert Attendance Records
            for (const pId of attendees) {
                await ctx.db.insert("attendance", {
                    service_id: sId,
                    person_id: pId,
                    made_salvation_decision: randomBool(0.05),
                    gave_tithe: randomBool(0.4),
                    first_timer: randomBool(0.02),
                    created_at: currentDate.toISOString() // Match service date
                });
            }

            currentDate.setDate(currentDate.getDate() + 7); // Next Sunday
        }
        log(`Created ${servicesIds.length} services with attendance.`);

        // 4. GENERATE PRAYER MEETINGS (Meetings & MeetingAttendance)
        log("Generating Prayer Meetings...");
        currentDate = new Date(sixMonthsAgo);
        // Align to Tuesday for Prayer
        currentDate.setDate(currentDate.getDate() + (2 + 7 - currentDate.getDay()) % 7);

        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const mId = await ctx.db.insert("meetings", {
                meeting_date: dateStr,
                meeting_type: random(MEETING_TYPES),
                start_time: "18:30",
                end_time: "20:00",
                location: random(LOCATIONS).name,
                notes: "Powerful time of intercession.",
                created_at: currentDate.toISOString(),
            });

            // Attendance
            const attendees = allPeople.filter(() => randomBool(0.4)); // 40% attendance
            for (const pId of attendees) {
                await ctx.db.insert("meeting_attendance", {
                    meeting_id: mId,
                    person_id: pId,
                    attended: true,
                    created_at: currentDate.toISOString(),
                });
            }

            currentDate.setDate(currentDate.getDate() + 7);
        }

        // 5. GENERATE VISITATIONS
        log("Generating Visitations...");
        for (let i = 0; i < 20; i++) {
            const visitor = random(allPeople.filter(id => !guestIds.includes(id))); // Member visiting
            const target = random(allPeople); // Visiting anyone
            const visitDate = randomDate(sixMonthsAgo, today);

            await ctx.db.insert("visitations", {
                person_id: target, // Person visited
                visited_by_id: visitor,
                visit_date: visitDate.toISOString().split('T')[0],
                outcome: random(OUTCOMES),
                follow_up_required: randomBool(0.3),
                notes: "Good discussion about spiritual growth.",
                created_at: visitDate.toISOString(),
            });
        }

        return "Seeding Complete! 50 people, 6 months of services/meetings generated.";
    },
});
