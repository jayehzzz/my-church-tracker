# Pastoral Care Workflow

Pastoral Care is the operational workflow behind the `/visitation` route. A visitation is a completed care interaction; outstanding work is always represented by a shared CRM task.

## Core rules

1. `people` is the source of truth for the person receiving care and the care leader.
2. `follow_up_tasks` is the source of truth for outstanding work.
3. `visitations` stores completed care interactions and their outcomes.
4. A person should not receive a second care suggestion while an open `visitation` or `member_care` task already exists.
5. Completing a scheduled care task creates a visitation record and closes the source task.
6. Requesting another action creates a new `member_care` task linked through `source_visitation_id` and `next_task_id`.

## Cross-system flow

```text
Attendance or profile signal
          ↓
Care suggestion
          ↓
follow_up_tasks (visitation)
          ↓ completed with outcome
visitations + follow_ups timeline entry
          ↓ if next action requested
follow_up_tasks (member_care)
```

The same open task is shown in Pastoral Care, Follow-Up CRM and the linked person profile. The profile links back to Pastoral Care for scheduling, logging and filtered history.

## Care signals

The workspace evaluates the six latest recorded Sunday services and suggests care for:

- members or leaders with no attendance across all six services;
- members or leaders attending one to three of the six services;
- members or leaders attending at least four of the six but missing the two latest services; and
- guests with a recorded first visit but no pastoral care interaction after three days.

Signals are suggestions, not persisted records. An open care task or a completed care interaction within seven days suppresses the suggestion. Assigning a suggestion creates the persisted task and prevents duplicates.

The visit schedule separates physical `visitation` tasks that are overdue or due today from future visits. Calendar days are interactive and reveal the care method, purpose, leader, outcome, notes and follow-up state for every interaction recorded on that date.

## Privacy boundary

General care notes are visible wherever the visitation record is displayed. Until authentication and field-level permissions are enforced, safeguarding or highly sensitive pastoral details must not be placed in general care notes.
