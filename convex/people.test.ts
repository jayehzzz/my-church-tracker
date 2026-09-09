import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const now = "2026-09-05T09:00:00.000Z";

async function ownerFixture() {
    const t = convexTest(schema, modules);
    await t.run((ctx) => ctx.db.insert("crm_users", {
        external_auth_id: "https://identity.example/|owner",
        role: "owner",
        status: "active",
        can_view_confidential: true,
        created_at: now,
        updated_at: now,
    }));
    return {
        t,
        owner: t.withIdentity({
            issuer: "https://identity.example/",
            subject: "owner",
            tokenIdentifier: "https://identity.example/|owner",
        }),
    };
}

describe("person records", () => {
    it("persists a full address, explicitly clears saved values, detects contact duplicates, and protects history", async () => {
        const { t, owner } = await ownerFixture();
        const person = await owner.mutation(api.people.create, {
            first_name: "Ada",
            last_name: "Lovelace",
            member_status: "visitor",
            email: "Ada@Example.test",
            phone: "+44 7700 900 123",
            address: "12 St James's Square",
            city: "London",
            state: "Greater London",
            zip_code: "SW1Y 4LB",
            birthday: "1815-12-10",
        });
        expect(person?.member_status).toBe("guest");
        expect(person).toMatchObject({ city: "London", state: "Greater London", zip_code: "SW1Y 4LB" });

        await owner.mutation(api.people.update, {
            id: person!._id,
            city: "Westminster",
            clear_fields: ["email", "address"],
        });
        const reloaded = await owner.query(api.people.getById, { id: person!._id });
        expect(reloaded).toMatchObject({ city: "Westminster", state: "Greater London", zip_code: "SW1Y 4LB" });
        expect(reloaded).not.toHaveProperty("email");
        expect(reloaded).not.toHaveProperty("address");

        await owner.mutation(api.people.create, {
            first_name: "Ada",
            last_name: "Duplicate",
            member_status: "guest",
            phone: "447700900123",
        });
        const duplicates = await owner.query(api.people.findDuplicates, { phone: "+44 (7700) 900-123", excludeId: person!._id });
        expect(duplicates).toHaveLength(1);
        expect(duplicates[0].matching_fields).toEqual(["phone"]);

        const serviceId = await t.run((ctx) => ctx.db.insert("services", {
            service_date: "2026-09-05", service_type: "sunday_service", created_at: now,
        }));
        await t.run((ctx) => ctx.db.insert("attendance", { service_id: serviceId, person_id: person!._id, created_at: now }));
        await expect(owner.mutation(api.people.remove, { id: person!._id })).rejects.toThrow(/cannot be permanently deleted/i);
        const archived = await owner.mutation(api.people.archive, { id: person!._id });
        expect(archived?.member_status).toBe("archived");
        expect(await t.run((ctx) => ctx.db.query("attendance").withIndex("by_person", q => q.eq("person_id", person!._id)).collect())).toHaveLength(1);
    });

    it("requires a fresh, conflict-free preview before merging and preserves linked attendance", async () => {
        const { t, owner } = await ownerFixture();
        const source = await owner.mutation(api.people.create, { first_name: "Source", last_name: "Person", member_status: "guest" });
        const target = await owner.mutation(api.people.create, { first_name: "Target", last_name: "Person", member_status: "guest" });
        const serviceId = await t.run((ctx) => ctx.db.insert("services", {
            service_date: "2026-09-05", service_type: "sunday_service", created_at: now,
        }));
        await t.run((ctx) => ctx.db.insert("attendance", { service_id: serviceId, person_id: source!._id, created_at: now }));

        const contact = await owner.mutation(api.people.create, { first_name:"Collected",last_name:"Contact",member_status:"guest",collected_by_id:source!._id });
        const supported = await owner.mutation(api.people.createGrowthAgreement, { personId:contact!._id,action:"Meet together",supportingPersonId:source!._id,agreedDate:"2026-01-01" });
        const ownAgreement = await owner.mutation(api.people.createGrowthAgreement, { personId:source!._id,action:"Read together",agreedDate:"2026-01-01" });
        await owner.mutation(api.people.reviewGrowthAgreement, { agreementId:ownAgreement!._id,note:"Started reading",reviewDate:"2026-01-02",status:"in_progress" });
        const preview = await owner.query(api.people.getMergePreview, { sourceId: source!._id, targetId: target!._id });
        expect(preview.canMerge).toBe(true);
        expect(preview.relationshipCounts.attendance).toBe(1);
        await owner.mutation(api.people.mergeReviewed, {
            sourceId: source!._id,
            targetId: target!._id,
            sourceUpdatedAt: preview.sourceUpdatedAt,
            targetUpdatedAt: preview.targetUpdatedAt,
        });
        const [mergedSource, attendance] = await t.run(async (ctx) => [
            await ctx.db.get(source!._id),
            await ctx.db.query("attendance").withIndex("by_service", q => q.eq("service_id", serviceId)).collect(),
        ]);
        expect(mergedSource).toMatchObject({ member_status: "archived", merged_into_id: target!._id });
        expect(attendance).toHaveLength(1);
        expect(attendance[0].person_id).toBe(target!._id);
        expect((await t.run(ctx=>ctx.db.get(contact!._id)))?.collected_by_id).toBe(target!._id);
        expect((await t.run(ctx=>ctx.db.get(supported!._id)))?.supporting_person_id).toBe(target!._id);
        const [summary] = await owner.query(api.people.getDevelopmentSummary,{ids:[target!._id]});
        expect(summary.agreements.map(a=>a._id)).toContain(ownAgreement!._id);
        expect(summary.agreementReviews[0].person_id).toBe(target!._id);
    });
});
