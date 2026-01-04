# 🙏 CHURCH TRACKING SYSTEM - PREMIUM DESIGN BRIEF & SPECIFICATIONS

**Version:** 1.1  
**Date:** December 9, 2025  
**Project Type:** Web-based Church Management Dashboard  
**Tech Stack:** Standard Svelte (v5) + ShadCN/UI + Tailwind CSS + Supabase  
**Design Inspiration:** Kole Jain, Sajid Coder, Modern SaaS Dashboards  

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Technology Stack Clarification](#technology-stack-clarification)
3. [Data Architecture](#data-architecture)
4. [Design Philosophy & Aesthetic](#design-philosophy--aesthetic)
5. [System Modules & Tracking](#system-modules--tracking)
6. [UI/UX Components & Patterns](#uiux-components--patterns)
7. [Dashboard Specifications](#dashboard-specifications)
8. [Premium Design Features](#premium-design-features)
9. [Color Palette & Typography](#color-palette--typography)
10. [Component Library](#component-library)
11. [Interaction & Animation Patterns](#interaction--animation-patterns)
12. [Data Visualization Guidelines](#data-visualization-guidelines)

---

## 🎯 PROJECT OVERVIEW

### Mission
Build a **premium, intuitive church management dashboard** that tracks people's spiritual journey from "guest" → "member" → "leader." The system emphasizes accountability, follow-up, and visible growth metrics while maintaining a modern, dark-mode-first aesthetic that feels premium and professional.

### Core User & Security Model
**Single-Tenant Admin Tool:** This is a single-user application operated by the church leadership/coordinator. 

**Important:** Leaders do NOT have login accounts. The Admin user manually logs all data for everyone, including:
- Evangelism outreach tracking
- Sunday service attendance & spiritual decisions
- Meetings & prayer sessions (Flow, Bacenta, Farley, All-Night Prayers, Basonta, SAT)
- People profiles & spiritual development
- Guest visitation & membership tracking

Do NOT design a multi-user permission system for leaders. All data entry is performed by the single admin user.

### Key Success Metrics
✅ Membership Join rate (guests → members %)  
✅ Salvation Decision tracking (spiritual decisions made)  
✅ Leader activity & prayer participation  
✅ Guest follow-up completion  
✅ People spiritual growth tracking  
✅ Total prayer hours & service attendance  

---

## 🔧 TECHNOLOGY STACK CLARIFICATION

### Stack Definition
This project uses **standard, exportable Svelte code**:

| Technology | Purpose | Notes |
|------------|---------|-------|
| **Svelte v5** | Frontend framework | Standard Svelte, not SvelteKit (unless routing needed) |
| **ShadCN/UI (Svelte)** | Component library | Pre-built accessible components |
| **Tailwind CSS** | Styling | Utility-first CSS framework |
| **Supabase** | Backend | Database, Auth, Real-time subscriptions |

### Development Environment Note
**"Kilo Code"** refers to the IDE/development environment being used to build this project. It is NOT a framework, component library, or low-code platform. 

All code produced must be:
- Standard Svelte components (`.svelte` files)
- Exportable and portable to any Svelte project
- Free of proprietary dependencies
- Following standard Svelte/JavaScript conventions

Do NOT use or reference:
- "Kilo Code components"
- "Visual builders" or "low-code" approaches
- Any proprietary or non-standard Svelte patterns

---

## 🗄️ DATA ARCHITECTURE

### Unified People Model (Critical)

**IMPORTANT:** Use a SINGLE `people` table for ALL humans in the system. Do NOT create separate tables for "Members" and "First Timers" or "Guests."

```sql
-- Core people table (unified)
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  first_name TEXT NOT NULL,
  surname TEXT,
  preferred_name TEXT,
  phone TEXT,
  email TEXT,
  physical_address TEXT,
  birthday DATE,
  
  -- Demographics
  gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_to_say')),
  marital_status TEXT CHECK (marital_status IN ('single', 'married', 'beloved')),
  employment_status TEXT CHECK (employment_status IN ('employed', 'self_employed', 'student', 'other')),
  
  -- STATUS COLUMN (Key differentiator)
  status TEXT NOT NULL DEFAULT 'guest' 
    CHECK (status IN ('guest', 'member', 'leader', 'archived')),
  
  -- Church Role (only applicable when status = 'member' or 'leader')
  role TEXT CHECK (role IN ('basonta_worker', 'bacenta_leader', 'no_role')),
  is_tither BOOLEAN DEFAULT FALSE,
  activity_status TEXT CHECK (activity_status IN ('regular', 'irregular', 'dormant')),
  is_baptised BOOLEAN DEFAULT FALSE,
  
  -- Evangelism Contact Fields (for guests/contacts)
  contact_category TEXT CHECK (contact_category IN (
    'responsive', 'non_responsive', 'has_church', 
    'events_only', 'big_events_only', 'bacenta_mainly', 'do_not_contact'
  )),
  date_first_contacted DATE,
  invited_by_id UUID REFERENCES people(id),
  
  -- Tracking
  first_visit_date DATE,
  membership_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Status Transitions
A person's journey is tracked by updating their `status` column:

```
'guest' → 'member' → 'leader' → 'archived'
         ↑                      ↓
         └──────────────────────┘
```

- **Guest:** First-time visitors, evangelism contacts, anyone not yet a member
- **Member:** Regular church members (updated from guest after membership process)
- **Leader:** Members with leadership roles
- **Archived:** Inactive/departed (preserves history)

**Benefits of Unified Model:**
- A "First Timer" becomes a "Member" by updating `status = 'member'` and setting `membership_date`
- Complete history preserved (no data migration between tables)
- Single source of truth for all people queries
- Simpler joins and reporting

### Attendance Architecture (Many-to-Many)

**IMPORTANT:** Use a junction table for granular attendance tracking. Do NOT use simple headcounts or comma-separated lists.

```sql
-- Meetings/Services table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type TEXT NOT NULL CHECK (meeting_type IN (
    'sunday_service', 'bacenta', 'flow_prayer', 
    'farley_prayer', 'all_night_prayer', 'basonta', 'sat'
  )),
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  location TEXT,
  sermon_topic TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for attendance (Many-to-Many)
CREATE TABLE meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  
  -- Attendance metadata
  attended BOOLEAN DEFAULT TRUE,
  arrived_late BOOLEAN DEFAULT FALSE,
  left_early BOOLEAN DEFAULT FALSE,
  
  -- For services with decisions
  made_salvation_decision BOOLEAN DEFAULT FALSE,
  gave_tithe BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(meeting_id, person_id)
);
```

**Why Many-to-Many?**
- Enables "Leader Participation Heatmaps" (who attended which meetings)
- Tracks individual attendance patterns over time
- Supports queries like "Show me everyone who attended 3+ services this month"
- Allows filtering by person status (leaders vs regular members)

### Terminology Definitions (Critical)

**IMPORTANT:** The word "Conversion" is ambiguous in church contexts. Use these distinct terms:

| Term | Definition | Database Field |
|------|------------|----------------|
| **Salvation Decision** | A spiritual decision (getting saved, accepting faith) | `meeting_attendance.made_salvation_decision` |
| **Membership Join** | A guest becoming an official church member | `people.status` changed from 'guest' to 'member' |

**Usage Examples:**
- ✅ "Salvation Decisions this service: 5"
- ✅ "Membership Join rate: 23% of guests became members"
- ❌ "Conversions this service" (ambiguous - avoid)
- ❌ "Conversion rate" without specifying which type

### Additional Tables

```sql
-- Visitation tracking
CREATE TABLE visitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_visited_id UUID NOT NULL REFERENCES people(id),
  visited_by_id UUID REFERENCES people(id),
  visit_date DATE NOT NULL,
  outcome TEXT CHECK (outcome IN (
    'welcomed_encouraged', 'prayer_request_received', 
    'invited_to_service', 'concerns_shared', 'follow_up_needed'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments/Follow-up log (append-only)
CREATE TABLE follow_up_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id),
  comment TEXT NOT NULL,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School/Training completion tracking
CREATE TABLE school_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id),
  school_name TEXT NOT NULL CHECK (school_name IN (
    'annual_global_exams', 'school_of_the_word', 'school_of_evangelism',
    'school_of_victorious_living', 'school_of_solid_foundations', 'school_of_apologetics'
  )),
  completed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(person_id, school_name)
);
```

---

## 🎨 DESIGN PHILOSOPHY & AESTHETIC

### Core Design Principles
1. **Dark Mode First** - Primary interface is dark mode (modern, premium feel)
2. **Minimalist & Clean** - Remove visual clutter; data hierarchy is clear
3. **Card-Based Layout** - Organize information into digestible, distinct sections
4. **Glassmorphism Accents** - Use subtle glass backgrounds with soft borders for depth
5. **Animated Metrics** - Smooth animations on chart data and metric cards
6. **Professional Polish** - Premium feel through:
   - Soft shadows (not harsh)
   - Subtle glow effects behind metrics
   - Smooth transitions (150-250ms ease-out)
   - Consistent spacing & alignment

### Design Inspiration Sources
- **Kole Jain's Dashboard UI** - Clean sidebar structure, 4-component system (lists, tables, charts, modals)
- **Sajid Coder** - Modern SaaS patterns, smooth micro-interactions
- **Church Metrics** - Functional church dashboards with printable reports
- **Enterprise Dashboards** - Stripe, Vercel, Linear style layouts

### Aesthetic Targets
- Premium tech company (Stripe, Vercel, Figma-level polish)
- Approachable and welcoming (not sterile)
- Accessibility-first (good contrast, readable in all lights)
- Print-friendly (clean reports for physical sharing)

---

## 📊 SYSTEM MODULES & TRACKING

### Module 1: 🤝 EVANGELISM CONTACTS

**Purpose:** Track outreach efforts and contact journey.

**Note:** Evangelism contacts are stored in the unified `people` table with `status = 'guest'` and appropriate `contact_category`.

**Contact Fields (from people table):**
- **Name** - `first_name`, `surname`
- **Phone** - `phone`
- **Date Contacted** - `date_first_contacted`
- **Category** - `contact_category`:
  - Responsive
  - Non-Responsive
  - Has Church
  - Events Only
  - Big Events Only
  - Bacenta Mainly
  - Don't Contact
- **Made Salvation Decision** - Tracked via `meeting_attendance.made_salvation_decision`
- **Attended Church** - Tracked via `meeting_attendance` records
- **Invited By** - `invited_by_id` (references another person)
- **Comments** - Via `follow_up_comments` table (append-only log)

**Dashboard View Requirements:**
- Total contacts tracked (people with `status = 'guest'`)
- Membership Join rate (guests → members %)
- Salvation Decisions count
- Breakdown by category
- Who invited the most contacts (leaderboard)
- Contacts needing follow-up
- Filter: By category, by inviter, by status

---

### Module 2: 📅 SUNDAY SERVICES

**Purpose:** Track weekly attendance, guests, and spiritual decisions.

**Service Fields (meetings table):**
- **Service Date** - `meeting_date`
- **Sermon Topic/Title** - `sermon_topic`
- **Location** - `location`
- **Duration** - `duration_minutes`
- **Special Notes** - `notes`

**Attendance (meeting_attendance table):**
- Individual attendance records linked to each person
- Tracks who attended (not just headcount)
- Tracks `made_salvation_decision` per person
- Tracks `gave_tithe` per person

**Optional Headcounts (for quick entry):**
- Adult Headcount - Can be stored in `meetings.notes` or separate field
- Children Headcount - Can be stored in `meetings.notes` or separate field

**Key Logic:**
- **Membership Prompt:** If a guest (status='guest') appears 3+ times in `meeting_attendance`, system prompts admin to update their status to 'member'
- Tracks Salvation Decision rate (% of attendees who made decisions)
- Attendance trends over time

**Dashboard View Requirements:**
- Service attendance graph (line chart, last 12 weeks)
- Total guests this season
- Membership Join funnel (guests → members)
- Salvation Decisions this service
- Attendance breakdown (members vs guests)
- Quick-add interface for marking attendance

---

### Module 3: 🕯️ MEETINGS & OTHER SERVICES

**Purpose:** Track various church meetings with role-based metrics.

**Meeting Types (all use same `meetings` + `meeting_attendance` tables):**

1. **Bacenta Services** (Midweek service)
   - Same tracking as Sunday Service
   - **NOT** tracking tithers
   
2. **Flow Prayer Service** (Online, YouTube-watched)
   - Attendance tracking (who logged on)
   - Duration of session (hours/minutes)
   - Role breakdown (leaders vs regular members)
   
3. **Farley Prayer Meetings** (In-person weekly prayer)
   - Attendance (focus on role holders)
   - Duration (calculate total prayer hours)
   
4. **All Night Prayers** (Overnight sessions)
   - Attendance (focus on role holders)
   - Duration (track total hours)
   
5. **Basonta Meetings** (Workers meeting)
   - Attendance only
   - Activity level metrics
   
6. **Servants Armed & Trained (SAT)** (Leaders meeting)
   - Attendance only
   - Activity level metrics

**Key Logic:**
- Dropdown selector to switch between meeting types
- Display **Leaders vs Regular Members** split (query by `people.status`)
- Calculate total prayer hours across all prayer meetings
- Track leader participation rates

**Dashboard View Requirements:**
- Prayer hours accumulated (total & by type)
- Leader participation heatmap (who's active in which meetings)
  - Query: JOIN `meeting_attendance` with `people` WHERE `status = 'leader'`
- Meeting attendance trends
- Role-based filter (show only leaders, only members, etc.)
- Filter by meeting type

---

### Module 4: 🤝 VISITATION TRACKING

**Purpose:** Log physical visits to people, especially guests.

**Visitation Fields (visitations table):**
- **Person Visited** - `person_visited_id` (links to `people` table)
- **Date of Visit** - `visit_date`
- **Outcome** - `outcome`:
  - Welcomed & Encouraged
  - Prayer Request Received
  - Invited to Next Service
  - Concerns Shared
  - Follow-up Needed
- **Notes** - `notes`
- **Visited By** - `visited_by_id` (links to `people` table)

**Dashboard View Requirements:**
- Guests waiting for visits (priority list: `people` WHERE `status = 'guest'` AND no recent visitation)
- Visit completion rate (%)
- Visitation calendar (see who was visited when)
- Filter: By person, by visitor, by outcome

---

### Module 5: 👤 CENTRAL PEOPLE RECORD

**Purpose:** Single comprehensive profile for ALL people (guests, members, leaders).

**Basic Identity & Location:**
- **First Name** - `first_name`
- **Surname** - `surname`
- **Full Name** - Computed: `first_name || ' ' || surname`
- **Preferred Name** - `preferred_name`
- **Phone Number** - `phone`
- **Email Address** - `email`
- **Physical Address** - `physical_address` (with Map View)
- **Birthday** - `birthday`
- **Current Age** - Computed from `birthday`

**Demographics:**
- **Gender** - `gender` (Male / Female / Prefer Not to Say)
- **Marital Status** - `marital_status` (Single / Married / Beloved)
- **Employment Status** - `employment_status` (Employed / Self-Employed / Student)

**Status & Church Role:**
- **Status** - `status` (Guest / Member / Leader / Archived)
- **Role** - `role` (Basonta Worker / Bacenta Leader / No Role) - only for members/leaders
- **Is Tither** - `is_tither`
- **Activity Status** - `activity_status` (Regular / Irregular / Dormant)
- **Baptised?** - `is_baptised`

**For Guests/Contacts:**
- **Contact Category** - `contact_category`
- **Date First Contacted** - `date_first_contacted`
- **Invited By** - `invited_by_id`

**Growth & Schools (via school_completions table):**
- Annual Global Exams ✓/✗
- School of the Word ✓/✗
- School of Evangelism ✓/✗
- School of Victorious Living ✓/✗
- School of Solid Foundations ✓/✗
- School of Apologetics ✓/✗

**Computed Metrics (from meeting_attendance):**
- **Attendance Count** - Number of meetings attended
- **Invite Effectiveness** - People invited who became members
- **Prayer Activity** - Count of prayer meetings attended (Flow, Farley, All Night)
- **Activity Score** - Composite of above metrics

**Dashboard View Requirements:**
- People search (name, phone, email)
- People list with quick-view cards
- Individual profile page (comprehensive view)
- Map view of all people locations
- Advanced filter (by status, role, activity level)
- Growth timeline (first visit → membership tracking)

---

## 🎨 UI/UX COMPONENTS & PATTERNS

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│ SIDEBAR (20%) │ MAIN CONTENT AREA (80%)         │
├─────────────────────────────────────────────────┤
│               │ TOP BAR (Search, User, Settings)│
│               ├─────────────────────────────────┤
│               │ BREADCRUMBS / PAGE TITLE        │
│               ├─────────────────────────────────┤
│               │                                 │
│               │ METRICS CARDS (KPI Row)         │
│               │ ┌─────┬─────┬─────┬─────┐       │
│               │ │ #   │ #   │ #   │ #   │       │
│               │ └─────┴─────┴─────┴─────┘       │
│               ├─────────────────────────────────┤
│               │ MAIN SECTION                    │
│               │ (Charts / Tables / Lists)       │
│               │                                 │
│               │                                 │
│               ├─────────────────────────────────┤
│               │ SECONDARY SECTION               │
│               │ (Filters, Details, Forms)       │
│               └─────────────────────────────────┘
```

### Sidebar Navigation
- **Logo/Brand** at top
- **Main sections** (Evangelism, Services, Meetings, Visitation, People)
- **Sub-menu items** for each section
- **Settings/Help** at bottom
- **Dark icon set** (elegant, minimalist)
- **Hover states** with subtle background highlight
- **Active state** with accent color highlight

### Metric Cards (Premium Pattern)
```
┌────────────────────────┐
│ 📊 Total People        │
│                        │
│ 247                    │
│ ↗ +12% this month      │
│                        │
│ [Line chart sparkline] │
└────────────────────────┘
```

**Features:**
- Large readable number
- Small metric label
- Trend indicator (↗ ↘ ↕)
- Mini chart (optional)
- Subtle glow background
- Hover: slight lift effect (shadow increase)

### Data Tables/Lists
**Key Features:**
- Searchable header
- Sortable columns
- Selectable rows (checkboxes)
- Pagination (with "show X items" selector)
- Inline actions (edit, delete, quick-view)
- Responsive: collapse to cards on mobile
- Alternating row backgrounds (subtle)

### Modals & Forms
- **Modal Overlay** - Dim background (not black, subtle)
- **Modal Size Options:**
  - Small (360px) - Quick forms
  - Medium (640px) - Standard forms
  - Large (960px) - Complex workflows
- **Form Fields** - Clean inputs with labels
- **Action Buttons** at bottom (Primary + Secondary)
- **Smooth appearance** - Fade in + slide up (250ms)
- **Focus states** - Ring outline (not harsh)

### Filters & Dropdowns
- **Inline filter row** - Horizontal filter chips
- **Advanced filter button** - Opens secondary panel
- **Dropdowns** - Smooth open/close, keyboard navigable
- **Search within dropdown** - For long lists
- **Clear all filters** button

---

## 📊 DASHBOARD SPECIFICATIONS

### Dashboard 1: EVANGELISM OVERVIEW
**Components:**
1. **KPI Cards Row:**
   - Total Contacts (guests)
   - Membership Join Rate (%)
   - Salvation Decisions (count)
   - Active Leads (needing follow-up)

2. **Membership Funnel Chart** (vertical bar chart)
   - Contacts → Attended → Made Decision → Joined as Member

3. **Contact Categories Breakdown** (donut chart)
   - Distribution across all categories

4. **Contact Status Table**
   - Name, Phone, Category, Status, Days Since Contact, Inviter, Action (edit/view)

5. **Recent Comments Log** (scrollable)
   - Latest follow-up notes across all contacts

**Filters:**
- By Category
- By Inviter (person name)
- Date Range
- Status (guest, member, archived)

---

### Dashboard 2: SUNDAY SERVICES
**Components:**
1. **KPI Cards Row:**
   - Total Attended (this service)
   - Guests (this service)
   - Salvation Decisions (this service)
   - Attendance Rate (%)

2. **Attendance Trend** (line chart, last 12 weeks)
   - Members vs Guests vs Total

3. **Membership Funnel** (bar chart)
   - Guests → Members (join rate)

4. **Service Logs Table**
   - Date, Topic, Total Attendance, Guests, Salvation Decisions, Notes

5. **Guests Follow-up Status**
   - Cards showing guests needing follow-up (call, visit, re-invite)

**Filters:**
- Date Range
- Location (if multiple campuses)
- Person Status (guest, member)

---

### Dashboard 3: MEETINGS & PRAYER TRACKING
**Components:**
1. **KPI Cards Row:**
   - Total Prayer Hours (all meetings YTD)
   - Latest Meeting Attendance
   - Leader Participation Rate (%)
   - Meeting Types Available (count)

2. **Prayer Hours Accumulated** (large metric + bar chart)
   - Breakdown by meeting type (Flow, Farley, All Night, Bacenta)
   - Cumulative hours over time

3. **Leader Participation Heatmap**
   - Grid: Leaders (rows) vs Meeting Types (columns)
   - Cell color intensity = attendance frequency
   - Data source: `meeting_attendance` JOIN `people` WHERE `status = 'leader'`

4. **Meeting Records Table**
   - Date, Type, Attendees Count, Leaders Count, Duration, Notes

5. **Role-Based Attendance Comparison**
   - Side-by-side: Leaders vs Regular Members (who's more active?)

**Filters:**
- Meeting Type (dropdown selector)
- Date Range
- Show Leaders Only / Regular Members / Both
- By Person Name

---

### Dashboard 4: PEOPLE OVERVIEW
**Components:**
1. **KPI Cards Row:**
   - Total People
   - New Members (this month)
   - Active Leaders
   - Inactive People (needing re-engagement)

2. **Growth Timeline** (area chart)
   - People added per month (last 12 months)
   - Breakdown by status (guests vs members)

3. **People by Role** (horizontal bar chart)
   - Basonta Workers | Bacenta Leaders | No Role

4. **People List/Map Toggle**
   - **List View:** Searchable table (name, phone, status, role, last attended)
   - **Map View:** Geographic distribution (address-based)

5. **Profile Quick View**
   - Cards: Photo (or avatar), Name, Status, Role, Last Service Date

**Filters:**
- By Status (Guest/Member/Leader/Archived)
- By Role
- By Activity Level (Regular/Irregular/Dormant)
- Search by Name/Phone
- By School Completion

---

### Dashboard 5: VISITATION TRACKING
**Components:**
1. **KPI Cards Row:**
   - Guests Needing Visit
   - Visits Completed (this month)
   - Visitation Rate (%)
   - Pending Follow-ups

2. **Priority Queue** (list cards)
   - Guests ranked by "days since they attended"
   - Shows: Name, Phone, Last Attended, Visit Status, Quick-Action Buttons

3. **Visitation Calendar** (month view)
   - Dots/badges showing visited people
   - Click to see detail

4. **Visitation Log Table**
   - Date Visited, Person, Visitor, Outcome, Notes, Follow-up Needed?

**Filters:**
- Status (visited, pending, follow-up needed)
- By Person Visited
- By Visitor
- Date Range

---

## 💎 PREMIUM DESIGN FEATURES

### 1. Glassmorphism Accents
- **Metric Cards:** Subtle frosted-glass background (`backdrop-blur-sm`, `bg-opacity-30`)
- **Modal Headers:** Glass effect with dark background
- **Sidebar Hover:** Glass background on hover
- **Effect:** Creates visual depth without being distracting

### 2. Animated Metrics
- **Number Count Animation:** Smooth increment from 0 to final value (2s ease-out)
- **Chart Animations:** Bars grow on load (staggered, 300-600ms each)
- **Sparklines:** Mini charts animate in on load
- **Trend Arrows:** Subtle bounce effect on appearance
- **Goal:** Premium SaaS feel (Stripe, Linear)

### 3. Glow Effects
- **Behind KPI Cards:** Subtle colored glow (accent color, low opacity) behind metric cards
- **On Focus:** Soft glow ring on input fields
- **On Hover:** Gentle glow increase on interactive elements
- **Not Overdone:** Subtle, not neon

### 4. Smooth Transitions
- **Button Hover:** Background color change (150ms)
- **Modal Appearance:** Fade in + slight scale (250ms ease-out)
- **Dropdown Open:** Smooth slide-down (200ms)
- **Page Navigation:** Cross-fade (100ms) between pages
- **Sidebar Collapse:** Smooth width transition (300ms)

### 5. Micro-Interactions
- **Form Field Focus:** Outline ring appears, label adjusts position
- **Button Press:** Slight inward shadow (active state)
- **Checkbox/Toggle:** Smooth slide animation when checked
- **Table Row Hover:** Subtle background highlight, slight lift
- **Menu Item Click:** Ripple effect or instant state change

### 6. Print-Friendly Design
- **Print Button:** Available on all dashboards
- **Print Styles:** 
  - Remove navigation sidebars
  - Clean white/light backgrounds
  - Readable fonts (no light colors on dark)
  - Break charts across pages properly
  - Add headers/footers (date, report type)
- **Reports:** Generate as PDF with branding

### 7. Dark Mode Refinements
- **Not Pure Black:** Base color `#1a1a1a` (neutral dark, not `#000000`)
- **Cards:** `#1e1e1e` (neutral card, creates depth)
- **Text:** `#e2e8f0` (soft white, reduces eye strain)
- **Accents:** Teal/cyan/emerald (pop against dark)
- **Buttons:** Use gradient or highlight color, not harsh

### 8. Visual Hierarchy
- **Typography:** Clear H1, H2, H3 sizes with distinct weights
- **Spacing:** Generous padding (16px, 20px, 24px guidelines)
- **Color Density:** Metrics > Details > Background
- **Charts:** Large, prominent (not squeezed)
- **Tables:** Scrollable, not cramped

---

## 🎨 COLOR PALETTE & TYPOGRAPHY

### Color Palette (Dark Mode First)

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Dark Base** | Neutral Dark | `#1a1a1a` | Primary background |
| **Card Background** | Neutral Card | `#1e1e1e` | Cards, modals, sidebars |
| **Hover/Focus** | Neutral Border | `#2a2a2a` | Interactive states |
| **Primary Text** | Soft White | `#e2e8f0` | Main content |
| **Secondary Text** | Gray | `#a0aec0` | Labels, hints |
| **Accent (Primary)** | Teal | `#06b6d4` or `#14b8a6` | Buttons, links, highlights |
| **Accent (Secondary)** | Emerald | `#10b981` | Success states |
| **Danger** | Red | `#ef4444` | Errors, deletions |
| **Warning** | Amber | `#f59e0b` | Cautions, alerts |
| **Info** | Blue | `#3b82f6` | Informational messages |
| **Success** | Green | `#10b981` | Completion, success |
| **Glow/Backdrop** | Teal with opacity | `rgba(6, 182, 212, 0.1)` | Backgrounds, accents |

### Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| **H1 (Page Title)** | Inter / System | 36px (2.25rem) | 700 (Bold) | 1.2 |
| **H2 (Section)** | Inter / System | 24px | 600 (Semibold) | 1.3 |
| **H3 (Subsection)** | Inter / System | 20px | 600 | 1.4 |
| **Body (Primary)** | Inter / System | 14px | 400 (Regular) | 1.5 |
| **Small (Labels)** | Inter / System | 12px | 500 (Medium) | 1.4 |
| **Monospace (Data)** | Roboto Mono / JetBrains Mono | 13px | 400 | 1.5 |

**Font Stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Helvetica Neue', 'Roboto', sans-serif;
```

### Shadows (Dark Mode)

| Level | Shadow | Use Case |
|-------|--------|----------|
| **None** | `none` | Text, icons |
| **sm** | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| **md** | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| **lg** | `0 10px 15px rgba(0,0,0,0.2)` | Modals, dropdown menus |
| **xl** | `0 20px 25px rgba(0,0,0,0.3)` | Floating panels, top nav |
| **Inset** | `inset 0 1px 3px rgba(0,0,0,0.1)` | Pressed buttons |

---

## 🧩 COMPONENT LIBRARY

### Button Variants

**Primary Button:**
```
Background: Teal (#06b6d4)
Text: White (#ffffff)
Padding: 10px 24px
Border Radius: 8px
Hover: Darker teal, shadow-md
Active: Inset shadow
```

**Secondary Button:**
```
Background: Neutral Border (#2a2a2a)
Text: Soft white
Padding: 10px 24px
Border: 1px solid #2a2a2a
Hover: Lighter background
```

**Tertiary (Ghost):**
```
Background: Transparent
Text: Teal (accent)
Border: None
Hover: Teal with opacity background
```

**Danger Button:**
```
Background: Red (#ef4444)
Text: White
Hover: Darker red
Use: Delete, remove, destructive actions
```

### Form Inputs

**Text/Email Input:**
```
Background: #1e1e1e (neutral card)
Border: 1px solid #2a2a2a (neutral border)
Padding: 10px 14px
Border Radius: 6px
Focus: Teal outline (2px), glow effect
Placeholder: #718096 (lighter gray, less visible)
```

**Select Dropdown:**
```
Same as text input
Custom styling (remove default browser style)
Chevron icon on right (color: accent)
```

**Checkbox/Toggle:**
```
Unchecked: Gray box + white background
Checked: Teal background + white checkmark
Animated: Smooth 150ms transition
Label: On right side, clickable
```

**Date Picker:**
```
Input style same as text field
Popup: Calendar, month/year selector
Keyboard navigable
Selected date: Teal highlight
```

### Cards

**Standard Card:**
```
Background: #1e1e1e
Border: 1px solid #2a2a2a (neutral border)
Border Radius: 12px
Padding: 20px
Shadow: shadow-md
Hover: Lift (shadow-lg)
```

**Metric Card (KPI):**
```
Same as standard + glow effect
Glow: Subtle colored blur behind card
Numbers: Large, prominent
Subtext: Smaller, secondary color
Chart: Optional mini visualization
```

### Data Table

**Header:**
```
Background: #1e1e1e
Text: Secondary gray
Font: 12px, medium weight
Sortable: Chevron icon on hover
Sticky: On scroll down
```

**Rows:**
```
Padding: 16px
Border-bottom: 1px solid #2a2a2a
Hover: Background #2a2a2a
Selected: Teal tint background
```

**Actions:**
```
Icons: Edit, delete, view details
Visibility: Show on hover
Tooltip on hover with action name
```

---

## ⚡ INTERACTION & ANIMATION PATTERNS

### Page Load Animations
```
1. Background: Fade in (200ms ease-out)
2. Content: Fade in + slide up (300ms ease-out, staggered)
3. Metric cards: Count animation + glow (1.5s ease-out)
4. Charts: Bar/line grow animation (staggered, 300-600ms)
```

### Micro-Interactions

| Interaction | Animation | Timing |
|-------------|-----------|--------|
| **Button Hover** | Color shift + scale(1.02) | 150ms ease-out |
| **Button Press** | Inset shadow | 100ms |
| **Modal Open** | Fade in + scale(0.95→1) | 250ms ease-out |
| **Modal Close** | Fade out + scale(1→0.95) | 150ms ease-in |
| **Dropdown Open** | Slide down | 200ms ease-out |
| **Table Row Hover** | Background highlight + lift | 150ms |
| **Checkbox Toggle** | Slide animation | 150ms |
| **Notification Appear** | Slide in from top + fade | 300ms |
| **Notification Dismiss** | Slide out + fade | 200ms |

### Keyboard Navigation
- **Tab:** Move through focusable elements (logical order)
- **Shift+Tab:** Reverse navigation
- **Enter:** Activate buttons, open dropdowns
- **Escape:** Close modals, dropdowns, popovers
- **Arrow Keys:** Navigate within dropdowns, calendars
- **Space:** Toggle checkboxes
- **Focus Indicators:** Visible ring (not hidden)

---

## 📈 DATA VISUALIZATION GUIDELINES

### Chart Types & Usage

| Chart Type | Use Case | Color Scheme |
|-----------|----------|--------------|
| **Line Chart** | Trends over time (attendance, prayer hours) | Single teal line, soft grid |
| **Bar Chart** | Comparisons (categories, members vs guests) | Teal bars, gray background |
| **Donut/Pie** | Distribution (categories, statuses) | Multiple colors (teal, emerald, orange) |
| **Area Chart** | Cumulative growth (people growth, prayer hours) | Gradient fill, soft line |
| **Heatmap** | Density/frequency (leader participation grid) | Color gradient (light→teal→dark) |
| **Sparkline** | Mini trend in card | Single teal line, no axis |

### Chart Best Practices
- **Axes:** Remove unnecessary lines, keep grid subtle
- **Labels:** Large, readable font (12-14px)
- **Legend:** Below or right side, not overlapping data
- **Tooltip:** On hover, dark background, white text
- **Animation:** Smooth entrance, 300-600ms duration
- **Mobile:** Stack charts vertically, readable on small screens
- **Print:** Ensure charts are visible when printed (colors still distinct)

### Metric Card Sparklines
- **Tiny chart inside KPI card** (width: 60px, height: 40px)
- Shows last 7-12 data points
- Animated on load (line draws from left to right)
- No interactive hover (just visual)

---

## 🎯 KEY IMPLEMENTATION NOTES

### For the Developer Building This:

1. **Use Tailwind CSS Variables** for colors (not hardcoding hex values)
2. **ShadCN/UI Components** for consistency (buttons, inputs, dialogs, tables)
3. **Svelte Animations:** Use `transition:` directives for smooth effects
4. **State Management:** Track active filter, selected person, expanded sections
5. **Supabase Real-time:** Optional - subscribe to changes for live updates
6. **Responsive Design:** Mobile-first, breakpoints at 640px, 1024px, 1280px
7. **Accessibility:**
   - ARIA labels on interactive elements
   - Sufficient color contrast (4.5:1 for AA)
   - Keyboard navigable (no mouse-required interactions)
   - Semantic HTML (not div soup)
8. **Performance:**
   - Lazy-load images
   - Virtualize long lists (10,000+ items)
   - Debounce search inputs
   - Cache computed metrics

### Print Styles
```css
@media print {
  .no-print { display: none; }
  body { background: white; }
  .dark-bg { background: white; }
  .text-light { color: black; }
  /* Ensure readable output */
}
```

---

## 📋 DELIVERABLES CHECKLIST

- [ ] Fully functional Evangelism dashboard with all filters
- [ ] Sunday Services dashboard with guest management
- [ ] Meetings & prayer tracking with role-based views
- [ ] People directory with map visualization
- [ ] Visitation tracking with priority queue
- [ ] Individual profile pages (detailed view)
- [ ] Form modals for adding/editing records
- [ ] Dark mode implementation (primary)
- [ ] Printable reports (PDF generation)
- [ ] Responsive design (desktop + tablet tested)
- [ ] Smooth animations on all transitions
- [ ] Metric card glow effects & count animations
- [ ] Search across all modules
- [ ] Advanced filtering system
- [ ] Mobile-responsive sidebar (hamburger menu on <1024px)
- [ ] Accessibility testing (WCAG 2.1 AA minimum)
- [ ] Performance optimization (fast load times)

---

## 🎨 DESIGN REFERENCE LINKS

- **Kole Jain Dashboard Resources:** https://kolejain.com/resources
- **Kole Jain Dashboard UI Video:** https://youtu.be/B7k5rOgmOGY
- **Church Metrics Example:** https://churchmetrics.com/features
- **Dark Mode Best Practices:** Modern Dark Mode Design Guidelines
- **Tailwind CSS:** https://tailwindcss.com
- **ShadCN/UI:** https://ui.shadcn.com

---

## 📞 NOTES FOR DEVELOPERS

This document is designed to be **clear, comprehensive, and implementation-ready**. Every developer should be able to:

1. Understand the mission and user need
2. Know exactly what features are needed
3. Have concrete design patterns and examples
4. Understand the premium aesthetic being targeted
5. Know which animations and interactions are important
6. Have all specifications for colors, typography, components
7. Understand the data model and relationships

**Clarifications:**
- **Tech Stack:** Standard Svelte + ShadCN/UI + Tailwind (Kilo Code is just the IDE)
- **User Model:** Single admin user (leaders don't have accounts)
- **Data Model:** Unified `people` table with `status` column
- **Attendance:** Many-to-many via `meeting_attendance` junction table
- **Terminology:** "Salvation Decision" (spiritual) vs "Membership Join" (administrative)
- **Mobile:** Web-first, responsive design
- **Offline:** Assume always-online (Supabase)
- **Export:** PDF + CSV for reports

---

**Version:** 1.1  
**Last Updated:** December 9, 2025  
**Status:** Ready for Implementation
