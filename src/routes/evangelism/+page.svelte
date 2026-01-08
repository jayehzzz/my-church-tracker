<!--
  Evangelism Contacts Page
  Track and manage evangelism outreach efforts.
  
  Features:
  - KPI Cards (Total Contacts, Active Leads, Conversions, Follow-ups Needed)
  - DataTable with contact records
  - Category/Response filter
  - Add/Edit contact modal
  - Mark as converted action
  - Delete confirmation
  - Loading/error states
-->

<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import { DataTable, Modal, Button, Badge } from "$lib/components/ui";
  import KPICard from "$lib/components/dashboard/KPICard.svelte";
  import EvangelismContactForm from "$lib/components/forms/EvangelismContactForm.svelte";

  // Import filter store for reactive date range
  import { dateRange } from "$lib/stores/filterStore";

  // Import chart components
  import ConversionFunnel from "$lib/components/charts/ConversionFunnel.svelte";
  import CategoryDonut from "$lib/components/charts/CategoryDonut.svelte";
  import MonthlyContactsBar from "$lib/components/charts/MonthlyContactsBar.svelte";
  import InviterBarChart from "$lib/components/charts/InviterBarChart.svelte";
  import ContactsByMonthTimeline from "$lib/components/charts/ContactsByMonthTimeline.svelte";
  import SalvationTimeline from "$lib/components/charts/SalvationTimeline.svelte";
  import InviterProfilePopup from "$lib/components/dashboard/InviterProfilePopup.svelte";
  import { goto } from "$app/navigation";

  // Import centralized mock data
  import {
    mockPeople as centralMockPeople,
    mockEvangelismContacts as centralMockContacts,
    getPersonById,
  } from "$lib/data/mockData";

  // State
  let contacts = $state([]);
  let people = $state([]); // For inviter dropdown
  let loading = $state(true);
  let error = $state(null);

  // View state: 'list' or 'dashboard'
  let activeView = $state("list");

  // Inviter profile popup state
  let isInviterPopupOpen = $state(false);
  let selectedInviter = $state(null);

  // Filter state
  let responseFilter = $state("all");
  let inviterFilter = $state("all");
  let statusFilter = $state("all"); // Status filter (guest/member/archived)

  // Status options for filter
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "guest", label: "Guest" },
    { value: "member", label: "Member" },
    { value: "archived", label: "Archived" },
  ];

  // Modal state
  let isFormOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let isConvertModalOpen = $state(false);
  let selectedContact = $state(null);
  let deleting = $state(false);
  let converting = $state(false);

  // Track if using mock data
  let usingMockData = $state(false);

  // Response options for filter
  const responseOptions = [
    { value: "all", label: "All Categories" },
    { value: "responsive", label: "Responsive" },
    { value: "non_responsive", label: "Non-Responsive" },
    { value: "has_church", label: "Has Church" },
    { value: "events_only", label: "Events Only" },
    { value: "big_events_only", label: "Big Events Only" },
    { value: "bacenta_mainly", label: "Bacenta Mainly" },
    { value: "do_not_contact", label: "Do Not Contact" },
  ];

  // Mock data for development when Convex is not configured
  // Varied distribution: Nov=8, Oct=6, Sep=5, Dec=3, Aug=4, others=1-2
  const mockContacts = [
    // December 2025 (3 contacts)
    {
      id: "1",
      first_name: "Michael",
      last_name: "Thompson",
      email: "michael@example.com",
      phone: "555-1111",
      contact_date: "2025-12-10",
      response: "responsive",
      follow_up_date: "2025-12-17",
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "2",
      first_name: "Sarah",
      last_name: "Wilson",
      email: "sarah@example.com",
      phone: "555-2222",
      contact_date: "2025-12-08",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-12-12",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "3",
      first_name: "David",
      last_name: "Brown",
      email: "david@example.com",
      phone: "555-3333",
      contact_date: "2025-12-05",
      response: "has_church",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },

    // November 2025 (8 contacts - PEAK MONTH)
    {
      id: "4",
      first_name: "Emily",
      last_name: "Davis",
      email: "emily@example.com",
      phone: "555-4444",
      contact_date: "2025-11-28",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },
    {
      id: "5",
      first_name: "James",
      last_name: "Martinez",
      email: "james@example.com",
      phone: "555-5555",
      contact_date: "2025-11-25",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-11-30",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "6",
      first_name: "Lisa",
      last_name: "Anderson",
      email: "lisa@example.com",
      phone: "555-6666",
      contact_date: "2025-11-22",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-11-28",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "7",
      first_name: "Robert",
      last_name: "Garcia",
      email: "robert@example.com",
      phone: "555-7777",
      contact_date: "2025-11-18",
      response: "events_only",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },
    {
      id: "8",
      first_name: "Maria",
      last_name: "Rodriguez",
      email: "maria@example.com",
      phone: "555-7778",
      contact_date: "2025-11-15",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "9",
      first_name: "Thomas",
      last_name: "Jackson",
      email: "thomas@example.com",
      phone: "555-7779",
      contact_date: "2025-11-12",
      response: "non_responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p3",
      comments: [],
    },
    {
      id: "10",
      first_name: "Patricia",
      last_name: "White",
      email: "patricia@example.com",
      phone: "555-7780",
      contact_date: "2025-11-08",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },
    {
      id: "11",
      first_name: "Charles",
      last_name: "Harris",
      email: "charles@example.com",
      phone: "555-7781",
      contact_date: "2025-11-03",
      response: "has_church",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p1",
      comments: [],
    },

    // October 2025 (6 contacts)
    {
      id: "12",
      first_name: "Jennifer",
      last_name: "Lee",
      email: "jennifer@example.com",
      phone: "555-8888",
      contact_date: "2025-10-28",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-11-05",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "13",
      first_name: "William",
      last_name: "Taylor",
      email: "william@example.com",
      phone: "555-9999",
      contact_date: "2025-10-22",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },
    {
      id: "14",
      first_name: "Amanda",
      last_name: "Moore",
      email: "amanda@example.com",
      phone: "555-1010",
      contact_date: "2025-10-18",
      response: "events_only",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p3",
      comments: [],
    },
    {
      id: "15",
      first_name: "Daniel",
      last_name: "Martin",
      email: "daniel@example.com",
      phone: "555-1011",
      contact_date: "2025-10-12",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-10-20",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "16",
      first_name: "Nancy",
      last_name: "Thompson",
      email: "nancy@example.com",
      phone: "555-1012",
      contact_date: "2025-10-08",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },
    {
      id: "17",
      first_name: "Mark",
      last_name: "Anderson",
      email: "mark@example.com",
      phone: "555-1013",
      contact_date: "2025-10-02",
      response: "non_responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p3",
      comments: [],
    },

    // September 2025 (5 contacts)
    {
      id: "18",
      first_name: "Christopher",
      last_name: "Clark",
      email: "chris@example.com",
      phone: "555-1111",
      contact_date: "2025-09-25",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-10-02",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "19",
      first_name: "Jessica",
      last_name: "Lewis",
      email: "jessica@example.com",
      phone: "555-1212",
      contact_date: "2025-09-20",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },
    {
      id: "20",
      first_name: "Steven",
      last_name: "Walker",
      email: "steven@example.com",
      phone: "555-1213",
      contact_date: "2025-09-15",
      response: "has_church",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p3",
      comments: [],
    },
    {
      id: "21",
      first_name: "Sandra",
      last_name: "Hall",
      email: "sandra@example.com",
      phone: "555-1214",
      contact_date: "2025-09-10",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "22",
      first_name: "Paul",
      last_name: "Allen",
      email: "paul@example.com",
      phone: "555-1215",
      contact_date: "2025-09-05",
      response: "events_only",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },

    // August 2025 (4 contacts)
    {
      id: "23",
      first_name: "Ashley",
      last_name: "Robinson",
      email: "ashley@example.com",
      phone: "555-1414",
      contact_date: "2025-08-28",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-09-05",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "24",
      first_name: "Matthew",
      last_name: "Young",
      email: "matthew@example.com",
      phone: "555-1515",
      contact_date: "2025-08-20",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },
    {
      id: "25",
      first_name: "Nicole",
      last_name: "King",
      email: "nicole@example.com",
      phone: "555-1616",
      contact_date: "2025-08-12",
      response: "non_responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p3",
      comments: [],
    },
    {
      id: "26",
      first_name: "Kevin",
      last_name: "Wright",
      email: "kevin@example.com",
      phone: "555-1617",
      contact_date: "2025-08-05",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p1",
      comments: [],
    },

    // July 2025 (2 contacts)
    {
      id: "27",
      first_name: "Andrew",
      last_name: "Scott",
      email: "andrew@example.com",
      phone: "555-1717",
      contact_date: "2025-07-22",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "28",
      first_name: "Stephanie",
      last_name: "Green",
      email: "stephanie@example.com",
      phone: "555-1818",
      contact_date: "2025-07-10",
      response: "events_only",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },

    // June 2025 (1 contact)
    {
      id: "29",
      first_name: "Joshua",
      last_name: "Adams",
      email: "joshua@example.com",
      phone: "555-1919",
      contact_date: "2025-06-15",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-06-25",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },

    // May 2025 (3 contacts)
    {
      id: "30",
      first_name: "Rachel",
      last_name: "Nelson",
      email: "rachel@example.com",
      phone: "555-2222",
      contact_date: "2025-05-28",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-06-05",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "31",
      first_name: "Brandon",
      last_name: "Hill",
      email: "brandon@example.com",
      phone: "555-2323",
      contact_date: "2025-05-18",
      response: "has_church",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },
    {
      id: "32",
      first_name: "Heather",
      last_name: "Baker",
      email: "heather@example.com",
      phone: "555-2324",
      contact_date: "2025-05-05",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p3",
      comments: [],
    },

    // April 2025 (2 contacts)
    {
      id: "33",
      first_name: "Lauren",
      last_name: "Gonzalez",
      email: "lauren@example.com",
      phone: "555-2424",
      contact_date: "2025-04-22",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "34",
      first_name: "Tyler",
      last_name: "Perez",
      email: "tyler@example.com",
      phone: "555-2525",
      contact_date: "2025-04-10",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-04-20",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p2",
      comments: [],
    },

    // March 2025 (1 contact)
    {
      id: "35",
      first_name: "Samantha",
      last_name: "Carter",
      email: "samantha@example.com",
      phone: "555-2626",
      contact_date: "2025-03-18",
      response: "responsive",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: true,
      salvation_decision: false,
      invited_by_id: "p1",
      comments: [],
    },

    // February 2025 (2 contacts)
    {
      id: "36",
      first_name: "Brittany",
      last_name: "Mitchell",
      email: "brittany@example.com",
      phone: "555-2828",
      contact_date: "2025-02-25",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-03-05",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
    {
      id: "37",
      first_name: "Justin",
      last_name: "Roberts",
      email: "justin@example.com",
      phone: "555-2929",
      contact_date: "2025-02-08",
      response: "events_only",
      follow_up_date: null,
      converted: false,
      status: "guest",
      attended_church: false,
      salvation_decision: false,
      invited_by_id: "p2",
      comments: [],
    },

    // January 2025 (1 contact)
    {
      id: "38",
      first_name: "Christina",
      last_name: "Turner",
      email: "christina@example.com",
      phone: "555-3030",
      contact_date: "2025-01-20",
      response: "responsive",
      follow_up_date: null,
      converted: true,
      conversion_date: "2025-02-01",
      status: "member",
      attended_church: true,
      salvation_decision: true,
      invited_by_id: "p1",
      comments: [],
    },
  ];

  // Table columns configuration
  const columns = [
    {
      key: "first_name",
      label: "Name",
      sortable: true,
      render: (value, row) => `${value} ${row.last_name || ""}`.trim(),
    },
    {
      key: "phone",
      label: "Phone",
      render: (value) => value || "—",
    },
    {
      key: "response",
      label: "Category",
      sortable: true,
      render: (value) => formatResponse(value),
    },
    {
      key: "contact_date",
      label: "Contact Date",
      sortable: true,
      render: (value) => (value ? formatDate(value) : "—"),
    },
    {
      key: "days_since",
      label: "Days Since",
      render: (_, row) => calculateDaysSince(row.contact_date),
    },
    {
      key: "invited_by_id",
      label: "Invited By",
      sortable: true,
      render: (value, row) => {
        if (!value) return "—";
        const inviter = people.find((p) => p.id === value);
        return inviter
          ? `${inviter.first_name} ${inviter.last_name || ""}`.trim()
          : "—";
      },
    },
    {
      key: "converted",
      label: "Status",
      sortable: true,
      render: (value) => (value ? "Converted" : "Active"),
    },
  ];

  // Format response for display
  function formatResponse(response) {
    const responseMap = {
      responsive: "Responsive",
      non_responsive: "Non-Responsive",
      has_church: "Has Church",
      events_only: "Events Only",
      big_events_only: "Big Events Only",
      bacenta_mainly: "Bacenta Mainly",
      do_not_contact: "Do Not Contact",
    };
    return responseMap[response] || response || "Unknown";
  }

  // Get response badge variant
  function getResponseVariant(response) {
    const variantMap = {
      responsive: "success",
      non_responsive: "destructive",
      has_church: "secondary",
      events_only: "default",
      big_events_only: "default",
      bacenta_mainly: "default",
      do_not_contact: "destructive",
    };
    return variantMap[response] || "secondary";
  }

  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Calculate days since contact
  function calculateDaysSince(dateStr) {
    if (!dateStr) return "—";
    const contactDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today - contactDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  }

  // Helper function to check if a date is within the filter range
  function isWithinDateRange(dateStr, range) {
    if (!dateStr || !range?.startDate || !range?.endDate) return true;
    const date = new Date(dateStr);
    const start = new Date(range.startDate);
    const end = new Date(range.endDate);
    // Set time to start/end of day for accurate comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }

  // Filter contacts by response, inviter, status, AND date range
  const filteredContacts = $derived(() => {
    const range = $dateRange;
    let filtered = contacts;

    // Filter by date range first
    filtered = filtered.filter((c) => isWithinDateRange(c.contact_date, range));

    // Then filter by response category
    if (responseFilter !== "all") {
      filtered = filtered.filter((c) => c.response === responseFilter);
    }

    // Filter by inviter
    if (inviterFilter !== "all") {
      filtered = filtered.filter((c) => c.invited_by_id === inviterFilter);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    return filtered;
  });

  // Get unique inviters for filter dropdown
  const inviterOptions = $derived(() => {
    const inviters = contacts
      .filter((c) => c.invited_by_id)
      .map((c) => c.invited_by_id)
      .filter((v, i, a) => a.indexOf(v) === i); // unique values

    const options = [{ value: "all", label: "All Inviters" }];
    inviters.forEach((id) => {
      const person = people.find((p) => p.id === id);
      if (person) {
        options.push({
          value: id,
          label: `${person.first_name} ${person.last_name || ""}`.trim(),
        });
      }
    });
    return options;
  });

  // Calculate KPIs based on filtered data
  const kpis = $derived(() => {
    const filtered = filteredContacts();
    const total = filtered.length;
    const converted = filtered.filter((c) => c.converted).length;
    const active = filtered.filter((c) => !c.converted).length;
    const today = new Date().toISOString().split("T")[0];
    const needingFollowUp = filtered.filter(
      (c) => c.follow_up_date && c.follow_up_date <= today && !c.converted,
    ).length;

    // Membership Join Rate: % of contacts who became members (converted)
    const membershipJoinRate =
      total > 0 ? Math.round((converted / total) * 100) : 0;

    return { total, converted, active, needingFollowUp, membershipJoinRate };
  });

  // Calculate chart data from filtered contacts
  const funnelData = $derived(() => {
    const filtered = filteredContacts();
    return {
      contacts: filtered.length,
      attended: filtered.filter((c) => c.attended_service || c.converted)
        .length,
      saved: filtered.filter((c) => c.salvation_decision || c.converted).length,
      joined: filtered.filter((c) => c.converted).length,
    };
  });

  const categoryData = $derived(() => {
    const filtered = filteredContacts();
    const categories = [
      "responsive",
      "non_responsive",
      "has_church",
      "events_only",
      "big_events_only",
      "bacenta_mainly",
      "do_not_contact",
    ];
    return categories
      .map((category) => ({
        category,
        count: filtered.filter((c) => c.response === category).length,
      }))
      .filter((d) => d.count > 0);
  });

  // Get recent comments across all contacts (sorted by date, newest first)
  const recentComments = $derived(() => {
    const allComments = [];
    contacts.forEach((contact) => {
      if (contact.comments && Array.isArray(contact.comments)) {
        contact.comments.forEach((comment) => {
          allComments.push({
            ...comment,
            contact_id: contact.id,
            contact_name:
              `${contact.first_name} ${contact.last_name || ""}`.trim(),
          });
        });
      }
    });

    // Sort by date, newest first
    allComments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Return top 10 recent comments
    return allComments.slice(0, 10);
  });

  // Format comment timestamp for display
  function formatCommentDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }

  // Calculate top inviters leaderboard
  const topInviters = $derived(() => {
    const inviterCounts = {};

    contacts.forEach((contact) => {
      if (contact.invited_by_id) {
        if (!inviterCounts[contact.invited_by_id]) {
          inviterCounts[contact.invited_by_id] = {
            id: contact.invited_by_id,
            count: 0,
            conversions: 0,
          };
        }
        inviterCounts[contact.invited_by_id].count++;
        if (contact.converted) {
          inviterCounts[contact.invited_by_id].conversions++;
        }
      }
    });

    // Convert to array and add person details
    const leaderboard = Object.values(inviterCounts).map((inviter) => {
      const person = people.find((p) => p.id === inviter.id);
      return {
        ...inviter,
        name: person
          ? `${person.first_name} ${person.last_name || ""}`.trim()
          : "Unknown",
      };
    });

    // Sort by count (descending) and return top 5
    leaderboard.sort((a, b) => b.count - a.count);
    return leaderboard.slice(0, 5);
  });

  // Monthly contacts data for bar chart
  const monthlyContactsData = $derived(() => {
    const filtered = filteredContacts();
    const monthCounts = {};

    filtered.forEach((contact) => {
      if (!contact.contact_date) return;
      const date = new Date(contact.contact_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthCounts[key]) {
        monthCounts[key] = {
          month: String(date.getMonth() + 1),
          year: date.getFullYear(),
          count: 0,
        };
      }
      monthCounts[key].count++;
    });

    // Sort by date
    return Object.values(monthCounts)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return parseInt(a.month) - parseInt(b.month);
      })
      .slice(-12); // Last 12 months
  });

  // Inviter data for bar chart
  const inviterChartData = $derived(() => {
    return topInviters().map((inv) => ({
      id: inv.id,
      name: inv.name,
      count: inv.count,
      conversions: inv.conversions,
    }));
  });

  // Load contacts and people on mount
  onMount(async () => {
    await Promise.all([loadContacts(), loadPeople()]);
  });

  // Fetch all people for inviter dropdown
  async function loadPeople() {
    if (!browser) return;
    try {
      const peopleService = await import("$lib/services/peopleService");
      const result = await peopleService.getAll();
      if (!result.error) {
        people = result.data || [];
      }
    } catch (e) {
      console.warn("Failed to load people:", e.message);
      // Use centralized mock people for demo
      people = centralMockPeople;
    }
  }

  // Fetch all contacts from service
  async function loadContacts() {
    if (!browser) return;

    loading = true;
    error = null;

    try {
      const evangelismService = await import("$lib/services/evangelismService");
      const result = await evangelismService.getAll();

      if (result.error) {
        throw result.error;
      }
      contacts = result.data || [];
      usingMockData = false;
    } catch (e) {
      console.warn("Failed to load from Convex, using mock data:", e.message);
      contacts = centralMockContacts;
      usingMockData = true;
      error = null;
    } finally {
      loading = false;
    }
  }

  // Open add contact modal
  function handleAddContact() {
    selectedContact = null;
    isFormOpen = true;
  }

  // Open edit contact modal
  function handleEditContact(contact) {
    selectedContact = contact;
    isFormOpen = true;
  }

  // Open delete confirmation modal
  function handleDeleteClick(contact) {
    selectedContact = contact;
    isDeleteModalOpen = true;
  }

  // Open convert confirmation modal
  function handleConvertClick(contact) {
    selectedContact = contact;
    isConvertModalOpen = true;
  }

  // Confirm delete contact
  async function handleConfirmDelete() {
    if (!selectedContact) return;

    deleting = true;

    try {
      const evangelismService = await import("$lib/services/evangelismService");
      const result = await evangelismService.remove(selectedContact.id);

      if (result.error) {
        throw result.error;
      }

      contacts = contacts.filter((c) => c.id !== selectedContact.id);
      isDeleteModalOpen = false;
      selectedContact = null;
    } catch (e) {
      console.error("Error deleting contact:", e);
    } finally {
      deleting = false;
    }
  }

  // Confirm mark as converted
  async function handleConfirmConvert() {
    if (!selectedContact) return;

    converting = true;

    try {
      const evangelismService = await import("$lib/services/evangelismService");
      const result = await evangelismService.markAsConverted(
        selectedContact.id,
        true,
      );

      if (result.error) {
        throw result.error;
      }

      // Update local state
      contacts = contacts.map((c) =>
        c.id === selectedContact.id
          ? {
              ...c,
              converted: true,
              conversion_date: new Date().toISOString().split("T")[0],
            }
          : c,
      );
      isConvertModalOpen = false;
      selectedContact = null;
    } catch (e) {
      console.error("Error converting contact:", e);
      // For mock data, just update locally
      if (usingMockData) {
        contacts = contacts.map((c) =>
          c.id === selectedContact.id
            ? {
                ...c,
                converted: true,
                conversion_date: new Date().toISOString().split("T")[0],
              }
            : c,
        );
        isConvertModalOpen = false;
        selectedContact = null;
      }
    } finally {
      converting = false;
    }
  }

  // Handle save from form
  function handleSave(savedContact) {
    if (selectedContact) {
      contacts = contacts.map((c) =>
        c.id === savedContact.id ? savedContact : c,
      );
    } else {
      contacts = [...contacts, savedContact];
    }
    selectedContact = null;
  }
</script>

<DashboardLayout>
  <!-- Filters in the named snippet slot -->
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <!-- Page Header with Add Button -->
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-in"
  >
    <PageHeader
      title="Evangelism Contacts"
      subtitle="Track and manage evangelism outreach efforts"
    />

    <Button onclick={handleAddContact}>
      <svg
        class="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      Add Contact
    </Button>
  </div>

  <!-- Mock Data Banner -->
  {#if usingMockData}
    <div
      class="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm flex items-center gap-2 animate-in delay-1"
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
        >Using demo data. Configure Convex environment variables to connect to
        your database.</span
      >
    </div>
  {/if}

  <!-- View Toggle Tabs -->
  <div
    class="mb-6 flex items-center gap-1 p-1 bg-secondary/30 rounded-lg w-fit animate-in delay-2"
  >
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {activeView ===
      'list'
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
      onclick={() => (activeView = "list")}
    >
      <svg
        class="w-4 h-4 inline-block mr-1.5 -mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 10h16M4 14h16M4 18h16"
        />
      </svg>
      Contact List
    </button>
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {activeView ===
      'dashboard'
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}"
      onclick={() => (activeView = "dashboard")}
    >
      <svg
        class="w-4 h-4 inline-block mr-1.5 -mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      Dashboard
    </button>
  </div>

  <!-- DASHBOARD VIEW -->
  {#if activeView === "dashboard"}
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        title="Total Contacts"
        value={kpis().total}
        icon="users"
        trend={null}
      />
      <KPICard
        title="Membership Join Rate"
        value={`${kpis().membershipJoinRate}%`}
        icon="trending-up"
        variant="info"
        trend={null}
      />
      <KPICard
        title="Salvation Decisions"
        value={kpis().converted}
        icon="check-circle"
        variant="success"
        trend={null}
      />
      <KPICard
        title="Follow-ups Needed"
        value={kpis().needingFollowUp}
        icon="clock"
        variant={kpis().needingFollowUp > 0 ? "warning" : "default"}
        trend={null}
      />
    </div>

    <!-- Monthly Contacts Bar Chart (Full Width) -->
    <div class="mb-6">
      <MonthlyContactsBar
        data={monthlyContactsData()}
        title="Contacts by Month"
        onMonthClick={(item) => {
          console.log("Month clicked:", item);
        }}
      >
        {#snippet filterContent()}
          <FilterBar />
        {/snippet}
      </MonthlyContactsBar>
    </div>

    <!-- Charts Row 1 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <InviterBarChart
        data={inviterChartData()}
        title="Top Inviters"
        onInviterClick={(inviter) => {
          selectedInviter = people.find((p) => p.id === inviter.id);
          isInviterPopupOpen = true;
        }}
      >
        {#snippet filterContent()}
          <FilterBar />
        {/snippet}
      </InviterBarChart>
      <ContactsByMonthTimeline
        contacts={filteredContacts()}
        {people}
        onInviterClick={(inviter) => {
          selectedInviter = inviter;
          isInviterPopupOpen = true;
        }}
        onContactClick={(contact) => handleEditContact(contact)}
      />
    </div>

    <!-- Charts Row 2 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <ConversionFunnel data={funnelData()} title="Conversion Funnel" />
      <SalvationTimeline
        contacts={filteredContacts()}
        {people}
        onInviterClick={(inviter) => {
          selectedInviter = inviter;
          isInviterPopupOpen = true;
        }}
        onContactClick={(contact) => handleEditContact(contact)}
      />
    </div>

    <!-- Chart Row 3 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <CategoryDonut data={categoryData()} title="Contact Categories" />

      <!-- Top Inviters Leaderboard -->
      <div class="card-base">
        <div class="flex items-center justify-between mb-4">
          <h4
            class="text-sm font-medium text-muted-foreground flex items-center gap-2"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            Top Inviters Leaderboard
          </h4>
        </div>

        {#if topInviters().length === 0}
          <p class="text-sm text-muted-foreground/60 italic text-center py-4">
            No inviter data yet.
          </p>
        {:else}
          <div class="space-y-3">
            {#each topInviters() as inviter, index}
              <button
                type="button"
                class="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-premium text-left"
                onclick={() => {
                  selectedInviter = people.find((p) => p.id === inviter.id);
                  isInviterPopupOpen = true;
                }}
              >
                <!-- Rank Badge -->
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  {index === 0
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : index === 1
                      ? 'bg-gray-400/20 text-gray-300'
                      : index === 2
                        ? 'bg-orange-600/20 text-orange-400'
                        : 'bg-secondary text-muted-foreground'}"
                >
                  #{index + 1}
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground truncate">
                    {inviter.name}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {inviter.count}
                    {inviter.count === 1 ? "invite" : "invites"}
                    <span class="text-success"
                      >• {inviter.conversions} converted</span
                    >
                  </p>
                </div>

                <!-- Arrow -->
                <svg
                  class="w-4 h-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- LIST VIEW (Original Content) -->
    <!-- KPI Cards Section -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        title="Total Contacts"
        value={kpis().total}
        icon="users"
        trend={null}
      />
      <KPICard
        title="Membership Join Rate"
        value={`${kpis().membershipJoinRate}%`}
        icon="trending-up"
        variant="info"
        trend={null}
      />
      <KPICard
        title="Salvation Decisions"
        value={kpis().converted}
        icon="check-circle"
        variant="success"
        trend={null}
      />
      <KPICard
        title="Follow-ups Needed"
        value={kpis().needingFollowUp}
        icon="clock"
        variant={kpis().needingFollowUp > 0 ? "warning" : "default"}
        trend={null}
      />
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <ConversionFunnel data={funnelData()} title="Conversion Funnel" />
      <CategoryDonut data={categoryData()} title="Contact Categories" />
    </div>

    <!-- Top Inviters Leaderboard -->
    <div class="mb-6 card-base">
      <div class="flex items-center justify-between mb-4">
        <h4
          class="text-sm font-medium text-muted-foreground flex items-center gap-2"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          Top Inviters
        </h4>
      </div>

      {#if topInviters().length === 0}
        <p class="text-sm text-muted-foreground/60 italic text-center py-4">
          No inviter data yet.
        </p>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {#each topInviters() as inviter, index}
            <div
              class="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-premium"
            >
              <!-- Rank Badge -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
              {index === 0
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : index === 1
                    ? 'bg-gray-400/20 text-gray-300'
                    : index === 2
                      ? 'bg-orange-600/20 text-orange-400'
                      : 'bg-secondary text-muted-foreground'}"
              >
                #{index + 1}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground truncate">
                  {inviter.name}
                </p>
                <p class="text-xs text-muted-foreground">
                  {inviter.count}
                  {inviter.count === 1 ? "invite" : "invites"}
                  <span class="text-success"
                    >• {inviter.conversions} converted</span
                  >
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recent Comments Log -->
    <div class="card-base mb-6">
      <h4
        class="text-sm font-medium text-foreground mb-3 flex items-center gap-2"
      >
        <svg
          class="w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        Recent Follow-up Notes
      </h4>
      <div class="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
        {#each recentComments() as comment}
          <div
            class="p-3 bg-secondary/20 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-foreground"
                >{comment.contact_name}</span
              >
              <span class="text-xs text-muted-foreground"
                >{formatCommentDate(comment.created_at)}</span
              >
            </div>
            <p class="text-sm text-muted-foreground line-clamp-2">
              {comment.text}
            </p>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground text-center py-4 italic">
            No recent follow-up notes
          </p>
        {/each}
      </div>
    </div>

    <!-- Filters Row -->
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <label for="response-filter" class="text-sm text-muted-foreground"
        >Category:</label
      >
      <select
        id="response-filter"
        bind:value={responseFilter}
        class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm
             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {#each responseOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>

      <label for="inviter-filter" class="text-sm text-muted-foreground ml-4"
        >Invited By:</label
      >
      <select
        id="inviter-filter"
        bind:value={inviterFilter}
        class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm
             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {#each inviterOptions() as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>

      <label for="status-filter" class="text-sm text-muted-foreground ml-4"
        >Status:</label
      >
      <select
        id="status-filter"
        bind:value={statusFilter}
        class="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm
             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {#each statusOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>

      <span class="text-sm text-muted-foreground ml-auto">
        {filteredContacts().length}
        {filteredContacts().length === 1 ? "contact" : "contacts"}
      </span>
    </div>

    <!-- Error State -->
    {#if error}
      <div
        class="p-6 bg-destructive/10 border border-destructive/30 rounded-lg text-center"
      >
        <svg
          class="w-12 h-12 mx-auto mb-4 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 class="text-lg font-semibold text-foreground mb-2">
          Error Loading Contacts
        </h3>
        <p class="text-muted-foreground mb-4">{error}</p>
        <Button onclick={loadContacts}>
          <svg
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry
        </Button>
      </div>
    {:else}
      <!-- Data Table -->
      <div class="pb-10">
        <DataTable
          columns={columns.filter((c) => c.key !== "actions")}
          data={filteredContacts()}
          {loading}
          searchable
          selectable={false}
          pageSize={15}
          searchPlaceholder="Search by name, phone, or email..."
          emptyMessage="No contacts found. Add your first evangelism contact to get started."
        />

        <!-- Quick Actions List -->
        {#if !loading && filteredContacts().length > 0}
          <div class="mt-4 card-base">
            <h4 class="text-sm font-medium text-muted-foreground mb-3">
              Quick Actions
            </h4>
            <div class="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
              {#each filteredContacts().slice(0, 20) as contact}
                <div
                  class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-premium"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium"
                    >
                      {contact.first_name?.[0]}{contact.last_name?.[0] || ""}
                    </div>
                    <button
                      type="button"
                      onclick={() => handleEditContact(contact)}
                      class="text-left hover:text-primary transition-colors"
                    >
                      <span
                        class="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {contact.first_name}
                        {contact.last_name || ""}
                      </span>
                      <span
                        class="ml-2 text-xs px-2 py-0.5 rounded-full {contact.response ===
                        'responsive'
                          ? 'bg-success/10 text-success'
                          : contact.response === 'non_responsive' ||
                              contact.response === 'do_not_contact'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-secondary text-muted-foreground'}"
                      >
                        {formatResponse(contact.response)}
                      </span>
                      {#if contact.converted}
                        <span
                          class="ml-1 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success"
                        >
                          Converted
                        </span>
                      {/if}
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    {#if !contact.converted}
                      <button
                        type="button"
                        onclick={() => handleConvertClick(contact)}
                        class="p-1.5 text-success hover:bg-success/10 rounded transition-premium"
                        aria-label="Mark as converted"
                        title="Mark as Converted"
                      >
                        <svg
                          class="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    {/if}
                    <button
                      type="button"
                      onclick={() => handleEditContact(contact)}
                      class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-premium"
                      aria-label="Edit {contact.first_name}"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onclick={() => handleDeleteClick(contact)}
                      class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-premium"
                      aria-label="Delete {contact.first_name}"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              {/each}
              {#if filteredContacts().length > 20}
                <p class="text-xs text-muted-foreground text-center py-2">
                  Showing first 20 of {filteredContacts().length} contacts. Use search
                  to find others.
                </p>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Recent Comments Log Section -->
    <div class="mt-6 card-base">
      <div class="flex items-center justify-between mb-4">
        <h4
          class="text-sm font-medium text-muted-foreground flex items-center gap-2"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Recent Follow-up Notes
        </h4>
        <span class="text-xs text-muted-foreground">
          {recentComments().length}
          {recentComments().length === 1 ? "note" : "notes"}
        </span>
      </div>

      <div class="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin">
        {#if recentComments().length === 0}
          <p class="text-sm text-muted-foreground/60 italic text-center py-6">
            No follow-up notes yet. Add notes when editing contacts.
          </p>
        {:else}
          {#each recentComments() as comment}
            <div
              class="flex gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-premium"
            >
              <!-- Avatar/Initial -->
              <div
                class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium flex-shrink-0"
              >
                {comment.contact_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <button
                    type="button"
                    onclick={() => {
                      const contact = contacts.find(
                        (c) => c.id === comment.contact_id,
                      );
                      if (contact) handleEditContact(contact);
                    }}
                    class="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                  >
                    {comment.contact_name}
                  </button>
                  <span class="text-xs text-muted-foreground/70 flex-shrink-0">
                    {formatCommentDate(comment.created_at)}
                  </span>
                </div>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  {comment.text}
                </p>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</DashboardLayout>

<!-- Inviter Profile Popup -->
<InviterProfilePopup
  open={isInviterPopupOpen}
  person={selectedInviter}
  {contacts}
  onClose={() => {
    isInviterPopupOpen = false;
    selectedInviter = null;
  }}
  onViewProfile={(person) => {
    isInviterPopupOpen = false;
    goto(`/people/${person.id}`);
  }}
/>

<!-- Contact Form Modal -->
<EvangelismContactForm
  bind:isOpen={isFormOpen}
  contact={selectedContact}
  onsave={handleSave}
/>

<!-- Delete Confirmation Modal -->
<Modal bind:isOpen={isDeleteModalOpen} title="Delete Contact" size="sm">
  <div class="text-center">
    <div
      class="w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center"
    >
      <svg
        class="w-6 h-6 text-destructive"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <p class="text-foreground mb-2">
      Are you sure you want to delete <strong
        >{selectedContact?.first_name}
        {selectedContact?.last_name || ""}</strong
      >?
    </p>
    <p class="text-sm text-muted-foreground">This action cannot be undone.</p>
  </div>

  {#snippet footer()}
    <Button
      variant="secondary"
      onclick={() => (isDeleteModalOpen = false)}
      disabled={deleting}
    >
      Cancel
    </Button>
    <Button variant="danger" onclick={handleConfirmDelete} disabled={deleting}>
      {#if deleting}
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
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
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Deleting...
      {:else}
        Delete
      {/if}
    </Button>
  {/snippet}
</Modal>

<!-- Convert Confirmation Modal -->
<Modal bind:isOpen={isConvertModalOpen} title="Mark as Converted" size="sm">
  <div class="text-center">
    <div
      class="w-12 h-12 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center"
    >
      <svg
        class="w-6 h-6 text-success"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <p class="text-foreground mb-2">
      Mark <strong
        >{selectedContact?.first_name}
        {selectedContact?.last_name || ""}</strong
      > as converted?
    </p>
    <p class="text-sm text-muted-foreground">
      This will also add them to the People Directory as a visitor.
    </p>
  </div>

  {#snippet footer()}
    <Button
      variant="secondary"
      onclick={() => (isConvertModalOpen = false)}
      disabled={converting}
    >
      Cancel
    </Button>
    <Button onclick={handleConfirmConvert} disabled={converting}>
      {#if converting}
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
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
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Converting...
      {:else}
        Mark as Converted
      {/if}
    </Button>
  {/snippet}
</Modal>
