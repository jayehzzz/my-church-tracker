# 07 — Bounded interface and documentation cleanup

Use Luna Medium for this task after Tasks 01–06. Keep it focused on frontend usability and documentation; record newly discovered backend problems for Task 08 rather than expanding into an architectural rewrite.

Fix accessibility warnings in the profile menu/contact drawer and reuse established modal focus containment/return behavior. Ensure table actions have accessible names and forms preserve input on errors. Check unsaved-change dismissal. Improve the phone-sized flow so recording and today's tasks remain quickly reachable; preserve the established visual design and existing features.

Remove hardcoded church/profile/notification demonstration content from live-mode presentation. Use real data supplied by existing services; if no real notification source exists, show an honest empty state and record the backend requirement for Task 08. Keep demonstration examples only in explicit demo mode.

Update README, relevant docs, and environment/deployment instructions to match the implemented system. Describe actual setup, test, preview, release, and recovery behavior without claiming unverified safeguards. Avoid exhaustive rewrites of unrelated documents.

Complete when: the changed controls work with keyboard and at 390px width; focus returns correctly; relevant build warnings are resolved; loading/error/empty states are honest; setup instructions match validated commands. Run appropriate checks, record screenshots or observations where helpful, and update the handoff with any backend requirements.
