# Release and rollback runbook

This runbook distinguishes a verified code change from a release. A passing
local or CI check does not deploy the frontend, Convex functions, schema, or
church data.

## Before a staging release

1. Confirm the branch contains the intended changes and that the working tree
   has no unrelated changes being promoted.
2. Run `npm run test:unit`, `npm run test:backend`, `npm run check:backend`,
   `npm run test:coverage`, and `npm run build`. Pull requests and `main` use
   the same checks through `.github/workflows/verify.yml`.
3. Check the preview environment has `VITE_APP_ENV=staging`,
   `VITE_APP_MODE=live`, the isolated staging `VITE_CONVEX_URL`, and its own
   approved test accounts. Demo mode is development-only.
4. Review schema/index changes before deploying Convex. New indexes and search
   indexes must finish building in the target deployment before their dependent
   page is released. Do not treat a URL name as proof that a deployment is
   disposable.
5. Take a file-inclusive Convex backup and follow the access/recovery controls
   in [recovery.md](recovery.md). CSV exports cannot restore records.

## Staging and production sequence

Deploy Convex functions/schema to the matching staging deployment first, wait
for its index build and function health, then release the staging frontend.
Smoke-test sign-in, permission boundaries, person edits, attendance correction,
follow-up completion, and service-photo reload against that same deployment.

For production, repeat the preflight with the production deployment explicitly
selected, create a file-inclusive backup, deploy backend then frontend, and
monitor the scheduled CRM job after its first run. Never use seed, reset,
migration, import, or replace flags as part of a routine release.

## Migrations and rollback limits

Schema/index additions are forward-only operational changes; wait for indexes
to build before relying on them. Data migrations require a separately reviewed,
idempotent internal operation plus an isolated rehearsal. There is no public
in-app restore API.

A frontend rollback may be made by promoting a prior Vercel deployment only
when it remains compatible with the deployed backend/schema. A backend rollback
does not undo data writes or remove an already-built index. Restoring data is a
separate, destructive provider operation: first take a fresh backup, verify the
named target is correct and authorized, rehearse in isolation, then follow the
provider restore procedure in [recovery.md](recovery.md).
