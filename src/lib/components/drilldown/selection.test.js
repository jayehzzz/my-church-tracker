import { describe, expect, it } from 'vitest';
import { groupChartPoints } from '$lib/utils/chartUtils.js';
import { createChoice, createSelection, selectedChoice, openDrilldown, pushDrilldown, backDrilldown } from './selection.js';

const rows = [
  { id: 'first', date: '2026-08-30', total: 38, firstTimers: 2 },
  { id: 'second', date: '2026-08-30', total: 44, firstTimers: 1 },
  { id: 'third', date: '2026-08-31', total: 40, firstTimers: 0 },
  { id: 'fourth', date: '2026-09-01', total: 46, firstTimers: 4 },
];

describe('drilldown source identity', () => {
  it('keeps same-day events separate and includes each source in week/month bounds', () => {
    expect(groupChartPoints(rows, 'day')).toEqual(rows);
    const days = rows.map(point => createChoice({ domain: 'service', metricKey: 'total', point }));
    expect(days.slice(0, 2).map(day => day.sourceIds)).toEqual([['first'], ['second']]);
    const weeks = groupChartPoints(rows, 'week', 'sum');
    expect(weeks.map(point => point.sourceIds)).toEqual([['first', 'second'], ['third', 'fourth']]);
    expect(weeks[0]).toMatchObject({ bucketStart: '2026-08-24', bucketEnd: '2026-08-30', total: 82 });
    const months = groupChartPoints(rows, 'month', 'average');
    expect(months[0]).toMatchObject({ sourceIds: ['first', 'second', 'third'], sourceCount: 3,
      bucketStart: '2026-08-01', bucketEnd: '2026-08-31' });
    expect(months[0].total).toBeCloseTo(122 / 3);
    expect(months[0].sourcePoints).toEqual(rows.slice(0, 3));
    expect(months[1].sourceIds).toEqual(['fourth']);
    expect(months[0].firstTimers).toBe(1);
  });

  it('preserves metric, mode, series and person independently for A/B', () => {
    const point = groupChartPoints(rows, 'month')[0];
    const selection = createSelection([
      createChoice({ domain: 'service', metricKey: 'total', mode: 'average', role: 'A', seriesId: 'services', point }),
      createChoice({ domain: 'service', metricKey: 'firstTimers', mode: 'total', role: 'B', seriesId: 'visitors', personId: 'p1', point }),
    ]);
    expect(selection.selectedRole).toBeNull();
    expect(selectedChoice(selection, 'B')).toMatchObject({ metricKey: 'firstTimers', mode: 'total', seriesId: 'visitors', personId: 'p1', sourceIds: ['first', 'second', 'third'] });
  });

  it('recalculates from underlying events when regrouping unequal buckets', () => {
    const firstWeek = groupChartPoints(rows.slice(0, 2), 'week', 'average')[0];
    const secondWeek = groupChartPoints(rows.slice(2), 'week', 'average')[0];
    const month = groupChartPoints([firstWeek, secondWeek], 'month', 'average')[0];
    expect(month.total).toBeCloseTo(122 / 3);
    expect(month.sourceIds).toEqual(['first', 'second', 'third']);
    expect(month.sourceCount).toBe(3);
  });

  it('restores list filters, scroll and focus after nested detail', () => {
    const start = openDrilldown({ title: 'August services', filters: { programme: 'Sunday' }, search: 'morning' }, { route: '/services' });
    const nested = pushDrilldown(start, { title: 'Service', id: 'first' }, { scrollTop: 340, focusKey: 'first' });
    expect(backDrilldown(nested)).toEqual({ ...start, current: { ...start.current, scrollTop: 340, focusKey: 'first' } });
  });
});
