<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { Card, Button, Badge, Motion } from "$lib/components/ui";
    import * as peopleService from "$lib/services/peopleService";
    import * as attendanceService from "$lib/services/attendanceService";
    import * as evangelismService from "$lib/services/evangelismService";
    import * as visitationsService from "$lib/services/visitationsService";

    // New Modular Components
    import ProfileHeader from "$lib/components/people/ProfileHeader.svelte";
    import PeopleStatsGrid from "$lib/components/people/PeopleStatsGrid.svelte";
    import EngagementRadarSection from "$lib/components/people/EngagementRadarSection.svelte";
    import ProfileDetails from "$lib/components/people/ProfileDetails.svelte";
    import ProfileHistoryTabs from "$lib/components/people/ProfileHistoryTabs.svelte";
    import PersonForm from "$lib/components/forms/PersonForm.svelte";
    import ServiceDetailModal from "$lib/components/people/ServiceDetailModal.svelte";

    let { data } = $props();

    let person = $state(null);
    let loading = $state(true);
    let error = $state(null);
    let showEditModal = $state(false);
    let showServiceDetailModal = $state(false);
    let selectedAttendanceRecord = $state(null);
    let attendanceHistory = $state([]);
    let outreachContacts = $state([]);
    let visitations = $state([]);

    // Status update states
    let updatingStatus = $state(false);
    let statusUpdateError = $state(null);

    // Derived stats
    let totalAttendance = $derived(attendanceHistory?.length || 0);

    let lastAttended = $derived.by(() => {
        if (!attendanceHistory || attendanceHistory.length === 0) return null;
        // Assuming records are sorted desc by default, but safe to sort/max
        const dates = attendanceHistory.map((r) =>
            new Date(r.created_at).getTime(),
        );
        return new Date(Math.max(...dates));
    });

    // Check if we're using mock data (for UI indication)
    let usingMockData = $derived(person?._id?.startsWith("mock-"));

    let isGuest = $derived(
        person?.member_status === "guest" ||
            person?.member_status === "visitor" ||
            person?.member_status === "new_believer",
    );

    function prayerMeetingsCount() {
        if (!attendanceHistory) return 0;
        return attendanceHistory.filter(
            (r) => r.service_type === "prayer_meeting",
        ).length;
    }

    function activityScore() {
        if (!attendanceHistory) return 0;
        const recent = attendanceHistory.slice(0, 10);
        if (recent.length === 0) return 0;
        // Simple mock score: % of weeks attended in last 10 weeks
        // In real app, this would be more complex
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
                A: (person.ministries?.length || 0) * 25,
                fullMark: 100,
            },
            {
                subject: "Outreach",
                A: (outreachContacts?.length || 0) * 20,
                fullMark: 100,
            },
            {
                subject: "Giving",
                A: person.is_tithing ? 90 : 30,
                fullMark: 100,
            },
        ];
    }

    function cellGroupDetail() {
        // This would come from the person object or related service
        return person?.care_group || "Not assigned";
    }

    // Helper function to wrap a promise with a timeout
    function withTimeout(promise, timeoutMs, fallbackValue) {
        return Promise.race([
            promise,
            new Promise((resolve) =>
                setTimeout(() => resolve(fallbackValue), timeoutMs),
            ),
        ]);
    }

    // Load Data
    onMount(async () => {
        console.log("[Profile] Starting to load profile for ID:", data.id);
        try {
            loading = true;

            // 1. Fetch Person Details (critical - must succeed)
            console.log("[Profile] Fetching person details...");
            const personResult = await withTimeout(
                peopleService.getById(data.id),
                10000,
                { data: null, error: new Error("Timeout loading person") },
            );

            if (personResult.error) throw personResult.error;
            if (!personResult.data) throw new Error("Person not found");
            person = personResult.data;
            console.log(
                "[Profile] Person loaded:",
                person.first_name,
                person.last_name,
            );

            // 2. Fetch secondary data in parallel with timeouts
            // These are non-critical - page should still load if they fail
            console.log("[Profile] Fetching secondary data in parallel...");
            const [attendanceResult, outreachResult, visitationsResult] =
                await Promise.allSettled([
                    withTimeout(attendanceService.getByPerson(data.id), 8000, {
                        data: [],
                        error: null,
                    }),
                    withTimeout(evangelismService.getByInviter(data.id), 8000, {
                        data: [],
                        error: null,
                    }),
                    withTimeout(visitationsService.getByPerson(data.id), 8000, {
                        data: [],
                        error: null,
                    }),
                ]);

            // Process attendance
            if (
                attendanceResult.status === "fulfilled" &&
                attendanceResult.value?.data
            ) {
                attendanceHistory = attendanceResult.value.data;
                console.log(
                    "[Profile] Attendance loaded:",
                    attendanceHistory.length,
                    "records",
                );
            } else {
                console.warn(
                    "[Profile] Failed to load attendance:",
                    attendanceResult,
                );
                attendanceHistory = [];
            }

            // Process outreach
            if (
                outreachResult.status === "fulfilled" &&
                outreachResult.value?.data
            ) {
                outreachContacts = outreachResult.value.data;
                console.log(
                    "[Profile] Outreach loaded:",
                    outreachContacts.length,
                    "contacts",
                );
            } else {
                console.warn(
                    "[Profile] Failed to load outreach:",
                    outreachResult,
                );
                outreachContacts = [];
            }

            // Process visitations
            if (
                visitationsResult.status === "fulfilled" &&
                visitationsResult.value?.data
            ) {
                visitations = visitationsResult.value.data;
                console.log(
                    "[Profile] Visitations loaded:",
                    visitations.length,
                    "records",
                );
            } else {
                console.warn(
                    "[Profile] Failed to load visitations:",
                    visitationsResult,
                );
                visitations = [];
            }

            console.log("[Profile] All data loaded successfully!");
        } catch (e) {
            console.error("[Profile] Failed to load person profile:", e);
            error = e.message || "Failed to load profile";
        } finally {
            loading = false;
        }
    });

    async function handleEditSave(updatedPerson) {
        // Optimistic update or reload
        // person = { ...person, ...updatedPerson };
        // Reload to be safe and get server transformations
        const { data: freshData, error: freshError } =
            await peopleService.getById(person._id);
        if (freshError) throw freshError;
        person = freshData;
    }

    async function updateMemberStatus(newStatus) {
        if (!person) return;
        updatingStatus = true;
        statusUpdateError = null;

        try {
            const { error: updateError } = await peopleService.update(
                person._id,
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
            const { error: updateError } = await peopleService.update(
                person._id,
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
        if (!person?.date_of_birth) return null;
        const dob = new Date(person.date_of_birth);
        const diff_ms = Date.now() - dob.getTime();
        const age_dt = new Date(diff_ms);
        return Math.abs(age_dt.getUTCFullYear() - 1970);
    }

    const currentAge = $derived(calculateCurrentAge());
</script>

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
                {updatingStatus}
                {statusUpdateError}
            />
        </Motion>

        <PersonForm
            bind:isOpen={showEditModal}
            {person}
            onsave={handleEditSave}
        />

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
            <ProfileHistoryTabs
                {attendanceHistory}
                {outreachContacts}
                {visitations}
                onRecordClick={(record) => {
                    selectedAttendanceRecord = record;
                    showServiceDetailModal = true;
                }}
            />
        </Motion>

        <ServiceDetailModal
            bind:isOpen={showServiceDetailModal}
            attendanceRecord={selectedAttendanceRecord}
        />
    {/if}
</div>
