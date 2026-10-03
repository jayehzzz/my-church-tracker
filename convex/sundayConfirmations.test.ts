import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
import { sundayResponseVersion } from '../src/lib/services/sundayConfirmationLogic.js';
const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts']);
const stamp = '2026-10-01T10:00:00Z';
const sunday = '2026-09-27';
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const person = async (first_name: string, member_status: string) => ctx.db.insert('people', { first_name, last_name: 'Test', member_status, created_at: stamp, updated_at: stamp });
    const leader = await person('Leader', 'leader'), other = await person('Other', 'leader');
    const member = await person('Member', 'member'), contact = await person('Contact', 'contact'), unassigned = await person('Unassigned', 'member'), outside = await person('Outside', 'guest');
    for (const [sub, role, person_id] of [['owner', 'owner', leader], ['leader', 'leader', leader], ['other', 'leader', other]] as const)
      await ctx.db.insert('crm_users', { external_auth_id: `https://test.example|${sub}`, role, person_id, status: 'active', can_view_confidential: role === 'owner', can_view_giving: role === 'owner', created_at: stamp, updated_at: stamp });
    for (const person_id of [member, contact]) await ctx.db.insert('follow_up_assignments', { person_id, assigned_leader_id: leader, status: 'active', assigned_at: stamp, created_at: stamp, updated_at: stamp });
    await ctx.db.insert('follow_up_assignments', { person_id: outside, assigned_leader_id: other, status: 'active', assigned_at: stamp, created_at: stamp, updated_at: stamp });
    // Co-leader scope must not steal the responsible leader's Sunday work.
    const program = await ctx.db.insert('meeting_programs', { code: 'TEST', name: 'Test Bacenta', category: 'bacenta', meeting_type: 'bacenta', default_format: 'in_person', active: true, created_at: stamp, updated_at: stamp });
    await ctx.db.insert('meeting_program_leaders', { program_id: program, person_id: other, is_primary: true, created_at: stamp });
    await ctx.db.insert('meeting_program_members', { program_id: program, person_id: member, status: 'active', joined_at: stamp });
    return { leader, other, member, contact, outside, unassigned };
  });
  const as = (sub: string) => t.withIdentity({ tokenIdentifier: `https://test.example|${sub}`, issuer: 'https://test.example', subject: sub });
  const dashboard = (sub = 'owner', date = sunday, leaderId?: any) => as(sub).query(api.crm.getDashboard, { serviceDate: date, ...(leaderId ? { leaderId } : {}) });
  const respond = async (personId: any, response: 'yes' | 'maybe' | 'no', sub = 'leader', date = sunday, note?: string) => {
    const data = await dashboard(sub, date), row = data.sunday_confirmation_roster.find((row: any) => row._id === personId)!;
    return as(sub).mutation(api.crm.recordSundayResponse, { personId, leaderId: row.assigned_leader_id!, serviceDate: date, response, expectedAssignmentId: row.assignment_id, expectedResponseVersion: sundayResponseVersion(row.sunday_commitment, row.attendance_plan), ...(note ? { note } : {}) });
  };
  return { t, ids, as, dashboard, respond };
}

describe('permanent responsibility with dated Sunday responses', () => {
  it('reads legacy member commitments, retains cancellation/correction history and can record again after an invalidated entry', async () => {
    const { ids, as, dashboard, respond, t } = await fixture();
    const yes = await as('leader').mutation(api.crm.recordCommitment, { personId: ids.member, leaderId: ids.leader, gatheringType: 'sunday_service', gatheringDate: sunday, response: 'yes' });
    const data = await dashboard('leader');
    expect(data.attendance_forecast.confirmed_members).toBe(1);
    expect(data.attendance_roster.find((row: any) => row._id === ids.member)?.attendance_plan?.status).toBe('confirmed');
    await as('owner').mutation(api.crm.resolveCommitment, { commitmentId: yes!._id, resolution: 'cancelled', note: 'Plans changed' });
    expect((await dashboard('leader')).attendance_forecast.confirmed_total).toBe(0);
    const cancelled = await t.run(ctx => ctx.db.get(yes!._id));
    expect(cancelled?.history?.at(-1)?.action).toBe('cancelled');
    await as('leader').mutation(api.corrections.correctCommitment, { commitmentId: yes!._id, expectedVersion: `${cancelled!.updated_at}:0`, reason: 'Original confirmation entered by mistake', date: sunday, enteredInError: true });
    expect((await dashboard('leader')).sunday_confirmation_roster.find((row: any) => row._id === ids.member)?.sunday_response).toBe('not_contacted');
    const recorded = await respond(ids.member, 'yes');
    expect(recorded?.history?.at(-1)?.action).toBe('recorded_again');
    expect(recorded?.correction_history).toHaveLength(1);
    expect((await dashboard('leader')).attendance_forecast.confirmed_members).toBe(1);
  });
  it('persists assigned members and contacts, starts each new Sunday uncontacted and never creates attendance', async () => {
    const { t, ids, dashboard, respond } = await fixture();
    const before = await dashboard('leader');
    expect(before.sunday_confirmation_roster.map((row: any) => row._id).sort()).toEqual([ids.member, ids.contact].sort());
    expect(before.attendance_forecast.confirmed_total).toBe(0);
    await respond(ids.member, 'yes'); await respond(ids.contact, 'yes');
    const current = await dashboard('leader');
    expect(current.attendance_forecast).toMatchObject({ confirmed_members: 1, confirmed_guests: 1, confirmed_total: 2, total_expected: 2 });
    const next = await dashboard('leader', '2026-10-11');
    expect(next.sunday_confirmation_roster).toHaveLength(2);
    expect(next.sunday_confirmation_roster.every((row: any) => row.sunday_response === 'not_contacted')).toBe(true);
    expect(next.attendance_forecast.confirmed_total).toBe(0);
    expect(await t.run(ctx => ctx.db.query('attendance').collect())).toEqual([]);
    expect(await t.run(ctx => ctx.db.query('follow_up_tasks').collect())).toEqual([]);
  });
  it('supports Maybe/No for members and contacts, dated notes, cancellations and reconfirmation on the same record', async () => {
    const { t, ids, respond, dashboard } = await fixture();
    for (const person of [ids.member, ids.contact]) {
      const yes = await respond(person, 'yes', 'leader', sunday, 'Coming');
      const maybe = await respond(person, 'maybe', 'leader', sunday, 'Transport uncertain');
      expect(maybe?._id).toBe(yes?._id); expect(maybe?.resolution).toBe('cancelled');
      expect(maybe?.history?.some(row => row.action === 'cancelled')).toBe(true);
      await respond(person, 'no', 'leader', sunday, 'Away');
      const data = await dashboard('leader');
      expect(data.sunday_confirmation_roster.find((row: any) => row._id === person)).toMatchObject({ sunday_response: 'no', response_note: 'Away' });
      expect(data.attendance_forecast.confirmed_total).toBe(0);
      const again = await respond(person, 'yes'); expect(again?.resolution).toBe('pending');
      await respond(person, 'no');
    }
    expect((await t.run(ctx => ctx.db.query('gathering_commitments').collect()))).toHaveLength(2);
  });
  it('uses current ownership after reassignment, preserves recorded history and denies former/co-leader writes and other task edits', async () => {
    const { t, ids, as, respond, dashboard } = await fixture();
    const yes = await respond(ids.member, 'yes');
    const old = (await dashboard('leader')).sunday_confirmation_roster.find((row: any) => row._id === ids.member)!;
    const task = await t.run(ctx => ctx.db.insert('follow_up_tasks', { person_id: ids.member, assigned_leader_id: ids.leader, status: 'open', due_date: sunday, task_type: 'sunday_confirmation', priority: 'normal', created_at: stamp, updated_at: stamp }));
    await expect(as('other').mutation(api.crm.recordSundayResponse, { personId: ids.member, leaderId: ids.other, serviceDate: sunday, response: 'no', expectedAssignmentId: old.assignment_id, expectedResponseVersion: sundayResponseVersion(old.sunday_commitment, old.attendance_plan) })).rejects.toThrow(/responsible leader/);
    await expect(as('other').mutation(api.crm.completeTask, { taskId: task, method: 'call', outcome: 'no_response' })).rejects.toThrow();
    await as('owner').mutation(api.crm.assignContact, { personId: ids.member, assignedLeaderId: ids.other, createFirstContactTask: false });
    expect((await dashboard('leader')).sunday_confirmation_roster.some((row: any) => row._id === ids.member)).toBe(false);
    expect((await dashboard('other')).sunday_confirmation_roster.find((row: any) => row._id === ids.member)).toMatchObject({ sunday_response: 'yes' });
    expect(await t.run(ctx => ctx.db.get(yes!._id))).toMatchObject({ leader_id: ids.leader });
    await expect(as('leader').mutation(api.crm.recordSundayResponse, { personId: ids.member, leaderId: ids.leader, serviceDate: sunday, response: 'no', expectedAssignmentId: old.assignment_id, expectedResponseVersion: sundayResponseVersion(old.sunday_commitment, old.attendance_plan) })).rejects.toThrow();
    await expect(as('leader').mutation(api.crm.completeTask, { taskId: task, method: 'call', outcome: 'no_response' })).rejects.toThrow();
    await expect(dashboard('leader', sunday, ids.other)).rejects.toThrow(/FORBIDDEN/);
  });
  it('rejects stale responses, invalid dates, restricted contacts and changes to resolved attendance', async () => {
    const { t, ids, as, dashboard, respond } = await fixture();
    const row = (await dashboard('leader')).sunday_confirmation_roster.find((row: any) => row._id === ids.member)!;
    const args = { personId: ids.member, leaderId: ids.leader, serviceDate: sunday, response: 'yes' as const, expectedAssignmentId: row.assignment_id, expectedResponseVersion: sundayResponseVersion(row.sunday_commitment, row.attendance_plan) };
    await expect(as('leader').mutation(api.crm.recordSundayResponse, { ...args, serviceDate: '2026-10-05' })).rejects.toThrow(/Sunday date/);
    await as('leader').mutation(api.crm.recordSundayResponse, args);
    await expect(as('leader').mutation(api.crm.recordSundayResponse, args)).rejects.toThrow(/response changed/);
    await t.run(ctx => ctx.db.patch(ids.contact, { contact_category: 'do_not_contact' }));
    await expect(respond(ids.contact, 'yes')).rejects.toThrow(/no contact/);
    await as('owner').mutation(api.services.record, { service_date: sunday, service_type: 'sunday_service', total_attendance: 1, guests_count: 0, salvation_decisions: 0, tithers_count: 0, attendanceData: [{ person_id: ids.member, first_timer: false, made_salvation_decision: false, gave_tithe: false }] });
    await expect(respond(ids.member, 'no')).rejects.toThrow(/attendance/);
    await expect(respond(ids.member, 'no', 'owner')).rejects.toThrow(/attendance/);
    await as('owner').mutation(api.services.record, { service_date: sunday, service_type: 'sunday_service', total_attendance: 1, guests_count: 1, salvation_decisions: 0, tithers_count: 0, attendanceData: [{ person_id: ids.outside, first_timer: true, made_salvation_decision: false, gave_tithe: false }] });
    await expect(respond(ids.outside, 'yes', 'owner')).rejects.toThrow(/attendance/);
  });
  it('deduplicates current Sunday evidence, honours corrected responses and exposes unassigned people only to admins', async () => {
    const { t, ids, as, dashboard, respond } = await fixture();
    await respond(ids.contact, 'yes');
    await t.run(async ctx => {
      await ctx.db.insert('gathering_commitments', { person_id: ids.contact, leader_id: ids.leader, gathering_type: 'sunday_service', gathering_date: sunday, response: 'no', resolution: 'pending', created_at: stamp, updated_at: '2099-01-01T10:00:00Z' });
      await ctx.db.insert('attendance_plans', { person_id: ids.member, service_date: sunday, status: 'confirmed', notes: 'Confidential legacy member note', created_at: stamp, updated_at: stamp });
    });
    const data = await dashboard('owner');
    expect(data.sunday_confirmation_roster.filter((row: any) => row._id === ids.contact)).toHaveLength(1);
    expect(data.attendance_forecast.confirmed_guests).toBe(0);
    expect(data.sunday_confirmation_roster.find((row: any) => row._id === ids.unassigned)?.assigned_leader_id).toBeNull();
    expect(JSON.stringify(await dashboard('leader'))).not.toContain('Confidential legacy');
    const filtered = await dashboard('owner', sunday, ids.other);
    expect(filtered.sunday_confirmation_roster.map((row: any) => row._id)).toEqual([ids.outside]);
    expect(filtered.attendance_roster).toHaveLength(0);
    expect(filtered.attendance_forecast.confirmed_total).toBe(0);
    await expect(as('leader').query(api.crm.getAssignmentDirectory, {})).rejects.toThrow();
  });
});
