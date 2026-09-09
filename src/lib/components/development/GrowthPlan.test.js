import { describe,it,expect,vi,afterEach } from 'vitest';
import { render,fireEvent,cleanup,waitFor } from '@testing-library/svelte';
import GrowthPlan from './GrowthPlan.svelte';
import { createGrowthAgreement,reviewGrowthAgreement } from '$lib/services/peopleService.js';
vi.mock('$lib/services/peopleService.js',()=>({createGrowthAgreement:vi.fn(),reviewGrowthAgreement:vi.fn()}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const agreement={_id:'agreement',action:'Read together',status:'in_progress',agreed_date:'2026-01-01',created_at:'2026-01-01T12:00:00Z',created_by_name:'Leader'};
describe('growth agreement workflow',()=>{
 it('keeps the draft and idempotency key after failure and refreshes after a successful retry',async()=>{
  const onsave=vi.fn();const ui=render(GrowthPlan,{personId:'p',allowed:true,onsave});
  await fireEvent.click(ui.getByRole('button',{name:'Add agreement'}));
  await fireEvent.input(ui.getByLabelText('Agreed action'),{target:{value:'Read together'}});
  createGrowthAgreement.mockResolvedValueOnce({error:new Error('Connection failed')});
  await fireEvent.submit(ui.getByRole('form',{name:'Add growth agreement'}));
  await waitFor(()=>expect(ui.getByRole('alert').textContent).toContain('Connection failed'));
  const key=createGrowthAgreement.mock.calls[0][1].requestId;
  expect(ui.getByLabelText('Agreed action').value).toBe('Read together');
  createGrowthAgreement.mockResolvedValueOnce({data:agreement});
  await fireEvent.submit(ui.getByRole('form',{name:'Add growth agreement'}));
  await waitFor(()=>expect(onsave).toHaveBeenCalledOnce());
  expect(createGrowthAgreement.mock.calls[1][1].requestId).toBe(key);
  expect(ui.queryByRole('form')).toBeNull();
 });
 it('shows saved history and submits a dated progress review for the correct agreement',async()=>{
  const onsave=vi.fn();const ui=render(GrowthPlan,{personId:'p',allowed:true,agreements:[agreement],reviews:[{agreement_id:'agreement',note:'First conversation',review_date:'2026-01-02',created_at:'2026-01-02T12:00:00Z',created_by_name:'Leader',status:'in_progress'}],onsave});
  expect(ui.getByText('Review history (1)')).toBeDefined();
  expect(ui.getByText('First conversation')).toBeDefined();
  await fireEvent.click(ui.getByRole('button',{name:'Review progress'}));
  await fireEvent.input(ui.getByLabelText('Progress note'),{target:{value:'Finished reading'}});
  await fireEvent.click(ui.getByRole('button',{name:'Status'}));
  await fireEvent.click(ui.getByRole('button',{name:'Completed',exact:true}));
  reviewGrowthAgreement.mockResolvedValueOnce({data:{}});
  await fireEvent.submit(ui.getByRole('form',{name:'Review growth agreement'}));
  await waitFor(()=>expect(onsave).toHaveBeenCalledOnce());
  expect(reviewGrowthAgreement).toHaveBeenCalledWith('agreement',expect.objectContaining({note:'Finished reading',status:'completed',requestId:expect.any(String)}));
 });
 it('hides agreement content without confidential access',()=>{
  const ui=render(GrowthPlan,{personId:'p',allowed:false,agreements:[agreement]});
  expect(ui.queryByText('Read together')).toBeNull();
  expect(ui.queryByRole('button',{name:'Add agreement'})).toBeNull();
 });
});
