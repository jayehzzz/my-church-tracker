import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import EvangelismOutcomes from './EvangelismOutcomes.svelte';
import OutreachDrilldown from '$lib/components/drilldown/OutreachDrilldown.svelte';
import { openDrilldown } from '$lib/components/drilldown/selection.js';
afterEach(cleanup);

it('keeps the selected outcome metric and average mode through the full-period record view', async () => {
  const rows = [
    { id: 'jan', full_name: 'Alice', contact_date: '2026-01-10', first_visit_date: '2026-04-01' },
    { id: 'mar', full_name: 'Bob', contact_date: '2026-03-10', member_status: 'member' },
  ];
  const selections = [];
  const view = render(EvangelismOutcomes, { metrics: { reached: 2, saved: 0, visited: 1, joined: 1 }, rows,
    periodRange: { startDate: '2026-01-01', endDate: '2026-03-31' }, onDrilldown: selection => selections.push(selection) });
  await fireEvent.change(view.getByRole('combobox', { name: 'Primary metric' }), { target: { value: 'visited' } });
  await fireEvent.change(view.getByRole('combobox', { name: 'Primary calculation' }), { target: { value: 'average' } });
  await fireEvent.click(view.getByRole('button', { name: /Series A · First timers/ }));
  expect(selections[0].choices[0]).toMatchObject({ metricKey: 'visited', mode: 'average', aggregateScope: 'period', sourceIds: ['jan'] });
  const detail = render(OutreachDrilldown, { state: openDrilldown({ kind: 'selection', title: 'Outreach', selection: selections[0] }), rows });
  expect(detail.getByRole('dialog')).toHaveTextContent('1 qualifying contacts ÷ 3 calendar months ≈ 0 per month (rounded to a whole person)');
  expect(detail.getByRole('dialog')).toHaveTextContent('February 2026: 0');
  expect(detail.getByRole('dialog')).toHaveTextContent('Alice');
  expect(detail.queryByText('Bob')).toBeNull();
});
