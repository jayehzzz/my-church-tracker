<script>
  import FullscreenWrapper from '../FullscreenWrapper.svelte';
  import AttendanceTrend from '../../charts/AttendanceTrend.svelte';
</script>
<FullscreenWrapper title="Attendance test">
  <AttendanceTrend title="Attendance test" data={[
    {date:'2026-09-06',total:20,guests:4},
    {date:'2026-09-13',total:40,guests:6}
  ]} comparisonOptions={[{key:'guests',label:'Guests'}]} />
</FullscreenWrapper>
