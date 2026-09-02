# 📄 Application Pages

> **Complete guide to all routes/pages and what each one displays.**

---

## Overview

Pages in SvelteKit are defined in `src/routes/`. Each folder represents a route, and `+page.svelte` is the page component for that route.

### Route Map

```
src/routes/
├── +layout.svelte        → Root layout (wraps all pages)
├── +page.svelte          → Dashboard home (/)
├── people/
│   ├── +page.svelte      → People directory (/people)
│   ├── PeopleDashboard.svelte → People analytics
│   ├── map/
│   │   └── +page.svelte  → People map (/people/map)
│   └── [id]/
│       ├── +page.js      → Profile data loader
│       └── +page.svelte  → Profile page (/people/:id)
├── services/
│   └── +page.svelte      → Services (/services)
├── evangelism/
│   └── +page.svelte      → Evangelism (/evangelism)
├── meetings/
│   └── +page.svelte      → Meetings (/meetings)
├── visitation/
│   └── +page.svelte      → Visitation (/visitation)
└── reports/
    └── +page.svelte      → Reports (/reports)
```

---

## 🏠 Dashboard Home Page

**Route**: `/`  
**File**: `src/routes/+page.svelte`

**Purpose**: Main dashboard providing an at-a-glance overview of church health and recent activity.

### Sections

#### KPI Cards Row
Quick metrics showing key health indicators:

| KPI | Description | Calculation |
|-----|-------------|-------------|
| Active Members | Total non-archived members | Count where status ≠ archived |
| Avg Attendance | Average service attendance | Mean of period's services |
| New Contacts | Evangelism contacts made | Count in current period |
| Salvations | Faith decisions | Sum of salvation_decisions |
| Visitations | Home visits completed | Count in current period |
| Follow-ups Needed | Pending follow-ups | Count where follow_up_required = true |

#### Attendance Chart
Large chart showing attendance trends:
- Weekly or monthly view toggle
- Comparison to previous period
- Goal line if set

#### Growth Timeline
Membership growth over the past year:
- Area chart showing total members
- New member additions
- Milestone markers

#### Recent Activity Feed
Chronological list of recent events:
- New member joins
- Visitations completed
- Services recorded
- Contacts made
- Salvations logged

#### Quick Actions
One-click buttons for common tasks:
- Add new person
- Record a service
- Log a visitation
- Add evangelism contact

---

## 👥 People Directory Page

**Route**: `/people`  
**File**: `src/routes/people/+page.svelte`

**Purpose**: Searchable, filterable directory of all people in the church.

### Features

#### Quick Filters (Tabs)
| Tab | Filter |
|-----|--------|
| All | No filter |
| Members | member_status = 'member' |
| Guests | member_status = 'guest' |
| Leaders | member_status = 'leader' |
| Archived | member_status = 'archived' |

#### Data Table
Displays all people with columns:
| Column | Description |
|--------|-------------|
| Name | First + Last name (clickable to profile) |
| Status | Member status badge |
| Role | Leadership role (if any) |
| Activity | Activity status badge |
| Email | Email address |
| Phone | Phone number |
| Joined | Membership date |

Table features:
- Search by name
- Sort by any column
- Pagination (20 per page)
- Export to CSV

#### Actions
| Action | Description |
|--------|-------------|
| Add Person | Opens PersonForm modal |
| View Profile | Click row or name link |
| Map View | Link to /people/map |

### Data Flow

```
1. Page loads
2. Fetch all people via peopleService.getAll()
3. Apply any active filters (URL params)
4. Display in DataTable
5. User interactions update filters
6. Table re-renders with filtered data
```

---

## 🗺️ People Map Page

**Route**: `/people/map`  
**File**: `src/routes/people/map/+page.svelte`

**Purpose**: Geographic visualization of where church members live.

### Features

#### Map Display
- Interactive Leaflet map
- Centered on church location
- Markers for each person with lat/lng

#### Marker Types
| Marker | Meaning |
|--------|---------|
| 📍 Church | Church building location |
| 🟢 Green | Member |
| 🔵 Blue | Guest |
| 🟡 Gold | Leader |
| ⚪ Gray | Archived |

#### Filter Panel
Filter displayed markers by:
- Member status
- Role
- Activity status
- Specific person search

#### Map Controls
- Zoom in/out
- Fit all markers
- Toggle clustering
- Fullscreen mode

#### Marker Popups
Click a marker to see:
- Person's name
- Status and role
- Quick link to profile
- Distance from church

---

## 👤 Person Profile Page

**Route**: `/people/[id]`  
**File**: `src/routes/people/[id]/+page.svelte`

**Purpose**: Detailed view of an individual person with their complete history.

### Sections

#### Profile Header
- Avatar/photo
- Full name
- Status and role badges
- Activity status indicator
- Quick action buttons (Edit, Contact, Visit)

#### Contact Information
| Field | Display |
|-------|---------|
| Email | Clickable mailto link |
| Phone | Clickable tel link |
| Address | With copy button |
| Birthday | Formatted date |

#### Status Information
| Field | Display |
|-------|---------|
| Member Status | Badge with icon |
| Role | If applicable |
| Activity Status | Color-coded badge |
| First Visit | Date |
| Membership Date | Date |
| Is Baptised | Yes/No |
| Is Tither | Yes/No |

#### Attendance History
Table showing service attendance:
| Column | Data |
|--------|------|
| Date | Service date |
| Service Type | Sunday/Special |
| Sermon | Topic and speaker |
| Made Salvation Decision | If applicable |

#### Visitation History
List of home visits to this person:
| Column | Data |
|--------|------|
| Date | Visit date |
| Visited By | Who did the visiting |
| Outcome | What happened |
| Notes | Visit notes |

#### Evangelism Connections

**If they were invited by someone:**
- Shows who invited them
- Link to inviter's profile

**Who they have invited:**
- List of people they brought
- Conversion status of each

#### Activity Timeline
Chronological list of all activities involving this person.

### Actions

| Action | What It Does |
|--------|--------------|
| Edit Profile | Opens PersonForm in edit mode |
| Log Visitation | Opens VisitationForm pre-filled |
| Send Email | Opens email client |
| Call | Opens phone dialer |
| Promote to Member | Changes status (if guest) |
| Promote to Leader | Changes status (if member) |
| Archive | Sets status to archived |
| Reactivate | Changes from archived (if archived) |
| Delete | Removes person (with confirmation) |

---

## ⛪ Services Page

**Route**: `/services`  
**File**: `src/routes/services/+page.svelte`

**Purpose**: Track and analyze church service attendance and metrics.

### Sections

#### KPI Cards
| Metric | Description |
|--------|-------------|
| Total Services | Count in period |
| Average Attendance | Mean attendance |
| Total Guests | Sum of guests |
| Total Salvations | Sum of salvations |

#### Attendance Chart
Line chart showing attendance over time:
- Weekly view
- Service type breakdown
- Trend line

#### Services Table
List of all services:
| Column | Data |
|--------|------|
| Date | Service date |
| Type | Sunday/Special |
| Topic | Sermon topic |
| Speaker | Preacher name |
| Attendance | Total attendance |
| Guests | First-timers |
| Salvations | Decisions made |

#### Service Detail Modal
Click a service to see:
- Full details
- Complete attendee list
- Photos (if any)
- Edit/Delete options

### Actions

| Action | Description |
|--------|-------------|
| Add Service | Opens ServiceForm |
| View Details | Opens service modal |
| Edit | Opens ServiceForm in edit mode |
| Delete | Removes service (with confirmation) |

---

## 🌱 Evangelism Page

**Route**: `/evangelism`  
**File**: `src/routes/evangelism/+page.svelte`

**Purpose**: Track evangelism outreach efforts, new contacts, and conversions.

### Sections

#### KPI Cards
| Metric | Description |
|--------|-------------|
| Total Contacts | All contacts in period |
| Responsive | Contacts marked responsive |
| Conversions | Contacts who became members |
| Pending Follow-ups | Need attention |

#### Conversion Funnel
Visual funnel showing:
- Total contacted
- Responsive rate
- First visit rate
- Conversion rate

#### Monthly Contacts Chart
Bar chart showing contacts by month.

#### Top Inviters
Leaderboard of members who invite the most people:
- Rank and name
- Invite count
- Conversion rate

#### Response Category Breakdown
Donut chart showing:
- Responsive %
- Non-responsive %
- Events only %
- Has church %
- Do not contact %

#### Contacts Table
| Column | Data |
|--------|------|
| Name | Contact name |
| Date | When contacted |
| Invited By | Who brought them |
| Category | Response category |
| Status | Current member status |
| Follow-up | If needed |

### Actions

| Action | Description |
|--------|-------------|
| Add Contact | Opens EvangelismContactForm |
| View/Edit | Opens contact details |
| Mark Converted | Converts to member |
| Log Follow-up | Record follow-up attempt |

---

## Meetings & Attendance Page

**Route**: `/meetings`  
**File**: `src/routes/meetings/+page.svelte`

**Purpose**: Configure recurring non-Sunday meeting programmes and record named attendance for each dated occurrence.

### Sections

#### Overview
| Metric | Description |
|--------|-------------|
| Meetings Held | Count in period |
| Unique People | Distinct named attendees |
| Average Attendance | Named attendees plus unnamed guests per meeting |
| Attendance Needed | Meetings whose attendance is not final |

#### Attendance
| Column | Data |
|--------|------|
| Date | Meeting date |
| Programme | Bacenta, Flow Service, Acts Prayer, Shemen Prayer, Workers Meeting, or custom programme |
| Time | Start - End |
| Format | In person, online, or hybrid |
| Attendance | Named people plus unnamed guests |
| Status | Attendance needed, complete, scheduled, or cancelled |

#### Meeting Setup
Programme cards manage the usual schedule, format, location, multiple leaders, and optional Bacenta/Workers roster.

### Actions

| Action | Description |
|--------|-------------|
| Record Attendance | Creates a dated occurrence and syncs its named attendees |
| Add Bacenta | Creates an additional Bacenta with its own leaders and roster |
| Edit Programme | Updates reusable meeting defaults |
| Edit Attendance | Safely adds or removes named attendees |
| Delete | Removes the occurrence and its related attendance records |

---

## 🏠 Visitation Page

**Route**: `/visitation`  
**File**: `src/routes/visitation/+page.svelte`

**Purpose**: Track home visits and pastoral care activities.

### Sections

#### KPI Cards
| Metric | Description |
|--------|-------------|
| Total Visits | Count in period |
| Follow-ups Due | Pending follow-ups |
| Positive Outcomes | Successful visits |
| Not Home | Missed visits |

#### Visitation Calendar
Monthly calendar with visit days highlighted:
- Color intensity by visit count
- Click day to see visits

#### Outcome Distribution
Donut chart of visit outcomes:
- Welcomed & Encouraged
- Prayer Request Received
- Not Home
- Concerns Shared
- Invited to Service

#### Visitations Table
| Column | Data |
|--------|------|
| Date | Visit date |
| Person Visited | Who was visited |
| Visited By | Who did the visiting |
| Outcome | What happened |
| Follow-up | If needed |
| Follow-up Date | When to follow up |

### Actions

| Action | Description |
|--------|-------------|
| Add Visitation | Opens VisitationForm |
| View Details | Show visit info |
| Edit | Opens VisitationForm in edit mode |
| Mark Follow-up Complete | Update status |
| Delete | Removes visitation |

---

## 📊 Reports Page

**Route**: `/reports`  
**File**: `src/routes/reports/+page.svelte`

**Purpose**: Generate reports and export data for analysis.

### Report Types

| Report | Description |
|--------|-------------|
| Membership Report | Current member list with details |
| Attendance Report | Service attendance over time |
| Growth Report | Membership growth analysis |
| Evangelism Report | Outreach effectiveness |
| Visitation Report | Home visit summary |
| Prayer Report | Meeting attendance and hours |

### Features

#### Date Range Selection
Custom date picker for report period.

#### Export Options
| Format | Description |
|--------|-------------|
| CSV | Comma-separated values |
| Excel | .xlsx format |
| PDF | Printable document |
| Print | Direct print |

#### Report Preview
Preview report before exporting with:
- Summary statistics
- Charts
- Data tables

---

## 🔄 Root Layout

**File**: `src/routes/+layout.svelte`

**Purpose**: Root layout that wraps all pages with common elements.

### Responsibilities

1. **Initialize Stores**: Set up filterStore, navigationStore
2. **Load Global Data**: Fetch any global data needed
3. **Provide Layout**: Wrap content with DashboardLayout
4. **Handle Auth**: (If auth is added later)
5. **Error Boundaries**: Catch and display errors

### Structure

```svelte
<script>
  import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
  import { filterStore } from '$lib/stores/filterStore';
  import { onMount } from 'svelte';
  
  onMount(() => {
    filterStore.initialize();
  });
</script>

<DashboardLayout>
  <slot />
</DashboardLayout>
```
