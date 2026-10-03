import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts']);
const now = '2026-10-01T10:00:00Z';
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const person = (first_name: string, member_status: string) => ctx.db.insert('people', { first_name, last_name: 'Test', member_status, created_at: now, updated_at: now });
    const old = await person('Old', 'leader'), next = await person('New', 'leader'), member = await person('Member', 'member'), contact = await person('Contact', 'contact');
    for (const [name, role, linked] of [['owner','owner',old], ['admin','admin',old], ['old','leader',old], ['next','leader',next], ['viewer','viewer',undefined]] as const)
      await ctx.db.insert('crm_users', { external_auth_id: `https://fixture.example|${name}`, person_id: linked, role, status: 'active', created_at: now, updated_at: now });
    return { old, next, member, contact };
  });
  const as = (name: string) => t.withIdentity({ tokenIdentifier: `https://fixture.example|${name}`, issuer: 'https://fixture.example', subject: name });
  return { t, ids, as };
}

describe('follow-up delegation', () => {
  it('assigns members and leaders without outreach tasks or person changes; keeps a single active owner', async () => {
    const { t, ids, as } = await fixture();
    const before = await t.run(ctx => ctx.db.get(ids.member));
    const first = await as('admin').mutation(api.crm.assignContact, { personId: ids.member, assignedLeaderId: ids.old, expectedAssignmentId: null });
    const repeated = await as('owner').mutation(api.crm.assignContact, { personId: ids.member, assignedLeaderId: ids.old, expectedAssignmentId: first.assignment!._id });
    expect(repeated.assignment!._id).toBe(first.assignment!._id);
    expect(first.task).toBeNull();
    const next = await as('owner').mutation(api.crm.assignContact, { personId: ids.member, assignedLeaderId: ids.next, expectedAssignmentId: first.assignment!._id });
    const history = await t.run(ctx => ctx.db.query('follow_up_assignments').withIndex('by_person', q => q.eq('person_id',ids.member)).collect());
    expect(history.filter(row => row.status === 'active')).toEqual([next.assignment]);
    expect(history.find(row => row._id === first.assignment!._id)).toMatchObject({ status: 'ended', ended_at: expect.any(String) });
    expect(await t.run(ctx => ctx.db.get(ids.member))).toEqual(before);
    expect((await as('admin').mutation(api.crm.assignContact, { personId: ids.old, assignedLeaderId: ids.next })).task).toBeNull();
  });

  it('moves open delegated tasks with their IDs/dates and preserves completed, care, programme and Sunday history', async () => {
    const { t, ids, as } = await fixture();
    await as('owner').mutation(api.crm.assignContact, { personId: ids.member, assignedLeaderId: ids.old });
    const seeded = await t.run(async ctx => {
      const program = await ctx.db.insert('meeting_programs', { code:'bacenta-test', name:'Bacenta', meeting_type:'bacenta', default_format:'in_person', category:'bacenta', active:true, created_at:now, updated_at:now });
      await ctx.db.insert('meeting_program_leaders', {program_id:program, person_id:ids.old, is_primary:true, created_at:now});
      const link = await ctx.db.insert('meeting_program_members', { program_id:program, person_id:ids.member, status:'active', joined_at:now });
      const tasks = [];
      for (const task_type of ['follow_up','sunday_confirmation','reengagement','member_care','visitation','other'] as const)
        tasks.push(await ctx.db.insert('follow_up_tasks', { person_id:ids.member, assigned_leader_id:ids.old, due_date:'2026-10-04', status:'open', task_type, priority:'normal', created_at:now, updated_at:now }));
      const programmeTask = await ctx.db.insert('follow_up_tasks', { person_id:ids.member, program_id:program, assigned_leader_id:ids.old, due_date:'2026-10-04', status:'open', task_type:'follow_up', priority:'normal', created_at:now, updated_at:now });
      const completed = await ctx.db.insert('follow_up_tasks', { person_id:ids.member, assigned_leader_id:ids.old, due_date:'2026-10-01', status:'completed', task_type:'follow_up', priority:'normal', completed_by_id:ids.old, completed_at:now, created_at:now, updated_at:now });
      const cancelled = await ctx.db.insert('follow_up_tasks', { person_id:ids.member, assigned_leader_id:ids.old, due_date:'2026-10-01', status:'cancelled', task_type:'sunday_confirmation', priority:'normal', created_at:now, updated_at:now });
      await ctx.db.patch(ids.member, { invited_by_id:ids.old });
      return { tasks, programmeTask, completed, cancelled, link };
    });
    const sunday = await as('owner').mutation(api.crm.recordCommitment, { personId:ids.member, leaderId:ids.old, gatheringType:'sunday_service', gatheringDate:'2026-10-04', response:'yes' });
    const before = await t.run(async ctx => ({ person:await ctx.db.get(ids.member), sunday:await ctx.db.get(sunday!._id), link:await ctx.db.get(seeded.link), retained: await Promise.all([...seeded.tasks.slice(3), seeded.programmeTask, seeded.completed, seeded.cancelled].map(id => ctx.db.get(id))) }));
    const moved = await as('owner').mutation(api.crm.assignContact, { personId:ids.member, assignedLeaderId:ids.next });
    for (const id of seeded.tasks.slice(0,3)) expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ assigned_leader_id:ids.next, due_date:'2026-10-04', status:'open', ownership_history:[{from_leader_id:ids.old,to_leader_id:ids.next,assignment_id:moved.assignment!._id,at:expect.any(String)}] });
    expect(await t.run(async ctx => ({ person:await ctx.db.get(ids.member), sunday:await ctx.db.get(sunday!._id), link:await ctx.db.get(seeded.link), retained:await Promise.all([...seeded.tasks.slice(3), seeded.programmeTask, seeded.completed, seeded.cancelled].map(id => ctx.db.get(id))) }))).toEqual(before);
    expect((await as('next').query(api.crm.getDashboard, { leaderId:ids.next, serviceDate:'2026-10-04' })).sunday_commitments.map(row => row._id)).toContain(sunday!._id);
    expect((await as('owner').query(api.crm.getDashboard, { leaderId:ids.old, serviceDate:'2026-10-04' })).sunday_commitments).toHaveLength(0);
    await expect(as('old').mutation(api.crm.completeTask, {taskId:seeded.tasks[0],method:'call',outcome:'no_response',skipAutomaticNextTask:true})).rejects.toThrow();
    const done = await as('next').mutation(api.crm.completeTask, {taskId:seeded.tasks[0],method:'call',outcome:'no_response',skipAutomaticNextTask:true});
    expect(done.follow_up!.leader_id).toBe(ids.next);
    expect((await t.run(ctx => ctx.db.query('security_audit').collect())).some(row => row.record_id === seeded.tasks[0] && row.operation === 'patch')).toBe(true);
  });

  it('does not restart first contact on reassignment and transfers its existing date', async () => {
    const { t, ids, as } = await fixture();
    const first = await as('owner').mutation(api.crm.assignContact, {personId:ids.contact,assignedLeaderId:ids.old,firstContactDueDate:'2026-10-05'});
    expect(first.task?.task_type).toBe('first_contact');
    const next = await as('owner').mutation(api.crm.assignContact, {personId:ids.contact,assignedLeaderId:ids.next,firstContactDueDate:'2026-10-08'});
    expect(next.task).toBeNull();
    expect(await t.run(ctx => ctx.db.get(first.task!._id))).toMatchObject({assigned_leader_id:ids.next,due_date:'2026-10-05'});
    expect((await t.run(ctx => ctx.db.query('follow_up_tasks').collect()))).toHaveLength(1);
  });

  it('rejects stale delegation atomically and invalid/paused/archived/do-not-contact choices', async () => {
    const { t, ids, as } = await fixture();
    await as('owner').mutation(api.crm.assignContact, {personId:ids.member,assignedLeaderId:ids.old,expectedAssignmentId:null});
    await expect(as('owner').mutation(api.crm.assignContact, {personId:ids.member,assignedLeaderId:ids.next,expectedAssignmentId:null})).rejects.toThrow(/changed/);
    expect((await t.run(ctx => ctx.db.query('follow_up_assignments').collect()))).toHaveLength(1);
    await expect(as('owner').mutation(api.crm.assignContact, {personId:ids.contact,assignedLeaderId:ids.member})).rejects.toThrow(/leader status/);
    for (const patch of [{contact_category:'do_not_contact'}, {contact_category:undefined,is_paused:true}, {is_paused:false,member_status:'archived'}]) {
      await t.run(ctx => ctx.db.patch(ids.contact,patch));
      await expect(as('owner').mutation(api.crm.assignContact, {personId:ids.contact,assignedLeaderId:ids.next})).rejects.toThrow(/no contact|paused|archived/);
    }
  });

  it('repairs legacy multiple active owners without deleting their assignment history', async () => {
    const { t, ids, as } = await fixture();
    const active = await t.run(async ctx => {
      const rows = [];
      for (const leader of [ids.old, ids.next, ids.next]) rows.push(await ctx.db.insert('follow_up_assignments', {person_id:ids.member,assigned_leader_id:leader,status:'active',assigned_at:now,created_at:now,updated_at:now}));
      return rows;
    });
    await as('owner').mutation(api.crm.assignContact, {personId:ids.member,assignedLeaderId:ids.next});
    const history = await t.run(ctx => ctx.db.query('follow_up_assignments').collect());
    expect(history).toHaveLength(3);
    expect(history.filter(row => row.status === 'active')).toHaveLength(1);
    expect(history.map(row => row._id).sort()).toEqual(active.sort());
  });

  it('allows only approved owners/admins to delegate or read the administrative directory', async () => {
    const { t, ids, as } = await fixture();
    for (const caller of [t,as('old'),as('next'),as('viewer')]) {
      await expect(caller.mutation(api.crm.assignContact,{personId:ids.member,assignedLeaderId:ids.next})).rejects.toThrow();
      await expect(caller.query(api.crm.getAssignmentDirectory,{})).rejects.toThrow();
    }
    const rows = await as('admin').query(api.crm.getAssignmentDirectory,{});
    expect(rows.map(row => row.member_status)).toContain('member');
    expect(rows.every(row => row.assigned_leader_id === null)).toBe(true);
    expect(rows.every(row => !('notes' in row))).toBe(true);
  });
});
