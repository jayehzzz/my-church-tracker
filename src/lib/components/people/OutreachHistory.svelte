<script>
    import { Card, Badge } from "$lib/components/ui";

    let { outreachContacts } = $props();

    function formatShortDate(dateStr) {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
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
</script>

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
                            <th class="pb-2 font-medium text-muted-foreground"
                                >Name</th
                            >
                            <th class="pb-2 font-medium text-muted-foreground"
                                >Date</th
                            >
                            <th class="pb-2 font-medium text-muted-foreground"
                                >Result</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        {#each outreachContacts as contact}
                            <tr
                                class="group hover:bg-muted/50 transition-colors"
                            >
                                <td class="py-2 font-medium">
                                    <a
                                        href="/people/{contact.id}"
                                        class="text-foreground hover:text-primary hover:underline block"
                                    >
                                        {contact.first_name}
                                        {contact.last_name || ""}
                                    </a>
                                </td>
                                <td class="py-2 text-muted-foreground">
                                    {formatShortDate(contact.contact_date)}
                                </td>
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
