---
description: How to add a new page/route to the application
---

# Add New Page Workflow

## 1. Create Route Directory

Create folder in `src/routes/[page-name]/`:
// turbo
```bash
mkdir src/routes/[page-name]
```

---

## 2. Create Page File

Create `+page.svelte`:

```svelte
<script>
  import { onMount } from 'svelte';
  import Motion from '$lib/components/ui/Motion.svelte';
  import { someService } from '$lib/services/someService';
  
  let data = $state([]);
  let isLoading = $state(true);
  
  onMount(async () => {
    data = await someService.getAll();
    isLoading = false;
  });
</script>

<svelte:head>
  <title>Page Title | Church Tracker</title>
</svelte:head>

<div class="p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <Motion>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-dashboard-title">Page Title</h1>
    </div>
  </Motion>
  
  <!-- Content -->
  {#if isLoading}
    <div class="animate-pulse space-y-4">
      <!-- Skeleton -->
    </div>
  {:else}
    <!-- Page content -->
  {/if}
</div>
```

---

## 3. Add Navigation Link

Edit `src/routes/+layout.svelte` to add nav item:

```svelte
{ href: '/page-name', label: 'Page Name', icon: '...' }
```

---

## 4. Create Service (if needed)

See skill: `add_convex_feature`

---

## 5. Follow Design Philosophy

- [ ] Page wrapped in Motion for entrance animation
- [ ] KPI cards are clickable (if applicable)
- [ ] Tables use DataTable with row click
- [ ] Loading states with skeletons
- [ ] Empty states are meaningful
