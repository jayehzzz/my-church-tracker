<script>
  import ReviewFeedback from './ReviewFeedback.svelte';
  const reviewFeedback = new URLSearchParams(window.location.search).get('fixture') === 'review-feedback';
  import { onMount } from 'svelte';
  import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
  import { personOptions } from '$lib/utils/personOptions.js';
  let inviter = $state('');
  import ExpectedGuests from '$lib/components/crm/ExpectedGuests.svelte';
  import { getDashboard } from '$lib/services/followUpCrmService.js';
  let guestRows = $state([]);
  let guestForecast = $state({});
  async function refreshGuests() { const result = await getDashboard({ serviceDate: '2026-10-18' }); guestRows = result.data?.guest_invitations || []; guestForecast = result.data?.attendance_forecast || {}; await refresh(); }
  import ServiceForm from '$lib/components/forms/ServiceForm.svelte';
  import MeetingForm from '$lib/components/forms/MeetingForm.svelte';
  import VisitationForm from '$lib/components/forms/VisitationForm.svelte';
  import GatheringAttendanceDialog from '$lib/components/crm/GatheringAttendanceDialog.svelte';
  import { request } from './client.js';
  import { resolveCommitment, completeTask } from '$lib/services/followUpCrmService.js';
  let state = $state(null), error = $state('');
  let serviceOpen=$state(false), meetingOpen=$state(false), careOpen=$state(false), actualOpen=$state(false);
  let editingCare=$state(null), newService=$state(false);
  const mappedPeople = $derived((state?.people || []).map(p => ({...p,id:p._id})));
  const guest = $derived(state?.people.find(p=>p._id===state.ids.person));
  const commitment = $derived(state?.commitments.find(c=>c._id===state.ids.commitment));
  async function refresh() { try {state=await request({kind:'state'});} catch(e){error=e.message;} }
  async function resolve(gathering) { const result=await resolveCommitment(state.ids.commitment,'attended',gathering); await refresh(); return result; }
  async function finishCare() {
    const next=state.care[0]?.next_task_id;
    const result=await completeTask(next,{outcome:'care_check_in',followUpDate:'2026-08-05',skipAutomaticNextTask:true});
    if(result.error) error=result.error.message;
    await refresh();
  }
  onMount(refresh);
</script>
{#if reviewFeedback}<ReviewFeedback />{:else}
<main class="max-w-4xl mx-auto p-6 space-y-5">
  <h1 class="text-2xl font-bold">Task 04 isolated workflow checks</h1>
  <p>Test fixtures only · authenticated in-memory Convex · no real church database</p>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if state}
    <div class="flex flex-wrap gap-4">
      <button onclick={()=>{newService=false;serviceOpen=true;}}>Edit morning service</button>
      <button onclick={()=>{newService=true;serviceOpen=true;}}>Record Sunday service</button>
      <button onclick={()=>actualOpen=true}>Resolve CRM attendance</button>
      <button onclick={()=>meetingOpen=true}>Record meeting</button>
      <button onclick={()=>{editingCare=null;careOpen=true;}}>Log care</button>
      {#if state.care.length}
        <button onclick={()=>{editingCare={...state.care[0],id:state.care[0]._id};careOpen=true;}}>Correct care</button>
        <button onclick={finishCare}>Complete next care task</button>
      {/if}
      <button onclick={refresh}>Refresh saved state</button>
    </div>
    <div class="max-w-md">
      <SearchableSelect label="Fixture inviter" membersFirst options={personOptions(mappedPeople)} bind:value={inviter} />
    </div>
    <div aria-label="Saved results" class="space-y-2">
      <p>Named check-ins: {state.attendance.length} · Promises kept: {guest?.promises_kept || 0} · First visit: {guest?.first_visit_date || 'none'}</p>
      <p>Commitment: {commitment?.resolution} · Date: {commitment?.gathering_date}</p>
      <p>Care interactions: {state.care.length} · History entries: {state.history.length} · Open care tasks: {state.tasks.filter(t=>t.task_type==='member_care' && t.status==='open').length} · Completed care tasks: {state.tasks.filter(t=>t.task_type==='member_care' && t.status==='completed').length}</p>
      {#each state.services as service}<p>Service {service.service_time} on {service.service_date}: total {service.total_attendance}, unnamed {service.unnamed_attendance_count}</p>{/each}
      {#each state.meetings as meeting}<p>Meeting {meeting.meeting_date}: total {meeting.attendance_count}, unnamed {meeting.unnamed_guests_count}</p>{/each}
      {#each state.history as item}<p>History {item.follow_up_date}: {item.notes || item.outcome}</p>{/each}
    </div>
    <ExpectedGuests rows={guestRows} serviceDate="2026-10-18" today="2026-10-19" canManage={true} forecast={guestForecast} onChanged={refreshGuests} />
    <ServiceForm bind:isOpen={serviceOpen} service={newService ? null : {...state.services[0],id:state.services[0]._id}} serviceRecords={state.services} onsave={refresh} />
    <MeetingForm bind:isOpen={meetingOpen} people={mappedPeople} initialOneOff={true} onsave={refresh} />
    <VisitationForm bind:isOpen={careOpen} visitation={editingCare} people={mappedPeople} initialPersonId={state.ids.person} onsave={refresh} />
    <GatheringAttendanceDialog bind:isOpen={actualOpen} gatheringDate="2026-08-02" personName="Browser Guest" onconfirm={resolve} />
  {/if}
</main>

{/if}
