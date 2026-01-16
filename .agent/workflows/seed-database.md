---
description: How to seed the database with test data
---

# Seed Database Workflow

## Safety Check
The seed script **refuses to run against production** to protect real data.

---

## Run Seed (Development Only)

1. Make sure you're connected to the **test** deployment:
// turbo
```bash
cat .env.local
```
Should show your test Convex URL (e.g., `determined-crab-315`).

2. Run the seed:
```bash
npx convex run seed:seed
```

---

## What Gets Seeded

- 50+ people with various statuses (guests, members, leaders)
- Services with attendance records
- Meetings (bacenta, prayer, etc.)
- Evangelism contacts
- Visitation records

---

## Clear and Reseed

To start fresh:

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your **test** deployment
3. Data → Clear all tables
4. Run seed again

---

## Modify Seed Data

Edit `convex/seed.ts`:
- `NAMED_PEOPLE` array for people
- Service generation logic
- Meeting types and dates

After changes:
// turbo
```bash
npx convex dev
```
Then run the seed function again.
