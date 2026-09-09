<script>
  import { Button } from "$lib/components/ui";
  import { formatChurchRole, formatChurchSchool, formatDegreeStatus, normalizeCompletedSchools } from "$lib/utils/personMetrics.js";
  let { person, currentAge, isGuest, onEdit, onMerge } = $props();
  const schools = $derived(normalizeCompletedSchools(person.completed_schools || []));
  const label = (value) => value ? String(value).replaceAll("_", " ") : "Not recorded";
  const yesNo = (value) => value === true ? "Yes" : value === false ? "No" : "Not recorded";
  function date(value) {
    if (!value) return "Not recorded";
    return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  let personal = $derived([
    ["Birthday", date(person.birthday || person.date_of_birth)],
    ["Age", currentAge === null ? "Not recorded" : `${currentAge} years`],
    ["Gender", label(person.gender)], ["Marital status", label(person.marital_status)],
    ["Employment", label(person.employment_status)], ["Degree", person.degree_status ? formatDegreeStatus(person.degree_status) : "Not recorded"],
  ]);
  let church = $derived([
    ["Church role", person.church_role ? formatChurchRole(person.church_role) : "Not recorded"],
    ["Membership date", date(person.membership_date)], ["Baptised", yesNo(person.is_baptised)],
    ["Tithing", yesNo(person.is_tither)], ["Basontas", person.basontas?.length ? person.basontas.map(label).join(", ") : "None recorded"],
  ]);
</script>

<div class="details-heading"><div><h2>Personal & church details</h2><p>Background information recorded for this person.</p></div><Button variant="secondary" onclick={onEdit}>Edit details</Button></div>
<div class="details-grid">
  <section><h3>Personal information</h3><dl>{#each personal as [name, value]}<div><dt>{name}</dt><dd>{value}</dd></div>{/each}</dl></section>
  <section><h3>Church information</h3><dl>{#each church as [name, value]}<div><dt>{name}</dt><dd>{value}</dd></div>{/each}</dl></section>
  <section><h3>Church schools</h3>{#if schools.length}<ul>{#each schools as school}<li>✓ {formatChurchSchool(school)}</li>{/each}</ul>{:else}<p>No completed church schools recorded.</p>{/if}</section>
  <section><h3>{isGuest ? "Guest information" : "How they connected"}</h3><dl>
    <div><dt>First visit</dt><dd>{date(person.first_visit_date)}</dd></div>
    <div><dt>Invited by</dt><dd>{#if person.invited_by_id}<a href="/people/{encodeURIComponent(person.invited_by_id)}">{person.invited_by || "View inviter"} →</a>{:else}{person.invited_by || "Not recorded"}{/if}</dd></div>
    <div><dt>Contact preference</dt><dd>{label(person.contact_category)}</dd></div>
    {#if person.follow_up_status}<div><dt>Follow-up status</dt><dd>{label(person.follow_up_status)}</dd></div>{/if}
  </dl></section>
  <section class="notes"><div class="section-heading"><h3>Notes</h3><button type="button" onclick={onEdit}>Edit notes</button></div><p class="notes-text">{person.notes || "No notes recorded."}</p></section>
</div>
{#if onMerge}<details class="record-tools"><summary>Record management</summary><p>Review a duplicate record and choose which profile to keep.</p><Button variant="secondary" onclick={onMerge}>Merge duplicate</Button></details>{/if}

<style>
  .details-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; } h2 { font-size: 18px; font-weight: 600; } h3 { font-size: 15px; font-weight: 600; margin-bottom: 16px; } p { font-size: 13px; color: hsl(var(--muted-foreground)); line-height: 1.6; }
  .details-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; } section { border: 1px solid hsl(var(--border)); border-radius: 12px; padding: 24px; background: hsl(var(--card)); min-width: 0; }
  dl > div { display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid hsl(var(--border) / .6); font-size: 13px; } dl > div:last-child { border: 0; } dt { color: hsl(var(--muted-foreground)); } dd { text-transform: capitalize; overflow-wrap: anywhere; }
  a, .section-heading button { color: hsl(var(--primary)); } a:hover, button:hover { text-decoration: underline; } li { padding: 6px 0; font-size: 13px; }
  .notes { grid-column: 1 / -1; } .section-heading { display: flex; justify-content: space-between; gap: 12px; } .section-heading button { font-size: 13px; align-self: flex-start; } .notes-text { white-space: pre-wrap; overflow-wrap: anywhere; }
  .record-tools { margin-top: 24px; border-top: 1px solid hsl(var(--border)); padding-top: 20px; font-size: 13px; } summary { cursor: pointer; color: hsl(var(--muted-foreground)); } .record-tools p { margin: 16px 0 12px; }
  @media(max-width: 700px) { .details-grid { grid-template-columns: 1fr; } section { padding: 20px; } }
</style>
