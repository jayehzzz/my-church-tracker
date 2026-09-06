<script>
  import { onMount } from 'svelte';
  import { session, initializeSession, signIn, signOut, requestAccess } from './session.js';
  import { getConvexHttpClient } from '$lib/convex.js';
  import { api } from '../../../convex/_generated/api.js';
  let { children } = $props();
  let summary = $state(null);
  let error = $state('');
  onMount(() => { void initializeSession(); });
  $effect(() => {
    if ($session.status === 'authenticated' && $session.user?.role === 'viewer') {
      let active = true;
      getConvexHttpClient().query(api.access.summary, {}).then(value => { if (active) summary = value; })
        .catch(() => { if (active) error = 'Summary could not be loaded. Please try again later.'; });
      return () => { active = false; summary = null; };
    }
  });
  async function login() {
    error = '';
    try { await signIn(); } catch { error = 'Unable to open Google sign-in. Please try again.'; }
  }
  async function requestApproval() {
    error = '';
    await requestAccess();
  }
</script>

{#if $session.status === 'demo' || ($session.status === 'authenticated' && $session.user?.role !== 'viewer')}
  {#key `${$session.user?.id}:${$session.user?.role}:${$session.user?.canViewConfidential}`}
    {@render children?.()}
  {/key}
{:else}
  <main class="min-h-screen flex items-center justify-center p-6">
    <section class="w-full max-w-lg rounded-2xl border border-border bg-card p-8 space-y-5" aria-labelledby="access-title">
      <p class="text-sm text-primary font-semibold">Church Tracker</p>
      {#if $session.status === 'authenticated'}
        <h1 id="access-title" class="text-2xl font-bold">Church summary</h1>
        <p class="text-muted-foreground">Signed in as {$session.user.name}. Your account has summary access.</p>
        {#if summary}
          <dl class="grid grid-cols-3 gap-4">
            {#each Object.entries(summary) as [label, value]}
              <div><dt class="capitalize text-sm text-muted-foreground">{label}</dt><dd class="text-3xl font-semibold">{value}</dd></div>
            {/each}
          </dl>
        {:else if !error}<p role="status">Loading summary…</p>{/if}
        <button class="px-4 py-2 border border-border rounded-lg" onclick={signOut}>Sign out</button>
      {:else if $session.status === 'loading'}
        <h1 id="access-title" class="text-2xl font-bold">Checking your session…</h1>
      {:else if $session.status === 'configuration-required'}
        <h1 id="access-title" class="text-2xl font-bold">Sign-in setup required</h1>
        <p class="text-muted-foreground">{$session.error}</p>
      {:else if $session.status === 'approval-required' || $session.status === 'requesting-approval'}
        <h1 id="access-title" class="text-2xl font-bold">Owner approval required</h1>
        <p class="text-muted-foreground">Your Google sign-in is verified by the service, but it does not grant access on its own. Ask a church owner to review your request.</p>
        {#if $session.error}<p role="status">{$session.error}</p>{/if}
        <div class="flex flex-wrap gap-3">
          <button class="px-5 py-3 bg-primary text-primary-foreground font-semibold rounded-lg" disabled={$session.status === 'requesting-approval'} onclick={requestApproval}>
            {$session.status === 'requesting-approval' ? 'Sending request…' : 'Request owner approval'}
          </button>
          <button class="px-4 py-2 border border-border rounded-lg" onclick={signOut}>Sign out</button>
        </div>
      {:else}
        <h1 id="access-title" class="text-2xl font-bold">Sign in to your church</h1>
        <p class="text-muted-foreground">Use your approved Google account to continue.</p>
        {#if $session.error}<p role="alert">{$session.error}</p>{/if}
        <button class="px-5 py-3 bg-primary text-primary-foreground font-semibold rounded-lg" onclick={login}>Continue with Google</button>
        {#if $session.status === 'access-denied'}
          <button class="px-4 py-2 border border-border rounded-lg" onclick={signOut}>Sign out</button>
        {/if}
      {/if}
      {#if error}<p role="alert" class="text-destructive">{error}</p>{/if}
    </section>
  </main>
{/if}
