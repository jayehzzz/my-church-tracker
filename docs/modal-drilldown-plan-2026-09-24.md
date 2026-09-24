# Contextual pop-ups and record drill-down plan

Prepared and approved 24 September 2026. Status: Batches A–G implemented locally on `codex/practice-workflow` with inherited uncommitted work. Automated checks passed; separate browser verification and any Practice acceptance remain pending. No production release.

## Scope and reviewed baseline

The request is to make pop-ups appropriate to their screen and selected data, with a useful path to more information. Review covered the current route components, their charts, record dialogs, data selectors and relevant backend responses. Browser verification is deliberately reserved for a separate task with a lower reasoning model, as requested. These are source-code findings, not claims about verified hosted behavior.

At planning time, the baseline was a clean working tree on `codex/practice-workflow`, commit `d5cb782`. Recent changes included `256fbcd` (chart context) and `1f3be89` (service records in service-mix details). This plan was the only new file from the planning work; no app code, database records, deployments or task launches were changed during that planning stage. Batches A–G subsequently changed app code locally and left it uncommitted.

## Proposed experience

A click should answer: **What made up this number, and where can I inspect each contributing record?**

Use the existing visual language and accessible dialog shell, with content appropriate to the data:

- Attendance averages and totals: a gathering list, with dates and each gathering's contribution.
- Counts of distinct people: a person list, with the reason each person qualifies.
- A single gathering: the gathering's details and relevant attendance.
- Care activity: interactions, outcomes and next actions.
- Personal development: the person's underlying participation or outreach evidence.
- Memories: the media viewer and its linked gathering.

Keep clear inline filtering and navigation where those already work. The aim is useful detail, not an extra modal for every action. Keep edit forms and destructive confirmations separate from read-only exploration.

### Worked example

Illustrative values only: selecting September's average Sunday attendance of 42 opens **September · Sunday attendance**, with **168 attendances across 4 recorded services = 42 per service**. List the four services, with date, title and attendance of 38, 44, 40 and 46. Select a service to see its attendance breakdown and recorded people; select a person to open their profile.

For a weekly point, list only the services in that week. For a month point, list that month's services. A period-wide average includes all qualifying services in the selected period. A day with one service can open that service directly. Preserve multiple services on the same day as separate records.

If the selected metric is first-timer visits rather than total attendance, show first-timer contributions and eligible named records. The selected comparison series must also retain its own metric and calculation mode.

### Shared behavior

- Put the contributing records immediately after a short summary. Move optional comparisons and calculation explanations below them.
- Show the precise date range, selected programme/type/person/worker and metric. Carry those filters into all subsequent views.
- Give actions specific labels: **View service**, **View meeting**, **View contact**, **View profile**, **Open matching records**.
- Use one visible exploration dialog with a Back action for deeper levels. Preserve the originating list, filters, scroll position and focus. Full-page profile navigation should have a reliable return path.
- Use spacious event lists, compact person lists and an appropriate media layout. On phones, adapt the current bottom-sheet layout with reachable Back/Close actions.
- Explain totals, averages and percentages using their actual numerators and denominators. Attendance totals are visits/attendances, not distinct people. Repeat attendees remain separate contributions across gatherings.
- Preserve existing classification: members, first-timer visits, returning guest visits and visit type unknown. Historical first visits must not be reclassified merely because the person is now a member.
- Keep named records, unnamed headcounts and unclassified visit types distinct. Missing named records do not mean zero attendance. Missing registers do not prove absence.
- Show loading, empty, unavailable and restricted states accurately; provide retry for failures. Never replace a failed live read with sample data.
- Fetch additional detail only when needed, within existing permissions. Long lists should show their total and support loading/searching more without silently presenting a truncated list as complete.

## Screen-by-screen decisions

### Dashboard

**Current:** daily attendance points can navigate to a specific service. Grouped points use the generic chart dialog. KPI links and attention links generally go to whole sections. Recent activity uses a generic activity dialog with a section link.

**Proposed:**

- Average attendance and grouped chart points: the exact contributing Sunday services and the calculation; each service opens its record.
- Non-member visits: per-service first-timer, returning and unknown contributions, then available named visitors for that service/category.
- Total members: current matching directory records, explicitly labelled as a current snapshot rather than a historic period count.
- Follow-ups and attention figures: open the corresponding filtered Follow-Up list (overdue, due today, unassigned or expected Sunday). Keep the existing page/list interaction if it already provides the needed detail.
- Recent activity: event-specific summaries and exact-record actions for services, meetings, contacts and care. Avoid guessed leader/status values when not recorded.
- The dashboard currently falls back to the latest eight completed Sundays when the selected period has none. Preserve its explicit fallback label in drill-down and use those actual source records; do not label them as records inside the empty selected period.

### Sunday Services

**Current:** individual service details, outcome-by-service lists, service-type lists and person attendance history already exist. Grouped attendance points and the Attendance & outcomes comparison use generic summaries. Headline figures do not consistently offer detail.

**Proposed:**

- Day/week/month chart, headline average and comparison cards: selected metric plus contributing service rows. Keep each service's date, title/type and metric count visible.
- Latest attendance opens the latest service. First-timer and salvation headline totals open the relevant service breakdown.
- Attendance mix: offer **View breakdown** for members, returning guests, first timers, unknown visit type and tither attendances. Preserve legend visibility controls as visibility controls rather than changing their meaning.
- Service-type mix: retain the existing useful list and add a return path and exact matching-list action.
- Service details: show event facts first, then the selected attendance/outcome category and named people. Put photos/notes and editing actions in secondary positions. Show headcounts without inventing people or implying all historical outcomes have named records.
- Existing Sunday-by-Sunday personal attendance history is a useful pattern to preserve. When it opens a service, retain the selected person and provide Back to history.
- Show sensitive person-level giving information only through already-authorized data. Aggregated totals do not grant permission to reveal names.

### Meetings

**Current:** the programme comparison always opens a people list, including when the selected measure is meetings held or attendance average. Grouped trend points use generic chart details. Single-meeting points add useful time/location and named/unnamed counts. Person rows calculate attendance across the wider filtered meeting set rather than necessarily the clicked programme.

**Proposed:**

- Meetings held: dated meeting list for the selected programme/type and period.
- Attendance total/average: meeting list with contributions and calculation; optional **People** view for the same exact records.
- Unique people: deduplicated attendee list with attendance frequency and last attended date calculated only from the selected group.
- Attendance-experience categories: retain a people-first list; show first recorded church visit/programme visit or established-attendee evidence as applicable.
- Week/month trends: grouped meeting list. Single-meeting points: reusable read-only meeting detail with programme, date/time, location/format, status, named attendance and unnamed headcount.
- Add exact meeting navigation reusable from People, Dashboard, Reports and Memories. Do not force a record-view click into the attendance editor.

### Evangelism

**Current:** month details already show contacts; outcomes already show qualifying people. The chart callback does not carry the chosen metric/mode. Clicking a month opens the same all-contact list. The inviter popup shows up to five recent contacts.

**Proposed:**

- Contacts reached: that month's contact list with contact date, shared outreach credit, assigned worker and next action.
- Saved on outreach / first timers / joined church: qualifying people from the clicked contact cohort, with the relevant recorded outcome and date when available.
- Keep cohort semantics explicit: these are outcomes for people first contacted in the selected period; the outcome may happen later. Do not silently switch to counting outcomes by occurrence date.
- The current chart's average mode repeats a period-wide monthly average. Its detail must show the full period's contributing months, including empty/partial months, with the clicked month highlighted. It must not claim the average was computed from that month alone.
- Preserve Series A/B and selected mode when opening detail; if a hit area covers both series, show both clearly and let the user select the contribution list.
- Contact detail keeps its useful outreach, gatherings and follow-up context, with exact person/profile actions and Back to the originating list.
- Inviter detail: full matching contact count plus **View all matching contacts**. Use the same attribution rule and period as the clicked ranking, and explain shared credit when applicable.

### Follow-Up

**Current:** person drawers, task logging and Sunday group filters already suit this workflow. Worker details expand inline.

**Proposed:**

- Keep the person drawer, Sunday group filtering and inline worker expansion.
- Ensure each person view foregrounds the relevant next call/task, assigned worker, recent outcome and Sunday status, with access to full profile and history.
- Worker figures should open their actual matching people/tasks for the chosen period. Preserve worker/tab selection when returning.
- Expected, confirmed and actually attended remain separate states; a read-only click never logs a call or changes attendance.
- Retain focused call/attendance/away-reason forms. Only adjust transitions where a drawer or detail dialog currently obscures the next view.

### Pastoral Care

**Current:** calendar days already open a meaningful interaction list and individual care records have a dedicated dialog. Calendar comparison metrics fall back to generic totals/denominators. Selecting a care interaction does not itself close the day dialog.

**Proposed:**

- Day click: retain interaction cards showing person, interaction type/purpose, worker, outcome and follow-up.
- Monthly care total or daily average: matching dated interactions, actual eligible elapsed-day denominator and selected range.
- Follow-up measure: the interactions matching that measure's actual predicate. Distinguish an interaction flagged as requiring follow-up from a currently outstanding task; Reports and the care calendar must not be assumed to count the same thing.
- Interaction click: dedicated care detail with permitted notes, outcome, next action and profile link. Provide Back to the day/month list instead of leaving competing overlays open.
- Preserve task queues and their existing focused schedule/log-care forms.

### People directory, map and individual profile

**Current:** directory rows lead to profiles; map popovers already show location/travel and a profile link. Profile service history opens details, but meeting history is explicitly not openable.

**Proposed:**

- Keep directory-to-profile navigation and compact map popovers. Do not add a generic full-screen summary between a person and their profile.
- Map detail stays geographic: person, recorded address, available travel estimate and directions/profile actions.
- Recorded-attendance summary can reveal/focus the existing history; latest attendance opens the exact event.
- Service and meeting history should both open event detail. Start with this person's participation, then allow the broader event view within permissions.
- Outreach/care history keeps its dedicated record dialogs, with consistent navigation and no accidental editing.
- Preserve archive/merge/edit confirmations and confidential-field access rules.

### Development

**Current:** participation radar points show numbers without gatherings; monthly tithing uses a text-only generic modal; outreach bars repeat counts. The evidence helper collapses useful source arrays into aggregate values, though the response already contains much of the underlying evidence.

**Proposed:**

- Participation point: selected person + category/programmes + period, then qualifying gatherings. Show attendance evidence and distinguish unknown register from no attendance record. Do not claim every selected gathering was personally expected.
- Weekly participation: group by week, showing which gatherings establish the week's numerator and denominator. Meeting participation: show the qualifying gathering list. Keep these measures distinct from average attendances per offered week.
- Two-person comparisons must carry the selected person's ID, not only their display name or series colour.
- Monthly giving: recorded dates linked to the corresponding gatherings when available, plus complete/partial/before-history eligibility. No record means no recorded evidence; the profile tither flag is not monthly evidence.
- Collected/brought/returned people: named distinct people with contact date, first recorded Sunday and return evidence appropriate to the clicked measure. Preserve shared collector and inviter definitions and the permitted-scope label.
- Retain source IDs and rows alongside calculated evidence. Resolve permitted names from existing data; extend the person-scoped response only if needed. Invited-person evidence currently exposes dates rather than the complete service-ID trail, so exact event links may require a small authorized response extension.
- Leader review and Growth plan stay in their existing views, with their unsaved-draft protection.

### Reports

**Current:** all comparison metrics share the generic total/average/denominator popup. The page already loads people, contacts, services, meetings and care records.

**Proposed:**

- Route each metric to the relevant record list: people snapshot, outreach cohort, services, held meetings or care interactions.
- Use the same qualifying selector for the headline, contribution list and full-list navigation. Show actual dates, counts and calculation.
- For monthly averages, show month contributions including zero months, then records in each month. For per-service/per-meeting averages, show individual gatherings.
- Distinct people and current directory snapshots do not acquire a misleading per-meeting average or historical scope.
- Add explicit **View records** to useful summary figures that currently have no detail.
- **Open matching records** must carry filters into the destination. Reuse page-owned domain adapters so Reports does not develop another set of definitions.
- Keep CSV configuration separate. Do not silently alter the user's export selection when inspecting a metric; a future export action is outside this initial scope.

### Memories

**Current:** the album viewer already fits media. Existing service-memory links can lead only to the general Services page; album data can also carry service/meeting IDs.

**Proposed:** retain the viewer, captions, date/location and reflection. Add an exact **View service** or **View meeting** action for linked albums, with the correct label. Preserve the selected album/media on return. No change to upload or album-management workflows is needed for this request.

### Manage access and shared utilities

Access settings use inline account controls and confirmation. Keyboard shortcuts and filter dialogs have specific utility purposes already. Keep these behaviors. Shared dialog work must preserve their keyboard, focus and confirmation behavior; do not add analytics pop-ups to administration screens.

## Implementation design

Keep one shared dialog foundation and small reusable list/detail components, with page-owned domain content. Avoid either duplicating every modal or expanding `ChartPointDetails` into a component that knows every business rule.

1. Define a drill-down selection carrying source domain, metric key, aggregation mode, series/person/programme identity, bucket bounds, active filters and contributing record IDs. Treat the aggregate's scope separately from the point's displayed position (particularly Outreach averages).
2. Preserve source membership in `groupChartPoints`; it currently drops a bucket's ID when multiple records contribute. Add metadata without letting numeric source metadata become another chart measure. Preserve the public behavior needed by existing callers.
3. Extend chart callbacks to retain selected metric/mode/series for both grouped and ungrouped points. `MetricComparison` currently passes only the metric object; `MeetingBarChart` passes the programme and primary value. Define the callback contract once and adapt consumers deliberately.
4. Implement reusable service/meeting/person/care contribution lists and a single visible drill-down navigation state. Preserve context through Back and exact-record URLs. Handle invalid/deleted/restricted record IDs explicitly.
5. Use the same data selectors for chart values and record lists. Label rounding at display time and verify the visible contributions reproduce the displayed result under its existing rounding rule. Do not average averages for unequal-size groups.
6. Reuse loaded records where possible. Additional API reads should be on demand, cancel/ignore stale responses after a new selection, and respect backend authorization. No schema migration is expected from this review.

Likely touchpoints: `src/lib/components/charts/`, `src/lib/utils/chartUtils.js`, reporting/attendance/development selectors, route components, existing detail components, and exact-record route handling. Backend changes should be limited to missing permitted evidence, not a new analytics data model.

## Approved plan and execution

Launch only after the owner accepts the plan. Use scoped subagents in sequence in the saved project; do not create new user tasks for implementation. Each receives only the shared rules, its relevant section/files and previous handoff. One agent owns writes at a time. Run focused checks per batch, followed by one integrated verification pass.

| Batch | Scope and ownership | Suggested model / effort | Completion evidence |
|---|---|---|---|
| A | Selection contract, source-preserving grouping, navigation state, reusable read-only event/detail primitives and exact-record links | GPT-6 Sol / Medium | Grouping/selection tests; same-day multi-event, Series B and Back-state behavior |
| B | Sunday Services and Dashboard, including activity links | GPT-6 Luna / High | Month/week average to source services; category counts; fallback period; existing history preserved |
| C | Meetings and People history integration | GPT-6 Luna / High | Meetings-held vs unique-people views; programme-scoped frequencies; profile meeting drill-down |
| D | Evangelism, Pastoral Care and bounded Follow-Up improvements | GPT-6 Luna / High | Metric-specific contact/care lists; cohort and average scope; worker filters; overlay transitions |
| E | Development evidence drill-down and any required authorized response extension | GPT-6 Sol / Medium | Evidence reconciliation, exclusions, giving authorization, correct comparison person |
| F | Reports adapters, Memories links and remaining summary entry points | GPT-6 Luna / High | Every report metric opens correct sources; exact album links; no export-state changes |
| G | Integrated review and non-browser verification | GPT-6 Sol / Medium | `npm run verify`, targeted regression checks, coverage gate; record remaining browser work |
| Separate task | Browser verification on the built-in browser, then Practice acceptance evidence | GPT-6 Luna / Low initially | Checklist below, screenshots and actual results; escalate effort only for investigation |

These were task-fit recommendations, not automatic model switches or fixed-cost estimates. The planning session exposed both recommended models, but Luna was unavailable through the implementation subagent API. OpenAI's [model guidance](https://learn.chatgpt.com/docs/models) positions Sol for complex coding and Luna for focused tasks; its [pricing guidance](https://learn.chatgpt.com/docs/pricing) lists lower token credit rates for Luna. Keep the cheaper model's assignments explicit when available; escalate a calculation/authorization issue to Sol rather than repeatedly retrying an underspecified task.

The table above records the proposal. Actual sequential implementation used A: Sol/Medium; B: Sol/Low; C, D1, D2, E and F: Sol/Medium; G: Sol/Medium. Luna was unavailable through the subagent API used for those batches. D was split into D1 and D2 to keep Evangelism/Care and Follow-Up ownership bounded. Browser verification remains a separate task, with Luna/Low recommended where available.

Implementation used the existing saved project and branch at `d5cb782`, retaining its uncommitted work. Batch handoffs are recorded in `docs/implementation/README.md`. Browser verification is explicitly pending.

## Verification and acceptance

Automated acceptance should exercise behavior and data reconciliation, not duplicate component markup:

- Monthly/weekly total and average reproduce the contributing records, including unequal group sizes, zero-valued records, one event and multiple events on one date.
- Boundary weeks, year changes, partial months and current-day cutoff preserve exactly the source date rules.
- Primary and comparison series retain different metrics, modes and people; changing filters cannot leave stale detail visible.
- Unique people are deduplicated; repeated attendances are not. Unnamed/unclassified counts remain visible and cannot create fake person links.
- Meeting and service status exclusions match their parent chart; unknown registers remain unknown.
- Outreach contact-cohort and period-average semantics remain consistent across number, explanation and people list.
- Development tests cover weekly vs meeting evidence, excluded registers/months, distinct invitation/return evidence and confidential access.
- Deep links open the correct record after data loads; invalid/unavailable records display a useful result rather than another record.
- Existing attendance/call/care forms, unsaved edits, archive/merge controls and CSV selections remain unaffected by read-only exploration.

The separate browser task should test desktop and approximately 390px mobile layouts, normal and fullscreen charts, mouse and keyboard, both series, group-by controls, Back/Close/Escape/focus return, long lists, empty data and unavailable/restricted detail. Use deterministic local fixtures for arithmetic and rare edge cases, then read-only real Practice records for integration. Include this sequence for every relevant domain: **figure → source list → record → person → return**.

Run the critical `npm run test:e2e` workflow in the browser-verification stage. Capture failures with route, filters, clicked measure, expected versus actual behavior and screenshot; the verifier should not broaden into unrelated implementation. Do not mark the programme fully verified until that separate task finishes.

Only publish a Practice candidate through the existing pinned Preview workflow; preserve its database and test edits. Do not refresh Practice as part of opening/testing it. Production merge/release still requires explicit owner approval.
