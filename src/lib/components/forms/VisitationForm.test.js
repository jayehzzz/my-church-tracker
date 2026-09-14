import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import VisitationForm from './VisitationForm.svelte';

const update = vi.fn();

vi.mock('$lib/services/visitationsService.js', () => ({
  create: vi.fn(),
  update,
}));
vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));

afterEach(() => {
  cleanup();
  update.mockReset();
});

const people = [
  { id: 'person-1', first_name: 'Care', last_name: 'Person', member_status: 'member' },
  { id: 'leader-1', first_name: 'Care', last_name: 'Leader', member_status: 'leader' },
];

it('rejects a next action due before the interaction date before saving', async () => {
  const { getByLabelText, getByRole, getByText } = render(VisitationForm, {
    isOpen: true,
    people,
    visitation: {
      id: 'visit-1',
      person_id: 'person-1',
      visited_by_id: 'leader-1',
      visit_date: '2026-08-03',
      outcome: 'welcomed_encouraged',
      follow_up_required: true,
      follow_up_date: '2026-08-04',
    },
  });

  await waitFor(() => expect(getByLabelText(/Interaction date/)).toHaveValue('2026-08-03'));
  expect(getByLabelText(/Next action due/)).toHaveAttribute('min', '2026-08-03');

  await fireEvent.input(getByLabelText(/Next action due/), { target: { value: '2026-08-02' } });
  await fireEvent.click(getByRole('button', { name: 'Save changes' }));

  expect(getByText('The next action must be on or after the care date')).toBeInTheDocument();
  expect(update).not.toHaveBeenCalled();
});
