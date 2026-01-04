# CHURCH DASHBOARD - FILTERING SYSTEM SPECIFICATION
## Time-Based & Period Filtering Documentation

**Last Updated:** December 9, 2025  
**Purpose:** Comprehensive filtering specifications for all dashboards  
**Scope:** Time filters, period selectors, date ranges, quarter selection

---

## 1. FILTERING ARCHITECTURE OVERVIEW

### Where Filters Apply (Priority Order)

#### 🎯 High Priority - MUST Have Filters
1. **Dashboard Home Page** - All KPI metrics
2. **Evangelism Contacts** - All tracking views
3. **Services & Meetings Page** - All meeting types
4. **Members Directory** - Growth & activity tracking
5. **Visitation Tracking** - All visit records
6. **Reports & Analytics** - All data visualizations

#### Core Filter Types (By Page)
```
All Pages:
├─ Time Range Filter (This Year, This Month, Last 30 Days, This Quarter)
├─ Period Selector (Year, Quarter, Month, Week)
└─ Date Range Picker (From/To dates)

Evangelism Only:
├─ Category Filter
├─ Decision Status (Salvation Decision, Membership Join, Pending)
└─ Invitation Source

Services Only:
├─ Service Type (Sunday, Prayer, etc.)
├─ Location Filter
└─ Leader Filter

Members Only:
├─ Role Filter (Basonta, Bacenta, None)
├─ Status Filter (Regular, Irregular, Dormant)
└─ Baptism Status
```

---

## 1.1 FILTER LOAD ORDER (Priority Hierarchy)

**CRITICAL:** When loading filter state, follow this priority order:

```
FILTER LOAD ORDER:
┌─────────────────────────────────────────────────────────────┐
│ 1. URL Parameters (HIGHEST PRIORITY)                        │
│    - If URL contains filter params, use them                │
│    - Example: ?period=Q1-2025&status=member                 │
│    - Enables shareable filtered views                       │
├─────────────────────────────────────────────────────────────┤
│ 2. LocalStorage (SECOND PRIORITY)                           │
│    - If no URL params, check localStorage                   │
│    - Remembers user's last filter selection                 │
│    - Per-page memory (each page has own stored filters)     │
├─────────────────────────────────────────────────────────────┤
│ 3. Default Values (FALLBACK - LOWEST PRIORITY)              │
│    - If no URL params AND no localStorage                   │
│    - Use page-specific defaults (see Section 17)            │
│    - Example: Dashboard defaults to "This Month"            │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Logic
```javascript
function loadFilters(pageId) {
  // 1. Check URL parameters first (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('period') || urlParams.has('timeFilter')) {
    return parseUrlFilters(urlParams);
  }
  
  // 2. Check localStorage second
  const storedFilters = localStorage.getItem(`${pageId}_filters`);
  if (storedFilters) {
    return JSON.parse(storedFilters);
  }
  
  // 3. Return defaults (lowest priority)
  return getDefaultFilters(pageId);
}
```

### When to Update Each Storage
```
URL Parameters:
├─ Update when user clicks "Share" button
├─ Update when filter changes (optional, for bookmarkable views)
└─ Clear when user clicks "Reset Filters"

LocalStorage:
├─ Update on every filter change
├─ Clear when user clicks "Reset Filters"
└─ Expires: Never (persists until cleared)

Defaults:
├─ Never modified
├─ Defined per-page in configuration
└─ Used only when no other source available
```

---

## 2. TIME FILTER SPECIFICATIONS

### Filter Type 1: Quick Time Filters

**Location:** Top of dashboard/page, left-aligned  
**Type:** Button group (selectable buttons)

#### Button Options
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ This Year    │ This Month   │ Last 30 Days │ This Quarter │
└──────────────┴──────────────┴──────────────┴──────────────┘

Visual Design:
- Inactive: Ghost button (transparent background, text color)
- Active: Primary button (#06b6d4 background, white text)
- Hover: Background shifts (#262626)
- Padding: 8px 16px
- Border Radius: 6px
- Transition: 150ms
- Font: 0.875rem (14px), medium weight

Selected State:
- Background: #06b6d4 (cyan)
- Text: #ffffff (white)
- Left border: 3px solid #06b6d4 (optional accent)

Spacing:
- Between buttons: 8px (sm)
- Group padding: 16px bottom (from toolbar)
```

#### Button Behaviors
1. **"This Year"** - Current calendar year (Jan 1 - Dec 31)
2. **"This Month"** - Current calendar month (Jan 1 - Jan 31)
3. **"Last 30 Days"** - Rolling 30 days from today
4. **"This Quarter"** - Current calendar quarter (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)

#### Mobile Responsiveness
```
Desktop (1024px+): All buttons visible, horizontal
Tablet (640px-1024px): Stack if needed, or use 2 columns
Mobile (<640px): Stack vertically, full width buttons
```

---

### Filter Type 2: Period Selector Dropdown

**Location:** Right of quick filters, OR in compact view  
**Type:** Select dropdown with preset options

#### Dropdown Options
```
┌─────────────────────────────────────┐
│ Select Period...                 ▼  │
├─────────────────────────────────────┤
│ This Month                          │ ← Selected
├─────────────────────────────────────┤
│ Last Month                          │
│ Last 3 Months                       │
│ Last 6 Months                       │
│ Last 12 Months                      │
│ ─────────────────────────────────   │ ← Divider
│ Q1 (Jan-Mar)                        │
│ Q2 (Apr-Jun)                        │
│ Q3 (Jul-Sep)                        │
│ Q4 (Oct-Dec)                        │
│ ─────────────────────────────────   │ ← Divider
│ 2025 Full Year                      │
│ 2024 Full Year                      │
│ 2023 Full Year                      │
│ ─────────────────────────────────   │ ← Divider
│ Custom Date Range...                │
└─────────────────────────────────────┘

Height: 40px (closed)
Width: 220px (flexible)
Font: 0.875rem (14px)
Padding: 8px 12px
Border: 1px solid #2a2a2a
Border Radius: 6px
Background: #1a1a1a (closed), #1e1e1e (open)

Hover (closed): Border #3a3a3a
Focus: Border #06b6d4, glow shadow
Open: Dropdown list appears below

Dropdown List:
├─ Max Height: 400px (scrollable if longer)
├─ Item Height: 36px
├─ Item Padding: 8px 12px
├─ Item Hover: Background #262626
├─ Selected Item: Background #06b6d4, text white
└─ Dividers: 1px solid #2a2a2a, 4px margin vertical
```

#### Dropdown Options Detail

**Relative Time Options:**
```
This Month      → Jan 1 - Jan 31 (current month)
Last Month      → Previous full calendar month
Last 3 Months   → Previous 90 days (rolling)
Last 6 Months   → Previous 180 days (rolling)
Last 12 Months  → Previous 365 days (rolling)
```

**Quarter Options (Current Year):**
```
Q1 2025         → Jan 1 - Mar 31, 2025
Q2 2025         → Apr 1 - Jun 30, 2025
Q3 2025         → Jul 1 - Sep 30, 2025
Q4 2025         → Oct 1 - Dec 31, 2025
```

**Year Options:**
```
2025 Full Year  → Jan 1, 2025 - Dec 31, 2025
2024 Full Year  → Jan 1, 2024 - Dec 31, 2024
2023 Full Year  → Jan 1, 2023 - Dec 31, 2023
2022 Full Year  → Jan 1, 2022 - Dec 31, 2022
```

**Custom Option:**
```
Custom Date Range → Opens modal with date picker
                    (see Section 3)
```

---

### Filter Type 3: Month & Year Picker

**Location:** Compact dropdown (alternative to period dropdown)  
**Type:** Dual dropdown (Month selector + Year selector)

#### Layout
```
┌──────────────────┬──────────────────┐
│ Select Month  ▼  │ Select Year  ▼   │
└──────────────────┴──────────────────┘

Left Column (Month):
├─ January
├─ February
├─ March
├─ April
├─ May
├─ June
├─ July
├─ August
├─ September
├─ October
├─ November
└─ December

Right Column (Year):
├─ 2025
├─ 2024
├─ 2023
├─ 2022
└─ 2021

Each dropdown:
├─ Width: 160px (half of 320px container)
├─ Height: 40px
├─ Margin between: 8px
├─ Font: 0.875rem (14px)
└─ Styling: Same as Period Selector
```

#### Behavior
- Selecting Month + Year filters to that specific month
- Example: "March" + "2024" = March 1 - March 31, 2024
- Both must be selected for filter to apply

---

## 3. ADVANCED FILTERING - CUSTOM DATE RANGE

### Modal Structure

**Trigger:** "Custom Date Range..." in dropdown or period selector

#### Modal Content
```
┌─────────────────────────────────────────────┐
│ [Close] Select Custom Date Range             │
├─────────────────────────────────────────────┤
│                                             │
│ From Date:    [Date Picker] 📅             │
│               Dec 1, 2024                   │
│                                             │
│ To Date:      [Date Picker] 📅             │
│               Dec 9, 2025                   │
│                                             │
│ ─────────────────────────────────────────── │
│                                             │
│ Quick Select Buttons:                       │
│ [Last 30 Days] [Last 90 Days] [Last Year]  │
│                                             │
│ ─────────────────────────────────────────── │
│                                             │
│ [Cancel]                        [Apply]     │
│                                             │
└─────────────────────────────────────────────┘

Modal Size:
├─ Max Width: 500px
├─ Padding: 24px
├─ Border Radius: 8px
└─ Max Height: 90vh (scrollable if needed)

Date Picker Styling:
├─ Calendar Input Height: 40px
├─ Calendar Width: 300px
├─ Selected Date: Highlighted in #06b6d4
├─ Today: Border around today's date
├─ Disabled Dates: Grayed out (future dates)
└─ Month/Year Navigation: Chevron buttons
```

#### Date Picker Behavior
```
- Click "From Date" field: Opens calendar
- Select start date on calendar
- Calendar closes automatically
- Click "To Date" field: Opens calendar for end date
- Cannot select "To Date" before "From Date"
- "From Date" defaults to 90 days ago
- "To Date" defaults to today
```

#### Quick Select Buttons (Inside Modal)
```
[Last 30 Days]  → Today - 30 days
[Last 90 Days]  → Today - 90 days
[Last Year]     → Today - 365 days
[YTD]           → Jan 1 of current year - Today
[Last Quarter]  → First day of previous quarter - Last day of previous quarter
```

---

## 4. FILTER PLACEMENT BY PAGE

### Page 1: Dashboard Home

```
┌──────────────────────────────────────────────────────┐
│ Dashboard                                             │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Filter Bar:                                          │
│ [This Year] [This Month] [Last 30 Days] [This Quarter]│
│ Period: [Select Period... ▼]                        │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Metric Cards (Update based on selected filter):      │
│ ┌────────────┬────────────┬────────────┬───────────┐ │
│ │ Contacts   │ Salvation  │ Attendance │ Visits    │ │
│ │ 34         │ Decisions  │ 156        │ 45        │ │
│ │ ↑ 15%      │ 8 ↑ 22%    │ ↑ 8%       │ ↓ 3%      │ │
│ └────────────┴────────────┴────────────┴───────────┘ │
│                                                      │
│ Charts (Update based on selected filter):            │
│ [Line Chart: Contacts Over Time]                    │
│ [Bar Chart: Conversions by Week]                    │
│                                                      │
└──────────────────────────────────────────────────────┘

Filter Position:
├─ Location: Below page title
├─ Sticky: Yes (stays visible when scrolling)
├─ Background: #1e1e1e (card color)
├─ Border: 1px solid #2a2a2a (bottom)
├─ Padding: 16px
└─ Shadow: Subtle

Content Updates:
- All cards update immediately when filter changes
- Charts animate smoothly to new data (200-400ms)
- Counts recalculate
- Trends update
- No page reload needed
```

### Page 2: Evangelism Contacts

```
┌──────────────────────────────────────────────────────┐
│ Evangelism Contacts                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Time Filters:                                        │
│ [This Year] [This Month] [Last 30 Days] [This Quarter]│
│                                                      │
│ Data Filters (in same row, right side):             │
│ Category: [All Categories ▼] | Status: [All ▼]     │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Search Bar (above table):                            │
│ 🔍 [Search name or phone...] | Sort: [Date ▼]      │
│                                                      │
│ Table (updates based on filters):                    │
│ │ Name | Phone | Category | Date | Status | ...     │
│ │ John │ 555.. │ Response │ ...  │ Saved  │ ...     │
│ │ Jane │ 555.. │ Has Chur │ ...  │ Pend.. │ ...     │
│                                                      │
└──────────────────────────────────────────────────────┘

Filter Layout:
├─ Row 1: Time filters (left), Period dropdown (right)
├─ Row 2: Data filters (Category, Status, etc.)
├─ Row 3: Search bar with sort
└─ Spacing: 12px between rows

Data Filters Positioning:
├─ Category Filter: Left
├─ Status Filter: Center
├─ Additional Filters: Right
└─ Reset Filters: Far right ghost button
```

### Page 3: Services & Meetings

```
┌──────────────────────────────────────────────────────┐
│ Services & Meetings                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Time Filters:                                        │
│ [This Year] [This Month] [Last 30 Days] [This Quarter]│
│                                                      │
│ Service Type Tabs (or filter dropdown):             │
│ [Sunday Services] [Bacenta] [Flow Prayer] [...]     │
│                                                      │
│ Additional Filters:                                  │
│ Location: [All Locations ▼] | Leader: [All ▼]      │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Service List/Cards (updates with filters):           │
│ [Service cards showing attendance, converts, etc.]  │
│                                                      │
└──────────────────────────────────────────────────────┘

Tab/Service Type Toggle:
├─ Style: Underline tabs (active = cyan underline)
├─ Each tab filters to that service type
├─ Combined with time filters
└─ Can also show "All Services" tab
```

### Page 4: Members Directory

```
┌──────────────────────────────────────────────────────┐
│ Members Directory                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Time Filters (for growth tracking):                  │
│ [This Year] [This Month] [Last 30 Days] [This Quarter]│
│                                                      │
│ Member Filters:                                      │
│ Role: [All Roles ▼] | Status: [All Status ▼]       │
│ Baptized: [All ▼] | Joined: [All Years ▼]          │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Search & Sort:                                       │
│ 🔍 [Search members...] | Sort: [Name ▼]             │
│                                                      │
│ Member List/Cards (updates):                         │
│ [Member cards with profile, role, status]           │
│                                                      │
└──────────────────────────────────────────────────────┘

Member-Specific Filters:
├─ "Joined" dropdown for filtering by year/quarter
├─ Shows members who joined in that period
├─ Combined with Time filters for activity tracking
└─ Example: "Show members joined in Q2 2024, regular attendance"
```

### Page 5: Visitation Tracking

```
┌──────────────────────────────────────────────────────┐
│ Visitation Tracking                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Time Filters:                                        │
│ [This Year] [This Month] [Last 30 Days] [This Quarter]│
│                                                      │
│ Visit Filters:                                       │
│ Visitor Type: [All ▼] | Outcome: [All ▼]           │
│ Visited By: [All ▼]                                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Visit Records Table/Cards:                           │
│ [Visitor | Date | Type | Outcome | Follow-up]       │
│                                                      │
└──────────────────────────────────────────────────────┘

Visit-Specific Filters:
├─ Outcome: (Positive, Needs Follow-up, Lost Contact)
├─ Visited By: (Specific member/basonta worker)
└─ Type: (First-time visitor, Returning, etc.)
```

### Page 6: Reports & Analytics

```
┌──────────────────────────────────────────────────────┐
│ Reports & Analytics                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Primary Filter:                                      │
│ Period: [Q1 2025 ▼]                                 │
│ Date Range: [Jan 1 - Mar 31, 2025]                  │
│                                                      │
│ Compare Option:                                      │
│ ☑ Compare to: [Q1 2024 ▼] (shows side-by-side)     │
│                                                      │
│ Report Filters:                                      │
│ Category: [All ▼] | Type: [All ▼]                   │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Report Output:                                       │
│ [Charts, tables, statistics for selected period]    │
│                                                      │
│ Export Options:                                      │
│ [PDF] [Excel] [Print]                               │
│                                                      │
└──────────────────────────────────────────────────────┘

Reports Features:
├─ Compare Periods: View metrics side-by-side
├─ Year-over-Year: 2025 vs 2024 comparison
├─ Trend Analysis: Show growth over quarters
└─ Custom Date Range: Any start/end date
```

---

## 5. FILTER STATE & PERSISTENCE

### Saving Filter Preferences

**Goal:** Remember user's preferred filters between sessions

```
Persistence Options:
1. URL Parameters (Recommended)
   - Filter values in URL query string
   - Shareable: User can share filtered view
   - Example: /dashboard?period=Q1-2025&year=2025

2. Local Storage
   - Store last used filter in browser
   - Auto-apply on page reload
   - Per-page memory (contacts page remembers its filters)

3. Database (Optional, if user-specific)
   - Save preferences to backend
   - Sync across devices
   - Requires authentication
```

### URL Parameter Examples
```
Dashboard:
/dashboard?timeFilter=thisMonth&period=2025-01

Evangelism:
/evangelism?timeFilter=custom&from=2024-12-01&to=2025-01-31&category=responsive

Services:
/services?serviceType=sunday&period=Q1-2025

Members:
/members?joinedYear=2024&role=bacenta

Reports:
/reports?period=Q2-2025&compare=Q2-2024
```

### Local Storage Keys
```
javascript
{
  "dashboard_filters": {
    "timeFilter": "thisMonth",
    "period": "2025-01",
    "lastUpdated": "2025-01-09T04:14:00Z"
  },
  
  "evangelism_filters": {
    "timeFilter": "custom",
    "fromDate": "2024-12-01",
    "toDate": "2025-01-31",
    "category": "responsive",
    "status": "all"
  }
}
```

---

## 6. FILTER INTERACTION BEHAVIORS

### When Filter Changes

#### Immediate Actions
1. **Button/Dropdown Updates** (Instant)
   - Visual indication of selected filter
   - Button/dropdown highlights in cyan (#06b6d4)

2. **Query Executes** (0-2 seconds)
   - Database query with new date range
   - Results fetch with loading state
   - Skeleton screens show while loading

3. **UI Updates** (200-400ms animation)
   - Cards transition to new values
   - Charts animate to new data
   - Tables update rows
   - Trends recalculate

4. **URL Updates** (Instant, if enabled)
   - Browser history updates
   - Shareable link created
   - Browser back/forward works

#### Loading States
```
While Fetching Data:
- Cards: Show skeleton placeholder (gray bars)
- Charts: Show loading spinner
- Tables: Fade out slightly, show spinner
- Text: "Loading..." appears briefly
- Duration: 0-2 seconds (usually quick)

After Load Complete:
- All elements fade in with smooth transition
- Values updated
- Animations play (numbers count up if needed)
```

### Filter Reset

**Button:** "Reset Filters" or "Clear All"
```
Location: Right side of filter bar
Style: Ghost button (cyan text, transparent)
Action: 
├─ Clears all selections
├─ Reverts to default filters
├─ Default = This Month
└─ Refreshes data

Visual Feedback:
├─ Button highlight flashes briefly
├─ All filter controls reset to default
├─ Data reloads with default filters
```

---

## 7. FILTER COMBINATIONS & INTERACTIONS

### Valid Filter Combinations

```
Evangelism Dashboard:
✅ Time Filter + Category Filter
✅ Time Filter + Status Filter
✅ Time Filter + Category + Status
✅ Time Filter + Invited By Filter
✅ Custom Date Range + Any Data Filter

Services Dashboard:
✅ Time Filter + Service Type
✅ Time Filter + Location
✅ Time Filter + Leader
✅ Time Filter + Service Type + Location

Members Dashboard:
✅ Time Filter (join date) + Role
✅ Time Filter + Status
✅ Time Filter + Baptism Status
✅ No time filter + Role (all-time role filtering)

Reports:
✅ Period Selector (required)
✅ Period + Compare Period
✅ Quarter + Year
✅ Month + Year
✅ Custom Date Range
```

### Filter Conflicts & Resolution

```
Conflict: Multiple time filters selected
├─ Rule: Most recent selection wins
├─ Example: If "This Month" then "This Quarter" selected
│          → Uses This Quarter date range
└─ Visual: Other buttons deselect automatically

Conflict: "This Year" but also "January" selected
├─ Resolution: "This Year" overrides month selection
└─ User sees warning: "Year filter overrides month selection"

Conflict: Date range where From > To
├─ Prevention: "To Date" disabled if before "From Date"
├─ User cannot select invalid range
└─ Error message: "End date must be after start date"
```

---

## 8. MOBILE FILTER EXPERIENCE

### Small Screen Adaptation (<640px)

#### Layout Changes
```
Desktop (Filter bar in place):
[This Year] [This Month] [Last 30 Days] [This Quarter]
Period: [Dropdown] Category: [Dropdown] Status: [Dropdown]

Mobile (Filters in modal/drawer):
┌─────────────────────┐
│ 🔽 Filters (1)      │ ← Collapsed, shows count of active
└─────────────────────┘

Tap to expand:
┌─────────────────────┐
│ ✕ Filters           │
├─────────────────────┤
│ Time Period:        │
│ [This Month ▼]      │
│                     │
│ Category:           │
│ [All Categories ▼]  │
│                     │
│ Status:             │
│ [All Status ▼]      │
│                     │
│ [Reset] [Apply]     │
└─────────────────────┘

Features:
├─ Filter icon with badge showing active count
├─ Tap to open filter modal
├─ Large touch targets (44px minimum)
├─ Dropdown lists scroll if long
├─ "Apply" button commits selection
└─ Closes automatically or with ✕ button
```

#### Mobile Filter Modal Styling
```
Size: Full width, bottom sheet
├─ Max Height: 80vh (scrollable)
├─ Padding: 16px
├─ Border Radius: 8px (top corners)
├─ Padding Bottom: 24px (room for buttons)
└─ Close: Swipe down or ✕ button

Controls:
├─ Field Padding: 12px between fields
├─ Font: Larger (16px) for easy tapping
├─ Label: 0.875rem (14px)
├─ Dropdown Height: 48px (larger for touch)
└─ Button Height: 48px minimum

Button Layout:
└─ Stack vertically:
   ├─ [Apply Filters] (primary, full width)
   ├─ [Reset Filters] (secondary, full width)
   └─ [Cancel] (ghost, full width)
```

---

## 9. FILTER PERSISTENCE & SHARING

### Share Filtered Views

**Feature:** Users can share filtered views with team

```
Share Button:
Location: Right of reset filters button
Style: Ghost button with share icon
Action: Copies filtered URL to clipboard

Example Shareable URLs:
- Dashboard view for Q4 2024:
  /dashboard?period=Q4-2024

- Evangelism contacts, responsive category, this month:
  /evangelism?timeFilter=thisMonth&category=responsive

- Services for Sunday services in January 2025:
  /services?serviceType=sunday&period=2025-01

Recipient Experience:
├─ Click shared link
├─ Page loads with filters pre-applied
├─ Same view as sender's dashboard
└─ Can modify filters further
```

### Default Filter States

```
Dashboard Page:
├─ Default: This Month
├─ Alternative: This Year
├─ Favorite: Last selected filter

Evangelism Contacts:
├─ Default: This Month
├─ Category: All
├─ Status: All

Services & Meetings:
├─ Default: This Month
├─ Service Type: All Services
├─ Sticky: Remember selected service type

Members Directory:
├─ Default: No time filter (all-time)
├─ Role: All Roles
├─ Status: All Status
├─ Joined: All Years

Visitation Tracking:
├─ Default: This Month
├─ Visitor Type: All
├─ Outcome: All

Reports & Analytics:
├─ Default: Current Quarter
├─ Compare: Previous Quarter (optional)
├─ Sticky: Remember custom date ranges used
```

---

## 10. DATABASE QUERY OPTIMIZATION

### Backend Considerations

```javascript
// Pseudocode for filter implementation

function getContactsByFilter(filters) {
  let query = db.contacts;
  
  // Time range filter
  if (filters.timeFilter === 'thisMonth') {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.where('contactDate >= monthStart')
                 .where('contactDate <= now');
  }
  
  if (filters.timeFilter === 'custom') {
    query = query.where('contactDate >= fromDate')
                 .where('contactDate <= toDate');
  }
  
  // Data filters
  if (filters.category !== 'all') {
    query = query.where('category = filterCategory');
  }
  
  if (filters.status !== 'all') {
    query = query.where('status = filterStatus');
  }
  
  // Sort & pagination
  query = query.orderBy('contactDate', 'desc')
               .limit(50);
  
  return query.execute();
}
```

### Index Recommendations
```
Database Indexes (for performance):
├─ contacts.contactDate (filter by date range)
├─ contacts.category (filter by category)
├─ contacts.status (filter by status)
├─ services.serviceDate (filter by date)
├─ services.serviceType (filter by type)
├─ members.joinDate (filter by join period)
├─ members.role (filter by role)
└─ Composite: (date + category + status) for compound filters
```

---

## 11. FILTER EXAMPLES BY USE CASE

### Use Case 1: Monthly Evangelism Report
**Goal:** See how many new contacts we made this month

**Filter Selection:**
1. Time: "This Month" button
2. Category: "All Categories"
3. Status: "All Status"

**Result:**
- All contacts added in current month (Jan 1 - Jan 31)
- Cards show: New contacts count, Salvation Decision rate, Membership Join rate, etc.
- Table shows: All new contacts from this month
- Charts show: Daily progression through month

### Use Case 2: Quarterly Comparison
**Goal:** Compare Q1 2025 to Q1 2024 growth

**Filter Selection:**
1. Period Dropdown: "Q1 2025"
2. On Reports page: Toggle "Compare to Q1 2024"

**Result:**
- Metrics shown side-by-side
- Q1 2025 (Jan 1 - Mar 31, 2025) vs Q1 2024 (Jan 1 - Mar 31, 2024)
- Percentage change highlighted
- Trends visualized together

### Use Case 3: Specific Member's Activity History
**Goal:** See all services John attended and visited

**Filter Selection:**
1. Members: Select "John Smith"
2. Time: "This Year"
3. Activity Type: "Services + Visitation"

**Result:**
- All records for John in 2025
- Services attended
- Visits received
- Conversion status
- Attendance percentage

### Use Case 4: Prayer Service Analysis
**Goal:** Track Flow Prayer Service attendance over the quarter

**Filter Selection:**
1. Services page: Select "Flow Prayer" tab
2. Period: "This Quarter"
3. Location: "Main Venue"

**Result:**
- All Flow Prayer services in current quarter
- Attendance numbers
- Growth trend
- Leader participation
- Chart of weekly attendance

### Use Case 5: New Members This Year
**Goal:** See all members who joined in 2025

**Filter Selection:**
1. Members page
2. Time: "This Year"
3. Joined: "2025"

**Result:**
- 2025 only
- Can further filter by role, baptism status, etc.
- List with profiles
- Growth by month chart

---

## 12. DESIGN TOKENS FOR FILTERS

### CSS Variables for Filter Components

```css
:root {
  /* Filter Button Styling */
  --filter-btn-padding: 8px 16px;
  --filter-btn-height: 40px;
  --filter-btn-border-radius: 6px;
  --filter-btn-font-size: 0.875rem;
  --filter-btn-font-weight: 500;
  --filter-btn-transition: 150ms cubic-bezier(0.16, 1, 0.3, 1);
  
  /* Filter Button States */
  --filter-btn-inactive-bg: transparent;
  --filter-btn-inactive-text: var(--color-text-secondary);
  --filter-btn-inactive-border: 1px solid var(--color-border);
  
  --filter-btn-active-bg: var(--color-primary);
  --filter-btn-active-text: #ffffff;
  --filter-btn-active-border: 1px solid var(--color-primary);
  
  --filter-btn-hover-bg: var(--color-secondary);
  --filter-btn-hover-border: 1px solid var(--color-border-strong);
  
  /* Filter Dropdown */
  --filter-dropdown-width: 220px;
  --filter-dropdown-height: 40px;
  --filter-dropdown-max-height: 400px;
  --filter-dropdown-item-height: 36px;
  --filter-dropdown-item-padding: 8px 12px;
  --filter-dropdown-selected-bg: var(--color-primary);
  --filter-dropdown-selected-text: #ffffff;
  
  /* Filter Bar */
  --filter-bar-padding: 16px;
  --filter-bar-spacing: 12px;
  --filter-bar-background: var(--color-surface);
  --filter-bar-border: 1px solid var(--color-border);
  --filter-bar-sticky: true;
  
  /* Filter Modal (Date Picker) */
  --filter-modal-max-width: 500px;
  --filter-modal-padding: 24px;
  --filter-modal-border-radius: 8px;
}
```

---

## 13. FILTER VALIDATION & ERROR HANDLING

### Input Validation

```
Date Range Validation:
├─ From Date cannot be in the future
├─ To Date cannot be before From Date
├─ Date range max: 4 years (prevents performance issues)
├─ Error Message: "Invalid date range. Please check your selection."

Filter Validation:
├─ At least one valid date must be selected
├─ Category must exist in database
├─ Status must match predefined statuses
└─ Error Message: "Please select valid filters."

Permissions Validation:
├─ User can only see data they have access to
├─ Cannot filter to restricted categories
└─ Error Message: "You don't have access to this data."
```

### User Feedback

```
Success States:
- Filter applied silently if no issues
- Data updates with smooth transition
- Number of results shows: "(34 contacts found)"

Error States:
- Show error banner: "Unable to load data. Please try again."
- Disable apply button
- Show "Retry" button
- Keep previous data visible (don't blank out)

Warnings:
- Large date ranges: "Large date range may load slowly"
- No results: "No data found for this filter. Try adjusting your selection."
```

---

## 14. ACCESSIBILITY FOR FILTERS

### Keyboard Navigation

```
Filter Controls:
├─ Tab key: Navigate between filters
├─ Enter key: Open dropdown/date picker
├─ Arrow keys: Move through dropdown options
├─ Escape: Close dropdown/cancel modal
├─ Space: Select option in dropdown

Focus States:
├─ Visible focus ring (2px #06b6d4)
├─ Outline offset: 2px
├─ High contrast indicator
└─ Always visible

ARIA Labels:
├─ Filter buttons: aria-label="Filter by this month"
├─ Dropdowns: aria-label="Select period"
├─ Date pickers: aria-label="Select start date"
├─ Active state: aria-pressed="true" on active button
└─ Expanded state: aria-expanded="true/false" on dropdowns
```

### Screen Reader Support

```
Announcements:
- "Filter applied: This Month, responsive category"
- "Results updated: 34 contacts found"
- "Calendar opened, January 2025"
- "Date selected: December 1, 2024"

Semantic HTML:
├─ Use <button> for filter buttons
├─ Use <select> or proper ARIA for dropdowns
├─ Use <dialog> for modals
├─ Use <fieldset> + <legend> for filter groups
└─ Label all form inputs
```

---

## 15. IMPLEMENTATION CHECKLIST FOR AI

When building filter functionality, ensure:

- [ ] Quick time filter buttons (This Year, This Month, Last 30 Days, This Quarter)
- [ ] Period selector dropdown with all options
- [ ] Month + Year dual dropdown selector
- [ ] Custom date range modal with calendar picker
- [ ] Loading states while fetching data
- [ ] Filter persistence (URL or localStorage)
- [ ] Reset filters button
- [ ] Share filtered view URL
- [ ] Keyboard navigation (Tab, Enter, Escape, Arrows)
- [ ] ARIA labels and screen reader support
- [ ] Visual feedback on filter selection
- [ ] Mobile-responsive filter UI (modal on small screens)
- [ ] Filter combination validation
- [ ] Data validation (date ranges, permissions)
- [ ] Error handling and user feedback
- [ ] Performance optimization (indexed database queries)
- [ ] Loading animations (skeleton screens, spinners)
- [ ] Smooth data transitions (200-400ms animations)
- [ ] Tooltip help text on hover
- [ ] Mobile touch-friendly targets (44px minimum)

---

## 16. AI PROMPT FOR FILTER IMPLEMENTATION

### Prompt Template

```
I need comprehensive filtering functionality for a church dashboard 
with the following requirements:

TIME FILTERS (On all dashboard pages):
├─ Quick filter buttons: "This Year", "This Month", "Last 30 Days", "This Quarter"
├─ Period dropdown with options:
│  ├─ Relative: This Month, Last Month, Last 3/6/12 Months
│  ├─ Quarters: Q1-Q4 (current and previous years)
│  ├─ Years: 2025, 2024, 2023, 2022
│  └─ Custom: Opens date picker modal
├─ Month + Year dual dropdowns
└─ Custom date range picker modal

FEATURES REQUIRED:
- Filter persistence (localStorage or URL parameters)
- "Reset Filters" button to clear all selections
- "Share" button to create shareable filtered URL
- Loading states while data fetches
- Smooth data transitions (200-400ms animations)
- Keyboard navigation (Tab, Enter, Escape)
- Full accessibility (WCAG AA, ARIA labels)
- Mobile-responsive (modal drawer on small screens)
- Validation for invalid date ranges

PAGE-SPECIFIC FILTERS:
Dashboard: Time filters only
Evangelism: Time + Category + Status filters
Services: Time + Service Type + Location filters
Members: Time (join date) + Role + Status filters
Reports: Period selector + optional comparison period

STYLING:
- Dark mode (#1a1a1a background, #06b6d4 active)
- Active button state: #06b6d4 background, white text
- Inactive: transparent background, secondary text
- Smooth transitions: 150-250ms
- Font: 0.875rem (14px)

Reference: church-dashboard-spec.md Sections 2-5, and the attached
CHURCH DASHBOARD - FILTERING SYSTEM SPECIFICATION document.

Please implement production-ready filter system with full TypeScript types,
error handling, and accessibility support.
```

---

## 17. FILTER DEFAULTS BY PAGE

```
Dashboard:
├─ Default: This Month
├─ Alternative: This Year
├─ Favorite: Last selected filter

Evangelism Contacts:
├─ Default: This Month
├─ Category: All
├─ Status: All

Services & Meetings:
├─ Default: This Month
├─ Service Type: All Services
├─ Sticky: Remember selected service type

Members Directory:
├─ Default: No time filter (all-time)
├─ Role: All Roles
├─ Status: All Status
├─ Joined: All Years

Visitation Tracking:
├─ Default: This Month
├─ Visitor Type: All
├─ Outcome: All

Reports & Analytics:
├─ Default: Current Quarter
├─ Compare: Previous Quarter (optional)
├─ Sticky: Remember custom date ranges used
```

---

## 18. PERFORMANCE OPTIMIZATION NOTES

### Caching Strategy
```
Cache filters for performance:
├─ Cache filtered results for 5 minutes
├─ Invalidate cache when new data added
├─ Show "Refreshing..." if cache was stale
├─ Manual refresh button always available

Lazy Loading:
├─ Load first 50 records
├─ Load more on scroll
├─ Infinite scroll or "Load More" button
├─ Charts load after table loads
```

### Query Optimization
```
Database queries should:
├─ Use indexes on date fields
├─ Limit results (pagination)
├─ Return only needed columns
├─ Use compound indexes for common filters
├─ Cache frequently-used date ranges
└─ Debounce search input (300ms)
```

---

---

## 19. DATA MODEL REFERENCE

### Unified People Table

**IMPORTANT:** All filter queries should use the unified `people` table with `status` column. Do NOT query separate "Members" or "First Timers" tables.

```sql
-- Filter by status using the unified people table
SELECT * FROM people
WHERE status = 'guest'  -- or 'member', 'leader', 'archived'
AND created_at >= '2025-01-01';

-- Status values:
-- 'guest'    = First-time visitors, evangelism contacts
-- 'member'   = Regular church members
-- 'leader'   = Members with leadership roles
-- 'archived' = Inactive/departed (preserves history)
```

### Attendance Queries (Many-to-Many)

```sql
-- Filter attendance using junction table
SELECT p.*, m.meeting_type, ma.attended
FROM people p
JOIN meeting_attendance ma ON p.id = ma.person_id
JOIN meetings m ON ma.meeting_id = m.id
WHERE m.meeting_date >= '2025-01-01'
AND m.meeting_type = 'sunday_service';
```

---

## 20. TERMINOLOGY GLOSSARY

To avoid confusion in filter labels and UI text:

| Term | Definition | Use In Filters |
|------|------------|----------------|
| **Salvation Decision** | A spiritual decision where someone accepts Christ | Filter label: "Salvation Decision: Yes/No/All" |
| **Membership Join** | When a guest officially becomes a church member | Filter label: "Membership Status: Joined/Pending/All" |
| **Status** | Person's current standing in the church | Filter options: Guest, Member, Leader, Archived |
| **Decision Status** | Combined filter for spiritual/membership decisions | Options: "Salvation Decision", "Membership Join", "Pending", "All" |

### Filter Label Examples

**CORRECT:**
- "Salvation Decisions this month: 5"
- "Membership Join rate: 23%"
- "Decision Status: [Salvation Decision ▼]"

**INCORRECT (Avoid):**
- "Conversions this month" (ambiguous)
- "Conversion rate" (unclear which type)
- "Converted: Yes/No" (use specific terms)

---

## 21. SECURITY MODEL REFERENCE

### Single-Tenant Admin Tool

**IMPORTANT:** This is a single-user application. Filter implementations should NOT include:
- Multi-user permission checks
- Role-based filter restrictions
- User-specific data scoping

```javascript
// CORRECT: Simple admin-only queries
async function getFilteredPeople(filters) {
  return await supabase
    .from('people')
    .select('*')
    .gte('created_at', filters.fromDate)
    .lte('created_at', filters.toDate);
}

// INCORRECT: Don't add user-based restrictions
// .eq('created_by', currentUser.id)  // NOT NEEDED
// .in('visible_to', userRoles)       // NOT NEEDED
```

### Data Access
- All data is accessible to the single admin user
- No row-level security based on user roles
- Leaders do NOT have login accounts
- Admin manually logs all data for everyone

---

**Document Status:** Complete Filtering Specification
**Total Sections:** 21 comprehensive sections
**Implementation Ready:** Yes - Includes templates, examples, code snippets
**Last Updated:** December 9, 2025

This document provides everything needed to implement professional,
production-ready filtering across your church dashboard.