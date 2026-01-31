import { mutation } from "./_generated/server";

/**
 * MIGRATION: Remove basonta_worker role
 * 
 * Run via: npx convex run migrations:removeBasontaWorkerRole
 * 
 * This migration changes all people with role "basonta_worker" to "no_role"
 * because basonta_worker is not a leadership role - ministry involvement
 * is tracked via the basontas[] array instead.
 */

export const removeBasontaWorkerRole = mutation({
    args: {},
    handler: async (ctx) => {
        // Get all people with role = "basonta_worker"
        const peopleToUpdate = await ctx.db
            .query("people")
            .filter((q) => q.eq(q.field("role"), "basonta_worker"))
            .collect();

        console.log(`Found ${peopleToUpdate.length} people with basonta_worker role`);

        let updatedCount = 0;
        for (const person of peopleToUpdate) {
            await ctx.db.patch(person._id, {
                role: "no_role",
                updated_at: new Date().toISOString(),
            });
            updatedCount++;
            console.log(`Updated ${person.first_name} ${person.last_name} from basonta_worker to no_role`);
        }

        return {
            message: `Migration complete: Updated ${updatedCount} people from basonta_worker to no_role`,
            updatedCount,
        };
    },
});

/**
 * MIGRATION: Seed Evangelism Contacts
 * 
 * Run via: npx convex run migrations:seedEvangelismContacts
 * 
 * This migration adds sample evangelism contacts to the database
 * representing different contact categories and stages of the spiritual journey.
 */

const EVANGELISM_CONTACTS = [
    // RESPONSIVE - People who showed interest
    {
        first_name: "Akua",
        last_name: "Mensah",
        phone: "+44 7800 200001",
        address: "22 Station Road, Luton, LU1 1AB",
        contact_category: "responsive",
        contact_date: "2026-01-15",
        salvation_decision: true,
        notes: "Met at community event. Very interested in church activities.",
    },
    {
        first_name: "Kofi",
        last_name: "Asante",
        phone: "+44 7800 200002",
        address: "45 Bedford Road, Luton, LU2 3BC",
        contact_category: "responsive",
        contact_date: "2026-01-20",
        salvation_decision: true,
        notes: "Friend of Grace Mensah. Made salvation decision during outreach.",
    },
    {
        first_name: "Ama",
        last_name: "Owusu",
        phone: "+44 7800 200003",
        email: "ama.owusu@email.com",
        address: "78 Dunstable Road, Luton, LU4 6CD",
        contact_category: "responsive",
        contact_date: "2026-01-10",
        salvation_decision: false,
        notes: "Interested in youth programs. Asked to be contacted.",
    },
    {
        first_name: "Yaw",
        last_name: "Adjei",
        phone: "+44 7800 200004",
        contact_category: "responsive",
        contact_date: "2026-01-25",
        salvation_decision: true,
        notes: "Door-to-door evangelism. Prayed for salvation.",
    },
    {
        first_name: "Adwoa",
        last_name: "Boateng",
        phone: "+44 7800 200005",
        email: "adwoa.boateng@email.com",
        address: "12 Oak Avenue, Luton, LU3 2DE",
        contact_category: "responsive",
        contact_date: "2026-01-18",
        salvation_decision: false,
        notes: "Met at market. Interested in women's fellowship.",
    },
    // NON_RESPONSIVE - Initial contact but no follow-through
    {
        first_name: "Kwame",
        last_name: "Darko",
        phone: "+44 7800 200006",
        contact_category: "non_responsive",
        contact_date: "2026-01-05",
        salvation_decision: false,
        notes: "Polite but not interested. May revisit later.",
    },
    {
        first_name: "Abena",
        last_name: "Osei",
        phone: "+44 7800 200007",
        contact_category: "non_responsive",
        contact_date: "2026-01-08",
        salvation_decision: false,
        notes: "Too busy with work. Left contact information.",
    },
    // EVENTS_ONLY - Only comes for special events
    {
        first_name: "Kwabena",
        last_name: "Frimpong",
        phone: "+44 7800 200008",
        email: "kwabena.f@email.com",
        contact_category: "events_only",
        contact_date: "2025-12-20",
        salvation_decision: false,
        notes: "Attended Christmas concert. Only interested in social events.",
    },
    {
        first_name: "Efua",
        last_name: "Antwi",
        phone: "+44 7800 200009",
        contact_category: "events_only",
        contact_date: "2025-12-25",
        salvation_decision: false,
        notes: "Came for Christmas service via family invitation.",
    },
    // HAS_CHURCH - Already has a church home but connected
    {
        first_name: "Yaa",
        last_name: "Opoku",
        phone: "+44 7800 200010",
        email: "yaa.opoku@email.com",
        contact_category: "has_church",
        contact_date: "2026-01-12",
        salvation_decision: false,
        notes: "Member of another church in Luton. Connected through community outreach.",
    },
    // DO_NOT_CONTACT
    {
        first_name: "Kweku",
        last_name: "Asare",
        phone: "+44 7800 200011",
        contact_category: "do_not_contact",
        contact_date: "2026-01-03",
        salvation_decision: false,
        notes: "Requested no further contact.",
    },
    // More RESPONSIVE contacts with varied dates for better dashboard data
    {
        first_name: "Nana",
        last_name: "Agyemang",
        phone: "+44 7800 200012",
        address: "33 Park Lane, Luton, LU1 4EF",
        contact_category: "responsive",
        contact_date: "2025-12-28",
        salvation_decision: true,
        notes: "Met during New Year outreach. Very receptive.",
    },
    {
        first_name: "Afua",
        last_name: "Dankwa",
        phone: "+44 7800 200013",
        email: "afua.d@email.com",
        contact_category: "responsive",
        contact_date: "2025-12-15",
        salvation_decision: false,
        notes: "Colleague of church member. Interested in Bible study.",
    },
    {
        first_name: "Kojo",
        last_name: "Sarpong",
        phone: "+44 7800 200014",
        address: "56 High Street, Luton, LU2 5GH",
        contact_category: "responsive",
        contact_date: "2026-01-22",
        salvation_decision: true,
        notes: "Young professional. Seeking spiritual community.",
    },
    {
        first_name: "Akosua",
        last_name: "Amponsah",
        phone: "+44 7800 200015",
        contact_category: "responsive",
        contact_date: "2026-01-28",
        salvation_decision: false,
        notes: "University student. Interested in youth activities.",
    },
];

export const seedEvangelismContacts = mutation({
    args: {},
    handler: async (ctx) => {
        const now = new Date().toISOString();

        // Get existing members to use as invited_by references
        const leaders = await ctx.db
            .query("people")
            .filter((q) => q.eq(q.field("member_status"), "leader"))
            .take(5);

        const members = await ctx.db
            .query("people")
            .filter((q) => q.eq(q.field("member_status"), "member"))
            .take(10);

        const potentialInviters = [...leaders, ...members];

        if (potentialInviters.length === 0) {
            return { message: "No existing members to use as inviters. Run seed:seed first.", count: 0 };
        }

        console.log(`Found ${potentialInviters.length} potential inviters`);

        let createdCount = 0;
        for (const contact of EVANGELISM_CONTACTS) {
            // Randomly assign an inviter (simulating who made the contact)
            const inviter = potentialInviters[Math.floor(Math.random() * potentialInviters.length)];

            await ctx.db.insert("people", {
                first_name: contact.first_name,
                last_name: contact.last_name,
                phone: contact.phone,
                email: contact.email,
                address: contact.address,
                member_status: "guest", // All evangelism contacts start as guests
                contact_category: contact.contact_category,
                contact_date: contact.contact_date,
                salvation_decision: contact.salvation_decision,
                invited_by_id: inviter._id,
                created_at: now,
                updated_at: now,
            });

            createdCount++;
            console.log(`Created contact: ${contact.first_name} ${contact.last_name} (${contact.contact_category})`);
        }

        return {
            message: `Seeded ${createdCount} evangelism contacts`,
            count: createdCount,
            categories: {
                responsive: EVANGELISM_CONTACTS.filter(c => c.contact_category === "responsive").length,
                non_responsive: EVANGELISM_CONTACTS.filter(c => c.contact_category === "non_responsive").length,
                events_only: EVANGELISM_CONTACTS.filter(c => c.contact_category === "events_only").length,
                has_church: EVANGELISM_CONTACTS.filter(c => c.contact_category === "has_church").length,
                do_not_contact: EVANGELISM_CONTACTS.filter(c => c.contact_category === "do_not_contact").length,
            }
        };
    },
});
