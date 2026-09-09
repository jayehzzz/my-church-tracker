# Backup, restore, and service-photo recovery

This is the recovery procedure for **Convex data**, not a report export. CSV
downloads from Reports are deliberately separate and cannot restore the church
database.

## Access and retention

Only Convex team members with deployment backup/restore access may make or
restore a backup. The app's profile action opens the Convex console only for an
owner or administrator; it never downloads a partial browser JSON file.

In the Convex dashboard, select the intended deployment and open **Backup &
Restore**. Create a backup with **file storage included**. This is required:
service images are stored in Convex file storage and linked through
`service_photos`. Standalone Memories albums use `memory_albums` and
`memory_media`; their photos and videos are also Convex file-storage objects.
An export that contains only database rows cannot restore either kind of media.

Convex documents the following provider retention defaults: manual and daily
backups are retained for seven days; weekly backups are retained for fourteen
days. Scheduled backups require the relevant Convex plan. Confirm the actual
plan, schedule, backup inclusion setting, access roster, and any organisation
retention obligations in the Convex dashboard before relying on these defaults.

## Routine backup

As of 9 September 2026, the confirmed shared deployment is `elated-bee-284`
(`jayden-ayeh:church-tracker:production`). A file-inclusive provider backup and
private local export are complete; **regular backups are not yet enabled**.
The user is choosing between Mac-dependent automation and a paid provider
schedule. Current evidence and expiration: [shared launch handoff](implementation/shared-launch-handoff.md).

For an operator-requested private local backup from this saved project, run
`python3 scripts/backup-live.py`. It verifies the named live destination,
includes file storage, checks archive integrity and saves a manifest under
`~/.codex/private/church-backups/elated-bee-284/`. It does not restore, delete,
or schedule anything. Keep snapshots out of this public repository. The Mac
copy alone does not provide off-device disaster recovery or a recurring policy.

1. Confirm the deployment name and environment; never back up, restore, or
   import into a deployment merely because its URL resembles a test name.
2. In Convex **Backup & Restore**, create the backup with file storage.
3. Record the time, deployment, backup identifier, operator and whether files
   were included in the church's restricted operational log. Do not put member
   data or backup download links in source control.
4. Keep a second current backup before any restore, because restore replaces
   table data.

The CLI equivalent for a full export is:

```sh
npx convex export --include-file-storage --deployment <isolated-deployment> --path <empty-directory-or-zip>
```

The resulting snapshot contains each table's documents and the `_storage`
metadata/files. It preserves Convex document IDs, which preserves relationships
such as service attendance, people, CRM work, and `service_photos` links.

## Isolated restore rehearsal

Never rehearse on production. Use a separately configured, disposable Convex
deployment with its own URL and explicitly record its name before beginning.

1. Create two synthetic people, a service with named attendance, and a JPEG,
   PNG, or WebP service photo in the isolated environment.
2. Take an included-file-storage backup as above and record source counts for
   `people`, `services`, `attendance`, and `service_photos`.
3. Restore into a different empty isolated deployment using the dashboard, or
   import the untouched snapshot:

   ```sh
   npx convex import --deployment <different-isolated-deployment> <snapshot.zip>
   ```

4. Sign in as an approved test owner. Confirm the two people, service and named
   attendance retain their original IDs and links; reload the Services page and
   confirm the photo renders from Convex storage.
5. Confirm an unapproved account, viewer, and leader cannot generate upload
   URLs or manage service photos. Confirm an owner/admin can remove a selected
   photo and that it no longer renders after reload.
6. Record the date, source/destination environments, backup ID, counts,
   relationship result, photo result, access result and operator. Delete only
   the explicitly disposable rehearsal environment when it is no longer needed.

Do not add `--replace` or `--replace-all` to a restore command unless the named
target has been independently verified as disposable: those options destroy
existing data.

## File lifecycle and failure recovery

The application accepts JPEG, PNG and WebP files up to 10 MB. The browser shows
progress while posting to a short-lived, authorized Convex upload URL. The
backend rechecks content type and size before creating the durable photo record.
An upload that fails is not added to the service. A cancelled service form
removes its pending uploads; saving an edit deletes server files removed from
that service, and deleting the service deletes all of its attached files.

References: [Convex backup and restore](https://docs.convex.dev/database/backup-restore),
[Convex export](https://docs.convex.dev/cli/reference/export), [Convex import](https://docs.convex.dev/database/import-export/import),
and [Convex file uploads](https://docs.convex.dev/file-storage/upload-files).
