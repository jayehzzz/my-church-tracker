# Design Philosophy Audit

> **Date**: January 10, 2026  
> **Purpose**: Identify gaps where the current implementation doesn't align with the [Design Philosophy](./00-design-philosophy.md).

---

## Audit Summary

| Principle | Current Status | Gap Count |
|-----------|----------------|-----------|
| Click = Action | ⚠️ Partial | 8 gaps |
| Edit Anywhere | ⚠️ Partial | 5 gaps |
| Smooth Transitions | ✅ Good | 2 minor gaps |
| Linked Entities | ⚠️ Needs Work | 7 gaps |
| Depth Over Breadth | ⚠️ Partial | 4 gaps |
| Progressive Disclosure | ⚠️ Partial | 3 gaps |
| Instant Reactivity | ⚠️ Needs Work | 5 gaps |

---

## Detailed Findings

### 1. Click = Action Gaps

| Location | Element | Current Behavior | Expected Behavior | Priority |
|----------|---------|------------------|-------------------|----------|
| **People Table** | Row click | ✅ Navigates to profile | — | — |
| **Services Table** | Type badge | Static display | Click → filter table to that type | Medium |
| **Services Table** | Speaker name | Static text | Click → opens speaker profile if linked | High |
| **Evangelism Table** | Category badge | Static display | Click → filter by category | Medium |
| **Evangelism Table** | Conversion stats | Static "X conversions" text | Click → show conversion details modal | Low |
| **Visitation Table** | Outcome badge | Static display | Click → filter by outcome | Medium |
| **Visitation Table** | "Visited by" name | Static text | Click → navigate to that person's profile | High |
| **Dashboard KPIs** | All KPI cards | Static display | Click → navigate to relevant page OR show breakdown | High |
| **Profile Page** | Attendance service name | Static text | Click → opens service detail modal | High |

---

### 2. Edit Anywhere Gaps

| Location | Issue | Current State | Suggested Fix | Priority |
|----------|-------|---------------|---------------|----------|
| **Profile Page** | No inline status edit | Must use dropdown only | Status badge should be clickable dropdown ✅ (implemented) | — |
| **Service Detail Modal** | No attendance edit | Read-only attendee list | Add "Edit Attendance" button | Medium |
| **Evangelism Detail Modal** | Missing | No detail modal exists | Create modal with edit capability | High |
| **Visitation Detail Modal** | Missing | No detail modal exists | Create modal with edit capability | High |
| **Table Rows** | No quick edit | Must open modal for all edits | Consider inline edit for simple fields | Low |

---

### 3. Smooth Transitions Gaps

| Location | Issue | Current State | Suggested Fix | Priority |
|----------|-------|---------------|---------------|----------|
| **View Toggle Tabs** | Some pages inconsistent | People/Services/Evangelism recently fixed | Verify all pages use sliding pill/underline | Low |
| **Filter Dropdowns** | No animation | Dropdowns appear instantly | Add `transition-all duration-150 ease-out` | Low |

**Note**: Recent work has significantly improved animation consistency. The sliding pill tabs and staggered animations are now standard.

---

### 4. Linked Entities Gaps (Most Critical)

| Location | Field | Current State | Expected Behavior | Priority |
|----------|-------|---------------|-------------------|----------|
| **Profile Page** | "Invited by: [Name]" | ⚠️ Static text | Clickable → navigates to inviter's profile | **High** |
| **Profile Attendance** | Service name/date | Static text | Clickable → opens service detail modal | **High** |
| **Profile Outreach** | Contact names | Static text | Clickable → navigates to contact's profile | **High** |
| **Profile Visitations** | "Visited by" name | Static text | Clickable → navigates to visitor's profile | **High** |
| **Services Table** | Individual attendees | Clickable avatars | ✅ Opens modal, but names in modal should also link | Medium |
| **Evangelism Table** | "Invited by" column | Avatar only | Name should also be clickable link | Medium |
| **Service Modal Attendees** | Attendee names | Static list | Each name should link to their profile | **High** |

---

### 5. Depth Over Breadth Gaps

| Location | Issue | Current State | Suggested Fix | Priority |
|----------|-------|---------------|---------------|----------|
| **Service Attendee Modal** | Dead end | Shows list, no further drill-down | Each attendee → clickable to profile | High |
| **Dashboard Recent Activity** | Limited depth | Shows text only | Activity items → link to relevant entity | Medium |
| **Evangelism Top Inviters** | Dead end | Shows leaderboard | Each name → link to profile with "invited by me" filter | Medium |
| **Visitation Priority Queue** | Limited | Shows guest cards | "Visit" button should pre-fill form; "Call" should work | Medium |

---

### 6. Progressive Disclosure Gaps

| Location | Issue | Current State | Suggested Fix | Priority |
|----------|---------|---------------|---------------|----------|
| **People Directory** | Fold clutter | 4 large KPIs take up ~30% height | Condense KPIs to inline count | High |
| **Evangelism Dashboard** | Information overload | Many charts visible at once | Use accordions or tabs to hide secondary charts | Medium |
| **Profile Page** | Vertical length | All history tables visible at once | Use tabs for Attendance/Outreach/Visitations | High |

---

### 7. Instant Reactivity Gaps

| Location | Issue | Current State | Suggested Fix | Priority |
|----------|---------|---------------|---------------|----------|
| **Search Bars** | Flashy empty state | "No data" flashes during search | Add debounce and loading state | Medium |
| **Form Submission** | Static transition | Modal closes abruptly on success | Add success toast + smooth modal exit | High |
| **Status Updates** | Backend wait | UI waits for server to confirm | Implement optimistic updates | Medium |
| **Table Filters** | Jarring refresh | Data "pops" into view | Add staggered fade-in for filtered rows | Low |
| **Navigation** | No progress indicator | Pages load without feedback | Add top-bar loading progress for slow routes | Medium |

---

## Prioritized Recommendations

### Phase 1: High Impact (Linked Entities)

These changes will most dramatically improve the "connected knowledge graph" feel:

1. **Profile Page Linked Names**
   - Make "Invited by: [Name]" clickable
   - Make attendance history service names clickable (opens service modal)
   - Make outreach contact names clickable
   - Make "Visited by" names clickable

2. **Service Modal Attendee Links**
   - Each attendee name in the popup should navigate to their profile

3. **Create Detail Modals**
   - Evangelism Contact Detail Modal
   - Visitation Detail Modal

### Phase 2: Improved Editability

4. **Service Attendance Editing**
   - Add ability to edit who attended from within the modal

5. **Quick Status Filters**
   - Clicking status/category badges should filter the table

### Phase 3: Polish

6. **Dropdown Animations**
   - Add smooth transitions to all filter dropdowns

7. **Dashboard KPI Click-through**
   - Make KPI cards navigate to their relevant pages

---

## Implementation Effort Estimates

| Change | Effort | Files Affected |
|--------|--------|----------------|
| Profile linked names | Small | `[id]/+page.svelte` |
| Service modal attendee links | Small | `services/+page.svelte` |
| Evangelism detail modal | Medium | New component + page update |
| Visitation detail modal | Medium | New component + page update |
| Badge filter clicks | Small | All table pages |
| Dropdown animations | Small | CSS/component updates |
| Dashboard KPI links | Small | `+page.svelte` (dashboard) |

---

## Next Steps

- [ ] Review audit findings with stakeholder
- [ ] Prioritize which gaps to address first
- [ ] Create implementation tickets for Phase 1 items
