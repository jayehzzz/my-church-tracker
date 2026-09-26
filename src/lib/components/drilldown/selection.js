/**
 * Shared chart callback contract. A callback receives its legacy first argument
 * and this object second. `choices` holds every series represented by the hit
 * area; `selectedRole` is null when the hit area spans A and B. Consumers must
 * choose a role before displaying a contribution list in that case.
 *
 * A choice has domain, metricKey, mode, role, seriesId, personId, programmeId,
 * value, pointBounds, scopeBounds, sourceIds and sourcePoints. Source points are
 * the original loaded rows, not fabricated people or averaged bucket values.
 */
export function pointBounds(point) {
  return { startDate: point.bucketStart || point.date, endDate: point.bucketEnd || point.date };
}

export function sourcePoints(point) {
  return point.sourcePoints || (point ? [point] : []);
}

export function createChoice({ domain, metricKey, mode = 'total', role = 'A', seriesId = null,
  personId = null, programmeId = null, point = null, value = null, scopeBounds = null, filters = {} }) {
  const rows = point ? sourcePoints(point) : [];
  return {
    domain, metricKey, mode, role, seriesId, personId, programmeId, value,
    pointBounds: point ? pointBounds(point) : null,
    scopeBounds: scopeBounds || (point ? pointBounds(point) : null),
    filters: { ...filters },
    sourceIds: point?.sourceIds || rows.flatMap(row => row.sourceIds || [row.id ?? row._id]).filter(id => id != null),
    sourcePoints: rows,
  };
}

export function createSelection(choices, selectedRole = null) {
  const available = choices.filter(Boolean);
  if (!available.some(choice => choice.role === selectedRole)) selectedRole = available.length === 1 ? available[0].role : null;
  return { choices: available, selectedRole };
}

export function selectedChoice(selection, role = selection?.selectedRole) {
  return selection?.choices.find(choice => choice.role === role) || null;
}

/** Immutable navigation frames allow a single dialog to replace its content. */
export function openDrilldown(view, origin = null) {
  return { current: { ...view, scrollTop: 0, focusKey: null }, history: [], origin };
}
export function pushDrilldown(state, view, { scrollTop = 0, focusKey = null } = {}) {
  return { ...state, history: [...state.history, { ...state.current, scrollTop, focusKey }], current: { ...view, scrollTop: 0, focusKey: null } };
}
export function backDrilldown(state) {
  if (!state?.history.length) return state;
  return { ...state, current: state.history.at(-1), history: state.history.slice(0, -1) };
}
