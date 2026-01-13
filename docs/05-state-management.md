# 🏪 State Management

> **Complete guide to global state handling with Svelte stores.**

---

## Overview

The application uses **Svelte stores** for global state management. Stores are reactive containers that can be shared across components, ensuring that when state changes, all subscribed components update automatically.

### Store Files

| File | Purpose |
|------|---------|
| `filterStore.js` | Global date/time filtering |
| `navigationStore.js` | Sidebar and navigation state |
| `searchStore.js` | Global search functionality |

---

## 📅 filterStore.js

**Location**: `src/lib/stores/filterStore.js`

**Purpose**: Manages the global date/time filter that controls what data is displayed throughout the application.

### Why This Matters

Almost every page in the application shows time-sensitive data. Instead of each page managing its own date filter, we have one central filter that:

1. Applies consistently across all pages
2. Persists as users navigate
3. Syncs to URL for bookmarking/sharing
4. Saves to localStorage for returning users

### State Structure

```javascript
{
  type: 'thisMonth',     // The filter type
  year: 2025,            // Current year
  month: 0,              // Current month (0-11)
  quarter: null,         // Quarter if applicable (Q1-Q4)
  customStart: null,     // Custom range start date
  customEnd: null        // Custom range end date
}
```

### Filter Types

| Type | Description | Uses Fields |
|------|-------------|-------------|
| `thisYear` | Current calendar year | `year` |
| `thisMonth` | Current calendar month | `year`, `month` |
| `thisQuarter` | Current quarter | `year`, `quarter` |
| `last30Days` | Rolling 30-day window | (calculated) |
| `lastMonth` | Previous calendar month | (calculated) |
| `last3Months` | Rolling 3-month window | (calculated) |
| `last6Months` | Rolling 6-month window | (calculated) |
| `last12Months` | Rolling 12-month window | (calculated) |
| `specificYear` | A specific year | `year` |
| `specificMonth` | A specific month | `year`, `month` |
| `specificQuarter` | A specific quarter | `year`, `quarter` |
| `customRange` | Custom date range | `customStart`, `customEnd` |

### Available Methods

#### Quick Filters

```javascript
import { filterStore } from '$lib/stores/filterStore';

// Set to current year
filterStore.setThisYear();

// Set to current month
filterStore.setThisMonth();

// Set to current quarter
filterStore.setThisQuarter();

// Set to last 30 days
filterStore.setLast30Days();
```

#### Relative Filters

```javascript
// Previous calendar month
filterStore.setLastMonth();

// Rolling periods
filterStore.setLast3Months();
filterStore.setLast6Months();
filterStore.setLast12Months();
```

#### Specific Selections

```javascript
// Set a specific year
filterStore.setYear(2024);

// Set a specific month (year, month: 0-11)
filterStore.setMonth(2024, 5);  // June 2024

// Set a specific quarter
filterStore.setQuarter(2024, 'Q2');
```

#### Custom Range

```javascript
// Set custom date range
filterStore.setCustomRange('2024-01-01', '2024-03-31');
```

#### Other Methods

```javascript
// Reset to default (this month)
filterStore.reset();

// Initialize from localStorage (call on app start)
filterStore.initialize();

// Sync current state to URL
filterStore.syncToURL();

// Save to localStorage
filterStore.saveToStorage();
```

### Derived Store: dateRange

The `dateRange` derived store automatically calculates the actual date strings based on the filter state:

```javascript
import { dateRange } from '$lib/stores/filterStore';

// Subscribe to get actual dates
$: console.log($dateRange);

/*
Returns:
{
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  label: 'January 2025'
}
*/
```

### Usage in Components

#### Reading the Filter State

```svelte
<script>
  import { filterStore, dateRange } from '$lib/stores/filterStore';
  
  // Access the filter configuration
  $: filterType = $filterStore.type;
  
  // Access the calculated date range
  $: startDate = $dateRange.startDate;
  $: endDate = $dateRange.endDate;
  $: label = $dateRange.label;
</script>

<p>Showing data for: {label}</p>
<p>{startDate} to {endDate}</p>
```

#### Setting Filters from UI

```svelte
<script>
  import { filterStore } from '$lib/stores/filterStore';
</script>

<select on:change={(e) => {
  switch(e.target.value) {
    case 'thisMonth': filterStore.setThisMonth(); break;
    case 'thisYear': filterStore.setThisYear(); break;
    case 'last30Days': filterStore.setLast30Days(); break;
  }
}}>
  <option value="thisMonth">This Month</option>
  <option value="thisYear">This Year</option>
  <option value="last30Days">Last 30 Days</option>
</select>
```

#### Filtering Data

```svelte
<script>
  import { dateRange } from '$lib/stores/filterStore';
  import { getByDateRange } from '$lib/services/servicesService';
  
  let services = [];
  
  // Re-fetch when date range changes
  $: loadServices($dateRange);
  
  async function loadServices(range) {
    const { data } = await getByDateRange(range.startDate, range.endDate);
    services = data || [];
  }
</script>
```

---

## 🧭 navigationStore.js

**Location**: `src/lib/stores/navigationStore.js`

**Purpose**: Manages sidebar state and navigation-related UI state.

### State Structure

```javascript
{
  sidebarExpanded: true,     // Is sidebar open or collapsed?
  currentPath: '/',          // Current route path
  mobileMenuOpen: false      // Mobile navigation state
}
```

### Available Methods

```javascript
import { navigationStore } from '$lib/stores/navigationStore';

// Toggle sidebar expanded/collapsed
navigationStore.toggleSidebar();

// Set sidebar state explicitly
navigationStore.setSidebarExpanded(true);
navigationStore.setSidebarExpanded(false);

// Update current path (usually automatic with routing)
navigationStore.setCurrentPath('/people');

// Mobile menu controls
navigationStore.openMobileMenu();
navigationStore.closeMobileMenu();
navigationStore.toggleMobileMenu();
```

### Usage in Layout

```svelte
<script>
  import { navigationStore } from '$lib/stores/navigationStore';
</script>

<aside class:expanded={$navigationStore.sidebarExpanded}>
  <!-- Sidebar content -->
</aside>

<button on:click={() => navigationStore.toggleSidebar()}>
  Toggle Sidebar
</button>
```

### Responsive Behavior

The store handles responsive behavior:

- **Desktop**: Sidebar can be expanded or collapsed, persists across pages
- **Mobile**: Sidebar overlays content, closes when navigation occurs

---

## 🔍 searchStore.js

**Location**: `src/lib/stores/searchStore.js`

**Purpose**: Manages global search functionality.

### State Structure

```javascript
{
  query: '',           // Current search text
  isOpen: false,       // Is search UI open?
  isLoading: false,    // Is search in progress?
  results: {           // Search results by category
    people: [],
    services: [],
    meetings: [],
    visitations: [],
    evangelism: []
  },
  selectedIndex: 0     // For keyboard navigation
}
```

### Available Methods

```javascript
import { searchStore } from '$lib/stores/searchStore';

// Set search query
searchStore.setQuery('John');

// Clear search
searchStore.clearSearch();

// Open/close search UI
searchStore.open();
searchStore.close();
searchStore.toggle();

// Set loading state
searchStore.setLoading(true);

// Set results
searchStore.setResults({
  people: [...],
  services: [...],
  // ...
});

// Keyboard navigation
searchStore.moveSelectionUp();
searchStore.moveSelectionDown();
searchStore.selectCurrent();
```

### Usage in GlobalSearch Component

```svelte
<script>
  import { searchStore } from '$lib/stores/searchStore';
  import { search as searchPeople } from '$lib/services/peopleService';
  
  // React to query changes
  $: if ($searchStore.query.length > 2) {
    performSearch($searchStore.query);
  }
  
  async function performSearch(query) {
    searchStore.setLoading(true);
    
    const { data: people } = await searchPeople(query);
    
    searchStore.setResults({ 
      people: people || [],
      // ... other categories
    });
    
    searchStore.setLoading(false);
  }
</script>

{#if $searchStore.isOpen}
  <div class="search-modal">
    <input 
      type="text"
      value={$searchStore.query}
      on:input={(e) => searchStore.setQuery(e.target.value)}
      placeholder="Search..."
    />
    
    {#if $searchStore.isLoading}
      <p>Searching...</p>
    {:else}
      {#each $searchStore.results.people as person}
        <a href="/people/{person.id}">{person.first_name} {person.last_name}</a>
      {/each}
    {/if}
  </div>
{/if}
```

### Keyboard Shortcuts

The search store is designed to work with keyboard shortcuts:

- **Cmd/Ctrl + K**: Open search
- **Escape**: Close search
- **Arrow Up/Down**: Navigate results
- **Enter**: Select current result

---

## 🔄 Store Patterns

### Subscribing to Stores

```svelte
<script>
  import { filterStore } from '$lib/stores/filterStore';
  
  // Reactive subscription using $
  $: currentFilter = $filterStore.type;
  
  // Or manual subscription
  import { onMount, onDestroy } from 'svelte';
  
  let unsubscribe;
  
  onMount(() => {
    unsubscribe = filterStore.subscribe(state => {
      console.log('Filter changed:', state);
    });
  });
  
  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>
```

### Using get() for One-Time Reads

```javascript
import { get } from 'svelte/store';
import { dateRange } from '$lib/stores/filterStore';

function exportData() {
  const range = get(dateRange);
  console.log(`Exporting data from ${range.startDate} to ${range.endDate}`);
}
```

### Combining Multiple Stores

```svelte
<script>
  import { filterStore } from '$lib/stores/filterStore';
  import { searchStore } from '$lib/stores/searchStore';
  
  // Combine state from multiple stores
  $: isFiltering = $filterStore.type !== 'thisMonth';
  $: isSearching = $searchStore.query.length > 0;
  $: hasActiveFilters = isFiltering || isSearching;
</script>

{#if hasActiveFilters}
  <button on:click={clearAllFilters}>Clear Filters</button>
{/if}
```

---

## 💾 Persistence

### filterStore Persistence

The filter store persists its state in two ways:

1. **localStorage**: Remembers the filter when the user returns
2. **URL parameters**: Allows bookmarking and sharing filtered views

```javascript
// On app initialization (in +layout.svelte)
import { onMount } from 'svelte';
import { filterStore } from '$lib/stores/filterStore';

onMount(() => {
  filterStore.initialize();  // Load from localStorage/URL
});
```

### URL Sync

When the filter changes, the URL is updated:

```
/people → /people?filterType=thisYear&year=2025
```

This allows:
- Bookmarking a specific filtered view
- Sharing links that preserve the filter
- Browser back/forward navigation
