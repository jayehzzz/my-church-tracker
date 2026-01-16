---
description: How to deploy the application to Vercel with Convex
---

# Deployment Workflow

## Prerequisites
- Vercel CLI installed (`npm i -g vercel`)
- Logged into Vercel (`vercel login`)
- Convex deployment configured

---

## Local Development
// turbo
```bash
npm run dev
```
This uses your test Convex deployment (from `.env.local`).

---

## Deploy to Preview (Staging)

1. Push to a feature branch or `staging`:
```bash
git push origin staging
```

2. Vercel auto-deploys to a preview URL
3. Preview uses **test data** (safe to experiment)

---

## Deploy to Production

1. Merge to `main`:
```bash
git checkout main
git merge staging
git push origin main
```

2. Vercel auto-deploys to production URL
3. Production uses **real church data**

---

## Manual Deploy (if needed)
```bash
vercel --prod
```

---

## Sync Convex Schema

If you've changed `convex/schema.ts`:
// turbo
```bash
npx convex dev
```

For production:
```bash
npx convex deploy
```

---

## Rollback

In Vercel dashboard → Deployments → Find previous deployment → "..." → Promote to Production
