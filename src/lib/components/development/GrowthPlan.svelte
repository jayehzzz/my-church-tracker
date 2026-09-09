<script>
  import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
  import * as peopleService from '$lib/services/peopleService.js';
  import { todayDate } from '$lib/utils/reportingMetrics.js';
  let { personId, agreements = [], reviews = [], people = [], allowed = false, onsave, dirty = $bindable(false) } = $props();
  let adding=$state(false), reviewing=$state(''), saving=$state(false), error=$state(''), draft=$state({}), review=$state({});
  const date = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'Not set';
  const name = id => { const p=people.find(p=>String(p.id||p._id)===String(id));return p?`${p.first_name} ${p.last_name}`:'Not assigned'; };
  const options=$derived(people.filter(p=>p.member_status!=='archived').map(p=>({value:p.id||p._id,label:`${p.first_name} ${p.last_name}`})));
  $effect(()=>{dirty=adding||Boolean(reviewing);});
  function add(){reviewing='';error='';draft={action:'',supportingPersonId:'',agreedDate:todayDate(),dueDate:'',nextReviewDate:'',notes:'',requestId:crypto.randomUUID()};adding=true;}
  function begin(a){adding=false;reviewing=a._id;error='';review={note:'',reviewDate:todayDate(),nextReviewDate:a.next_review_date>=todayDate()?a.next_review_date:'',status:a.status,requestId:crypto.randomUUID()};}
  function cancel(){adding=false;reviewing='';error='';}
  async function save(create){
    if(saving)return;error='';
    const item=agreements.find(a=>a._id===reviewing);
    const d=create?draft:review;
    if(!(create?d.action:d.note)?.trim()){error='Add the agreed action or progress note.';return;}
    const start=create?d.agreedDate:d.reviewDate;
    if(!start||start>todayDate()||(!create&&start<item.agreed_date)){error='Choose a valid conversation date, on or before today.';return;}
    if((d.dueDate&&d.dueDate<start)||(d.nextReviewDate&&d.nextReviewDate<start)){error='Due and next review dates must follow the conversation date.';return;}
    saving=true;
    try {const result=create?await peopleService.createGrowthAgreement(personId,draft):await peopleService.reviewGrowthAgreement(reviewing,review);if(result.error)throw result.error;cancel();await onsave?.();}
    catch(e){error=e.message||'Could not save. Your draft is still here.';}finally{saving=false;}
  }
</script>
<section class="plan">
  <div class="heading"><div><h2>Growth agreements</h2><p>Current agreements and review history, independent of the chart period.</p></div>{#if allowed&&!adding&&!reviewing}<button class="primary" onclick={add}>Add agreement</button>{/if}</div>
  {#if !allowed}<p class="empty">Growth agreements require confidential access.</p>{:else}
    {#if adding}<form onsubmit={e=>{e.preventDefault();save(true);}} aria-label="Add growth agreement"><h3>New agreement</h3><label>Agreed action<textarea bind:value={draft.action} required maxlength="1500" rows="2" disabled={saving} placeholder="What have you agreed to do?"></textarea></label><div class="fields"><SearchableSelect label="Supporting person" options={options} bind:value={draft.supportingPersonId} disabled={saving}/><label>Agreed on<input type="date" bind:value={draft.agreedDate} max={todayDate()} required disabled={saving}/></label><label>Due date<input type="date" bind:value={draft.dueDate} min={draft.agreedDate} disabled={saving}/></label><label>Next review date<input type="date" bind:value={draft.nextReviewDate} min={draft.agreedDate} disabled={saving}/></label></div><label>Support needed / notes<textarea bind:value={draft.notes} maxlength="3000" rows="3" disabled={saving}></textarea></label>{#if error}<p class="error" role="alert">{error}</p>{/if}<div class="actions"><button type="button" onclick={cancel} disabled={saving}>Cancel</button><button class="primary" disabled={saving}>{saving?'Saving…':'Save agreement'}</button></div></form>{/if}
    {#if !agreements.length&&!adding}<div class="empty"><h3>No agreements yet</h3><p>Add a practical next step agreed with this person, then record progress together.</p></div>{/if}
    {#each [...agreements].sort((a,b)=>b.created_at.localeCompare(a.created_at)) as item (item._id)}
      {@const history=reviews.filter(r=>r.agreement_id===item._id).sort((a,b)=>b.created_at.localeCompare(a.created_at))}
      <article><div class="heading"><h3>{item.action}</h3><span class="status">{item.status==='completed'?'Completed':'In progress'}</span></div><p class="meta">Supporting person: {name(item.supporting_person_id)}</p><dl><div><dt>Agreed</dt><dd>{date(item.agreed_date)}</dd></div><div><dt>Due</dt><dd>{date(item.due_date)}</dd></div><div><dt>Next review</dt><dd>{date(item.next_review_date)}</dd></div></dl>{#if item.notes}<p class="notes">{item.notes}</p>{/if}<p class="meta">Recorded by {item.created_by_name} · {date(item.created_at.slice(0,10))}</p>

      {#if history.length}<details><summary>Review history ({history.length})</summary>{#each history as entry}<div class="history"><strong>{date(entry.review_date)} · {entry.status==='completed'?'Completed':'In progress'}</strong><p class="notes">{entry.note}</p><p class="meta">{entry.created_by_name}{entry.next_review_date?` · Next review ${date(entry.next_review_date)}`:''}</p></div>{/each}</details>{/if}
      {#if reviewing===item._id}<form onsubmit={e=>{e.preventDefault();save(false);}} aria-label="Review growth agreement"><label>Progress note<textarea bind:value={review.note} required maxlength="3000" rows="3" disabled={saving}></textarea></label><div class="fields"><label>Review date<input type="date" bind:value={review.reviewDate} min={item.agreed_date} max={todayDate()} required disabled={saving}/></label><label>Next review date<input type="date" bind:value={review.nextReviewDate} min={review.reviewDate} disabled={saving}/></label><SearchableSelect label="Status" options={[{value:'in_progress',label:'In progress'},{value:'completed',label:'Completed'}]} bind:value={review.status} disabled={saving}/></div>{#if error}<p role="alert" class="error">{error}</p>{/if}<div class="actions"><button type="button" onclick={cancel} disabled={saving}>Cancel</button><button class="primary" disabled={saving}>{saving?'Saving…':'Save progress review'}</button></div></form>{:else if !adding&&!reviewing}<button class="review" onclick={()=>begin(item)}>Review progress</button>{/if}
      </article>
    {/each}
  {/if}
</section>
<style>
 .plan{padding:24px;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--card))}.heading{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}h2{font-size:17px;font-weight:600}h3{font-size:15px;font-weight:500;overflow-wrap:anywhere}p{font-size:13px;color:hsl(var(--muted-foreground));line-height:1.6;margin-top:6px}button{padding:9px 14px;border-radius:8px;font-size:13px}.primary{background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-weight:500}button:disabled{opacity:.6}.empty{padding:28px 0}form{border:1px solid hsl(var(--border));background:hsl(var(--background)/.3);padding:20px;margin-top:20px;border-radius:10px}form h3{margin-bottom:16px}label{display:flex;flex-direction:column;font-size:13px;gap:8px;margin-bottom:16px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;margin:20px 0}.fields label{margin:0}input,textarea{width:100%;min-width:0;border:1px solid hsl(var(--border));background:hsl(var(--background));border-radius:8px;padding:10px;font-size:13px;color:hsl(var(--foreground))}.actions{display:flex;justify-content:flex-end;gap:8px}.error{color:hsl(var(--destructive))}article{border-top:1px solid hsl(var(--border));padding:22px 0;margin-top:18px}.status{font-size:12px;background:hsl(var(--secondary));border-radius:6px;padding:5px 9px}.meta{font-size:12px}.notes{white-space:pre-wrap;overflow-wrap:anywhere}dl{display:flex;gap:28px;flex-wrap:wrap;font-size:12px;margin:15px 0}dt{color:hsl(var(--muted-foreground));margin-bottom:4px}.review{color:hsl(var(--primary));padding-left:0;margin-top:10px}details{margin-top:14px;font-size:13px}summary{cursor:pointer;color:hsl(var(--primary))}.history{border-left:2px solid hsl(var(--border));padding-left:14px;margin-top:16px}.history strong{font-size:12px;font-weight:500}@media(max-width:600px){.plan{padding:18px}form{padding:14px}.fields{grid-template-columns:1fr}input,textarea{font-size:16px}}
</style>
