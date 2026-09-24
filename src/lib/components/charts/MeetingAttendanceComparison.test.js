import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import MeetingAttendanceComparison from './MeetingAttendanceComparison.svelte';
afterEach(cleanup);
const series = [
  {id:'a',label:'Prayer',points:[{date:'2026-09-09',total:90,id:'one'}]},
  {id:'b',label:'Bacenta',points:[{date:'2026-09-06',total:20,id:'two'},{date:'2026-09-13',total:40,id:'three'}]},
];
describe('meeting comparison details', () => {
  it('keeps meeting summaries based on actual meetings when grouping', async () => {
    const {getByLabelText,getByText,getByRole} = render(MeetingAttendanceComparison,{series});
    await fireEvent.change(getByLabelText('Chart time scale'),{target:{value:'month'}});
    expect(getByText('Meetings shown', {selector:'p'}).previousElementSibling).toHaveTextContent('3');
    expect(getByText('Average attendance').previousElementSibling).toHaveTextContent('50');
    await fireEvent.click(getByRole('button',{name:'Bar',exact:true}));
    await fireEvent.click(getByRole('button',{name:'Bacenta, Sept 2026, 30 average attendance per meeting'}));
    expect(getByRole('dialog',{name:'Sept 2026'})).toHaveTextContent('30');
  });
  it('opens day details when no external record handler is supplied', async () => {
    const {getByRole} = render(MeetingAttendanceComparison,{series});
    await fireEvent.click(getByRole('button',{name:'Prayer, 9 Sept, 90 actual attendance'}));
    expect(getByRole('dialog',{name:'9 Sept'})).toHaveTextContent('90');
  });
});

it('plots the same programme as total and average without doubling meeting summaries', async () => {
  const {getByLabelText,getByRole,getByText}=render(MeetingAttendanceComparison,{series});
  await fireEvent.change(getByLabelText('Series A meeting type'),{target:{value:'b'}});
  await fireEvent.change(getByLabelText('Series B meeting type'),{target:{value:'b'}});
  await fireEvent.change(getByLabelText('Primary calculation'),{target:{value:'total'}});
  await fireEvent.change(getByLabelText('Chart time scale'),{target:{value:'month'}});
  expect(getByRole('button',{name:'Bacenta, Sept 2026, 60 total attendance'})).toBeDefined();
  expect(getByRole('button',{name:'Bacenta, Sept 2026, 30 average attendance per meeting'})).toBeDefined();
  expect(getByText('Meetings shown',{selector:'p'}).previousElementSibling).toHaveTextContent('2');
});

it('passes the selected grouped programme and original meeting IDs to the page callback', async () => {
  const onDrilldown = vi.fn();
  const { getByLabelText, getByRole } = render(MeetingAttendanceComparison, { series, onDrilldown });
  await fireEvent.change(getByLabelText('Chart time scale'), { target: { value: 'month' } });
  await fireEvent.click(getByRole('button', { name: 'Bacenta, Sept 2026, 30 average attendance per meeting' }));
  expect(onDrilldown).toHaveBeenCalledTimes(1);
  expect(onDrilldown.mock.lastCall[0].choices[0]).toMatchObject({ programmeId: 'b', mode: 'average', sourceIds: ['two', 'three'] });
});
