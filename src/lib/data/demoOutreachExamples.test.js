import {it,expect} from 'vitest';
import {addDemoOutreachExamples} from './demoOutreachExamples.js';
import {developmentEvidence} from '../utils/developmentEvidence.js';
it('derives different demo outreach counts from linked contacts and first/return records without duplicates',()=>{
 const people=[{id:'1'},{id:'2'}],attendance=[],contacts=[];
 const services=['06-07','06-14','06-21','07-05','07-12','07-19','08-02','08-09','08-16','08-23'].map((d,i)=>({id:`s${i}`,service_date:`2026-${d}`,service_type:'sunday_service',individuals:[],total_attendance:10,guests_count:2}));
 const now=new Date('2026-09-08T12:00:00Z');
 addDemoOutreachExamples(people,services,attendance,contacts,now);
 const profile=id=>({collectedContacts:contacts.filter(c=>c.collected_by_id===id),invitedPeople:contacts.filter(c=>c.invited_by_id===id).map(c=>({id:c.id,service_dates:attendance.filter(r=>r.person_id===c.id).map(r=>services.find(s=>s.id===r.service_id).service_date)}))});
 const range={from:'2026-06-01',to:'2026-08-31'};
 expect(developmentEvidence(profile('1'),range,null,now).outreach).toMatchObject({collected:5,brought:3,returned:2});
 expect(developmentEvidence(profile('2'),range,null,now).outreach).toMatchObject({collected:3,brought:2,returned:1});
 expect(contacts.some(c=>c.invited_by_id!==c.collected_by_id)).toBe(true);
 expect(services.reduce((n,s)=>n+s.total_attendance-10,0)).toBe(attendance.length);
 expect(developmentEvidence(profile('1'),{from:'2026-09-01',to:'2026-09-08'},null,now).outreach).toMatchObject({collected:0,brought:0,returned:0});
 const totals=services.map(s=>s.total_attendance);
 addDemoOutreachExamples(people,services,attendance,contacts,now);
 expect(contacts).toHaveLength(8);expect(attendance).toHaveLength(8);expect(services.map(s=>s.total_attendance)).toEqual(totals);
});
