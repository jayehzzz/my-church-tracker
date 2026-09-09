import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts']);
const date = '2026-01-01T12:00:00.000Z';
const review = { focus: 'preparing_to_lead' as const, understanding: 'Discussed foundations and questions together.', next_step: 'Meet again to discuss the next chapter.', conversation_date: '2026-01-01', next_review_date: '2026-01-15' };
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const person = await ctx.db.insert('people', { first_name: 'Growing', last_name: 'Member', member_status: 'member', created_at: date, updated_at: date });
    const other = await ctx.db.insert('people', { first_name: 'Other', last_name: 'Member', member_status: 'member', created_at: date, updated_at: date });
    const leader = await ctx.db.insert('people', { first_name: 'Leader', last_name: 'Person', member_status: 'leader', created_at: date, updated_at: date });
    const author = await ctx.db.insert('crm_users', { external_auth_id: 'https://identity.example/|leader', role: 'leader', person_id: leader, display_name: 'Pastoral Leader', status: 'active', can_view_confidential: true, created_at: date, updated_at: date });
    await ctx.db.insert('crm_users', { external_auth_id: 'https://identity.example/|admin', role: 'admin', status: 'active', can_view_confidential: false, created_at: date, updated_at: date });
    const assignment = await ctx.db.insert('follow_up_assignments', { person_id: person, assigned_leader_id: leader, status: 'active', assigned_at: date, created_at: date, updated_at: date });
    return { person, other, author, assignment };
  });
  const as = (subject: string) => t.withIdentity({ issuer: 'https://identity.example/', subject, tokenIdentifier: `https://identity.example/|${subject}` });
  return { t, ids, as };
}

describe('discipleship conversations', () => {
  it('keeps growth-agreement progress append-only and scoped to an assigned confidential leader', async () => {
    const { t, ids, as } = await fixture();
    const agreement = await as('leader').mutation(api.people.createGrowthAgreement, { personId: ids.person, action: 'Read one chapter and discuss it together.', agreedDate: '2026-01-01' });
    await as('leader').mutation(api.people.reviewGrowthAgreement, { agreementId: agreement!._id, note: 'Discussed the first chapter.', reviewDate: '2026-01-08', status: 'in_progress', requestId: 'progress-1' });
    await as('leader').mutation(api.people.reviewGrowthAgreement, { agreementId: agreement!._id, note: 'Completed the agreed reading.', reviewDate: '2026-01-15', status: 'completed', requestId: 'progress-2' });
    const rows = await t.run(ctx => ctx.db.query('growth_agreement_reviews').withIndex('by_agreement', q => q.eq('agreement_id', agreement!._id)).collect());
    expect(rows).toHaveLength(2);
    expect((await t.run(ctx => ctx.db.get(agreement!._id)))?.status).toBe('completed');
    await expect(as('leader').mutation(api.people.createGrowthAgreement, { personId: ids.other, action: 'Out of scope.', agreedDate: '2026-01-01' })).rejects.toThrow();
    await expect(as('admin').mutation(api.people.createGrowthAgreement, { personId: ids.person, action: 'No confidential grant.', agreedDate: '2026-01-01' })).rejects.toThrow(/FORBIDDEN/);
  });
  it('does not silently count inaccessible gathering details as no attendance', async () => {
    const { t, ids, as } = await fixture();
    await t.run(async ctx => {
      const service = await ctx.db.insert('services', { service_date: '2026-01-01', service_type: 'sunday_service', created_at: date });
      const meeting = await ctx.db.insert('meetings', { meeting_date: '2026-01-01', meeting_type: 'bacenta', created_at: date });
      await ctx.db.insert('attendance', { person_id: ids.person, service_id: service, created_at: date });
      await ctx.db.insert('meeting_attendance', { person_id: ids.person, meeting_id: meeting, attended: true, created_at: date });
    });
    await expect(as('leader').query(api.attendance.getByPerson, { personId: ids.person })).rejects.toThrow(/unavailable/);
    await expect(as('leader').query(api.meetings.getByPerson, { personId: ids.person })).rejects.toThrow(/unavailable/);
    expect(await as('admin').query(api.attendance.getByPerson, { personId: ids.person })).toHaveLength(1);
    expect(await as('admin').query(api.meetings.getByPerson, { personId: ids.person })).toHaveLength(1);
  });
  it('retains reviews with server-attributed authors and preserves membership', async () => {
    const { t, ids, as } = await fixture();
    await as('leader').mutation(api.people.addDiscipleshipReview, { id: ids.person, ...review });
    await as('leader').mutation(api.people.addDiscipleshipReview, { id: ids.person, ...review, understanding: 'Second conversation.' });
    const reloaded = await as('leader').query(api.people.getById, { id: ids.person });
    expect(reloaded?.member_status).toBe('member');
    expect(reloaded?.discipleship_reviews).toHaveLength(2);
    expect(reloaded?.discipleship_reviews?.[0]).toMatchObject({ recorded_by_user_id: ids.author, recorded_by_name: 'Pastoral Leader', understanding: review.understanding });
    expect(await t.run(ctx => ctx.db.query('security_audit').collect())).toHaveLength(2);
    const redacted = await as('admin').query(api.people.getById, { id: ids.person });
    expect(redacted).not.toHaveProperty('discipleship_reviews');
  });
  it('requires confidential access, active assignment, and rejects forged author fields', async () => {
    const { t, ids, as } = await fixture();
    await expect(as('admin').mutation(api.people.addDiscipleshipReview, { id: ids.person, ...review })).rejects.toThrow(/FORBIDDEN/);
    await expect(as('leader').mutation(api.people.addDiscipleshipReview, { id: ids.other, ...review })).rejects.toThrow();
    await expect(as('leader').mutation(api.people.addDiscipleshipReview, { id: ids.person, ...review, recorded_by_name: 'Someone else' } as any)).rejects.toThrow();
    await t.run(ctx => ctx.db.patch(ids.assignment, { status: 'ended' }));
    await expect(as('leader').mutation(api.people.addDiscipleshipReview, { id: ids.person, ...review })).rejects.toThrow();
  });
  it('rejects blank reviews and invalid or future dates without writing', async () => {
    const { t, ids, as } = await fixture();
    for (const invalid of [{ understanding: '  ' }, { next_step: '' }, { conversation_date: '2026-02-30' }, { conversation_date: '2099-01-01' }, { next_review_date: '2025-01-01' }]) {
      await expect(as('leader').mutation(api.people.addDiscipleshipReview, { id: ids.person, ...review, ...invalid })).rejects.toThrow();
    }
    expect((await t.run(ctx => ctx.db.get(ids.person)))?.discipleship_reviews).toBeUndefined();
  });
});

describe('development evidence and agreement safety', () => {
  it('returns exact event IDs and programme denominators without exposing programme private fields', async () => {
    const { t, ids, as } = await fixture();
    const events = await t.run(async ctx => {
      const program = await ctx.db.insert('meeting_programs', { code:'evening',name:'Evening prayer',meeting_type:'prayer',category:'prayer',default_format:'online',online_url:'https://private.example/room',description:'Private details',active:true,created_at:date,updated_at:date });
      const first = await ctx.db.insert('meetings', { program_id:program,meeting_date:'2026-01-03',meeting_type:'prayer',status:'completed',created_at:date });
      const second = await ctx.db.insert('meetings', { program_id:program,meeting_date:'2026-01-03',meeting_type:'prayer',status:'completed',created_at:date });
      await ctx.db.insert('meetings', { program_id:program,meeting_date:'2025-12-01',meeting_type:'prayer',status:'completed',created_at:date });
      await ctx.db.insert('meeting_attendance', { person_id:ids.person,meeting_id:first,attended:true,gave_tithe:true,created_at:date });
      return { first,second,program };
    });
    const [summary] = await as('leader').query(api.people.getDevelopmentSummary, { ids:[ids.person],from:'2026-01-01',to:'2026-01-31' });
    expect(summary.opportunities).toHaveLength(2);
    expect(summary.opportunities.map(g=>g.id)).toEqual(expect.arrayContaining([events.first,events.second]));
    expect(summary.opportunities[1]).toMatchObject({name:'Evening prayer',category:'prayer',register_known:true});
    expect(JSON.stringify(summary)).not.toContain('private.example');
    expect(JSON.stringify(summary)).not.toContain('Private details');
    expect(summary.attendance).toEqual([{event_id:events.first,present:true,gave_tithe:true}]);
    expect(summary.outreachComplete).toBe(false);
    const [redacted] = await as('admin').query(api.people.getDevelopmentSummary,{ids:[ids.person]});
    expect(redacted.givingAvailable).toBe(false);
    expect(redacted.attendance[0].gave_tithe).toBeUndefined();
    await expect(as('leader').query(api.people.getDevelopmentSummary,{ids:[ids.person,ids.other]})).rejects.toThrow(/unavailable/);
  });
  it('deduplicates save retries, preserves review history when reopening and redacts agreements', async () => {
    const { t, ids, as } = await fixture();
    const args = {personId:ids.person,action:'Read and discuss together',agreedDate:'2026-01-01',requestId:'create-retry'};
    const a = await as('leader').mutation(api.people.createGrowthAgreement,args);
    const retry = await as('leader').mutation(api.people.createGrowthAgreement,args);
    expect(retry?._id).toBe(a?._id);
    const progress = {agreementId:a!._id,note:'Agreed action completed',reviewDate:'2026-01-08',status:'completed' as const,requestId:'review-retry'};
    await as('leader').mutation(api.people.reviewGrowthAgreement,progress);
    await as('leader').mutation(api.people.reviewGrowthAgreement,progress);
    await as('leader').mutation(api.people.reviewGrowthAgreement,{...progress,note:'Continue with the next chapter',status:'in_progress',requestId:'reopen'});
    const [summary] = await as('leader').query(api.people.getDevelopmentSummary,{ids:[ids.person]});
    expect(summary.agreements).toHaveLength(1);
    expect(summary.agreementReviews).toHaveLength(2);
    expect(summary.agreements[0].status).toBe('in_progress');
    expect(summary.agreements[0].completed_at).toBeUndefined();
    const [redacted] = await as('admin').query(api.people.getDevelopmentSummary,{ids:[ids.person]});
    expect(redacted.agreements).toEqual([]);expect(redacted.agreementReviews).toEqual([]);
    for (const invalid of [{agreedDate:'2099-01-01'},{agreedDate:'2026-02-30'},{nextReviewDate:'2025-01-01'},{supportingPersonId:ids.other}]) {
      await expect(as('leader').mutation(api.people.createGrowthAgreement,{...args,requestId:undefined,...invalid})).rejects.toThrow();
    }
    await expect(as('leader').mutation(api.people.reviewGrowthAgreement,{...progress,reviewDate:'2025-01-01'})).rejects.toThrow();
    expect((await t.run(ctx=>ctx.db.get(ids.person)))?.member_status).toBe('member');
  });
  it('captures collector separately from inviter and permits correcting that attribution', async () => {
    const { ids, as } = await fixture();
    const contact = await as('admin').mutation(api.evangelism.create,{first_name:'Contact',response:'not_assessed',contact_date:'2026-01-01',collected_by_id:ids.person,invited_by_id:ids.other});
    const [summary] = await as('admin').query(api.people.getDevelopmentSummary,{ids:[ids.person]});
    expect(summary.collectedContacts.map(c=>c.id)).toContain(contact!._id);
    expect(summary.invitedPeople).toHaveLength(0);
    await as('admin').mutation(api.evangelism.update,{id:contact!._id,collected_by_id:null});
    const [corrected] = await as('admin').query(api.people.getDevelopmentSummary,{ids:[ids.person]});
    expect(corrected.collectedContacts).toHaveLength(0);
  });
});
