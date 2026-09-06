import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const stamp = "2026-08-01T10:00:00Z";
async function fixture() {
    const t = convexTest(schema, modules);
    const ids = await t.run(async ctx => {
        const person = await ctx.db.insert("people", { first_name: "Guest", last_name: "Fixture", member_status: "guest", created_at: stamp, updated_at: stamp });
        const leader = await ctx.db.insert("people", { first_name: "Leader", last_name: "Fixture", member_status: "leader", created_at: stamp, updated_at: stamp });
        await ctx.db.insert("crm_users", { external_auth_id: "https://fixture.example|owner", person_id: leader, role: "owner", status: "active", can_view_confidential: true, created_at: stamp, updated_at: stamp });
        return { person, leader };
    });
    const owner = t.withIdentity({ tokenIdentifier: "https://fixture.example|owner", issuer: "https://fixture.example", subject: "owner" });
    const service = (overrides = {}) => owner.mutation(api.services.record, { service_date: "2026-08-02", service_type: "sunday_service", total_attendance: 0, guests_count: 0, salvation_decisions: 0, tithers_count: 0, attendanceData: [], ...overrides });
    const commitment = (overrides = {}) => owner.mutation(api.crm.recordCommitment, { personId: ids.person, leaderId: ids.leader, gatheringType: "sunday_service", gatheringDate: "2026-08-02", response: "yes", ...overrides });
    const care = (overrides = {}) => owner.mutation(api.visitations.create, { person_id: ids.person, visited_by_id: ids.leader, visit_date: "2026-08-02", interaction_type: "home_visit", outcome: "welcomed_encouraged", follow_up_required: true, follow_up_date: "2026-08-05", ...overrides });
    return { t, owner, ids, service, commitment, care };
}
const checkin = (person_id: any) => ({ person_id, first_timer: true, made_salvation_decision: false, gave_tithe: false });

describe("authoritative attendance transactions", () => {
    it("service and CRM paths produce the same attendance, milestone and exactly-once commitment outcome", async () => {
        for (const path of ["service", "crm"]) {
            const { owner, ids, service, commitment, t } = await fixture();
            const c = await commitment();
            const s = await service();
            if (path === "service") await service({ id: s!._id, total_attendance: 1, guests_count: 1, attendanceData: [checkin(ids.person), checkin(ids.person)] });
            else await owner.mutation(api.crm.resolveCommitment, { commitmentId: c!._id, resolution: "attended" });
            await owner.mutation(api.crm.resolveCommitment, { commitmentId: c!._id, resolution: "attended" });
            expect(await t.run(ctx => ctx.db.query("attendance").collect())).toHaveLength(1);
            const person = await t.run(ctx => ctx.db.get(ids.person));
            expect(person).toMatchObject({ first_visit_date: "2026-08-02", promises_kept: 1, pipeline_stage: "showed_up" });
            expect(await t.run(ctx => ctx.db.get(c!._id))).toMatchObject({ resolution: "attended", service_id: s!._id });
            expect((await t.run(ctx => ctx.db.query("follow_up_tasks").collect())).filter(t => t.automation_key === "attendance_welcome")).toHaveLength(1);
        }
    });
    it("keeps unnamed headcounts and expected plans separate, reconciles date corrections/removals", async () => {
        const { t, owner, ids, service, commitment } = await fixture();
        await t.run(ctx => ctx.db.patch(ids.person, { member_status: "member" }));
        const c = await commitment();
        const p = await owner.mutation(api.crm.setAttendancePlan, { personId: ids.person, leaderId: ids.leader, serviceDate: "2026-08-02", status: "confirmed" });
        expect(await t.run(ctx => ctx.db.query("attendance").collect())).toHaveLength(0);
        const s = await service({ total_attendance: 5 });
        await owner.mutation(api.crm.setAttendancePlan, { personId: ids.person, leaderId: ids.leader, serviceDate: "2026-08-02", status: "attended" });
        expect(await t.run(ctx => ctx.db.get(s!._id))).toMatchObject({ total_attendance: 6, unnamed_attendance_count: 5 });
        await owner.mutation(api.services.update, { id: s!._id, service_date: "2026-07-26" });
        expect(await t.run(ctx => ctx.db.get(p!._id))).toMatchObject({ service_date: "2026-07-26", status: "attended" });
        expect(await t.run(ctx => ctx.db.get(c!._id))).toMatchObject({ gathering_date: "2026-07-26", resolution: "attended" });
        expect(await t.run(ctx => ctx.db.get(ids.person))).toMatchObject({ first_visit_date: "2026-07-26" });
        const row = (await t.run(ctx => ctx.db.query("attendance").collect()))[0];
        await owner.mutation(api.attendance.remove, { id: row._id });
        expect(await t.run(ctx => ctx.db.get(p!._id))).toMatchObject({ status: "confirmed" });
        expect(await t.run(ctx => ctx.db.get(c!._id))).toMatchObject({ resolution: "pending" });
        expect(await t.run(ctx => ctx.db.get(s!._id))).toMatchObject({ total_attendance: 5 });
        expect((await t.run(ctx => ctx.db.get(ids.person)))?.first_visit_date).toBeUndefined();
    });
    it("requires an existing, explicitly selected gathering on ambiguous dates", async () => {
        const { t, owner, service, commitment } = await fixture();
        const c = await commitment();
        await expect(owner.mutation(api.crm.resolveCommitment, { commitmentId: c!._id, resolution: "attended" })).rejects.toThrow(/No gathering/);
        expect(await t.run(ctx => ctx.db.query("services").collect())).toHaveLength(0);
        const s = await service(); await service({ service_time: "18:00" });
        await expect(owner.mutation(api.crm.resolveCommitment, { commitmentId: c!._id, resolution: "attended" })).rejects.toThrow(/Several gatherings/);
        await owner.mutation(api.crm.resolveCommitment, { commitmentId: c!._id, serviceId: s!._id, resolution: "attended" });
        expect((await t.run(ctx => ctx.db.query("attendance").collect()))[0].service_id).toBe(s!._id);
    });
    it("rolls back invalid totals and missing people, and deduplicates request retries", async () => {
        const { t, owner, ids, service } = await fixture();
        for (const n of [-1, 0.5]) await expect(service({ total_attendance: n })).rejects.toThrow(/whole number/);
        await expect(service({ total_attendance: 0, attendanceData: [checkin(ids.person)] })).rejects.toThrow(/lower than named/);
        expect(await t.run(ctx => ctx.db.query("services").collect())).toHaveLength(0);
        const a = await service({ request_id: "retry" }); const b = await service({ request_id: "retry" });
        expect(a!._id).toBe(b!._id);
        await owner.mutation(api.attendance.bulkCreate, { records: [{ service_id: a!._id, person_id: ids.person }, { service_id: a!._id, person_id: ids.person }] });
        expect(await t.run(ctx => ctx.db.query("attendance").collect())).toHaveLength(1);
    });
    it("backdated meetings and absent rows respect first visits and atomic counts", async () => {
        const { t, owner, ids, commitment } = await fixture();
        const c = await commitment({ gatheringType: "bacenta" });
        const m = await owner.mutation(api.meetings.record, { request_id: "meeting-retry", meeting_date: "2026-08-02", meeting_type: "bacenta", unnamed_guests_count: 3, markComplete: true, attendanceData: [checkin(ids.person)] .map(({person_id,first_timer}) => ({ person_id, first_timer })) });
        expect(m.total_attendance).toBe(4);
        expect(await t.run(ctx => ctx.db.get(c!._id))).toMatchObject({ resolution: "attended", meeting_id: m._id });
        await owner.mutation(api.meetings.update, { id: m._id, meeting_date: "2026-07-20" });
        expect(await t.run(ctx => ctx.db.get(ids.person))).toMatchObject({ first_visit_date: "2026-07-20" });
        await owner.mutation(api.meetings.syncAttendance, { meetingId: m._id, attendanceData: [{person_id: ids.person, first_timer: true, status: "absent"}], unnamedGuestsCount: 3, markComplete: true });
        expect((await t.run(ctx => ctx.db.get(ids.person)))?.first_visit_date).toBeUndefined();
        expect((await t.run(ctx => ctx.db.get(m._id)))?.attendance_count).toBe(3);
        await expect(owner.mutation(api.meetings.record, { meeting_date: "2026-08-03", meeting_type: "bacenta", unnamed_guests_count: -1, markComplete: true, attendanceData: [] })).rejects.toThrow();
        expect(await t.run(ctx => ctx.db.query("meetings").collect())).toHaveLength(1);
    });
    it("archives deleted gatherings and removes their check-ins and derived commitments", async () => {
        const { t, owner, ids, service, commitment } = await fixture();
        const c = await commitment(); const s = await service({total_attendance: 1, guests_count: 1, attendanceData: [checkin(ids.person)]});
        await owner.mutation(api.services.remove, { id: s!._id });
        expect(await t.run(ctx => ctx.db.query("attendance").collect())).toHaveLength(0);
        expect(await t.run(ctx => ctx.db.get(c!._id))).toMatchObject({ resolution: "cancelled" });
        expect(await t.run(ctx => ctx.db.query("record_recovery").collect())).toHaveLength(1);
        expect((await t.run(ctx => ctx.db.get(ids.person)))?.promises_kept).toBe(0);
    });
});

describe("care history and contact policies", () => {
    it("keeps one corrected timeline, chronological caches and completed tasks after edits", async () => {
        const { t, owner, ids, care } = await fixture();
        const v = await care({ request_id: "care-retry", notes: "Original" });
        expect((await care({ request_id: "care-retry" }))!._id).toBe(v!._id);
        await owner.mutation(api.crm.completeTask, { taskId: v!.next_task_id!, outcome: "care_check_in", followUpDate: "2026-08-05", skipAutomaticNextTask: true });
        await owner.mutation(api.visitations.update, { id: v!._id, visit_date: "2026-08-01", notes: "Corrected" });
        const history = await t.run(ctx => ctx.db.query("follow_ups").collect());
        expect(history.filter(f => f.source_visitation_id === v!._id)).toHaveLength(1);
        expect(history.find(f => f.source_visitation_id === v!._id)).toMatchObject({ follow_up_date: "2026-08-01", notes: "Corrected" });
        expect(await t.run(ctx => ctx.db.query("follow_up_tasks").collect())).toHaveLength(1);
        expect(await t.run(ctx => ctx.db.get(v!.next_task_id!))).toMatchObject({status: "completed"});
        expect(await t.run(ctx => ctx.db.get(ids.person))).toMatchObject({total_follow_ups: 2, last_follow_up_date: "2026-08-05"});
        await owner.mutation(api.visitations.remove, { id: v!._id });
        expect(await t.run(ctx => ctx.db.query("follow_ups").collect())).toHaveLength(1);
        expect(await t.run(ctx => ctx.db.get(v!.next_task_id!))).toMatchObject({status: "completed"});
    });
    it("cancels generated open work on removal and never reopens it on a note correction", async () => {
        const { t, owner, care } = await fixture();
        const v = await care();
        await owner.mutation(api.visitations.update, { id: v!._id, follow_up_required: false });
        await owner.mutation(api.visitations.update, { id: v!._id, follow_up_required: true, follow_up_date: "2026-08-07", notes: "Corrected" });
        expect(await t.run(ctx => ctx.db.query("follow_up_tasks").collect())).toHaveLength(1);
        expect(await t.run(ctx => ctx.db.get(v!.next_task_id!))).toMatchObject({status: "cancelled"});
        await owner.mutation(api.visitations.remove, {id: v!._id});
        expect(await t.run(ctx => ctx.db.query("follow_ups").collect())).toHaveLength(0);
        expect(await t.run(ctx => ctx.db.query("record_recovery").collect())).toHaveLength(1);
    });
    it("blocks paused/do-not-contact follow-up, but records attendance without scheduling contact", async () => {
        for (const policy of [{ is_paused: true }, { contact_category: "do_not_contact" }]) {
            const { t, owner, ids, service, commitment, care } = await fixture();
            const c = await commitment(); const s = await service();
            await t.run(ctx => ctx.db.patch(ids.person, policy));
            await expect(owner.mutation(api.crm.createTask, { personId: ids.person, assignedLeaderId: ids.leader, dueDate: "2026-08-05", taskType: "follow_up" })).rejects.toThrow();
            await expect(care()).rejects.toThrow();
            await expect(owner.mutation(api.follow_ups.create, {contact_id: ids.person, leader_id: ids.leader, follow_up_date: "2026-08-03", method: "call", outcome: "positive_conversation"})).rejects.toThrow();
            await owner.mutation(api.crm.resolveCommitment, {commitmentId: c!._id, serviceId: s!._id, resolution: "attended"});
            expect(await t.run(ctx => ctx.db.query("follow_up_tasks").collect())).toHaveLength(0);
            expect(await t.run(ctx => ctx.db.get(ids.person))).toMatchObject(policy);
        }
    });
});

describe("attendance and care correction edge cases", () => {
    it("moves first-timer markers to an earlier gathering and restores them after its removal", async () => {
        const { t, owner, ids, service } = await fixture();
        await service({total_attendance:1, guests_count:1, attendanceData:[checkin(ids.person)]});
        const m = await owner.mutation(api.meetings.record, {request_id:'earlier', meeting_date:'2026-07-20', meeting_type:'bacenta', unnamed_guests_count:0, markComplete:true, attendanceData:[{person_id:ids.person}]});
        expect((await t.run(ctx=>ctx.db.query('attendance').collect()))[0].first_timer).toBe(false);
        expect((await t.run(ctx=>ctx.db.query('meeting_attendance').collect()))[0].first_timer).toBe(true);
        await owner.mutation(api.meetings.remove,{id:m._id});
        expect((await t.run(ctx=>ctx.db.query('attendance').collect()))[0].first_timer).toBe(true);
        expect((await t.run(ctx=>ctx.db.get(ids.person)))?.first_visit_date).toBe('2026-08-02');
    });
    it("corrects attended to no-show and back without double-counting", async () => {
        const {t,owner,ids,service,commitment}=await fixture();
        const c=await commitment(); await service();
        for(const resolution of ['attended','no_show','attended','attended'] as const) {
            await owner.mutation(api.crm.resolveCommitment,{commitmentId:c!._id,resolution});
            expect((await t.run(ctx=>ctx.db.get(ids.person)))?.promises_kept).toBe(resolution==='attended'?1:0);
            expect((await t.run(ctx=>ctx.db.get(ids.person)))?.pipeline_stage).toBe(resolution==='attended'?'showed_up':'no_show');
        }
        expect(await t.run(ctx=>ctx.db.query('attendance').collect())).toHaveLength(1);
    });
    it("refuses future actual attendance and conflicting date corrections atomically", async()=>{
        const {t,owner,ids,service,commitment}=await fixture();
        const c=await commitment(); const s=await service({total_attendance:1,guests_count:1,attendanceData:[checkin(ids.person)]});
        await commitment({gatheringDate:'2026-07-26'});
        await expect(owner.mutation(api.services.update,{id:s!._id,service_date:'2026-07-26'})).rejects.toThrow(/conflicts/);
        await expect(owner.mutation(api.services.update,{id:s!._id,service_date:'2099-01-01'})).rejects.toThrow(/future/);
        expect((await t.run(ctx=>ctx.db.get(c!._id)))?.gathering_date).toBe('2026-08-02');
        expect((await t.run(ctx=>ctx.db.get(s!._id)))?.service_date).toBe('2026-08-02');
    });
    it("preserves manual milestones when attendance is removed",async()=>{
        const {t,owner,ids,service}=await fixture();
        await t.run(ctx=>ctx.db.patch(ids.person,{first_visit_date:'2025-01-01',salvation_decision:true,entry_point:'referral'}));
        const s=await service({total_attendance:1,guests_count:1,attendanceData:[checkin(ids.person)]});
        await owner.mutation(api.services.remove,{id:s!._id});
        expect(await t.run(ctx=>ctx.db.get(ids.person))).toMatchObject({first_visit_date:'2025-01-01',salvation_decision:true,entry_point:'referral'});
    });
    it("adopts an unlinked legacy care history even when old notes/dates have drifted",async()=>{
        const {t,owner,ids,care}=await fixture();
        const v=await care();
        await t.run(async ctx=>{
            const f=(await ctx.db.query('follow_ups').collect())[0];
            await ctx.db.patch(f._id,{source_visitation_id:undefined,follow_up_date:'2026-07-31',notes:'Old notes'});
        });
        await owner.mutation(api.visitations.update,{id:v!._id,notes:'Aligned notes'});
        const history=await t.run(ctx=>ctx.db.query('follow_ups').collect());
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({source_visitation_id:v!._id,follow_up_date:'2026-08-02',notes:'Aligned notes'});
        await expect(owner.mutation(api.visitations.update,{id:v!._id,follow_up_date:'2026-07-01'})).rejects.toThrow(/on or after/);
        expect((await t.run(ctx=>ctx.db.get(v!.next_task_id!)))?.due_date).toBe('2026-08-05');
        expect((await t.run(ctx=>ctx.db.get(ids.person)))?.total_follow_ups).toBe(1);
    });
    it("retains completion after correcting a source-task care interaction and removing it",async()=>{
        const {t,owner,ids,care}=await fixture();
        const source=await owner.mutation(api.crm.createTask,{personId:ids.person,assignedLeaderId:ids.leader,dueDate:'2026-08-02',taskType:'member_care'});
        const v=await care({source_task_id:source!._id,follow_up_required:false,follow_up_date:undefined});
        expect((await care({source_task_id:source!._id,follow_up_required:false,follow_up_date:undefined}))!._id).toBe(v!._id);
        await owner.mutation(api.visitations.update,{id:v!._id,notes:'Corrected source notes'});
        expect(await t.run(ctx=>ctx.db.get(source!._id))).toMatchObject({status:'completed',notes:'Corrected source notes'});
        await owner.mutation(api.visitations.remove,{id:v!._id});
        expect((await t.run(ctx=>ctx.db.get(source!._id)))?.status).toBe('completed');
        expect(await t.run(ctx=>ctx.db.query('follow_ups').collect())).toHaveLength(0);
    });
    it("deletes unambiguous pending gathering expectations and cancels dated open work",async()=>{
        const {t,owner,ids,service,commitment}=await fixture();
        const s=await service(); const c=await commitment();
        const task=await owner.mutation(api.crm.createTask,{personId:ids.person,assignedLeaderId:ids.leader,dueDate:'2026-08-02',taskType:'sunday_confirmation',gatheringType:'sunday_service',gatheringDate:'2026-08-02'});
        await owner.mutation(api.services.remove,{id:s!._id});
        expect((await t.run(ctx=>ctx.db.get(c!._id)))?.resolution).toBe('cancelled');
        expect((await t.run(ctx=>ctx.db.get(task!._id)))?.status).toBe('cancelled');
    });
    it("retains the administrator attendance boundary and hides linked care without a grant",async()=>{
        const {t,owner,ids,service,commitment,care}=await fixture();
        const c=await commitment(); const s=await service(); await care();
        await t.run(async ctx=>{
            await ctx.db.insert('crm_users',{external_auth_id:'https://fixture.example|leader',person_id:ids.leader,role:'leader',status:'active',created_at:stamp,updated_at:stamp});
            await ctx.db.insert('follow_up_assignments',{person_id:ids.person,assigned_leader_id:ids.leader,status:'active',assigned_at:stamp,created_at:stamp,updated_at:stamp});
        });
        const leader=t.withIdentity({tokenIdentifier:'https://fixture.example|leader',issuer:'https://fixture.example',subject:'leader'});
        await expect(leader.mutation(api.crm.resolveCommitment,{commitmentId:c!._id,serviceId:s!._id,resolution:'attended'})).rejects.toThrow(/administrator/);
        expect(await t.run(ctx=>ctx.db.query('attendance').collect())).toHaveLength(0);
        expect(await leader.query(api.follow_ups.getByContact,{contactId:ids.person})).toEqual([]);
        expect(await owner.query(api.follow_ups.getByContact,{contactId:ids.person})).toHaveLength(1);
    });
});

describe('plans and promise timeline reconciliation',()=>{
    it('creates a member actual-attendance plan even without a prior expectation, and never duplicates it',async()=>{
        const {t,owner,ids,service}=await fixture();
        await t.run(ctx=>ctx.db.patch(ids.person,{member_status:'member'}));
        const s=await service({total_attendance:1,guests_count:0,attendanceData:[{...checkin(ids.person),first_timer:false}]});
        let plans=await t.run(ctx=>ctx.db.query('attendance_plans').collect());
        expect(plans).toHaveLength(1); expect(plans[0].status).toBe('attended');
        await owner.mutation(api.crm.setAttendancePlan,{personId:ids.person,leaderId:ids.leader,serviceDate:'2026-08-02',status:'attended'});
        expect(await t.run(ctx=>ctx.db.query('attendance_plans').collect())).toHaveLength(1);
        await owner.mutation(api.services.remove,{id:s!._id});
        expect(await t.run(ctx=>ctx.db.query('attendance_plans').collect())).toHaveLength(0);
    });
    it('creates exactly one plan through CRM when the member had no plan',async()=>{
        const {t,owner,ids,service}=await fixture();
        await t.run(ctx=>ctx.db.patch(ids.person,{member_status:'member'})); await service();
        await owner.mutation(api.crm.setAttendancePlan,{personId:ids.person,leaderId:ids.leader,serviceDate:'2026-08-02',status:'attended'});
        expect(await t.run(ctx=>ctx.db.query('attendance_plans').collect())).toHaveLength(1);
        expect(await t.run(ctx=>ctx.db.query('attendance').collect())).toHaveLength(1);
    });
    it('corrects the promise history date alongside its commitment without counting it twice',async()=>{
        const {t,owner,ids,service}=await fixture();
        const task=await owner.mutation(api.crm.createTask,{personId:ids.person,assignedLeaderId:ids.leader,dueDate:'2026-08-01',taskType:'follow_up'});
        await owner.mutation(api.crm.completeTask,{taskId:task!._id,outcome:'promised_to_come',followUpDate:'2026-08-01',skipAutomaticNextTask:true,commitment:{gatheringType:'sunday_service',gatheringDate:'2026-08-02',response:'yes'}});
        const s=await service({total_attendance:1,guests_count:1,attendanceData:[checkin(ids.person)]});
        await owner.mutation(api.services.update,{id:s!._id,service_date:'2026-07-26'});
        const history=await t.run(ctx=>ctx.db.query('follow_ups').collect());
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({promised_date:'2026-07-26',gathering_date:'2026-07-26',promise_fulfilled:true});
        expect((await t.run(ctx=>ctx.db.get(ids.person)))?.promises_kept).toBe(1);
        await expect(owner.mutation(api.follow_ups.resolvePromise,{follow_up_id:history[0]._id,fulfilled:true})).rejects.toThrow(/retired/);
    });
});
