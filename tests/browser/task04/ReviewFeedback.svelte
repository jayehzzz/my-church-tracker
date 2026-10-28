<script>
  import WeeklyAttendanceMatrix from '$lib/components/charts/WeeklyAttendanceMatrix.svelte';
  import ServiceDrilldown from '$lib/components/drilldown/ServiceDrilldown.svelte';
  import { openDrilldown } from '$lib/components/drilldown/selection.js';
  import { periodServiceSelection } from '$lib/components/drilldown/serviceSelection.js';
  const people = [
    { id: 'member', first_name: 'Practice Member', member_status: 'member', membership_date: '2026-09-01' },
    { id: 'leader', first_name: 'Practice Leader', member_status: 'leader', membership_date: '2026-09-01' },
    { id: 'guest', first_name: 'Practice Guest', member_status: 'guest' },
  ];
  const services = [
    { id: 'sun1', service_type: 'sunday_service', service_date: '2026-09-06', total_attendance: 3, guests_count: 1, individuals: ['member', 'leader', 'guest'] },
    { id: 'special', service_type: 'special_service', service_date: '2026-09-09', total_attendance: 3, guests_count: 2, sermon_topic: 'Practice Special Service', individuals: ['leader', 'guest'] },
    { id: 'sun2', service_type: 'sunday_service', service_date: '2026-09-13', total_attendance: 1, guests_count: 0, individuals: ['leader'] },
    { id: 'sun3', service_type: 'sunday_service', service_date: '2026-09-20', total_attendance: 1, guests_count: 0, individuals: ['leader'] },
  ];
  const attendance = [
    { service_id: 'sun1', person_id: 'guest', first_timer: true },
    { service_id: 'special', person_id: 'guest', first_timer: false },
  ];
  const commitments = [{ person_id: 'member', gathering_type: 'sunday_service', gathering_date: '2026-09-13', response: 'yes', resolution: 'no_show' }];
  let drilldown = $state(null);
  let openedProfile = $state('');
</script>
<main class="mx-auto max-w-6xl space-y-5 p-6">
  <h1 class="text-2xl font-semibold">Practice review checks</h1>
  <p>Isolated fixtures · no church database writes</p>
  <button class="rounded-lg bg-primary px-3 py-2" onclick={() => drilldown = openDrilldown({ kind: 'selection', title: 'Non-member visits', selection: periodServiceSelection('guests', services) })}>Inspect non-member people</button>
  {#if openedProfile}<p role="status">Opened profile: {openedProfile}</p>{/if}
  <WeeklyAttendanceMatrix {services} {people} {commitments} />
  <ServiceDrilldown bind:state={drilldown} {services} {people} {attendance} onprofile={id => { openedProfile = id; drilldown = null; }} />
</main>
