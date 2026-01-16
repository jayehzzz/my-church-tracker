# Contact Profile Design Critique

## Overview
This document evaluates the current implementation of the Contact Profile (`src/routes/people/[id]/+page.svelte`) against the core principles defined in `00-design-philosophy.md`.

## Summary Findings
The current profile page is visually structured but functionally static. It fails to meet the "Interactive System" standard, behaving more like a read-only paper form than a connected digital application.

### Scorecard

| Principle | Status | Notes |
|-----------|--------|-------|
| **1. Click = Action** | 🔴 Critical | Most data points (KPIs, demographics, lists) are non-interactive static text. |
| **2. Edit Anywhere** | 🟠 Needs Work | Only member/activity status is editable. No edit options for personal details. |
| **3. Smooth Transitions** | 🟡 Partial | Some entry animations exist, but lack of route transitions for drill-downs. |
| **4. Linked Entities** | 🔴 Critical | References to other people (Invited By), Services, and Visits are dead text. |
| **5. Depth Over Breadth** | 🟡 Partial | Cards are used, but drill-down capability is missing. |
| **6. Progressive Disclosure** | 🟢 Good | Notes and conditional cards handle clutter well. |
| **7. Instant Reactivity** | 🟡 Partial | Status updates work, but lack optimistic UI patterns for other potential actions. |

## Detailed Issues

### 1. Dead Data (Violation of "Click = Action")
*   **KPI Cards:** The stats grid (Total Attendance, Prayer Activity) are static cards. Users expect to click "4 services" to see *which* 4 services.
*   **Lists:** Attendance and Outreach tables are read-only. Clicking a row does nothing.
*   **Demographics:** Address, Email, Phone are static. No way to click to copy, or click to edit.

### 2. Missing Connections (Violation of "Linked Entities")
*   **"Invited By: John Doe"**: This is rendered as plain text. It must be a link to `/people/[john-doe-id]`.
*   **"Visited By: Grace Mensah"**: Plain text. Should link to Grace's profile.
*   **Service History**: Service types/dates are text. Should open a Service Detail modal.

### 3. Editability Gaps (Violation of "Edit Anywhere")
*   **Profile Details:** There is no "Edit Profile" button. A user cannot correct a typo in the name, phone number, or address.
*   **Notes:** Read-only.

### 4. Code Structure & Visuals
*   **Monolithic Component:** The file is ~2200 lines long, making it hard to maintain.
*   **Inline Icons:** Hundreds of lines of inline SVGs clutter the logic.
*   **Inconsistent Components:** Custom dropdown logic (`showStatusDropdown`) is used instead of a reusable `<Dropdown>` component, leading to potential inconsistency and maintenance burden.

## Recommendations

1.  **Refactor into Components:** Split the page into `ProfileHeader`, `StatsGrid`, `AttendanceHistory`, `OutreachHistory`, `ProfileDetails`.
2.  **link-ify Entities:** Wrap all entity references in `<a>` tags.
3.  **Add Edit Actions:** Introduce an "Edit Details" modal or inline edit capabilities for demographics.
4.  **Interactive Lists:** Make table rows clickable to view details.
5.  **Standardize UI:** Replace custom inline dropdowns with the project's standard `Dropdown/Select` components.
