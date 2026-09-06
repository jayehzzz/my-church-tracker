# 06 — Real recovery and file storage

After Tasks 02–05, replace the mock church backup with a genuine authenticated backup workflow covering the data and relationships required for recovery. Prefer supported Convex export/restore capabilities where appropriate; inspect their current documentation. Keep ordinary report exports separate from recovery backups. Verify or document actual retention/access settings and rehearse restoration only into an explicitly isolated test environment.

Implement service-photo storage, allowed file types/sizes, upload progress, failure recovery, deletion policy, and authorization consistent with Task 02. Store backend file references rather than treating browser-local preview URLs as durable files. Include the role of photos in backup/restore documentation.

Starting points: `ProfileDropdown.svelte`, `storageService.js`, `ServiceForm.svelte`, `ServiceMemories.svelte`, Convex schema/storage functions, and environment documentation.

Complete when: a backup contains real test records rather than static samples; isolated restore preserves relationships and required files; unauthorized export/upload access is rejected; photos survive reloads and failures provide useful feedback; recovery steps have been exercised and recorded. If provider configuration or account access is missing, finish local work and record that verification as outstanding. Update the handoff.
