<script>
  import { onMount } from 'svelte';
  import ServiceForm from '$lib/components/forms/ServiceForm.svelte';
  import MeetingForm from '$lib/components/forms/MeetingForm.svelte';
  import VisitationForm from '$lib/components/forms/VisitationForm.svelte';
  import GatheringAttendanceDialog from '$lib/components/crm/GatheringAttendanceDialog.svelte';
  import { request } from './client.js';
  import { resolveCommitment, completeTask } from '$lib/services/followUpCrmService.js';
  let state = $state(null), error = $state('');
  let serviceOpen=$state(false), meetingOpen=$state(false), careOpen=$state(false), actualOpen=$state(false);
  let editingCare=$state(null);
  const mappedPeople = $derived((state?.people || []).map(p => ({...p,id:p._id})));
  const guest = $derived(state?.people.find(p=>p._id===state.ids.person));
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
<main class="max-w-4xl mx-auto p-6 space-y-5">
  <h1 class="text-2xl font-bold">Task 04 isolated workflow checks</h1>
  <p>Test fixtures only · authenticated in-memory Convex · no real church database</p>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if state}
    <div class="flex flex-wrap gap-4">
      <button onclick={()=>serviceOpen=true}>Edit morning service</button>
      <button onclick={()=>actualOpen=true}>Resolve CRM attendance</button>
      <button onclick={()=>meetingOpen=true}>Record meeting</button>
      <button onclick={()=>{editingCare=null;careOpen=true;}}>Log care</button>
      {#if state.care.length}
        <button onclick={()=>{editingCare={...state.care[0],id:state.care[0]._id};careOpen=true;}}>Correct care</button>
        <button onclick={finishCare}>Complete next care task</button>
      {/if}
      <button onclick={refresh}>Refresh saved state</button>
    </div>
    <div aria-label="Saved results" class="space-y-2">
      <p>Named check-ins: {state.attendance.length} · Promises kept: {guest?.promises_kept || 0} · First visit: {guest?.first_visit_date || 'none'}</p>
      <p>Commitment: {state.commitments[0]?.resolution} · Date: {state.commitments[0]?.gathering_date}</p>
      <p>Care interactions: {state.care.length} · History entries: {state.history.length} · Open care tasks: {state.tasks.filter(t=>t.task_type==='member_care' && t.status==='open').length} · Completed care tasks: {state.tasks.filter(t=>t.task_type==='member_care' && t.status==='completed').length}</p>
      {#each state.services as service}<p>Service {service.service_time} on {service.service_date}: total {service.total_attendance}, unnamed {service.unnamed_attendance_count}</p>{/each}
      {#each state.meetings as meeting}<p>Meeting {meeting.meeting_date}: total {meeting.attendance_count}, unnamed {meeting.unnamed_guests_count}</p>{/each}
      {#each state.history as item}<p>History {item.follow_up_date}: {item.notes || item.outcome}</p>{/each}
    </div>
    <ServiceForm bind:isOpen={serviceOpen} service={{...state.services[0],id:state.services[0]._id}} onsave={refresh} />
    <MeetingForm bind:isOpen={meetingOpen} people={mappedPeople} initialOneOff={true} onsave={refresh} />
    <VisitationForm bind:isOpen={careOpen} visitation={editingCare} people={mappedPeople} initialPersonId={state.ids.person} onsave={refresh} />
    <GatheringAttendanceDialog bind:isOpen={actualOpen} gatheringDate="2026-08-02" personName="Browser Guest" onconfirm={resolve} />
  {/if}
</main>
