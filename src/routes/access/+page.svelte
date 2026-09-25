<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { session } from '$lib/auth/session.js';
  import { getConvexHttpClient } from '$lib/convex.js';
  import { api } from '../../../convex/_generated/api.js';

  const roles = ['owner', 'admin', 'leader', 'viewer'];
  let requests = $state([]);
  let accounts = $state([]);
  let people = $state([]);
  let drafts = $state({});
  let loading = $state(true);
  let saving = $state('');
  let confirmingRemoval = $state('');
  let error = $state('');
  let notice = $state('');

  function initialDraft(source = {}) {
    return {
      role: source.role || 'viewer',
      status: source.status || 'active',
      personId: source.personId || '',
      displayName: source.displayName || '',
      canViewConfidential: source.canViewConfidential === true,
      canViewGiving: source.canViewGiving === true,
    };
  }

  function resetDrafts() {
    drafts = Object.fromEntries([
      ...requests.map(request => [`request-${request.id}`, initialDraft(request)]),
      ...accounts.map(account => [`account-${account.id}`, initialDraft(account)]),
    ]);
  }

  async function load() {
    if ($session.user?.role !== 'owner') return;
    loading = true;
    error = '';
    try {
      const client = getConvexHttpClient();
      if (!client) throw new Error('The church database is not configured.');
      const [nextRequests, nextAccounts, nextPeople] = await Promise.all([
        client.query(api.access.listAccessRequests, {}),
        client.query(api.access.listManagedAccounts, {}),
        client.query(api.people.getAll, {}),
      ]);
      requests = nextRequests;
      accounts = nextAccounts;
      people = nextPeople;
      resetDrafts();
    } catch (cause) {
      error = 'Access records could not be loaded. Please refresh or try again.';
    } finally {
      loading = false;
    }
  }

  onMount(() => { void load(); });

  function updateDraft(key, values) {
    const next = { ...drafts[key], ...values };
    if (next.role === 'viewer') next.canViewConfidential = false;
    if (next.role === 'viewer' || next.role === 'leader') next.canViewGiving = false;
    if (next.role === 'leader' && drafts[key]?.role !== 'leader') next.canViewConfidential = true;
    drafts = { ...drafts, [key]: next };
  }

  function linkedPersonLabel(id) {
    const person = people.find(candidate => candidate._id === id);
    return person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed person' : 'No linked person';
  }

  function validDraft(draft) {
    if (draft.role === 'leader' && !draft.personId) {
      error = 'A leader must be linked to an existing person before access can be saved.';
      return false;
    }
    return true;
  }

  function payload(draft) {
    return {
      role: draft.role,
      status: draft.status,
      personId: draft.personId || undefined,
      displayName: draft.displayName.trim() || undefined,
      canViewConfidential: draft.canViewConfidential,
      canViewGiving: draft.canViewGiving,
    };
  }

  async function approve(request) {
    const key = `request-${request.id}`;
    const draft = drafts[key];
    if (!validDraft(draft)) return;
    saving = key;
    error = '';
    notice = '';
    try {
      await getConvexHttpClient().mutation(api.access.approveAccessRequest, { requestId: request.id, ...payload(draft) });
      notice = 'Access approved. The person can now continue with their account.';
      await load();
    } catch (cause) {
      error = String(cause).includes('LAST_OWNER_REQUIRED')
        ? 'At least one active owner must remain.'
        : 'The request could not be approved. Check the selected role and person link, then try again.';
    } finally {
      saving = '';
    }
  }

  async function decline(request) {
    const key = `request-${request.id}`;
    saving = key;
    error = '';
    notice = '';
    try {
      await getConvexHttpClient().mutation(api.access.rejectAccessRequest, { requestId: request.id });
      notice = 'Access request declined. They can request access again later if needed.';
      await load();
    } catch (cause) {
      error = 'The request could not be declined. Refresh the page and try again.';
    } finally {
      saving = '';
    }
  }

  async function saveAccount(account) {
    const key = `account-${account.id}`;
    const draft = drafts[key];
    if (!validDraft(draft)) return;
    saving = key;
    error = '';
    notice = '';
    try {
      await getConvexHttpClient().mutation(api.access.updateAccount, { accountId: account.id, ...payload(draft) });
      notice = draft.status === 'inactive' ? 'Account deactivated. Its next protected request will be denied.' : 'Access settings saved.';
      await load();
    } catch (cause) {
      error = String(cause).includes('LAST_OWNER_REQUIRED')
        ? 'At least one active owner must remain.'
        : 'The account could not be updated. Check the selected role and person link, then try again.';
    } finally {
      saving = '';
    }
  }

  async function setAccountStatus(account, nextStatus) {
    const key = `account-${account.id}`;
    const storedDraft = initialDraft(account);
    if (nextStatus === 'active' && !validDraft(storedDraft)) return;
    saving = key;
    confirmingRemoval = '';
    error = '';
    notice = '';
    try {
      const nextDraft = {
        ...storedDraft,
        status: nextStatus,
        canViewConfidential: nextStatus === 'inactive' ? false : storedDraft.canViewConfidential,
        canViewGiving: nextStatus === 'inactive' ? false : storedDraft.canViewGiving,
      };
      await getConvexHttpClient().mutation(api.access.updateAccount, { accountId: account.id, ...payload(nextDraft) });
      notice = nextStatus === 'inactive'
        ? 'Access removed. This account can no longer use Church Tracker.'
        : 'Access restored. The account can sign in again with its saved role.';
      await load();
    } catch (cause) {
      error = String(cause).includes('LAST_OWNER_REQUIRED')
        ? 'You cannot remove the last active owner. Make another owner active first.'
        : 'The account access could not be changed. Please try again.';
    } finally {
      saving = '';
    }
  }
</script>

{#if $session.user?.role !== 'owner'}
  <main class="max-w-3xl mx-auto p-6">
    <button class="mb-5 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary" onclick={() => goto('/')} aria-label="Back to dashboard">← Back to dashboard</button>
    <h1 class="text-2xl font-bold">Manage access</h1>
    <p class="mt-3 text-muted-foreground">Only a church owner can manage account access.</p>
  </main>
{:else}
  <main class="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
    <div class="space-y-4">
      <button class="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary" onclick={() => goto('/')} aria-label="Back to dashboard">← Back to dashboard</button>
      <div>
        <p class="text-sm text-primary font-semibold">Church Tracker</p>
        <h1 class="text-3xl font-bold">Manage access</h1>
        <p class="mt-2 text-muted-foreground max-w-3xl">Approve people you recognise, change what they can access, or remove their app access. Removing access keeps the account record for audit and lets an owner restore it later.</p>
      </div>
    </div>

    {#if error}<p role="alert" class="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>{/if}
    {#if notice}<p role="status" class="rounded-lg border border-primary/30 bg-primary/10 p-3 text-primary">{notice}</p>{/if}

    <section class="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="requests-heading">
      <div class="flex items-center justify-between gap-4">
        <div><h2 id="requests-heading" class="text-xl font-semibold">Pending approval requests</h2><p class="text-sm text-muted-foreground">People must sign in and request access before they appear here.</p></div>
        <button class="px-3 py-2 border border-border rounded-lg text-sm" onclick={load} disabled={loading}>Refresh</button>
      </div>
      {#if loading}<p class="mt-5" role="status">Loading access records…</p>
      {:else if requests.length === 0}<p class="mt-5 text-muted-foreground">No pending requests.</p>
      {:else}
        <div class="mt-5 space-y-5">
          {#each requests as request}
            {@const key = `request-${request.id}`}
            {@const draft = drafts[key]}
            <article class="rounded-lg border border-border/70 p-4 space-y-4">
              <div><h3 class="font-semibold">{request.displayName || 'Account request'}</h3><p class="text-sm text-muted-foreground">{request.email || 'No email supplied by the provider'} · requested {new Date(request.requestedAt).toLocaleString()}</p></div>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label class="text-sm">Display name<input class="mt-1 w-full rounded-md border border-border bg-background p-2" value={draft?.displayName || ''} oninput={(event) => updateDraft(key, { displayName: event.currentTarget.value })} /></label>
                <label class="text-sm">Role<select class="mt-1 w-full rounded-md border border-border bg-background p-2" value={draft?.role} onchange={(event) => updateDraft(key, { role: event.currentTarget.value })}>{#each roles as role}<option value={role}>{role}</option>{/each}</select></label>
                <label class="text-sm">Link to a person<select class="mt-1 w-full rounded-md border border-border bg-background p-2" value={draft?.personId || ''} onchange={(event) => updateDraft(key, { personId: event.currentTarget.value })}><option value="">No linked person</option>{#each people as person}<option value={person._id}>{person.first_name} {person.last_name || ''}</option>{/each}</select></label>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap gap-4"><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft?.canViewConfidential || false} disabled={draft?.role === 'viewer'} onchange={(event) => updateDraft(key, { canViewConfidential: event.currentTarget.checked })} /> Grant confidential care access</label><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft?.canViewGiving || false} disabled={draft?.role === 'viewer' || draft?.role === 'leader'} onchange={(event) => updateDraft(key, { canViewGiving: event.currentTarget.checked })} /> Grant tithing access</label></div>
                <div class="flex flex-wrap gap-2">
                  <button class="px-4 py-2 border border-border rounded-lg font-semibold" disabled={saving === key} onclick={() => decline(request)}>Decline request</button>
                  <button class="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold" disabled={saving === key} onclick={() => approve(request)}>{saving === key ? 'Working…' : 'Approve access'}</button>
                </div>
              </div>
              {#if draft?.role === 'leader' && !draft?.personId}<p class="text-sm text-amber-600 dark:text-amber-300">A leader requires a linked person.</p>{/if}
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <section class="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="accounts-heading">
      <h2 id="accounts-heading" class="text-xl font-semibold">Approved accounts</h2>
      <p class="mt-1 text-sm text-muted-foreground">Edit a role or person link, then save. Use Remove access when someone should no longer use Church Tracker; inactive accounts stay listed so they can be restored later.</p>
      {#if !loading && accounts.length === 0}<p class="mt-5 text-muted-foreground">No approved accounts.</p>{/if}
      <div class="mt-5 space-y-5">
        {#each accounts as account}
          {@const key = `account-${account.id}`}
          {@const draft = drafts[key]}
          <article class="rounded-lg border border-border/70 p-4 space-y-4">
            <div class="space-y-2">
              <h3 class="font-semibold">{account.displayName || 'Approved account'} · {account.signInMethod || 'Sign-in method unavailable'}</h3>
              {#if account.isCurrentAccount}<p class="text-sm font-semibold text-primary">You’re signed in here</p>{/if}
              <p class="text-sm">{account.email || 'Email not recorded for this older account'}</p>
              <p class="text-sm"><span class={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${account.status === 'inactive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{account.status === 'inactive' ? 'Access removed' : 'Active'}</span></p>
              <p class="text-sm text-muted-foreground">{account.role === 'owner' ? 'Owner — manages accounts and church records.' : account.role === 'admin' ? 'Admin — manages church records.' : account.role === 'leader' ? 'Leader — works with their bacenta and assigned people.' : 'Viewer — views summary information.'} {account.canViewConfidential ? 'Confidential care access.' : 'No confidential care access.'} {account.canViewGiving ? 'Tithing access.' : 'No tithing access.'}</p>
              <p class="text-sm text-muted-foreground">Linked person: {linkedPersonLabel(account.personId)}</p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label class="text-sm">Display name<input class="mt-1 w-full rounded-md border border-border bg-background p-2" value={draft?.displayName || ''} oninput={(event) => updateDraft(key, { displayName: event.currentTarget.value })} /></label>
              <label class="text-sm">Role<select class="mt-1 w-full rounded-md border border-border bg-background p-2" value={draft?.role} onchange={(event) => updateDraft(key, { role: event.currentTarget.value })}>{#each roles as role}<option value={role}>{role}</option>{/each}</select></label>
              <label class="text-sm">Link to a person<select class="mt-1 w-full rounded-md border border-border bg-background p-2" value={draft?.personId || ''} onchange={(event) => updateDraft(key, { personId: event.currentTarget.value })}><option value="">No linked person</option>{#each people as person}<option value={person._id}>{person.first_name} {person.last_name || ''}</option>{/each}</select></label>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-4"><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft?.canViewConfidential || false} disabled={draft?.role === 'viewer' || account.status === 'inactive'} onchange={(event) => updateDraft(key, { canViewConfidential: event.currentTarget.checked })} /> Grant confidential care access</label><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft?.canViewGiving || false} disabled={draft?.role === 'viewer' || draft?.role === 'leader' || account.status === 'inactive'} onchange={(event) => updateDraft(key, { canViewGiving: event.currentTarget.checked })} /> Grant tithing access</label></div>
              <div class="flex flex-wrap gap-2">
                {#if account.status === 'inactive'}
                  <button class="px-4 py-2 border border-primary/50 text-primary rounded-lg font-semibold" disabled={saving === key} onclick={() => setAccountStatus(account, 'active')}>{saving === key ? 'Restoring…' : 'Restore access'}</button>
                {:else if !account.isCurrentAccount}
                  <button class="px-4 py-2 border border-destructive/50 text-destructive rounded-lg font-semibold" disabled={saving === key} onclick={() => confirmingRemoval = key}>Remove access</button>
                {/if}
                <button class="px-4 py-2 border border-border rounded-lg font-semibold" disabled={saving === key || account.status === 'inactive'} onclick={() => saveAccount(account)}>{saving === key ? 'Saving…' : 'Save access settings'}</button>
              </div>
            </div>
            {#if confirmingRemoval === key}
              <div class="rounded-lg border border-destructive/40 bg-destructive/10 p-4" role="alertdialog" aria-labelledby={`remove-${account.id}`}>
                <p id={`remove-${account.id}`} class="font-semibold">Remove access for {account.displayName || account.email || 'this account'}?</p>
                <p class="mt-1 text-sm text-muted-foreground">They will lose Church Tracker access on their next protected request. Their account record and audit history are kept, and confidential access is cleared.</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button class="px-3 py-2 border border-border rounded-lg font-semibold" onclick={() => confirmingRemoval = ''}>Cancel</button>
                  <button class="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg font-semibold" disabled={saving === key} onclick={() => setAccountStatus(account, 'inactive')}>{saving === key ? 'Removing…' : 'Yes, remove access'}</button>
                </div>
              </div>
            {/if}
            {#if draft?.role === 'leader' && !draft?.personId}<p class="text-sm text-amber-600 dark:text-amber-300">A leader requires a linked person.</p>{/if}
          </article>
        {/each}
      </div>
    </section>

    <section class="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="password-help-heading">
      <h2 id="password-help-heading" class="text-xl font-semibold">Password help</h2>
      <p class="mt-2 text-sm text-muted-foreground max-w-3xl">Owners do not need to know or set anyone’s password. For an email/password account, the user chooses <strong class="text-foreground">Forgot password</strong> from the Church Tracker sign-in screen, then the sign-in service emails a reset link. Resetting the password does not change the person’s Church Tracker role or approval. Google accounts use Google’s own account recovery.</p>
      <button class="mt-4 px-4 py-2 border border-border rounded-lg font-semibold" onclick={() => goto('/')}>Back to dashboard</button>
    </section>
  </main>
{/if}
