import { describe, expect, it } from 'vitest';
import { pointInsight } from './chartInsights.js';

describe('pointInsight', () => {
  it('compares a selected value with the prior point and shown average', () => {
    const insight = pointInsight([{ total: 8 }, { total: 12 }, { total: 16 }], 2, row => row.total, 'attendance');
    expect(insight.summary).toBe('This attendance is 4 higher than the previous point.');
    expect(insight.context).toEqual([
      { label: 'Previous chart point', value: '12' },
      { label: 'Average of points shown', value: '12' },
    ]);
  });

  it('does not turn missing values into recorded zeroes', () => {
    const insight = pointInsight([{ count: null }, { count: 4 }], 1, row => row.count, 'count');
    expect(insight.context).toEqual([]);
    expect(insight.summary).toBe('This is the only point shown for the selected period.');
  });
});
