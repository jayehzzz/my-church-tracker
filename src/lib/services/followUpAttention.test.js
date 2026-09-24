import { describe, expect, it } from 'vitest';
import { attentionRows } from './followUpAttention.js';

describe('Dashboard attention destinations', () => {
  it('selects the same task, fresh contact and forecast sources as Dashboard counts', () => {
    const workspace = {
      tasks: [
        { id: 'no-date' }, { id: 'late', due_date: '2026-09-23' }, { id: 'future', due_date: '2026-09-25' },
      ],
      member_care_tasks: [{ id: 'care', due_date: '2026-09-24' }],
      unassigned_contacts: [
        { id: 'fresh', contact_date: '2026-09-20' }, { id: 'old', contact_date: '2026-08-01' },
      ],
      attendance_roster: [{ id: 'member', first_name: 'Regular' }],
      sunday_commitments: [{ person: { id: 'guest', first_name: 'Guest' } }],
      attendance_forecast: { expected_total: 2, expected_person_ids: ['member', 'guest'] },
    };
    expect(attentionRows(workspace, 'due', '2026-09-24').map((row) => row.id)).toEqual(['no-date', 'late', 'care']);
    expect(attentionRows(workspace, 'overdue', '2026-09-24').map((row) => row.id)).toEqual(['late']);
    expect(attentionRows(workspace, 'unassigned', '2026-09-24').map((row) => row.id)).toEqual(['fresh']);
    expect(attentionRows(workspace, 'expected-sunday', '2026-09-24').map((row) => row.id)).toEqual(['member', 'guest']);
  });
});
