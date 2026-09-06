---
description: How to deploy the application to Vercel with Convex
---

# Deployment workflow

Read [the release runbook](../../docs/release.md) before any staging or
production change. Local development and passing checks do not deploy either
Vercel or Convex.

Preview deployments must use the isolated staging Convex URL. Deploy the
matching Convex functions/schema first, wait for new indexes to finish, then
release the frontend and complete the browser smoke checks. Production follows
the same order after a file-inclusive backup and an explicit production
environment check.

Do not use seed, reset, import, migration, or replace commands as deployment
shortcuts. A Vercel rollback is safe only when the older frontend remains
compatible with the active backend/schema; data restore is a separately
authorized destructive recovery operation.
