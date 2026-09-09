<script>
  import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
  import { session } from "$lib/auth/session.js";
  import { isDemoMode } from "$lib/convex.js";
  import { addDiscipleshipReview } from "$lib/services/peopleService.js";
  import { todayDate } from "$lib/utils/reportingMetrics.js";
  let { person, onsave, dirty = $bindable(false) } = $props();
  const focusOptions = [
    ['getting_connected', 'Getting connected'], ['foundations', 'Building foundations'],
    ['growing_in_faith', 'Growing in faith'], ['serving', 'Serving'],
    ['preparing_to_lead', 'Preparing to lead'], ['leading', 'Leading'],
  ];
  let allowed = $derived(isDemoMode() || Boolean($session.user?.canViewConfidential));
  let editing = $state(false);
  $effect(() => { dirty = editing; });
  let saving = $state(false);
  let error = $state('');
  let draft = $state({});
  let reviews = $derived([...(person.discipleship_reviews || [])].reverse().sort((a, b) => b.conversation_date.localeCompare(a.conversation_date) || b.recorded_at.localeCompare(a.recorded_at)));
  let latest = $derived(reviews[0]);
  const focusLabel = value => focusOptions.find(([key]) => key === value)?.[1] || value;
  const date = value => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  function startReview() {
    draft = { focus: '', understanding: '', next_step: '', conversation_date: todayDate(), next_review_date: '' };
    error = '';
    editing = true;
  }
  async function save() {
    if (saving) return;
    if (!draft.focus || !draft.understanding.trim() || !draft.next_step.trim()) { error = 'Choose a focus, record the conversation and add an agreed next step.'; return; }
    if (!draft.conversation_date || draft.conversation_date > todayDate()) { error = 'Choose today or an earlier conversation date.'; return; }
    if (draft.next_review_date && draft.next_review_date < draft.conversation_date) { error = 'The next review must be on or after the conversation.'; return; }
    saving = true;
    error = '';
    try {
      const result = await addDiscipleshipReview(person.id || person._id, draft);
      if (result.error) throw result.error;
      onsave?.(result.data);
      editing = false;
    } catch (e) { error = e?.message || 'The review could not be saved. Your draft is still here.'; }
    finally { saving = false; }
  }
</script>

<section class="review-section" aria-label="Leader discipleship assessment">
  <div class="review-heading"><div><h3>Leader’s discipleship review</h3><p>A dated conversation about understanding, growth and an agreed next step.</p></div>{#if allowed && !editing}<button type="button" class="primary" onclick={startReview}>Record a review</button>{/if}</div>
  {#if !allowed}<p class="review-empty">Pastoral reviews require confidential access. Participation records remain available above.</p>
  {:else if editing}
    <form onsubmit={(event) => { event.preventDefault(); save(); }}>
      <div class="form-grid">
        <SearchableSelect label="Journey focus" options={focusOptions.map(([value,label])=>({value,label}))} bind:value={draft.focus} required disabled={saving} placeholder="Choose a focus"/>
        <label>Conversation date<input type="date" bind:value={draft.conversation_date} max={todayDate()} required disabled={saving} /></label>
      </div>
      <label>Understanding & growth<textarea bind:value={draft.understanding} maxlength="3000" rows="4" required disabled={saving} placeholder="What did the person share? What do they understand, and where would support help?"></textarea></label>
      <label>Agreed next step<textarea bind:value={draft.next_step} maxlength="1500" rows="3" required disabled={saving} placeholder="Record a practical next step agreed with the person."></textarea></label>
      <label>Next review date (optional)<input type="date" bind:value={draft.next_review_date} min={draft.conversation_date} disabled={saving} /></label>
      {#if error}<p role="alert" class="error">{error}</p>{/if}
      <p class="hint">Saving adds a review to this profile’s history. It does not change their membership or leadership role.</p>
      <div class="form-actions"><button type="button" disabled={saving} onclick={() => editing = false}>Cancel</button><button type="submit" class="primary" disabled={saving}>{saving ? 'Saving…' : 'Save review'}</button></div>
    </form>
  {:else if latest}
    <div class="review-meta"><span class="focus">{focusLabel(latest.focus)}</span><span>Conversation: {date(latest.conversation_date)} · Recorded by {latest.recorded_by_name} on {date(latest.recorded_at)}</span></div>
    <h4>Understanding & growth</h4><p class="review-text">{latest.understanding}</p>
    <h4>Agreed next step</h4><p class="review-text">{latest.next_step}</p>
    {#if latest.next_review_date}<p class="next-review">Next review: {date(latest.next_review_date)}</p>{/if}
    {#if reviews.length > 1}<details class="past-reviews"><summary>Earlier reviews ({reviews.length - 1})</summary>{#each reviews.slice(1) as review}<article><h4>{focusLabel(review.focus)} · {date(review.conversation_date)}</h4><p class="hint">Recorded by {review.recorded_by_name} on {date(review.recorded_at)}</p><p class="review-text">{review.understanding}</p><h4>Agreed next step</h4><p class="review-text">{review.next_step}</p>{#if review.next_review_date}<p>Next review: {date(review.next_review_date)}</p>{/if}</article>{/each}</details>{/if}
  {:else}<p class="review-empty">No discipleship review recorded yet. Start with a conversation, then record the person’s understanding and an agreed next step.</p>{/if}
</section>
<style>
  .review-section { border: 1px solid hsl(var(--border)); border-radius: 12px; padding: 20px; margin: 0 0 24px; background: hsl(var(--background) / .35); } .review-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; } h3 { font-weight: 600; font-size: 15px; } h4 { font-weight: 500; font-size: 13px; margin-top: 16px; } p { color: hsl(var(--muted-foreground)); line-height: 1.6; font-size: 13px; margin-top: 6px; } button { padding: 9px 14px; border-radius: 8px; font-size: 13px; } .primary { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-weight: 500; } button:disabled { opacity: .6; }
  .review-empty { margin-top: 16px; } .review-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 12px; margin-top: 20px; color: hsl(var(--muted-foreground)); } .focus { background: hsl(var(--primary) / .12); color: hsl(var(--primary)); padding: 5px 8px; border-radius: 6px; } .review-text { white-space: pre-wrap; overflow-wrap: anywhere; } .next-review { margin-top: 16px; } .past-reviews { margin-top: 20px; font-size: 13px; } summary { cursor: pointer; color: hsl(var(--primary)); } article { border-top: 1px solid hsl(var(--border)); padding-top: 8px; margin-top: 16px; }
  form { margin-top: 20px; } .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; } label { display: flex; flex-direction: column; gap: 8px; font-size: 13px; margin-bottom: 16px; } input, textarea { background: hsl(var(--background)); border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 10px; font-size: 13px; min-width: 0; width: 100%; } .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; } .hint { font-size: 12px; } .error { color: hsl(var(--destructive)); }
  @media(max-width: 600px) { .form-grid { grid-template-columns: 1fr; gap: 0; } }
</style>
