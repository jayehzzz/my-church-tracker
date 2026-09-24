import { todayDate } from './reportingMetrics.js';

export const roundedAverage = (total, count) => total != null && count > 0 ? Math.round(total / count * 10) / 10 : null;

// Keep exact totals for calculations, but show people and attendance as whole counts.
export const wholeCountAverage = (total, count) => total != null && count > 0 ? Math.round(total / count) : null;

// Include zero-record calendar months; future months are not evidence of zero activity.
export function completeMonthlySeries(data = [], range = {}, today = todayDate()) {
  const keyed = new Map(data.map(row => [`${row.year}-${String(row.month).padStart(2, '0')}`, row]));
  const keys = [...keyed.keys()].sort();
  const start = range.startDate?.slice(0, 7) || keys[0];
  const end = [range.endDate?.slice(0, 7) || keys.at(-1), today.slice(0, 7)].filter(Boolean).sort()[0];
  if (!start || !end || start > end) return [];
  const rows = [];
  let [year, month] = start.split('-').map(Number);
  while (`${year}-${String(month).padStart(2, '0')}` <= end) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    rows.push(keyed.get(key) || { year, month: String(month), count: 0, saved: 0, visited: 0, joined: 0 });
    month++;
    if (month === 13) { month = 1; year++; }
  }
  return rows;
}

/** Calendar months intersecting the reporting window, including empty and partial months. */
export function reportingMonths(range = {}, dates = [], today = todayDate()) {
  const sorted = dates.filter(Boolean).map(date => String(date).slice(0, 10)).sort();
  const start = range.startDate || sorted[0];
  const end = [range.endDate || sorted.at(-1), today].filter(Boolean).sort()[0];
  if (!start || !end || start > end) return 0;
  return (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12
    + Number(end.slice(5, 7)) - Number(start.slice(5, 7)) + 1;
}

export function reportingDays(range = {}, today = todayDate()) {
  const start = range.startDate;
  const end = [range.endDate || today, today].sort()[0];
  if (!start || start > end) return 0;
  return Math.floor((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1;
}
