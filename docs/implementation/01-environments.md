# 01 — Dependable development and explicit demo mode

Implement a consistent development/staging/production configuration and a clearly separate demo mode. Work within the current SvelteKit/Convex design. Start by verifying the actual configuration; `.env.local` had no Convex URL during preparation, but shell, hosting, and account state must be checked rather than inferred.

Use one shared backend/client configuration across all services. Remove silent fallbacks from configured live/test operation. Distinguish loading, empty, unavailable, and explicitly selected demo states. Remove sample-person injection when real people lack coordinates. Ensure demo changes have a documented persistence/reset behavior and cannot be sent to another environment.

Starting points: `src/lib/convex.js`, `src/lib/services/*Service.js`, `src/routes/people/+page.svelte`, other route initializers, `.env.example`, `vercel.json`, and `.agent/workflows/environments.md`.

Document how the user requests a future change, tests it, previews it, and releases it. Code branches and databases must be separately isolated. Prepare required hosting settings without treating placeholders as a working deployment. If account access or creation of external environments is necessary, complete independent local work and identify precisely what remains.

Complete when: all services select the same intended backend; empty real databases stay empty; missing coordinates add no fake people; request failures are visible and do not switch datasets; demo mode is explicit; tests cover these paths; the development workflow has been exercised against an isolated configured backend or the missing external step is clearly recorded as incomplete. Update the handoff.
