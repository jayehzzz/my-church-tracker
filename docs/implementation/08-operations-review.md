# 08 — Collaborative operation and release verification

Implementation recommendation: Terra High. After Tasks 01–07, read their concise handoffs and close outstanding operational requirements. Scope changes to measured problems and unfinished acceptance criteria.

Replace avoidable full-table reads with indexed/scoped/paginated queries on heavy paths. Measure using a representative synthetic dataset. Use subscriptions or explicit invalidation for worker changes that need timely propagation. Move time-based CRM synchronization out of dashboard reads into an appropriate backend scheduler with idempotent rules. Complete genuine notification sources if Task 07 identified a gap. Keep authorization and environment isolation intact.

Wire meaningful frontend/backend checks and critical end-to-end workflows into CI, including deterministic fixtures and coverage setup where useful. Document coherent frontend/backend releases, migrations, backups, and rollback limitations. Preserve existing work and distinguish verified test readiness from an actual production deployment.

Complete when: ordinary page reads do not trigger maintenance writes; scheduled work is repeatable without duplicates; two clients see the necessary shared updates; representative loading is measured; critical workflow and permission checks pass; each earlier handoff is complete or has a precise unresolved item. Update this programme's status without calling it production-ready while required checks remain unavailable.

## Optional final review — Astra High

When the user explicitly starts a review task, review the integrated changes and handoffs against the original findings. Focus on authentication, environment isolation, retained relationships, actual attendance, recovery, and claims not supported by tests. Do not repeat the entire initial inventory. Produce actionable findings or a concise readiness assessment. Review alone does not authorize deployment; do not spawn this task automatically.
