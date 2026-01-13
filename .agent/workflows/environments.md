---
description: How to switch between test and production environments
---

# Environments Workflow

## Quick Reference

| Environment | Where | Data | Convex URL |
|-------------|-------|------|------------|
| **Local Dev** | Your laptop | Test/Fake | `determined-crab-315` or `compassionate-mosquito-554` |
| **Production** | Vercel live site | Real church | Your production deployment |

---

## Daily Development

```bash
# Always uses your TEST database automatically
npm run dev
```

Your `.env.local` points to your test Convex deployment. No risk of touching real data.

---

## When You Push to GitHub

| Branch | What Happens |
|--------|--------------|
| Any feature branch | Nothing deploys |
| `staging` | Deploys to preview URL (test data) |
| `main` | Deploys to production (real data) |

---

## Setting Up Production (One-Time)

### Step 1: Create Production Convex Deployment

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Click **"+ New Project"** (or find your project and add a production deployment)
3. Name it something like `church-tracker-prod`
4. Copy the deployment URL

### Step 2: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com) → Your Project → Settings → Environment Variables
2. Add:
   - **Name**: `VITE_CONVEX_URL`
   - **Value**: Your production Convex URL
   - **Environment**: Production only ✓

---

## Safety Features

- ✅ `seed.ts` will **refuse to run** against production
- ✅ Local dev **always uses test data**
- ✅ Production URL is **only in Vercel**, not in your code

---

## Troubleshooting

**"Which deployment am I connected to?"**
```bash
# Check your .env.local file
cat .env.local
```

**"I accidentally pushed .env.production to git"**
1. Delete the file from git: `git rm .env.production`
2. Rotate your Convex deployment URL in the dashboard
3. Update Vercel with the new URL
