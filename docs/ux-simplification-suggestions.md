# UX Simplification Suggestions

> **Date**: January 10, 2026  
> **Status**: Proposal — awaiting review

This document outlines recommendations to reduce information overload across the application. The goal is to make each page more focused on its primary task.

---

## Guiding Philosophy

All UX decisions should align with the [Design Philosophy](./00-design-philosophy.md), which establishes seven core principles:

| Principle | Description |
|-----------|-------------|
| **Click = Action** | Every clickable element opens a modal, navigates, or expands |
| **Edit Anywhere** | Users should never be stuck in read-only mode |
| **Smooth Transitions** | Professional animations on all state changes |
| **Linked Entities** | Related data (names, services, etc.) should be clickable links |
| **Depth Over Breadth** | Allow drilling down through connected data |
| **Progressive Disclosure** | Condense initial views; smart expand, filter, and search |
| **Instant Reactivity** | UI responds immediately; optimistic updates, live filtering |

When simplifying pages, ensure removed elements don't break these principles. For example:
- Removing a KPI card is fine if the data is still accessible elsewhere
- Keeping inline edit capability is more important than reducing visual clutter
- Any displayed entity reference should remain clickable
- **Condensed views must have clear expansion paths** (accordions, "View More", tabs)
- **Filtering and search should always be available** on data-heavy pages

See also: [Design Philosophy Audit](./design-philosophy-audit.md) for current implementation gaps.

---

## General Observations

- **Template Fatigue**: Almost every page uses the same layout (4 KPI cards → charts → filters → table). This consistency is good for development, but creates "information fatigue" for users.
- **Vertical Waste**: The top section (Header + KPIs + Filters) takes up ~40% of the viewport. On laptop screens, users must scroll to see the first row of data.
- **Redundancy**: The global year filter appears in the top nav, but is also repeated as text ("Year 2025") in multiple places per page.

---

## Page-by-Page Recommendations

### 1. Dashboard (Home Page)

**Current State**: 4 KPI cards, Attendance Trend chart, Recent Activity list.

| Element | Recommendation |
|---------|----------------|
| KPI Cards | ✅ Keep all 4 (Total Members, Weekly Attendance, New Visitors, Retention Rate) |
| Attendance Chart | ✅ Keep |
| Recent Activity | ✅ Keep |

**Summary**: No changes needed. This is the analytics hub.

---

### 2. People Directory

**Current State**: 4 KPI cards, 2 charts (Growth Timeline, Role Distribution), View Toggle, 3 Filters, Search, Data Table, Quick View Cards.

| Element | Current | Recommendation |
|---------|---------|----------------|
| Total People | KPI Card | 🔶 Move to inline count next to search: "32 people" |
| New (Last 30 Days) | KPI Card | ❌ Remove — duplicates Dashboard |
| Active Leaders | KPI Card | ❌ Remove — duplicates Dashboard |
| Inactive/Archived | KPI Card | ❌ Remove — this is a filter, not a metric |
| Growth Timeline | Chart | ❌ Remove — belongs on Dashboard |
| Role Distribution | Chart | ❌ Remove — belongs on Dashboard |
| Quick View Cards | Grid | 🔶 Consider removing — redundant with table |

**Suggested Layout**:
```
[Page Title]        [Add Person Button]
[View Toggle: List | Map]
[Filters: Status | Role | Activity]   [Search]   "32 people"
[Data Table]
```

---

### 3. Evangelism Contacts

**Current State**: 4 KPI cards, View Toggle (List/Dashboard), multiple charts in Dashboard view, Data Table.

| Element | Current | Recommendation |
|---------|---------|----------------|
| Total Contacts | KPI Card | 🔶 Move to inline count |
| Active Leads | KPI Card | ❌ Remove — not actionable |
| Conversions | KPI Card | ✅ Keep — this is THE goal |
| Membership Join Rate | KPI Card | ❌ Remove — shows "NaN" when data is missing |
| Charts | Dashboard tab | ✅ Keep on Dashboard tab only |

**Suggested Layout (List View)**:
```
[Page Title]        [Add Contact Button]
[View Toggle: Contact List | Dashboard]
[Filters: Category | Inviter | Status]   [Search]   "38 contacts • 12 conversions"
[Data Table]
```

---

### 4. Sunday Services

**Current State**: View Toggle (List/Dashboard), filters, search, Data Table. KPIs only appear on Dashboard view.

| Element | Recommendation |
|---------|----------------|
| View Toggle | ✅ Keep — good separation of concerns |
| List View | ✅ Keep as table-only |
| Dashboard View | ✅ Keep with KPIs and charts |

**Summary**: This page is already well-structured. No changes needed.

---

### 5. Visitation

**Current State**: 4 KPI cards, Visitation Calendar, Priority Queue, filters, Data Table, Recent Visits list.

| Element | Current | Recommendation |
|---------|---------|----------------|
| Guests Needing Visit | KPI Card | ✅ Keep — actionable ("Who should I visit?") |
| Visits in Period | KPI Card | 🔶 Consider removing — less actionable |
| Visitation Rate | KPI Card | ❌ Remove — abstract percentage, confusing |
| Pending Follow-ups | KPI Card | ✅ Keep — actionable ("What do I need to do?") |
| Visitation Calendar | Chart | ✅ Keep — useful visual |
| Priority Queue | Section | ✅ Keep — highly actionable |
| Recent Visits | List | 🔶 Consider removing — redundant with table |

**Suggested Layout**:
```
[Page Title]        [Log Visit Button]
[2 KPI Cards: Guests Needing Visit | Pending Follow-ups]
[Priority Queue: 3 guest cards needing visits]
[Visitation Calendar]
[Filters]   [Search]   "5 visits"
[Data Table]
```

---

## Flow Improvements

### Post-Creation Feedback

**Issue**: After adding a person, the modal closes but the user is left stranded. They must search or scroll to find the new entry.

**Recommendations**:
1. Auto-redirect to the new person's profile page after creation.
2. OR show a toast notification with a "View Profile" link.
3. OR scroll the table to highlight the new row.

### Search "No Data" Flash

**Issue**: When using the search bar, a brief "No data available" message flashes before results appear.

**Recommendation**: Add a debounce or loading state to prevent the empty state from appearing prematurely.

---

## Summary Table

| Page | Current KPIs | Suggested KPIs | Current Charts | Suggested Charts |
|------|--------------|----------------|----------------|------------------|
| Dashboard | 4 | 4 | 2 | 2 |
| People | 4 | 0 (inline count) | 2 | 0 |
| Evangelism | 4 | 1 (Conversions) | Many | Keep on Dashboard tab |
| Services | Variable | No change | Variable | No change |
| Visitation | 4 | 2 | 1 | 1 |

---

## Next Steps

- [ ] Review and approve/modify suggestions
- [ ] Prioritize which pages to simplify first
- [ ] Implement changes incrementally
