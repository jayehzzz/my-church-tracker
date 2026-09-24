import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { openDrilldown } from '$lib/components/drilldown/selection.js';
import { developmentEvidence } from '$lib/utils/developmentEvidence.js';
import DevelopmentDrilldown from './DevelopmentDrilldown.svelte';
import ParticipationRadar from './ParticipationRadar.svelte';

afterEach(cleanup);
const range={from:'2026-06-01',to:'2026-08-31'};
const now=new Date('2026-09-08T12:00:00Z');
const g=(id,date,extra={})=>({id,date,kind:'meeting',program_id:'prayer',name:'Prayer meeting',category:'prayer',register_known:true,...extra});
const first={givingAvailable:true,person:{id:'first',first_name:'Alex',last_name:'One'},opportunities:[g('prior','2026-05-03'),g('a','2026-06-03'),g('b','2026-06-03'),g('unknown','2026-06-05',{register_known:false})],attendance:[{event_id:'prior',present:true},{event_id:'a',present:true,gave_tithe:true},{event_id:'b',gave_tithe:true}]};
const second={person:{id:'second',first_name:'Alex',last_name:'Two'},opportunities:[g('other','2026-06-08')],attendance:[{event_id:'other',present:true}],invitedPeople:[{id:'visitor',first_name:'Visitor',last_name:'Person',services:[{id:'sunday-1',date:'2026-06-07'},{id:'sunday-2',date:'2026-06-14'}]}]};
const profiles=[first,second];
const evidence=profiles.map(p=>({personId:p.person.id,data:developmentEvidence(p,range,null,now)}));
const show=view=>render(DevelopmentDrilldown,{state:openDrilldown(view),profiles,evidence,range});

it('uses the explicit comparison person ID even when display names match, then returns to the list',async()=>{
 const selected=vi.fn();
 const radar=render(ParticipationRadar,{axes:evidence[0].data.axes,comparison:evidence[1].data.axes,personId:'first',comparePersonId:'second',name:'Alex',compareName:'Alex',basis:'meetings',onSelect:selected});
 await fireEvent.click(radar.getByRole('button',{name:'View Series B Alex Prayer meetings details'}));
 expect(selected).toHaveBeenCalledWith(expect.objectContaining({personId:'second',axisKey:'prayer'}));
 radar.unmount();
 const view=show({kind:'attendance',title:'Prayer',personId:'first',axisKey:'prayer',basis:'weeks',comparisonAverage:true});
 expect(view.getByRole('dialog')).toHaveTextContent('1 recorded attendances / 1 offered weeks = 1.0');
 expect(view.getByRole('dialog')).toHaveTextContent('Register unknown · excluded');
 await fireEvent.click(view.getByRole('button',{name:/3 Jun 2026 · Prayer meeting · Recorded present/}));
 expect(view.getByRole('dialog')).toHaveTextContent('Attendance: Recorded present');
 await fireEvent.click(view.getByRole('button',{name:'Back to previous details'}));
 expect(view.getByRole('dialog')).toHaveTextContent('Week of 1 Jun 2026');
});
it('keeps two same-date giving events under one date and labels the event as giving',async()=>{
 const view=show({kind:'giving',title:'June giving',personId:'first',month:'2026-06'});
 expect(view.getByRole('dialog')).toHaveTextContent('1 distinct recorded date');
 const rows=view.getAllByRole('button',{name:/Giving recorded · View meeting/});
 expect(rows).toHaveLength(2);
 await fireEvent.click(rows[1]);
 expect(view.getByRole('dialog')).toHaveTextContent('Giving recorded on 3 Jun 2026');
 expect(view.getByRole('dialog')).toHaveTextContent('Attendance: No attendance record');
 expect(view.getByRole('link',{name:'View meeting →'})).toHaveAttribute('href','/meetings?meeting=b');
});
it('shows distinct brought and returned Sunday evidence with exact service links',async()=>{
 const view=show({kind:'outreach',title:'Returned',personId:'second',metricKey:'returned',mode:'average',denominator:3});
 expect(view.getByRole('dialog')).toHaveTextContent('1 distinct person / 3 calendar months = 0.3 per month');
 expect(view.getByRole('dialog')).toHaveTextContent('2026-07: 0');
 await fireEvent.click(view.getByRole('button',{name:/Visitor Person.*returned 14 Jun 2026/}));
 expect(view.getByRole('dialog')).toHaveTextContent('First recorded Sunday: 7 Jun 2026');
 expect(view.getByRole('dialog')).toHaveTextContent('Return: 14 Jun 2026');
 expect(view.getByRole('link',{name:/14 Jun 2026 · View service/})).toHaveAttribute('href','/services?service=sunday-2');
});
it('keeps a restored dialog in loading state until the authorized summary arrives',async()=>{
 const state=openDrilldown({kind:'attendance',title:'Prayer',personId:'second',axisKey:'prayer',basis:'meetings'});
 const view=render(DevelopmentDrilldown,{state,profiles:[],evidence:[],range,loading:true});
 expect(view.getByRole('dialog')).toHaveTextContent('Loading development evidence');
 expect(view.getByRole('dialog')).not.toHaveTextContent('Evidence unavailable');
 await view.rerender({state,profiles,evidence,range,loading:false});
 expect(view.getByRole('dialog')).toHaveTextContent('Alex Two');
 expect(view.getByRole('dialog')).toHaveTextContent('Recorded present');
});
