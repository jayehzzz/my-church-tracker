<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { Card, Button, Badge } from "$lib/components/ui";
    import * as peopleService from "$lib/services/peopleService";

    import * as attendanceService from "$lib/services/attendanceService";
    import * as evangelismService from "$lib/services/evangelismService";
    import * as visitationsService from "$lib/services/visitationsService";
    import EngagementRadar from "$lib/components/charts/EngagementRadar.svelte";

    let { data } = $props();

    let person = $state(null);
    let attendanceHistory = $state([]);
    let outreachContacts = $state([]);
    let visitations = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let usingMockData = $state(false);

    // Status update state
    let updatingStatus = $state(false);
    let statusUpdateError = $state(null);
    let showStatusDropdown = $state(false);
    let showActivityDropdown = $state(false);

    // Mock people data for development/testing when Convex is not configured
    const mockPeople = {
        "1": {
            id: "1",
            first_name: "John",
            last_name: "Doe",
            email: "john.doe@example.com",
            phone: "555-1234",
            member_status: "member",
            role: "bacenta_leader",
            date_of_birth: "1990-05-15",
            gender: "male",
            marital_status: "married",
            employment_status: "employed",
            address: "123 Main Street",
            city: "Accra",
            is_baptised: true,
            is_tither: true,
            membership_date: "2020-03-15",
            first_visit_date: "2019-11-10",
            activity_status: "regular",
            notes: "Active member who leads the Zone 1 Bacenta. Very committed to discipleship and outreach activities.",
        },
        "2": {
            id: "2",
            first_name: "Jane",
            last_name: "Smith",
            email: "jane.smith@example.com",
            phone: "555-5678",
            member_status: "leader",
            role: "basonta_worker",
            date_of_birth: "1988-08-22",
            gender: "female",
            marital_status: "single",
            employment_status: "self_employed",
            address: "456 Church Road",
            city: "Tema",
            is_baptised: true,
            is_tither: true,
            membership_date: "2018-06-20",
            first_visit_date: "2018-01-14",
            activity_status: "regular",
            notes: "Leads the Basonta team for outreach events. Excellent at follow-up with new visitors.",
        },
        "3": {
            id: "3",
            first_name: "Michael",
            last_name: "Johnson",
            email: "michael.j@example.com",
            phone: "555-9012",
            member_status: "visitor",
            role: "no_role",
            date_of_birth: "1995-12-03",
            gender: "male",
            marital_status: "single",
            employment_status: "student",
            is_baptised: false,
            is_tither: false,
            first_visit_date: "2025-12-01",
            contact_category: "responsive",
            date_first_contacted: "2025-11-28",
            invited_by_name: "John Doe",
            activity_status: "irregular",
            notes: "Recently started attending. Invited by John Doe. Shows interest in the youth programs.",
        },
        "4": {
            id: "4",
            first_name: "Sarah",
            last_name: "Williams",
            email: "sarah.w@example.com",
            phone: "555-3456",
            member_status: "member",
            role: "no_role",
            date_of_birth: "1992-04-18",
            gender: "female",
            marital_status: "married",
            employment_status: "employed",
            address: "789 Faith Avenue",
            city: "Accra",
            is_baptised: true,
            is_tither: false,
            membership_date: "2022-09-10",
            first_visit_date: "2022-05-22",
            activity_status: "regular",
        },
        "5": {
            id: "5",
            first_name: "Charlie",
            last_name: "Brown",
            email: "charlie@example.com",
            phone: "555-7890",
            member_status: "archived",
            role: "no_role",
            date_of_birth: "1985-07-30",
            gender: "male",
            marital_status: "single",
            employment_status: "other",
            is_baptised: false,
            is_tither: false,
            activity_status: "dormant",
            notes: "Moved to another city. Archived as of December 2024.",
        },
    };

    // Mock attendance history data
    const mockAttendanceHistory = {
        "1": [
            {
                id: "a1",
                services: {
                    service_date: "2025-12-15",
                    service_type: "sunday_service",
                    sermon_topic: "Walking in Faith",
                },
                gave_tithe: true,
            },
            {
                id: "a2",
                services: {
                    service_date: "2025-12-08",
                    service_type: "sunday_service",
                    sermon_topic: "The Power of Prayer",
                },
                gave_tithe: true,
            },
            {
                id: "a3",
                services: {
                    service_date: "2025-12-11",
                    service_type: "flow_prayer",
                    sermon_topic: "Midweek Prayer",
                },
            },
            {
                id: "a4",
                services: {
                    service_date: "2025-12-01",
                    service_type: "sunday_service",
                    sermon_topic: "Faith Over Fear",
                },
                gave_tithe: true,
            },
            {
                id: "a5",
                services: {
                    service_date: "2025-11-24",
                    service_type: "sunday_service",
                    sermon_topic: "Thanksgiving Praise",
                },
                gave_tithe: true,
            },
            {
                id: "a6",
                services: {
                    service_date: "2025-11-17",
                    service_type: "farley_prayer",
                    sermon_topic: "Night Vigil",
                },
            },
            // Cell group meetings - Bacenta
            {
                id: "a7",
                services: {
                    service_date: "2025-12-12",
                    service_type: "bacenta",
                    sermon_topic: "Zone 1 Fellowship",
                },
            },
            {
                id: "a8",
                services: {
                    service_date: "2025-12-05",
                    service_type: "bacenta",
                    sermon_topic: "Zone 1 Bible Study",
                },
            },
            {
                id: "a9",
                services: {
                    service_date: "2025-11-28",
                    service_type: "bacenta",
                    sermon_topic: "Zone 1 Outreach Prep",
                },
            },
            {
                id: "a10",
                services: {
                    service_date: "2025-11-21",
                    service_type: "bacenta",
                    sermon_topic: "Zone 1 Prayer Meeting",
                },
            },
            {
                id: "a11",
                services: {
                    service_date: "2025-11-14",
                    service_type: "bacenta",
                    sermon_topic: "Zone 1 Fellowship",
                },
            },
            // Cell group meetings - Basonta
            {
                id: "a12",
                services: {
                    service_date: "2025-12-10",
                    service_type: "basonta",
                    sermon_topic: "Small Group Discipleship",
                },
            },
            {
                id: "a13",
                services: {
                    service_date: "2025-12-03",
                    service_type: "basonta",
                    sermon_topic: "Leadership Training",
                },
            },
            {
                id: "a14",
                services: {
                    service_date: "2025-11-26",
                    service_type: "basonta",
                    sermon_topic: "Evangelism Workshop",
                },
            },
            // More prayer meetings
            {
                id: "a15",
                services: {
                    service_date: "2025-12-06",
                    service_type: "all_night_prayer",
                    sermon_topic: "First Friday Vigil",
                },
            },
            {
                id: "a16",
                services: {
                    service_date: "2025-11-29",
                    service_type: "flow_prayer",
                    sermon_topic: "Midweek Prayer",
                },
            },
            {
                id: "a17",
                services: {
                    service_date: "2025-11-22",
                    service_type: "flow_prayer",
                    sermon_topic: "Midweek Prayer",
                },
            },
        ],
        "2": [
            {
                id: "a7",
                services: {
                    service_date: "2025-12-15",
                    service_type: "sunday_service",
                    sermon_topic: "Walking in Faith",
                },
            },
            {
                id: "a8",
                services: {
                    service_date: "2025-12-08",
                    service_type: "sunday_service",
                    sermon_topic: "The Power of Prayer",
                },
            },
            {
                id: "a9",
                services: {
                    service_date: "2025-12-04",
                    service_type: "all_night_prayer",
                    sermon_topic: "All Night Prayer",
                },
            },
            {
                id: "a10",
                services: {
                    service_date: "2025-12-01",
                    service_type: "sunday_service",
                    sermon_topic: "Faith Over Fear",
                },
            },
        ],
        "3": [
            {
                id: "a11",
                services: {
                    service_date: "2025-12-15",
                    service_type: "sunday_service",
                    sermon_topic: "Walking in Faith",
                },
            },
            {
                id: "a12",
                services: {
                    service_date: "2025-12-01",
                    service_type: "sunday_service",
                    sermon_topic: "Faith Over Fear",
                },
            },
        ],
        "4": [
            {
                id: "a13",
                services: {
                    service_date: "2025-12-15",
                    service_type: "sunday_service",
                    sermon_topic: "Walking in Faith",
                },
            },
            {
                id: "a14",
                services: {
                    service_date: "2025-12-08",
                    service_type: "sunday_service",
                    sermon_topic: "The Power of Prayer",
                },
            },
            {
                id: "a15",
                services: {
                    service_date: "2025-12-01",
                    service_type: "sunday_service",
                    sermon_topic: "Faith Over Fear",
                },
            },
        ],
        "5": [],
    };

    // Mock outreach data
    const mockOutreachData = {
        "1": [
            {
                id: "e1",
                first_name: "Michael",
                last_name: "Johnson",
                contact_date: "2025-11-28",
                response: "responsive",
                status: "visitor",
            },
            {
                id: "e2",
                first_name: "Sarah",
                last_name: "Connor",
                contact_date: "2025-11-15",
                response: "events_only",
                status: "guest",
            },
            {
                id: "e4",
                first_name: "David",
                last_name: "Wilson",
                contact_date: "2025-10-20",
                response: "responsive",
                status: "member",
            },
            {
                id: "e5",
                first_name: "Grace",
                last_name: "Mensah",
                contact_date: "2025-09-10",
                response: "responsive",
                status: "member",
            },
            {
                id: "e6",
                first_name: "Emmanuel",
                last_name: "Asante",
                contact_date: "2025-12-01",
                response: "responsive",
                status: "visitor",
            },
        ],
        "2": [
            {
                id: "e3",
                first_name: "Kyle",
                last_name: "Reese",
                contact_date: "2025-12-05",
                response: "responsive",
                status: "member",
            },
        ],
    };

    // Mock visitation data
    const mockVisitationData = {
        "1": [
            {
                id: "v3",
                visit_date: "2025-12-22",
                visited_by_name: "John Doe",
                person_visited_name: "Michael Johnson",
                outcome: "welcomed_encouraged",
                notes: "Follow-up visit after first church attendance.",
            },
            {
                id: "v4",
                visit_date: "2025-12-15",
                visited_by_name: "John Doe",
                person_visited_name: "David Wilson",
                outcome: "prayer_request_received",
                notes: "Prayed for family situation.",
            },
            {
                id: "v5",
                visit_date: "2025-12-08",
                visited_by_name: "John Doe",
                person_visited_name: "Grace Mensah",
                outcome: "welcomed_encouraged",
                notes: "Discussed baptism preparation.",
            },
            {
                id: "v6",
                visit_date: "2025-11-30",
                visited_by_name: "John Doe",
                person_visited_name: "Emmanuel Asante",
                outcome: "invited_to_service",
                notes: "Invited to upcoming special service.",
            },
            {
                id: "v7",
                visit_date: "2025-11-20",
                visited_by_name: "John Doe",
                person_visited_name: "Sarah Connor",
                outcome: "concerns_shared",
                notes: "Shared work-related concerns.",
            },
        ],
        "3": [
            {
                id: "v1",
                visit_date: "2025-12-27",
                visited_by_name: "John Doe",
                outcome: "welcomed_encouraged",
                notes: "Very positive first visit.",
            },
        ],
        "6": [
            {
                id: "v2",
                visit_date: "2025-12-20",
                visited_by_name: "Sarah Smith",
                outcome: "prayer_request_received",
                notes: "Needs prayer for health.",
            },
        ],
    };

    // Stats
    let totalAttendance = $derived(attendanceHistory.length);
    let lastAttended = $derived(
        attendanceHistory.length > 0
            ? new Date(
                  attendanceHistory[0].services?.service_date,
              ).toLocaleDateString()
            : "Never",
    );

    // Computed age from date_of_birth
    let currentAge = $derived(() => {
        if (!person?.date_of_birth) return null;
        const birthDate = new Date(person.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
            age--;
        }
        return age;
    });

    // Prayer meetings attended (filter by prayer meeting types)
    let prayerMeetingsCount = $derived(() => {
        const prayerTypes = [
            "flow_prayer",
            "farley_prayer",
            "all_night_prayer",
        ];
        return attendanceHistory.filter((a) =>
            prayerTypes.includes(a.services?.service_type),
        ).length;
    });

    // Activity score (simple composite: attendance + prayer activity)
    let activityScore = $derived(() => {
        const attendance = totalAttendance;
        const prayers = prayerMeetingsCount();
        const base = attendance * 2 + prayers * 3;
        return Math.min(100, Math.round(base * 2)); // Cap at 100
    });

    // Engagement radar data - computed from attendance, outreach, and visitations
    let engagementData = $derived(() => {
        // Service attendance: % based on total attendance (cap at 100%)
        const serviceAttendance = Math.min(100, totalAttendance * 8);

        // Prayer meetings: based on prayer meeting count
        const prayerMeetings = Math.min(100, prayerMeetingsCount() * 15);

        // Cell groups: based on bacenta/basonta meeting attendance
        const cellGroupTypes = ["bacenta", "basonta", "sat"];
        const cellGroupCount = attendanceHistory.filter((a) =>
            cellGroupTypes.includes(a.services?.service_type),
        ).length;
        const cellGroups = Math.min(100, cellGroupCount * 12);

        // Evangelism impact: based on people invited
        const evangelismImpact = Math.min(100, outreachContacts.length * 20);

        // Giving consistency: based on is_tither flag + tithe records in attendance
        const titheRecords = attendanceHistory.filter(
            (a) => a.gave_tithe,
        ).length;
        const givingConsistency = person?.is_tither
            ? Math.min(
                  100,
                  50 + (titheRecords / Math.max(1, totalAttendance)) * 50,
              )
            : Math.min(
                  100,
                  (titheRecords / Math.max(1, totalAttendance)) * 100,
              );

        // Visitation activity: based on visits received or made
        const visitationActivity = Math.min(100, visitations.length * 15);

        return {
            serviceAttendance: Math.round(serviceAttendance),
            prayerMeetings: Math.round(prayerMeetings),
            cellGroups: Math.round(cellGroups),
            evangelismImpact: Math.round(evangelismImpact),
            givingConsistency: Math.round(givingConsistency),
            visitationActivity: Math.round(visitationActivity),
        };
    });

    // Cell group detail for hover breakdown
    let cellGroupDetail = $derived(() => {
        const bacentaCount = attendanceHistory.filter(
            (a) => a.services?.service_type === "bacenta",
        ).length;
        const basontaCount = attendanceHistory.filter(
            (a) => a.services?.service_type === "basonta",
        ).length;

        return {
            bacenta: Math.min(100, bacentaCount * 15),
            basonta: Math.min(100, basontaCount * 15),
        };
    });

    $effect(() => {
        loadData(data.id);
    });

    async function loadData(id) {
        if (!id) return;
        try {
            loading = true;
            error = null;
            usingMockData = false;

            const [
                personResult,
                attendanceResult,
                evangelismResult,
                visitationsResult,
            ] = await Promise.all([
                peopleService.getById(id),
                attendanceService.getByPerson(id),
                evangelismService.getByInviter(id),
                visitationsService.getByPerson(id),
            ]);

            // Check for errors - if any error, fall back to mock data
            if (
                personResult.error ||
                attendanceResult.error ||
                !personResult.data
            ) {
                // If specific service fails (like new ones not deployed yet), just log and continue with partial data if person exists
                if (personResult.data) {
                    console.warn(
                        "Some data services failed or not implemented yet",
                    );
                } else {
                    throw new Error("Convex not configured or data not found");
                }
            }

            person = personResult.data;
            // Filter out null services if any referential integrity issues
            attendanceHistory = (attendanceResult.data || [])
                .filter((a) => a.services)
                .sort(
                    (a, b) =>
                        new Date(b.services.service_date) -
                        new Date(a.services.service_date),
                );

            outreachContacts = (evangelismResult.data || []).sort(
                (a, b) => new Date(b.contact_date) - new Date(a.contact_date),
            );

            visitations = (visitationsResult.data || []).sort(
                (a, b) => new Date(b.visit_date) - new Date(a.visit_date),
            );
        } catch (e) {
            console.warn("Using mock data for profile:", e.message);

            // Fall back to mock data
            const mockPerson = mockPeople[id];
            if (mockPerson) {
                person = mockPerson;
                attendanceHistory = (mockAttendanceHistory[id] || []).sort(
                    (a, b) =>
                        new Date(b.services.service_date) -
                        new Date(a.services.service_date),
                );
                outreachContacts = mockOutreachData[id] || [];
                // For visitations, we check if this person ID is a target of visitation OR (optional enhancement) if they did the visiting
                // checking mock data for visitations WHERE person_id matches
                visitations = mockVisitationData[id] || [];

                usingMockData = true;
                error = null; // Clear error since we have mock data
            } else {
                // No mock data for this ID either
                error = `Person with ID "${id}" not found. Try IDs 1-5 for demo data.`;
            }
        } finally {
            loading = false;
        }
    }

    function getInitials(p) {
        if (!p) return "";
        return (
            (p.first_name?.[0] || "") + (p.last_name?.[0] || "")
        ).toUpperCase();
    }

    function formatDate(dateStr) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function formatShortDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    function formatGender(gender) {
        const map = {
            male: "Male",
            female: "Female",
            prefer_not_to_say: "Prefer not to say",
        };
        return map[gender] || gender || "—";
    }

    function formatMaritalStatus(status) {
        const map = {
            single: "Single",
            married: "Married",
            beloved: "Beloved",
        };
        return map[status] || status || "—";
    }

    function formatEmploymentStatus(status) {
        const map = {
            employed: "Employed",
            self_employed: "Self-Employed",
            student: "Student",
            other: "Other",
        };
        return map[status] || status || "—";
    }

    function formatRole(role) {
        const map = {
            basonta_worker: "Basonta Worker",
            bacenta_leader: "Bacenta Leader",
            no_role: "No Role",
        };
        return map[role] || role || "No Role";
    }

    function formatContactCategory(category) {
        const map = {
            responsive: "Responsive",
            non_responsive: "Non-Responsive",
            has_church: "Has Church",
            events_only: "Events Only",
            big_events_only: "Big Events Only",
            bacenta_mainly: "Bacenta Mainly",
            do_not_contact: "Do Not Contact",
        };
        return map[category] || category || "—";
    }

    function formatActivityStatus(status) {
        const map = {
            regular: "Regular",
            irregular: "Irregular",
            dormant: "Dormant",
        };
        return map[status] || status || "—";
    }

    function formatOutcome(outcome) {
        const map = {
            welcomed_encouraged: "Welcomed & Encouraged",
            prayer_request_received: "Prayer Request",
            not_home: "Not Home",
            concerns_shared: "Concerns Shared",
            invited_to_service: "Invited to Service",
        };
        return map[outcome] || outcome || "—";
    }

    function getOutcomeVariant(outcome) {
        const map = {
            welcomed_encouraged: "success",
            prayer_request_received: "info",
            not_home: "secondary",
            concerns_shared: "warning",
            invited_to_service: "default",
        };
        return map[outcome] || "secondary";
    }

    // Is this person a guest (for conditional sections)
    let isGuest = $derived(
        person?.member_status === "guest" ||
            person?.member_status === "visitor" ||
            !person?.member_status,
    );

    // Get status badge variant
    function getStatusVariant(status) {
        const map = {
            member: "default",
            leader: "success",
            guest: "secondary",
            visitor: "secondary",
            archived: "destructive",
        };
        return map[status?.toLowerCase()] || "secondary";
    }

    // Status options for dropdown
    const statusOptions = [
        { value: "guest", label: "Guest" },
        { value: "member", label: "Member" },
        { value: "leader", label: "Leader" },
        { value: "archived", label: "Archived" },
    ];

    // Update member status
    async function updateMemberStatus(newStatus) {
        if (!person || updatingStatus) return;
        if (person.member_status === newStatus) {
            showStatusDropdown = false;
            return;
        }

        updatingStatus = true;
        statusUpdateError = null;

        try {
            const updateData = { member_status: newStatus };

            // If promoting to member, set membership_date
            if (newStatus === "member" && !person.membership_date) {
                updateData.membership_date = new Date()
                    .toISOString()
                    .split("T")[0];
            }

            const result = await peopleService.update(person.id, updateData);

            if (result.error) {
                throw result.error;
            }

            // Update local state
            person = { ...person, ...updateData };
            showStatusDropdown = false;
        } catch (e) {
            console.error("Failed to update status:", e);
            statusUpdateError = e.message || "Failed to update status";
        } finally {
            updatingStatus = false;
        }
    }

    // Quick promote to member shortcut
    function handlePromoteToMember() {
        updateMemberStatus("member");
    }

    // Promote member to leader
    function handlePromoteToLeader() {
        updateMemberStatus("leader");
    }

    // Reactivate archived person
    function handleReactivate() {
        updateMemberStatus("member");
    }

    // Activity status options
    const activityOptions = [
        { value: "regular", label: "Regular", color: "text-success" },
        { value: "irregular", label: "Irregular", color: "text-warning" },
        { value: "dormant", label: "Dormant", color: "text-destructive" },
    ];

    // Update activity status
    async function updateActivityStatus(newStatus) {
        if (!person || updatingStatus) return;
        if (person.activity_status === newStatus) {
            showActivityDropdown = false;
            return;
        }

        updatingStatus = true;
        statusUpdateError = null;

        try {
            const updateData = { activity_status: newStatus };
            const result = await peopleService.update(person.id, updateData);

            if (result.error) {
                throw result.error;
            }

            // Update local state
            person = { ...person, ...updateData };
            showActivityDropdown = false;
        } catch (e) {
            console.error("Failed to update activity status:", e);
            statusUpdateError = e.message || "Failed to update status";
        } finally {
            updatingStatus = false;
        }
    }

    // Get activity status color class
    function getActivityStatusColor(status) {
        const map = {
            regular: "text-success",
            irregular: "text-warning",
            dormant: "text-destructive",
        };
        return map[status] || "text-muted-foreground";
    }

    // Is this person a member (for leader promotion)
    let isMember = $derived(person?.member_status === "member");

    // Is this person archived
    let isArchived = $derived(person?.member_status === "archived");

    // Is this person dormant
    let isDormant = $derived(person?.activity_status === "dormant");
</script>

<div class="space-y-6 animate-in fade-in duration-500">
    <!-- Header / Nav -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <Button
                variant="ghost"
                onclick={() => goto("/people")}
                class="text-muted-foreground hover:text-foreground"
            >
                <svg
                    class="w-5 h-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                </svg>
                Back to Directory
            </Button>
        </div>
    </div>

    {#if loading}
        <div class="flex items-center justify-center h-64">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
            ></div>
        </div>
    {:else if error}
        <div
            class="p-6 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center"
        >
            <h3 class="text-lg font-semibold">Error Loading Profile</h3>
            <p>{error}</p>
            <Button
                variant="outline"
                class="mt-4"
                onclick={() => window.location.reload()}>Retry</Button
            >
        </div>
    {:else if person}
        <!-- Mock Data Banner -->
        {#if usingMockData}
            <div
                class="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm flex items-center gap-2"
            >
                <svg
                    class="w-5 h-5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
                <span
                    >Using demo data. Configure Convex environment variables to
                    connect to your database.</span
                >
            </div>
        {/if}

        <!-- Profile Header Card -->
        <div
            class="bg-card border border-border rounded-xl p-6 shadow-sm overflow-visible relative"
        >
            <div
                class="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"
            >
                <svg class="w-64 h-64" fill="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                    />
                </svg>
            </div>

            <div class="flex flex-col md:flex-row gap-6 relative z-10">
                <!-- Avatar -->
                <div class="shrink-0">
                    <div
                        class="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary border-4 border-card shadow-lg"
                    >
                        {getInitials(person)}
                    </div>
                </div>

                <!-- Info -->
                <div class="flex-1 space-y-2">
                    <div class="flex flex-wrap items-center gap-3">
                        <h1
                            class="text-3xl font-bold text-foreground tracking-tight"
                        >
                            {person.first_name}
                            {person.last_name}
                        </h1>
                        <!-- Status badge with dropdown -->
                        <div class="relative">
                            <button
                                type="button"
                                onclick={() =>
                                    (showStatusDropdown = !showStatusDropdown)}
                                class="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                disabled={updatingStatus}
                            >
                                <Badge
                                    variant={getStatusVariant(
                                        person.member_status,
                                    )}
                                >
                                    {#if updatingStatus}
                                        <svg
                                            class="animate-spin h-3 w-3 mr-1"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                class="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                stroke-width="4"
                                            ></circle>
                                            <path
                                                class="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            ></path>
                                        </svg>
                                    {/if}
                                    {person.member_status || "Guest"}
                                </Badge>
                                <svg
                                    class="w-3 h-3 text-muted-foreground"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {#if showStatusDropdown}
                                <div
                                    class="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
                                    onclick={(e) => e.stopPropagation()}
                                    onkeydown={(e) =>
                                        e.key === "Escape" &&
                                        (showStatusDropdown = false)}
                                    role="menu"
                                    aria-label="Member status options"
                                    tabindex="-1"
                                >
                                    {#each statusOptions as option}
                                        <button
                                            type="button"
                                            class="w-full px-3 py-2 text-left text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2
                                                   {person.member_status ===
                                            option.value
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-foreground'}"
                                            onclick={() =>
                                                updateMemberStatus(
                                                    option.value,
                                                )}
                                            disabled={updatingStatus}
                                        >
                                            {#if person.member_status === option.value}
                                                <svg
                                                    class="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            {:else}
                                                <span class="w-4"></span>
                                            {/if}
                                            {option.label}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        {#if person.role && person.role !== "no_role"}
                            <Badge variant="outline">
                                {formatRole(person.role)}
                            </Badge>
                        {/if}
                    </div>

                    <!-- Quick action buttons based on status -->
                    {#if !updatingStatus}
                        <div class="mt-2 flex flex-wrap gap-2">
                            <!-- Guest → Member -->
                            {#if isGuest}
                                <Button
                                    size="sm"
                                    onclick={handlePromoteToMember}
                                    class="bg-success hover:bg-success/90 text-white"
                                >
                                    <svg
                                        class="w-4 h-4 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    Promote to Member
                                </Button>
                            {/if}

                            <!-- Member → Leader -->
                            {#if isMember}
                                <Button
                                    size="sm"
                                    onclick={handlePromoteToLeader}
                                    class="bg-primary hover:bg-primary/90 text-white"
                                >
                                    <svg
                                        class="w-4 h-4 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                        />
                                    </svg>
                                    Promote to Leader
                                </Button>
                            {/if}

                            <!-- Archived → Reactivate -->
                            {#if isArchived}
                                <Button
                                    size="sm"
                                    onclick={handleReactivate}
                                    class="bg-info hover:bg-info/90 text-white"
                                >
                                    <svg
                                        class="w-4 h-4 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                    Reactivate as Member
                                </Button>
                            {/if}
                        </div>
                    {/if}

                    <!-- Activity Status indicator with dropdown -->
                    <div class="mt-3 flex items-center gap-3">
                        <span class="text-sm text-muted-foreground"
                            >Activity:</span
                        >
                        <div class="relative">
                            <button
                                type="button"
                                onclick={() =>
                                    (showActivityDropdown =
                                        !showActivityDropdown)}
                                class="flex items-center gap-1 text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity {getActivityStatusColor(
                                    person.activity_status,
                                )}"
                                disabled={updatingStatus}
                            >
                                {#if person.activity_status === "dormant"}
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                                        />
                                    </svg>
                                {:else if person.activity_status === "irregular"}
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                {:else}
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                {/if}
                                {formatActivityStatus(person.activity_status)}
                                <svg
                                    class="w-3 h-3 ml-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {#if showActivityDropdown}
                                <div
                                    class="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
                                    onclick={(e) => e.stopPropagation()}
                                    onkeydown={(e) =>
                                        e.key === "Escape" &&
                                        (showActivityDropdown = false)}
                                    role="menu"
                                    aria-label="Activity status options"
                                    tabindex="-1"
                                >
                                    {#each activityOptions as option}
                                        <button
                                            type="button"
                                            class="w-full px-3 py-2 text-left text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2 {option.color}
                                                   {person.activity_status ===
                                            option.value
                                                ? 'bg-primary/10'
                                                : ''}"
                                            onclick={() =>
                                                updateActivityStatus(
                                                    option.value,
                                                )}
                                            disabled={updatingStatus}
                                        >
                                            {#if person.activity_status === option.value}
                                                <svg
                                                    class="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            {:else}
                                                <span class="w-4"></span>
                                            {/if}
                                            {option.label}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <!-- Dormant Warning Badge -->
                        {#if isDormant}
                            <span
                                class="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-full"
                            >
                                ⚠ Needs Re-engagement
                            </span>
                        {/if}
                    </div>

                    {#if statusUpdateError}
                        <div class="mt-2 text-sm text-destructive">
                            {statusUpdateError}
                        </div>
                    {/if}

                    <div
                        class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground mt-2"
                    >
                        <div class="flex items-center gap-2">
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                            {person.email || "No email provided"}
                        </div>
                        <div class="flex items-center gap-2">
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                            </svg>
                            {person.phone || "No phone provided"}
                        </div>
                        <div class="flex items-center gap-2">
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                            {person.address ||
                                person.city ||
                                "No address provided"}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
                <div class="p-4">
                    <div class="text-sm font-medium text-muted-foreground">
                        Total Attendance
                    </div>
                    <div class="mt-1 flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-foreground"
                            >{totalAttendance}</span
                        >
                        <span class="text-xs text-muted-foreground"
                            >services</span
                        >
                    </div>
                </div>
            </Card>

            <Card>
                <div class="p-4">
                    <div class="text-sm font-medium text-muted-foreground">
                        Last Attended
                    </div>
                    <div class="mt-1">
                        <span class="text-lg font-bold text-foreground truncate"
                            >{lastAttended}</span
                        >
                    </div>
                </div>
            </Card>

            <Card>
                <div class="p-4">
                    <div class="text-sm font-medium text-muted-foreground">
                        Prayer Activity
                    </div>
                    <div class="mt-1 flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-foreground"
                            >{prayerMeetingsCount()}</span
                        >
                        <span class="text-xs text-muted-foreground"
                            >meetings</span
                        >
                    </div>
                </div>
            </Card>

            <Card>
                <div class="p-4">
                    <div class="text-sm font-medium text-muted-foreground">
                        Activity Score
                    </div>
                    <div class="mt-1 flex items-center gap-2">
                        <span class="text-2xl font-bold text-foreground"
                            >{activityScore()}</span
                        >
                        <div
                            class="flex-1 h-2 bg-secondary rounded-full overflow-hidden"
                        >
                            <div
                                class="h-full bg-primary transition-all duration-500"
                                style="width: {activityScore()}%"
                            ></div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>

        <!-- Engagement Radar Chart -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-1">
                <EngagementRadar
                    data={engagementData()}
                    cellGroupDetail={cellGroupDetail()}
                    size={220}
                />
            </div>
            <div class="md:col-span-2 flex items-center">
                <Card>
                    <div class="p-4">
                        <h4
                            class="text-sm font-medium text-muted-foreground mb-2"
                        >
                            Engagement Overview
                        </h4>
                        <p class="text-sm text-foreground/80">
                            This radar shows {person.first_name}'s engagement
                            across 6 key dimensions. Hover over any axis for
                            details.
                            {#if engagementData().cellGroups < 30}
                                <span class="text-warning"
                                    >Cell group participation could use
                                    attention.</span
                                >
                            {:else if engagementData().evangelismImpact > 60}
                                <span class="text-success"
                                    >Strong evangelism contributor!</span
                                >
                            {/if}
                        </p>
                    </div>
                </Card>
            </div>
        </div>

        <!-- Profile Details Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Demographics Card -->
            <Card>
                <div class="p-6">
                    <h3
                        class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-muted-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                        Demographics
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="text-xs text-muted-foreground"
                                >Birthday</span
                            >
                            <p class="text-sm font-medium text-foreground">
                                {formatShortDate(person.date_of_birth)}
                            </p>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground"
                                >Age</span
                            >
                            <p class="text-sm font-medium text-foreground">
                                {currentAge() !== null
                                    ? `${currentAge()} years`
                                    : "—"}
                            </p>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground"
                                >Gender</span
                            >
                            <p class="text-sm font-medium text-foreground">
                                {formatGender(person.gender)}
                            </p>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground"
                                >Marital Status</span
                            >
                            <p class="text-sm font-medium text-foreground">
                                {formatMaritalStatus(person.marital_status)}
                            </p>
                        </div>
                        <div class="col-span-2">
                            <span class="text-xs text-muted-foreground"
                                >Employment</span
                            >
                            <p class="text-sm font-medium text-foreground">
                                {formatEmploymentStatus(
                                    person.employment_status,
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            <!-- Church Role & Status Card -->
            <Card>
                <div class="p-6">
                    <h3
                        class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-muted-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                        Church Role & Status
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="text-xs text-muted-foreground"
                                >Status</span
                            >
                            <div class="mt-1">
                                <Badge
                                    variant={getStatusVariant(
                                        person.member_status,
                                    )}
                                >
                                    {person.member_status || "Guest"}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground"
                                >Role</span
                            >
                            <p class="text-sm font-medium text-foreground">
                                {formatRole(person.role)}
                            </p>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground"
                                >Activity Level</span
                            >
                            <p class="text-sm font-medium text-foreground">
                                {formatActivityStatus(person.activity_status)}
                            </p>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground"
                                >Membership Date</span
                            >
                            <p class="text-sm font-medium text-foreground">
                                {formatShortDate(person.membership_date)}
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground"
                                >Baptised</span
                            >
                            {#if person.is_baptised}
                                <Badge variant="success">Yes</Badge>
                            {:else}
                                <Badge variant="secondary">No</Badge>
                            {/if}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-muted-foreground"
                                >Tither</span
                            >
                            {#if person.is_tither}
                                <Badge variant="success">Yes</Badge>
                            {:else}
                                <Badge variant="secondary">No</Badge>
                            {/if}
                        </div>
                    </div>
                </div>
            </Card>

            <!-- Evangelism / Outreach Card (For Leaders/Members) -->
            {#if person.member_status === "leader" || person.member_status === "member"}
                <Card>
                    <div class="p-6">
                        <h3
                            class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
                        >
                            <svg
                                class="w-5 h-5 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            Outreach & Evangelism
                        </h3>

                        {#if outreachContacts.length === 0}
                            <p class="text-sm text-muted-foreground">
                                No outreach contacts recorded yet.
                            </p>
                        {:else}
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-sm">
                                    <thead class="border-b border-border">
                                        <tr>
                                            <th
                                                class="pb-2 font-medium text-muted-foreground"
                                                >Name</th
                                            >
                                            <th
                                                class="pb-2 font-medium text-muted-foreground"
                                                >Date</th
                                            >
                                            <th
                                                class="pb-2 font-medium text-muted-foreground"
                                                >Result</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border">
                                        {#each outreachContacts as contact}
                                            <tr class="group">
                                                <td class="py-2 font-medium"
                                                    >{contact.first_name}
                                                    {contact.last_name ||
                                                        ""}</td
                                                >
                                                <td
                                                    class="py-2 text-muted-foreground"
                                                    >{formatShortDate(
                                                        contact.contact_date,
                                                    )}</td
                                                >
                                                <td class="py-2 text-right">
                                                    <Badge
                                                        variant={contact.response ===
                                                        "responsive"
                                                            ? "success"
                                                            : "secondary"}
                                                        size="sm"
                                                    >
                                                        {formatContactCategory(
                                                            contact.response,
                                                        )}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}
                    </div>
                </Card>
            {/if}

            <!-- Visitation History Card (For Everyone) -->
            <Card>
                <div class="p-6">
                    <h3
                        class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
                    >
                        <svg
                            class="w-5 h-5 text-muted-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        Visitation History
                    </h3>

                    {#if visitations.length === 0}
                        <p class="text-sm text-muted-foreground">
                            No home visits recorded.
                        </p>
                    {:else}
                        <div class="space-y-4">
                            {#each visitations as visit}
                                <div
                                    class="border-b border-border last:border-0 pb-3 last:pb-0"
                                >
                                    <div
                                        class="flex justify-between items-start mb-1"
                                    >
                                        <span class="text-sm font-medium"
                                            >{formatShortDate(
                                                visit.visit_date,
                                            )}</span
                                        >
                                        <Badge
                                            variant={getOutcomeVariant(
                                                visit.outcome,
                                            )}
                                            size="sm"
                                        >
                                            {formatOutcome(visit.outcome)}
                                        </Badge>
                                    </div>
                                    <p
                                        class="text-xs text-muted-foreground mb-1"
                                    >
                                        Visited by: <span
                                            class="text-foreground"
                                            >{visit.visited_by_name ||
                                                "Unknown"}</span
                                        >
                                    </p>
                                    {#if visit.notes}
                                        <p
                                            class="text-sm italic text-muted-foreground"
                                        >
                                            "{visit.notes}"
                                        </p>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </Card>

            <!-- Guest/Contact Info Card (conditional) -->
            {#if isGuest}
                <Card>
                    <div class="p-6">
                        <h3
                            class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
                        >
                            <svg
                                class="w-5 h-5 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            Contact Information
                        </h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <span class="text-xs text-muted-foreground"
                                    >Category</span
                                >
                                <p class="text-sm font-medium text-foreground">
                                    {formatContactCategory(
                                        person.contact_category,
                                    )}
                                </p>
                            </div>
                            <div>
                                <span class="text-xs text-muted-foreground"
                                    >First Contacted</span
                                >
                                <p class="text-sm font-medium text-foreground">
                                    {formatShortDate(
                                        person.date_first_contacted,
                                    )}
                                </p>
                            </div>
                            <div>
                                <span class="text-xs text-muted-foreground"
                                    >First Visit</span
                                >
                                <p class="text-sm font-medium text-foreground">
                                    {formatShortDate(person.first_visit_date)}
                                </p>
                            </div>
                            <div>
                                <span class="text-xs text-muted-foreground"
                                    >Invited By</span
                                >
                                <p class="text-sm font-medium text-foreground">
                                    {person.invited_by_name || "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            {/if}

            <!-- Notes Card -->
            {#if person.notes}
                <Card>
                    <div class="p-6">
                        <h3
                            class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
                        >
                            <svg
                                class="w-5 h-5 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            Notes
                        </h3>
                        <p
                            class="text-sm text-muted-foreground whitespace-pre-wrap"
                        >
                            {person.notes}
                        </p>
                    </div>
                </Card>
            {/if}
        </div>

        <!-- Growth Timeline (visual journey) -->
        <Card>
            <div class="p-6">
                <h3
                    class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
                >
                    <svg
                        class="w-5 h-5 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                    </svg>
                    Spiritual Journey
                </h3>
                <div class="flex items-center justify-between relative">
                    <!-- Timeline line -->
                    <div
                        class="absolute top-5 left-0 right-0 h-0.5 bg-border"
                    ></div>

                    <!-- First Visit -->
                    <div class="relative z-10 flex flex-col items-center">
                        <div
                            class="w-10 h-10 rounded-full flex items-center justify-center
                            {person.first_visit_date ||
                            attendanceHistory.length > 0
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground'}"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                        </div>
                        <span class="text-xs text-muted-foreground mt-2"
                            >First Visit</span
                        >
                        <span class="text-xs font-medium text-foreground">
                            {formatShortDate(person.first_visit_date) ||
                                (attendanceHistory.length > 0 ? "✓" : "—")}
                        </span>
                    </div>

                    <!-- Baptism -->
                    <div class="relative z-10 flex flex-col items-center">
                        <div
                            class="w-10 h-10 rounded-full flex items-center justify-center
                            {person.is_baptised
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground'}"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                            </svg>
                        </div>
                        <span class="text-xs text-muted-foreground mt-2"
                            >Baptised</span
                        >
                        <span class="text-xs font-medium text-foreground">
                            {person.is_baptised ? "✓" : "—"}
                        </span>
                    </div>

                    <!-- Membership -->
                    <div class="relative z-10 flex flex-col items-center">
                        <div
                            class="w-10 h-10 rounded-full flex items-center justify-center
                            {person.membership_date ||
                            person.member_status === 'member' ||
                            person.member_status === 'leader'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground'}"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                />
                            </svg>
                        </div>
                        <span class="text-xs text-muted-foreground mt-2"
                            >Member</span
                        >
                        <span class="text-xs font-medium text-foreground">
                            {formatShortDate(person.membership_date) ||
                                (person.member_status === "member" ||
                                person.member_status === "leader"
                                    ? "✓"
                                    : "—")}
                        </span>
                    </div>

                    <!-- Leader -->
                    <div class="relative z-10 flex flex-col items-center">
                        <div
                            class="w-10 h-10 rounded-full flex items-center justify-center
                            {person.member_status === 'leader'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground'}"
                        >
                            <svg
                                class="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                />
                            </svg>
                        </div>
                        <span class="text-xs text-muted-foreground mt-2"
                            >Leader</span
                        >
                        <span class="text-xs font-medium text-foreground">
                            {person.member_status === "leader" ? "✓" : "—"}
                        </span>
                    </div>
                </div>
            </div>
        </Card>

        <!-- Attendance History -->
        <div class="space-y-4">
            <h2 class="text-xl font-semibold text-foreground">
                Attendance History
            </h2>

            <div
                class="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
            >
                {#if attendanceHistory.length === 0}
                    <div class="p-12 text-center text-muted-foreground">
                        <svg
                            class="w-12 h-12 mx-auto mb-3 opacity-50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <p>No attendance records found for this person.</p>
                        <p class="text-sm mt-1">
                            Check them into a service to start tracking!
                        </p>
                    </div>
                {:else}
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead
                                class="bg-secondary/50 border-b border-border"
                            >
                                <tr>
                                    <th
                                        class="px-6 py-4 font-semibold text-foreground"
                                        >Date</th
                                    >
                                    <th
                                        class="px-6 py-4 font-semibold text-foreground"
                                        >Service</th
                                    >
                                    <th
                                        class="px-6 py-4 font-semibold text-foreground"
                                        >Role/Type</th
                                    >
                                    <th
                                        class="px-6 py-4 font-semibold text-foreground"
                                        >Topic</th
                                    >
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                {#each attendanceHistory as record}
                                    <tr
                                        class="hover:bg-secondary/20 transition-colors"
                                    >
                                        <td
                                            class="px-6 py-4 font-medium text-foreground"
                                        >
                                            {formatDate(
                                                record.services.service_date,
                                            )}
                                        </td>
                                        <td
                                            class="px-6 py-4 text-muted-foreground"
                                        >
                                            {record.services.service_time ||
                                                "Regular Time"}
                                        </td>
                                        <td class="px-6 py-4">
                                            <Badge
                                                variant="outline"
                                                class="capitalize"
                                            >
                                                {record.services.service_type?.replace(
                                                    "_",
                                                    " ",
                                                ) || "Service"}
                                            </Badge>
                                        </td>
                                        <td
                                            class="px-6 py-4 text-muted-foreground"
                                        >
                                            {record.services.sermon_topic ||
                                                "-"}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
