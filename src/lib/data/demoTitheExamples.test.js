import {it,expect} from 'vitest';
import {addDemoTitheExamples} from './demoTitheExamples.js';
import {developmentGatherings} from '../utils/developmentRecords.js';
import {developmentEvidence} from '../utils/developmentEvidence.js';
it('supplies explicit dated demo tithe examples with different monthly patterns and consistent aggregates',()=>{
 const services=['05-03','06-07','06-14','07-05','08-02'].map((d,i)=>({id:String(i),service_date:`2026-${d}`,service_type:'sunday_service',total_attendance:10,tithers_count:5}));
 const attendance=services.flatMap(s=>['1','2','4'].map(person_id=>({service_id:s.id,person_id})));
 addDemoTitheExamples(services,attendance);
 const profile=id=>({opportunities:developmentGatherings(services),attendance:attendance.filter(r=>r.person_id===id).map(r=>({...r,event_id:r.service_id,present:true}))});
 const range={from:'2026-06-01',to:'2026-08-31'},now=new Date('2026-09-08T12:00:00Z');
 expect(developmentEvidence(profile('1'),range,null,now).tithing.recorded).toBe(3);
 expect(developmentEvidence(profile('2'),range,null,now).tithing.recorded).toBe(2);
 expect(developmentEvidence(profile('4'),range,null,now).tithing.recorded).toBe(0);
 expect(attendance.filter(r=>r.person_id==='1'&&['1','2'].includes(r.service_id)&&r.gave_tithe)).toHaveLength(1);
 expect(services.every(s=>s.tithers_count===s.unnamed_tithers_count+attendance.filter(r=>r.service_id===s.id&&r.gave_tithe).length)).toBe(true);
});
