import { developmentPeriod } from '../utils/developmentEvidence.js';

/** Authored fictional outreach scenarios, used only when generating local demo data.
 * Counts are still calculated from collector/inviter links and actual demo attendance rows.
 */
export function addDemoOutreachExamples(people, services, attendance, contacts, now = new Date()) {
  const range = developmentPeriod('three', now);
  const sundays = services.filter(s => s.service_date >= range.from && s.service_date <= range.to
    && (s.service_type === 'sunday_service' || (s.service_type === 'special_service' && new Date(`${s.service_date}T00:00:00Z`).getUTCDay() === 0)))
    .sort((a,b) => a.service_date.localeCompare(b.service_date));
  const leaders = ['1','2'].map(id => people.find(p => String(p.id) === id));
  if (sundays.length < 2 || leaders.some(p => !p)) return;
  const names = [['Maya','Ellis'],['Noah','Reid'],['Chloe','Clarke'],['Ethan','Brooks'],['Amelia','Reed'],['Lucas','Hayes'],['Isabel','Grant'],['Leo','Bennett']];
  let nameIndex = 0;
  for (let leaderIndex=0; leaderIndex<leaders.length; leaderIndex++) {
    const leader = leaders[leaderIndex];
    const total = leaderIndex === 0 ? 5 : 3;
    for (let i=0; i<total; i++) {
      const id = `mock-outreach-${range.from}-${leader.id}-${i}`;
      const [first_name,last_name] = names[nameIndex++];
      if (contacts.some(c => c.id === id)) continue;
      const firstIndex = Math.min(sundays.length-2, Math.floor(i*sundays.length/total));
      const first = sundays[firstIndex];
      const visits = i < (leaderIndex === 0 ? 2 : 1) ? 2 : i < (leaderIndex === 0 ? 3 : 2) ? 1 : 0;
      // The final contact in each scenario was collected by the other worker.
      const collector = i === total-1 ? leaders[1-leaderIndex] : leader;
      const contact = { id, first_name, last_name, member_status:'guest',status:'guest',
        contact_date:first.service_date,contact_method:'in_person',response:'responsive',
        collected_by_id:collector.id,invited_by_id:leader.id,attended_church:visits>0,
        ...(visits ? {first_visit_date:first.service_date} : {}),
        notes:'Fictional outreach example for testing participation and first/return visit counts.',
        created_at:`${first.service_date}T08:00:00Z` };
      contacts.push(contact);
      for (let visit=0;visit<visits;visit++) {
        const service=sundays[firstIndex+visit];
        attendance.push({id:`${id}-visit-${visit}`,person_id:id,service_id:service.id,
          first_timer:visit===0,created_at:`${service.service_date}T09:30:00Z`});
        service.individuals=[...(service.individuals||[]),id];
        service.total_attendance=(service.total_attendance||0)+1;
        service.guests_count=(service.guests_count||0)+1;
      }
    }
  }
  contacts.sort((a,b) => (b.contact_date||'').localeCompare(a.contact_date||''));
}
