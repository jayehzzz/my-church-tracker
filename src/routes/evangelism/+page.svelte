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
  import MultiSelectFilter from "$lib/components/filters/MultiSelectFilter.svelte";
  import { DataTable, Modal, Button, Badge } from "$lib/components/ui";
  import KPICard from "$lib/components/dashboard/KPICard.svelte";
  import EvangelismContactForm from "$lib/components/forms/EvangelismContactForm.svelte";
  import EvangelismDetailModal from "$lib/components/evangelism/EvangelismDetailModal.svelte";

  // Import filter store for reactive date range
  import { dateRange } from "$lib/stores/filterStore";

  // Import chart components
  import ConversionFunnel from "$lib/components/charts/ConversionFunnel.svelte";
  import MonthlyContactsBar from "$lib/components/charts/MonthlyContactsBar.svelte";
  import ContactsByMonthTimeline from "$lib/components/charts/ContactsByMonthTimeline.svelte";
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

  // Filter state - now using arrays for multi-select
  let responseFilter = $state([]);
  let inviterFilter = $state([]);
  let statusFilter = $state([]); // Status filter (guest/member/archived)

  // Status options for filter (removed 'all' option since empty array = all)
  const statusOptions = [
    { value: "guest", label: "Guest" },
    { value: "member", label: "Member" },
    { value: "archived", label: "Archived" },
  ];

  // Modal state
  let isFormOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let isConvertModalOpen = $state(false);
  let isDetailModalOpen = $state(false);
  let selectedContact = $state(null);
  let deleting = $state(false);
  let converting = $state(false);

  // Track if using mock data
  let usingMockData = $state(false);

  // Response options for filter (removed 'all' option since empty array = all)
  const responseOptions = [
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
        // Use the pre-resolved name from Convex if available
        if (row.invited_by_name) return row.invited_by_name;
        // Fallback: lookup in people array (check both id and _id)
        const inviter = people.find((p) => p.id === value || p._id === value);
        return inviter
          ? `${inviter.first_name} ${inviter.last_name || ""}`.trim()
          : "Unknown";
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
  // Now using array-based filtering (empty array = show all, OR within each filter type)
  const filteredContacts = $derived(() => {
    const range = $dateRange;
    let filtered = contacts;

    // Filter by date range first
    filtered = filtered.filter((c) => isWithinDateRange(c.contact_date, range));

    // Then filter by response category (OR logic - match ANY selected)
    if (responseFilter.length > 0) {
      filtered = filtered.filter((c) => responseFilter.includes(c.response));
    }

    // Filter by inviter (OR logic - match ANY selected)
    if (inviterFilter.length > 0) {
      filtered = filtered.filter((c) =>
        inviterFilter.includes(c.invited_by_id),
      );
    }

    // Filter by status (OR logic - match ANY selected)
    if (statusFilter.length > 0) {
      filtered = filtered.filter((c) => statusFilter.includes(c.status));
    }

    return filtered;
  });

  // Get unique inviters for filter dropdown (no 'all' option needed for multi-select)
  const inviterOptions = $derived(() => {
    const inviters = contacts
      .filter((c) => c.invited_by_id)
      .map((c) => c.invited_by_id)
      .filter((v, i, a) => a.indexOf(v) === i); // unique values

    const options = [];
    inviters.forEach((id) => {
      const person = people.find((p) => p.id === id || p._id === id);
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
      attended: filtered.filter(
        (c) => c.first_visit_date || c.attended_church || c.converted,
      ).length,
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
      const person = people.find(
        (p) => p.id === inviter.id || p._id === inviter.id,
      );
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

  // Open detail modal (for row click)
  function handleViewContact(contact) {
    selectedContact = contact;
    isDetailModalOpen = true;
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
    class="mb-6 relative grid grid-cols-2 gap-1 p-1 bg-secondary/30 rounded-lg w-fit animate-in delay-2 isolate"
  >
    <!-- Sliding Pill Background -->
    <div
      class="absolute top-1 bottom-1 rounded-md bg-primary shadow-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
      style="
            width: calc((100% - 0.75rem) / 2);
            left: calc(0.25rem + {activeView === 'dashboard'
        ? 1
        : 0} * ((100% - 0.75rem) / 2 + 0.25rem));
        "
    ></div>

    <button
      type="button"
      class="relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 {activeView ===
      'list'
        ? 'text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground'}"
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
      class="relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 {activeView ===
      'dashboard'
        ? 'text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground'}"
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

  <!-- DASHBOARD VIEW - Apple-Style Clean Design -->
  {#if activeView === "dashboard"}
    <!-- Hero Stats Bar - The ONE thing that matters -->
    <div class="card-base p-6 mb-6">
      <div class="flex flex-wrap items-center justify-between gap-6">
        <!-- Primary Metric -->
        <div class="flex items-center gap-4">
          <div
            class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
          >
            <svg
              class="w-7 h-7 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <p class="text-4xl font-bold text-foreground">
              {filteredContacts().length}
            </p>
            <p class="text-sm text-muted-foreground">Total Contacts</p>
          </div>
        </div>

        <!-- Secondary Metrics -->
        <div class="flex items-center gap-8">
          <div class="text-center">
            <p class="text-2xl font-semibold text-success">
              {filteredContacts().filter((c) => c.salvation_decision).length}
            </p>
            <p class="text-xs text-muted-foreground">Salvations</p>
          </div>
          <div class="h-8 w-px bg-border"></div>
          <div class="text-center">
            <p class="text-2xl font-semibold text-info">
              {filteredContacts().filter((c) => c.attended_church).length}
            </p>
            <p class="text-xs text-muted-foreground">Attended</p>
          </div>
          <div class="h-8 w-px bg-border"></div>
          <div class="text-center">
            <p class="text-2xl font-semibold text-foreground">
              {kpis().membershipJoinRate}%
            </p>
            <p class="text-xs text-muted-foreground">Join Rate</p>
          </div>
        </div>

        <!-- Top Inviters - Compact Inline -->
        {#if topInviters().length > 0}
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">Top:</span>
            {#each topInviters().slice(0, 3) as inviter, index}
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                       bg-secondary/50 hover:bg-secondary transition-colors"
                onclick={() => {
                  selectedInviter = people.find((p) => p.id === inviter.id);
                  isInviterPopupOpen = true;
                }}
              >
                <span
                  class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                  {index === 0
                    ? 'bg-yellow-500/30 text-yellow-500'
                    : index === 1
                      ? 'bg-gray-400/30 text-gray-400'
                      : 'bg-orange-500/30 text-orange-500'}"
                >
                  {index + 1}
                </span>
                {inviter.name.split(" ")[0]}
                <span class="text-muted-foreground">({inviter.count})</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Collapsible Sections -->
    <div class="space-y-3">
      <!-- Monthly Trend Section -->
      <details class="group card-base overflow-hidden" open>
        <summary
          class="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-secondary/20 transition-colors"
        >
          <div class="flex items-center gap-3">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5"
              />
            </svg>
            <span class="font-medium text-foreground">Monthly Trend</span>
          </div>
          <svg
            class="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180"
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
        </summary>
        <div class="px-4 pb-4">
          <MonthlyContactsBar
            data={monthlyContactsData()}
            title=""
            onMonthClick={(item) => console.log("Month clicked:", item)}
          />
        </div>
      </details>

      <!-- Conversion Journey Section -->
      <details class="group card-base overflow-hidden">
        <summary
          class="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-secondary/20 transition-colors"
        >
          <div class="flex items-center gap-3">
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
            <span class="font-medium text-foreground">Conversion Journey</span>
            <span
              class="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full"
            >
              {funnelData().joined} converted
            </span>
          </div>
          <svg
            class="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180"
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
        </summary>
        <div class="px-4 pb-4">
          <ConversionFunnel data={funnelData()} title="" />
        </div>
      </details>

      <!-- Recent Contacts Timeline -->
      <details class="group card-base overflow-hidden" open>
        <summary
          class="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-secondary/20 transition-colors"
        >
          <div class="flex items-center gap-3">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="font-medium text-foreground">Recent Activity</span>
            <span
              class="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full"
            >
              {filteredContacts().length} contacts
            </span>
          </div>
          <svg
            class="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180"
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
        </summary>
        <div class="p-0">
          <div class="max-h-[400px] overflow-y-auto">
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
        </div>
      </details>
    </div>
  {:else}
    <!-- LIST VIEW (Original Content) -->

    <!-- Filtered KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <KPICard
        title="Total (In Filter)"
        value={filteredContacts().length}
        icon="users"
        trend={null}
      />
      <KPICard
        title="Salvation Decisions"
        value={filteredContacts().filter((c) => c.salvation_decision).length}
        icon="heart"
        variant="success"
        trend={null}
      />
      <KPICard
        title="Attended Church"
        value={filteredContacts().filter(
          (c) => c.first_visit_date || c.attended_church,
        ).length}
        icon="home"
        variant="info"
        trend={null}
      />
    </div>

    <!-- Filters Row -->
    <div class="mb-6 flex flex-wrap items-start gap-4">
      <MultiSelectFilter
        label="Category"
        options={responseOptions}
        bind:selected={responseFilter}
        placeholder="Search categories..."
      />

      <MultiSelectFilter
        label="Invited By"
        options={inviterOptions()}
        bind:selected={inviterFilter}
        placeholder="Search inviters..."
      />

      <MultiSelectFilter
        label="Status"
        options={statusOptions}
        bind:selected={statusFilter}
        placeholder="Search status..."
      />

      <div class="flex-1 flex items-end justify-end">
        <span class="text-sm text-muted-foreground pb-2">
          {filteredContacts().length}
          {filteredContacts().length === 1 ? "contact" : "contacts"}
          <span class="mx-2 opacity-50">•</span>
          <span class="text-success">
            {filteredContacts().filter((c) => c.converted).length} conversions
          </span>
        </span>
      </div>
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
          onrowclick={(row) => handleViewContact(row)}
          pageSize={15}
          searchPlaceholder="Search by name, phone, or email..."
          emptyMessage="No contacts found. Add your first evangelism contact to get started."
          storageKey="evangelism-contacts"
        />
      </div>
    {/if}
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

<!-- Evangelism Detail Modal -->
<EvangelismDetailModal
  bind:isOpen={isDetailModalOpen}
  contact={selectedContact}
  onEdit={(c) => {
    selectedContact = c;
    isFormOpen = true;
  }}
  onDelete={(c) => {
    selectedContact = c;
    isDeleteModalOpen = true;
  }}
  onConvert={(c) => {
    selectedContact = c;
    isConvertModalOpen = true;
  }}
  onQuickUpdate={async (id, updates) => {
    try {
      const evangelismService = await import("$lib/services/evangelismService");
      const result = await evangelismService.update(id, updates);
      if (result.error) throw result.error;
      // Update local state
      contacts = contacts.map((c) => (c.id === id ? { ...c, ...updates } : c));
      // Update selected contact for the modal
      if (selectedContact?.id === id) {
        selectedContact = { ...selectedContact, ...updates };
      }
    } catch (e) {
      console.error("Quick update failed:", e);
      // If using mock data, just update locally anyway
      if (usingMockData) {
        contacts = contacts.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        );
        if (selectedContact?.id === id) {
          selectedContact = { ...selectedContact, ...updates };
        }
      }
    }
  }}
/>
