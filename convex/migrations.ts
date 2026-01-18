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
