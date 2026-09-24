<script>
    import { untrack } from "svelte";
    import { goto } from "$app/navigation";
    import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
    import { Button, Modal, Motion } from "$lib/components/ui";
    import * as peopleService from "$lib/services/peopleService";
    import * as attendanceService from "$lib/services/attendanceService";
    import * as meetingsService from "$lib/services/meetingsService";
    import * as servicesService from '$lib/services/servicesService.js';
    import ProfileAttendanceDrilldown from '$lib/components/drilldown/ProfileAttendanceDrilldown.svelte';
    import { openDrilldown, pushDrilldown } from '$lib/components/drilldown/selection.js';
    import { peekMeetingReturn } from '$lib/components/drilldown/meetingReturnState.js';
    import * as evangelismService from "$lib/services/evangelismService";
    import * as visitationsService from "$lib/services/visitationsService";
    import * as followUpCrmService from "$lib/services/followUpCrmService.js";
    import { isDemoMode } from "$lib/convex.js";
    import { attendanceDate, recordedAttendance, profileRequest } from "$lib/utils/peopleView.js";

    // New Modular Components
    import ProfileHeader from "$lib/components/people/ProfileHeader.svelte";
    import PeopleStatsGrid from "$lib/components/people/PeopleStatsGrid.svelte";
    import ProfileDetails from "$lib/components/people/ProfileDetails.svelte";
    import ProfileHistoryTabs from "$lib/components/people/ProfileHistoryTabs.svelte";
    import PersonForm from "$lib/components/forms/PersonForm.svelte";
    import EvangelismDetailModal from "$lib/components/evangelism/EvangelismDetailModal.svelte";
    import VisitationDetailModal from "$lib/components/visitation/VisitationDetailModal.svelte";
    import CareSummary from "$lib/components/people/CareSummary.svelte";
    import SundayReliabilitySummary from "$lib/components/shared/SundayReliabilitySummary.svelte";

    let { data } = $props();

    let person = $state(null);
    let loading = $state(true);
    let error = $state(null);
    let showEditModal = $state(false);
    let showMergeModal = $state(false);
    let mergeCandidates = $state([]);
    let mergeTargetId = $state("");
    let mergePreview = $state(null);
    let mergeError = $state(null);
    let mergeLoading = $state(false);
    let mergeConfirmed = $state(false);
    let attendanceDrilldown = $state(null);
    let inspectedEvent = $state(null);
    let inspectedAttendees = $state([]);
    let inspectedStatus = $state('loading');
    let inspectedError = $state('');
    let inspectedRecord = $state(null);
    let inspectGeneration = 0;
    let showOutreachDetailModal = $state(false);
    let selectedOutreachRecord = $state(null);
    let showVisitationDetailModal = $state(false);
    let selectedVisitationRecord = $state(null);
    let attendanceHistory = $state([]);
    let outreachContacts = $state([]);
    let visitations = $state([]);
    let careProfile = $state({ tasks: [] });

    // Status update states
    let updatingStatus = $state(false);
    let statusUpdateError = $state(null);

    let profileTab = $state("activity");
    let sectionErrors = $state({});
    let requestGeneration = 0;
    let totalAttendance = $derived(attendanceHistory.length);
    let lastAttended = $derived(attendanceHistory.length ? attendanceDate(attendanceHistory[0]) : null);
    function recordEvent(record) { return record?.meeting || record?.services; }
    function eventId(record) { const event = recordEvent(record); return String(event?._id || event?.id || ''); }
    function openAttendance(record = null) {
      attendanceDrilldown = openDrilldown({ kind: 'history', title: `${person?.first_name || 'Person'} · attendance history` });
      if (record) {
        attendanceDrilldown = pushDrilldown(attendanceDrilldown, { kind: 'event', title: 'Gathering details', record });
        void inspectAttendance(record);
      }
    }
    async function inspectAttendance(record) {
      const generation = ++inspectGeneration;
      inspectedRecord = record;
      inspectedStatus = 'loading'; inspectedError = ''; inspectedEvent = null; inspectedAttendees = [];
      const id = eventId(record);
      if (!id) { inspectedStatus = 'unavailable'; inspectedError = 'This attendance record has no linked event.'; return; }
      const result = await (record.meeting ? meetingsService.getById(id) : servicesService.getById(id));
      if (generation !== inspectGeneration) return;
      if (result.error || !result.data || String(result.data.id || result.data._id) !== id) {
        inspectedStatus = 'unavailable'; inspectedError = result.error?.message || 'The event is unavailable or restricted.'; return;
      }
      inspectedEvent = result.data;
      const attendeeResult = await (record.meeting ? meetingsService.getAttendees(id) : attendanceService.getByService(id));
      if (generation !== inspectGeneration) return;
      if (attendeeResult.error) { inspectedStatus = 'unavailable'; inspectedError = attendeeResult.error.message || 'Attendance details are unavailable.'; return; }
      inspectedAttendees = attendeeResult.data || [];
      inspectedStatus = 'ready';
    }
    let usingMockData = isDemoMode();
    let isGuest = $derived(["guest", "visitor", "new_believer"].includes(person?.member_status));

    // Load data whenever data.id changes
    $effect(() => {
        const id = data?.id;
        if (id) {
            untrack(() => {
                loadProfile(id);
            });
        } else {
            loading = false;
            error = "No person ID provided.";
        }
    });

    async function loadProfile(id) {
        const generation = ++requestGeneration;
        inspectGeneration++;
        attendanceDrilldown = null;
        inspectedEvent = null;
        inspectedAttendees = [];
        loading = true;
        error = null;
        person = null;
        profileTab = "activity";
        sectionErrors = {};
        attendanceHistory = [];
        outreachContacts = [];
        visitations = [];
        careProfile = { tasks: [] };
        try {
            const personData = await profileRequest(peopleService.getById(id));
            if (generation !== requestGeneration) return;
            person = personData;
            const results = await Promise.allSettled([
                profileRequest(attendanceService.getByPerson(id)),
                profileRequest(meetingsService.getByPerson(id)),
                profileRequest(evangelismService.getByInviter(id)),
                profileRequest(visitationsService.getByPerson(id)),
                profileRequest(followUpCrmService.getContactProfile(id)),
            ]);
            if (generation !== requestGeneration) return;
            const [services, meetings, outreach, care, tasks] = results;
            sectionErrors = {
                attendance: services.status === "rejected" || meetings.status === "rejected",
                outreach: outreach.status === "rejected",
                care: care.status === "rejected" || tasks.status === "rejected",
            };
            attendanceHistory = sectionErrors.attendance ? [] : recordedAttendance([...services.value, ...meetings.value]);
            outreachContacts = outreach.status === "fulfilled" ? outreach.value : [];
            visitations = care.status === "fulfilled" ? care.value : [];
            careProfile = tasks.status === "fulfilled" ? tasks.value : { tasks: [] };
        } catch (e) {
            if (generation === requestGeneration) error = e.message || "This profile could not be loaded.";
        } finally {
            if (generation === requestGeneration) loading = false;
        }
    }

    async function handleEditSave(updatedPerson) {
        const personId = person._id || person.id;
        const { data: freshData, error: freshError } =
            await peopleService.getById(personId);
        if (freshError) throw freshError;
        person = freshData;
    }

    async function openMergeReview() {
        if (!person) return;
        showMergeModal = true;
        mergeCandidates = [];
        mergeTargetId = "";
        mergePreview = null;
        mergeError = null;
        mergeConfirmed = false;
        mergeLoading = true;
        const result = await peopleService.getAll();
        mergeLoading = false;
        if (result.error) {
            mergeError = result.error.message || "Could not load records for merge review.";
            return;
        }
        const currentId = person._id || person.id;
        mergeCandidates = (result.data || []).filter(
            (candidate) => (candidate.id || candidate._id) !== currentId && candidate.member_status !== "archived",
        );
    }

    async function previewMerge() {
        if (!mergeTargetId || !person) return;
        mergeLoading = true;
        mergeError = null;
        mergeConfirmed = false;
        const result = await peopleService.getMergePreview(person._id || person.id, mergeTargetId);
        mergeLoading = false;
        if (result.error) {
            mergeError = result.error.message || "Could not prepare this merge.";
            return;
        }
        mergePreview = result.data;
    }

    async function completeMerge() {
        if (!mergePreview || !mergeConfirmed) return;
        mergeLoading = true;
        mergeError = null;
        const result = await peopleService.mergeReviewed(mergePreview);
        mergeLoading = false;
        if (result.error) {
            mergeError = result.error.message || "The merge could not be completed.";
            return;
        }
        showMergeModal = false;
        await goto(`/people/${mergePreview.target.id}`);
    }

    async function updateMemberStatus(newStatus) {
        if (!person) return;
        updatingStatus = true;
        statusUpdateError = null;

        try {
            const personId = person._id || person.id;
            const { error: updateError } = await peopleService.update(
                personId,
                {
                    member_status: newStatus,
                },
            );
            if (updateError) throw updateError;
            // Update local state
            person = { ...person, member_status: newStatus };
        } catch (err) {
            console.error("Failed to update status:", err);
            statusUpdateError = "Failed to update status. Please try again.";
        } finally {
            updatingStatus = false;
        }
    }

    async function updateActivityStatus(newStatus) {
        if (!person) return;
        updatingStatus = true;
        statusUpdateError = null;

        try {
            const personId = person._id || person.id;
            const { error: updateError } = await peopleService.update(
                personId,
                {
                    activity_status: newStatus,
                },
            );
            if (updateError) throw updateError;
            // Update local state
            person = { ...person, activity_status: newStatus };
        } catch (err) {
            console.error("Failed to update activity status:", err);
            statusUpdateError = "Failed to update activity. Please try again.";
        } finally {
            updatingStatus = false;
        }
    }

    function calculateCurrentAge() {
        const dobStr = person?.birthday || person?.date_of_birth;
        if (!dobStr) return null;
        const dob = new Date(dobStr);
        if (isNaN(dob.getTime())) return null;
        const now = new Date();
        let age = now.getFullYear() - dob.getFullYear();
        if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
        return age >= 0 ? age : null;
    }

    const currentAge = $derived(calculateCurrentAge());
</script>

<DashboardLayout>
    <div class="space-y-6 pb-10">
        {#if loading}
            <div class="flex items-center justify-center h-64">
                <div
                    class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
                ></div>
            </div>
        {:else if error}
            <div
                class="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20"
            >
                <h3 class="font-semibold">Error Loading Profile</h3>
                <p>{error}</p>
                <Button
                    variant="outline"
                    class="mt-4"
                    onclick={() => location.reload()}>Retry</Button
                >
            </div>
        {:else if person}
            {#if usingMockData}
                <div
                    class="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-lg text-sm border border-blue-500/20 mb-4 flex items-center justify-between"
                >
                    <span
                        >Demo mode: this profile contains sample data.</span
                    >
                </div>
            {/if}

            <Motion delay={0}>
                {#if peekMeetingReturn()}<a href="/meetings" class="mb-3 inline-block text-sm text-primary">← Back to meeting details</a>{/if}
                <ProfileHeader
                    {person}
                    onUpdateStatus={updateMemberStatus}
                    onUpdateActivity={updateActivityStatus}
                    onEdit={() => (showEditModal = true)}
                    {updatingStatus}
                    {statusUpdateError}
                />
            </Motion>

            <PersonForm
                bind:isOpen={showEditModal}
                {person}
                onsave={handleEditSave}
            />

            <Modal bind:isOpen={showMergeModal} title="Review duplicate merge" size="lg" tone="warning">
                <div class="space-y-4">
                    <p class="text-sm text-muted-foreground">
                        Keep one record and archive this profile as its duplicate. The preview lists every linked record that would move; it refuses ambiguous attendance, programme, commitment, plan, leader, or account relationships.
                    </p>
                    {#if mergeError}
                        <p class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{mergeError}</p>
                    {/if}
                    <label class="block text-sm font-medium text-foreground" for="merge-target">
                        Keep this record
                    </label>
                    <select id="merge-target" bind:value={mergeTargetId} onchange={() => { mergePreview = null; mergeConfirmed = false; }} disabled={mergeLoading} class="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
                        <option value="">Choose the record to retain…</option>
                        {#each mergeCandidates as candidate}
                            <option value={candidate.id || candidate._id}>
                                {candidate.first_name} {candidate.last_name} — {candidate.email || candidate.phone || "no contact details"}
                            </option>
                        {/each}
                    </select>

                    {#if mergePreview}
                        <section class="rounded-lg border border-border bg-secondary/15 p-4 text-sm">
                            <h3 class="font-semibold text-foreground">Preview</h3>
                            <p class="mt-1 text-muted-foreground">
                                Archive {mergePreview.source.first_name} {mergePreview.source.last_name}; retain {mergePreview.target.first_name} {mergePreview.target.last_name}.
                            </p>
                            <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
                                {#each Object.entries(mergePreview.relationshipCounts).filter(([, count]) => count > 0) as [name, count]}
                                    <div class="flex justify-between gap-2"><dt>{name.replaceAll(/([A-Z])/g, " $1")}</dt><dd class="font-medium text-foreground">{count}</dd></div>
                                {/each}
                            </dl>
                            {#if mergePreview.conflictReasons.length > 0}
                                <div class="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-warning">
                                    <p class="font-medium">Manual reconciliation is needed</p>
                                    <ul class="mt-1 list-disc pl-5">
                                        {#each mergePreview.conflictReasons as reason}<li>{reason}</li>{/each}
                                    </ul>
                                </div>
                            {:else}
                                <label class="mt-4 flex items-start gap-2 text-foreground">
                                    <input type="checkbox" bind:checked={mergeConfirmed} class="mt-1 h-4 w-4" />
                                    <span>I reviewed the retained record and the linked-record counts. Archive this duplicate and transfer the listed relationships.</span>
                                </label>
                            {/if}
                        </section>
                    {/if}
                </div>
                {#snippet footer()}
                    <Button variant="secondary" onclick={() => (showMergeModal = false)} disabled={mergeLoading}>Cancel</Button>
                    {#if mergePreview?.canMerge}
                        <Button variant="danger" onclick={completeMerge} disabled={!mergeConfirmed || mergeLoading}>Merge and archive duplicate</Button>
                    {:else}
                        <Button onclick={previewMerge} disabled={!mergeTargetId || mergeLoading}>{mergeLoading ? "Preparing…" : "Preview merge"}</Button>
                    {/if}
                {/snippet}
            </Modal>

            <PeopleStatsGrid {totalAttendance} {lastAttended} unavailable={sectionErrors.attendance} onhistory={() => openAttendance()} onlatest={() => attendanceHistory.length && openAttendance(attendanceHistory[0])} />

            {#if sectionErrors.care}
                <p class="rounded-xl border border-border p-4 text-sm text-muted-foreground">Sunday commitment history is unavailable. Retry profile history to see expected-Sunday follow-through.</p>
            {:else}
                <SundayReliabilitySummary commitments={careProfile?.commitments || []} summary={careProfile?.sunday_reliability || null} />
            {/if}

            <a class="development-entry" href="/development?person={encodeURIComponent(person._id || person.id)}">Open Development assessment <span aria-hidden="true">→</span><small>Participation evidence, leader review and growth agreements</small></a>

            <div class="profile-views" aria-label="Profile view">
                <button type="button" aria-pressed={profileTab === "activity"} onclick={() => profileTab = "activity"}>Activity & care</button>
                <button type="button" aria-pressed={profileTab === "details"} onclick={() => profileTab = "details"}>Personal & church details</button>
            </div>
            {#if Object.values(sectionErrors).some(Boolean)}
                <div class="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm" role="status">
                    Some profile history could not be loaded. Unavailable sections are marked below.
                    <button type="button" class="ml-2 text-primary underline" onclick={() => loadProfile(data.id)}>Retry history</button>
                </div>
            {/if}
            {#if profileTab === "activity"}
                {#if sectionErrors.care}
                    <p class="rounded-xl border border-border p-6 text-sm text-muted-foreground">Pastoral care is unavailable. Retry to check care activity and open actions.</p>
                {:else}
                    <CareSummary {person} {visitations} tasks={careProfile?.tasks || []} />
                {/if}
                <ProfileHistoryTabs
                    {attendanceHistory} {outreachContacts} {visitations}
                    errors={sectionErrors}
                    storageKey={null}
                    onRecordClick={openAttendance}
                    onOutreachClick={(record) => {
                        selectedOutreachRecord = record;
                        showOutreachDetailModal = true;
                    }}
                    onVisitationClick={(record) => {
                        selectedVisitationRecord = record;
                        showVisitationDetailModal = true;
                    }}
                />
            {:else}
                <ProfileDetails {person} {currentAge} {isGuest} onEdit={() => showEditModal = true} onMerge={openMergeReview} />
            {/if}

            <ProfileAttendanceDrilldown bind:state={attendanceDrilldown} history={attendanceHistory} {person} event={inspectedEvent} attendees={inspectedAttendees} status={inspectedStatus} error={inspectedError} onretry={() => inspectedRecord && inspectAttendance(inspectedRecord)} onrecord={inspectAttendance} />
            <EvangelismDetailModal
                bind:isOpen={showOutreachDetailModal}
                contact={selectedOutreachRecord}
            />
            <VisitationDetailModal
                bind:isOpen={showVisitationDetailModal}
                visitation={selectedVisitationRecord}
            />
        {/if}
    </div>
</DashboardLayout>

<style>
    .profile-views { display: flex; gap: 24px; border-bottom: 1px solid hsl(var(--border)); }
    .development-entry { display: grid; grid-template-columns: 1fr auto; gap: 3px 12px; padding: 16px 18px; border: 1px solid hsl(var(--primary) / .3); border-radius: 12px; background: hsl(var(--primary) / .05); color: hsl(var(--foreground)); font-weight: 600; } .development-entry span { color: hsl(var(--primary)); } .development-entry small { grid-column: 1 / -1; color: hsl(var(--muted-foreground)); font-size: 12px; font-weight: 400; }
    .profile-views button { padding: 12px 0; font-size: 14px; color: hsl(var(--muted-foreground)); border-bottom: 2px solid transparent; }
    .profile-views button[aria-pressed="true"] { border-color: hsl(var(--primary)); color: hsl(var(--foreground)); font-weight: 600; }
</style>
