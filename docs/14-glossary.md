# 📚 Glossary

> **Key terms and concepts used throughout the application.**

---

## Member Status Terms

### Guest
A person who has visited the church but is not yet a regular member. This is typically the first status for someone who attends a service for the first time.

**Characteristics**:
- Has visited at least once
- Not yet committed as a member
- May need follow-up to encourage regular attendance
- Can be promoted to "Member"

### Member
A regular, committed church member who attends services and participates in church life.

**Characteristics**:
- Attends regularly
- May have a membership date recorded
- Can be assigned roles
- Tracked for activity status
- Can be promoted to "Leader"

### Leader
A member who has leadership responsibilities within the church structure.

**Characteristics**:
- Has an assigned role (Basonta Leader, Bacenta Leader, etc.)
- May lead meetings or groups
- Appears in leadership reports
- Can lead visitations

### Archived
A person who was previously active but is no longer part of the church community.

**Characteristics**:
- Removed from active lists
- Still appears in historical data
- Can be reactivated if they return
- Not counted in active member statistics

---

## Activity Status Terms

### Regular
A member who consistently attends services and participates in church activities.

**Indicators**:
- Attends most services
- Active in meetings
- Engaged in church life

### Irregular
A member whose attendance is inconsistent or sporadic.

**Indicators**:
- Attends some services but not regularly
- May need follow-up
- At risk of becoming dormant

### Dormant
A member who has stopped attending or participating.

**Indicators**:
- No recent attendance
- May need pastoral visit
- Risk of being lost from the community
- Highlighted for attention

---

## Role Terms

### Basonta Leader
Leader of a Basonta - the smallest unit/cell group in the church structure.

**Responsibilities**:
- Leads a small group
- Reports to Bacenta Leader
- Tracks basonta members
- Facilitates meetings

### Bacenta Leader
Leader of a Bacenta - a collection of Basontas forming a larger cell group.

**Responsibilities**:
- Oversees multiple Basontas
- Coordinates Bacenta meetings
- Reports to higher leadership
- Mentors Basonta Leaders

### Basonta Worker
A member who assists in Basonta activities but doesn't lead.

**Responsibilities**:
- Supports the Basonta Leader
- Helps with group activities
- May be training for leadership

### No Role
A regular member without a specific leadership assignment.

---

## Meeting Types

### Bacenta
A cell group or home fellowship meeting where members gather for Bible study, prayer, and fellowship.

**Characteristics**:
- Regular weekly/bi-weekly meetings
- Hosted in homes or church
- Smaller, intimate groups
- Focus on community and study

### Flow Prayer
A regular prayer session, typically held weekly.

**Characteristics**:
- Focused on corporate prayer
- May have specific prayer points
- Open to all members
- Usually 1-2 hours

### All-Night Prayer
An extended overnight prayer meeting.

**Characteristics**:
- Typically starts in evening, ends at dawn
- Special occasions or monthly events
- Intense prayer focus
- Higher commitment required

### Basonta
A meeting of the smallest unit group.

**Characteristics**:
- Very small group (5-15 people)
- Close-knit community
- Weekly meetings
- Focus on accountability and care

### SAT (Saturday Meeting)
Regular Saturday gatherings.

**Characteristics**:
- Weekend meeting time
- May focus on youth or specific groups
- Alternative to weekday meetings

### Farley Prayer
A specific type of prayer meeting (named after a church tradition).

**Characteristics**:
- Follows a specific prayer format
- May have historical significance
- Regular scheduled time

---

## Evangelism Terms

### Contact
A person reached through evangelism/outreach efforts who hasn't yet visited the church.

**Characteristics**:
- Met through outreach
- Has contact information
- Needs follow-up
- Not yet in attendance records

### Responsive
A contact who responded positively to outreach and is interested in learning more.

**Characteristics**:
- Engaged in conversation
- Showed interest
- Priority for follow-up
- Most likely to visit

### Non-Responsive
A contact who didn't show interest or declined further contact.

**Characteristics**:
- Politely declined
- Not interested currently
- May be revisited later
- Lower priority

### Events Only
A contact who is only interested in special events, not regular attendance.

**Characteristics**:
- Interested in specific programs
- May attend Easter, Christmas, etc.
- Not seeking regular membership
- Still worth engaging

### Do Not Contact
A contact who has explicitly asked not to be contacted.

**Characteristics**:
- Request must be respected
- Removed from follow-up lists
- May have had negative experience
- Privacy must be maintained

### Has Church
A contact who already attends another church.

**Characteristics**:
- Already has a church home
- May be good for ecumenical events
- Not a conversion target
- Can still be friendly contacts

### Inviter
A church member who invites new people to church.

**Metrics tracked**:
- Number of people invited
- Conversion rate (invites → members)
- Active outreach participation

### Conversion
When a contact becomes a church member.

**Journey**:
```
Contact → First Visit → Regular Attendance → Membership
```

---

## Service Terms

### Sunday Service
The main weekly worship gathering on Sunday.

**Characteristics**:
- Primary church service
- Highest attendance expected
- Includes sermon, worship, communion
- Main tracking point for attendance

### Special Service
Any service outside regular Sunday gatherings.

**Examples**:
- Easter Service
- Christmas Service
- Wedding
- Funeral
- Conference
- Revival Meeting

### Sermon
The teaching/preaching portion of a service.

**Tracked data**:
- Topic/Title
- Speaker name
- Duration (optional)

### Salvation Decision
When someone makes a faith commitment during a service.

**Tracked as**:
- Count per service
- Individual person if known
- Key metric for evangelistic impact

### First Timer
Someone attending a service for the first time.

**Tracked as**:
- Guests count per service
- Individual records if captured
- Important for follow-up

### Tither
Someone who contributed their tithe (typically 10% of income) during a service.

**Tracked as**:
- Count per service
- Individual record in attendance
- Indicator of commitment

---

## Visitation Terms

### Home Visit / Pastoral Visit
When a church leader or member visits someone at their home.

**Purpose**:
- Provide pastoral care
- Encourage attendance
- Prayer and support
- Build relationship

### Visitor / Visitee
The person being visited at their home.

### Outcome
The result of a visitation.

**Types**:
- **Welcomed & Encouraged**: Positive visit
- **Prayer Request Received**: Person shared needs
- **Not Home**: Unable to make contact
- **Concerns Shared**: Person had issues to discuss
- **Invited to Service**: Encouraged to attend

### Follow-up
A subsequent action needed after a visitation.

**When required**:
- Person had prayer requests
- Person expressed concerns
- Need to check on progress
- Person was not home

---

## System Terms

### Convex
The backend database service used by the application.

**What it provides**:
- Real-time database
- Serverless functions
- Automatic scaling
- Type-safe queries

### Store (Svelte Store)
Reactive state containers that share data across components.

**Types in this app**:
- `filterStore`: Global date filter
- `navigationStore`: Sidebar state
- `searchStore`: Search functionality

### Service (Frontend)
JavaScript modules that connect the UI to the backend.

**Pattern**:
```javascript
// Get data
const { data, error } = await service.getAll();

// Create data
const { data, error } = await service.create(newData);
```

### Route
A URL path in the application.

**Examples**:
- `/` → Dashboard
- `/people` → People directory
- `/people/[id]` → Person profile

### Component
A reusable piece of UI.

**Types**:
- **Page**: Full page layout (`+page.svelte`)
- **Layout**: Wraps pages (`+layout.svelte`)
- **Feature**: Business logic (forms, charts)
- **UI**: Generic elements (buttons, cards)

---

## Data Terms

### KPI (Key Performance Indicator)
A metric used to measure church health.

**Examples**:
- Average attendance
- Member count
- Salvation decisions
- Visitations completed

### Date Range / Period
The time frame for viewing data.

**Types**:
- This Month, This Year, This Quarter
- Last 30 Days, Last 3/6/12 Months
- Specific Year/Month/Quarter
- Custom Date Range

### Aggregation
Combining multiple records into summary statistics.

**Examples**:
- Sum of attendance
- Average per service
- Count by status
- Group by month

---

## Church Structure Terms

### Pastoral Network
The hierarchy of leadership in the church.

```
Pastor
  └── Zone Leaders
        └── Bacenta Leaders
              └── Basonta Leaders
                    └── Members
```

### Cell Group
Small group meetings outside of main services.

**Purpose**:
- Community building
- Bible study
- Prayer
- Accountability

### Pipeline
The journey someone takes from first contact to full membership.

```
Unknown → Contact → First Visit → Guest → Member → Leader
```

---

## Technical Abbreviations

| Term | Meaning |
|------|---------|
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| CSV | Comma-Separated Values |
| ID | Unique Identifier |
| KPI | Key Performance Indicator |
| UI | User Interface |
| URL | Uniform Resource Locator |
| UTC | Coordinated Universal Time |
