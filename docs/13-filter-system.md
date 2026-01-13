# 🔍 Filter System

> **Complete guide to how the global date filtering system works.**

---

## Overview

The filter system is a core feature of the application that allows users to view data for specific time periods. When a filter is set, it applies globally across all pages and analytics.

### Key Concepts

- **Global Filter**: One filter applies across all pages
- **Persistence**: Filter survives page navigation
- **URL Sync**: Filter state reflected in URL
- **Storage**: Remembered between sessions

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      filterStore.js                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  State: { type, year, month, quarter, customDates }  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Derived: dateRange { startDate, endDate, label }    │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ PeriodSelect│   │   Charts    │   │   Tables    │
│ (UI Control)│   │ (Data Use)  │   │ (Data Use)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 📦 Filter Store

**Location**: `src/lib/stores/filterStore.js`

### State Structure

```javascript
{
  type: 'thisMonth',      // Filter type identifier
  year: 2025,             // Year for date calculations
  month: 0,               // Month (0-11) for monthly filters
  quarter: null,          // Quarter (Q1-Q4) for quarterly filters
  customStart: null,      // Custom range start (YYYY-MM-DD)
  customEnd: null         // Custom range end (YYYY-MM-DD)
}
```

### Filter Types

| Type | Description | Uses |
|------|-------------|------|
| `thisYear` | Current calendar year | year |
| `thisMonth` | Current calendar month | year, month |
| `thisQuarter` | Current quarter | year, quarter |
| `last30Days` | Rolling 30-day window | (calculated) |
| `lastMonth` | Previous calendar month | (calculated) |
| `last3Months` | Rolling 3-month window | (calculated) |
| `last6Months` | Rolling 6-month window | (calculated) |
| `last12Months` | Rolling 12-month window | (calculated) |
| `specificYear` | User-selected year | year |
| `specificMonth` | User-selected month | year, month |
| `specificQuarter` | User-selected quarter | year, quarter |
| `customRange` | User-defined dates | customStart, customEnd |

---

## 🎛️ Using the Filter

### In Components

#### Reading the Filter

```svelte
<script>
  import { filterStore, dateRange } from '$lib/stores/filterStore';
  
  // Access raw filter configuration
  $: filterType = $filterStore.type;
  $: selectedYear = $filterStore.year;
  
  // Access calculated date range
  $: startDate = $dateRange.startDate;
  $: endDate = $dateRange.endDate;
  $: label = $dateRange.label;
</script>

<p>Showing data for: {$dateRange.label}</p>
<p>From {$dateRange.startDate} to {$dateRange.endDate}</p>
```

#### Setting the Filter

```svelte
<script>
  import { filterStore } from '$lib/stores/filterStore';
</script>

<!-- Quick preset buttons -->
<button on:click={() => filterStore.setThisMonth()}>
  This Month
</button>
<button on:click={() => filterStore.setThisYear()}>
  This Year
</button>
<button on:click={() => filterStore.setLast30Days()}>
  Last 30 Days
</button>

<!-- Specific selections -->
<button on:click={() => filterStore.setYear(2024)}>
  2024
</button>
<button on:click={() => filterStore.setMonth(2024, 5)}>
  June 2024
</button>
<button on:click={() => filterStore.setQuarter(2024, 'Q2')}>
  Q2 2024
</button>

<!-- Custom range -->
<button on:click={() => filterStore.setCustomRange('2024-06-01', '2024-08-31')}>
  Custom Period
</button>
```

### In Data Fetching

```javascript
import { dateRange } from '$lib/stores/filterStore';
import { getByDateRange } from '$lib/services/servicesService';
import { get } from 'svelte/store';

async function loadServices() {
  const range = get(dateRange);
  
  const { data, error } = await getByDateRange(
    range.startDate, 
    range.endDate
  );
  
  if (!error) {
    services = data;
  }
}
```

### Reactively Loading Data

```svelte
<script>
  import { dateRange } from '$lib/stores/filterStore';
  import { getByDateRange } from '$lib/services/servicesService';
  
  let services = [];
  
  // Reload when date range changes
  $: loadServices($dateRange);
  
  async function loadServices(range) {
    const { data } = await getByDateRange(range.startDate, range.endDate);
    services = data || [];
  }
</script>
```

---

## 📅 Date Calculations

### How Date Ranges are Calculated

The `dateRange` derived store uses `getDateRange()` from `dateUtils.js` to convert filter state to actual dates.

#### This Year
```javascript
startDate: 'YYYY-01-01'
endDate: 'YYYY-12-31'
// Where YYYY is the current year
```

#### This Month
```javascript
startDate: 'YYYY-MM-01'
endDate: 'YYYY-MM-[last day]'
// First and last day of current month
```

#### This Quarter
```javascript
// Q1: Jan 1 - Mar 31
// Q2: Apr 1 - Jun 30
// Q3: Jul 1 - Sep 30
// Q4: Oct 1 - Dec 31
```

#### Rolling Periods (Last X)
```javascript
// last30Days
startDate: [30 days ago]
endDate: [today]

// last3Months
startDate: [3 months ago]
endDate: [today]
```

#### Specific Selections
```javascript
// specificYear(2024)
startDate: '2024-01-01'
endDate: '2024-12-31'

// specificMonth(2024, 5) // June
startDate: '2024-06-01'
endDate: '2024-06-30'

// specificQuarter(2024, 'Q2')
startDate: '2024-04-01'
endDate: '2024-06-30'
```

---

## 🔄 Persistence

### URL Synchronization

The filter state syncs to URL parameters for bookmarking and sharing:

```
/services → /services?filterType=thisYear&year=2025
/people → /people?filterType=specificMonth&year=2024&month=6
```

**URL Parameters**:
| Parameter | Description |
|-----------|-------------|
| `filterType` | The filter type |
| `year` | Year value |
| `month` | Month value (0-11) |
| `quarter` | Quarter value (Q1-Q4) |
| `customStart` | Custom range start |
| `customEnd` | Custom range end |

**Sync to URL**:
```javascript
filterStore.syncToURL();
// Updates browser URL with current filter
```

### Local Storage

The filter state is saved to localStorage for returning users:

```javascript
// Save current state
filterStore.saveToStorage();

// Load on app start
filterStore.initialize();
```

**Storage Key**: `filterState`

**Initialization Flow**:
```
1. App loads
2. Check URL for filter params
3. If URL params → use them
4. Else check localStorage
5. If stored state → use it
6. Else use default (thisMonth)
```

---

## 🎨 Filter UI Components

### PeriodSelect.svelte

**Location**: `src/lib/components/filters/PeriodSelect.svelte`

**Purpose**: Main dropdown for selecting time periods.

**Features**:
- Preset options (This Month, This Year, etc.)
- Year picker for specific years
- Month picker for specific months
- Quarter picker for specific quarters
- Custom range option

**Structure**:
```svelte
<div class="period-select">
  <button class="trigger" on:click={toggleOpen}>
    {$dateRange.label} ▼
  </button>
  
  {#if open}
    <div class="dropdown">
      <section class="presets">
        <button on:click={() => filterStore.setThisMonth()}>This Month</button>
        <button on:click={() => filterStore.setThisYear()}>This Year</button>
        <!-- ... more presets -->
      </section>
      
      <section class="specific">
        <YearPicker on:select={handleYearSelect} />
        <MonthPicker on:select={handleMonthSelect} />
        <QuarterPicker on:select={handleQuarterSelect} />
      </section>
      
      <section class="custom">
        <DateRangePicker on:select={handleCustomSelect} />
      </section>
    </div>
  {/if}
</div>
```

### DateRangePicker.svelte

**Location**: `src/lib/components/filters/DateRangePicker.svelte`

**Purpose**: Calendar UI for selecting custom date ranges.

**Features**:
- Dual calendar view (start/end)
- Date range highlighting
- Quick presets (Last 7 days, Last 30 days)
- Manual date input

### FilterBar.svelte

**Location**: `src/lib/components/filters/FilterBar.svelte`

**Purpose**: Container for filter controls, typically placed at the top of pages.

---

## 📊 How Pages Use Filters

### Dashboard

```svelte
<script>
  import { dateRange } from '$lib/stores/filterStore';
  import { calculateKPIs } from '$lib/utils/dataService';
  
  $: kpis = calculateKPIs(allData, {
    startDate: $dateRange.startDate,
    endDate: $dateRange.endDate
  });
</script>

<KPICard title="Attendance" value={kpis.avgAttendance} />
```

### Services Page

```svelte
<script>
  import { dateRange } from '$lib/stores/filterStore';
  import { getByDateRange } from '$lib/services/servicesService';
  
  let services = [];
  
  $: loadServices($dateRange);
  
  async function loadServices(range) {
    const { data } = await getByDateRange(range.startDate, range.endDate);
    services = data || [];
  }
</script>

<ServicesTable data={services} />
```

### Charts

```svelte
<script>
  import { dateRange } from '$lib/stores/filterStore';
  
  // Filter chart data based on date range
  $: chartData = allData.filter(d => 
    d.date >= $dateRange.startDate && 
    d.date <= $dateRange.endDate
  );
</script>

<AttendanceTrend data={chartData} />
```

---

## 🔧 Common Patterns

### Checking if Data Matches Filter

```javascript
import { dateRange } from '$lib/stores/filterStore';
import { isWithinRange } from '$lib/utils/dateUtils';
import { get } from 'svelte/store';

function isInCurrentFilter(dateString) {
  const range = get(dateRange);
  return isWithinRange(dateString, range.startDate, range.endDate);
}
```

### Resetting Filter

```javascript
// Reset to default (this month)
filterStore.reset();
```

### Comparing Periods

```javascript
// Get previous period for comparison
function getPreviousPeriod(currentRange) {
  const days = daysBetween(currentRange.startDate, currentRange.endDate);
  return {
    startDate: daysAgo(days * 2),
    endDate: daysAgo(days)
  };
}

// Use for % change calculations
const current = calculateMetrics(data, currentRange);
const previous = calculateMetrics(data, previousRange);
const change = ((current - previous) / previous) * 100;
```

---

## ⚠️ Important Notes

1. **Always use the store** - Don't hardcode date ranges
2. **React to changes** - Use `$:` reactive statements
3. **Handle empty data** - Filters might return no results
4. **Consider timezone** - Dates are stored in UTC
5. **URL sharing** - Shared URLs include filter state
6. **Performance** - Filter on the backend when possible
