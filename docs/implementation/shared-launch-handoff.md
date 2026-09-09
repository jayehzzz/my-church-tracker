# Shared church version — 9 September 2026

Status: shared backend and website deployed; initial backups complete. User sign-in/workflow checks and choice of regular backup arrangement remain pending. Historical church import remains on hold.

Follow-up: user confirmed the shared password login works. Google is not yet approved in live; corrected the frontend's handling of the production `ACCOUNT_NOT_APPROVED` error and published deployment `dpl_3N7geonzY8QoWVWN4oyWtTAECgU7` (READY). Google should now reach the approval-request screen; that user check remains pending. No Google access was granted automatically. Regular backups still await the user's choice.

## Confirmed destination and website

- Shared website: https://my-church-tracker.vercel.app
- Vercel project: `my-church-tracker`, `prj_VeY7scEGmWJI7PhJphdIiSxzitta`, existing team. Production deployment `dpl_DLQTp98KqL3oZPcEkF4Y1BLnVRHF` returned READY, with permanent production aliases assigned.
- Convex: `jayden-ayeh:church-tracker:production`, deployment `elated-bee-284`, project ID 1495289, deployment ID 2383104. Provider API confirmed this is the existing default production deployment, separate from practice deployment `hidden-guineapig-648`.
- Before setup, the live deployment had no tables or environment variables. No existing church data was removed. Vercel's existing Production variables already selected this database and live/production mode.

## Changes performed

- Set matching public Auth0 domain/client configuration and `CHURCH_ENV=production` on the explicitly selected live backend. Deployed the current integrated schema/functions using a private explicit production-selection env file. No seed, reset, restore, or church-record import.
- Provisioned exactly the previously approved active password-owner identity from practice as the first live owner, retaining its existing display name and confidential grant. Identity was selected by stored provider identity and approved owner status, never by name/email guessing. The temporary maintenance flag was removed immediately afterward. Readback: one active password owner, zero people, zero services. Practice accounts and data were untouched; other accounts were not copied or promoted.
- Published the integrated working-tree frontend to the existing permanent website. Aligned the Svelte adapter runtime with the host's configured Node.js 24. Added `.vercelignore` to exclude env files, operational documents, coverage and test artifacts from upload.
- Left existing Auth0 allowlists and Vercel protection configuration unchanged. Final hosted password sign-in and whether the user encounters an additional Vercel access screen must be checked by the user. No hosted login is claimed verified.
- Local `.env.local` retains its inherited development frontend and recovery-rehearsal CLI defaults. Use explicit deployment selection for all live operations; do not run a bare Convex deploy from those defaults.

## Backups completed

- Before changes: file-inclusive export saved privately at `/Users/jaydenayeh/.codex/private/church-launch-2026-09-09/live-before-setup.zip`; ZIP integrity passed.
- Added `scripts/backup-live.py`, pinned to the confirmed live team/project/deployment. It uses the signed-in operator, exports database plus files, validates ZIP integrity, writes SHA-256/count metadata, and stores everything under `~/.codex/private/church-backups/elated-bee-284/` with private permissions. It has no import/restore/delete-data path, does not print credentials or personal rows, serializes local runs with a lock, and ignores inherited Convex selection/credentials. Interrupted stale locks require operator inspection before removal. Existing backups are not automatically deleted.
- The first attempt exposed a Convex CLI requirement for a package manifest. The isolated export directory now supplies the installed CLI version and explicit selection; rerun completed successfully. Post-setup local copy: `20260909T122415Z-5193d1ea`, 11,921 bytes, manifest and integrity check present. This was an operational backup, not a restore rehearsal.
- Provider backup 1590445 completed with `includeStorage=true`; expires **16 September 2026 at 12:24:55 UTC**. Older backup 1575781 was preserved. Provider currently allows two cloud backups; do not delete an existing backup merely to make space without reviewing retention.

## Regular backups — user choice pending

Live account readback: `periodicBackupsEnabled=false`; periodic backup configuration is null. Available plan API lists Professional at 25 per developer seat monthly; no subscription was created, payment details supplied, or paid upgrade made. The code repository is PUBLIC: never place church snapshots in its source or public workflow artifacts.

Asked the user to choose free Mac-dependent backups or review the provider-run paid upgrade. No answer received at this handoff. No recurring automation or provider schedule was enabled. The one-off copies above do not constitute regular backups.

If the user chooses the free arrangement, use the app's recurring automation tool to run `python3 scripts/backup-live.py` daily from the saved project. Explain that execution depends on the Mac/Codex being available and on continued operator login. Notify on failure or required action; keep successful unchanged runs quiet. Agree retention and a private off-device copy; this Mac-only approach is less resilient than independent provider backups. If the user chooses provider backups, review the actual checkout price/seat count before charging, then enable a file-inclusive daily schedule and read it back. Do not work around the provider's plan entitlement.

## Remaining launch work

1. User checks password sign-in at the permanent address, owner navigation and cross-client updates. Restricted leaders still need their own approved identities and correct person assignments. Keep confidential giving/care restricted.
2. Complete the regular-backup decision/setup and agree retention/restore-check responsibility. Existing isolated recovery evidence is documented in `docs/recovery.md`; no production restore was performed.
3. Church profile/settings model and the reviewed import's identity/attribution/unknown-history gaps remain as described in `church-import-review.md`. Shared hosting does not resolve or authorize those held import decisions.
4. Production is deployed from the integrated uncommitted working tree. The public GitHub repository still points production at `main`; merging/pushing older code could overwrite this deployment. Reconcile and review the integrated changes before the next Git-triggered release. No commits, pushes, merges or repository visibility changes were made here.

Validation: provider configuration/status and database readbacks, deployment-required bundling/build/schema validation, and backup integrity/hash checks. No unit/backend/browser tests, standalone build, simulated app-user actions, or restore tests were run, following the user's testing preference. The inherited latest sign-in renewal repair remains pending the user's reproduction check.

State: `codex/staging-accounts-and-verification`, base `9abda19`, extensive inherited uncommitted work preserved. New changes: runtime alignment, deployment exclusions, private backup script and documentation; no reset/stash/commit.
