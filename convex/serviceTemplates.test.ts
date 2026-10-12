import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts']);

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const person = await ctx.db.insert('people', { first_name: 'Usual', last_name: 'Guest', member_status: 'guest', created_at: '2026-10-11', updated_at: '2026-10-11' });
    const archived = await ctx.db.insert('people', { first_name: 'Archived', last_name: 'Guest', member_status: 'archived', created_at: '2026-10-11', updated_at: '2026-10-11' });
    for (const role of ['owner', 'admin', 'leader', 'viewer'] as const) await ctx.db.insert('crm_users', { external_auth_id: `https://test.example/|${role}`, role, status: 'active', can_view_confidential: role === 'owner', created_at: '2026-10-11', updated_at: '2026-10-11' });
    return { person, archived };
  });
  const as = (role: string) => t.withIdentity({ issuer: 'https://test.example/', subject: role, tokenIdentifier: `https://test.example/|${role}` });
  return { t, ids, as };
}

describe('shared Sunday defaults', () => {
  it('stores one deduplicated template across administrators without recording attendance or confirmations', async () => {
    const { t, ids, as } = await fixture();
    await as('owner').mutation(api.serviceTemplates.save, { service_time: '10:30', location: ' Church hall ', expected_person_ids: [ids.person, ids.person] });
    expect(await as('admin').query(api.serviceTemplates.get, {})).toMatchObject({ location: 'Church hall', expected_person_ids: [ids.person] });
    await as('admin').mutation(api.serviceTemplates.save, { service_time: '11:00', location: '', expected_person_ids: [] });
    await t.run(async ctx => {
      expect(await ctx.db.query('service_templates').collect()).toHaveLength(1);
      for (const table of ['services', 'attendance', 'attendance_plans', 'gathering_commitments', 'follow_up_tasks'] as const) expect(await ctx.db.query(table).collect()).toHaveLength(0);
    });
    await expect(as('leader').mutation(api.serviceTemplates.save, { service_time: '09:00', location: '', expected_person_ids: [] })).rejects.toThrow();
    await expect(as('viewer').mutation(api.serviceTemplates.save, { service_time: '09:00', location: '', expected_person_ids: [] })).rejects.toThrow();
    expect(await as('leader').query(api.serviceTemplates.get, {})).toBeNull();
    await expect(t.query(api.serviceTemplates.get, {})).rejects.toThrow();
  });
  it('rejects invalid times and archived people without replacing the saved defaults', async () => {
    const { ids, as } = await fixture();
    const data = { service_time: '09:00', location: 'Hall', expected_person_ids: [ids.person] };
    await as('owner').mutation(api.serviceTemplates.save, data);
    await expect(as('owner').mutation(api.serviceTemplates.save, { ...data, service_time: '25:90' })).rejects.toThrow(/valid start time/);
    await expect(as('owner').mutation(api.serviceTemplates.save, { ...data, expected_person_ids: [ids.archived] })).rejects.toThrow(/active people/);
    expect(await as('owner').query(api.serviceTemplates.get, {})).toMatchObject(data);
  });
});

it('protects referenced people from deletion and keeps their usual place after a reviewed merge', async () => {
  const { t, ids, as } = await fixture();
  const target = await t.run(ctx => ctx.db.insert('people', { first_name: 'Retained', last_name: 'Guest', member_status: 'guest', created_at: '2026-10-11', updated_at: '2026-10-11' }));
  await as('owner').mutation(api.serviceTemplates.save, { service_time: '09:00', location: '', expected_person_ids: [ids.person, target] });
  await expect(as('owner').mutation(api.people.remove, { id: ids.person })).rejects.toThrow(/cannot be permanently deleted/);
  const review = await as('owner').query(api.people.getMergePreview, { sourceId: ids.person, targetId: target });
  expect(review.canMerge).toBe(true);
  await as('owner').mutation(api.people.mergeReviewed, { sourceId: ids.person, targetId: target, sourceUpdatedAt: review.sourceUpdatedAt, targetUpdatedAt: review.targetUpdatedAt });
  expect(await as('owner').query(api.serviceTemplates.get, {})).toMatchObject({ expected_person_ids: [target] });
});
