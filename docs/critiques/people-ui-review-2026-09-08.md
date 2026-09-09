# People UI review — 8 September 2026

Scope: the People directory, map dashboard and person profile. Inspected current source and the built-in browser in an explicitly selected local demo; no live church records or deployments were changed.

## Findings and implemented decisions

| Finding | Decision |
| --- | --- |
| The directory displayed a date filter which did not filter people, then a table and eight arbitrary duplicate profile cards. | Remove the irrelevant date filter and duplicate cards. Keep the directory as the primary view and compact its heading. |
| Map search, mode controls and a route drawer competed for the same canvas; selecting a marker also selected a route stop. | Use a map and searchable people panel. Selecting a pin opens contact context and a profile link; choosing a list result focuses that person's pin. Search moves above the map on narrow screens. |
| The visitation queue was demo-only, route origins came from a hardcoded sample church, and average distance was not route distance. | Remove visitation/network/route controls from this location view. Care planning remains in Pastoral Care. Do not imply the sample church location is configured for a live church. |
| The standalone `/people/map` route always loaded mock people. | Redirect it to the same `/people?view=map` implementation and service-backed data flow. |
| People without coordinates silently disappeared; zero-valued coordinates were rejected. | Report saved-location coverage, list people without pins, validate coordinate ranges including zero, and explain no-location/no-result states. |
| The profile's radar and activity percentage used arbitrary scores; the chart also contained unrelated historical trend copy. | Replace the arbitrary scores with a participation radar and a separate leader-authored review, following the user’s clarification below. Retain a factual attendance summary and clearly identify activity status as manually recorded. Exclude future, cancelled, scheduled and absent attendance from actuals. |
| Contact details were truncated, decorative status dots looked like online indicators, and activity editing had no working menu. | Use full contact values, call/email links, separate copy buttons, and working labelled status/activity selects. |
| Care was buried below large background cards, blank school panels and notes. | Default to Activity & care, with a separate Personal & church details view. Retain church schools, baptism, tithing and personal information there; distinguish unknown boolean values from No. Move duplicate merge into Record management. |
| The notes editor closed without saving. The person form also tracked its own editable snapshot, allowing a reset/update loop. | Add notes to the existing saved person form, connect notes editing to it, and stop the initial snapshot from becoming an effect dependency. Verify contact fields survive a notes-only save. |
| The profile rendered hundreds of attendance rows and made meeting rows look clickable without an action. | Show the first 15 records with Show more, use stacked records on phones, and expose actual service-detail buttons. |
| Profile timeouts/failures substituted mock records or success-shaped empty data. | Keep failed sections visibly unavailable with a retry action. Do not show a green no-open-actions state when care failed. Ignore responses for a previously opened profile. |

## What remains relevant

The directory is the everyday entry point. A map is useful for seeing where recorded people are located, but should remain an optional view, not a second general dashboard. Profiles should answer who this person is, how to contact them, what care is outstanding and what attendance/history is recorded. Background details remain accessible without filling the default screen.

A future route planner would need a real configurable origin, a defined care workflow, valid saved locations and clear route ordering. There is currently no address-to-pin workflow in the person form. No geocoding provider or new location collection was introduced in this UI pass. Church schools and stewardship fields were retained rather than making unrequested decisions about church record-keeping.

## Participation and discipleship — user clarification

The user wants to retain a radar and combine participation with a leader’s explicit assessment. It must support members growing toward leadership, not depend on an existing worker role.

- Every profile can open Participation & discipleship; members and workers see it expanded. Four attendance axes show Sunday services (including special Sunday services), prayer, bacenta and workers’ meetings over 12 or 24 completed Monday–Sunday weeks. Each week counts once per category. This is recorded frequency, not attendance divided by scheduled opportunities, and there is no combined score, comparison or inferred spiritual rank.
- Inviting shows dated contacts explicitly linked to the person as inviter. It does not count repeated invitations or claim conversion/attendance. Tithing shows explicit giving dates and calendar months separately from weekly attendance, alongside the existing profile tither status. A static tither flag does not establish regular giving. Completed schools remain contextual milestones.
- Leader’s discipleship review records a journey focus, conversation date, understanding/growth, agreed next step and optional next review date. Earlier conversations remain accessible. Reviews do not promote a member or change account permissions.
- Convex stamps authorship and creation time using the authenticated account. Saving requires existing confidential access and the existing person write scope (administrators or assigned leaders). The entire review history is redacted for accounts without confidential access. Backend tests cover author spoofing, access revocation, invalid dates and history retention; failed UI saves preserve the draft.
- Inaccessible linked service/meeting details now fail visibly instead of silently disappearing into zero participation. The existing permissions on gathering records have not been broadened. A live assigned leader may therefore see attendance history unavailable until a separately designed scoped gathering-summary read is provided.

## Verification and state

- `npm run test:unit`: 158 passing tests, including coordinate validity, actual attendance, request failure/timeout handling, status callbacks, notes save/contact preservation, unavailable history and attendance pagination.
- `npm run build`, `npm run check:backend`, and `npm run test:backend` (46 tests): passed. New optional people review history and the append mutation require deployment with the frontend before live use.
- Built-in browser: explicit local demo, desktop and 390 × 844; map search/filtering, empty search, focused pin popup/profile navigation, profile views and notes save checked. Map/profile document width measured 382px in the 390px viewport. Local demo save verified the note and retained email/phone; this is not evidence of a live database write or production deployment.
- Follow-up built-in-browser checks: 12/24-week selector, category details, demo review save and reopening through the directory, unchanged membership, and desktop/mobile review editor. Radar and editor both measured 382px document width at 390 × 844. Demo review persistence is in-memory; authenticated Convex persistence/permissions were tested with convex-test, not a deployed live browser. No deployment performed.
- Branch `codex/staging-accounts-and-verification`, base `9abda19`; changes remain uncommitted. Inherited untracked `.github/`, `AGENTS.md`, `coverage/` and `test-results/` preserved.
