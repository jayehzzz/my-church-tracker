# 📈 Chart Components

> **Complete guide to all data visualization components for displaying church metrics.**

---

## Overview

Chart components live in `src/lib/components/charts/` and provide interactive visualizations for church data. They're designed for the dark theme and use consistent styling.

### Chart Index

| Component | Type | Shows |
|-----------|------|-------|
| `AttendanceTrend.svelte` | Line Chart | Attendance over time |
| `CategoryDonut.svelte` | Donut Chart | Category distribution |
| `ContactsByMonthTimeline.svelte` | Timeline | Monthly contacts |
| `ConversionFunnel.svelte` | Funnel | Contact → Member journey |
| `EngagementRadar.svelte` | Radar Chart | Member engagement profile |
| `GrowthTimeline.svelte` | Area Chart | Membership growth |
| `InviterBarChart.svelte` | Bar Chart | Top inviters |
| `LeaderHeatmap.svelte` | Heatmap | Leader activity patterns |
| `MonthlyContactsBar.svelte` | Bar Chart | Contacts by month |
| `PrayerHoursChart.svelte` | Bar/Pie | Prayer meeting hours |
| `RoleDistribution.svelte` | Pie Chart | Role breakdown |
| `SalvationTimeline.svelte` | Timeline | Salvations over time |
| `Sparkline.svelte` | Mini Line | Trend indicator |
| `VisitationCalendar.svelte` | Calendar | Visit days |

---


## 📉 AttendanceTrend.svelte

**Location**: `src/lib/components/charts/AttendanceTrend.svelte`

**Purpose**: Displays attendance numbers over time as a line/area chart, helping identify growth or decline patterns.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of `{ date, attendance }` objects |
| `height` | number | Chart height in pixels |
| `showLabels` | boolean | Show data point labels |
| `showTrend` | boolean | Show trend line |

### Data Format

```javascript
const attendanceData = [
  { date: '2025-01-05', attendance: 145 },
  { date: '2025-01-12', attendance: 152 },
  { date: '2025-01-19', attendance: 148 },
  { date: '2025-01-26', attendance: 160 }
];
```

### Usage Example

```svelte
<script>
  import AttendanceTrend from '$lib/components/charts/AttendanceTrend.svelte';
</script>

<Card title="Attendance Trend">
  <AttendanceTrend 
    data={attendanceData}
    height={300}
    showTrend
  />
</Card>
```

### What It Shows

- **X-axis**: Dates (weekly or monthly)
- **Y-axis**: Attendance count
- **Line/Area**: Attendance values over time
- **Trend Line (optional)**: Overall direction (up/down/flat)

### Insights Provided

- Weekly/monthly attendance patterns
- Seasonal variations (summer dips, holiday spikes)
- Growth or decline trends
- Anomalies (unusually high/low weeks)

---

## 🍩 CategoryDonut.svelte

**Location**: `src/lib/components/charts/CategoryDonut.svelte`

**Purpose**: Displays category distribution as a donut (ring) chart with percentages.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of `{ category, value, color }` objects |
| `title` | string | Center title text |
| `showLegend` | boolean | Show category legend |

### Data Format

```javascript
const statusData = [
  { category: 'Members', value: 120, color: '#22c55e' },
  { category: 'Guests', value: 35, color: '#3b82f6' },
  { category: 'Leaders', value: 15, color: '#f59e0b' },
  { category: 'Archived', value: 8, color: '#6b7280' }
];
```

### Usage Example

```svelte
<script>
  import CategoryDonut from '$lib/components/charts/CategoryDonut.svelte';
</script>

<Card>
  <CategoryDonut 
    data={statusData}
    title="168"
    showLegend
  />
</Card>
```

### Common Uses

- **Member Status Distribution**: Members vs Guests vs Leaders
- **Response Categories**: Responsive vs Non-responsive contacts
- **Activity Status**: Regular vs Irregular vs Dormant
- **Meeting Type Breakdown**: Types of meetings held

---

## 📅 ContactsByMonthTimeline.svelte

**Location**: `src/lib/components/charts/ContactsByMonthTimeline.svelte`

**Purpose**: Shows evangelism contacts made over time, visualized as a horizontal timeline with bars for each month.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of contact records with `contact_date` |
| `months` | number | How many months to show (default: 12) |

### Usage Example

```svelte
<script>
  import ContactsByMonthTimeline from '$lib/components/charts/ContactsByMonthTimeline.svelte';
</script>

<Card title="Contacts Made (Last 12 Months)">
  <ContactsByMonthTimeline 
    data={contacts}
    months={12}
  />
</Card>
```

### What It Shows

- Monthly count of new evangelism contacts
- Visual comparison between months
- Patterns in outreach activity
- Peak outreach periods

---

## 🔻 ConversionFunnel.svelte

**Location**: `src/lib/components/charts/ConversionFunnel.svelte`

**Purpose**: Displays the conversion journey from contact to member as a funnel visualization, showing drop-off at each stage.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | object | Stage counts for the funnel |

### Data Format

```javascript
const funnelData = {
  contacted: 100,      // Initial contacts
  responsive: 65,      // Responded positively
  firstVisit: 40,      // Visited church
  returned: 28,        // Came back
  member: 18           // Became members
};
```

### Usage Example

```svelte
<script>
  import ConversionFunnel from '$lib/components/charts/ConversionFunnel.svelte';
</script>

<Card title="Evangelism Conversion Funnel">
  <ConversionFunnel data={funnelData} />
</Card>
```

### What It Shows

- **Width**: Proportional to count at each stage
- **Stages**: Contact → Responsive → First Visit → Return → Member
- **Conversion Rate**: Percentage moving to next stage
- **Drop-off Points**: Where people are lost in the journey

### Insights Provided

- Overall conversion rate (contacts → members)
- Which stages have the biggest drop-off
- Where to focus improvement efforts
- Effectiveness of follow-up processes

---

## 📈 GrowthTimeline.svelte

**Location**: `src/lib/components/charts/GrowthTimeline.svelte`

**Purpose**: Shows church membership growth over time as an area chart with milestone markers.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of `{ date, total }` objects |
| `milestones` | array | Optional milestone markers |
| `height` | number | Chart height |

### Data Format

```javascript
const growthData = [
  { date: '2024-01', total: 95 },
  { date: '2024-06', total: 112 },
  { date: '2025-01', total: 145 },
  { date: '2025-06', total: 168 }
];

const milestones = [
  { date: '2024-03', label: 'Building Expansion' },
  { date: '2025-01', label: '150 Members!' }
];
```

### Usage Example

```svelte
<script>
  import GrowthTimeline from '$lib/components/charts/GrowthTimeline.svelte';
</script>

<Card title="Membership Growth">
  <GrowthTimeline 
    data={growthData}
    milestones={milestones}
    height={250}
  />
</Card>
```

---

## 📊 InviterBarChart.svelte

**Location**: `src/lib/components/charts/InviterBarChart.svelte`

**Purpose**: Horizontal bar chart showing which members have invited the most people (leaderboard style).

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of `{ person, inviteCount }` objects |
| `limit` | number | Max number of people to show |
| `showPhotos` | boolean | Show profile photos |

### Data Format

```javascript
const topInviters = [
  { person: { id: '1', name: 'John Doe', avatar: '...' }, inviteCount: 12 },
  { person: { id: '2', name: 'Jane Smith', avatar: '...' }, inviteCount: 9 },
  { person: { id: '3', name: 'Bob Wilson', avatar: '...' }, inviteCount: 7 }
];
```

### Usage Example

```svelte
<script>
  import InviterBarChart from '$lib/components/charts/InviterBarChart.svelte';
</script>

<Card title="Top Inviters">
  <InviterBarChart 
    data={topInviters}
    limit={10}
    showPhotos
  />
</Card>
```

### What It Shows

- Ranked list of members by invite count
- Visual bar representing relative contribution
- Clickable names (links to profile)
- Gamification element to encourage inviting

---

## 🗓️ LeaderHeatmap.svelte

**Location**: `src/lib/components/charts/LeaderHeatmap.svelte`

**Purpose**: Displays leader activity as a GitHub-style contribution heatmap, showing activity intensity over time.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of `{ date, count }` activity records |
| `colorScale` | array | Colors from low to high activity |

### Usage Example

```svelte
<script>
  import LeaderHeatmap from '$lib/components/charts/LeaderHeatmap.svelte';
</script>

<Card title="Leader Activity (Last Year)">
  <LeaderHeatmap data={activityData} />
</Card>
```

### What It Shows

- Grid of days/weeks
- Color intensity shows activity level
- Patterns (which days are busiest)
- Gaps (inactive periods)

---

## 📊 MonthlyContactsBar.svelte

**Location**: `src/lib/components/charts/MonthlyContactsBar.svelte`

**Purpose**: Vertical bar chart comparing contacts made each month.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of `{ month, count }` objects |
| `height` | number | Chart height |

### Usage Example

```svelte
<script>
  import MonthlyContactsBar from '$lib/components/charts/MonthlyContactsBar.svelte';
</script>

<Card title="Monthly Outreach">
  <MonthlyContactsBar data={monthlyContacts} height={200} />
</Card>
```

---

## 🙏 PrayerHoursChart.svelte

**Location**: `src/lib/components/charts/PrayerHoursChart.svelte`

**Purpose**: Displays total prayer hours logged across different meeting types.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Meeting records with duration |
| `groupBy` | string | `'type'` or `'month'` |

### Usage Example

```svelte
<script>
  import PrayerHoursChart from '$lib/components/charts/PrayerHoursChart.svelte';
</script>

<Card title="Prayer Hours This Year">
  <PrayerHoursChart 
    data={meetings}
    groupBy="type"
  />
</Card>
```

### What It Shows

- **By Type**: Hours for Bacenta, Flow Prayer, All-Night, etc.
- **By Month**: Monthly prayer hour totals
- Total aggregate hours

---

## 👥 RoleDistribution.svelte

**Location**: `src/lib/components/charts/RoleDistribution.svelte`

**Purpose**: Pie/donut chart showing the breakdown of roles in the church.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of `{ role, count }` objects |

### Data Format

```javascript
const roleData = [
  { role: 'Basonta Leader', count: 8 },
  { role: 'Bacenta Leader', count: 4 },
  { role: 'Basonta Worker', count: 12 },
  { role: 'No Role', count: 144 }
];
```

### Usage Example

```svelte
<script>
  import RoleDistribution from '$lib/components/charts/RoleDistribution.svelte';
</script>

<Card title="Role Distribution">
  <RoleDistribution data={roleData} />
</Card>
```

---

## ✝️ SalvationTimeline.svelte

**Location**: `src/lib/components/charts/SalvationTimeline.svelte`

**Purpose**: Timeline visualization of salvation decisions made during services.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Service records with `salvation_decisions` |
| `cumulative` | boolean | Show running total vs. individual |

### Usage Example

```svelte
<script>
  import SalvationTimeline from '$lib/components/charts/SalvationTimeline.svelte';
</script>

<Card title="Salvation Decisions">
  <SalvationTimeline 
    data={services}
    cumulative
  />
</Card>
```

### What It Shows

- Salvation decisions by service/date
- Cumulative total over time
- Services with the most decisions
- Growth in overall salvations

---

## 📈 Sparkline.svelte

**Location**: `src/lib/components/charts/Sparkline.svelte`

**Purpose**: Tiny inline trend line used in KPI cards to show quick trend direction.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Array of numbers representing values over time |
| `color` | string | Line color |
| `width` | number | Width in pixels |
| `height` | number | Height in pixels |

### Usage Example

```svelte
<script>
  import Sparkline from '$lib/components/charts/Sparkline.svelte';
</script>

<div class="kpi-card">
  <h3>Weekly Attendance</h3>
  <span class="value">156</span>
  <Sparkline 
    data={[142, 148, 145, 152, 156]}
    color="#22c55e"
    width={80}
    height={24}
  />
</div>
```

### Use Cases

- KPI cards showing trend at a glance
- Table cells with inline trends
- Dashboard widgets

---

## 📆 VisitationCalendar.svelte

**Location**: `src/lib/components/charts/VisitationCalendar.svelte`

**Purpose**: Monthly calendar view highlighting days when visitations occurred.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | array | Visitation records with `visit_date` |
| `month` | Date | Month to display |
| `onDayClick` | function | Callback when clicking a day |

### Usage Example

```svelte
<script>
  import VisitationCalendar from '$lib/components/charts/VisitationCalendar.svelte';
  
  function handleDayClick(date, visitations) {
    console.log(`${visitations.length} visits on ${date}`);
  }
</script>

<Card title="Visitation Calendar - January 2025">
  <VisitationCalendar 
    data={visitations}
    month={new Date(2025, 0, 1)}
    onDayClick={handleDayClick}
  />
</Card>
```

### What It Shows

- Calendar grid for the month
- Colored/marked days where visits occurred
- Click to see visit details
- Quick view of visitation activity patterns

---

## 📊 Dashboard Components

### AttendanceChart.svelte

**Location**: `src/lib/components/dashboard/AttendanceChart.svelte`

**Purpose**: Full-featured attendance chart with multiple view options.

### KPICard.svelte

**Location**: `src/lib/components/dashboard/KPICard.svelte`

**Purpose**: Key Performance Indicator display card.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Metric name |
| `value` | number/string | Current value |
| `change` | number | Change from previous period |
| `changeType` | string | `'positive'` or `'negative'` |
| `sparklineData` | array | Data for sparkline |
| `icon` | component | Icon component |

### Usage Example

```svelte
<script>
  import KPICard from '$lib/components/dashboard/KPICard.svelte';
</script>

<div class="kpi-grid">
  <KPICard 
    title="Active Members"
    value="168"
    change={+8}
    changeType="positive"
    sparklineData={memberTrend}
  />
  
  <KPICard 
    title="Avg Attendance"
    value="152"
    change={+5.2}
    changeType="positive"
  />
  
  <KPICard 
    title="New Contacts"
    value="24"
    change={-3}
    changeType="negative"
  />
</div>
```

### RecentActivityList.svelte

**Location**: `src/lib/components/dashboard/RecentActivityList.svelte`

**Purpose**: Shows a chronological list of recent activities across all modules.

### InviterProfilePopup.svelte

**Location**: `src/lib/components/dashboard/InviterProfilePopup.svelte`

**Purpose**: Quick view popup showing an inviter's details and their invitees.
