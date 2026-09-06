import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GatheringAttendanceDialog from './GatheringAttendanceDialog.svelte';
import { getGatheringChoices } from '$lib/services/followUpCrmService.js';
vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));
vi.mock('$lib/services/followUpCrmService.js',()=>({getGatheringChoices:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
describe('actual attendance selection',()=>{
  it('requires explicit selection when two gatherings share a date',async()=>{
    getGatheringChoices.mockResolvedValue({data:[{serviceId:'morning',label:'Morning service'},{serviceId:'evening',label:'Evening service'}]});
    const save=vi.fn().mockResolvedValue({});
    render(GatheringAttendanceDialog,{isOpen:true,gatheringDate:'2026-08-02',personName:'Test Guest',onconfirm:save});
    await screen.findByRole('option',{name:'Evening service'});
    expect(screen.getByRole('button',{name:'Save attendance'})).toBeDisabled();
    await fireEvent.change(screen.getByLabelText('Gathering attended'),{target:{value:'evening'}});
    await fireEvent.click(screen.getByRole('button',{name:'Save attendance'}));
    await waitFor(()=>expect(save).toHaveBeenCalledWith({serviceId:'evening'}));
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('keeps a failed save visible for retry without claiming attendance was recorded',async()=>{
    getGatheringChoices.mockResolvedValue({data:[{meetingId:'meeting',label:'Bacenta meeting'}]});
    const save=vi.fn().mockResolvedValue({error:new Error('Attendance request failed')});
    render(GatheringAttendanceDialog,{isOpen:true,gatheringDate:'2026-08-02',onconfirm:save});
    await screen.findByRole('option',{name:'Bacenta meeting'});
    await fireEvent.click(screen.getByRole('button',{name:'Save attendance'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Attendance request failed');
    expect(screen.getByRole('button',{name:'Save attendance'})).toBeEnabled();
  });
  it('does not invent a gathering when none exists',async()=>{
    getGatheringChoices.mockResolvedValue({data:[]});
    const save=vi.fn();
    render(GatheringAttendanceDialog,{isOpen:true,gatheringDate:'2026-08-02',onconfirm:save});
    expect(await screen.findByRole('alert')).toHaveTextContent('No gathering exists');
    expect(screen.getByRole('button',{name:'Save attendance'})).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });
});
