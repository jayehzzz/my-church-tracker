import { convexTest } from 'convex-test';
import schema from '../../../convex/schema';
const modules = import.meta.glob(['../../../convex/**/*.ts', '!../../../convex/**/*.test.ts']);
const t = convexTest(schema, modules);
const owner = t.withIdentity({ tokenIdentifier: 'https://browser-fixture.example|owner', issuer: 'https://browser-fixture.example', subject: 'owner' });
const stamp = '2026-08-01T12:00:00Z';
let ids: any;
async function initialize() {
  if (ids) return;
  ids = await t.run(async ctx => {
    const person = await ctx.db.insert('people', {first_name:'Browser', last_name:'Guest', member_status:'guest', created_at:stamp, updated_at:stamp});
    const leader = await ctx.db.insert('people', {first_name:'Browser', last_name:'Leader', member_status:'leader', created_at:stamp, updated_at:stamp});
    await ctx.db.insert('crm_users', {external_auth_id:'https://browser-fixture.example|owner', person_id:leader, role:'owner', status:'active', can_view_confidential:true, created_at:stamp, updated_at:stamp});
    return {person, leader};
  });
  const { api } = await import('../../../convex/_generated/api');
  ids.commitment = (await owner.mutation(api.crm.recordCommitment, {personId:ids.person, leaderId:ids.leader, gatheringType:'sunday_service', gatheringDate:'2026-08-02', response:'yes'}))!._id;
  for (const service_time of ['10:00', '18:00']) await owner.mutation(api.services.record, {request_id:service_time, service_date:'2026-08-02', service_time, service_type:'sunday_service', total_attendance:2, guests_count:0, salvation_decisions:0, tithers_count:0, attendanceData:[]});
}
export async function request({kind, name, args = {}}: any) {
  await initialize();
  if (kind === 'state') return t.run(async ctx => ({ ids, people: await ctx.db.query('people').collect(), services: await ctx.db.query('services').collect(), attendance: await ctx.db.query('attendance').collect(), commitments: await ctx.db.query('gathering_commitments').collect(), care: await ctx.db.query('visitations').collect(), history: await ctx.db.query('follow_ups').collect(), tasks: await ctx.db.query('follow_up_tasks').collect(), meetings: await ctx.db.query('meetings').collect() }));
  if (kind !== 'query' && kind !== 'mutation') throw new Error('Unknown fixture request');
  return owner[kind](name, args);
}
