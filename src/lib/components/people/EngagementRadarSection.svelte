<script>
  import EngagementRadar from "$lib/components/charts/EngagementRadar.svelte";
  import { buildParticipationProfile, isChurchWorker } from "$lib/utils/participationProfile.js";
  import { formatChurchSchool } from "$lib/utils/personMetrics.js";
  import DiscipleshipReview from "./DiscipleshipReview.svelte";
  let { person, attendanceHistory = [], outreachContacts = [], errors = {}, onreview } = $props();
  let weeks = $state(12);
  let selected = $state('sunday');
  let profile = $derived(buildParticipationProfile({ attendance: attendanceHistory, contacts: outreachContacts, person, errors, weeks }));
  let active = $derived(profile.axes.find(axis => axis.key === selected) || profile.axes[0]);
  const date = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<details class="participation" open={person.member_status === "member" || isChurchWorker(person)}>
  <summary><span>Participation & discipleship</span><span class="scope">For members and emerging leaders</span></summary>
  <div class="participation-body">
    <div class="intro"><div><h2>A starting point for a pastoral conversation</h2><p>See patterns in recorded participation, then discuss the person’s understanding, circumstances and next steps with them.</p></div><label>Period<select bind:value={weeks}><option value={12}>Last 12 completed weeks</option><option value={24}>Last 24 completed weeks</option></select></label></div>
    <p class="period">{date(profile.period.start)} – {date(profile.period.end)}</p>
    <div class="radar-layout">
      <div><h3>Attendance rhythm</h3><EngagementRadar axes={profile.axes} max={weeks} bind:selected /><p class="chart-note">Each ring counts weeks with recorded attendance. Multiple meetings in one week count as one week. This is frequency, with no overall score or ranking.</p></div>
      <div>
        <div class="evidence" aria-live="polite"><h3>{active.label}</h3><p class="metric">{active.weeks === null ? 'Unavailable' : `${active.weeks} of ${weeks} weeks`}</p><p>{active.events === null ? 'Attendance history could not be loaded.' : `${active.events} recorded attendance${active.events === 1 ? '' : 's'} in this period.`}</p>{#if active.lastDate}<p>Latest: {date(active.lastDate)}</p>{/if}</div>
        <dl class="axis-list">{#each profile.axes as axis}<div><dt>{axis.label}</dt><dd>{axis.weeks === null ? 'Unavailable' : `${axis.weeks} week${axis.weeks === 1 ? '' : 's'}`}</dd></div>{/each}</dl>
        <p class="chart-note">Fewer recorded weeks may reflect the meeting schedule or missing records. The chart does not calculate attendance against meetings offered.</p>
      </div>
    </div>
    <DiscipleshipReview {person} onsave={onreview} />
    <div class="context-grid">
      <section><h3>Inviting people</h3><p class="metric">{profile.invitations === null ? 'Unavailable' : `${profile.invitations.people} linked contact${profile.invitations.people === 1 ? '' : 's'}`}</p><p>{profile.invitations === null ? 'Outreach history could not be loaded.' : `Recorded across ${profile.invitations.weeks} week${profile.invitations.weeks === 1 ? '' : 's'} in this period.`}</p><p class="chart-note">Uses contacts linked to this person as inviter, dated by first contact. Repeat invitations and whether someone attended are separate from this count.</p>{#if profile.invitations?.undated}<p>{profile.invitations.undated} undated contacts excluded.</p>{/if}</section>
      <section><h3>Tithing</h3><p class="metric">{profile.tithing === null ? 'Unavailable' : profile.tithing.dates.length ? `${profile.tithing.dates.length} recorded date${profile.tithing.dates.length === 1 ? '' : 's'}` : 'No giving dates recorded'}</p>{#if profile.tithing?.dates.length}<p>Across {profile.tithing.months} calendar month{profile.tithing.months === 1 ? '' : 's'} in this period.</p><details class="giving-dates"><summary>View recorded dates</summary><ul>{#each profile.tithing.dates as value}<li>{date(value)}</li>{/each}</ul></details>{/if}<p>Profile tither status: {person.is_tither === true ? 'Yes' : person.is_tither === false ? 'No' : 'Not recorded'}.</p><p class="chart-note">Giving follows its own rhythm, so it is shown separately from weekly attendance. Only explicit tithe records are counted; missing records do not establish that someone did not give.</p></section>
      <section><h3>Learning & understanding</h3><p class="metric">{profile.schools.length} school{profile.schools.length === 1 ? '' : 's'} completed</p>{#if profile.schools.length}<ul>{#each profile.schools as school}<li>{formatChurchSchool(school)}</li>{/each}</ul>{:else}<p>No completed church schools recorded.</p>{/if}<p class="chart-note">These are recorded milestones. Understanding and spiritual growth need a conversation with the person; they are not inferred from attendance, giving or school completion.</p></section>
    </div>
  </div>
</details>
<style>
  .participation { border: 1px solid hsl(var(--border)); background: hsl(var(--card)); border-radius: 14px; overflow: hidden; } .participation > summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 20px 24px; cursor: pointer; font-weight: 600; font-size: 16px; } .participation > summary::before { content: '+'; color: hsl(var(--primary)); } .participation[open] > summary::before { content: '−'; } .scope { margin-left: auto; font-weight: 400; color: hsl(var(--muted-foreground)); font-size: 12px; }
  .participation-body { padding: 0 24px 24px; } .intro { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; border-top: 1px solid hsl(var(--border)); padding-top: 20px; } .intro > div { max-width: 520px; } h2 { font-size: 15px; font-weight: 500; } h3 { font-size: 14px; font-weight: 600; } p { font-size: 13px; color: hsl(var(--muted-foreground)); line-height: 1.6; margin-top: 6px; } label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: hsl(var(--muted-foreground)); } select { background: hsl(var(--background)); color: hsl(var(--foreground)); border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 8px; max-width: 100%; } .period { margin-top: 16px; font-size: 12px; }
  .radar-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 0; } .evidence { border: 1px solid hsl(var(--primary) / .25); border-radius: 10px; background: hsl(var(--primary) / .04); padding: 20px; } .metric { color: hsl(var(--foreground)); font-size: 20px; font-weight: 600; line-height: 1.3; margin-top: 10px; } .axis-list { margin: 16px 0; font-size: 13px; } .axis-list > div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid hsl(var(--border)); } dt { color: hsl(var(--muted-foreground)); } dd { white-space: nowrap; } .chart-note { font-size: 12px; }
  .context-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid hsl(var(--border)); padding-top: 24px; gap: 24px; } section { min-width: 0; } ul { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 8px; } li { padding: 4px 0; } .giving-dates { margin-top: 8px; font-size: 12px; } .giving-dates summary { cursor: pointer; color: hsl(var(--primary)); }
  @media(max-width: 800px) { .radar-layout, .context-grid { grid-template-columns: 1fr; } .scope { margin-left: 0; } .participation > summary { padding: 20px; } .participation-body { padding: 0 20px 20px; } .context-grid section + section { border-top: 1px solid hsl(var(--border)); padding-top: 20px; } }
</style>
