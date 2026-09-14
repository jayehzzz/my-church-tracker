function recordId(record) {
  return String(record?.id ?? record?._id ?? record ?? "");
}

function countValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function isGuestStatus(person) {
  return ["contact", "guest", "visitor"].includes(person?.member_status);
}

/**
 * Reconcile a service's stored headline counts with its named attendance rows.
 * Older/imported records can have zero headline guest/tither counts while the
 * attendance rows already prove those visits happened. Headline analytics must
 * never contradict the underlying named records.
 */
export function serviceAttendanceMetrics(service, attendanceRecords = [], people = []) {
  const serviceId = recordId(service);
  const peopleById = new Map((people || []).map((person) => [recordId(person), person]));
  const rows = (attendanceRecords || []).filter((record) => recordId(record?.service_id) === serviceId);
  const uniqueRows = new Map();

  for (const row of rows) {
    const personId = recordId(row?.person_id);
    if (!personId) continue;
    uniqueRows.set(personId, row);
  }

  const namedRows = [...uniqueRows.values()];
  const namedPeople = new Map();
  for (const person of service?.individuals || []) {
    const id = recordId(person);
    if (id) namedPeople.set(id, typeof person === "object" ? person : peopleById.get(id));
  }
  for (const row of namedRows) {
    const id = recordId(row.person_id);
    namedPeople.set(id, row.people || peopleById.get(id) || namedPeople.get(id));
  }

  const firstTimers = namedRows.filter((row) => row.first_timer === true).length;
  const namedTithers = namedRows.filter((row) => row.gave_tithe === true).length;
  const namedDecisions = namedRows.filter((row) => row.made_salvation_decision === true).length;
  const namedGuests = namedRows.filter((row) => {
    const person = row.people || peopleById.get(recordId(row.person_id));
    return row.first_timer === true || isGuestStatus(person);
  }).length;

  const totalAttendance = Math.max(
    countValue(service?.total_attendance),
    namedRows.length,
    namedPeople.size,
  );
  const guestAttendance = Math.min(
    totalAttendance,
    Math.max(countValue(service?.guests_count), firstTimers, namedGuests),
  );
  // A first timer is a guest visit, but reporting them again as a returning
  // guest makes the visible categories look double-counted. Keep the stored
  // guest aggregate for compatibility, then split it into two exclusive groups.
  const returningGuestAttendance = Math.max(0, guestAttendance - firstTimers);
  const tithers = Math.min(
    totalAttendance,
    Math.max(countValue(service?.tithers_count), namedTithers),
  );
  const decisions = Math.min(
    totalAttendance,
    Math.max(countValue(service?.salvation_decisions), namedDecisions),
  );

  return {
    totalAttendance,
    guestAttendance,
    returningGuestAttendance,
    memberAttendance: Math.max(0, totalAttendance - guestAttendance),
    firstTimers,
    tithers,
    decisions,
    namedAttendance: namedPeople.size,
    namedGuests,
    namedTithers,
    namedDecisions,
  };
}

export function summarizeServicePeriod(services = [], attendanceRecords = [], people = []) {
  return services.reduce((summary, service) => {
    const metrics = serviceAttendanceMetrics(service, attendanceRecords, people);
    summary.totalAttendance += metrics.totalAttendance;
    summary.guestAttendance += metrics.guestAttendance;
    summary.returningGuestAttendance += metrics.returningGuestAttendance;
    summary.memberAttendance += metrics.memberAttendance;
    summary.firstTimers += metrics.firstTimers;
    summary.tithers += metrics.tithers;
    summary.decisions += metrics.decisions;
    summary.serviceCount += 1;
    return summary;
  }, {
    totalAttendance: 0,
    guestAttendance: 0,
    returningGuestAttendance: 0,
    memberAttendance: 0,
    firstTimers: 0,
    tithers: 0,
    decisions: 0,
    serviceCount: 0,
  });
}

function roundToOneDecimal(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

/**
 * Attendance is a per-gathering measure. Summing it across a long period makes
 * a church look larger simply because more services were recorded. This view
 * keeps the member/guest mix comparable across periods while outcomes can still
 * be reported as actual period totals elsewhere.
 */
export function summarizeAverageAttendanceMix(services = [], attendanceRecords = [], people = []) {
  const period = summarizeServicePeriod(services, attendanceRecords, people);
  if (!period.serviceCount) {
    return {
      averageAttendance: 0,
      averageMembers: 0,
      averageGuests: 0,
      averageReturningGuests: 0,
      averageFirstTimers: 0,
      averageTithers: 0,
      memberPct: 0,
      guestPct: 0,
      returningGuestPct: 0,
      firstTimerPct: 0,
      titherRate: 0,
      serviceCount: 0,
    };
  }

  const memberPct = period.totalAttendance > 0
    ? Math.round((period.memberAttendance / period.totalAttendance) * 100)
    : 0;
  const guestPct = period.totalAttendance > 0 ? 100 - memberPct : 0;
  const firstTimerPct = period.totalAttendance > 0
    ? Math.round((period.firstTimers / period.totalAttendance) * 100)
    : 0;
  const returningGuestPct = Math.max(0, guestPct - firstTimerPct);
  const titherRate = period.memberAttendance > 0
    ? Math.min(100, Math.round((period.tithers / period.memberAttendance) * 100))
    : 0;

  return {
    averageAttendance: roundToOneDecimal(period.totalAttendance / period.serviceCount),
    averageMembers: roundToOneDecimal(period.memberAttendance / period.serviceCount),
    averageGuests: roundToOneDecimal(period.guestAttendance / period.serviceCount),
    averageReturningGuests: roundToOneDecimal(period.returningGuestAttendance / period.serviceCount),
    averageFirstTimers: roundToOneDecimal(period.firstTimers / period.serviceCount),
    averageTithers: roundToOneDecimal(period.tithers / period.serviceCount),
    memberPct,
    guestPct,
    returningGuestPct,
    firstTimerPct,
    titherRate,
    serviceCount: period.serviceCount,
  };
}
