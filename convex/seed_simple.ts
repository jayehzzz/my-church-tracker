import { mutation } from "./_generated/server";

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Create a person with 'basontas' (Ministry Groups) - Verifies new field support
        const leaderId = await ctx.db.insert("people", {
            first_name: "Test",
            last_name: "Leader",
            member_status: "leader",
            basontas: ["worship", "choir"], // This field was previously causing errors
            birthday: "1980-01-01",
            email: "leader@test.com",
            phone: "1234567890",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        console.log("Created leader with basontas:", leaderId);

        // 2. Create an evangelism contact who is converted - Verifies conversion tracking
        const convertId = await ctx.db.insert("people", {
            first_name: "John",
            last_name: "Convert",
            member_status: "member", // Converted status
            membership_date: new Date().toISOString().split("T")[0],
            salvation_decision: true,
            // Note: 'converted' field was removed as it doesn't exist in schema
            intended_use: "evangelism", // Or whatever flag distinguishes them if any
            contact_category: "responsive",
            invited_by_id: leaderId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        console.log("Created converted contact:", convertId);

        // 3. Create a guest
        await ctx.db.insert("people", {
            first_name: "Jane",
            last_name: "Guest",
            member_status: "guest",
            contact_date: new Date().toISOString().split("T")[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        return "Simple seed completed successfully";
    },
});
