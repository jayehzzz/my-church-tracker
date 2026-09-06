# 04 — Connected attendance and pastoral-care history

After Tasks 01–03, reconcile Sunday/meeting attendance, CRM commitments, attendance plans, and person milestones. Establish which records are authoritative. Keep expected attendance separate from actual attendance, and unnamed headcounts separate from named check-ins. Use atomic backend operations and shared rules.

Make recording attendance and resolving an actual-attendance commitment consistent across profiles and CRM. Handle duplicate submissions, backdated gatherings, date corrections, removals, and first visits. Avoid inventing a service when an ambiguous date maps to multiple gatherings; ask or require an explicit selection where necessary. Repair or retire legacy write paths that bypass the authoritative workflow.

Reconcile care interactions with the follow-up history and generated tasks on create, edit, and removal. Correcting notes or a visit date must not accidentally reopen completed tasks. Define related-record cleanup for service/meeting/care deletion and preserve recovery where appropriate. Verify do-not-contact and pause rules across follow-up entry points.

Starting points: `convex/services.ts`, `attendance.ts`, `meetings.ts`, `crm.ts`, `follow_ups.ts`, `visitations.ts`, the corresponding frontend services, and recording forms.

Complete when: actual attendance recorded through either supported workflow yields the same history and commitment outcome exactly once; corrections reconcile all views; first visits use gathering dates; totals remain valid; care edits preserve one coherent timeline; deletes follow explicit relational policies. Cover backend transactions and the key browser workflows. Update the handoff.
