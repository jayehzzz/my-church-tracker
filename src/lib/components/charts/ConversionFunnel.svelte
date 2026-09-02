<!--
  Conversion Funnel Chart Component
  Displays an easy-to-follow visual conversion journey:
  Stage 1: Reached Contacts → Stage 2: Spiritual Milestones (Salvation / Attended) → Stage 3: Full Church Membership
  
  Props:
    - data: Object with { contacts, attended, saved, joined } counts
    - title: Optional chart title
-->

<script>
    /** @type {{ contacts: number, attended: number, saved: number, joined: number }} */
    let {
        data = { contacts: 0, attended: 0, saved: 0, joined: 0 },
        title = "Conversion Journey",
    } = $props();

    // Calculate percentages relative to contacts
    const max = $derived(Math.max(data.contacts, 1)); // Prevent division by zero

    const stats = $derived({
        contacts: {
            value: data.contacts,
            percentage: 100,
            color: "bg-blue-500",
            textColor: "text-blue-500",
            bgLight: "bg-blue-500/10",
            borderColor: "border-blue-500/30",
            label: "1. Outreach Contacts",
            desc: "People reached through evangelism",
        },
        saved: {
            value: data.saved,
            percentage: Math.round((data.saved / max) * 100),
            color: "bg-amber-500",
            textColor: "text-amber-500",
            bgLight: "bg-amber-500/10",
            borderColor: "border-amber-500/30",
            label: "Salvation Decision",
            desc: "Made faith decision / prayed for salvation",
        },
        attended: {
            value: data.attended,
            percentage: Math.round((data.attended / max) * 100),
            color: "bg-purple-500",
            textColor: "text-purple-500",
            bgLight: "bg-purple-500/10",
            borderColor: "border-purple-500/30",
            label: "Attended Service",
            desc: "Visited a Sunday service or church meeting",
        },
        joined: {
            value: data.joined,
            percentage: Math.round((data.joined / max) * 100),
            color: "bg-emerald-500",
            textColor: "text-emerald-500",
            bgLight: "bg-emerald-500/10",
            borderColor: "border-emerald-500/30",
            label: "3. Church Members",
            desc: "Converted & added to church directory",
        },
    });

    const conversionRate = $derived(
        data.contacts > 0 ? Math.round((data.joined / data.contacts) * 100) : 0
    );
</script>

<div class="card-base p-5">
    {#if title}
        <div class="flex items-center justify-between mb-5">
            <div>
                <h3 class="text-base font-semibold text-foreground">{title}</h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                    Path from initial outreach contact to church membership
                </p>
            </div>
            <div class="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
                <span class="text-xs text-muted-foreground">Join Rate:</span>
                <span class="text-sm font-bold text-primary">{conversionRate}%</span>
            </div>
        </div>
    {/if}

    <div class="space-y-3">
        <!-- STAGE 1: Contacts Reached -->
        <div class="p-4 rounded-xl border {stats.contacts.borderColor} {stats.contacts.bgLight} transition-all">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-sm">
                        1
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-sm text-foreground">Outreach Contacts</span>
                            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                100% Baseline
                            </span>
                        </div>
                        <p class="text-xs text-muted-foreground">{stats.contacts.desc}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-2xl font-bold text-foreground">{stats.contacts.value}</span>
                    <span class="text-xs text-muted-foreground ml-1">people</span>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full h-2.5 bg-background/60 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full w-full"></div>
            </div>
        </div>

        <!-- CONNECTOR 1 -->
        <div class="flex items-center justify-center gap-2 py-0.5">
            <div class="h-5 w-0.5 bg-border/80"></div>
            <span class="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                Follow-up & Engagement
            </span>
            <div class="h-5 w-0.5 bg-border/80"></div>
        </div>

        <!-- STAGE 2: Milestones (Flexible Order) -->
        <div class="p-4 rounded-xl border border-dashed border-border/80 bg-secondary/10 relative">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-secondary text-foreground flex items-center justify-center font-bold text-xs">
                        2
                    </div>
                    <span class="font-semibold text-sm text-foreground">Spiritual Milestones</span>
                </div>
                <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80 bg-background/80 px-2.5 py-1 rounded-md border border-border/50">
                    Achieved in any order
                </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- Milestone A: Salvation Decision -->
                <div class="p-3 rounded-lg border {stats.saved.borderColor} {stats.saved.bgLight} bg-card/60">
                    <div class="flex items-center justify-between mb-1.5">
                        <div class="flex items-center gap-2">
                            <span class="text-base">💛</span>
                            <span class="text-xs font-semibold text-foreground">{stats.saved.label}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-base font-bold text-amber-500">{stats.saved.value}</span>
                            <span class="text-[11px] text-muted-foreground">({stats.saved.percentage}%)</span>
                        </div>
                    </div>
                    <p class="text-[11px] text-muted-foreground mb-2">{stats.saved.desc}</p>
                    <div class="w-full h-2 bg-background/60 rounded-full overflow-hidden">
                        <div
                            class="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out"
                            style="width: {stats.saved.percentage}%"
                        ></div>
                    </div>
                </div>

                <!-- Milestone B: Attended Service -->
                <div class="p-3 rounded-lg border {stats.attended.borderColor} {stats.attended.bgLight} bg-card/60">
                    <div class="flex items-center justify-between mb-1.5">
                        <div class="flex items-center gap-2">
                            <span class="text-base">💜</span>
                            <span class="text-xs font-semibold text-foreground">{stats.attended.label}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-base font-bold text-purple-500">{stats.attended.value}</span>
                            <span class="text-[11px] text-muted-foreground">({stats.attended.percentage}%)</span>
                        </div>
                    </div>
                    <p class="text-[11px] text-muted-foreground mb-2">{stats.attended.desc}</p>
                    <div class="w-full h-2 bg-background/60 rounded-full overflow-hidden">
                        <div
                            class="h-full bg-purple-500 rounded-full transition-all duration-700 ease-out"
                            style="width: {stats.attended.percentage}%"
                        ></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CONNECTOR 2 -->
        <div class="flex items-center justify-center gap-2 py-0.5">
            <div class="h-5 w-0.5 bg-border/80"></div>
            <span class="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                Integration & Growth
            </span>
            <div class="h-5 w-0.5 bg-border/80"></div>
        </div>

        <!-- STAGE 3: Joined Church (Goal) -->
        <div class="p-4 rounded-xl border {stats.joined.borderColor} {stats.joined.bgLight} transition-all">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-sm">
                        3
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-sm text-foreground">Converted to Members</span>
                            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                Goal Completed
                            </span>
                        </div>
                        <p class="text-xs text-muted-foreground">{stats.joined.desc}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-2xl font-bold text-emerald-500">{stats.joined.value}</span>
                    <span class="text-xs font-semibold text-muted-foreground ml-1">({stats.joined.percentage}%)</span>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full h-2.5 bg-background/60 rounded-full overflow-hidden">
                <div
                    class="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                    style="width: {stats.joined.percentage}%"
                ></div>
            </div>
        </div>
    </div>

    <!-- Summary Footer -->
    <div class="mt-4 pt-3.5 border-t border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-4 text-muted-foreground">
            <span>👥 Contacts: <strong class="text-foreground">{data.contacts}</strong></span>
            <span>💛 Saved: <strong class="text-foreground">{data.saved}</strong></span>
            <span>💜 Visited: <strong class="text-foreground">{data.attended}</strong></span>
            <span>💚 Joined: <strong class="text-foreground">{data.joined}</strong></span>
        </div>
        <div class="flex items-center gap-2 font-medium">
            <span class="text-muted-foreground">Final Conversion:</span>
            <span class="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-sm">
                {conversionRate}%
            </span>
        </div>
    </div>
</div>
