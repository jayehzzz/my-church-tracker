import { describe, expect, it } from 'vitest';
import { developmentEvidence, monthRange, developmentPeriod } from './developmentEvidence.js';
import { developmentGatherings } from './developmentRecords.js';
const now=new Date('2026-09-08T12:00:00Z'), range={from:'2026-06-01',to:'2026-08-31'};
const g=(id,date,extra={})=>({id,date,kind:'meeting',program_id:'prayer',name:'Prayer',category:'prayer',register_known:true,...extra});
describe('development evidence',()=>{
 it('keeps calendar dates correct in BST and includes current day',()=>{
  expect(developmentPeriod('three',now)).toEqual(range);
  expect(developmentPeriod('month',now)).toEqual({from:'2026-09-01',to:'2026-09-08'});
 });
 it('counts complete boundary months, excludes partial/current months and invalid dates',()=>{
  expect(monthRange(range,now)).toEqual(['2026-06','2026-07','2026-08']);
  expect(monthRange({from:'2026-06-15',to:'2026-08-20'},now)).toEqual(['2026-07']);
  expect(monthRange({from:'2026-09-01',to:'2026-09-08'},now)).toEqual([]);
  expect(monthRange({from:'2026-02-30',to:'2026-03-31'},now)).toEqual([]);
 });
 it('matches exact events, deduplicates records, excludes unknown/cancelled/future registers',()=>{
  const profile={opportunities:[g('1','2026-06-03'),g('2','2026-06-03'),g('3','2026-06-05',{register_known:false}),g('4','2026-06-10',{status:'cancelled'}),g('5','2026-09-20')],attendance:[{event_id:'1',present:true},{event_id:'1',present:true},{event_id:'2',present:true},{event_id:'3',present:true},{event_id:'4',present:true},{event_id:'missing',present:true}]};
  const a=developmentEvidence(profile,range,null,now).axes[1];
  expect(a.meetings).toEqual({attended:2,offered:2});expect(a.weeks).toEqual({attended:1,offered:1});expect(a.unknown).toBe(1);
  expect(developmentEvidence(profile,range,[],now).axes[1].meetings).toEqual({attended:0,offered:0});
 });
 it('keeps programme metadata for programmes the person has never attended',()=>{
  const gatherings=developmentGatherings([], [{_id:'a',meeting_date:'2026-06-03',program_id:'p',meeting_type:'custom_prayer',status:'completed'}],[{_id:'p',name:'Evening prayer',category:'prayer',notes:'private'}]);
  expect(gatherings[0]).toMatchObject({category:'prayer',program_id:'p',name:'Evening prayer'});expect(gatherings[0]).not.toHaveProperty('notes');
  expect(developmentEvidence({opportunities:gatherings,attendance:[]},range,null,now).axes[1].meetings).toEqual({attended:0,offered:1});
 });
 it('counts giving dates independently of programmes, without inventing records from the profile flag',()=>{
  const profile={person:{is_tither:true},opportunities:[g('old','2026-05-03'),g('1','2026-06-03'),g('2','2026-06-10'),g('3','2026-08-10')],attendance:[{event_id:'old',present:true},{event_id:'1',gave_tithe:true},{event_id:'2',gave_tithe:true},{event_id:'3',gave_tithe:true}]};
  const t=developmentEvidence(profile,range,[],now).tithing;
  expect(t.eligible).toBe(3);expect(t.recorded).toBe(2);expect(t.months[0].dates).toEqual(['2026-06-03','2026-06-10']);
 });
 it('does not mark months without any personal history as confirmed eligible months',()=>{
  const result=developmentEvidence({person:{is_tither:true},opportunities:[g('1','2026-06-03')],attendance:[]},range,null,now);
  expect(result.tithing.eligible).toBe(0);expect(result.tithing.months.every(m=>m.reason==='Recorded history unavailable')).toBe(true);
 });
 it('requires the earliest known service in the period, deduplicates people and excludes future returns',()=>{
  const profile={invitedPeople:[{id:'old',service_dates:['2026-05-01','2026-06-05','2026-06-12']},{id:'new',service_dates:['2026-07-10','2026-07-03','2026-07-03']},{id:'new',service_dates:['2026-07-03','2026-07-10']},{id:'later',service_dates:['2026-08-30','2026-09-13']}],collectedContacts:[{id:'1',contact_date:'2026-06-01'},{id:'1',contact_date:'2026-06-01'}]};
  expect(developmentEvidence(profile,range,null,now).outreach).toMatchObject({collected:1,brought:2,returned:1});
 });
});
