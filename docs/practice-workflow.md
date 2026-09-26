# Making changes with Practice

## For the church owner

- **Live church:** https://my-church-tracker.vercel.app — use this for real church work.
- **Practice church:** https://my-church-tracker-rehearsal.vercel.app — use this to try app changes. Look for the amber **PRACTICE** banner and sign in with your approved church account.

Tell Codex what you want changed. Codex prepares the change, updates Practice, and gives you that same Practice link. Try it and ask for adjustments. Say **“Put this on the live website”** when you approve the release.

Practice uses a separate copy of real church records. Editing, adding or deleting records there affects only that copy. Releasing a feature publishes its code; it never copies your practice edits into the live database.

Opening Practice keeps your test edits. Ask **“Refresh Practice from live”** when you want newer records. Refreshing replaces the Practice records, including your test edits, with a new snapshot. It is not continuous synchronisation. Practice still contains private church information, so only approved testers should use it.

## For the implementing agent

1. Inspect the branch and working tree. Preserve existing work. Start one `codex/<change>` branch from up-to-date `main`; continue on it for corrections. Work sequentially in this saved checkout.
2. Implement and run `npm run verify`, relevant browser checks, and the critical `npm run test:e2e` workflow. Run coverage for the review/release gate. Open a pull request; its **Verify** workflow must pass before merge. GitHub requires a pull request and the `application` check for `main`, including for administrators, and blocks force pushes and branch deletion. No second reviewer is required for this single-owner project; the owner's explicit live-release approval remains the agent's gate.
3. Prepare Practice from a clean, pushed source commit. Verify the Vercel project is `my-church-tracker` (`prj_VeY7scEGmWJI7PhJphdIiSxzitta`) and the target is **Preview**. Preview configuration must use `VITE_APP_ENV=staging`, `VITE_APP_MODE=live`, `VITE_APP_VARIANT=rehearsal`, and `VITE_CONVEX_URL=https://standing-mongoose-699.convex.cloud`.
4. For backend changes, deploy the matching functions/schema to the pinned Practice deployment first, without importing/resetting its data. The refresh command also deploys backend code, but must only be used when a refresh was requested. Verify migrations separately; never substitute a production target.
5. Build/deploy the frontend with the verified Preview configuration. Inspect its project, successful status, source commit and target, then point **only** `my-church-tracker-rehearsal.vercel.app` at that deployment. Keep the existing Auth0 origins and sign-in/access checks. The random deployment links may require Vercel sign-in; give the owner the permanent Practice link.
6. Verify sign-in, the Practice banner, copied data, and the affected workflow at the permanent link. Keep checks with real records read-only; use clearly labelled temporary Practice records for write tests. Record the source commit and deployment ID in the handoff.
7. Wait for the owner's explicit live-release approval before merging into `main`: a push/merge to `main` triggers Vercel Production. Follow [the release runbook](release.md), including backup and backend order. Publish code only; never promote the Practice database.
8. After the approved merge/release, GitHub deletes the merged branch automatically. Switch the local checkout to updated `main` and delete the merged local branch. Keep one active change branch at a time.

The permanent Practice alias is updated deliberately after a Preview deployment passes checks; pushing a branch alone does not move that alias. Future branches share one Practice database, which is why changes should be handled sequentially. A Git branch by itself does not isolate records.

### Local Practice and copying data

- `npm run dev:rehearsal` opens the local frontend using the existing Practice data. `dev:rehearsal:keep` is a compatible alias.
- `npm run rehearsal:refresh` explicitly replaces Practice data from live. `npm run dev:rehearsal:refresh` refreshes and then starts the local frontend.
- Before replacing Practice, preserve any test work the owner still needs. The copying script verifies the fixed live and Practice deployment identities, takes a file-inclusive live backup, restores to Practice only, and verifies table counts. See [the environment guide](../.agent/workflows/environments.md) and [recovery guide](recovery.md).
- Live: `elated-bee-284`. Practice: `standing-mongoose-699`. The older synthetic staging database `hidden-guineapig-648` is not the owner's Practice copy.

### Old branches preserved on 23 September 2026

The old operational-review branch and remote staging branch were already contained in `main`. The only missing useful content from the local staging/CI branches was the Node 24 GitHub verification workflow, now carried into the Practice setup branch. Their full histories were preserved in a verified private Git bundle before branch deletion:

`~/.codex/private/church-workflow-cleanup/20260923T070908Z/branches.bundle`

Original tips: operational review `c2c1d46`, remote staging `74db0fa`, local staging `b64311b`, local CI `d7dd1b4`. This is an archive, not an active development branch.

Vercel's [deployment documentation](https://vercel.com/docs/git) and [alias command](https://vercel.com/docs/cli/alias) describe Preview deployment and permanent-link behaviour.
