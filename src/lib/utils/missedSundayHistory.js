function shiftDate(value, amount) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function completedSundayWindow(today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(today || ""))) return { start: "", end: "" };
  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const daysSinceSunday = weekday === 0 ? 7 : weekday;
  const end = shiftDate(today, -daysSinceSunday);
  return { start: shiftDate(end, -21), end };
}

export function recentMissedSundayPeople(people = [], today) {
  const { start, end } = completedSundayWindow(today);
  if (!start) return [];
  return people.filter(person => (person.missed_sundays || []).some(commitment =>
    commitment.gathering_date >= start && commitment.gathering_date <= end,
  ));
}
