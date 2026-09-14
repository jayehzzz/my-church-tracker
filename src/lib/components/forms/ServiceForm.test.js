import { cleanup, render } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import ServiceForm from './ServiceForm.svelte';

vi.mock('svelte/transition', () => ({ fade: () => ({}), fly: () => ({}), scale: () => ({}) }));

afterEach(cleanup);

it('opens a new Sunday service form without entering a reactive update loop', () => {
  const { getByLabelText, getByRole } = render(ServiceForm, { isOpen: true });

  expect(getByRole('heading', { name: 'Set up the service' })).toBeInTheDocument();
  expect(getByLabelText(/Service Date/)).toHaveValue(new Date().toISOString().slice(0, 10));
  expect(getByLabelText('Service Type')).toHaveValue('sunday_service');
});
