# Follow-up delegation programme — Task 1 API and ownership

Implemented 3 October 2026 on shared branch `codex/follow-up-delegation`, starting from clean, up-to-date `main` at `2e1f247`. Tasks 2 and 3 continue this branch sequentially. Owner acceptance and production release are separate gates.

## Assignment contract

- `crm:getAssignmentDirectory({})` is approved owner/admin-only. Returns all non-archived people with minimal identity/status fields, current `assignment_id` (null if unassigned), `assigned_leader_id`, `assigned_leader_name`, `blocked_reason` and `open_follow_up_count`. This list is independent of Follow-up's date and worker filters. It does not grant leaders churchwide discovery. Recipient leaders are existing people with `member_status: leader`.
- `crm:assignContact({personId, assignedLeaderId, expectedAssignmentId?, createFirstContactTask?, firstContactDueDate?, reason?})` remains the compatibility API for assigning any eligible person. Owner/admin authority is enforced by the existing secured mutation wrapper. The trusted account is the audit actor; caller-supplied actor IDs do not establish authority.
- Pass `expectedAssignmentId: null` for a reviewed unassigned person or the current assignment ID for a reviewed assigned person. A changed assignment rejects the entire person's transaction. Legacy callers may omit the guard; the new assignment panel always supplies it. Repeating the same assignment is idempotent; legacy duplicate active assignments are ended. History rows are retained.
- `followUpCrmService.assignContact(personId, leaderId, dueDate, options)` forwards the guard. `batchAssignContacts(ids, leaderId, dueDate, {expectedAssignments})` processes unique people sequentially and returns `data`, `succeededPersonIds`, `errors: [{personId,error}]`, and an aggregate `error` on any failure. Each person's transaction is atomic; a partial batch keeps successful writes and reports every failure. The panel clears successful selections and keeps failed selections for review. Refresh clears reviewed selections and loads fresh versions.
- The new Follow-up **Assignments** panel sends `createFirstContactTask: false`; delegating responsibility never implicitly schedules work. Existing outreach assignment controls retain initial first-contact scheduling. Members/leaders never receive an outreach first-contact task. Reassignment never restarts first contact, changes its due date, or edits membership or outreach state.
- Paused, archived and do-not-contact people cannot be assigned through this mutation. Paused people require the existing explicit reactivation workflow; assignment does not reactivate them. Restricted people are visibly disabled in the directory; archived people are excluded.

## Outstanding work and history

Within the assignment transaction, `replaceAssignment` transfers **open** general `first_contact`, `follow_up`, `sunday_confirmation` and `reengagement` tasks to the new responsible leader. The shared `isDelegatedFollowUpTask` predicate excludes tasks linked to a programme, meeting or visitation, and excludes `member_care`, `visitation` and `other`. Independent responsibilities and their existing access checks remain intact.

Transferred tasks keep their IDs, dates, reason, priority, automation keys and links. Append-only `ownership_history` records `from_leader_id`, `to_leader_id`, `assignment_id`, and `at`; the secured database wrapper also records the authenticated audit actor. The optional schema field requires no data migration. Completed and cancelled tasks, recorded calls, Sunday commitment/attendance-plan rows and response history are not rewritten. Previous assignments have `status: ended` and `ended_at`; the person drawer exposes current and previous assignment history through `getContactProfile.assignment_history`.

The new leader's active assignment grants the existing scoped person access, and transferred task ownership grants task mutation authority. The previous worker cannot complete a transferred task even if they retain bacenta access. Reassignment does not change bacenta membership, inviter attribution, care/visitation ownership, actual attendance, or Sunday responses.

## Contract for Task 2

Use active `follow_up_assignments` as the responsibility source for members, leaders and non-members; do not infer it from inviter, bacenta membership, last caller or historical `gathering_commitments.leader_id`. Keep recorded Sunday actor attribution as history. Current dashboard Sunday/upcoming commitment filtering now uses the active owner with recorded-worker fallback only where there is no assignment; worker assessment history remains attributed to its original recorded worker. Task 2 should derive permanent leader lists from the active assignment, including people without dated confirmations, and keep explicit Sunday responses separate from ownership.

Do not schedule missing member tasks or count a person as expected just because they were assigned. Do not rewrite Sunday responses when ownership changes. Shared Practice database is `standing-mongoose-699`; opening or deploying functions must preserve records. No refresh/import/reset was authorized.
