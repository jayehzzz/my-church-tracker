export function toCount(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isGuest(person) {
  return ["guest", "visitor"].includes(person?.member_status)
    || (!person?.member_status && Boolean(person?.contact_date));
}

export function summarizeNamedAttendance(selectedPersonIds, metadata = {}, people = []) {
  const selected = selectedPersonIds instanceof Set
    ? [...selectedPersonIds]
    : [...(selectedPersonIds || [])];
  const peopleById = new Map(people.map((person) => [String(person.id || person._id), person]));

  return selected.reduce((summary, personId) => {
    const person = peopleById.get(String(personId));
    const personMetadata = metadata[personId] || {};
    summary.named += 1;
    if (isGuest(person)) summary.guests += 1;
    if (personMetadata.first_timer) summary.firstTimers += 1;
    if (personMetadata.made_salvation_decision) summary.salvationDecisions += 1;
    if (personMetadata.gave_tithe) summary.tithers += 1;
    return summary;
  }, { named: 0, guests: 0, firstTimers: 0, salvationDecisions: 0, tithers: 0 });
}

export function resolveServiceCounts(formData, namedSummary) {
  return {
    total_attendance: toCount(formData.total_attendance, namedSummary.named),
    guests_count: toCount(formData.guests_count, namedSummary.guests),
    salvation_decisions: toCount(formData.salvation_decisions, namedSummary.salvationDecisions),
    tithers_count: toCount(formData.tithers_count, namedSummary.tithers),
  };
}

export function validateServiceSetup(formData) {
  const errors = {};
  if (!formData.service_date) errors.service_date = "Service date is required";
  if (!formData.service_type) errors.service_type = "Service type is required";
  return errors;
}

export function validateServiceCounts(counts, namedSummary) {
  const errors = {};
  for (const [key, value] of Object.entries(counts)) {
    if (!Number.isInteger(value) || value < 0) errors[key] = "Enter a whole number of 0 or more";
  }

  if (counts.total_attendance < namedSummary.named) {
    errors.total_attendance = `Cannot be lower than ${namedSummary.named} named check-ins`;
  }
  if (counts.guests_count > counts.total_attendance) {
    errors.guests_count = "Guest count cannot exceed total attendance";
  } else if (counts.guests_count < namedSummary.guests) {
    errors.guests_count = `Cannot be lower than ${namedSummary.guests} named guests`;
  }
  if (counts.salvation_decisions > counts.total_attendance) {
    errors.salvation_decisions = "Decisions cannot exceed total attendance";
  } else if (counts.salvation_decisions < namedSummary.salvationDecisions) {
    errors.salvation_decisions = `Cannot be lower than ${namedSummary.salvationDecisions} named decisions`;
  }
  if (counts.tithers_count > counts.total_attendance) {
    errors.tithers_count = "Tithers cannot exceed total attendance";
  } else if (counts.tithers_count < namedSummary.tithers) {
    errors.tithers_count = `Cannot be lower than ${namedSummary.tithers} named tithers`;
  }
  if (counts.guests_count < namedSummary.firstTimers) {
    errors.guests_count = `Cannot be lower than ${namedSummary.firstTimers} named first timers`;
  }
  return errors;
}

export function buildAttendanceData(selectedPersonIds, metadata = {}) {
  return [...selectedPersonIds].map((personId) => {
    const personMetadata = metadata[personId] || {};
    return {
      person_id: personId,
      gave_tithe: Boolean(personMetadata.gave_tithe),
      made_salvation_decision: Boolean(personMetadata.made_salvation_decision),
      first_timer: Boolean(personMetadata.first_timer),
    };
  });
}
