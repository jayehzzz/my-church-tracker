---
description: How to switch between test and production environments
---

# Environments workflow

Each running app uses exactly one `VITE_CONVEX_URL`. The frontend's `VITE_APP_ENV`
identifies that deployment as `development`, `staging`, or `production`; it does
not choose a URL. Configure a different Convex deployment for every environment.
Never copy a production URL into a preview, branch, or local configuration.

## Local development

1. Create a disposable Convex development deployment in the Convex dashboard.
2. Put its URL in an untracked `.env.local` with:
   ```
   VITE_APP_ENV=development
   VITE_APP_MODE=live
   VITE_CONVEX_URL=https://your-development-deployment.convex.cloud
   ```
3. Run `npm run convex:dev` against that deployment, then `npm run dev`.
4. Exercise the change in the local browser and run `npm run test:unit` and
   `npm run build` before requesting review.

An empty development database is a valid result: the application must show zero
records, not sample records.

## Explicit local demo

Demo is for walkthroughs only. Create untracked `.env.demo.local` containing:
```
VITE_APP_ENV=development
VITE_APP_MODE=demo
```
Then start `npm run dev -- --mode demo`. Demo does not contact Convex. Its
follow-up workspace is stored in the browser under
`church-tracker-follow-up-crm-v1`; clearing that site data resets it. Do not use
demo for real church information.

The app rejects demo mode for staging and production, so it cannot silently be
deployed as another environment's dataset.

## Rehearsal with a production-data copy

Use rehearsal when a change needs realistic church data without writing to the
live database. The dedicated deployment is `standing-mongoose-699` in the
`church-tracker-staging` project. It contains a full copy of production data,
including private records, so access must remain limited to approved church
testers.

Refresh it from the current live database with:

```sh
npm run rehearsal:refresh
```

The command verifies the named live and rehearsal deployments, creates a fresh
file-inclusive live backup, deploys the current Convex schema/functions to the
rehearsal target, replaces only the explicitly disposable rehearsal data, then
exports rehearsal again and checks its table counts against the live snapshot.
It restores `.env.local` after Convex updates it during the backend push.

For local browser testing, keep an untracked `.env.rehearsal.local` containing:

```text
VITE_APP_ENV=staging
VITE_APP_MODE=live
VITE_CONVEX_URL=https://standing-mongoose-699.convex.cloud
```

Then run `npm run dev:rehearsal`. Vite continues to load the Auth0 public client
configuration from the normal untracked local environment.

## Preview and release

- A feature branch gets a Vercel preview only after Vercel is configured for it.
  Set `VITE_APP_ENV=staging`, `VITE_APP_MODE=live`, and the *staging* Convex URL
  in Vercel Preview environment variables.
- Test the generated preview against staging; do not seed or reset it unless its
  deployment has been explicitly marked disposable.
- Merge an approved change to `main` only after preview checks pass. Vercel
  Production variables must be `VITE_APP_ENV=production`, `VITE_APP_MODE=live`,
  and the production Convex URL. Deploy the corresponding Convex functions to
  that production deployment as part of the release procedure.

Vercel configuration files cannot create or verify hosted environment variables.
Before the first preview or production release, a project administrator must set
those three variables for the appropriate Vercel scope and confirm each URL
belongs to the intended isolated Convex deployment.

## Recovery

Backups and restores are provider-managed Convex operations. Follow
[`docs/recovery.md`](../../docs/recovery.md); backup snapshots must include file
storage because service photos are stored there. A restore rehearsal may target
only a separately identified disposable deployment.
