import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import AssignmentManager from './AssignmentManager.svelte';
import { getAssignmentDirectory, batchAssignContacts } from '$lib/services/followUpCrmService.js';
vi.mock('$lib/services/followUpCrmService.js', () => ({getAssignmentDirectory:vi.fn(),batchAssignContacts:vi.fn()}));
const people = [
  {_id:'member',name:'Ama Member',member_status:'member',assignment_id:null,assigned_leader_id:null,open_follow_up_count:0},
  {_id:'contact',name:'Kojo Contact',member_status:'contact',assignment_id:'assignment-old',assigned_leader_id:'old',assigned_leader_name:'Old Leader',open_follow_up_count:2},
  {_id:'blocked',name:'Paused Person',member_status:'guest',assignment_id:null,blocked_reason:'Asked not to be contacted',open_follow_up_count:0},
  {_id:'next',name:'New Leader',member_status:'leader',assignment_id:null,open_follow_up_count:0},
];
beforeEach(() => { vi.resetAllMocks(); getAssignmentDirectory.mockResolvedValue({data:people,error:null}); });
describe('Follow-up assignment management', () => {
  it('searches members and current leaders, and assigns a member without scheduling outreach', async () => {
    const onChanged = vi.fn();
    batchAssignContacts.mockResolvedValue({data:[{}],succeededPersonIds:['member'],errors:[]});
    const screen = render(AssignmentManager, {onChanged});
    await waitFor(() => expect(screen.getByLabelText('Select Ama Member')).toBeDefined());
    await fireEvent.input(screen.getByLabelText('Search people'),{target:{value:'Ama'}});
    expect(screen.queryByLabelText('Select Kojo Contact')).toBeNull();
    await fireEvent.change(screen.getByLabelText('Responsible leader'),{target:{value:'next'}});
    await fireEvent.click(screen.getByLabelText('Select Ama Member'));
    await fireEvent.click(screen.getByRole('button',{name:'Assign selected'}));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(batchAssignContacts).toHaveBeenCalledWith(['member'],'next',undefined,{createFirstContactTask:false,expectedAssignments:{member:null}});
    expect(screen.getByText('1 person assigned.')).toBeDefined();
  });

  it('reports each partial failure, clears only successes and retains failed selections', async () => {
    batchAssignContacts.mockResolvedValue({data:[{}],succeededPersonIds:['member'],errors:[{personId:'contact',error:new Error('Assignment changed since this list was loaded. Refresh and try again.')}],error:new Error('1 assigned; 1 failed')});
    const screen = render(AssignmentManager);
    await waitFor(() => expect(screen.getByLabelText('Select Kojo Contact')).toBeDefined());
    await fireEvent.change(screen.getByLabelText('Responsible leader'),{target:{value:'next'}});
    await fireEvent.click(screen.getByLabelText('Select Ama Member'));
    await fireEvent.click(screen.getByLabelText('Select Kojo Contact'));
    expect(screen.getByText('2 selected · 2 open tasks to transfer')).toBeDefined();
    await fireEvent.click(screen.getByRole('button',{name:'Assign selected'}));
    await waitFor(() => expect(screen.getByText('1 person assigned; 1 failed.')).toBeDefined());
    expect(screen.getByRole('alert')).toHaveTextContent(/Kojo Contact: Assignment changed/);
    expect(screen.getByLabelText('Select Kojo Contact')).toBeChecked();
    expect(screen.getByLabelText('Select Ama Member')).not.toBeChecked();
    expect(batchAssignContacts).toHaveBeenCalledWith(['member','contact'],'next',undefined,{createFirstContactTask:false,expectedAssignments:{member:null,contact:'assignment-old'}});
    await fireEvent.click(screen.getByRole('button',{name:'Refresh assignments'}));
    await waitFor(() => expect(screen.getByLabelText('Select Kojo Contact')).not.toBeChecked());
  });

  it('shows current responsibility, disables restricted people and offers individual reassignment', async () => {
    batchAssignContacts.mockResolvedValue({data:[{}],succeededPersonIds:['contact'],errors:[]});
    const screen = render(AssignmentManager);
    await waitFor(() => expect(screen.getByLabelText('Select Kojo Contact')).toBeDefined());
    expect(screen.getByText('Responsible: Old Leader')).toBeDefined();
    expect(screen.getByLabelText('Select Paused Person')).toBeDisabled();
    await fireEvent.input(screen.getByLabelText('Search people'),{target:{value:'Old Leader'}});
    await fireEvent.change(screen.getByLabelText('Responsible leader'),{target:{value:'next'}});
    await fireEvent.click(screen.getByRole('button',{name:'Change leader'}));
    expect(batchAssignContacts).toHaveBeenCalledWith(['contact'],'next',undefined,{createFirstContactTask:false,expectedAssignments:{contact:'assignment-old'}});
  });

  it('shows a failed directory read and retries without presenting an empty church', async () => {
    getAssignmentDirectory.mockResolvedValueOnce({data:null,error:new Error('Connection unavailable')});
    const screen = render(AssignmentManager);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Connection unavailable'));
    await fireEvent.click(screen.getByRole('button',{name:'Retry assignments'}));
    await waitFor(() => expect(screen.getByLabelText('Select Ama Member')).toBeDefined());
  });
});
