# 📱 Application Overview

> **A complete guide to understanding what My Church Tracker does and how it's organized.**

---

## What is My Church Tracker?

My Church Tracker is a **church management dashboard** that helps church leaders:

1. **Track People** - Maintain a directory of all members, visitors, leaders, and contacts
2. **Monitor Attendance** - See who's attending services and meetings
3. **Measure Growth** - Track new members, salvations, and baptisms
4. **Manage Outreach** - Monitor evangelism efforts and follow-ups
5. **Coordinate Care** - Log home visitations and pastoral care
6. **Visualize Data** - See trends through interactive charts and maps

The application replaces spreadsheets and paper records with a modern, searchable, visual system that makes church data **actionable**.

---

## Core Modules Explained

### 👥 People Module

**What it manages**: Every individual connected to the church.

**Key features**:
- Complete directory of all people with search and filters
- Individual profile pages with full history
- Status tracking (guest, member, leader, archived)
- Activity status monitoring (regular, irregular, dormant)
- Role assignments (basonta leader, bacenta leader, worker)
- Geographic mapping of where people live
- Spiritual journey tracking (first visit, membership, baptism)

**Why it matters**: Understanding your congregation is the foundation of effective ministry. This module gives you instant access to information about anyone in your church.

---

### ⛪ Services Module

**What it manages**: Church services (Sunday services, special services).

**Key features**:
- Record of every church service held
- Attendance tracking (total count, guests, tithers)
- Sermon documentation (topic, speaker)
- Salvation decision tracking
- Individual attendee linking
- Trend visualization over time

**Why it matters**: Ministry impact is often measured through services. This module helps you see patterns in attendance, track spiritual decisions, and identify growth or decline.

---

### 🌱 Evangelism Module

**What it manages**: Outreach efforts and new contacts.

**Key features**:
- Record of everyone contacted through outreach
- Response category tracking (responsive, non-responsive, has church, etc.)
- Inviter tracking (who brought who)
- Follow-up management
- Conversion tracking (contact → member journey)
- Monthly contact statistics
- Top inviters leaderboard

**Why it matters**: Church growth comes from reaching new people. This module helps you measure outreach effectiveness and ensure no contact falls through the cracks.

---

### 🙏 Meetings Module

**What it manages**: Prayer meetings, cell groups, and other gatherings.

**Key features**:
- Multiple meeting types (Bacenta, Flow Prayer, All-Night Prayer, Basonta, SAT, Farley Prayer)
- Timing tracking (start, end, duration)
- Attendance recording
- Leader assignment
- Prayer hours aggregation
- Activity heatmaps

**Why it matters**: Beyond Sunday services, church life happens in smaller gatherings. This module helps you monitor the health of your prayer life and small group participation.

---

### 🏠 Visitation Module

**What it manages**: Home visits and pastoral care.

**Key features**:
- Record of every home visit
- Visitor and visited person tracking
- Outcome documentation
- Follow-up scheduling
- Calendar visualization
- Notes and prayer requests

**Why it matters**: Personal touch matters. This module ensures pastoral care is systematic and no member is forgotten, especially those who may be drifting.

---

### 📊 Reports Module

**What it manages**: Data analysis and exports.

**Key features**:
- Cross-module reporting
- Custom date range analysis
- Export to CSV/Excel
- Comparative metrics
- Printable reports

**Why it matters**: Leaders need to report to church boards and make data-driven decisions. This module makes information shareable.

---

## The Dashboard Home Page

The main dashboard (`/`) provides an at-a-glance overview:

### KPI Cards
Quick metrics showing:
- Total active members
- This month's attendance average
- New contacts this period
- Salvations this period
- Visitations completed
- Upcoming follow-ups needed

### Charts
Visual representations of:
- Attendance trends over time
- Member growth timeline
- Service type distribution
- Recent activity feed

### Quick Actions
One-click access to:
- Add a new person
- Record a service
- Log a visitation
- Add a contact

---

## Understanding the Time Filter

A **global time filter** appears at the top of every page. This filter controls what data is displayed throughout the application.

### Filter Options

| Type | Description |
|------|-------------|
| **This Month** | Current calendar month |
| **This Year** | Current calendar year |
| **This Quarter** | Current quarter (Q1, Q2, Q3, or Q4) |
| **Last 30 Days** | Rolling 30-day window |
| **Last Month** | Previous calendar month |
| **Last 3/6/12 Months** | Rolling periods |
| **Specific Year** | Choose any year (e.g., 2025) |
| **Specific Month** | Choose any month in any year |
| **Specific Quarter** | Choose any quarter in any year |
| **Custom Range** | Pick exact start and end dates |

### How It Works

When you select a time filter:
1. All data tables show only records within that period
2. All charts update to reflect that period
3. All KPI calculations use that period
4. The filter is remembered as you navigate between pages
5. The filter syncs to the URL (so you can bookmark or share filtered views)

---

## Navigation Structure

### Sidebar Navigation

The left sidebar provides access to all main modules:

| Icon | Page | Path |
|------|------|------|
| 🏠 | Dashboard | `/` |
| 👥 | People | `/people` |
| ⛪ | Services | `/services` |
| 🌱 | Evangelism | `/evangelism` |
| 🙏 | Meetings | `/meetings` |
| 🏠 | Visitation | `/visitation` |
| 📊 | Reports | `/reports` |

### Sub-Pages

Some modules have additional pages:

**People Module**:
- `/people` - Main directory listing
- `/people/map` - Geographic map view
- `/people/[id]` - Individual profile page

---

## User Roles (Conceptual)

While the current system doesn't have authentication, the data model supports these conceptual roles:

### Church Members
- Regular attendees tracked in the system
- Have profiles with attendance history
- Can be assigned activity statuses

### Church Leaders
- Members with leadership responsibilities
- May lead Basontas, Bacentas, or other groups
- Can be assigned as "who visited" in visitations
- Can be assigned as meeting leaders

### Contacts
- People reached through evangelism
- Not yet visiting the church
- Tracked for follow-up and conversion

---

## Key Metrics Explained

### Attendance Metrics
- **Total Attendance**: Number of people at a service
- **Guest Count**: First-timers and visitors at a service
- **Average Attendance**: Mean attendance over the filtered period

### Growth Metrics
- **New Members**: People who became members in the period
- **Salvation Decisions**: People who made faith decisions
- **Conversions**: Evangelism contacts who became guests/members

### Engagement Metrics
- **Tithers Count**: Members who gave tithes at a service
- **Prayer Hours**: Total hours spent in prayer meetings
- **Visitations Completed**: Number of home visits made

### Activity Metrics
- **Regular Members**: Consistently attending
- **Irregular Members**: Sporadic attendance
- **Dormant Members**: No recent attendance (needs attention)

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Application Pages                     │ │
│  │         (Dashboard, People, Services, etc.)             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Reusable UI Components                      │ │
│  │    (Charts, Tables, Forms, Buttons, Cards, etc.)        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Services Layer                         │ │
│  │    (peopleService, servicesService, etc.)               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 Global State (Stores)                    │ │
│  │      (filterStore, navigationStore, searchStore)        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Convex Backend                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Database Schema                        │ │
│  │   (people, services, attendance, meetings, etc.)        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 Query & Mutation Functions               │ │
│  │           (CRUD operations for each table)              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

- **Understanding data**: Read [Data Model](./02-data-model.md)
- **Building features**: Read [Backend Functions](./03-backend-functions.md)
- **Working with UI**: Read [UI Components](./06-ui-components.md)
- **Common tasks**: Read [User Workflows](./11-workflows.md)
