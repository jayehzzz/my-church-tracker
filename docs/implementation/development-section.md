# Discipleship & Development — approved implementation brief

Status: implemented and repaired locally on 8 September 2026; frontend/backend automated checks and desktop/mobile demo verification completed. Authenticated staging deployment and verification remain separate. See the latest README handoff.

## Start here

Work in `/Users/jaydenayeh/my-church-tracker`, branch `codex/staging-accounts-and-verification`, base `9abda19`. Read AGENTS.md and the handoffs in README.md. The working tree contains extensive uncommitted People work from this task and newer Dashboard/Services/Meetings/Follow-Up refinements. Preserve all of it. Inherited untracked `.github/`, `AGENTS.md`, `coverage/`, `test-results/` are not disposable. Do not reset, stash or commit unrelated work. No agents or separate tasks requested. Local implementation and checks are authorized; deployment is separate.

The user is considering switching to GPT-5.6 Terra Medium to conserve usage. Do not silently switch models, spawn agents, or create a new task. Continue with their selected model.

## Approved visual reference

Latest concept (fictional records, preview interactions only):
`/Users/jaydenayeh/.codex/visualizations/2026/09/08/01a08155-2e15-74a3-862b-37878c507311/development-evidence.html`

The earlier `development-concept.html` is superseded: it included a numerical leader-assessment radar which the user subsequently questioned. The approved latest design keeps only the data-based participation radar and a written leader review.

Implement in Svelte/Convex using existing product components and tokens; do not embed the standalone concept or transfer its fictional records to live mode. Explicit local demo has been running on port 5195. The concept preview server on 5197 is only for visualizations.

## Navigation and selecting people

- Add a dedicated Development sidebar destination, separate from People Directory and Pastoral Care.
- Add a visible Development link on the person profile, passing that person's ID. Replace the large embedded participation/review area with a concise Development entry point so there is one canonical assessment workflow.
- Development must support emerging members, workers and leaders; do not require an existing worker/leader membership role.
- Put a searchable Person selector at the top. Search by name, with status/role and a disambiguator for duplicate names. Use the existing project-styled SearchableSelect where practical; do not use generic browser-looking menus.
- A separate searchable Compare with selector adds one other permitted person, excludes the main person, and can be cleared. Never grant access through comparison.
- Keep the period and meeting selections when switching people. Preserve selected person/comparison in the URL; support direct links, browser back/forward, empty directory, failed load, no search matches and removed/forbidden IDs.
- Guard against stale async responses after switching. Prompt about unsaved agreement/review drafts before discarding them; do not attach a previous person's draft to the newly selected person.

## Shared period and attendance measures

- Shared period selector: this month to date, last 3 complete months, last 6 complete months, custom from/to dates. Style it consistently with current project dropdowns. Dates are inclusive calendar dates; show the exact range.
- Both comparison people use the same dates and selected meeting programmes.
- Attendance radar has four axes: Sunday, Prayer, Bacenta, Workers. Keep supporting numbers visible.
- Weeks mode: distinct Monday–Sunday weeks containing attendance at a selected gathering / distinct weeks containing at least one selected held gathering with known attendance. Multiple attendances in a week count once for that category. Unlike the previous profile implementation, the denominator comes from held relevant gatherings, not simply all calendar weeks.
- Meetings mode: distinct selected gatherings attended / selected held gatherings with completed/known registers. Weight by actual gathering count; do not average programme percentages. E.g. 13/13 active prayer weeks can coexist with 29/39 meetings attended.
- Render rates on the same 0–100% radar scale. Keep raw numerator/denominator and actual attendance/active-week counts beside it. No composite score, spiritual rank or winner.
- Each category opens a by-programme breakdown. Prayer may include Acts, Shemen, Flow and future configured prayer programmes. Workers may have multiple configured programmes. Identify categories through programme category/type metadata, not guessed names. Sunday includes special services actually on Sundays.
- Meeting-type selection uses the project's styled multi-select pattern. Do not count every bacenta or unrelated department as an obligation: show the selected scope clearly, allow appropriate programmes, and avoid silently changing the comparison denominator. No selected/eligible gatherings means N/A, not zero.
- Exclude future, cancelled and explicitly absent/excused attendance. Incomplete/missing registers must show coverage/unknown and must not silently become absence. Services currently lack an explicit register-completion field; investigate the existing attendance workflow and define honest coverage before promising a complete denominator.

## Monthly tithing

- Separate month strip beside/below the radar; at least one explicit recorded tithe in a calendar month satisfies that month. Multiple dates in one month cannot satisfy a different month.
- Show e.g. 4/6 complete months, individual month markers, and inspectable recorded dates. If every eligible complete month has a record, say monthly giving was recorded throughout that period.
- Exclude the current incomplete month and boundary partial months from consistency; show them as in progress/partial. Do not penalize months before reliable membership/data coverage.
- Existing `is_tither` is a static profile flag, not evidence of monthly consistency. Use explicit `gave_tithe` records and actual gathering dates; no record means no recorded evidence, not a confirmed failure to give. Support unknown/unavailable separately.
- Use the existing confidentiality/access design for individual giving and reviews; do not expose amounts or widen unrelated financial access.

## Outreach and people brought

- Separate horizontal comparison bars, with identical count scale for both people; do not normalize open-ended counts into arbitrary radar scores.
- Contacts collected: distinct people/contacts first contacted in the period, explicitly attributed to the collector.
- People brought: distinct inviter-linked people whose confirmed first church-service attendance falls in the period. An inviter link alone is not attendance. Do not infer first-time church attendance from first attendance at a prayer/bacenta programme.
- Returned: subset of that first-visit cohort with another church-service attendance after the first and by the period end. Avoid counting duplicate rows/same event as another visit.
- Collector and inviter can differ, and the groups can overlap; do not present all three as a strict funnel.
- Current people schema has `contact_date` and `invited_by_id`, but no dedicated collector field was found. Add/validate/capture explicit collector attribution where needed (including existing outreach form/service flow), keeping legacy unknown values unknown. Do not repurpose an assigned follow-up leader as the collector.
- Use real service/attendance and identity links. Preserve records and merge invariants when extending relationships.

## Leader review

- Written, dated, authored conversation, separate from participation numbers. No numerical leader-assessment radar.
- Reuse the existing DiscipleshipReview workflow and retained history; it already records focus, understanding, next step, conversation date and optional review date.
- Keep current/latest review visible independently of the selected chart period, with clear date/author. Do not alter membership, church responsibilities or login roles when saving.
- Optional earlier-review viewing; no invented assessment where none was recorded.

## Growth agreements

- Dedicated Growth plan tab with current agreements, independent of chart period.
- Add agreement form: agreed action, supporting leader/person, agreed date, due date, next review date and notes/support needed.
- Each agreement displays status, dates, supporter and previous progress reviews.
- Review progress: add an authored/dated note, mark completed or keep in progress, and set next review date. Retain past notes; avoid overwriting the history.
- Persist through Convex and reload. Attribute actor/timestamps on the server; validate real dates, text bounds, status and person scope. Prevent double-submit and preserve drafts on failures. Use idempotency for retryable appends where possible.
- A separate indexed agreement/review table is preferable if needed for bounded history; integrate person merge/archive/delete behavior explicitly so agreements are not orphaned or silently lost. Do not add an unbounded global read.
- Demo writes are allowed only in explicit demo mode and must never become fallback for a live failure.

## Existing code to reuse and cautions

- `src/lib/components/people/DiscipleshipReview.svelte`
- `src/lib/components/people/EngagementRadarSection.svelte`
- `src/lib/utils/participationProfile.js` (old raw-week calculation; new section needs the revised denominator)
- `src/lib/utils/peopleView.js` (actual attendance / unavailable request helpers)
- `src/lib/components/ui/SearchableSelect.svelte`, `InlineSelectDropdown.svelte`, filter components
- `convex/people.ts:addDiscipleshipReview`, `convex/schema.ts:people.discipleship_reviews`
- `convex/lib/security.ts`: server account attribution, confidential redaction, assigned-person scope
- Current RLS makes services/meetings/programmes admin-only. Earlier profile fixes throw unavailable when their linked records cannot be read. Do not solve Development by making all gatherings/attendance/financial details globally readable. Design a purpose-specific minimal summary query that authenticates and verifies access to every requested person and returns only permitted evidence. Add explicit backend permission tests.
- Existing UI refinements changed SearchableSelect and chart controls; preserve these current files rather than replacing them with old versions.

## Acceptance and handoff

1. Person search/switch, comparison/clear, direct profile link and back/forward work, preserving filters and keeping records scoped.
2. Weeks/meetings, programme selection and dates recalculate correctly. Unknown/zero/absent/future/cancelled cases are distinct; no misleading denominators.
3. Tithe month boundaries/deduplication and first/return attendance attribution have meaningful unit tests.
4. Agreement create/review/complete/reload and existing leader review work, with backend validation, permissions and immutable author history covered.
5. Run frontend unit tests, backend tests, backend type checks, build, and relevant built-in-browser desktop/390px checks. Avoid concurrent production build during in-memory demo save checks because HMR resets demo state.
6. Report live staging/deployment verification separately. Production remains unchanged.
7. Append concise implementation/check/remaining-requirements handoff to README.md. Changes stay uncommitted unless user asks otherwise.

## Latest preparation status

The initial model-switch implementation has been repaired against the approved concept: the radar and comparison are implemented, dates and exact-event calculations are corrected, programme controls use styled category selections, dated tithing and outreach evidence remain separate, and growth agreements support review history. Explicit demo attendance now includes fictional dated tithe scenarios, independent of profile tither flags. See README for verification and remaining staging requirements.
