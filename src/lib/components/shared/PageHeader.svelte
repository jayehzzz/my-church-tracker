<!--
  Page Header Component
  =====================
  
  A reusable page header component for the church tracker dashboard.
  Displays a page title and optional subtitle with premium typography
  following the design system specifications.
  
  Features:
  - Semantic HTML structure (header, h1, p)
  - WCAG AA accessible typography
  - Premium 48px dashboard title with -0.02em letter-spacing
  - Proper breathing room with generous padding
  
  Typography Specifications:
  - Title (H1): 48px (3rem), font-weight 600, -0.02em letter-spacing
  - Subtitle: 16px (1rem), muted color
  
  Usage:
  ```svelte
  <PageHeader
    title="Dashboard"
    subtitle="Overview of church member engagement"
  />
  ```
  
  Or without subtitle:
  ```svelte
  <PageHeader title="Members" />
  ```
-->

<script>
  // Svelte 5: Props using $props() rune
  let { title = '', subtitle = '' } = $props();
</script>

<header class="pt-10 pb-6">
  <h1 class="text-dashboard-title">
    {title}
  </h1>
  
  {#if subtitle}
    <p class="mt-2 text-base text-muted-foreground max-w-2xl">
      {subtitle}
    </p>
  {/if}
</header>