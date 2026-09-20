import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import ExpandedChart from './fixtures/ExpandedChart.svelte';
afterEach(cleanup);

describe('expanded chart and nested details', () => {
  it('keeps comparison, grouping and bar state; Escape closes only the top dialog and restores scrolling', async () => {
    const { getByRole, getByLabelText, queryByRole } = render(ExpandedChart);
    document.body.style.overflow = 'auto';
    await fireEvent.change(getByLabelText('Compare attendance with'), {target:{value:'guests'}});
    await fireEvent.change(getByLabelText('Chart time scale'), {target:{value:'month'}});
    await fireEvent.click(getByRole('button', {name:'Bar',exact:true}));
    const chart = getByRole('img');
    const opener = getByRole('button', {name:'Expand Attendance test'});
    await fireEvent.click(opener);
    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));
    expect(getByRole('img')).toBe(chart);
    expect(getByLabelText('Compare attendance with').value).toBe('guests');
    await fireEvent.click(getByRole('button', {name:'View Sept 2026 details'}));
    expect(getByRole('dialog', {name:'Sept 2026'})).toHaveTextContent('Average attendance per gathering30');
    await fireEvent.keyDown(document, {key:'Escape'});
    await waitFor(() => expect(queryByRole('dialog', {name:'Sept 2026'})).toBeNull());
    expect(getByRole('dialog', {name:'Attendance test'})).toBeDefined();
    expect(document.body.style.overflow).toBe('hidden');
    await fireEvent.keyDown(document, {key:'Escape'});
    await waitFor(() => expect(queryByRole('dialog', {name:'Attendance test'})).toBeNull());
    expect(document.body.style.overflow).toBe('auto');
    expect(getByRole('img')).toBe(chart);
    expect(getByRole('button', {name:'Bar',exact:true})).toHaveAttribute('aria-pressed','true');
    expect(document.activeElement).toBe(opener);
  });

  it('can group a chart while its last point is hovered without stale tooltip errors', async () => {
    const { getByRole, getByLabelText } = render(ExpandedChart);
    await fireEvent.mouseEnter(getByRole('button', {name:'View 2026-09-13 details'}));
    await fireEvent.change(getByLabelText('Chart time scale'), {target:{value:'month'}});
    await fireEvent.click(getByRole('button', {name:'View Sept 2026 details'}));
    expect(getByRole('dialog', {name:'Sept 2026'})).toHaveTextContent('30');
  });

  it('restores body and background on unmount while expanded', async () => {
    const {getByRole, unmount} = render(ExpandedChart);
    const originalOverflow = document.body.style.overflow;
    await fireEvent.click(getByRole('button', {name:'Expand Attendance test'}));
    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));
    unmount();
    expect(document.body.style.overflow).toBe(originalOverflow);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
