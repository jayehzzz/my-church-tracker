# 02 — Identity, permissions, and maintenance safeguards

After Task 01, implement real sign-in/sign-out and backend authorization for the existing single-church app. Inspect available authentication integrations and propose a small role/access matrix. Ask the user early for genuinely necessary sign-in or access-policy choices; continue independent safeguards while waiting. Do not infer who may see confidential pastoral notes from a leader dropdown.

Derive the acting user from an authenticated identity. Enforce permissions on every public read/write, including sensitive notes and exports; use the existing owner/admin/leader/viewer model where suitable. Replace the fixed profile identity. Restrict seed/migration functions to internal maintenance and replace production-URL substring checks with explicit disposable-environment safeguards. Check resets against the full relational schema. Complete the test harness needed to verify these boundaries.

Fix unsafe map HTML interpolation and absent optional-role handling. Audit and update affected dependencies in deliberate groups, accounting for toolchain compatibility and actual advisory reachability. Do not use a forced blanket upgrade as a substitute for validation.

Starting points: `convex/schema.ts`, public exports throughout `convex`, `convex/seed*.ts`, `convex/migrations.ts`, client initialization, `ProfileDropdown.svelte`, `LeafletMap.svelte`, and package files.

Complete when: unauthenticated access fails; role boundaries are tested against backend functions; sessions/sign-out work; maintenance endpoints are inaccessible to ordinary clients; acting-user attribution cannot be forged; popup text is safe; dependency findings have fixes or specific documented disposition. Record any external authentication setup still required. Update the handoff.
