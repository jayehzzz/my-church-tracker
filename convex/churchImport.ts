import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// These mutations are deliberately internal. They are the narrow persistence
// layer for a reviewed plan assembled outside the repository; they never read
// a spreadsheet, resolve people by name, change accounts, or create CRM tasks.
const approvedBatch = async (ctx: any, batchId: any) => {
  const batch = await ctx.db.get(batchId);
  if (!batch || batch.status !== "approved") throw new Error("IMPORT_BATCH_NOT_APPROVED");
  return batch;
};
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const validBirthdayParts = (month: number | undefined, day: number | undefined) => {
  if (month === undefined && day === undefined) return true;
  if (!Number.isInteger(month) || !Number.isInteger(day) || month! < 1 || month! > 12 || day! < 1) return false;
  return day! <= new Date(Date.UTC(2024, month!, 0)).getUTCDate();
};

export const prepareBatch = internalMutation({
  args: { sourceId: v.string(), sourceFingerprint: v.string(), summary: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("church_import_batches")
      .withIndex("by_source_fingerprint", (q: any) => q.eq("source_id", args.sourceId).eq("source_fingerprint", args.sourceFingerprint)).unique();
    if (existing) return existing;
    const id = await ctx.db.insert("church_import_batches", {
      source_id: args.sourceId,
      source_fingerprint: args.sourceFingerprint,
      status: "prepared",
      summary: args.summary,
      created_at: new Date().toISOString(),
    });
    return await ctx.db.get(id);
  },
});

// The calling operator may promote only the freshly reviewed batch. A separate
// explicit user approval and a fresh file-inclusive backup are operational
// preconditions; neither can be substituted with this state transition.
export const approvePreparedBatch = internalMutation({
  args: { batchId: v.id("church_import_batches"), reviewedFingerprint: v.string() },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.status !== "prepared" || batch.source_fingerprint !== args.reviewedFingerprint) {
      throw new Error("IMPORT_BATCH_REVIEW_MISMATCH");
    }
    await ctx.db.patch(batch._id, { status: "approved", approved_at: new Date().toISOString() });
    return await ctx.db.get(batch._id);
  },
});

export const recordRow = internalMutation({
  args: {
    batchId: v.id("church_import_batches"),
    sourceKey: v.string(),
    sourceFingerprint: v.string(),
    recordType: v.string(),
    disposition: v.union(v.literal("imported"), v.literal("linked"), v.literal("held"), v.literal("skipped")),
    targetPersonId: v.optional(v.id("people")),
    targetServiceId: v.optional(v.id("services")),
  },
  handler: async (ctx, args) => {
    const batch = await approvedBatch(ctx, args.batchId);
    if (batch.source_fingerprint !== args.sourceFingerprint) throw new Error("IMPORT_SOURCE_CHANGED");
    const existing = await ctx.db.query("church_import_rows").withIndex("by_source_key", (q: any) => q.eq("source_key", args.sourceKey)).unique();
    if (existing) {
      if (existing.source_fingerprint !== args.sourceFingerprint) throw new Error("IMPORT_SOURCE_KEY_REUSED");
      return existing;
    }
    if (args.targetPersonId && !await ctx.db.get(args.targetPersonId)) throw new Error("IMPORT_PERSON_NOT_FOUND");
    if (args.targetServiceId && !await ctx.db.get(args.targetServiceId)) throw new Error("IMPORT_SERVICE_NOT_FOUND");
    const id = await ctx.db.insert("church_import_rows", {
      batch_id: args.batchId,
      source_key: args.sourceKey,
      source_fingerprint: args.sourceFingerprint,
      record_type: args.recordType,
      disposition: args.disposition,
      target_person_id: args.targetPersonId,
      target_service_id: args.targetServiceId,
      created_at: new Date().toISOString(),
    });
    return await ctx.db.get(id);
  },
});

// A plan must name the exact target decision for every source key. This writer
// therefore never searches by display name or email and never creates an
// account link or follow-up assignment.
export const createReviewedPerson = internalMutation({
  args: {
    batchId: v.id("church_import_batches"), sourceKey: v.string(), sourceFingerprint: v.string(),
    firstName: v.string(), lastName: v.optional(v.string()), surnameStatus: v.union(v.literal("known"), v.literal("missing")),
    memberStatus: v.union(v.literal("guest"), v.literal("member"), v.literal("leader"), v.literal("archived")),
    phone: v.optional(v.string()), address: v.optional(v.string()), ageBand: v.optional(v.string()),
    birthdayMonth: v.optional(v.float64()), birthdayDay: v.optional(v.float64()),
    churchRole: v.optional(v.string()), sourceChurchRole: v.optional(v.string()), maritalStatus: v.optional(v.string()), employmentStatus: v.optional(v.string()), degreeStatus: v.optional(v.string()),
    isTither: v.optional(v.boolean()), isBaptised: v.optional(v.boolean()),
    contactDate: v.optional(v.string()), contactCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batch = await approvedBatch(ctx, args.batchId);
    if (batch.source_fingerprint !== args.sourceFingerprint) throw new Error("IMPORT_SOURCE_CHANGED");
    if (!args.firstName.trim() || (args.surnameStatus === "known" && !args.lastName?.trim()) || (args.surnameStatus === "missing" && args.lastName?.trim())) throw new Error("IMPORT_NAME_DECISION_INVALID");
    if (!validBirthdayParts(args.birthdayMonth, args.birthdayDay) || (args.contactDate && !validDate(args.contactDate))) throw new Error("IMPORT_PERSON_DATE_INVALID");
    const prior = await ctx.db.query("church_import_rows").withIndex("by_source_key", (q: any) => q.eq("source_key", args.sourceKey)).unique();
    if (prior) {
      if (prior.source_fingerprint !== args.sourceFingerprint) throw new Error("IMPORT_SOURCE_KEY_REUSED");
      if (!prior.target_person_id) throw new Error("IMPORT_SOURCE_ROW_ALREADY_DECIDED");
      return await ctx.db.get(prior.target_person_id);
    }
    const now = new Date().toISOString();
    const personId = await ctx.db.insert("people", {
      first_name: args.firstName.trim(), last_name: args.lastName?.trim() || "", surname_status: args.surnameStatus,
      member_status: args.memberStatus, phone: args.phone?.trim() || undefined, address: args.address?.trim() || undefined,
      age_band: args.ageBand?.trim() || undefined, birthday_month: args.birthdayMonth, birthday_day: args.birthdayDay,
      church_role: args.churchRole, source_church_role: args.sourceChurchRole?.trim() || undefined, marital_status: args.maritalStatus, employment_status: args.employmentStatus, degree_status: args.degreeStatus,
      is_tither: args.isTither, is_baptised: args.isBaptised,
      contact_date: args.contactDate, contact_category: args.contactCategory,
      created_at: now, updated_at: now,
    });
    await ctx.db.insert("church_import_rows", { batch_id: args.batchId, source_key: args.sourceKey, source_fingerprint: args.sourceFingerprint, record_type: "person", disposition: "imported", target_person_id: personId, created_at: now });
    return await ctx.db.get(personId);
  },
});

export const linkReviewedPerson = internalMutation({
  args: { batchId: v.id("church_import_batches"), sourceKey: v.string(), sourceFingerprint: v.string(), personId: v.id("people") },
  handler: async (ctx, args) => {
    const batch = await approvedBatch(ctx, args.batchId);
    if (batch.source_fingerprint !== args.sourceFingerprint || !await ctx.db.get(args.personId)) throw new Error("IMPORT_LINK_INVALID");
    const prior = await ctx.db.query("church_import_rows").withIndex("by_source_key", (q: any) => q.eq("source_key", args.sourceKey)).unique();
    if (prior) {
      if (prior.source_fingerprint !== args.sourceFingerprint || prior.target_person_id !== args.personId) throw new Error("IMPORT_LINK_CONFLICT");
      return prior;
    }
    const id = await ctx.db.insert("church_import_rows", { batch_id: args.batchId, source_key: args.sourceKey, source_fingerprint: args.sourceFingerprint, record_type: "person", disposition: "linked", target_person_id: args.personId, created_at: new Date().toISOString() });
    return await ctx.db.get(id);
  },
});

export const recordCollectorCredit = internalMutation({
  args: { batchId: v.id("church_import_batches"), sourceKey: v.string(), sourceFingerprint: v.string(), personId: v.id("people"), collectorId: v.id("people") },
  handler: async (ctx, args) => {
    const batch = await approvedBatch(ctx, args.batchId);
    if (batch.source_fingerprint !== args.sourceFingerprint || args.personId === args.collectorId || !await ctx.db.get(args.personId) || !await ctx.db.get(args.collectorId)) throw new Error("IMPORT_COLLECTOR_INVALID");
    const existing = await ctx.db.query("contact_collectors").withIndex("by_person_collector", (q: any) => q.eq("person_id", args.personId).eq("collector_id", args.collectorId)).unique();
    if (existing) {
      if (existing.source_key && existing.source_key !== args.sourceKey) throw new Error("IMPORT_COLLECTOR_CONFLICT");
      return existing;
    }
    const id = await ctx.db.insert("contact_collectors", { person_id: args.personId, collector_id: args.collectorId, source_key: args.sourceKey, created_at: new Date().toISOString() });
    return await ctx.db.get(id);
  },
});

// Church settings are imported through the same approved-batch gate as the
// historical records. This avoids needing to impersonate an owner account in
// the command-line import while retaining the owner-only public settings API.
export const saveApprovedChurchSettings = internalMutation({
  args: {
    batchId: v.id("church_import_batches"),
    churchName: v.string(), address: v.string(), constituency: v.string(), trackedGroup: v.string(),
    trackedProgramIds: v.array(v.id("meeting_programs")),
  },
  handler: async (ctx, args) => {
    await approvedBatch(ctx, args.batchId);
    const values = [args.churchName, args.address, args.constituency, args.trackedGroup];
    if (values.some((value) => !value.trim())) throw new Error("IMPORT_CHURCH_SETTING_EMPTY");
    for (const programId of args.trackedProgramIds) if (!await ctx.db.get(programId)) throw new Error("IMPORT_CHURCH_PROGRAM_NOT_FOUND");
    const now = new Date().toISOString();
    const record = {
      key: "primary" as const,
      church_name: args.churchName.trim(), address: args.address.trim(), constituency: args.constituency.trim(), tracked_group: args.trackedGroup.trim(),
      tracked_program_ids: args.trackedProgramIds, updated_at: now,
    };
    const existing = await ctx.db.query("church_settings").withIndex("by_key", (q: any) => q.eq("key", "primary")).unique();
    if (existing) {
      await ctx.db.patch(existing._id, record);
      return await ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert("church_settings", { ...record, created_at: now });
    return await ctx.db.get(id);
  },
});

export const createReviewedSundayService = internalMutation({
  args: { batchId: v.id("church_import_batches"), sourceKey: v.string(), sourceFingerprint: v.string(), serviceDate: v.string(), totalAttendance: v.float64() },
  handler: async (ctx, args) => {
    const batch = await approvedBatch(ctx, args.batchId);
    if (batch.source_fingerprint !== args.sourceFingerprint || !validDate(args.serviceDate) || args.totalAttendance < 0) throw new Error("IMPORT_SERVICE_INVALID");
    const prior = await ctx.db.query("church_import_rows").withIndex("by_source_key", (q: any) => q.eq("source_key", args.sourceKey)).unique();
    if (prior) {
      if (prior.source_fingerprint !== args.sourceFingerprint || !prior.target_service_id) throw new Error("IMPORT_SERVICE_CONFLICT");
      return await ctx.db.get(prior.target_service_id);
    }
    const now = new Date().toISOString();
    const serviceId = await ctx.db.insert("services", {
      request_id: `import:${args.sourceKey}`, service_date: args.serviceDate, service_type: "sunday_service",
      total_attendance: args.totalAttendance, unnamed_attendance_count: args.totalAttendance,
      guests_count: 0, unnamed_guests_count: 0, salvation_decisions: 0, unnamed_decisions_count: 0,
      tithers_count: 0, unnamed_tithers_count: 0, created_at: now, updated_at: now,
    });
    await ctx.db.insert("church_import_rows", { batch_id: args.batchId, source_key: args.sourceKey, source_fingerprint: args.sourceFingerprint, record_type: "sunday_service", disposition: "imported", target_service_id: serviceId, created_at: now });
    return await ctx.db.get(serviceId);
  },
});

export const recordHistoricalNote = internalMutation({
  args: { batchId: v.id("church_import_batches"), sourceKey: v.string(), personId: v.optional(v.id("people")), occurredOn: v.optional(v.string()), note: v.string() },
  handler: async (ctx, args) => {
    await approvedBatch(ctx, args.batchId);
    if (!args.note.trim()) throw new Error("IMPORT_NOTE_EMPTY");
    if (args.personId && !await ctx.db.get(args.personId)) throw new Error("IMPORT_NOTE_PERSON_NOT_FOUND");
    const existing = await ctx.db.query("historical_import_notes").withIndex("by_source_key", (q: any) => q.eq("source_key", args.sourceKey)).unique();
    if (existing) return existing;
    const id = await ctx.db.insert("historical_import_notes", { batch_id: args.batchId, source_key: args.sourceKey, person_id: args.personId, occurred_on: args.occurredOn, note: args.note.trim(), created_at: new Date().toISOString() });
    return await ctx.db.get(id);
  },
});

export const recordSundayRegister = internalMutation({
  args: {
    batchId: v.id("church_import_batches"),
    sourceKey: v.string(),
    sourceFingerprint: v.string(),
    serviceId: v.id("services"),
    personId: v.id("people"),
    status: v.union(v.literal("present"), v.literal("absent"), v.literal("unknown")),
    explicitFirstVisit: v.boolean(),
    recordedReturn: v.boolean(),
    leftEarly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const batch = await approvedBatch(ctx, args.batchId);
    if (batch.source_fingerprint !== args.sourceFingerprint) throw new Error("IMPORT_SOURCE_CHANGED");
    if (!await ctx.db.get(args.serviceId) || !await ctx.db.get(args.personId)) throw new Error("IMPORT_REGISTER_REFERENCE_NOT_FOUND");
    const existingRow = await ctx.db.query("church_import_rows").withIndex("by_source_key", (q: any) => q.eq("source_key", args.sourceKey)).unique();
    if (existingRow) {
      if (existingRow.source_fingerprint !== args.sourceFingerprint) throw new Error("IMPORT_SOURCE_KEY_REUSED");
      return existingRow;
    }
    const register = await ctx.db.query("service_register_entries").withIndex("by_service_person", (q: any) => q.eq("service_id", args.serviceId).eq("person_id", args.personId)).unique();
    const now = new Date().toISOString();
    if (register && register.source_key !== args.sourceKey) throw new Error("IMPORT_REGISTER_CONFLICT");
    if (register) await ctx.db.patch(register._id, { status: args.status, explicit_first_visit: args.explicitFirstVisit || undefined, left_early: args.leftEarly || undefined, import_batch_id: args.batchId, updated_at: now });
    else await ctx.db.insert("service_register_entries", { service_id: args.serviceId, person_id: args.personId, status: args.status, explicit_first_visit: args.explicitFirstVisit || undefined, left_early: args.leftEarly || undefined, source_key: args.sourceKey, import_batch_id: args.batchId, created_at: now, updated_at: now });
    // Legacy attendance represents presence only; absence and unknown stay in
    // the source register rather than being silently counted as no-shows.
    const attendance = await ctx.db.query("attendance").withIndex("by_service", (q: any) => q.eq("service_id", args.serviceId)).collect();
    const current = attendance.find((row: any) => row.person_id === args.personId);
    if (args.status === "present") {
      if (current) await ctx.db.patch(current._id, { first_timer: args.explicitFirstVisit || current.first_timer || undefined });
      else await ctx.db.insert("attendance", { service_id: args.serviceId, person_id: args.personId, first_timer: args.explicitFirstVisit || undefined, created_at: now });
    } else if (current) throw new Error("IMPORT_REGISTER_CONFLICT");
    const evidenceKinds: Array<"explicit_first_visit" | "recorded_return"> = [];
    if (args.explicitFirstVisit) evidenceKinds.push("explicit_first_visit");
    if (args.recordedReturn) evidenceKinds.push("recorded_return");
    for (const kind of evidenceKinds) {
      const evidenceKey = `${args.sourceKey}:${kind}`;
      const duplicate = await ctx.db.query("attendance_visit_evidence").withIndex("by_source_key", (q: any) => q.eq("source_key", evidenceKey)).unique();
      if (!duplicate) await ctx.db.insert("attendance_visit_evidence", { person_id: args.personId, service_id: args.serviceId, kind, source_key: evidenceKey, import_batch_id: args.batchId, created_at: now });
    }
    const rowId = await ctx.db.insert("church_import_rows", { batch_id: args.batchId, source_key: args.sourceKey, source_fingerprint: args.sourceFingerprint, record_type: "sunday_register", disposition: "imported", target_person_id: args.personId, target_service_id: args.serviceId, created_at: now });
    return await ctx.db.get(rowId);
  },
});

export const finishBatch = internalMutation({
  args: { batchId: v.id("church_import_batches") },
  handler: async (ctx, args) => {
    const batch = await approvedBatch(ctx, args.batchId);
    const rows = await ctx.db.query("church_import_rows").withIndex("by_batch", (q: any) => q.eq("batch_id", args.batchId)).collect();
    const held = rows.filter((row: any) => row.disposition === "held").length;
    const historicalNotes = await ctx.db.query("historical_import_notes").withIndex("by_batch", (q: any) => q.eq("batch_id", args.batchId)).collect();
    // Preserve the reviewed sheet total while making later ordinary attendance
    // edits safe: named present rows are not counted a second time as unnamed.
    for (const row of rows.filter((row: any) => row.record_type === "sunday_service" && row.target_service_id)) {
      // `church_import_rows` can also target people, so retain the explicit
      // guard even though the filter above documents this finalisation pass.
      if (!row.target_service_id) continue;
      const service = await ctx.db.query("services")
        .filter((q: any) => q.eq(q.field("_id"), row.target_service_id))
        .unique();
      const present = service ? await ctx.db.query("attendance").withIndex("by_service", (q: any) => q.eq("service_id", service._id)).collect() : [];
      if (!service) continue;
      const total = service.total_attendance ?? present.length;
      if (present.length > total) throw new Error("IMPORT_SERVICE_TOTAL_CONFLICT");
      await ctx.db.patch(service._id, { unnamed_attendance_count: total - present.length, updated_at: new Date().toISOString() });
    }
    await ctx.db.patch(batch._id, { status: "applied", applied_at: new Date().toISOString(), summary: { ...(batch.summary || {}), applied_rows: rows.length, held_rows: held, historical_notes_imported: historicalNotes.length } });
    return { appliedRows: rows.length, heldRows: held, historicalNotes: historicalNotes.length };
  },
});
