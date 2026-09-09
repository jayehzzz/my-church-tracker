# Church settings and import preparation — 9 September 2026

Status: source review prepared; destination and import approval pending. No database reads/writes, source-sheet edits, deployments, or settings changes were performed. Browsing and testing were left to the user as requested.

## Confirmed church context

- Mustard Seed Chapel International Milton Keynes.
- Castle House, Dawson Road, Bletchley, Milton Keynes, MK1 1QT.
- Track ACTS constituency, initially Jayden’s bacenta. Sunday attendance describes this tracked group, not the whole congregation.
- Preserve existing programme definitions and account/person links. No coordinates, programme IDs, growth targets, or missing personal details inferred.

## Settings and environment findings

Current schema has no persisted organization/settings table. ChurchHubDropdown and ProfileDropdown show an unconfigured live organization; PeopleDashboard has no live church coordinates. The confirmed details above are prepared settings, not saved database configuration.

Password onboarding used isolated practice deployment `hidden-guineapig-648`. Handoffs name `elated-bee-284` as the older production target; readiness and current contents were not verified. Current `.env.local` points the frontend to `determined-crab-315`, while CLI selection is the recovery rehearsal `judicious-firefly-551`. Do not let these defaults choose an import target.

The user found the database selection terminology confusing. Explain the choice as a practice copy versus the shared church version. No target has been confirmed; finish the shared launch/backup decision before importing.

## Source review

Read all four tabs through the Google Drive connector, including remaining grid bounds; inspected attendance formulas and underlying birthday values. Inventory: 12 profile rows, 76 outreach rows, 20 named Sunday rows across 18 dates, and 24 historical notes.

Attendance formulas exclude first-timer cells: 123 Yes plus 7 First Timer gives 130 recorded attendances; 128 explicit No and 102 blank/unknown cells must remain distinguishable. A historical early-departure exception remains held. Seven explicit first-timer people include three with later recorded returns. These are source-review counts, not a confirmed database import count.

Private source snapshot, row-level proposed mapping, named identity decisions, and full review are saved outside Git in `/Users/jaydenayeh/.codex/private/church-import-2026-09-09/` (restricted directory/files). The manifest is explicitly `REVIEW_ONLY_NOT_IMPORTABLE`, with source keys, raw values and unresolved identity links. It contains no database target or executable write commands. Do not copy private rows into this repository. Re-read and compare the sheet before execution.

## Remaining requirements

1. Agree the shared destination in plain language, then inventory its current records and account links before presenting create/link/skip/hold decisions. No name-only merges or synthetic surnames.
2. Support unknown surnames, day/month birthdays and source age bands without inventing data. Existing validation requires surnames and full dates.
3. Preserve multiple collectors (28 source rows have shared credit), unknown inviters, and independent follow-up ownership. Current `collected_by_id` supports only one collector; attribution/reporting/merge handling need corresponding support.
4. Preserve Sunday present/absent/unknown states and explicit first-visit evidence separately from earliest recorded attendance. The current presence-only Sunday table and service-wide reporting denominator cannot represent every source distinction safely.
5. Keep notes restricted and historical; resolve ambiguous identities, the early-departure exception, malformed phone, and date-added versus first-contact meaning. Static giving/baptism flags do not prove dated events.
6. Implement and review a repeat-safe import with provenance, row holds, source fingerprint and exact target counts; avoid creating present-day follow-up tasks from historical imports.
7. Before approved writes, take a fresh file-inclusive backup of the confirmed target. Agree and enable routine backups, responsible owner, retention and restore verification as part of the separate shared launch. No backup schedule was enabled or claimed verified here.

Validation: read-only sheet/code/config inspection and reconciliation calculations only. No tests, build, or browser checks run, per user instruction. No app/backend code changed.

State: `codex/staging-accounts-and-verification`, inherited base `9abda19`; extensive inherited uncommitted work preserved. Documentation and private review artifacts remain uncommitted; no reset, stash or commit.
