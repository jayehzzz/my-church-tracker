import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import SearchableSelect from './SearchableSelect.svelte';
import { personOptions } from '$lib/utils/personOptions.js';
it('distinguishes similar names and expands to contacts explicitly', async () => {
  const onchange = vi.fn();
  const options = personOptions([
    {id:'contact',first_name:'Jayden',member_status:'contact'},
    {id:'leader',first_name:'Jayden',last_name:'Ayeh',member_status:'leader'},
    {id:'member',first_name:'Member',last_name:'Example',member_status:'member'},
  ]);
  render(SearchableSelect,{label:'Invited by',membersFirst:true,options,onchange});
  await fireEvent.click(screen.getByRole('button',{name:'Invited by'}));
  expect(screen.getByRole('button',{name:'Jayden Ayeh · Leader'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Jayden · Outreach contact'})).not.toBeInTheDocument();
  await fireEvent.click(screen.getByRole('button',{name:'Include outreach contacts and non-members'}));
  await fireEvent.click(screen.getByRole('button',{name:'Jayden · Outreach contact'}));
  expect(onchange).toHaveBeenCalledWith({value:'contact'});
  expect(screen.getByText('Jayden · Outreach contact')).toBeInTheDocument();
});
