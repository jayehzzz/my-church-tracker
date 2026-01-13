# 🏗️ Layout Components

> **Complete guide to page structure and navigation components.**

---

## Overview

Layout components live in `src/lib/components/layout/` and provide the overall page structure, navigation, and common UI elements shared across all pages.

### Component Index

| Component | Purpose |
|-----------|---------|
| `DashboardLayout.svelte` | Main application wrapper |
| `Sidebar.svelte` | Navigation sidebar |
| `TopNav.svelte` | Top navigation bar |
| `GlobalSearch.svelte` | Application-wide search |

---

## 🎯 DashboardLayout.svelte

**Location**: `src/lib/components/layout/DashboardLayout.svelte`

**Purpose**: Main layout wrapper that provides the overall page structure with sidebar and content area.

### Structure

```
┌────────────────────────────────────────────────────────────┐
│                        TopNav                               │
├─────────────┬──────────────────────────────────────────────┤
│             │                                              │
│   Sidebar   │              Main Content                    │
│             │                 (slot)                       │
│             │                                              │
│             │                                              │
│             │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `sidebarExpanded` | boolean | `true` | Sidebar open/collapsed state |

### Slots

| Slot | Description |
|------|-------------|
| default | Main page content |

### Usage (in +layout.svelte)

```svelte
<script>
  import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
  import { navigationStore } from '$lib/stores/navigationStore';
</script>

<DashboardLayout sidebarExpanded={$navigationStore.sidebarExpanded}>
  <slot />
</DashboardLayout>
```

### Responsive Behavior

| Screen Size | Sidebar Behavior |
|-------------|------------------|
| Desktop (≥1024px) | Sidebar visible, can collapse |
| Tablet (768-1023px) | Sidebar collapsed by default |
| Mobile (<768px) | Sidebar hidden, overlay on open |

---

## 📑 Sidebar.svelte

**Location**: `src/lib/components/layout/Sidebar.svelte`

**Purpose**: Navigation sidebar with links to all main application sections.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `expanded` | boolean | `true` | Expanded or collapsed state |
| `currentPath` | string | `'/'` | Current route for highlighting |

### Navigation Items

| Icon | Label | Path | Description |
|------|-------|------|-------------|
| 🏠 | Dashboard | `/` | Main dashboard home |
| 👥 | People | `/people` | People directory |
| ⛪ | Services | `/services` | Church services |
| 🌱 | Evangelism | `/evangelism` | Outreach tracking |
| 🙏 | Meetings | `/meetings` | Prayer meetings |
| 🏠 | Visitation | `/visitation` | Home visits |
| 📊 | Reports | `/reports` | Reports & exports |

### Visual States

| State | Appearance |
|-------|------------|
| **Expanded** | Full width with icons and labels |
| **Collapsed** | Icons only, labels shown on hover |
| **Active Item** | Highlighted background |
| **Hover** | Subtle highlight effect |

### Structure

```svelte
<aside class="sidebar" class:expanded>
  <!-- Logo/Brand -->
  <div class="brand">
    <img src="/logo.svg" alt="Church Tracker" />
    {#if expanded}
      <span>Church Tracker</span>
    {/if}
  </div>
  
  <!-- Navigation Links -->
  <nav>
    {#each navItems as item}
      <a 
        href={item.path}
        class:active={currentPath === item.path}
      >
        <svelte:component this={item.icon} />
        {#if expanded}
          <span>{item.label}</span>
        {/if}
      </a>
    {/each}
  </nav>
  
  <!-- Collapse Toggle -->
  <button on:click={toggleExpanded}>
    {expanded ? '◀' : '▶'}
  </button>
</aside>
```

### Mobile Behavior

On mobile devices:
1. Sidebar is hidden by default
2. Hamburger menu in TopNav to open
3. Opens as overlay on top of content
4. Clicking a link closes the sidebar
5. Clicking outside closes the sidebar

---

## 🔝 TopNav.svelte

**Location**: `src/lib/components/layout/TopNav.svelte`

**Purpose**: Top navigation bar with page title, search, and actions.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | `''` | Current page title |
| `showBreadcrumb` | boolean | `false` | Show breadcrumb navigation |

### Contents

```
┌──────────────────────────────────────────────────────────────┐
│ ☰  │ Logo  │            Search...            │  🔔  │ Profile │
└──────────────────────────────────────────────────────────────┘
     │       │                                  │              │
     │       │                                  │              └─ User menu
     │       │                                  └─ Notifications
     │       └─ Global search
     └─ Mobile menu toggle
```

### Features

| Feature | Description |
|---------|-------------|
| **Mobile Menu Toggle** | Hamburger button for mobile sidebar |
| **Logo** | Clickable logo, links to dashboard |
| **Global Search** | Opens search modal (Cmd/Ctrl + K) |
| **Time Filter** | Period selector component |
| **Notifications** | Bell icon with unread count |
| **User Menu** | Profile and settings dropdown |

### Events

| Event | Description |
|-------|-------------|
| `on:toggleSidebar` | Mobile menu toggle clicked |
| `on:openSearch` | Search button clicked |

### Structure

```svelte
<header class="top-nav">
  <!-- Mobile menu toggle -->
  <button class="menu-toggle" on:click={() => dispatch('toggleSidebar')}>
    <MenuIcon />
  </button>
  
  <!-- Logo -->
  <a href="/" class="logo">
    <img src="/logo.svg" alt="Logo" />
  </a>
  
  <!-- Search -->
  <button class="search-trigger" on:click={openSearch}>
    <SearchIcon />
    <span>Search...</span>
    <kbd>⌘K</kbd>
  </button>
  
  <!-- Right side actions -->
  <div class="actions">
    <!-- Time filter -->
    <PeriodSelect />
    
    <!-- Notifications -->
    <button class="notifications">
      <BellIcon />
      {#if unreadCount > 0}
        <span class="badge">{unreadCount}</span>
      {/if}
    </button>
    
    <!-- User menu -->
    <UserMenu />
  </div>
</header>
```

---

## 🔍 GlobalSearch.svelte

**Location**: `src/lib/components/layout/GlobalSearch.svelte`

**Purpose**: Application-wide search modal that searches across all data types.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `open` | boolean | `false` | Visibility state |

### Events

| Event | Description |
|-------|-------------|
| `on:close` | Search closed |
| `on:select` | Result selected |

### Search Behavior

1. **Trigger**: Click search button or press Cmd/Ctrl + K
2. **Input**: Type to search (min 2 characters)
3. **Results**: Grouped by category (People, Services, etc.)
4. **Navigation**: Arrow keys to navigate, Enter to select
5. **Close**: Escape key or click outside

### Result Categories

| Category | Searches | Fields |
|----------|----------|--------|
| People | people table | first_name, last_name, email |
| Services | services table | sermon_topic, sermon_speaker |
| Meetings | meetings table | location, notes |
| Visitations | visitations table | person_visited_name |

### Structure

```svelte
<script>
  import { searchStore } from '$lib/stores/searchStore';
  import { search as searchPeople } from '$lib/services/peopleService';
  
  let inputRef;
  
  $: if (open) {
    setTimeout(() => inputRef?.focus(), 100);
  }
  
  async function performSearch(query) {
    if (query.length < 2) return;
    
    searchStore.setLoading(true);
    
    const { data: people } = await searchPeople(query);
    // ... search other types
    
    searchStore.setResults({
      people: people || [],
      services: [],
      // ...
    });
    
    searchStore.setLoading(false);
  }
</script>

{#if open}
  <div class="search-overlay" on:click={close}>
    <div class="search-modal" on:click|stopPropagation>
      <input 
        bind:this={inputRef}
        type="text"
        placeholder="Search everything..."
        bind:value={$searchStore.query}
        on:input={(e) => performSearch(e.target.value)}
        on:keydown={handleKeydown}
      />
      
      {#if $searchStore.isLoading}
        <div class="loading">Searching...</div>
      {:else if $searchStore.query.length > 1}
        <div class="results">
          {#if $searchStore.results.people.length > 0}
            <div class="category">
              <h4>People</h4>
              {#each $searchStore.results.people as person, i}
                <a 
                  href="/people/{person.id}"
                  class:selected={selectedIndex === i}
                  on:click={close}
                >
                  {person.first_name} {person.last_name}
                </a>
              {/each}
            </div>
          {/if}
          
          <!-- Other categories... -->
        </div>
      {:else}
        <div class="hint">
          Type to search people, services, meetings...
        </div>
      {/if}
    </div>
  </div>
{/if}
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + K` | Open search |
| `Escape` | Close search |
| `↑` / `↓` | Navigate results |
| `Enter` | Select result |

---

## 📋 Shared Components

### PageHeader.svelte

**Location**: `src/lib/components/shared/PageHeader.svelte`

**Purpose**: Provides consistent page titles and optional action buttons.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Page title |
| `subtitle` | string | Optional subtitle |

### Slots

| Slot | Description |
|------|-------------|
| `actions` | Buttons/controls on the right side |

### Usage

```svelte
<script>
  import PageHeader from '$lib/components/shared/PageHeader.svelte';
  import Button from '$lib/components/ui/Button.svelte';
</script>

<PageHeader 
  title="People Directory"
  subtitle="Manage members, guests, and contacts"
>
  <svelte:fragment slot="actions">
    <Button on:click={() => showAddForm = true}>
      Add Person
    </Button>
  </svelte:fragment>
</PageHeader>
```

---

## 🗺️ Map Components

### LeafletMap.svelte

**Location**: `src/lib/components/map/LeafletMap.svelte`

**Purpose**: Interactive map for visualizing people locations.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `people` | array | Array of people with lat/lng |
| `churchLocation` | object | Church coordinates |
| `filters` | object | Active filter settings |
| `onMarkerClick` | function | Callback when marker clicked |

### Features

| Feature | Description |
|---------|-------------|
| **Markers** | Color-coded by member status |
| **Church Location** | Special marker for the church |
| **Zoom Controls** | Zoom in/out and fit all |
| **Filtering** | Filter by status, role, activity |
| **Clustering** | Groups nearby markers |
| **Popups** | Quick info on click |

### Marker Colors

| Status | Color |
|--------|-------|
| Member | Green |
| Guest | Blue |
| Leader | Gold |
| Archived | Gray |

### Usage

```svelte
<script>
  import LeafletMap from '$lib/components/map/LeafletMap.svelte';
  import { getAll } from '$lib/services/peopleService';
  
  let people = [];
  
  onMount(async () => {
    const { data } = await getAll();
    people = data.filter(p => p.lat && p.lng);
  });
  
  const churchLocation = {
    lat: 51.5074,
    lng: -0.1278,
    name: 'Our Church'
  };
  
  function handleMarkerClick(person) {
    goto(`/people/${person.id}`);
  }
</script>

<LeafletMap 
  {people}
  {churchLocation}
  onMarkerClick={handleMarkerClick}
/>
```

---

## 🎛️ Filter Components

### FilterBar.svelte

**Location**: `src/lib/components/filters/FilterBar.svelte`

**Purpose**: Container for filter controls.

### PeriodSelect.svelte

**Location**: `src/lib/components/filters/PeriodSelect.svelte`

**Purpose**: Time period dropdown selector.

### DateRangePicker.svelte

**Location**: `src/lib/components/filters/DateRangePicker.svelte`

**Purpose**: Custom date range selection with calendar.

---

## 📐 Layout Principles

### Spacing

| Token | Value | Use |
|-------|-------|-----|
| `--space-1` | 4px | Minimal gaps |
| `--space-2` | 8px | Tight grouping |
| `--space-3` | 12px | Component padding |
| `--space-4` | 16px | Section spacing |
| `--space-6` | 24px | Major sections |
| `--space-8` | 32px | Page sections |

### Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 768px | Sidebar hidden, stacked layouts |
| Tablet | 768-1023px | Sidebar collapsed, responsive grids |
| Desktop | ≥ 1024px | Full layout, all features visible |

### Z-Index Layers

| Layer | Z-Index | Components |
|-------|---------|------------|
| Content | 1 | Normal page content |
| Sticky | 10 | Sticky headers |
| Sidebar | 100 | Navigation sidebar |
| TopNav | 200 | Top navigation bar |
| Dropdown | 500 | Dropdown menus |
| Modal | 1000 | Modal dialogs |
| Toast | 2000 | Notifications |
