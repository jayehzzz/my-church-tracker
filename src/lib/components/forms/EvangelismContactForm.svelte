<script>
  import { Modal, Button, Input, SearchableSelect } from "$lib/components/ui";
  import { session } from "$lib/auth/session.js";
  const restrictedLeader = $derived($session.status !== "demo" && $session.user?.role === "leader");
  const confidential = $derived($session.status === "demo" || $session.user?.canViewConfidential === true);
  import { personOption, personOptions } from "$lib/utils/personOptions.js";
  import { browser } from "$app/environment";

  let { isOpen = $bindable(false), contact = null, onsave, ...restProps } = $props();

  let people = $state([]);
  let loadingPeople = $state(true);
  let saving = $state(false);
  let errors = $state({});
  let showMoreDetails = $state(false);
  let formData = $state(emptyForm());
  let sharedCreditIds = $state([]);
  let creditToAdd = $state("");
  let hasLoadedPeople = $state(false);
  let responseBeforeDnc = $state("not_assessed");
  let responseBeforeChurch = $state("not_assessed");

  const mode = $derived(contact?.id || contact?._id ? "edit" : "create");
  const canScheduleContact = $derived((restrictedLeader || Boolean(formData.assigned_leader_id))
    && !["do_not_contact", "has_church"].includes(formData.response));
  const modalTitle = $derived(mode === "edit" ? "Edit evangelism contact" : "Add evangelism contact");
  const peopleOptions = $derived(() => [
    { value: "", label: "Select inviter..." },
    ...personOptions(people),
  ]);
  const leaderOptions = $derived(() => [
    { value: "", label: "Assign later" },
    ...people.filter((person) => person.member_status === "leader").map((person) => ({
      value: person.id || person._id,
      label: `${person.first_name} ${person.last_name || ""}`.trim(),
    })),
  ]);
  const sharedCreditOptions = $derived(() => [
    { value: "", label: "Add a person..." },
    ...personOptions(people.filter((person) => {
      const id = String(person.id || person._id || "");
      return id && id !== String(contact?.id || contact?._id || "") && !sharedCreditIds.includes(id);
    })),
  ]);
  const sharedCreditPeople = $derived(() => sharedCreditIds
    .map((id) => people.find((person) => String(person.id || person._id) === String(id)))
    .filter(Boolean));

  const contactMethodOptions = [
    { value: "", label: "Not recorded" },
    { value: "in_person", label: "In person" },
    { value: "phone", label: "Phone call" },
    { value: "text", label: "Text message" },
    { value: "social_media", label: "Social media" },
    { value: "event", label: "Church event" },
    { value: "other", label: "Other" },
  ];

  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function emptyForm() {
    return {
      first_name: "", last_name: "", phone: "", email: "", address: "",
      contact_date: today(), contact_method: "",
      response: "not_assessed", collected_by_id: "", invited_by_id: "", assigned_leader_id: "",
      follow_up_date: "", first_visit_date: "", outreach_salvation_decision: false,
      outreach_salvation_date: "", outreach_salvation_source: "",
      notes: "",
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
    creditToAdd = "";
    sharedCreditIds = contact
      ? [...new Set((contact.collector_ids?.length ? contact.collector_ids : contact.collected_by_id ? [contact.collected_by_id] : []).map(String))]
      : [];
    formData = contact ? {
      ...emptyForm(),
      first_name: contact.first_name || "", last_name: contact.last_name || "",
      phone: contact.phone || "", email: contact.email || "", address: contact.address || "",
      contact_date: contact.contact_date || today(),
      contact_method: contact.contact_method || "",
      response: contact.response || contact.contact_category || "not_assessed",
      collected_by_id: contact.collected_by_id || "",
      invited_by_id: contact.invited_by_id || "",
      assigned_leader_id: contact.assigned_leader_id || "",
      follow_up_date: contact.follow_up_date || "",
      first_visit_date: contact.first_visit_date || "",
      outreach_salvation_decision: Boolean(contact.outreach_salvation_decision ?? contact.salvation_decision),
      outreach_salvation_date: contact.outreach_salvation_date
        || ((contact.outreach_salvation_decision ?? contact.salvation_decision) ? contact.contact_date : ""),
      outreach_salvation_source: contact.outreach_salvation_source
        || (contact.outreach_salvation_decision === undefined && contact.salvation_decision ? "legacy_salvation_decision" : ""),
      notes: contact.notes || "",
    } : emptyForm();
    const previousCategory = [contact?.response, contact?.contact_category]
      .find((value) => value && value !== "do_not_contact") || "not_assessed";
    responseBeforeDnc = previousCategory;
    responseBeforeChurch = previousCategory === "has_church" ? "not_assessed" : previousCategory;
  });

  function toggleDoNotContact(checked) {
    if (checked) {
      responseBeforeDnc = formData.response;
      formData.response = "do_not_contact";
    } else {
      formData.response = responseBeforeDnc;
    }
  }

  function toggleHasChurch(checked) {
    if (checked) {
      responseBeforeChurch = formData.response;
      formData.response = "has_church";
    } else {
      formData.response = responseBeforeChurch;
    }
  }

  function addSharedCredit(event) {
    const id = String(event?.value || "");
    if (id && !sharedCreditIds.includes(id)) sharedCreditIds = [...sharedCreditIds, id];
    creditToAdd = "";
  }

  function removeSharedCredit(id) {
    sharedCreditIds = sharedCreditIds.filter((value) => value !== String(id));
  }

  function validate() {
    const nextErrors = {};
    if (!formData.first_name.trim()) nextErrors.first_name = "First name is required";
    if (!formData.contact_date) nextErrors.contact_date = "Contact date is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Enter a valid email address";
    }
    if (formData.outreach_salvation_decision && !formData.outreach_salvation_date) {
      formData.outreach_salvation_date = formData.contact_date;
    }
    if (nextErrors.email) showMoreDetails = true;
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
      if (!canScheduleContact) delete cleanData.follow_up_date;
      if (cleanData.outreach_salvation_decision) {
        cleanData.outreach_salvation_date ||= cleanData.contact_date;
        cleanData.outreach_salvation_source ||= "evangelism_outreach";
      } else {
        delete cleanData.outreach_salvation_date;
        delete cleanData.outreach_salvation_source;
      }
      if (!confidential) delete cleanData.notes;
      if (restrictedLeader) {
        delete cleanData.assigned_leader_id;
        delete cleanData.collected_by_id;
        delete cleanData.invited_by_id;
      } else {
        cleanData.collector_ids = sharedCreditIds;
        cleanData.collected_by_id = sharedCreditIds[0] || null;
      }
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === "" || cleanData[key] === null) delete cleanData[key];
      });
      if (mode === "edit") {
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
      <div><h3 id="contact-identity-title" class="text-sm font-semibold text-foreground">Contact details</h3><p class="mt-1 text-xs text-muted-foreground">Record who you met and how to reach them.</p></div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="First Name" bind:value={formData.first_name} error={errors.first_name} required disabled={saving} />
        <Input label="Last Name" bind:value={formData.last_name} disabled={saving} />
        <Input label="Phone" type="tel" bind:value={formData.phone} disabled={saving} />
        <Input label="Contact Date" type="date" bind:value={formData.contact_date} error={errors.contact_date} required disabled={saving} />
      </div>
    </section>

    <section class="space-y-4 rounded-xl border border-border bg-secondary/15 p-4" aria-labelledby="outreach-title">
      <div><h3 id="outreach-title" class="text-sm font-semibold text-foreground">Outreach and follow-up</h3><p class="mt-1 text-xs text-muted-foreground">Record who reached this person and who will contact them next.</p></div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {#if !restrictedLeader}
        <div class="sm:col-span-2 rounded-lg border border-border bg-card p-3">
          <SearchableSelect membersFirst label="Who reached them" bind:value={creditToAdd} options={sharedCreditOptions()} onchange={addSharedCredit} disabled={saving || loadingPeople} placeholder="Add a person..." />
          {#if sharedCreditPeople().length}
            <div class="mt-3 flex flex-wrap gap-2">
              {#each sharedCreditPeople() as person (person.id || person._id)}
                <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {personOption(person).label}
                  <button type="button" class="rounded-full px-1 hover:bg-primary/15" aria-label="Remove {person.first_name} {person.last_name || ''} from shared credit" onclick={() => removeSharedCredit(person.id || person._id)}>×</button>
                </span>
              {/each}
            </div>
          {/if}
          <p class="mt-2 text-xs text-muted-foreground">Add every person who shared the invitation or outreach. The assigned worker is recorded separately.</p>
        </div>
        {/if}
        {#if mode === "create"}
          {#if !restrictedLeader}<SearchableSelect label="Assigned worker" bind:value={formData.assigned_leader_id} options={leaderOptions()} disabled={saving || loadingPeople} placeholder="Choose a leader..." />{/if}
          {#if canScheduleContact}<Input label="Next contact date" type="date" min={formData.contact_date} bind:value={formData.follow_up_date} disabled={saving} />{/if}
        {/if}
      </div>
      {#if mode === "create"}
        <p class="text-xs text-muted-foreground">{restrictedLeader ? "New contacts are assigned to you. Contacts who request no contact or already have a church receive no automatic call task." : "Choosing a worker creates an initial call task, unless the person requests no contact or already has a church. Leave unassigned to choose a worker later in Follow-Up."}</p>
      {:else}
        <p class="text-xs text-muted-foreground">Change the assigned worker and next contact date in Follow-Up. Update the Contact Date when you meet this person again. <a href="/pipeline" class="font-medium text-primary hover:underline">Go to Follow-Up</a></p>
      {/if}
    </section>

    <label class="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"><input type="checkbox" checked={formData.response === "do_not_contact"} onchange={(event) => toggleDoNotContact(event.currentTarget.checked)} disabled={saving} class="mt-0.5 h-4 w-4 rounded" /><span><span class="block text-sm font-semibold text-foreground">Do not contact</span><span class="text-xs text-muted-foreground">They have asked not to be contacted. Pending outreach calls are cancelled and new outreach is prevented.</span></span></label>

    <details bind:open={showMoreDetails} class="rounded-xl border border-border bg-card">
      <summary class="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/20"><span>Optional details</span></summary>
      <div class="space-y-4 border-t border-border p-4">
        <Input label="Email" type="email" bind:value={formData.email} error={errors.email} disabled={saving} />
        <SearchableSelect label="Contact Method" bind:value={formData.contact_method} options={contactMethodOptions} disabled={saving} />
        {#if !restrictedLeader}<SearchableSelect membersFirst label="Primary Inviter (optional)" bind:value={formData.invited_by_id} options={peopleOptions()} disabled={saving || loadingPeople} placeholder="Search people..." />{/if}
        <label class="flex items-start gap-3 rounded-lg border border-border p-3"><input type="checkbox" checked={formData.response === "has_church" || (formData.response === "do_not_contact" && responseBeforeDnc === "has_church")} onchange={(event) => toggleHasChurch(event.currentTarget.checked)} disabled={saving || formData.response === "do_not_contact"} class="mt-0.5 h-4 w-4 rounded" /><span><span class="block text-sm font-medium text-foreground">Has another church</span><span class="text-xs text-muted-foreground">Optional context. No automatic initial call is created for someone who already has a church.</span></span></label>
        <Input label="Address" bind:value={formData.address} disabled={saving} />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-border bg-secondary/20 p-3">
            <label class="flex items-start gap-3"><input type="checkbox" bind:checked={formData.outreach_salvation_decision} disabled={saving} class="mt-0.5 h-4 w-4 rounded" /><span><span class="block text-sm font-medium text-foreground">Saved on outreach</span><span class="text-xs text-muted-foreground">They prayed to receive Christ during evangelism outreach.</span></span></label>
            {#if formData.outreach_salvation_decision}<div class="mt-3"><Input label="Outreach Salvation Date" type="date" bind:value={formData.outreach_salvation_date} disabled={saving} /></div>{/if}
          </div>
          <div class="rounded-lg border border-border bg-secondary/20 p-3"><Input label="First Visit Date" type="date" bind:value={formData.first_visit_date} disabled={saving} /><p class="mt-2 text-xs text-muted-foreground">Usually filled automatically from Sunday or meeting attendance. Use this only for an earlier visit already known.</p></div>
        </div>
        {#if ["member", "leader"].includes(contact?.member_status)}
          <p class="text-sm text-muted-foreground">Membership is recorded{contact.membership_date ? ` from ${contact.membership_date}` : ""}.</p>
        {/if}
        {#if mode === "edit"}<a class="inline-block text-sm font-medium text-primary hover:underline" href={`/people/${contact.id || contact._id}`}>View People profile — membership is managed in People</a>{/if}
        {#if confidential}<div><label for="evangelism-notes" class="mb-1.5 block text-sm font-medium text-foreground">Notes</label><textarea id="evangelism-notes" bind:value={formData.notes} rows="3" disabled={saving} placeholder="Useful context for the follow-up leader..." class="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"></textarea></div>{/if}
      </div>
    </details>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => isOpen = false} disabled={saving}>Cancel</Button>
    <Button onclick={handleSubmit} loading={saving}>{mode === "edit" ? "Save changes" : "Add contact"}</Button>
  {/snippet}
</Modal>
