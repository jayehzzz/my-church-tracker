# 📅 TIME-BASED FILTERING SPECIFICATIONS

**Comprehensive Guide to Date Range & Period Filtering**

---

## 🎯 Overview

Your church dashboard needs flexible time-based filtering across multiple dashboards. Users should be able to quickly view data for:

- **Quick Periods:** This Year, This Month, This Quarter, Last 30/90 days
- **Specific Periods:** Any specific month/year combination
- **Custom Ranges:** Date range picker for any time span
- **Year/Quarter Selection:** View by specific year or quarter

This guide specifies exactly how to implement these filters across all dashboards.

---

## 📊 DASHBOARDS REQUIRING TIME FILTERS

| Dashboard | Requires Filter? | Primary Use | Time Range Options |
|-----------|-----------------|-------------|-------------------|
| **Evangelism** | ✅ YES | Track contacts by period | Contacts added date |
| **Sunday Services** | ✅ YES | Attendance trends | Service dates |
| **Meetings & Prayer** | ✅ YES | Prayer hours, leader activity | Meeting dates |
| **Members** | ✅ YES (Optional) | Growth tracking | Join dates, activity |
| **Visitation** | ✅ YES | Follow-up completion | Visit dates |

---

## 🔧 FILTER COMPONENT SPECIFICATIONS

### Filter Group Location
**Position:** Below page title, above metrics (sticky on scroll)

```
┌─────────────────────────────────────────────────┐
│ Dashboards > Evangelism                         │
├─────────────────────────────────────────────────┤
│ Quick Filters:                                   │
│ [This Year] [This Month] [Last 30 Days]        │
│ [This Quarter]                                  │
│                                                  │
│ Selected: This Month (Dec 1 - Dec 31, 2025)     │
│ [Clear Filters]                                 │
├─────────────────────────────────────────────────┤
│ KPI METRICS (update based on filter)            │
│ ... rest of dashboard                           │
```

### Filter Bar Design

**Layout:**
- **Horizontal scroll-friendly** on mobile
- **2 rows on tablet/mobile:**
  - Row 1: Quick filter buttons
  - Row 2: Advanced options
- **Single row on desktop**

**Styling:**
- **Background:** `#1e1e1e` (Card Color / Neutral Gray)
- **Border-bottom:** 1px `#2d3748`
- **Padding:** 16px
- **Sticky position:** Stays visible when scrolling down

---

## 🎨 FILTER BUTTON TYPES

### Quick Filter Buttons

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ This Year    │  │ This Month   │  │ Last 30 Days │
│ 2025         │  │ Dec 2025     │  │ Nov-Dec 2025 │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Styling:**
- **Inactive state:**
  - Background: `#2d3748`
  - Text: `#a0aec0` (secondary gray)
  - Border: 1px `#4a5568`
  - Padding: 10px 16px
  - Border radius: 6px
  - Font: 14px medium
  - Cursor: pointer

- **Active state (selected):**
  - Background: `#06b6d4` (teal)
  - Text: White (`#e2e8f0`)
  - Border: 1px `#0891b2`
  - Shadow: `shadow-md`

- **Hover state (inactive):**
  - Background: `#374151` (slightly lighter)
  - Border: 1px `#4a5568`

- **Interaction:**
  - Click selects period
  - Active button highlights in teal
  - Metrics update instantly (150ms fade transition)

### Button Group Layout

```
Row 1 - Quick Periods:
[This Year] [This Month] [Last 30 Days] [This Quarter]

Row 2 (or inline) - Advanced:
[Year ▼] [Month ▼] [Custom Date Range] [Clear All]
```

**Spacing:**
- **Between buttons:** 8px gap
- **Between rows:** 12px gap

---

## 🗓️ FILTER OPTIONS DETAILED

### 1. "THIS YEAR" Filter
- **Label:** "This Year"
- **Display:** Shows current year (e.g., "2025")
- **Date Range:** January 1 - December 31 of current year
- **Use Case:** Quick overview of entire year performance
- **Data recalculates:** Instantly when clicked

**Example:**
```
Selected: This Year (Jan 1 - Dec 31, 2025)
- Total Contacts: 247
- Conversion Rate: 18.2%
- Top Inviter: John (12)
```

### 2. "THIS MONTH" Filter
- **Label:** "This Month"
- **Display:** Shows current month & year (e.g., "Dec 2025")
- **Date Range:** 1st to last day of current month
- **Use Case:** Monitor current month activity
- **Updates daily:** As new data comes in

**Example:**
```
Selected: This Month (Dec 1 - Dec 31, 2025)
- Contacts this month: 23
- Conversion rate this month: 21.7%
```

### 3. "THIS QUARTER" Filter
- **Label:** "This Quarter"
- **Display:** Current quarter (e.g., "Q4 2025")
- **Date Range:**
  - Q1: Jan 1 - Mar 31
  - Q2: Apr 1 - Jun 30
  - Q3: Jul 1 - Sep 30
  - Q4: Oct 1 - Dec 31
- **Use Case:** Track quarterly trends, seasonal patterns

**Example:**
```
Selected: This Quarter (Q4 2025: Oct 1 - Dec 31)
- Total contacts: 78
- Prayer hours: 156
```

### 4. "LAST 30 DAYS" Filter
- **Label:** "Last 30 Days"
- **Display:** Date range (e.g., "Nov 9 - Dec 9")
- **Date Range:** Past 30 days from today
- **Use Case:** Recent activity snapshot
- **Updates daily**

**Example:**
```
Selected: Last 30 Days (Nov 9 - Dec 9, 2025)
- Contacts: 12
- Services attended: 45
```

### 5. "YEAR" Dropdown Selector
- **Label:** "Year"
- **Type:** Dropdown select
- **Options:** 
  - 2025 (current)
  - 2024
  - 2023
  - 2022
  - (or based on data available)
- **Default:** Current year selected
- **Behavior:** 
  - Click opens dropdown
  - Select year
  - Automatically filters all data to that year (Jan 1 - Dec 31)
  - Can be combined with Month/Quarter filters

**Example:**
```
Year: [2024] ▼
Available: 2025, 2024, 2023, 2022

Select 2024 → Shows data for Jan 1 - Dec 31, 2024
```

### 6. "MONTH" Dropdown Selector
- **Label:** "Month"
- **Type:** Dropdown with month + year
- **Options:**
  - January 2025
  - February 2025
  - ... 
  - December 2024
  - November 2024
  - (continues backwards)
- **Default:** Current month/year
- **Behavior:**
  - Click opens dropdown
  - Scrollable list of months
  - Select month
  - Shows data for that entire month (1st - last day)
  - Updates year automatically when selecting past months
  - Can override Year dropdown

**Example:**
```
Month: [December 2025] ▼
Available list:
- January 2025
- February 2025
- ... (current month at top)
- December 2024
- November 2024
- October 2024

Select "October 2024" → Shows data for Oct 1-31, 2024
(Year selector updates to 2024 automatically)
```

### 7. "QUARTER" Selector
- **Label:** "Quarter"
- **Type:** Dropdown or button group
- **Options:**
  - Q1 2025 (Jan 1 - Mar 31)
  - Q2 2025 (Apr 1 - Jun 30)
  - Q3 2025 (Jul 1 - Sep 30)
  - Q4 2025 (Oct 1 - Dec 31)
  - Q1 2024, Q2 2024, etc.
- **Default:** Current quarter
- **Behavior:**
  - Overrides year selection
  - Updates to correct year automatically

**Example:**
```
Quarter: [Q4 2025] ▼
Available:
- Q4 2025 (Oct 1 - Dec 31, 2025) [current]
- Q3 2025 (Jul 1 - Sep 30, 2025)
- Q2 2025 (Apr 1 - Jun 30, 2025)
- Q1 2025 (Jan 1 - Mar 31, 2025)
- Q4 2024, Q3 2024, etc.
```

### 8. "CUSTOM DATE RANGE" Picker
- **Label:** "Custom Range"
- **Type:** Button that opens date range picker modal
- **UI:** 
  - Calendar picker with start date
  - Calendar picker with end date
  - Apply & Cancel buttons
- **Behavior:**
  - Opens modal on click
  - Can select any date range
  - Validates: End date > Start date
  - Shows selected range in button label

**Example:**
```
[Custom Range: Oct 5 - Dec 9]

Click → Opens modal:
┌─────────────────────────────────┐
│ Select Date Range               │
├─────────────────────────────────┤
│ From: [Oct 5, 2025]   ▼         │
│ To:   [Dec 9, 2025]   ▼         │
├─────────────────────────────────┤
│              [Cancel] [Apply]   │
└─────────────────────────────────┘
```

### 9. "CLEAR FILTERS" Button
- **Label:** "Clear Filters" or "Reset"
- **Type:** Text button or icon
- **Location:** Right side of filter bar
- **Behavior:**
  - Resets all filters to defaults (This Month)
  - All buttons return to inactive state
  - Metrics refresh to show full data
  - Only appears if filters are active

**Styling:**
- **Appearance:** Gray text, no background
- **Hover:** Light gray background
- **Icon:** Optional ✕ icon before text

---

## 📱 FILTER LAYOUT BY SCREEN SIZE

### Desktop (1024px+)
```
┌──────────────────────────────────────────────────────────┐
│ Quick: [This Year] [This Month] [Last 30 Days] [This Q] │
│ Advanced: [Year ▼] [Month ▼] [Quarter ▼] [Date Range]  │
│ Selected: This Year (Jan 1 - Dec 31, 2025) [Clear]      │
└──────────────────────────────────────────────────────────┘
```

**Layout:**
- 2 rows
- First row: Quick filter buttons (4 items: This Year, This Month, Last 30 Days, This Quarter)
- Second row: Year, Month, Quarter, Date Range (4 items)
- Selected info on its own row
- All on one "sticky bar"

### Tablet (768px - 1023px)
```
┌──────────────────────────────────────────────────────────┐
│ [This Year] [This Month] [Last 30 Days] [This Quarter] │
│ [Year ▼] [Month ▼] [Quarter ▼] [Date Range] [Clear]   │
│ Selected: This Year (Jan 1 - Dec 31, 2025)             │
└──────────────────────────────────────────────────────────┘
```

**Layout:**
- 3 rows
- First row: Quick filters + year
- Second row: Month, Quarter, Date, Clear
- Third row: Selected info

### Mobile (<768px)
```
┌─────────────────────────────────────────┐
│ 📅 Filters [Applied: 1] ▼              │
├─────────────────────────────────────────┤
│ Quick Periods:                          │
│ [This Year] [This Month] [Last 30 Days] │
│ [This Quarter]                          │
│                                         │
│                                         │
│ Period Selection:                       │
│ [Year ▼] [Month ▼] [Quarter ▼] [Date] │
│                                         │
│ Selected: This Year                     │
│ Jan 1 - Dec 31, 2025                   │
│                                         │
│        [Clear Filters]                  │
├─────────────────────────────────────────┤
│ [Apply Filters] [Cancel]                │
└─────────────────────────────────────────┘
```

**Layout:**
- Collapsible filter panel (hamburger menu)
- Stacked vertically
- Shows "[Applied: X]" badge
- Buttons full width
- Modal-style with Apply/Cancel

---

## 🔄 FILTER INTERACTION FLOW

### Desktop/Tablet Flow
1. User sees filter bar with defaults
2. User clicks a quick filter button (e.g., "Last 30 Days")
3. Button highlights in teal
4. Selected text updates (e.g., "Last 30 Days (Nov 9 - Dec 9)")
5. Metrics cards fade out → update → fade in (150ms)
6. Charts redraw with new data (500ms animation)
7. Table data refreshes
8. User can click another button to change filter

### Mobile Flow
1. User clicks "📅 Filters" button
2. Collapsible panel opens (slide down, 200ms)
3. User selects options within panel
4. User clicks "Apply Filters" button
5. Panel closes
6. Data updates as above

### Multi-Filter Combination
**Scenario:** User wants August 2024 data

1. Click "Year" dropdown → Select 2024
2. Click "Month" dropdown → Select August
3. OR click "Custom Range" → Set dates to Aug 1-31, 2024

**Result:** All metrics, charts, tables update to show August 2024 data

---

## 📊 FILTER IMPACT BY DASHBOARD

### EVANGELISM DASHBOARD

**Available Filters:**
- This Year / This Month / Last 30 Days / This Quarter
- Year / Month / Quarter / Custom Date Range

**What Changes:**
- **KPI Metrics:**
  - Total Contacts (filtered by date_contacted)
  - Conversion Rate % (filtered by date_contacted)
  - Active Leads (filtered by date_contacted)
  - Top Inviter (filtered by date_contacted)

- **Charts:**
  - Conversion Funnel (bars show filtered data)
  - Categories Distribution (shows filtered breakdown)

- **Contact Table:**
  - Only shows contacts created within selected period
  - "Days Since Contact" recalculated

**SQL Query Update:**
```sql
SELECT * FROM contacts 
WHERE date_contacted BETWEEN @startDate AND @endDate
ORDER BY date_contacted DESC
```

---

### SUNDAY SERVICES DASHBOARD

**Available Filters:**
- This Year / This Month / Last 30 Days / This Quarter
- Year / Month / Quarter / Custom Date Range

**What Changes:**
- **KPI Metrics:**
  - Members Attended (filtered by service_date)
  - First Timers (filtered by service_date)
  - Conversions (filtered by service_date)
  - Attendance Rate % (filtered by service_date)

- **Charts:**
  - Attendance Trend (line chart shows selected period)
  - Conversion Funnel (filtered by period)

- **Service Table:**
  - Only shows services within selected dates
  - Statistics recalculate

**SQL Query Update:**
```sql
SELECT * FROM services 
WHERE service_date BETWEEN @startDate AND @endDate
ORDER BY service_date DESC
```

---

### MEETINGS & PRAYER DASHBOARD

**Available Filters:**
- This Year / This Month / Last 30 Days / This Quarter
- Year / Month / Quarter / Custom Date Range
- **PLUS:** Meeting Type dropdown (Flow, Bacenta, Farley, etc.)

**What Changes:**
- **KPI Metrics:**
  - Total Prayer Hours (sum of duration in period)
  - Latest Meeting Attendance (filtered by meeting_date)
  - Leader Participation Rate % (filtered by meeting_date)
  - Meeting Types Count (filtered by meeting_date)

- **Charts:**
  - Prayer Hours Accumulated (area chart: Jan-Dec of selected year)
  - Leader Participation Heatmap (filtered by period)

- **Meeting Records Table:**
  - Only shows meetings within selected dates
  - Duration totals update

**SQL Query Update:**
```sql
SELECT * FROM meetings 
WHERE meeting_date BETWEEN @startDate AND @endDate
AND meeting_type = @selectedType (if specific type selected)
ORDER BY meeting_date DESC
```

**Special Behavior:**
- If "This Quarter" is selected on Meetings dashboard:
  - Prayer Hours shows total for that quarter
  - Heatmap shows only meetings in that quarter
  - Allows comparison of Q1 vs Q2 vs Q3 vs Q4

---

### MEMBERS DASHBOARD

**Available Filters:**
- This Year / This Month / Last 30 Days (for activity)
- Year / Month / Quarter / Custom Date Range
- **PLUS:** Role filter (Basonta, Bacenta, None)
- **PLUS:** Status filter (Regular, Irregular, Dormant)

**What Changes:**
- **KPI Metrics:**
  - Total Members (shows all-time)
  - New Members (in selected period)
  - Active Leaders (those with attendance in period)
  - Inactive Members (no activity in period)

- **Charts:**
  - Member Growth Timeline (line chart: shows cumulative by month)
  - Members by Role (bar chart: all-time or filtered)

- **Member List:**
  - Shows all members
  - Highlights those active in selected period

**SQL Query Update:**
```sql
SELECT m.* FROM members m
LEFT JOIN (
  SELECT DISTINCT member_id FROM service_attendance
  WHERE service_date BETWEEN @startDate AND @endDate
) sa ON m.id = sa.member_id
WHERE m.role = @selectedRole (if selected)
AND m.status = @selectedStatus (if selected)
```

---

### VISITATION DASHBOARD

**Available Filters:**
- This Year / This Month / Last 30 Days / This Quarter
- Year / Month / Quarter / Custom Date Range
- **PLUS:** Status filter (Visited, Pending, Follow-up needed)

**What Changes:**
- **KPI Metrics:**
  - First Timers Needing Visit (pending in period)
  - Visits Completed (in selected period)
  - Visitation Rate % (in selected period)
  - Pending Follow-ups (in selected period)

- **Priority Queue:**
  - Only shows first-timers from selected period
  - Sorted by "days since attendance" (most urgent first)

- **Visitation Calendar:**
  - Shows only visits from selected period

- **Visitation Log Table:**
  - Only shows visits within selected dates

**SQL Query Update:**
```sql
SELECT * FROM visitations 
WHERE visit_date BETWEEN @startDate AND @endDate
AND status = @selectedStatus (if selected)
ORDER BY visit_date DESC
```

---

## ⚡ FILTER BEHAVIOR & RULES

### Default State
- **On page load:** "This Month" is pre-selected
- **Metrics show:** Current month data (Dec 1 - Dec 31, 2025)
- **Buttons:** No active selection visible (all gray)
- **Selected text:** Shows "This Month (Dec 1 - Dec 31, 2025)"

### Selection Logic
- **Only ONE time period can be active at a time**
- Clicking a new period deselects the previous one
- **Exception:** Custom Date Range can override quick filters
- **Year/Month/Quarter selectors:** Update the displayed date range

### Persistence
- **Store in URL:** `?period=thisYear` or `?period=custom&from=2024-01-01&to=2024-12-31`
- **Browser back/forward:** Returns to previously selected filter
- **Page reload:** Maintains selected filter

### Mobile Behavior
- Filters hidden by default (collapse state)
- Click "Filters" button to expand
- Apply button required to update data
- Collapsed state shows "[Applied: 1]" badge

---

## 🎯 IMPLEMENTATION CHECKLIST

**Frontend:**
- [ ] Filter bar component created
- [ ] Quick filter buttons (This Year, This Month, Last 30, This Quarter)
- [ ] Year dropdown with all available years
- [ ] Month dropdown with all months going back
- [ ] Quarter dropdown with all quarters
- [ ] Custom date range picker modal
- [ ] Clear filters button
- [ ] Active state styling (teal highlight)
- [ ] Mobile responsive layout (collapsible on <768px)
- [ ] URL parameter handling (persistence)

**Backend/Data:**
- [ ] Update all dashboard queries to accept @startDate, @endDate
- [ ] Create helper function to convert filter selection to date range
- [ ] Implement caching for common periods (This Year, etc.)
- [ ] Ensure queries perform well with date range filters
- [ ] Add indexes on date columns (date_contacted, service_date, meeting_date, visit_date)

**Styling:**
- [ ] Button hover states
- [ ] Active button highlighting (teal)
- [ ] Filter bar sticky positioning
- [ ] Dropdown animations
- [ ] Modal styling
- [ ] Dark mode colors applied

**Testing:**
- [ ] Test each filter option
- [ ] Test date range picker
- [ ] Test mobile collapse/expand
- [ ] Test URL persistence
- [ ] Test data accuracy (verify counts are correct)
- [ ] Test performance (large date ranges don't slow dashboard)

---

## 📐 TECHNICAL IMPLEMENTATION DETAILS

### Date Range Calculation (JavaScript)

```javascript
// Function to calculate date range based on filter
function getDateRange(filterType, yearOverride, monthOverride, customRange) {
  const today = new Date();
  let startDate, endDate;
  
  if (customRange) {
    // Custom date range provided
    startDate = new Date(customRange.from);
    endDate = new Date(customRange.to);
  } else if (filterType === 'thisYear') {
    startDate = new Date(today.getFullYear(), 0, 1);
    endDate = new Date(today.getFullYear(), 11, 31);
  } else if (filterType === 'thisMonth') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (filterType === 'last30Days') {
    endDate = today;
    startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (filterType === 'thisQuarter') {
    const quarter = Math.floor(today.getMonth() / 3);
    startDate = new Date(today.getFullYear(), quarter * 3, 1);
    endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
  }
  
  // Handle year/month overrides
  if (yearOverride) {
    startDate.setFullYear(yearOverride);
    endDate.setFullYear(yearOverride);
  }
  if (monthOverride) {
    startDate.setMonth(monthOverride);
    endDate.setMonth(monthOverride);
    endDate = new Date(endDate.getFullYear(), monthOverride + 1, 0);
  }
  
  return { startDate, endDate };
}
```

### Svelte Store for Filter State

```javascript
// stores.js
import { writable } from 'svelte/store';

export const filterStore = writable({
  period: 'thisMonth', // thisYear, thisMonth, last30Days, thisQuarter, custom
  yearOverride: null,
  monthOverride: null,
  quarterOverride: null,
  customRange: null, // { from: '2024-01-01', to: '2024-12-31' }
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
});

// Helper to update filter
export function updateFilter(newFilter) {
  const { startDate, endDate } = getDateRange(
    newFilter.period,
    newFilter.yearOverride,
    newFilter.monthOverride,
    newFilter.customRange
  );
  
  filterStore.set({
    ...newFilter,
    startDate,
    endDate,
  });
  
  // Update URL
  updateURLParams(newFilter);
}
```

### Supabase Query with Filter

```javascript
// API call with date range
async function getEvangelismData(startDate, endDate) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .gte('date_contacted', startDate.toISOString())
    .lte('date_contacted', endDate.toISOString())
    .order('date_contacted', { ascending: false });
    
  return data;
}
```

---

## 📈 EXAMPLE: Filter in Action

**Scenario:** User wants to see prayer activity for Q3 2024

1. User clicks "Quarter" dropdown
2. Selects "Q3 2024"
3. System calculates: July 1, 2024 → September 30, 2024
4. URL updates: `?period=quarter&quarter=Q3&year=2024`
5. Dashboard updates:
   - **KPI:** Total Prayer Hours (Q3 2024) = 156 hours
   - **Chart:** Prayer hours shows July → August → September only
   - **Heatmap:** Shows leader participation only for Q3 meetings
   - **Table:** Shows only meetings from July 1 - Sept 30

6. User can then click "Month" to drill down to August 2024:
   - Month dropdown selected to "August 2024"
   - Date range updates to Aug 1-31, 2024
   - All metrics recalculate for August only
   - **KPI:** Prayer Hours (August 2024) = 52 hours

**Default Load:** Dashboard initially loads with "This Month" filter active

---

## 🎨 VISUAL EXAMPLES

### Filter Bar with All Options

```
Quick Filters:
[This Year] [This Month]* [Last 30 Days] [This Quarter]

Advanced Filters:
[Year: 2025 ▼] [Month: December ▼] [Quarter: Q4 ▼] [Custom Range]

Selected Period: This Month (December 1 - December 31, 2025) [Clear All]
```
*Active button shown in teal

### After User Selects "Q3 2024"

```
Quick Filters:
[This Year] [This Month] [Last 30 Days] [This Quarter]

Advanced Filters:
[Year: 2024 ▼] [Month: n/a] [Quarter: Q3 ▼]*

Selected Period: Q3 2024 (July 1 - September 30, 2024) [Clear]
```
*Active/highlighted in teal

**Note:** Default state shows "This Month" as active instead of "This Year"

---

## ✅ QUALITY ASSURANCE

**Test Cases:**

1. **This Year Filter**
   - [ ] Shows data from Jan 1 - Dec 31 of current year
   - [ ] Metrics update correctly
   - [ ] Charts redraw properly

2. **This Month Filter**
   - [ ] Shows data from 1st - last day of current month
   - [ ] Updates daily as month progresses
   - [ ] Default filter on page load

3. **Last 30 Days Filter**
   - [ ] Calculates back 30 days from today
   - [ ] Updates daily

4. **Quarter Filters**
   - [ ] Q1 = Jan 1 - Mar 31
   - [ ] Q2 = Apr 1 - Jun 30
   - [ ] Q3 = Jul 1 - Sep 30
   - [ ] Q4 = Oct 1 - Dec 31

5. **Year Selector**
   - [ ] Shows all available years
   - [ ] Can select 2025, 2024, 2023, etc.
   - [ ] Defaults to current year

6. **Month Selector**
   - [ ] Shows all months going back
   - [ ] Auto-updates year when selecting past month
   - [ ] Correctly sets date range

7. **Custom Date Range**
   - [ ] Opens modal picker
   - [ ] Can select any start/end date
   - [ ] Validates end date > start date
   - [ ] Shows selected range in button

8. **Clear Filters**
   - [ ] Resets to default (This Month)
   - [ ] All buttons deselected
   - [ ] Data refreshes

9. **Mobile Behavior**
   - [ ] Filters collapse on <768px
   - [ ] Click Filters button expands panel
   - [ ] Apply button required
   - [ ] Cancel closes without applying

10. **URL Persistence**
    - [ ] Filter reflected in URL
    - [ ] Back button returns to previous filter
    - [ ] Page reload maintains filter

---

## 📞 IMPORTANT NOTES FOR DEVELOPERS

1. **Date Format:** Store all dates in UTC ISO format (e.g., "2024-12-31T23:59:59Z")
2. **Timezone:** Assume user's local timezone for display
3. **Performance:** Add database indexes on all date columns
4. **Caching:** Cache "This Year" and "This Month" queries for speed
5. **Validation:** Ensure end date is always after start date
6. **Accessibility:** All filters must be keyboard navigable

---

**This specification is comprehensive and ready to implement across all 5 dashboards.**

**Version:** 1.0  
**Date:** December 9, 2025  
**Status:** Complete
