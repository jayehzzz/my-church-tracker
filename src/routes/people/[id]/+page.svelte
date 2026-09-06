<script>
    import { onMount, untrack } from "svelte";
    import { goto } from "$app/navigation";
    import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
    import { Card, Button, Badge, Modal, Motion } from "$lib/components/ui";
    import * as peopleService from "$lib/services/peopleService";
    import * as attendanceService from "$lib/services/attendanceService";
    import * as meetingsService from "$lib/services/meetingsService";
    import * as evangelismService from "$lib/services/evangelismService";
    import * as visitationsService from "$lib/services/visitationsService";
    import * as followUpCrmService from "$lib/services/followUpCrmService.js";
    import {
        getPersonById as getMockPersonById,
        getAttendanceByPerson,
        getContactsByInviter,
        getVisitationsByPerson,
    } from "$lib/data/mockData.js";

    // New Modular Components
    import ProfileHeader from "$lib/components/people/ProfileHeader.svelte";
    import PeopleStatsGrid from "$lib/components/people/PeopleStatsGrid.svelte";
    import EngagementRadarSection from "$lib/components/people/EngagementRadarSection.svelte";
    import ProfileDetails from "$lib/components/people/ProfileDetails.svelte";
    import ProfileHistoryTabs from "$lib/components/people/ProfileHistoryTabs.svelte";
    import PersonForm from "$lib/components/forms/PersonForm.svelte";
    import ServiceDetailModal from "$lib/components/people/ServiceDetailModal.svelte";
    import CareSummary from "$lib/components/people/CareSummary.svelte";

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
    let showServiceDetailModal = $state(false);
    let selectedAttendanceRecord = $state(null);
    let attendanceHistory = $state([]);
    let outreachContacts = $state([]);
    let visitations = $state([]);
    let careProfile = $state({ tasks: [] });

    // Status update states
    let updatingStatus = $state(false);
    let statusUpdateError = $state(null);

    // Derived stats
    let totalAttendance = $derived(attendanceHistory?.length || 0);

    let lastAttended = $derived.by(() => {
        if (!attendanceHistory || attendanceHistory.length === 0) return null;
        // Assuming records are sorted desc by default, but safe to sort/max
        const validDates = attendanceHistory
            .map(
                (r) =>
                    r.meeting?.meeting_date ||
                    r.services?.service_date ||
                    r.created_at ||
                    r.service_date ||
                    r.date,
            )
            .filter(Boolean)
            .map((d) => new Date(d).getTime())
            .filter((t) => !isNaN(t));

        if (validDates.length === 0) return null;
        return new Date(Math.max(...validDates));
    });

    // Check if we're using mock data (for UI indication)
    let usingMockData = $derived(
        !person?._id ||
            person?._id?.startsWith("mock-") ||
            String(person?.id).length <= 5,
    );

    let isGuest = $derived(
        person?.member_status === "guest" ||
            person?.member_status === "visitor" ||
            person?.member_status === "new_believer",
    );

    function prayerMeetingsCount() {
        if (!attendanceHistory) return 0;
        return attendanceHistory.filter(
            (r) =>
                r.meeting?.program?.category === "prayer" ||
                [
                    "flow_service",
                    "flow_prayer",
                    "acts_prayer",
                    "farley_prayer",
                    "shemen_prayer",
                    "all_night_prayer",
                ].includes(r.meeting?.meeting_type || r.service_type),
        ).length;
    }

    function activityScore() {
        if (!attendanceHistory) return 0;
        const recent = attendanceHistory.slice(0, 10);
        if (recent.length === 0) return 0;
        // Simple mock score: % of weeks attended in last 10 weeks
        return Math.min(100, Math.round((recent.length / 10) * 100));
    }

    // Engagement Radar Data Preparation
    function engagementData() {
        if (!person) return [];
        // Mock data logic for radar chart visualization
        return [
            {
                subject: "Sunday Service",
                A: totalAttendance > 20 ? 95 : totalAttendance * 4,
                fullMark: 100,
            },
            {
                subject: "Prayer Meeting",
                A: prayerMeetingsCount() * 10,
                fullMark: 100,
            },
            {
                subject: "Small Group",
                A: person.care_group ? 85 : 20,
                fullMark: 100,
            },
            {
                subject: "Serving",
                A: (person.ministries?.length || person.basontas?.length || 0) * 25,
                fullMark: 100,
            },
            {
                subject: "Outreach",
                A: (outreachContacts?.length || 0) * 20,
                fullMark: 100,
            },
            {
                subject: "Giving",
                A: person.is_tithing || person.is_tither ? 90 : 30,
                fullMark: 100,
            },
        ];
    }

    function cellGroupDetail() {
        return person?.care_group || "Not assigned";
    }

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

    function withTimeout(promise, timeoutMs, fallbackValue) {
        return Promise.race([
            promise,
            new Promise((resolve) =>
                setTimeout(() => resolve(fallbackValue), timeoutMs),
            ),
        ]);
    }

    async function loadProfile(id) {
        if (!id) return;
        console.log("[Profile] Starting to load profile for ID:", id);
        loading = true;
        error = null;
        person = null;
        attendanceHistory = [];
        outreachContacts = [];
        visitations = [];
        careProfile = { tasks: [] };

        try {
            // 1. Fetch person details first
            let personData = null;
            try {
                const res = await withTimeout(
                    peopleService.getById(id),
                    2500,
                    null,
                );
                personData = res?.data;
            } catch (err) {
                console.warn("[Profile] Error getting person from service:", err);
            }

            // Fallback to local mock data if not found
            if (!personData) {
                personData = getMockPersonById(id);
            }

            if (!personData) {
                throw new Error(`Person with ID "${id}" could not be found.`);
            }

            person = personData;
            console.log(
                "[Profile] Person loaded:",
                person.first_name,
                person.last_name,
            );

            // 2. Fetch secondary data in parallel
            const [
                attendanceResult,
                meetingAttendanceResult,
                outreachResult,
                visitationsResult,
                careProfileResult,
            ] =
                await Promise.allSettled([
                    withTimeout(
                        attendanceService.getByPerson(id),
                        2000,
                        { data: getAttendanceByPerson(id), error: null },
                    ),
                    withTimeout(meetingsService.getByPerson(id), 2000, {
                        data: [],
                        error: null,
                    }),
                    withTimeout(
                        evangelismService.getByInviter(id),
                        2000,
                        { data: getContactsByInviter(id), error: null },
                    ),
                    withTimeout(
                        visitationsService.getByPerson(id),
                        2000,
                        { data: getVisitationsByPerson(id), error: null },
                    ),
                    withTimeout(
                        followUpCrmService.getContactProfile(id),
                        2500,
                        { data: { tasks: [] }, error: null },
                    ),
                ]);

            // Process attendance
            const sundayAttendance =
                attendanceResult.status === "fulfilled" &&
                attendanceResult.value?.data
                    ? attendanceResult.value.data
                    : getAttendanceByPerson(id);
            const meetingAttendance =
                meetingAttendanceResult.status === "fulfilled" &&
                meetingAttendanceResult.value?.data
                    ? meetingAttendanceResult.value.data
                    : [];
            attendanceHistory = [...sundayAttendance, ...meetingAttendance].sort(
                (a, b) => {
                    const aDate =
                        a.meeting?.meeting_date ||
                        a.services?.service_date ||
                        a.created_at ||
                        "";
                    const bDate =
                        b.meeting?.meeting_date ||
                        b.services?.service_date ||
                        b.created_at ||
                        "";
                    return bDate.localeCompare(aDate);
                },
            );

            // Process outreach
            outreachContacts =
                outreachResult.status === "fulfilled" &&
                outreachResult.value?.data
                    ? outreachResult.value.data
                    : getContactsByInviter(id);

            // Process visitations
            visitations =
                visitationsResult.status === "fulfilled" &&
                visitationsResult.value?.data
                    ? visitationsResult.value.data
                    : getVisitationsByPerson(id);

            careProfile =
                careProfileResult.status === "fulfilled" &&
                careProfileResult.value?.data
                    ? careProfileResult.value.data
                    : { tasks: [] };

            console.log("[Profile] All data loaded successfully for:", id);
        } catch (e) {
            console.error("[Profile] Failed to load person profile:", e);
            error = e.message || "Failed to load profile";
        } finally {
            loading = false;
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
        const diff_ms = Date.now() - dob.getTime();
        const age_dt = new Date(diff_ms);
        return Math.abs(age_dt.getUTCFullYear() - 1970);
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
                        >Currently viewing mock data. Some features may be
                        simulated.</span
                    >
                </div>
            {/if}

            <Motion delay={0}>
                <ProfileHeader
                    {person}
                    onUpdateStatus={updateMemberStatus}
                    onUpdateActivity={updateActivityStatus}
                    onEdit={() => (showEditModal = true)}
                    onMerge={openMergeReview}
                    {updatingStatus}
                    {statusUpdateError}
                />
            </Motion>

            <PersonForm
                bind:isOpen={showEditModal}
                {person}
                onsave={handleEditSave}
            />

            <Modal bind:isOpen={showMergeModal} title="Review duplicate merge" size="lg">
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
                    <select id="merge-target" bind:value={mergeTargetId} disabled={mergeLoading} class="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
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

            <Motion delay={100}>
                <PeopleStatsGrid
                    {totalAttendance}
                    {lastAttended}
                    prayerMeetingsCount={prayerMeetingsCount()}
                    activityScore={activityScore()}
                />
            </Motion>

            <!-- Main Content Grid -->
            <Motion delay={200}>
                <EngagementRadarSection
                    engagementData={engagementData()}
                    cellGroupDetail={cellGroupDetail()}
                    {person}
                />
            </Motion>

            <Motion delay={300}>
                <ProfileDetails
                    {person}
                    {currentAge}
                    {isGuest}
                    {outreachContacts}
                    {visitations}
                />
            </Motion>

            <Motion delay={400}>
                <CareSummary
                    {person}
                    {visitations}
                    tasks={careProfile?.tasks || []}
                />
            </Motion>

            <Motion delay={500}>
                <ProfileHistoryTabs
                    {attendanceHistory}
                    {outreachContacts}
                    {visitations}
                    onRecordClick={(record) => {
                        if (!record.meeting) {
                            selectedAttendanceRecord = record;
                            showServiceDetailModal = true;
                        }
                    }}
                />
            </Motion>

            <ServiceDetailModal
                bind:isOpen={showServiceDetailModal}
                attendanceRecord={selectedAttendanceRecord}
            />
        {/if}
    </div>
</DashboardLayout>
