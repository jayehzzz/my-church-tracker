<script>
  // Facts are provided by the authorized page adapter. Unknown values stay
  // absent; no title, status, leader or attendance is inferred here.
  let { title, date = null, facts = [], summary = null, children = null } = $props();
</script>
<article class="space-y-4">
  <header><h3 class="text-lg font-semibold">{title}</h3>{#if date}<p class="text-sm text-muted-foreground">{date}</p>{/if}</header>
  {#if summary}<p class="text-sm">{summary}</p>{/if}
  {#if facts.length}
    <dl class="grid gap-3 sm:grid-cols-2">
      {#each facts as fact}
        <div><dt class="text-xs text-muted-foreground">{fact.label}</dt><dd class="font-medium">{fact.value ?? 'Unavailable'}</dd></div>
      {/each}
    </dl>
  {/if}
  {#if children}{@render children()}{/if}
</article>
