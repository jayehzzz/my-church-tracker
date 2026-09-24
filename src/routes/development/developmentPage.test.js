import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
const url=new URL('http://localhost/development?person=first&compare=second&period=custom&from=2026-06-01&to=2026-08-31&programs=prayer');
vi.mock('$app/stores', () => ({ page: writable({url}) }));
vi.mock('$app/navigation', () => ({goto:vi.fn(),beforeNavigate:vi.fn()}));
vi.mock('$lib/auth/session.js', () => ({session:writable({status:'authenticated',user:{id:'account',role:'owner',canViewConfidential:true}})}));
vi.mock('$lib/convex.js', () => ({isDemoMode:()=>false,getConvexHttpClient:()=>null,getConvexClient:async()=>null}));
vi.mock('$lib/components/layout/DashboardLayout.svelte', async()=>({default:(await import('../pipeline/TestLayout.svelte')).default}));
vi.mock('svelte/transition',()=>({fade:()=>({}),fly:()=>({}),scale:()=>({})}));
const profiles=[
 {person:{id:'first',first_name:'Alex',last_name:'One',member_status:'member'},opportunities:[{id:'m1',date:'2026-06-03',kind:'meeting',program_id:'prayer',name:'Prayer',category:'prayer',register_known:true}],attendance:[]},
 {person:{id:'second',first_name:'Alex',last_name:'Two',member_status:'member'},opportunities:[{id:'m2',date:'2026-06-04',kind:'meeting',program_id:'prayer',name:'Prayer',category:'prayer',register_known:true}],attendance:[{event_id:'m2',present:true}]},
];
vi.mock('$lib/services/peopleService.js',()=>({getAll:async()=>({data:profiles.map(p=>p.person),error:null}),getDevelopmentSummary:async()=>({data:profiles,error:null}),formatJourneyStatus:()=> 'Member'}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('restores the selected programme and Series B drilldown after an in-memory page return',async()=>{
 vi.stubGlobal('scrollTo',vi.fn());
 const {default:Page}=await import('./+page.svelte');
 const view=render(Page);
 await waitFor(()=>expect(view.getByRole('button',{name:'View Series B Alex Two Prayer meetings details'})).toBeInTheDocument());
 await fireEvent.click(view.getByRole('button',{name:'View Series B Alex Two Prayer meetings details'}));
 expect(view.getByRole('dialog',{name:'Prayer meetings'})).toHaveTextContent('Alex Two');
 const saved=view.component.snapshot.capture();
 view.unmount();
 const returned=render(Page);
 returned.component.snapshot.restore(saved);
 await waitFor(()=>expect(returned.getByRole('dialog',{name:'Prayer meetings'})).toHaveTextContent('Alex Two'));
 expect(returned.getByRole('dialog')).toHaveTextContent('4 Jun 2026');
 expect(url.searchParams.get('programs')).toBe('prayer');
 expect(returned.getByRole('dialog')).not.toHaveTextContent('Alex One');
 await new Promise(resolve => requestAnimationFrame(resolve));
});
