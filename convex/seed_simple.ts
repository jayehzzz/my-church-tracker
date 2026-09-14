import { v } from "convex/values";
import { requireDisposable } from "./lib/maintenance";
import { internalMutation } from "./_generated/server";

export const seed = internalMutation({
    args: { confirmation: v.string() },
    handler: async (ctx, args) => {
        requireDisposable(args.confirmation);
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

        const today = new Date().toISOString().split("T")[0];

        // 2. Create an outreach contact who made a salvation decision but has not joined church.
        const outreachSalvationId = await ctx.db.insert("people", {
            first_name: "John",
            last_name: "Outreach",
            member_status: "guest",
            outreach_salvation_decision: true,
            outreach_salvation_date: today,
            outreach_salvation_source: "evangelism_outreach",
            // Legacy compatibility mirror for older demo consumers.
            salvation_decision: true,
            contact_category: "responsive",
            contact_date: today,
            invited_by_id: leaderId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        console.log("Created outreach salvation contact:", outreachSalvationId);

        // 3. Create a church member independently of the outreach-salvation milestone.
        const memberId = await ctx.db.insert("people", {
            first_name: "Mary",
            last_name: "Member",
            member_status: "member",
            membership_date: today,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        console.log("Created church member:", memberId);

        // 4. Create a guest with neither milestone.
        await ctx.db.insert("people", {
            first_name: "Jane",
            last_name: "Guest",
            member_status: "guest",
            contact_date: today,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        return "Simple seed completed successfully";
    },
});
