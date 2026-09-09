<script>
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import DashboardLayout from "$lib/components/layout/DashboardLayout.svelte";
  import PageHeader from "$lib/components/shared/PageHeader.svelte";
  import FilterBar from "$lib/components/filters/FilterBar.svelte";
  import MultiSelectFilter from "$lib/components/filters/MultiSelectFilter.svelte";
  import { DataTable, Modal, Button } from "$lib/components/ui";
  import EvangelismContactForm from "$lib/components/forms/EvangelismContactForm.svelte";
  import EvangelismDetailModal from "$lib/components/evangelism/EvangelismDetailModal.svelte";
  import EvangelismInsights from "$lib/components/evangelism/EvangelismInsights.svelte";
  import InviterProfilePopup from "$lib/components/dashboard/InviterProfilePopup.svelte";
  import { mockPeople, mockEvangelismContacts } from "$lib/data/mockData";
  import { dateRange } from "$lib/stores/filterStore";
  import {
    buildEvangelismRows,
    contactId,
    filterEvangelismRows,
    isWithinDateRange,
    monthlyOutreach,
    outreachMetrics,
    personName,
    topInviters,
  } from "$lib/utils/evangelismView.js";
  import {
    assignContact as assignCrmContact,
    getContactProfile,
    getDashboard as getCrmDashboard,
  } from "$lib/services/followUpCrmService.js";

  let contacts = $state(mockEvangelismContacts);
  let people = $state(mockPeople);
  let crmWorkspace = $state({
    leaders: [], active_assignments: [], tasks: [], member_care_tasks: [],
    confirmed_commitments: [], later_contacts: [], unassigned_contacts: [],
  });
  let activeView = $state("contacts");
  let loading = $state(false);
  let error = $state(null);
  let hasLoadedClientData = $state(false);

  let responseFilter = $state([]);
  let journeyFilter = $state([]);
  let followUpFilter = $state([]);
  let selectedMonth = $state("");

  let isFormOpen = $state(false);
  let isDetailModalOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let isConvertModalOpen = $state(false);
  let isInviterPopupOpen = $state(false);
  let selectedContact = $state(null);
  let selectedInviter = $state(null);
  let contactProfile = $state(null);
  let profileLoading = $state(false);
  let deleting = $state(false);
  let converting = $state(false);

  const responseOptions = [
    { value: "not_assessed", label: "Not assessed" },
    { value: "responsive", label: "Open to follow-up" },
    { value: "non_responsive", label: "Not responding" },
    { value: "events_only", label: "Events only" },
    { value: "big_events_only", label: "Big events only" },
    { value: "bacenta_mainly", label: "Bacenta mainly" },
    { value: "has_church", label: "Has another church" },
    { value: "do_not_contact", label: "Do not contact" },
  ];

  const journeyOptions = [
    { value: "outreach", label: "Outreach" },
    { value: "saved", label: "Salvation decision" },
    { value: "visited", label: "First-time attendee" },
    { value: "engaged", label: "Saved and attended" },
    { value: "joined", label: "Joined church" },
    { value: "closed", label: "Closed" },
  ];

  const followUpOptions = [
    { value: "unassigned", label: "Needs owner" },
    { value: "overdue", label: "Overdue" },
    { value: "scheduled", label: "Scheduled" },
    { value: "active", label: "In follow-up" },
    { value: "later", label: "Follow up later" },
    { value: "complete", label: "Complete" },
    { value: "closed", label: "Closed" },
    { value: "none", label: "No next action" },
  ];

  const columns = [
    { key: "full_name", label: "Person", sortable: true, width: "190px" },
    { key: "contact_date_label", label: "Contacted", sortable: true, width: "145px" },
    { key: "response_label", label: "Follow-up posture", sortable: true, width: "170px" },
    { key: "invited_by_name", label: "Invited by", sortable: true, width: "160px" },
    { key: "journey_label", label: "Journey", sortable: true, width: "150px" },
    { key: "follow_up_label", label: "Follow-up", sortable: true, width: "190px" },
  ];

  const outreachRows = $derived(buildEvangelismRows(contacts, people, crmWorkspace));
  const directoryRows = $derived(filterEvangelismRows(outreachRows, {
    responses: responseFilter,
    journeys: journeyFilter,
    followUp: followUpFilter,
  }).filter((row) => !selectedMonth || String(row.contact_date || "").startsWith(selectedMonth)));
  const insightRows = $derived(outreachRows.filter((row) => isWithinDateRange(row.contact_date, $dateRange)));
  const insightMetrics = $derived(outreachMetrics(insightRows));
  const monthlyData = $derived(monthlyOutreach(insightRows));
  const inviterLeaders = $derived(topInviters(insightRows, people));
  const allMetrics = $derived(outreachMetrics(outreachRows));
  const responsiveCount = $derived(outreachRows.filter((row) => row.response === "responsive").length);
  const needsFollowUpCount = $derived(outreachRows.filter((row) => ["unassigned", "overdue", "scheduled", "active", "later"].includes(row.follow_up_key)).length);

  $effect(() => {
    if (hasLoadedClientData || !browser) return;
    hasLoadedClientData = true;
    void Promise.all([loadContacts(), loadPeople(), loadCrmWorkspace()]);
  });

  async function loadContacts() {
    if (!browser) return;
    loading = true;
    error = null;
    try {
      const evangelismService = await import("$lib/services/evangelismService");
      const result = await evangelismService.getAll();
      if (result.error) throw result.error;
      contacts = result.data || [];
    } catch (loadError) {
      console.warn("Failed to load evangelism contacts:", loadError?.message);
      contacts = mockEvangelismContacts;
      error = "Contacts could not be refreshed. Showing the latest available records.";
    } finally {
      loading = false;
    }
  }

  async function loadPeople() {
    if (!browser) return;
    try {
      const peopleService = await import("$lib/services/peopleService");
      const result = await peopleService.getAll();
      if (!result.error) people = result.data || [];
    } catch (loadError) {
      console.warn("Failed to load people:", loadError?.message);
      people = mockPeople;
    }
  }

  async function loadCrmWorkspace() {
    const result = await getCrmDashboard();
    if (!result.error && result.data) crmWorkspace = result.data;
  }

  function handleAddContact() {
    selectedContact = null;
    isFormOpen = true;
  }

  function handleEditContact(contact) {
    selectedContact = contact;
    isFormOpen = true;
  }

  async function handleViewContact(contact) {
    selectedContact = contact;
    contactProfile = null;
    isDetailModalOpen = true;
    profileLoading = true;
    const viewedId = contactId(contact);
    const result = await getContactProfile(viewedId);
    if (!result.error && result.data && String(contactId(selectedContact)) === String(viewedId)) {
      contactProfile = result.data;
    }
    profileLoading = false;
  }

  async function handleSave(savedContact) {
    const savedId = contactId(savedContact);
    if (selectedContact) {
      contacts = contacts.map((contact) => String(contactId(contact)) === String(savedId) ? savedContact : contact);
    } else {
      contacts = [savedContact, ...contacts];
    }
    selectedContact = null;
    await loadCrmWorkspace();
  }

  async function handleAssignContact(contact, leaderId) {
    const result = await assignCrmContact(
      contactId(contact), leaderId, new Date().toISOString().slice(0, 10),
      { createFirstContactTask: !contact.crm_assignment },
    );
    if (result.error) return result;
    await loadCrmWorkspace();
    const profileResult = await getContactProfile(contactId(contact));
    if (!profileResult.error) contactProfile = profileResult.data;
    const refreshed = outreachRows.find((item) => String(contactId(item)) === String(contactId(contact)));
    if (refreshed) selectedContact = refreshed;
    return result;
  }

  async function handleConfirmDelete() {
    if (!selectedContact) return;
    deleting = true;
    try {
      const evangelismService = await import("$lib/services/evangelismService");
      const id = contactId(selectedContact);
      const result = await evangelismService.remove(id);
      if (result.error) throw result.error;
      contacts = contacts.filter((contact) => String(contactId(contact)) !== String(id));
      isDeleteModalOpen = false;
      selectedContact = null;
    } catch (deleteError) {
      console.error("Error deleting contact:", deleteError);
    } finally {
      deleting = false;
    }
  }

  async function handleConfirmConvert() {
    if (!selectedContact) return;
    converting = true;
    try {
      const evangelismService = await import("$lib/services/evangelismService");
      const id = contactId(selectedContact);
      const result = await evangelismService.markAsConverted(id, true);
      if (result.error) throw result.error;
      contacts = contacts.map((contact) => String(contactId(contact)) === String(id)
        ? { ...contact, converted: true, status: "member", conversion_date: new Date().toISOString().slice(0, 10) }
        : contact);
      isConvertModalOpen = false;
      selectedContact = null;
    } catch (convertError) {
      console.error("Error converting contact:", convertError);
    } finally {
      converting = false;
    }
  }

  function openInviter(inviter) {
    selectedInviter = people.find((person) => String(contactId(person)) === String(inviter.id)) || null;
    isInviterPopupOpen = Boolean(selectedInviter);
  }

  function showMonthContacts(point) {
    selectedMonth = point.month || "";
    activeView = "contacts";
  }
</script>

<DashboardLayout>
  {#snippet filters()}
    <FilterBar />
  {/snippet}

  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <PageHeader title="Evangelism" subtitle="Capture outreach, see what happened next, and focus the next conversation." />
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onclick={() => goto("/pipeline")}>
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-6-6l6 6-6 6" /></svg>
        Follow-Up CRM
      </Button>
      <Button onclick={handleAddContact}>
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14" /></svg>
        Add contact
      </Button>
    </div>

    {#if selectedMonth}
      <div class="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
        <span>Showing contacts reached in <strong>{new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong>.</span>
        <button type="button" class="text-xs font-semibold text-primary hover:underline" onclick={() => selectedMonth = ""}>Clear month</button>
      </div>
    {/if}
  </div>

  <nav class="mb-6 flex gap-6 border-b border-border" aria-label="Evangelism sections">
    <button type="button" class="relative px-1 pb-3 text-sm font-medium transition-colors {activeView === 'contacts' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}" aria-current={activeView === "contacts" ? "page" : undefined} onclick={() => activeView = "contacts"}>
      Contacts
      {#if activeView === "contacts"}<span class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"></span>{/if}
    </button>
    <button type="button" class="relative px-1 pb-3 text-sm font-medium transition-colors {activeView === 'insights' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}" aria-current={activeView === "insights" ? "page" : undefined} onclick={() => activeView = "insights"}>
      Insights
      {#if activeView === "insights"}<span class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"></span>{/if}
    </button>
  </nav>

  {#if activeView === "contacts"}
    <section class="card-base mb-5 p-5" aria-labelledby="outreach-directory-title">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-4">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.4-1.8M17 20H7m10 0v-2a5 5 0 00-10 0v2m0 0H2v-2a3 3 0 015.4-1.8M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div>
            <h2 id="outreach-directory-title" class="text-base font-semibold text-foreground">Outreach records</h2>
            <p class="mt-1 max-w-xl text-sm text-muted-foreground">Keep every contact visible while you review response, outcomes, and next actions.</p>
          </div>
        </div>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4 text-center sm:grid-cols-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div><dt class="text-xs text-muted-foreground">People reached</dt><dd class="mt-1 text-xl font-semibold text-foreground">{outreachRows.length}</dd></div>
          <div><dt class="text-xs text-muted-foreground">Open to follow-up</dt><dd class="mt-1 text-xl font-semibold text-primary">{responsiveCount}</dd></div>
          <div><dt class="text-xs text-muted-foreground">Needs follow-up</dt><dd class="mt-1 text-xl font-semibold {needsFollowUpCount ? 'text-warning' : 'text-success'}">{needsFollowUpCount}</dd></div>
          <div><dt class="text-xs text-muted-foreground">Joined church</dt><dd class="mt-1 text-xl font-semibold text-success">{allMetrics.joined}</dd></div>
        </dl>
      </div>
    </section>

    <div class="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="flex flex-wrap items-start gap-3">
        <MultiSelectFilter label="Posture" options={responseOptions} bind:selected={responseFilter} placeholder="Search follow-up postures..." />
        <MultiSelectFilter label="Journey" options={journeyOptions} bind:selected={journeyFilter} placeholder="Search milestones..." />
        <MultiSelectFilter label="Follow-up" options={followUpOptions} bind:selected={followUpFilter} placeholder="Search follow-up states..." />
      </div>
      <p class="pb-2 text-sm text-muted-foreground">Showing <span class="font-medium text-foreground">{directoryRows.length}</span> of {outreachRows.length} contacts</p>
    </div>

    {#if error}
      <div class="mb-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.3 3.8L2.6 17.1A2 2 0 004.3 20h15.4a2 2 0 001.7-2.9L13.7 3.8a2 2 0 00-3.4 0z" /></svg>
        <span>{error}</span>
      </div>
    {/if}

    <div class="pb-10">
      <DataTable
        {columns}
        data={directoryRows}
        {loading}
        searchable
        selectable={false}
        enableCopy={false}
        onrowclick={handleViewContact}
        rowActionLabel="View"
        pageSize={15}
        searchKeys={["first_name", "last_name", "phone", "email", "invited_by_name"]}
        searchPlaceholder="Search people, phone, email, or inviter..."
        emptyMessage={outreachRows.length ? "No contacts match these filters." : "No outreach contacts yet. Add the first person you reached."}
        storageKey="evangelism-outreach-directory-v3"
      />
    </div>
  {:else}
    <EvangelismInsights
      metrics={insightMetrics}
      {monthlyData}
      rows={insightRows}
      topInviters={inviterLeaders}
      periodLabel={$dateRange.label}
      onInviterClick={openInviter}
      onMonthClick={showMonthContacts}
    />
  {/if}
</DashboardLayout>

<InviterProfilePopup
  bind:isOpen={isInviterPopupOpen}
  person={selectedInviter}
  contacts={insightRows}
  periodLabel={$dateRange.label}
  onClose={() => { isInviterPopupOpen = false; selectedInviter = null; }}
  onViewProfile={(person) => { isInviterPopupOpen = false; goto(`/people/${contactId(person)}`); }}
  onViewContact={(contact) => { isInviterPopupOpen = false; void handleViewContact(contact); }}
/>

<EvangelismContactForm bind:isOpen={isFormOpen} contact={selectedContact} onsave={handleSave} />

<Modal bind:isOpen={isDeleteModalOpen} title="Delete contact" size="sm" zIndex={60}>
  <div class="text-center">
    <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01M10.3 3.8L2.6 17.1A2 2 0 004.3 20h15.4a2 2 0 001.7-2.9L13.7 3.8a2 2 0 00-3.4 0z" /></svg>
    </div>
    <p class="text-foreground">Delete <strong>{personName(selectedContact, "this contact")}</strong>?</p>
    <p class="mt-2 text-sm text-muted-foreground">Their outreach record will be permanently removed.</p>
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => isDeleteModalOpen = false} disabled={deleting}>Cancel</Button>
    <Button variant="danger" onclick={handleConfirmDelete} loading={deleting}>Delete contact</Button>
  {/snippet}
</Modal>

<Modal bind:isOpen={isConvertModalOpen} title="Promote to member" size="sm" zIndex={60}>
  <div class="text-center">
    <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5" /></svg>
    </div>
    <p class="text-foreground">Promote <strong>{personName(selectedContact, "this contact")}</strong> to a church member?</p>
    <p class="mt-2 text-sm text-muted-foreground">Their journey will be marked as joined and they will remain in the People Directory.</p>
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => isConvertModalOpen = false} disabled={converting}>Cancel</Button>
    <Button onclick={handleConfirmConvert} loading={converting}>Promote to member</Button>
  {/snippet}
</Modal>

<EvangelismDetailModal
  bind:isOpen={isDetailModalOpen}
  contact={selectedContact}
  profile={contactProfile}
  {profileLoading}
  leaders={crmWorkspace.leaders || []}
  onAssign={handleAssignContact}
  onOpenCrm={() => goto("/pipeline")}
  onEdit={handleEditContact}
  onDelete={(contact) => { selectedContact = contact; isDeleteModalOpen = true; }}
  onConvert={(contact) => { selectedContact = contact; isConvertModalOpen = true; }}
  onQuickUpdate={async (id, updates) => {
    const evangelismService = await import("$lib/services/evangelismService");
    const result = await evangelismService.update(id, updates);
    if (result.error) throw result.error;
    contacts = contacts.map((contact) => String(contactId(contact)) === String(id) ? { ...contact, ...updates } : contact);
    if (selectedContact && String(contactId(selectedContact)) === String(id)) selectedContact = { ...selectedContact, ...updates };
  }}
/>
