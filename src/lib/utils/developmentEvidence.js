import { todayDate } from './reportingMetrics.js';
export const dateKey = value => String(value || '').slice(0, 10);
export const validDate = value => { const key = dateKey(value); const date = new Date(`${key}T00:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key; };
export const inRange = (date, range) => validDate(date) && dateKey(date) >= range.from && dateKey(date) <= range.to;
const monday = value => { const d = new Date(`${dateKey(value)}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return dateKey(d.toISOString()); };
export function developmentPeriod(mode = 'three', now = new Date()) {
  const year = now.getFullYear(), month = now.getMonth();
  const iso = d => d.toISOString().slice(0, 10);
  return mode === 'month' ? { from: iso(new Date(Date.UTC(year, month, 1))), to: todayDate(now) }
    : { from: iso(new Date(Date.UTC(year, month - (mode === 'six' ? 6 : 3), 1))), to: iso(new Date(Date.UTC(year, month, 0))) };
}
export function monthsInRange(range, now = new Date(), coverageStart = '') {
  if (!validDate(range.from) || !validDate(range.to) || range.from > range.to) return [];
  const months = [], cursor = new Date(`${range.from.slice(0, 7)}-01T00:00:00Z`);
  while (dateKey(cursor.toISOString()) <= range.to && months.length < 120) {
    const start = dateKey(cursor.toISOString()), month = start.slice(0, 7);
    const next = new Date(cursor); next.setUTCMonth(next.getUTCMonth() + 1);
    const end = dateKey(new Date(next.getTime() - 86400000).toISOString());
    const complete = start >= range.from && end <= range.to && end < todayDate(now);
    const covered = !coverageStart || start >= coverageStart;
    months.push({ month, start, end, complete: complete && covered, reason: !covered ? 'Before recorded history' : !complete ? 'Partial month' : '' });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}
export const monthRange = (range, now = new Date()) => monthsInRange(range, now).filter(m => m.complete).map(m => m.month);
export const developmentCategories = [{ key: 'sunday', label: 'Sunday services', shortLabel: 'Sunday' }, { key: 'prayer', label: 'Prayer meetings', shortLabel: 'Prayer' }, { key: 'bacenta', label: 'Bacenta meetings', shortLabel: 'Bacenta' }, { key: 'workers', label: 'Workers’ meetings', shortLabel: 'Workers' }];
export function developmentEvidence(profile, range, selectedPrograms = null, now = new Date()) {
  const selected = selectedPrograms === null ? null : new Set(selectedPrograms.map(String));
  const all = [...new Map((profile.opportunities || []).filter(g => inRange(g.date, range) && g.date <= todayDate(now) && g.status !== 'cancelled').map(g => [g.id, g])).values()];
  const opportunities = all.filter(g => !selected || selected.has(g.program_id));
  const raw = profile.attendance || [...(profile.serviceAttendance || []), ...(profile.meetingAttendance || [])];
  const presentIds = new Set(raw.filter(r => r.present === true).map(r => String(r.event_id)));
  function calculate(gatherings) {
    const known = gatherings.filter(g => g.register_known), attended = known.filter(g => presentIds.has(g.id));
    return { meetings: { attended: attended.length, offered: known.length }, weeks: { attended: new Set(attended.map(g => monday(g.date))).size, offered: new Set(known.map(g => monday(g.date))).size }, unknown: gatherings.length - known.length };
  }
  const axes = developmentCategories.map(axis => ({ ...axis, ...calculate(opportunities.filter(g => g.category === axis.key)) }));
  const programmes = [...new Map(all.filter(g => developmentCategories.some(a => a.key === g.category)).map(g => [g.program_id, { id: g.program_id, label: g.name, category: g.category }])).values()].sort((a,b) => a.label.localeCompare(b.label));
  const breakdown = programmes.filter(p => !selected || selected.has(p.id)).map(p => ({ ...p, ...calculate(opportunities.filter(g => g.program_id === p.id)) }));
  // Giving is independent of the selected attendance programmes and of attendance status.
  const gatheringById = new Map((profile.opportunities || []).map(g => [g.id, g]));
  const titheDates = [...new Set(raw.filter(r => r.gave_tithe === true).map(r => gatheringById.get(String(r.event_id))).filter(g => g && g.status !== 'cancelled' && inRange(g.date, range) && g.date <= todayDate(now)).map(g => g.date))].sort();
  const historyIds = new Set(raw.filter(r => r.present === true || r.gave_tithe === true).map(r => String(r.event_id)));
  const historyStart = (profile.opportunities || []).filter(g => historyIds.has(g.id) && g.status !== 'cancelled' && validDate(g.date) && g.date <= todayDate(now)).map(g => g.date).sort()[0] || '';
  const months = monthsInRange(range, now, historyStart).map(m => ({ ...m, complete: m.complete && Boolean(historyStart), reason: historyStart ? m.reason : 'Recorded history unavailable', dates: titheDates.filter(d => d.startsWith(m.month)) }));
  const eligible = months.filter(m => m.complete);
  const invited = [...new Map((profile.invitedPeople || []).map(p => [p.id, p])).values()];
  const cohort = invited.map(p => ({ ...p, dates: [...new Set(p.service_dates || [])].filter(d => validDate(d) && d <= todayDate(now)).sort() })).filter(p => p.dates.length && inRange(p.dates[0], range));
  return { axes, programmes, breakdown, tithing: { months, recorded: eligible.filter(m => m.dates.length).length, eligible: eligible.length, available: profile.givingAvailable !== false },
    outreach: { collected: new Set((profile.collectedContacts || []).filter(c => inRange(c.contact_date, range)).map(c => c.id)).size, brought: cohort.length, returned: cohort.filter(p => p.dates.some(d => d > p.dates[0] && inRange(d, range))).length, complete: profile.outreachComplete !== false } };
}
