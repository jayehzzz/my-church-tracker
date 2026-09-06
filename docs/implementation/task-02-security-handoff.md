# Task 02 security implementation — complete, 5 September 2026

## Access policy

The user delegated the final choice: Google sign-in through Auth0, explicitly approved accounts, summary-only viewers. No account is approved automatically, including the first visitor. `crm_users.external_auth_id` contains the **verified `tokenIdentifier` (issuer + subject)**, not an email, bare subject, or a person selected in a church-leader dropdown. Existing unlinked users remain unable to sign in.

| Capability | Owner | Admin | Leader | Viewer |
|---|---|---|---|---|
| Church summary counts | Yes | Yes | Yes | Yes |
| Personal records | All | All | Own linked profile and actively assigned people | No |
| Create people, assign follow-up ownership, manage gatherings/attendance/photos, run global reconciliation | Yes | Yes | No | No |
| Update assigned people; create/complete own follow-up tasks; commitments/plans | Yes | Yes | Assigned people only | No |
| Confidential notes, free-text reasons, pastoral-care records | Separate explicit grant | Separate explicit grant | Separate explicit grant, within scope | No |
| CSV export control | Yes | Yes | No | No |
| Approve/deactivate accounts and grant roles/confidential access | Yes | No | No | No |
| Seeds, migrations, disposable reset, first-owner bootstrap | Internal operator functions only | Internal operator functions only | No public access | No public access |

Scope comes from active `follow_up_assignments` tied to the user's linked person. Leaders cannot expand their own scope through assignee fields, person roles, invitations, reparenting a related row, or account writes. Unlisted mutations default to administrator-only. Whole pastoral-care rows require the confidential grant because purpose/outcome can themselves be sensitive. Generic nested note/reason fields are removed from responses without that grant; writing or explicitly clearing them is denied. Merge/deletion requires the grant and refuses linked accounts until an owner explicitly unlinks them.

Every domain query/mutation uses `queryFor`/`mutationFor` in `convex/lib/security.ts`. Row-level rules default to deny for unlisted tables. Changes append `security_audit` rows with the authenticated `crm_users` ID and affected record ID; no private payload is copied into this log. Caller-supplied creator/completer IDs are replaced from the session. Historical performer/assignee fields describe church work; the audit is the authoritative acting account. Owners without a linked person can manage access and records, but recording their own completed care/follow-up requires a linked person.

Exports cannot reveal rows/notes that the caller's backend reads do not permit. The CSV download utility also verifies current administrator access through `access.authorizeExport`. As with any readable data, access control cannot prevent a user from manually copying information they are permitted to read. The old mock-data “backup” has been disabled; genuine backups remain Task 06.

## External setup and live verification

Task 01 configured the Auth0 SPA and Google connection, matching frontend/backend issuer and audience, and first-owner access in development and isolated staging. Official Convex code generation/type checking now passes. Staging is `church-tracker-staging` / `hidden-guineapig-648.convex.cloud`; verification used a local frontend at `http://127.0.0.1:5190` with an environment override. `.env.local` continues to select the existing development deployment. After local verification, one Vercel **Preview** deployment was created for HTTPS session acceptance: https://my-church-tracker-9pq0sojip-jaydenayeh-1940s-projects.vercel.app. Its exact callback/logout URLs and web origin were added to the existing Auth0 SPA while preserving existing entries. Deployment inputs were checked to exclude local environment credentials. The preview uses isolated staging; no production deployment, production alias promotion, backend deployment or database write was performed during these follow-up checks.

Live checks on 5 September 2026:

- A real Google/Auth0 owner sign-in completed in the built-in browser. The actual account name and owner role appeared in the profile; the empty staging dashboard loaded. Both OAuth callback parameters were removed from the address bar.
- Two independently authenticated tabs lost their protected content immediately when one signed out. Auth0 logout returned to the sign-in page; reloading the other tab on `/people` remained signed out. A non-sensitive local sign-out hint now prevents silent restoration after a failed provider logout; it stores no token or identity. The storage-event fallback covers browsers without BroadcastChannel.
- Ordinary deployed HTTP requests to `access.me` and `people.getAll` without authentication returned `UNAUTHENTICATED`. Malformed JWTs and a correctly structured token with the configured issuer/audience but a forged signature returned HTTP 401.
- Public HTTP calls to both seeds, disposable reset, a migration and first-owner bootstrap were rejected as non-public functions, both anonymously and through the actual owner's authenticated frontend client. No maintenance handler executed.
- An unapproved synthetic identity was denied by the deployed `access.me` handler. This used the authenticated operator CLI's identity simulation, not a Google JWT, and is evidence of the deployed approval guard only. The complete owner/admin/leader/viewer, revocation, confidential-access and forged-actor matrix passes against backend handlers in `convex-test`; no synthetic accounts or church records were added to staging.
- On the loopback origin, Auth0 returns `consent_required` for automatic restoration/renewal. The app safely asks the user to continue with Google again. On the **HTTPS staging preview**, Google sign-in, full reload onto `/people`, and automatic restoration in a second `/reports` tab all passed. An explicit Auth0 SDK renewal with `cacheMode: off` returned a fresh ID token that the staging backend accepted as the owner. Signing out cleared both tabs; signed-out reload remained protected. These are actual provider/backend checks, separate from local mocks.

**Task 02 acceptance is complete. Release requirements:** replace Auth0's shared Google developer credentials with the church's own Google OAuth credentials before release, retain exact callback/logout/web origins for each approved deployment, and repeat the session check for the final release origin and intended browsers. The current HTTPS preview remains the non-production verification address. Auth0's loopback confirmation requirement is an expected local limitation; no callback protection was disabled and bearer tokens remain in memory. The browser stores only a non-sensitive session-state hint. If an intended browser prevents silent provider-session access, validate a supported renewal strategy for that browser before release. Production release and the unfinished work inherited from other numbered tasks remain separate.

Owners can use authenticated `access.setAccount` to approve an exact verified issuer/subject, link a person, grant confidential access or deactivate an account. There is no account-management UI in this brief. Bootstrap remains an internal operator operation: temporarily enable `CHURCH_MAINTENANCE_ENABLED`, run `access.provisionFirstOwner` only when no active owner exists, then remove the flag. Task 01 already completed that step for the two non-production deployments; do not repeat it or reset their data.

References: [Convex Auth0 integration](https://docs.convex.dev/auth/auth0), [Auth0 SPA SDK](https://auth0.com/docs/libraries/auth0-single-page-app-sdk), [Auth0 local callback confirmation](https://auth0.com/docs/secure/security-guidance/measures-against-app-impersonation), [Auth0 session restoration troubleshooting](https://support.auth0.com/center/s/article/Why-is-authentication-lost-after-refreshing-my-SPA), [Convex test harness](https://docs.convex.dev/testing/convex-test).

## Maintenance

All seed functions and migrations, including legacy meeting migration, are internal. Browser programme initialization no longer calls the legacy migration. Non-seed migrations require `CHURCH_MAINTENANCE_ENABLED=true`.

Seeding/reset additionally requires `CHURCH_DATA_DISPOSABLE=true`, `CHURCH_ENV=development` or `test`, and a `confirmation` argument exactly equal to `DISPOSABLE ` followed by that deployment's `CONVEX_CLOUD_URL`. Production-looking URL substrings are not used. The large seed defaults `clearFirst` to false. If clearing is explicitly requested, the reset table set is derived from the current schema and includes all application relations, recovery snapshots, app-user grants and security audit rows. Access must be provisioned again after such a disposable reset. Stored file bytes are not deleted by this relational reset; file lifecycle/backup restore remains Task 06. Large resets must stay within Convex transaction limits or fail atomically.

Task 02 ran no seed, reset, migration or bootstrap against a real deployment. Task 01 provisioned the explicit owner accounts and removed the maintenance flag afterwards. Task 02 role fixtures remain deterministic and in-memory only; live follow-up verification preserved staging at zero people and one active owner account.

## Dependency disposition

Initial audit: 20 affected packages (2 critical, 12 high, 4 moderate, 2 low). Updates were performed in deliberate groups:

- Convex runtime/auth helpers: Convex 1.45.0, convex-helpers 0.1.123, Auth0 SPA SDK 2.24.1. The installed convex-test 0.0.56 requires Convex >=1.43.
- Framework/adapters: Svelte 5.57.0, SvelteKit 2.70.3, Vercel adapter 6.3.4. TypeScript was set to 5.9.3 because the concurrently installed 7.x version did not satisfy SvelteKit's peer range.
- Build/test tools: Vite 6.4.3 and Vitest/coverage provider 3.2.7. This retains the Vite 6 / Svelte plugin 5 combination and deliberately updates the previously vulnerable Vitest 1.x major. Vite's default browser resolution conditions are now preserved; the old empty override silently selected Svelte server lifecycle exports. The dev file-serving allowlist is restricted to this project.
- Targeted transitive updates: browserslist, form-data, nanoid, picomatch, postcss, postcss-selector-parser, rollup and their resolved dependencies. No forced blanket upgrade or dependency override was used.

Final full audit: **4 low affected-package entries, 0 moderate/high/critical**. These four entries are one underlying advisory, [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x), on SvelteKit's `cookie@0.6.0`, propagated to SvelteKit and its adapters. It requires untrusted cookie names/path/domain passed to serialization. The app defines no server cookie setters or dynamic cookie names/path/domain; Auth0 uses its own browser SDK and tokens remain in memory. No reachable app-controlled call site was found. Retain this documented low finding until SvelteKit updates the dependency; re-evaluate immediately if server cookie handling is added. NPM's suggested “fix” was a downgrade to a historical SvelteKit version and was deliberately rejected. `npm audit --omit=dev`: **0 vulnerabilities** (this is supplementary; SvelteKit's runtime code is built from a dev dependency and was included in the full audit).

The original [Vitest advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp) concerned its listening UI server; the project does not enable that server or ship it with the site. It was still fixed by the test-runner upgrade.

## Local checks and inherited state

- `npm run test:unit`: 136 passing frontend/unit tests, including mocked provider lifecycle, token expiry, callback rejection, immediate sign-out and rejection of late HTTP responses.
- `npm run test:backend`: **15 passed**; role/identity/confidentiality/actor/scope tests plus existing person-validation tests. Public-handler enumeration checks all current public backend exports reject missing identity before accessing arguments/data. Internal-only maintenance registration, disposable flags and full-schema reset are tested independently.
- `npm run test:coverage`: passes (136 tests); the V8 coverage provider is installed and verified.
- `npm run check:backend`: passes. Narrow type repairs to unfinished Task 03/04 code were necessary: merge callback annotations, optional attendance values, and gathering union narrowing; those tasks' behavior work remains theirs.
- `npm run build`: passes with existing accessibility/component warnings.
- Built-in browser: protected routes show setup required and no personal app content; popup fixture renders literal HTML/punctuation, missing role/address, and both route buttons. No image/script/SVG/inline event-handler nodes appear from fixture values. `npx vite --config tests/browser/vite.config.js`, then open `/tests/browser/security-popup.html`, reproduces the popup check without backend access.
- Live Google sign-in, two-tab sign-out, signed-out reload, JWT rejection and ordinary-client maintenance isolation pass as detailed above. Successful restoration and forced renewal also pass on the HTTPS staging preview; loopback-origin consent behavior is documented above. Late rejected requests from a previous session now cannot revoke a newly authenticated session, with a regression test.
- Branch `main`, base `f7b9f2a`; all work is uncommitted. Substantial baseline work was preserved. Tasks 01 and 03–06 had been running concurrently; with the user's authorization, Tasks 03–06 were paused and Task 01 completed its local handoff before shared auth/client/package integration. Those tasks remain paused for sequential resumption.
