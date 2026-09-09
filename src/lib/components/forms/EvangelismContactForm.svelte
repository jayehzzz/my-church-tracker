<script>
  import { Modal, Button, Input, SearchableSelect } from "$lib/components/ui";
  import { session } from "$lib/auth/session.js";
  const restrictedLeader = $derived($session.status !== "demo" && $session.user?.role === "leader");
  const confidential = $derived($session.status === "demo" || $session.user?.canViewConfidential === true);
  import { browser } from "$app/environment";

  let { isOpen = $bindable(false), contact = null, onsave, ...restProps } = $props();

  let people = $state([]);
  let loadingPeople = $state(true);
  let saving = $state(false);
  let errors = $state({});
  let showMoreDetails = $state(false);
  let formData = $state(emptyForm());
  let hasLoadedPeople = $state(false);

  const mode = $derived(contact?.id || contact?._id ? "edit" : "create");
  const modalTitle = $derived(mode === "edit" ? "Edit evangelism contact" : "Add evangelism contact");
  const peopleOptions = $derived(() => [
    { value: "", label: "Select inviter..." },
    ...people.map((person) => ({
      value: person.id || person._id,
      label: `${person.first_name} ${person.last_name || ""}`.trim(),
    })),
  ]);
  const leaderOptions = $derived(() => [
    { value: "", label: "Leave unassigned for delegation..." },
    ...people.filter((person) => person.member_status === "leader").map((person) => ({
      value: person.id || person._id,
      label: `${person.first_name} ${person.last_name || ""}`.trim(),
    })),
  ]);

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
  const contactMethodOptions = [
    { value: "", label: "Not recorded" },
    { value: "in_person", label: "In person" },
    { value: "phone", label: "Phone call" },
    { value: "text", label: "Text message" },
    { value: "social_media", label: "Social media" },
    { value: "event", label: "Church event" },
    { value: "other", label: "Other" },
  ];

  function emptyForm() {
    return {
      first_name: "", last_name: "", phone: "", email: "", address: "",
      contact_date: new Date().toISOString().slice(0, 10), contact_method: "in_person",
      response: "not_assessed", collected_by_id: "", invited_by_id: "", assigned_leader_id: "",
      follow_up_date: "", first_visit_date: "", salvation_decision: false,
      converted: false, conversion_date: "", notes: "",
    };
  }

  $effect(() => {
    if (hasLoadedPeople || !browser) return;
    hasLoadedPeople = true;
    void loadPeople();
  });

  async function loadPeople() {
    if (!browser) return;
    loadingPeople = true;
    try {
      const peopleService = await import("$lib/services/peopleService");
      const result = await peopleService.getAll();
      if (!result.error) people = result.data || [];
    } catch (error) {
      console.warn("Failed to load people:", error?.message);
    } finally {
      loadingPeople = false;
    }
  }

  $effect(() => {
    if (!isOpen) return;
    showMoreDetails = false;
    errors = {};
    formData = contact ? {
      ...emptyForm(),
      first_name: contact.first_name || "", last_name: contact.last_name || "",
      phone: contact.phone || "", email: contact.email || "", address: contact.address || "",
      contact_date: contact.contact_date || new Date().toISOString().slice(0, 10),
      contact_method: contact.contact_method || "",
      response: contact.response || contact.contact_category || "not_assessed",
      collected_by_id: contact.collected_by_id || "",
      invited_by_id: contact.invited_by_id || "",
      assigned_leader_id: contact.assigned_leader_id || "",
      follow_up_date: contact.follow_up_date || "",
      first_visit_date: contact.first_visit_date || "",
      salvation_decision: Boolean(contact.salvation_decision),
      converted: Boolean(contact.converted || contact.member_status === "member"),
      conversion_date: contact.conversion_date || contact.membership_date || "",
      notes: contact.notes || "",
    } : emptyForm();
  });

  function validate() {
    const nextErrors = {};
    if (!formData.first_name.trim()) nextErrors.first_name = "First name is required";
    if (!formData.contact_date) nextErrors.contact_date = "Contact date is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Enter a valid email address";
    }
    if (formData.converted && !formData.conversion_date) {
      formData.conversion_date = new Date().toISOString().slice(0, 10);
    }
    errors = nextErrors;
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    saving = true;
    errors = {};
    try {
      const evangelismService = await import("$lib/services/evangelismService");
      const cleanData = { ...formData };
      if (!confidential) delete cleanData.notes;
      if (restrictedLeader) {
        delete cleanData.converted;
        delete cleanData.conversion_date;
        delete cleanData.assigned_leader_id;
        delete cleanData.collected_by_id;
        delete cleanData.invited_by_id;
      }
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === "" || cleanData[key] === null) delete cleanData[key];
      });
      if (mode === "edit") {
        if (!restrictedLeader && contact.collected_by_id && !formData.collected_by_id) cleanData.collected_by_id = null;
        delete cleanData.assigned_leader_id;
        delete cleanData.follow_up_date;
      }
      const result = mode === "edit"
        ? await evangelismService.update(contact.id || contact._id, cleanData)
        : await evangelismService.create(cleanData);
      if (result.error) {
        errors.submit = result.error.message || "The contact could not be saved";
        return;
      }
      onsave?.(result.data);
      isOpen = false;
    } catch (error) {
      errors.submit = error?.message || "The contact could not be saved";
    } finally {
      saving = false;
    }
  }
</script>

<Modal bind:isOpen title={modalTitle} size="lg" {...restProps}>
  <form class="space-y-5" onsubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
    {#if errors.submit}<div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{errors.submit}</div>{/if}

    <section class="space-y-4" aria-labelledby="contact-identity-title">
      <div><h3 id="contact-identity-title" class="text-sm font-semibold text-foreground">Contact details</h3><p class="mt-1 text-xs text-muted-foreground">Record enough information for a leader to contact this person.</p></div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="First Name" bind:value={formData.first_name} error={errors.first_name} required disabled={saving} />
        <Input label="Last Name" bind:value={formData.last_name} disabled={saving} />
        <Input label="Phone" type="tel" bind:value={formData.phone} disabled={saving} />
        <Input label="Email" type="email" bind:value={formData.email} error={errors.email} disabled={saving} />
      </div>
    </section>

    <section class="space-y-4 rounded-xl border border-border bg-secondary/15 p-4" aria-labelledby="outreach-title">
      <div><h3 id="outreach-title" class="text-sm font-semibold text-foreground">Outreach and follow-up</h3><p class="mt-1 text-xs text-muted-foreground">Capture what happened and make ownership explicit.</p></div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Contact Date" type="date" bind:value={formData.contact_date} error={errors.contact_date} required disabled={saving} />
        <SearchableSelect label="Follow-up Posture" bind:value={formData.response} options={responseOptions} disabled={saving} />
        <SearchableSelect label="Contact Method" bind:value={formData.contact_method} options={contactMethodOptions} disabled={saving} />
        {#if !restrictedLeader}
        <SearchableSelect label="Contact collected by" bind:value={formData.collected_by_id} options={peopleOptions().map(o => o.value ? o : {value:"",label:"Not recorded"})} disabled={saving || loadingPeople} placeholder="Not recorded" />
        <SearchableSelect label="Invited By" bind:value={formData.invited_by_id} options={peopleOptions()} disabled={saving || loadingPeople} placeholder="Search people..." />
        {/if}
        {#if mode === "create"}
          {#if !restrictedLeader}<SearchableSelect label="Follow-up Owner" bind:value={formData.assigned_leader_id} options={leaderOptions()} disabled={saving || loadingPeople} placeholder="Choose a leader..." />{/if}
          <Input label="First Task Due" type="date" min={formData.contact_date} bind:value={formData.follow_up_date} disabled={saving} />
        {/if}
      </div>
      {#if mode === "create"}
        <p class="text-xs text-muted-foreground">{restrictedLeader ? "New contacts are assigned to you. Contacts who request no contact or already have a church receive no automatic call task." : "Choosing an owner creates the leader’s first-contact task. If left unassigned, the contact appears in the CRM delegation queue."}</p>
      {:else}
        <p class="text-xs text-muted-foreground">Ownership and future tasks are managed from the Follow-Up CRM. If you meet this person again, update the Contact Date; that makes them fresh again and returns them to their leader’s work when needed.</p>
      {/if}
    </section>

    <details bind:open={showMoreDetails} class="rounded-xl border border-border bg-card">
      <summary class="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/20"><span>More details and milestones</span><span class="text-xs text-muted-foreground">Optional</span></summary>
      <div class="space-y-4 border-t border-border p-4">
        <Input label="Address" bind:value={formData.address} disabled={saving} />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-3"><input type="checkbox" bind:checked={formData.salvation_decision} disabled={saving} class="mt-0.5 h-4 w-4 rounded" /><span><span class="block text-sm font-medium text-foreground">Salvation decision</span><span class="text-xs text-muted-foreground">They prayed to receive Christ.</span></span></label>
          <div class="rounded-lg border border-border bg-secondary/20 p-3"><Input label="First Visit Date" type="date" bind:value={formData.first_visit_date} disabled={saving} /><p class="mt-2 text-xs text-muted-foreground">Usually filled automatically from Sunday or meeting attendance. Use this only for an earlier visit already known.</p></div>
        </div>
        {#if !restrictedLeader}<label class="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-3"><input type="checkbox" bind:checked={formData.converted} disabled={saving} class="mt-0.5 h-4 w-4 rounded" /><span class="flex-1"><span class="block text-sm font-medium text-foreground">Promote to member</span><span class="text-xs text-muted-foreground">Use only when this person has joined the church.</span></span></label>
        {#if formData.converted}<Input label="Membership Date" type="date" bind:value={formData.conversion_date} disabled={saving} />{/if}{/if}
        {#if confidential}<div><label for="evangelism-notes" class="mb-1.5 block text-sm font-medium text-foreground">Notes</label><textarea id="evangelism-notes" bind:value={formData.notes} rows="3" disabled={saving} placeholder="Useful context for the follow-up leader..." class="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"></textarea></div>{/if}
      </div>
    </details>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => isOpen = false} disabled={saving}>Cancel</Button>
    <Button onclick={handleSubmit} loading={saving}>{mode === "edit" ? "Save changes" : "Add contact"}</Button>
  {/snippet}
</Modal>
