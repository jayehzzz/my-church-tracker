# Password sign-in and restricted leader access

9 September 2026. Implemented locally and backend deployed to isolated staging; account onboarding and authenticated browser acceptance remain incomplete.

## Confirmed operating model

The application tracks the ACTS constituency within Mustard Seed Chapel International Milton Keynes. Sunday attendance is ACTS attendance, not the whole congregation. There is initially one bacenta, Jaydens bacenta; additional bacentas may follow. Use existing programme definitions and Jayden as the initial responsible person. Growth targets are optional and do not block starting.

The intended roster is Jayden as owner, Tariq and Shane with assigned follow-up and evangelism access without confidential care/giving, and a separate restricted test login for Jayden. Account emails remain in the user's conversation, not this repository. These are intended permissions, not evidence that the accounts have been created or approved.

## Implemented

- Approval rechecks now activate the same authenticated session without a reload; regression coverage also checks subsequent revocation.
- Use Auth0 Universal Login instead of forcing `google-oauth2`. Provider-neutral login and approval text. Existing Google identity remains usable during migration; matching an email never automatically merges or approves identities.
- Auth0 database/password identities must carry `emailVerified: true` to request or use app access. The app explains verification failures and removes protected access.
- Redact giving fields (`is_tither`, `gave_tithe`, and tither aggregates) from secured responses without a confidential grant, including nested person/attendance projections. Reject explicit edits/clears of those fields. Hide and omit giving/private notes in the person form.
- Allow an approved, person-linked leader to create an outreach contact, with collector and active assignment fixed to that leader. Only newly inserted contacts gain scope within this transaction; existing contacts cannot be claimed or delegated. Contact creation creates a first-contact task unless the person requests no contact or already has a church. Those contacts remain assigned without an automatic call task. Existing assigned-contact and revocation boundaries remain.
- Leader outreach form omits private notes, ownership/collector overrides and membership promotion. Navigation emphasises dashboard, evangelism, follow-up and assigned people. Backend access controls remain authoritative for direct URLs/API calls.
- Follow-up scheduling and quick no-answer actions omit private note/reason inputs for restricted users. Confidential notes and close-contact decisions are hidden without a grant; structured scheduling, expectations and later actions remain available.

## Verification

- 178 frontend/unit tests pass, including verification-required sessions and restricted person-form payloads.
- 56 backend tests pass, including unverified password denial, owner approval independent of email, giving redaction/edit denial, self-owned outreach creation, blocked attribution/delegation, no-contact task suppression and successful restricted follow-up completion.
- Backend TypeScript, production build and `git diff --check` pass.
- Existing Playwright attendance/care transaction workflow passes (1 test, in-memory authenticated backend).
- Built-in browser verified the revised sign-in screen and real Auth0 email/password login, reset-password link and sign-up form. Localhost port 5173 was rejected by the configured callback allowlist; use already-approved `http://127.0.0.1:5190/` for this session. No callback allowlist was widened.
- Read-only Auth0 dashboard inspection confirmed `Username-Password-Authentication` already enabled for Church Tracker, sign-ups enabled, username requirement off, brute-force protection enabled. No Auth0 settings were changed.

## Staging operation

- Verified target during CLI deployment: `jayden-ayeh:church-tracker-staging:dev/jayden-ayeh`, deployment `hidden-guineapig-648`.
- Before deployment, exported a file-inclusive snapshot, verified ZIP integrity, and confirmed it held 2 people, 0 services and 2 active app accounts (owner and leader). These are inherited staging records; no deletion/reset/import was performed.
- Recovery copy is in restricted temporary storage at `/tmp/church-access-staging-20260909/before-password-access.zip`, with its provider snapshot also available. This is a one-off pre-change backup, not the ongoing backup policy.
- Deployed the current integrated schema/functions with explicit staging env selection and backend type-checking. New development/memory indexes from the inherited working tree were included. Generated API types updated accordingly.
- Local test server on 127.0.0.1:5190 uses explicit staging environment overrides. Restored the original frontend development URL after the Convex CLI changed `.env.local`; retained the inherited recovery-rehearsal CLI selection. Always select staging explicitly for subsequent CLI actions.
- No Vercel/frontend release or production deployment was made. No church-record import was performed.
- Jayden personally created and verified his password identity. The signed-in password identity submitted a real access request; the original Google owner approved it as an active owner with confidential care/giving access in staging. The original owner remains active. Readback showed no pending request and the password session confirmed its approval. Auth0 verification email arrived in Spam.
- Final password sign-in passed: Jayden confirmed success, the built-in browser showed him navigating protected app pages, and Auth0 showed a fresh login on the database/password identity after owner approval (third login, 12:41 local). The stale login tab was closed; the working app tab remains open.

## Required next steps

1. Password sign-up, mailbox verification, staging owner approval and final protected-app entry are complete. Retain the original Google owner until the hosted migration is fully verified.
2. Browser tooling requires user entry/submission of new passwords; never request a password in chat. Preserve last-owner protections.
3. Each remaining user must establish their own password identity, verify their email and request approval. Link restricted accounts to the correct person, assign only their work, and grant no confidential access. Keep test activity in staging.
4. Verify owner and restricted sessions in the real browser: outreach creation, follow-up completion, forbidden giving/care access, cross-client updates, logout and revocation. Password-reset delivery and final hosted origin/session behaviour still need verification.
5. Historical import needs a separate reviewed mapping: reconcile first-timers into Sunday totals, preserve unknown cells, review same-name people and shared collector credit, and accommodate unknown surname/birthday years without invention. No source sheet was modified.
6. Finish the previous live workflow checks and agree routine file-inclusive backups before production release.

State: `codex/staging-accounts-and-verification`, base `9abda19`. All changes remain uncommitted alongside the extensive inherited working tree; no reset/stash/commit performed.
