# Project review — 5 September 2026

The project has a useful product foundation. The next development phase should concentrate on trustworthy data, access control, and complete workflows. The service-recording steps, follow-up workspace, pastoral-care views, and reusable charts are worth retaining.

## Scope and verification

- Reviewed the current working tree, including 45 existing modified, deleted, and untracked files; this is broader than a review of the latest commit.
- Inspected the database schema, backend functions, frontend data services, routes, forms, shared components, tests, deployment configuration, and existing documentation.
- Opened Dashboard, People, Services, Meetings, Evangelism, Follow-Up, Pastoral Care, and Reports in the local app. Inspected the service form without submitting it and checked the Meetings layout at 390 × 844.
- `npm run test:unit`: **114 tests passed across 18 files**.
- `npm run build`: **passed**, with accessibility warnings in the profile menu and contact drawer, plus an unused sidebar style.
- `npm audit --json`: **20 affected packages**: 2 critical, 12 high, 4 moderate, 2 low. These are dependency advisories, not 20 demonstrated attacks against the deployed application. The critical entries were `tar` and `vitest`; reachability depends on how the affected tools are used.
- Independently exercised the meeting analytics and CSV serialization with synthetic inputs, without changing stored church records.
- No application code was edited and no forms were submitted. Seeds, migrations, and deployments were not run. Existing page-load behavior, including the CRM's automatic synchronization, remains part of the app. Production hosting protections and actual backup configuration were not inspected.

## Priority 1 — Protect access and distinguish real data from demonstrations

### 1. Enforce authentication and permissions in the backend

**Confirmed in code.** Public queries and mutations do not check the caller's identity. A `crm_users` table defines roles, but its own comment says authentication will be added later. Checking that an assignee is a church leader does not verify who is making a request. The profile menu displays a fixed pastor identity; signing out only navigates home.

Implement genuine sessions and server-enforced owner/admin/leader/viewer permissions. Derive the acting user from the session, scope sensitive notes and assignments, and record who changed important records. Verify unauthenticated reads and writes fail, a viewer cannot edit, and leaders cannot access records outside their permitted scope. Any external hosting access gate should be reviewed separately from protection of the Convex API.

Evidence: [people API](/Users/jaydenayeh/my-church-tracker/convex/people.ts:16), [planned user model](/Users/jaydenayeh/my-church-tracker/convex/schema.ts:395), [profile/sign-out behavior](/Users/jaydenayeh/my-church-tracker/src/lib/components/layout/ProfileDropdown.svelte:95).

### 2. Restrict maintenance operations and make environment selection consistent

**Confirmed in code.** Seeding and migration functions are public mutations. The main seed clears records by default and decides whether an environment is production by searching the deployment URL for `prod` or `production`. That string check does not establish that a database is disposable. Its clearing list also omits newer related tables such as CRM tasks and programme memberships.

Separately, CRM prefers `VITE_CONVEX_URL_PROD`, while most data services only read `VITE_CONVEX_URL`. When these differ, different parts of the app can target different databases.

Use one environment/client configuration, restrict maintenance functions to internal administration, and require an explicit disposable-environment configuration for destructive seed operations. Add a schema-aware reset workflow for test data. The `seed_simple` script also attempts to write `intended_use`, which is absent from the current people schema.

Evidence: [seed guard and clearing](/Users/jaydenayeh/my-church-tracker/convex/seed.ts:1295), [simple seed](/Users/jaydenayeh/my-church-tracker/convex/seed_simple.ts:23), [CRM environment selection](/Users/jaydenayeh/my-church-tracker/src/lib/services/followUpCrmService.js:24), [people environment selection](/Users/jaydenayeh/my-church-tracker/src/lib/services/peopleService.js:7).

### 3. Remove silent sample-data fallback from live operation

**Confirmed in code.** Several services return sample records with `error: null` after failed or timed-out requests. CRM can switch to a separate local workspace. This can make an outage look like a healthy database and allow work to occur against a different dataset.

There is an additional directory defect: if real people have no coordinates, `enhancePeopleWithLocation` appends sample people to the real list. A legitimately empty database also displays sample people. This is possible even without a network failure.

Make demo mode explicit and isolated. In live mode, show loading, empty, unavailable, and stale-data states accurately. Preserve unsaved input on failures, provide retry, and display when data is only stored locally. Verify zero real people stays zero, and that a database containing people without coordinates never gains sample entries in its display.

Evidence: [request fallback](/Users/jaydenayeh/my-church-tracker/src/lib/services/peopleService.js:47), [directory enrichment and loading](/Users/jaydenayeh/my-church-tracker/src/routes/people/+page.svelte:145), [CRM fallback](/Users/jaydenayeh/my-church-tracker/src/lib/services/followUpCrmService.js:689).

### 4. Fix unsafe map rendering and update affected dependencies

**Confirmed code path; no exploit was attempted.** The map inserts names, addresses, status, and role into HTML strings. These fields can be entered through the app, so they should render as text rather than executable markup. The optional `role` field also receives `.replace()` without a missing-value guard, which can break map rendering for a valid person record.

Build popup content with safe text nodes or consistently escaped values, attach events without inline HTML handlers, and handle missing optional fields. Validate with ordinary punctuation, literal markup text, and a person without a role.

Update the affected framework, adapter, and toolchain packages in a dedicated change; review major test-runner upgrades rather than applying a forced blanket fix. Re-run the audit and workflow checks. The audit includes a [Vitest UI-server advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp); its presence does not establish that the deployed site exposes that server.

Evidence: [map popup generation](/Users/jaydenayeh/my-church-tracker/src/lib/components/map/LeafletMap.svelte:258), [dependencies](/Users/jaydenayeh/my-church-tracker/package.json).

## Priority 2 — Make saved records and reports agree

### 5. Repair profile editing and backend field validation

**Confirmed in code.** PersonForm exposes city, state, and postcode. The people mutations accept these fields and pass them into database writes, but the people schema does not define them. Non-empty values therefore conflict with schema validation.

Clearing an existing email, address, or other optional text field is another problem: the form converts blanks to null, then the service removes null and blank values from the update. The backend never receives an instruction to remove the old value.

Align form, API, and schema fields. Define explicit clearing semantics and validate dates, allowed statuses, references, and nonnegative whole-number headcounts on the server. Verify editing a populated profile, clearing fields, reloading, and saving a complete address against the real backend implementation in a disposable test environment.

Evidence: [address arguments](/Users/jaydenayeh/my-church-tracker/convex/people.ts:57), [people schema](/Users/jaydenayeh/my-church-tracker/convex/schema.ts:5), [blank-value removal](/Users/jaydenayeh/my-church-tracker/src/lib/services/peopleService.js:81), [form submission](/Users/jaydenayeh/my-church-tracker/src/lib/components/forms/PersonForm.svelte:232).

### 6. Reconcile attendance, Sunday plans, and commitments

**Confirmed in code.** Resolving a CRM commitment as attended updates the commitment and person, but does not create named service or meeting attendance. Setting a member's attendance plan to attended also changes only the plan. Recording Sunday attendance does not resolve the matching CRM commitment. A person can therefore appear to have attended in one workspace but not in their attendance history.

Choose one authoritative attendance workflow and reconcile the other views with it. Handle repeated submissions, corrections, backdated gatherings, and first visits consistently. The newer atomic service-recording mutation is a good foundation, but older attendance entry points still use today's date for first visits and permit separate updates to records and aggregates.

Verify that confirming actual attendance once updates history and follow-up outcomes exactly once, and that correcting it produces consistent results everywhere. Keep expected attendance distinct from actual attendance and unnamed headcounts distinct from named check-ins.

Evidence: [commitment resolution](/Users/jaydenayeh/my-church-tracker/convex/crm.ts:1338), [attendance plans](/Users/jaydenayeh/my-church-tracker/convex/crm.ts:1430), [atomic service recording](/Users/jaydenayeh/my-church-tracker/convex/services.ts:99), [legacy attendance writes](/Users/jaydenayeh/my-church-tracker/convex/attendance.ts:34).

### 7. Define safe deletion, correction, and recovery behavior

**Confirmed in code.** Removing a person deletes only the person. Removing a Sunday service deletes only the service. Related attendance, assignments, commitments, and care records can remain. Deleting a visitation leaves its generated follow-up task and interaction history behind. Meeting deletion already removes its attendance, demonstrating inconsistent policies across modules.

Prefer archiving for people with history; define deliberate cascade, restriction, or retention rules for each relation. Support recovery where practical. Add duplicate detection and a reviewed merge workflow, because the unified person record connects many types of history.

Care edits also need reconciliation: creating a visitation creates a follow-up interaction, but changing the visitation does not update that interaction. Verify correcting a visit does not leave contradictory timelines or unnecessarily reopen completed care work.

Evidence: [person removal](/Users/jaydenayeh/my-church-tracker/convex/people.ts:198), [service removal](/Users/jaydenayeh/my-church-tracker/convex/services.ts:194), [care editing/removal](/Users/jaydenayeh/my-church-tracker/convex/visitations.ts:202).

### 8. Establish shared reporting definitions

**Observed locally and reproduced with synthetic data.** On 5 September, the Dashboard showed no completed September services, while Services treated later September dates as attended services. Services filters to the selected range without excluding future dates; Dashboard excludes them.

`buildMeetingAnalytics` treats every non-cancelled meeting as held, including scheduled meetings. One completed meeting with 20 attendees plus one future scheduled meeting yielded `held: 2` and `average: 10`, where completed-meeting reporting should yield one held meeting and an average of 20.

Other definition mismatches: Reports counts all meeting durations as prayer hours and every visitation as completed. The home page renames a sum of guest attendances to “New guests,” even though repeat guests contribute to that sum.

Centralize rules for completed gatherings, attendance visits versus unique people, first timers, prayer hours, successful care, and comparison periods. Make the scope of date filters explicit on directories that intentionally show all people. Verify all pages and exports agree for the same fixture and reporting period.

Evidence: [service filtering](/Users/jaydenayeh/my-church-tracker/src/routes/services/+page.svelte:259), [meeting analytics](/Users/jaydenayeh/my-church-tracker/src/lib/utils/meetingAnalytics.js:219), [report metrics](/Users/jaydenayeh/my-church-tracker/src/routes/reports/+page.svelte:81), [dashboard labels](/Users/jaydenayeh/my-church-tracker/src/routes/+page.svelte:49).

### 9. Implement genuine backups and complete export behavior

**Confirmed in code.** “Export Church Backup (JSON)” always exports a summary of `mockPeople`, fixed church details, and no relational history. It cannot restore the actual church database.

Replace it with an authenticated export or connect the UI to an established backup workflow. Include the data and relationships needed for recovery, control access, and perform a restore rehearsal into an isolated environment. Existing provider backups may already exist; their configuration needs verification.

CSV export also preserves spreadsheet formula prefixes: a synthetic value `=1+1` was exported unchanged. Define safe text serialization and preserve phone numbers as text. Exporting a report and backing up a database should be clearly separate actions.

Evidence: [backup action](/Users/jaydenayeh/my-church-tracker/src/lib/components/layout/ProfileDropdown.svelte:46), [CSV serialization](/Users/jaydenayeh/my-church-tracker/src/lib/utils/exportUtils.js:22).

## Priority 3 — Finish operational features and prevent regressions

### 10. Complete uploads and replace remaining demonstration UI

Service photo upload is connected to a storage service that always returns an error. Implement file storage, validation, upload progress, removal, and access rules, or make the feature visibly unavailable until complete. Replace fixed profile/church details and seeded notification stories with configured identity and real events.

Evidence: [storage placeholder](/Users/jaydenayeh/my-church-tracker/src/lib/services/storageService.js:20), [seeded notifications](/Users/jaydenayeh/my-church-tracker/src/lib/stores/notificationStore.js:9).

### 11. Add backend and complete-workflow verification

The passing suite is useful but is configured to include tests only under `src`. CRM tests exercise the local implementation; some conditionally skip their assertions when a suitable record is absent. The frontend build does not establish that backend mutations match the schema or that real saved records survive reloads.

Add backend tests and a small end-to-end suite for creating/editing/clearing a person, recording and correcting attendance, assigning and completing follow-up, logging and correcting care, permission boundaries, and failure states. Make fixtures deterministic and fail when required test data is absent. Add frontend/backend checking and CI release gates. The coverage script also needs its coverage provider configured and verified.

Evidence: [test selection](/Users/jaydenayeh/my-church-tracker/vite.config.js:16), [CRM tests](/Users/jaydenayeh/my-church-tracker/src/lib/services/followUpCrmService.test.js:1), [scripts](/Users/jaydenayeh/my-church-tracker/package.json:5).

### 12. Reduce duplicated logic and unnecessary data loading

Many pages fetch whole tables, and backend list queries repeatedly load each person's related records. CRM loads multiple complete tables and repeatedly filters them per person. Most reads use one-shot HTTP queries, so other workers' changes are not continuously reflected; the CRM page polls periodically.

Add indexed, scoped, paginated queries and measured performance checks using a representative larger dataset. Use subscriptions or deliberate refresh/invalidation where collaboration needs it. Move time-based CRM synchronization out of dashboard reads into a scheduled backend operation so it does not depend on somebody opening a page.

Consolidate shared rules across backend and local demo implementations. Large files such as Services (~1,643 lines), backend CRM (~1,478), and the CRM service (~1,312) should be split around stable responsibilities while fixing behavior, rather than through a wholesale rewrite.

Evidence: [CRM dashboard query](/Users/jaydenayeh/my-church-tracker/convex/crm.ts:390), [service list hydration](/Users/jaydenayeh/my-church-tracker/convex/services.ts:5), [synchronization during dashboard loading](/Users/jaydenayeh/my-church-tracker/src/lib/services/followUpCrmService.js:701).

### 13. Finish accessibility, mobile task flow, and documentation

The phone-sized Meetings view stacks correctly, but its title, explanatory text, tabs, and KPI cards consume most of the initial screen. For workers on phones, keep recording and today's tasks quickly reachable. Treat this as a usability refinement, not a claim that all mobile layouts fail.

Address the build warnings and give the contact drawer the shared modal's focus behavior, including focus containment and return. Review accessible names on custom table actions. Check unsaved-form dismissal and actionable errors.

Refresh the README and setup/deployment guidance: some stack descriptions and routes are stale, and assurances that local development always uses test data or that seeding refuses production exceed what the code enforces. Document actual environment selection, deployment of both frontend and backend, migration steps, and recovery. Review the existing uncommitted work in coherent groups before the next release.

## Recommended delivery order

1. **Access and data isolation:** authentication/permissions, internal maintenance functions, shared environment configuration, explicit demo mode, map rendering, dependency triage.
2. **Correct records:** profile fields/clearing, attendance reconciliation, safe deletion/corrections, backend regression coverage.
3. **Trustworthy reporting and recovery:** shared metrics, real backup/restore, safe exports, cross-page reconciliation tests.
4. **Operational completion:** photo storage, real notifications, collaborative updates, scheduled reminders, pagination, mobile/accessibility refinement, and current documentation.

Finish each batch with an explicit user workflow against an isolated real backend. Passing UI tests should accompany evidence that records persist correctly and reports agree after a reload.
