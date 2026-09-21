# Church Tracker working context

- SvelteKit/Svelte 5 frontend; Convex backend. Use the built-in browser for local app testing.
- The user reported no real church data entered as of 5 September 2026. Preserve existing records and uncommitted work; do not assume a configured database is disposable.
- For the improvement programme, read `docs/implementation/README.md` and only the requested numbered brief. Read relevant sections of `docs/project-review-2026-09-05.md` as needed; verify findings against current code rather than repeating the full audit.
- Run implementation tasks sequentially in this saved project so later tasks receive earlier changes. Inspect the branch and working tree first. Preserve unrelated changes; record the inherited baseline. Do not reset, stash, or commit unrelated work. If using an isolated checkout, explicitly carry over the required current work and task briefs.
- Keep work within the requested brief. Use the selected model; do not spawn agents or other tasks unless requested. Ask early for indispensable account/product choices while continuing independent work.
- Verify behavioral changes with appropriate tests and browser checks. Available baseline commands are `npm run test:unit` and `npm run build`; backend checks are also required for backend changes. Report unavailable checks honestly.
- Implementation briefs authorize local implementation and verification. Production release is a separate task. Never publish secrets or substitute sample records for live request failures.
- Before finishing a numbered task, add a concise handoff to `docs/implementation/README.md`: changes, checks, remaining requirements, and branch/commit or uncommitted state. Mark complete only when its acceptance criteria are met.
