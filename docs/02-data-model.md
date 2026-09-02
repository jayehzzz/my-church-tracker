# 🗃️ Data Model

> **Complete guide to all database tables, their fields, and relationships.**

---

## Overview

The application uses **Convex** as its backend database. The schema is defined in `convex/schema.ts` and consists of 7 main tables that work together to track all church activities.

---

## 📊 Database Tables

### Table Relationships Diagram

```
┌─────────────────┐
│     people      │ ← Central table, everything links to people
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    ↓         ↓          ↓          ↓          ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│services│ │meetings│ │visita- │ │attend- │ │meeting │
│        │ │        │ │ tions  │ │ ance   │ │attend- │
│        │ │        │ │        │ │        │ │ ance   │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
     ↑                                ↑          ↑
     └────────────────────────────────┘          │
              service_id links                    │
                                                  │
                     meeting_id links ────────────┘
```

---

## 👥 People Table

**Purpose**: Stores all individuals connected to the church - members, guests, leaders, and evangelism contacts. This is the central table that most other tables reference. Legacy `visitor` statuses are normalized to `guest`.

**File**: `convex/schema.ts` (lines 5-43)

### Fields

#### Identity Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | ✅ | Person's first/given name |
| `last_name` | string | ✅ | Person's surname/family name |
| `preferred_name` | string | ❌ | Nickname or preferred name (if different from first_name) |
| `email` | string | ❌ | Email address for contact |
| `phone` | string | ❌ | Phone number for contact |
| `address` | string | ❌ | Physical address (used for map location) |
| `birthday` | string | ❌ | Date of birth in YYYY-MM-DD format |

#### Geolocation (for Map)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | float64 | ❌ | Latitude coordinate of their address |
| `lng` | float64 | ❌ | Longitude coordinate of their address |
| `avatar_url` | string | ❌ | URL to profile picture |

#### Status & Role

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `member_status` | string | ✅ | Current status: `"guest"`, `"member"`, `"leader"`, or `"archived"` |
| `role` | string | ❌ | Leadership role (Leaders only): `"basonta_leader"`, `"bacenta_leader"`, or `"no_role"` |
| `activity_status` | string | ❌ | Engagement level: `"regular"`, `"irregular"`, or `"dormant"` |
| `leader_id` | string | ❌ | ID of their direct leader (for pastoral structure) |

#### Evangelism/Contact Tracking

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_category` | string | ❌ | Response to outreach: `"responsive"`, `"non_responsive"`, `"events_only"`, `"do_not_contact"`, or `"has_church"` |
| `contact_date` | string | ❌ | Date they were first contacted through evangelism |
| `invited_by_id` | ID(people) | ❌ | Reference to the person who invited them (self-reference) |

#### Spiritual Journey

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_visit_date` | string | ❌ | Date of their first church visit |
| `entry_point` | string | ❌ | How they first entered: `"sunday_service"`, `"bacenta_meeting"`, `"evangelism"`, `"referral"`, or `"other"` |
| `membership_date` | string | ❌ | Date they became an official member |
| `is_baptised` | boolean | ❌ | Whether they have been baptized |
| `is_tither` | boolean | ❌ | Whether they regularly tithe |

#### System Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `created_at` | string | ✅ | Timestamp when record was created |
| `updated_at` | string | ✅ | Timestamp when record was last modified |

### Indexes (for fast queries)

- `by_member_status` - Quickly find all people with a specific status
- `by_last_name` - Alphabetical lookups
- `by_contact_date` - Find contacts by when they were reached
- `by_invited_by` - Find all people invited by a specific person

### Status Flow

```
                    ┌───────────┐
                    │  Contact  │  (Evangelism contact, hasn't visited)
                    └─────┬─────┘
                          ↓
                    ┌───────────┐
                    │   Guest   │  (Has visited, not yet a member)
                    └─────┬─────┘
                          ↓
                    ┌───────────┐
              ┌─────│  Member   │─────┐
              │     └───────────┘     │
              ↓                       ↓
        ┌───────────┐           ┌───────────┐
        │  Leader   │           │ Archived  │
        └───────────┘           └───────────┘
```

---

## ⛪ Services Table

**Purpose**: Records church services - Sunday services, special services, and any formal worship gatherings.

**File**: `convex/schema.ts` (lines 45-64)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service_date` | string | ✅ | Date of the service (YYYY-MM-DD) |
| `service_type` | string | ✅ | Type: `"sunday_service"` or `"special_service"` |
| `service_time` | string | ❌ | Time the service started |
| `location` | string | ❌ | Where the service was held |
| `sermon_topic` | string | ❌ | Title/topic of the sermon |
| `sermon_speaker` | string | ❌ | Name of the preacher |

#### Aggregate Metrics

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total_attendance` | float64 | ❌ | Total number of people who attended |
| `guests_count` | float64 | ❌ | Total guest headcount, including named and unnamed guests |
| `salvation_decisions` | float64 | ❌ | Number of people who made faith decisions |
| `tithers_count` | float64 | ❌ | Number of people who gave tithes |

#### Other Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `individuals` | array(string) | ❌ | List of individual attendee IDs |
| `photos` | array(string) | ❌ | URLs to service photos |
| `created_at` | string | ✅ | Record creation timestamp |
| `updated_at` | string | ❌ | Last modification timestamp |

### Indexes

- `by_service_date` - Find services by date

---

## 📋 Attendance Table

**Purpose**: Links individual people to specific services they attended. Allows tracking of who came to which service with per-person metrics.

**File**: `convex/schema.ts` (lines 66-81)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service_id` | ID(services) | ✅ | Reference to the service attended |
| `person_id` | ID(people) | ✅ | Reference to the person who attended |
| `made_salvation_decision` | boolean | ❌ | Did this person make a faith decision at this service? |
| `gave_tithe` | boolean | ❌ | Did this person give tithe at this service? |
| `first_timer` | boolean | ❌ | Was this their first time at church? |
| `created_at` | string | ✅ | Record creation timestamp |

### Indexes

- `by_service` - Find all attendees for a specific service
- `by_person` - Find all services a person has attended

### Relationship Diagram

```
┌─────────────────┐      ┌─────────────────┐
│    services     │      │     people      │
│                 │      │                 │
│  _id ──────────────────────────┐         │
│  service_date   │      │  _id ←──────────┼──┐
│  service_type   │      │  first_name     │  │
│  ...            │      │  ...            │  │
└─────────────────┘      └─────────────────┘  │
         ↑                                     │
         │           ┌─────────────────┐      │
         │           │   attendance    │      │
         │           │                 │      │
         └───────────│  service_id     │      │
                     │  person_id ─────────────┘
                     │  made_salvation │
                     │  gave_tithe     │
                     │  first_timer    │
                     └─────────────────┘
```

---

## Meeting Programmes and Meetings

`meeting_programs` stores reusable definitions and `meetings` stores dated occurrences. Programme leaders and optional rosters are linked through `meeting_program_leaders` and `meeting_program_members`. See [Meetings & Attendance](./15-meetings-attendance.md) for the complete workflow.

## Meetings Table

**Purpose**: Records prayer meetings, cell groups, and other church gatherings that aren't formal services.

**File**: `convex/schema.ts` (lines 83-100)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `program_id` | ID(meeting_programs) | ❌ | Reusable programme for this occurrence; omitted for one-off events |
| `title` | string | ❌ | Display name for a one-off or special event |
| `meeting_date` | string | ✅ | Date of the meeting (YYYY-MM-DD) |
| `meeting_type` | string | ✅ | Type of meeting (see types below) |
| `start_time` | string | ❌ | When the meeting started |
| `end_time` | string | ❌ | When the meeting ended |
| `duration_minutes` | float64 | ❌ | How long the meeting lasted |
| `format` | string | ❌ | `in_person`, `online`, or `hybrid` |
| `location` | string | ❌ | Where the meeting was held |
| `online_url` | string | ❌ | Link for online or hybrid meetings |
| `status` | string | ❌ | `scheduled`, `attendance_needed`, `completed`, or `cancelled` |
| `attendance_count` | float64 | ❌ | Cached named attendees plus unnamed guests |
| `unnamed_guests_count` | float64 | ❌ | Attendees not yet in the people directory |
| `leaders_count` | float64 | ❌ | Number of leaders present |
| `leader_id` | string | ❌ | ID of the person who led the meeting |
| `notes` | string | ❌ | Meeting notes or highlights |
| `created_at` | string | ✅ | Record creation timestamp |
| `updated_at` | string | ❌ | Last modification timestamp |

### Meeting Types

| Value | Description |
|-------|-------------|
| `bacenta` | Cell group / home fellowship meeting |
| `flow_service` | Online YouTube prayer service with the main church |
| `acts_prayer` | Weekly morning prayer, formerly Farley Morning Prayer |
| `shemen_prayer` | Friday evening prayer meeting |
| `workers_meeting` | Worker teaching and church planning |
| `evangelistic_event` | One-off evangelistic gathering |
| `special_event` | Other named one-off church event |
| `training` | One-off training or workshop |
| `fellowship` | One-off fellowship or social gathering |
| `other` | Configurable non-Sunday meeting |

### Indexes

- `by_meeting_date` - Find meetings by date
- `by_meeting_type` - Find all meetings of a specific type
- `by_program` - Find occurrences for a programme
- `by_status` - Find records that still need attendance

---

## 📝 Meeting Attendance Table

**Purpose**: Links individual people to specific meetings they attended. Similar to the attendance table but for meetings instead of services.

**File**: `convex/schema.ts` (lines 102-117)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `meeting_id` | ID(meetings) | ✅ | Reference to the meeting attended |
| `person_id` | ID(people) | ✅ | Reference to the person who attended |
| `attended` | boolean | ❌ | Explicit attendance flag (true if record exists) |
| `made_salvation_decision` | boolean | ❌ | Did they make a faith decision? |
| `gave_tithe` | boolean | ❌ | Did they give tithe? |
| `arrived_late` | boolean | ❌ | Were they late? |
| `left_early` | boolean | ❌ | Did they leave early? |
| `first_timer` | boolean | ❌ | First-ever gathering with this church |
| `first_program_attendance` | boolean | ❌ | First attendance at this recurring programme |
| `status` | string | ❌ | `present`, `absent`, or `excused` |
| `created_at` | string | ✅ | Record creation timestamp |

### Indexes

- `by_meeting` - Find all attendees for a specific meeting
- `by_person` - Find all meetings a person has attended
- `by_meeting_person` - Prevent and find duplicate attendance for one meeting/person pair

---

## 🏠 Visitations Table

**Purpose**: Records home visits and pastoral care activities. Tracks who was visited, by whom, and what was the outcome.

**File**: `convex/schema.ts` (lines 119-135)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `person_id` | ID(people) | ✅ | Reference to the person who was visited |
| `person_visited_name` | string | ❌ | Cached name of visited person (for display) |
| `visited_by_id` | ID(people) | ❌ | Reference to the person who did the visiting |
| `visited_by_name` | string | ❌ | Cached name of visitor (for display) |
| `visit_date` | string | ✅ | Date of the visit (YYYY-MM-DD) |
| `outcome` | string | ✅ | What happened during the visit (see outcomes below) |
| `follow_up_required` | boolean | ✅ | Is a follow-up visit needed? |
| `follow_up_date` | string | ❌ | When should follow-up happen? (YYYY-MM-DD) |
| `notes` | string | ❌ | Notes about the visit |
| `created_at` | string | ✅ | Record creation timestamp |
| `updated_at` | string | ❌ | Last modification timestamp |

### Visit Outcomes

| Value | Description |
|-------|-------------|
| `welcomed_encouraged` | Positive visit, person was encouraged |
| `prayer_request_received` | Person shared prayer needs |
| `not_home` | Person wasn't available |
| `concerns_shared` | Person shared concerns or problems |
| `invited_to_service` | Person was invited to attend church |

### Indexes

- `by_visit_date` - Find visitations by date
- `by_person` - Find all visitations to a specific person
- `by_follow_up` - Find all visitations requiring follow-up

---

## 📅 Activities Table

**Purpose**: General activity log for tracking various church activities that don't fit into other categories.

**File**: `convex/schema.ts` (lines 137-146)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `activity_type` | string | ✅ | Type/category of activity |
| `activity_date` | string | ✅ | When the activity occurred (YYYY-MM-DD) |
| `description` | string | ❌ | Description of what happened |
| `participants_count` | float64 | ❌ | Number of people involved |
| `notes` | string | ❌ | Additional notes |
| `created_at` | string | ✅ | Record creation timestamp |

### Indexes

- `by_activity_date` - Find activities by date

---

## 🔗 Table Relationships Summary

### Primary Relationships

| From Table | To Table | Relationship | Field |
|------------|----------|--------------|-------|
| `people` | `people` | Self-reference | `invited_by_id` (who invited this person) |
| `people` | `people` | Self-reference | `leader_id` (direct leader) |
| `attendance` | `services` | Many-to-One | `service_id` |
| `attendance` | `people` | Many-to-One | `person_id` |
| `meeting_attendance` | `meetings` | Many-to-One | `meeting_id` |
| `meeting_attendance` | `people` | Many-to-One | `person_id` |
| `visitations` | `people` | Many-to-One | `person_id` (visited person) |
| `visitations` | `people` | Many-to-One | `visited_by_id` (visitor) |

### How to Answer Common Questions

| Question | Query Strategy |
|----------|---------------|
| "Who attended last Sunday's service?" | Query `attendance` by `service_id`, join with `people` |
| "How often does John attend?" | Query `attendance` by `person_id`, count records |
| "Who has this person invited?" | Query `people` where `invited_by_id` = person's ID |
| "Which members need follow-up visits?" | Query `visitations` where `follow_up_required` = true |
| "What meetings happened this month?" | Query `meetings` by `meeting_date` range |

---

## 📁 Mock Data

For development and testing, sample data is defined in:

- `convex/seed.ts` - Comprehensive seed data script
- `src/lib/data/mockData.js` - Frontend mock data
- `src/lib/data/mockPeopleWithLocation.js` - People with map coordinates

The seed script creates realistic sample data spanning 2025-2026 for all tables.
