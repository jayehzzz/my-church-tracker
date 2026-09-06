# 03 — Reliable person records

After Tasks 01–02, align person forms, service payloads, API validators, and schema. Fix city/state/postcode persistence and distinguish leaving a field unchanged from explicitly clearing it. Apply coherent validation and canonical statuses without breaking existing records.

Implement a deliberate person archiving/deletion policy that preserves attendance and care history. Add duplicate detection using sensible normalized contact fields; provide a reviewed merge flow only where related records can be safely reconciled. Never automatically merge records on name alone. Keep the existing profile design and avoid unrelated page restyling.

Starting points: `PersonForm.svelte`, `peopleService.js`, `convex/people.ts`, `convex/evangelism.ts`, `convex/schema.ts`, person profile routes, and dependent references in attendance/CRM/care tables.

Complete when: a person can be created with a full address, edited, cleared, and reloaded with correct persisted values; invalid server inputs are rejected; duplicate warnings behave predictably; archiving/removal cannot silently orphan history; any supported merge preserves relationships and can be reviewed before execution. Add meaningful backend/form regression tests and update the handoff. If merge requires a larger design decision, document it as outstanding rather than marking the entire scope complete.
