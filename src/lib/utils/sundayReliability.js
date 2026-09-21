function commitmentId(commitment, index) {
  return String(commitment?._id || commitment?.id || `commitment-${index}`);
}

function resolutionRank(value) {
  return { pending: 0, cancelled: 1, no_show: 2, attended: 3 }[value] ?? 0;
}

export function summarizeSundayCommitments(commitments = []) {
  const byDate = new Map();

  commitments.forEach((commitment, index) => {
    if (commitment?.gathering_type !== "sunday_service" || commitment?.response !== "yes") return;
    const date = commitment.gathering_date || commitment.service_date || commitment.promised_date;
    if (!date) return;
    const resolution = ["attended", "no_show", "cancelled", "pending"].includes(commitment.resolution)
      ? commitment.resolution
      : "pending";
    const current = byDate.get(date);
    const candidate = { ...commitment, id: commitmentId(commitment, index), gathering_date: date, resolution };
    if (!current || resolutionRank(candidate.resolution) > resolutionRank(current.resolution)) {
      byDate.set(date, candidate);
    }
  });

  const entries = [...byDate.values()].sort((a, b) => String(b.gathering_date).localeCompare(String(a.gathering_date)));
  const attended = entries.filter((item) => item.resolution === "attended").length;
  const missed = entries.filter((item) => item.resolution === "no_show").length;
  const cancelled = entries.filter((item) => item.resolution === "cancelled").length;
  const pending = entries.filter((item) => item.resolution === "pending").length;
  const decided = attended + missed;

  return {
    expected: entries.length,
    attended,
    missed,
    cancelled,
    pending,
    decided,
    follow_through_rate: decided ? Math.round((attended / decided) * 100) : null,
    repeated_misses: missed >= 2,
    entries,
  };
}

export function sundayReliabilityLabel(summary) {
  const value = summary || summarizeSundayCommitments([]);
  if (!value.expected) return "No Sunday commitments";
  const parts = [`${value.expected} expected`];
  if (value.attended) parts.push(`${value.attended} attended`);
  if (value.missed) parts.push(`${value.missed} missed`);
  if (value.cancelled) parts.push(`${value.cancelled} cancelled`);
  if (value.pending) parts.push(`${value.pending} pending`);
  return parts.join(" · ");
}

export function sundayResolutionLabel(value) {
  return {
    attended: "Attended",
    no_show: "Didn’t attend",
    cancelled: "Cancelled",
    pending: "Awaiting result",
  }[value] || "Awaiting result";
}
