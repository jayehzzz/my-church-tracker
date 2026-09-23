# Chart components

This guide describes the chart components currently used by the frontend. Chart source is in `src/lib/components/charts/`; dashboard cards are in `src/lib/components/dashboard/`. The route and component callers below are the best examples of how to supply real data.

## Active chart index

| Component | Current caller | Purpose |
|---|---|---|
| `AttendanceTrend.svelte` | Home and Services | Attendance over time, with line/bar and metric comparison controls |
| `OutreachTrend.svelte` | `EvangelismInsights.svelte` | Monthly outreach contacts and outcomes |
| `EngagementRadar.svelte` | `EngagementRadarSection.svelte` | A person's recorded attendance rhythm |
| `VisitationCalendar.svelte` | Visitation | Calendar of pastoral care visits |
| `WeeklyAttendanceMatrix.svelte` | Services | Person by person Sunday attendance |
| `MeetingBarChart.svelte` | Meetings | Meeting programme metrics |
| `MeetingAttendanceComparison.svelte` | Meetings | Meeting attendance over time |
| `MeetingPeopleComposition.svelte` | Meetings | Unique people by attendance experience |
| `MetricComparison.svelte` | Reports, Services, People, Development, Evangelism, and other chart components | Selectable totals and applicable averages |

`ComparisonControls.svelte`, `ChartViewToggle.svelte`, and `ChartPointDetails.svelte` are shared chart controls/details used by the active components; they are not standalone data charts.

## Data and props

- **`AttendanceTrend`** takes `data` rows with `date` and `total` (plus optional metric keys such as `guests`, `firstTimers`, and `decisions`). Its other props are `title`, `itemLabel`, `periodLabel`, `comparisonOptions` (`{ key, label, color }` entries), `wholeNumberValues`, `onPointClick`, `onFilterClick`, and `activeFilterCount`. The home and Services routes show current calls. It manages line/bar view, time grouping, and total/average selection internally; it has no `height`, `showLabels`, or `showTrend` prop.
- **`OutreachTrend`** takes monthly `data`, `periodRange`, `periodLabel`, `title`, `subtitle`, `comparisonOptions`, and `onPointClick`. Rows use `year`, `month`, and `count`, with matching keys for selected outcomes (for example `saved`, `visited`, `joined`). `EvangelismInsights.svelte` supplies these values and the reporting range. The component fills missing months in that range.
- **`EngagementRadar`** takes `axes`, `max`, and bindable `selected`. Each axis has a `key`, `label`, `shortLabel`, and recorded `weeks`; detail display also uses `events` and `lastDate`. See `EngagementRadarSection.svelte`. It depicts attendance frequency, not an overall engagement score.
- **`VisitationCalendar`** takes `data` with `visit_date` (`YYYY-MM-DD`), `periodRange`, `title`, and `onVisitSelect(visit)`. The Visitation route passes filtered visits and opens the selected visit. The displayed month is navigated inside the component; there is no `month` or `onDayClick` prop.
- **`WeeklyAttendanceMatrix`** takes `services`, `people`, `commitments`, `commitmentsUnavailable`, `title`, `maxServices`, `initialServiceCount`, `initialPeopleLimit`, and `onServiceClick`. Services supplies Sunday records and people.
- **`MeetingBarChart`** takes `data`, `title`, `subtitle`, `unit`, `periodLabel`, `metricOptions`, `onBarClick`, `onFilterClick`, and `activeFilterCount`. Meetings supplies programme data and selectable measures such as average attendance, total attendance, unique people, and meeting count.
- **`MeetingAttendanceComparison`** takes `series`, `title`, `periodLabel`, `onPointClick`, `onFilterClick`, and `activeFilterCount`. It provides its own line/bar view control.
- **`MeetingPeopleComposition`** takes `data` entries with `label` and `value`, plus `title`, `onSegmentClick`, `onFilterClick`, and `activeFilterCount`. It delegates its selectable totals to `MetricComparison`.
- **`MetricComparison`** takes `metrics`, `periodLabel`, `onSelect`, and `wholeNumberAverages`. Metrics have `key`, `label`, and `total`; `denominator` and `averageLabel` enable an average. When `onSelect` is omitted, selecting a metric opens its detail panel.

For example, a current attendance call uses the component's actual data keys and optional comparison API:

```svelte
<script>
  import AttendanceTrend from '$lib/components/charts/AttendanceTrend.svelte';
  const rows = [
    { date: '2026-09-06', total: 145, guests: 12 },
    { date: '2026-09-13', total: 152, guests: 15 }
  ];
</script>

<AttendanceTrend
  data={rows}
  title="Attendance trend"
  periodLabel="September 2026"
  comparisonOptions={[{ key: 'guests', label: 'Guest attendances', color: 'warning' }]}
/>
```

## Dashboard companions

`KPICard.svelte` is a metric card used on Home, Reports, and Meetings. It accepts `title`, `value`, `trend` (a numeric percentage or `null`), `trendLabel`, `format` (`number`, `decimal`, `percentage`, or `currency`), `description`, `href`, `icon` (a supported icon name), `variant`, and `suffix`. It does not accept the old `change`, `changeType`, or `sparklineData` props. `RecentActivityList.svelte` accepts `activities`, `title`, `maxItems`, and `showFilters`; Home passes recent activities. `InviterProfilePopup.svelte` is used by Evangelism and accepts bindable `isOpen`, `person`, `contacts`, `periodLabel`, `onClose`, `onViewProfile`, and `onViewContact`.

## Design utilities

Shared SVG helpers live in `src/lib/utils/chartUtils.js`, including `DEFAULT_CHART_DIMENSIONS`, `getNiceYScale`, `getBandCoordinates`, `makeSmoothCurve`, and `makeAreaPath`. Chart implementations use the helpers relevant to their shape; these are not required props or universal rules for every component.

## Retirement note — 22 Sept 2026

The legacy frontend cleanup retires eight unused chart files: `src/lib/components/dashboard/AttendanceChart.svelte` and `src/lib/components/charts/CategoryDonut.svelte`, `GrowthTimeline.svelte`, `LeaderHeatmap.svelte`, `MonthlyContactsBar.svelte`, `PrayerHoursChart.svelte`, `RoleDistribution.svelte`, and `Sparkline.svelte`. Their former usage and API examples have been removed from this guide. Active attendance and outreach charts are `AttendanceTrend.svelte` and `OutreachTrend.svelte`; current meeting and report comparisons use the components indexed above. This is a frontend component retirement and does not delete church records or live data.

Cleanup verification (reported by the implementation owner): all eight chart files were deleted after checking for active references and dynamic consumers. The separate `activitiesService.js` deletion completes the nine-file cleanup. From an initially clean `main` at `ef56155`, 278 unit tests across 52 files, the build, and `git diff --check` passed. The build still reports the existing `visitationsService` mixed-import warning. Changes remain uncommitted; no deployment or backend edits were made, and concurrent unrelated edits were preserved.
