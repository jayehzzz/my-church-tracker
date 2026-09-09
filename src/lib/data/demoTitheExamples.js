/** Explicit fictional dated-giving scenarios for local demo data only.
 * Never infer recorded giving from a profile's static is_tither flag.
 */
export function addDemoTitheExamples(services, attendance) {
  const byId = new Map(services.map(s => [String(s.id), s]));
  const recordedMonths = new Set();
  const rows = [...attendance].sort((a,b) => (byId.get(String(a.service_id))?.service_date || '').localeCompare(byId.get(String(b.service_id))?.service_date || ''));
  for (const row of rows) {
    const service = byId.get(String(row.service_id));
    if (!service) continue;
    const key = `${row.person_id}:${service.service_date.slice(0,7)}`;
    const scenario = Number(row.person_id) % 4;
    const month = Number(service.service_date.slice(5,7));
    const scheduled = scenario === 1 || (scenario === 2 && month % 3 !== 0) || (scenario === 3 && month % 2 === 1);
    if (scheduled && !recordedMonths.has(key)) {
      row.gave_tithe = true;
      recordedMonths.add(key);
    }
  }
  for (const service of services) {
    const named = attendance.filter(r => String(r.service_id) === String(service.id) && r.gave_tithe === true).length;
    service.tithers_count = Math.max(service.tithers_count || 0, named);
    service.unnamed_tithers_count = service.tithers_count - named;
  }
}
