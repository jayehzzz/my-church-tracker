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
