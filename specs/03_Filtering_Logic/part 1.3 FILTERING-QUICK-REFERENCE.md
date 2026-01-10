# 🎯 FILTERING SYSTEM - QUICK REFERENCE FOR YOUR NEEDS

**Exactly what you asked for, documented and ready to implement**

---

## ✅ YOUR EXACT REQUIREMENTS MET

You asked for filtering options that include:

### ✓ THIS YEAR
- One-click view of all data from Jan 1 - Dec 31 (current year)
- Shows year number on button label
- Perfect for annual reports

### ✓ THIS MONTH  
- One-click view of all data from 1st - last day of current month
- Shows month/year on button label
- Updates daily as new data comes in

### ✓ SPECIFIC YEAR (e.g., 2024, 2023)
- Dropdown selector with all available years
- Select any past year
- Auto-loads data for entire year (Jan 1 - Dec 31)
- Can be combined with month selector

### ✓ SPECIFIC MONTH & YEAR (e.g., October 2024)
- Dropdown selector showing all months going back
- Select "October 2024"
- Automatically shows data for Oct 1-31, 2024
- Year updates automatically

### ✓ SPECIFIC QUARTER (Q1, Q2, Q3, Q4)
- Dropdown selector for all quarters
- Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
- Select any quarter from any year
- Shows all data for that 3-month period

### ✓ ALL DASHBOARDS SUPPORT THIS
- Evangelism dashboard ✓
- Sunday Services dashboard ✓
- Meetings & Prayer dashboard ✓
- Members directory ✓
- Visitation tracker ✓

---

## 🎨 HOW IT LOOKS

### Filter Bar (Desktop View)
```
Quick Access:
[This Year] [This Month] [Last 30 Days] [This Quarter]

Specific Period Selection:
[Year: 2025 ▼] [Month: December ▼] [Quarter: Q4 ▼] 

Custom:
[Date Range Picker] [Clear All Filters]

Current Selection: This Year (January 1 - December 31, 2025)
```

### Interactive Example
**User clicks "Year: 2024 ▼":**
```
Year dropdown opens:
├─ 2025 (current)
├─ 2024 (select this)
├─ 2023
├─ 2022
└─ 2021

Select 2024 → Dashboard updates to show Jan 1 - Dec 31, 2024
```

**User then clicks "Month: ▼":**
```
Month dropdown opens:
├─ January 2025
├─ February 2025
├─ ... (scrollable)
├─ December 2024
├─ November 2024
├─ October 2024 ← (select this)
├─ September 2024
└─ ... (earlier months)

Select October 2024 → Dashboard updates to show Oct 1-31, 2024
(Year automatically updates to 2024)
```

**User clicks "Quarter: Q3 ▼":**
```
Quarter dropdown opens:
├─ Q4 2025 (Oct-Dec 2025) [current]
├─ Q3 2025 (Jul-Sep 2025)
├─ Q2 2025 (Apr-Jun 2025)
├─ Q1 2025 (Jan-Mar 2025)
├─ Q4 2024
├─ Q3 2024 (Jul-Sep 2024) ← (select this)
├─ Q2 2024
└─ Q1 2024

Select Q3 2024 → Dashboard updates to show Jul 1 - Sep 30, 2024
All metrics recalculate for that quarter
```

---

## 📊 WHAT CHANGES WHEN YOU FILTER

### Before Filter (Default: This Year)
```
EVANGELISM DASHBOARD
Total Contacts: 247
Conversion Rate: 18.2%
Active Leads: 34
Top Inviter: John (12)

Conversion Funnel shows full year
Contact Table shows all contacts from 2025
Charts show Jan through Dec 2025
```

### After Selecting "October 2024"
```
EVANGELISM DASHBOARD
Total Contacts: 18      ← Updated to Oct only
Conversion Rate: 22.2%  ← Updated to Oct only
Active Leads: 6         ← Updated to Oct only
Top Inviter: Mary (3)   ← Updated to Oct only

Conversion Funnel shows only Oct 2024
Contact Table shows only contacts added in Oct 2024
All charts show only Oct 2024 data
```

### After Selecting "Q3 2025" (Jul-Sep)
```
MEETINGS & PRAYER DASHBOARD
Total Prayer Hours: 156 ← For Q3 only
Leader Participation: 78% ← In Q3 meetings
Meeting Records: Shows only Jul, Aug, Sep meetings
Leader Heatmap: Shows only participation in Q3

[Charts, tables, metrics all reflect Q3 2025]
```

---

## 🔧 IMPLEMENTATION DETAILS (For Developer)

### Button Styling Code
```css
/* Inactive filter button */
.filter-button {
  background: #2d3748;
  color: #a0aec0;
  border: 1px solid #4a5568;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 150ms ease-out;
}

.filter-button:hover {
  background: #374151;
  border-color: #4a5568;
}

/* Active filter button (selected) */
.filter-button.active {
  background: #06b6d4;  /* Teal */
  color: #e2e8f0;       /* White */
  border: 1px solid #0891b2;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### Date Range Calculation (JavaScript)
```javascript
// Calculate date range based on selected filter
function getDateRange(filterType, year, month, quarter) {
  const today = new Date();
  let startDate, endDate;
  
  if (filterType === 'thisYear') {
    const currentYear = today.getFullYear();
    startDate = new Date(currentYear, 0, 1);
    endDate = new Date(currentYear, 11, 31);
  }
  
  else if (filterType === 'thisMonth') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }
  
  else if (filterType === 'specificYear' && year) {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31);
  }
  
  else if (filterType === 'specificMonth' && year && month) {
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0);
  }
  
  else if (filterType === 'quarter' && year && quarter) {
    const quarterMap = {
      'Q1': { start: 0, end: 2 },    // Jan-Mar
      'Q2': { start: 3, end: 5 },    // Apr-Jun
      'Q3': { start: 6, end: 8 },    // Jul-Sep
      'Q4': { start: 9, end: 11 }    // Oct-Dec
    };
    const q = quarterMap[quarter];
    startDate = new Date(year, q.start, 1);
    endDate = new Date(year, q.end + 1, 0);
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Example usage:
// getDateRange('specificMonth', 2024, 9) 
// → Returns { startDate: '2024-10-01', endDate: '2024-10-31' }
```

### Svelte Component Example
```svelte
<script>
  import { filterStore } from './stores.js';
  
  let selectedYear = 2025;
  let selectedMonth = null;
  let selectedQuarter = null;
  let dateRange = null;
  
  function applyYearFilter(year) {
    selectedYear = year;
    selectedMonth = null;
    selectedQuarter = null;
    const { startDate, endDate } = getDateRange('specificYear', year);
    filterStore.set({ startDate, endDate, label: `Year ${year}` });
  }
  
  function applyMonthFilter(year, month) {
    selectedYear = year;
    selectedMonth = month;
    selectedQuarter = null;
    const { startDate, endDate } = getDateRange('specificMonth', year, month);
    filterStore.set({ startDate, endDate, label: `${monthName[month]} ${year}` });
  }
  
  function applyQuarterFilter(year, quarter) {
    selectedYear = year;
    selectedQuarter = quarter;
    selectedMonth = null;
    const { startDate, endDate } = getDateRange('quarter', year, quarter);
    filterStore.set({ startDate, endDate, label: `${quarter} ${year}` });
  }
</script>

<div class="filter-bar">
  <!-- Quick Filters -->
  <div class="filter-group">
    <button class="filter-button" on:click={() => applyQuickFilter('thisYear')}>
      This Year
    </button>
    <button class="filter-button" on:click={() => applyQuickFilter('thisMonth')}>
      This Month
    </button>
    <button class="filter-button" on:click={() => applyQuickFilter('last30Days')}>
      Last 30 Days
    </button>
    <button class="filter-button" on:click={() => applyQuickFilter('thisQuarter')}>
      This Quarter
    </button>
  </div>
  
  <!-- Period Selectors -->
  <div class="filter-group">
    <select on:change={(e) => applyYearFilter(parseInt(e.target.value))}>
      <option>Select Year</option>
      <option value="2025">2025</option>
      <option value="2024">2024</option>
      <option value="2023">2023</option>
      <option value="2022">2022</option>
    </select>
    
    <select on:change={(e) => applyMonthFilter(selectedYear, parseInt(e.target.value))}>
      <option>Select Month</option>
      <option value="0">January</option>
      <option value="1">February</option>
      <!-- ... -->
      <option value="11">December</option>
    </select>
    
    <select on:change={(e) => applyQuarterFilter(selectedYear, e.target.value)}>
      <option>Select Quarter</option>
      <option value="Q1">Q1 (Jan-Mar)</option>
      <option value="Q2">Q2 (Apr-Jun)</option>
      <option value="Q3">Q3 (Jul-Sep)</option>
      <option value="Q4">Q4 (Oct-Dec)</option>
    </select>
  </div>
  
  <!-- Display Selected Filter -->
  <div class="selected-filter">
    Selected: {$filterStore.label}
  </div>
</div>

<style>
  .filter-bar {
    background: #1a202c;
    border-bottom: 1px solid #2d3748;
    padding: 16px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .filter-group {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .filter-button {
    /* ... styles from CSS above ... */
  }
</style>
```

### Database Query with Filter
```javascript
// Convex query with date filtering
const contacts = await ctx.db
  .query("contacts")
  .filter((q) => 
    q.and(
      q.gte(q.field("date_contacted"), startDate),
      q.lte(q.field("date_contacted"), endDate)
    )
  )
  .order("desc")
  .collect();
    
// Example: Get October 2024 data
// getEvangelismDataFiltered('2024-10-01', '2024-10-31')
// → Returns only contacts added in October 2024

// Example: Get Q3 2025 data
// getEvangelismDataFiltered('2025-07-01', '2025-09-30')
// → Returns only contacts added in Jul-Aug-Sep 2025
```

---

## 📱 MOBILE IMPLEMENTATION

### On Mobile (<768px)
```
Filter bar collapses:
[📅 Filters] [Applied: 1 ▼]

Click to expand:
┌─────────────────────────┐
│ Quick Periods:          │
│ [This Y] [This M] [Q]   │
│                         │
│ Select Year:            │
│ [2025 ▼]                │
│                         │
│ Select Month:           │
│ [December ▼]            │
│                         │
│ Select Quarter:         │
│ [Q4 ▼]                  │
│                         │
│ Selected: This Year     │
│ Jan 1-Dec 31, 2025      │
│                         │
│ [Apply] [Clear] [Done]  │
└─────────────────────────┘
```

---

## 🎯 IMPLEMENTATION CHECKLIST

**Front-End:**
- [ ] Filter bar component created
- [ ] "This Year" button with click handler
- [ ] "This Month" button with click handler
- [ ] "Last 30 Days" button with click handler
- [ ] "This Quarter" button with click handler
- [ ] Year dropdown with years 2022-2025
- [ ] Month dropdown with all 12 months
- [ ] Quarter dropdown with Q1-Q4
- [ ] Custom date range picker (optional)
- [ ] "Clear Filters" button
- [ ] Active button highlighting (teal)
- [ ] Mobile responsive (collapsible)
- [ ] Sticky positioning (stays visible while scrolling)

**Back-End:**
- [ ] Update all queries to accept `startDate` & `endDate` parameters
- [ ] Test queries with various date ranges
- [ ] Verify metrics calculate correctly
- [ ] Ensure charts render with filtered data
- [ ] Performance test with large date ranges

**Styling:**
- [ ] Buttons styled (active state = teal highlight)
- [ ] Filter bar background matches theme (#1a202c)
- [ ] Dropdowns styled consistently
- [ ] Mobile layout tested
- [ ] Dark mode verified

**Testing:**
- [ ] Click "This Year" → data updates
- [ ] Select year 2024 → data updates to 2024
- [ ] Select October 2024 → data shows Oct 1-31, 2024
- [ ] Select Q3 2025 → data shows Jul-Sep 2025
- [ ] Mobile: collapse/expand works
- [ ] URL parameters persist (page refresh maintains filter)

---

## 🎁 BONUS: Copy-Paste Ready Code

### HTML Structure
```html
<div class="filter-bar">
  <div class="filter-section">
    <div class="filter-label">Quick Filters:</div>
    <button class="filter-btn" data-filter="thisYear">This Year</button>
    <button class="filter-btn" data-filter="thisMonth">This Month</button>
    <button class="filter-btn" data-filter="last30">Last 30 Days</button>
    <button class="filter-btn" data-filter="thisQuarter">This Quarter</button>
  </div>
  
  <div class="filter-section">
    <div class="filter-label">Period Selection:</div>
    <select id="yearSelect" class="filter-dropdown">
      <option value="">Select Year...</option>
      <option value="2025">2025</option>
      <option value="2024">2024</option>
      <option value="2023">2023</option>
    </select>
    
    <select id="monthSelect" class="filter-dropdown">
      <option value="">Select Month...</option>
      <option value="0">January</option>
      <option value="1">February</option>
      <!-- ... 12 months total ... -->
    </select>
    
    <select id="quarterSelect" class="filter-dropdown">
      <option value="">Select Quarter...</option>
      <option value="Q1">Q1 (Jan-Mar)</option>
      <option value="Q2">Q2 (Apr-Jun)</option>
      <option value="Q3">Q3 (Jul-Sep)</option>
      <option value="Q4">Q4 (Oct-Dec)</option>
    </select>
  </div>
  
  <div class="filter-selected">
    <span id="selectedText">This Year (Jan 1 - Dec 31, 2025)</span>
    <button class="clear-btn">Clear</button>
  </div>
</div>
```

---

## ✨ SUMMARY

**You asked for:**
- ✅ This Year filter
- ✅ This Month filter
- ✅ Specific year filtering (2024, 2023)
- ✅ Specific month & year filtering (Oct 2024)
- ✅ Quarter filtering (Q1, Q2, Q3, Q4)
- ✅ On all dashboards

**You now have:**
- ✅ Complete specification document (Time-Based-Filtering-Specs.md)
- ✅ Visual examples & layouts
- ✅ Code snippets (JavaScript, Svelte, SQL)
- ✅ Implementation checklist
- ✅ Mobile design specs
- ✅ Ready to give to developer OR use for AI code generation

---

**Status:** Complete & Ready to Implement  
**Document:** Time-Based-Filtering-Specs.md  
**Created:** December 9, 2025  
**Version:** 1.0
