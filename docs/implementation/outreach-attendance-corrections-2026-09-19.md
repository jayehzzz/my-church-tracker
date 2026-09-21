# Outreach attendance and confirmation corrections — 19 September 2026

Baseline: clean `codex/operational-reliability-review` at `6c1f3ea`. Changes remain uncommitted. No production deployment or database writes.

Read-only investigation confirmed the reported 13 September attendance already has `first_timer: true`; the person's first-visit date is also 13 September. The gathering was recorded as `special_service`, explaining why the Sunday follow-up lookup could not find it. No historical records were changed.

Implemented:
- Sunday special/Easter/Christmas services can fulfil Sunday commitments and member plans, while retaining special-event matching. Multiple matching gatherings still require selection; non-Sunday special services do not qualify. Reconciliation and deletion handle both identities.
- Actual-attendance dialog displays the requested date and type and provides a refresh action after recording a missing gathering.
- Green per-visit first-timer labels in service details, individual attendance, profile service details and the service form.
- Inviter and shared-credit choices show full names and roles; leaders and members are listed first, with explicit expansion for outreach contacts and guests. Existing selections remain visible.
- Explicit Cancel confirmation action for contacts/guests and Unconfirm for confirmed members remain available after the service date. Cancellation help explains how to record a misclick without a no-show.

Checks: 231 unit tests, 75 backend tests, backend TypeScript check, production build, existing Playwright attendance/care workflow, and built-in browser checks of gathering selection, saved first-visit metadata, green first-timer badge and expandable person picker. `git diff --check` passed. Only fixtures were mutated in browser checks.

Remaining: production release is a separate task. The saved first-timer record is correct; the originally observed returning-guest display was not reproduced from current persisted data. No data repair or automatic migration is included.
