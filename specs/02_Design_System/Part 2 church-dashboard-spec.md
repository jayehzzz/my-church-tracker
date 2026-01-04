# CHURCH TRACKING SYSTEM - DESIGN SPECIFICATION GUIDE
## Detailed UI/UX Requirements for AI Model Implementation

**Last Updated:** December 9, 2025  
**Purpose:** Complete design specification for creating a premium, modern church management dashboard using Svelte, ShadCN/UI, and Tailwind CSS  
**Target Design Inspiration:** Sajid's design systems approach, Kole Jain's dashboard principles, modern dark mode patterns

---

## 1. DESIGN PHILOSOPHY & PRINCIPLES

### Core Design Pillars
1. **Premium Dark Mode** - Modern, sophisticated dark interface as the primary theme
2. **Component-Based Architecture** - Reusable, consistent UI components across all sections
3. **Information Hierarchy** - High-level metrics at top, detailed views below
4. **Micro-interactions** - Subtle animations for professional feel without clutter
5. **Accessibility First** - WCAG compliant, keyboard navigable, screen reader friendly
6. **Fast & Responsive** - Mobile-first design, seamless across all devices

### Design Inspiration Sources
- **Kole Jain Framework:**
  - 4 core dashboard components: Lists/Tables, Cards, Charts, Modals
  - Proper spacing and margin for breathing room
  - Responsive sidebar navigation
  - Dark mode with outline/border approach vs. background colors

- **Sajid's Design Systems:**
  - Component reusability and consistency
  - Design-system-first approach with CSS variables
  - Layout patterns (two-column, flex, grid)
  - Global styling with utility classes

---

## 2. COLOR PALETTE & DARK MODE SYSTEM

### Primary Color System
```
-- Base Neutrals (for dark mode) --
Background Base:       #1a1a1a (Pure blacks avoided)
Surface Primary:       #1e1e1e (Card backgrounds)
Surface Secondary:     #2a2a2a (Hover states)
Text Primary:          #f5f5f5 (Main text)
Text Secondary:        #a0a0a0 (Secondary text)
Borders:               #2a2a2a / #3a3a3a (Subtle outlines)

-- Brand Color (Teal for Church/Community feel) --
Primary Action:        #06b6d4 (Accent/buttons) [Cyan/Teal]
Primary Hover:         #0891b2 (Darker teal)
Primary Active:        #0d9488 (Active state)

-- Status Colors --
Success:               #10b981 (Green - attendance achieved, salvation decisions)
Warning:               #f59e0b (Amber - follow-up needed)
Error/Danger:          #ef4444 (Red - missed, inactive)
Info:                  #3b82f6 (Blue - informational alerts)

-- Semantic Colors (Muted for dark mode) --
Events:                #8b5cf6 (Purple - special events)
Meetings:              #ec4899 (Pink - prayer meetings)
Outreach:              #06b6d4 (Cyan - evangelism tracking)
Finance:               #f59e0b (Gold/Amber - offerings/tithes)
Members:               #10b981 (Green - member growth)
```

### Dark Mode Implementation
- **Approach:** Dark mode ONLY - no light mode toggle
- **Persistence:** Store preference in localStorage
- **Color Overlays:** Avoid pure black (#000000); use #1a1a1a instead
- **Contrast Requirements:**
  - Text on background: 4.5:1 minimum for AA compliance
  - Accent colors: 3:1 minimum for UI components

---

## 3. TYPOGRAPHY SYSTEM

### Font Stack
```
Font Family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif
Monospace:   'Fira Code', 'Courier New', monospace (for data/numbers)
```

### Sizing Hierarchy
```
H1 - Page Titles:        2.25rem (36px) | Weight: 700 (bold)
H2 - Section Headers:    1.875rem (30px) | Weight: 600 (semibold)
H3 - Card Titles:        1.5rem (24px) | Weight: 600 (semibold)
H4 - Subsection:         1.25rem (20px) | Weight: 600 (semibold)
Body - Main Text:        0.875rem (14px) | Weight: 400 (regular)
Label - Form/Table:      0.75rem (12px) | Weight: 500 (medium)
Caption - Helper Text:   0.75rem (12px) | Weight: 400 (regular) | Color: secondary
Small - Badges:          0.625rem (10px) | Weight: 500 (medium)
```

### Line Heights
- Headings: 1.2 (tight, for impact)
- Body text: 1.5 (comfortable reading)
- Labels: 1.4

---

## 4. SPACING & LAYOUT SYSTEM

### Spacing Scale (8px base)
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

### Layout Grid
- **Desktop:** 12-column grid with 24px gutters
- **Tablet:** 8-column grid with 16px gutters
- **Mobile:** 4-column grid with 12px gutters

### Container Widths
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Responsive Breakpoints
```
xs: 0px (mobile)
sm: 640px (small devices)
md: 768px (tablets)
lg: 1024px (desktops)
xl: 1280px (large desktops)
2xl: 1536px (ultra-wide)
```

---

## 5. COMPONENT LIBRARY & PATTERNS

### 5.1 NAVIGATION

#### Sidebar Navigation
**Design Pattern:** Collapsible sidebar with icon-focused collapsed state
```
Layout:
- Header height: 64px (logo + branding)
- Sidebar width: 256px (expanded, Tailwind w-64) / 80px (collapsed)
- Smooth transition on collapse/expand
- Icons from: Lucide React or Heroicons

Structure:
├── Logo/Branding (24px icon + text)
├── Main Nav Items (with active indicator)
│   ├── Dashboard
│   ├── Evangelism Contacts
│   ├── Services & Meetings
│   ├── People Directory
│   ├── Visitation Tracking
│   └── Reports
├── Settings
└── Logout

Active State Indicator:
- Left border: 3px solid primary color
- Background: Surface secondary color
- Text: Primary text color

Icon + Label Pattern:
- Icons: 24x24px (Lucide or Heroicons)
- Label visible when expanded
- Tooltip on hover when collapsed

Hover Effect:
- Background color shift to secondary surface
- Smooth transition (150ms)
```

#### Top Navigation Bar
```
Height: 64px
Content:
- Left: Hamburger menu (mobile) / Dashboard title
- Center: Breadcrumb navigation (desktop)
- Right:
  ├── Search bar (desktop only, 300px width)
  ├── Notifications bell (with badge count)
  ├── User profile dropdown
  └── Settings

Spacing: 16px horizontal padding on sides
Elevation: Box shadow for depth (subtle)
```

### 5.2 CARD COMPONENTS

**Base Card Structure:**
```html
<Card>
  <CardHeader>
    <CardTitle>Metric Name</CardTitle>
    <CardDescription>Supporting text</CardDescription>
  </CardHeader>
  <CardContent>
    <!-- Main content -->
  </CardContent>
  <CardFooter>
    <!-- Optional footer with links/actions -->
  </CardFooter>
</Card>
```

**Card Styling:**
- **Background:** Surface primary (#1e1e1e)
- **Border:** 1px solid #2a2a2a
- **Padding:** 24px
- **Border Radius:** 8px (md)
- **Shadow:** 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)
- **Hover:** Subtle shadow increase, border color lightens

**Card Variants:**
1. **Metric Card** (Key Performance Indicator)
   ```
   Top Number: 2.25rem, bold, primary color optional
   Label: 0.875rem, secondary text
   Trend: Small badge with arrow (↑↓) + percentage
   ```

2. **Action Card** (Clickable)
   ```
   Cursor: pointer
   Hover: Background shifts to secondary surface
   Transition: All 200ms ease
   ```

3. **Data Card** (With table/list)
   ```
   Padding: 0 (table removes padding)
   Content: Table/List takes full width
   ```

### 5.3 BUTTONS

**Button Variants:**

1. **Primary Button** (Primary actions)
   ```
   Background: #06b6d4 (teal)
   Text: #ffffff
   Padding: 12px 20px
   Border Radius: 6px
   Font Weight: 500
   Hover: Background #0891b2
   Active: Background #0d9488
   Focus: Outline 2px solid primary + 2px offset
   Disabled: Opacity 0.5, cursor not-allowed
   ```

2. **Secondary Button** (Less important actions)
   ```
   Background: #2a2a2a (surface secondary)
   Text: #f5f5f5
   Border: 1px solid #3a3a3a
   Hover: Background #3a3a3a
   ```

3. **Ghost Button** (Subtle actions, navigation)
   ```
   Background: transparent
   Text: #06b6d4
   Hover: Background rgba(6,182,212,0.1)
   Border: none
   ```

4. **Danger Button** (Destructive actions)
   ```
   Background: #ef4444 (red)
   Text: #ffffff
   Hover: Background #dc2626
   ```

**Button Sizes:**
```
sm: 8px 12px, font-size 0.75rem
md: 12px 20px, font-size 0.875rem (default)
lg: 16px 28px, font-size 1rem
```

**Button States:**
- Hover: 200ms transition, subtle background shift
- Active: Darker background
- Focus: Outline ring + offset
- Disabled: 50% opacity
- Loading: Spinner inside + disabled state

### 5.4 FORMS & INPUTS

**Text Input:**
```
Height: 40px
Padding: 8px 12px
Border: 1px solid #2a2a2a
Background: #1a1a1a
Border Radius: 6px
Font: 0.875rem
Focus: Border color → #06b6d4, box-shadow: 0 0 0 3px rgba(6,182,212,0.1)
Error: Border color → #ef4444
Disabled: Opacity 0.5
```

**Placeholder Text:**
```
Color: #707070 (muted text)
Font Style: Regular
```

**Label:**
```
Font Size: 0.875rem
Font Weight: 500
Color: #f5f5f5
Margin Bottom: 8px
Required Indicator: * in primary color
```

**Select Dropdown:**
```
Same height/padding as text input
Background image: Chevron icon (right-aligned)
Appearance: none (remove default browser styling)
Focus: Same as text input
```

**Checkbox & Radio:**
```
Size: 16x16px
Border: 1px solid #3a3a3a
Background: transparent
Checked: Background #06b6d4, checkmark #ffffff
Focus: Box-shadow 0 0 0 3px rgba(6,182,212,0.1)
Transition: All 150ms ease
```

**Form Error Message:**
```
Color: #ef4444
Font Size: 0.75rem
Margin Top: 4px
Icon: Exclamation circle (12px)
```

### 5.5 TABLES & LISTS

**Table Structure:**
```html
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Table Styling:**
- **Header Background:** #2a2a2a
- **Header Text:** #f5f5f5, font-weight 600
- **Row Height:** 48px
- **Cell Padding:** 12px
- **Borders:** 1px solid #2a2a2a between rows
- **Row Hover:** Background #262626
- **Alternate Row:** None (no zebra striping in dark mode)

**Sortable Headers:**
- Cursor: pointer
- Icon: Up/down chevron (12px)
- Hover: Text color → #06b6d4

**Table Actions:**
- Right-align action buttons in last column
- Use icon buttons for compact display
- Hover reveals edit/delete buttons

**Pagination:**
```
Location: Bottom right of table
Style: Ghost buttons for page numbers
Active Page: Primary button style
Disabled: Opacity 0.5
```

### 5.6 BADGES & STATUS INDICATORS

**Badge Styles:**

1. **Category Badge** (Contact type)
   ```
   Responsive:     bg-blue-500/20, text-blue-300, border-blue-500/30
   Non-responsive: bg-gray-500/20, text-gray-300
   Has Church:     bg-green-500/20, text-green-300
   Events Only:    bg-purple-500/20, text-purple-300
   Big Events:     bg-orange-500/20, text-orange-300
   Bacenta Mainly: bg-pink-500/20, text-pink-300
   Don't Contact:  bg-red-500/20, text-red-300
   ```

2. **Status Badge** (Service attendance, spiritual decisions)
   ```
   Background: color/20 (20% opacity)
   Text: color/300 (lighter shade)
   Border: color/30 (subtle outline)
   Padding: 4px 8px
   Border Radius: 4px (full = fully rounded)
   Font Size: 0.75rem
   Font Weight: 500
   ```

3. **Progress Badge** (Numeric indicator)
   ```
   Shape: Circular (60px diameter)
   Background: Surface secondary
   Text: Primary color, bold, centered
   Border: Thin ring around edge
   ```

### 5.7 MODALS & DIALOGS

**Modal Structure:**
```html
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogClose />
    </DialogHeader>
    <DialogBody>
      <!-- Form or content -->
    </DialogBody>
    <DialogFooter>
      <Button variant="ghost">Cancel</Button>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Modal Styling:**
- **Background Overlay:** rgba(0,0,0,0.5) (semi-transparent)
- **Modal Max Width:** 600px (md), responsive smaller on mobile
- **Border Radius:** 8px
- **Padding:** 24px
- **Shadow:** Large shadow for elevation
- **Animation:** Fade in + scale from center (200ms)

**Modal Interactions:**
- Close button (X) in top right
- Click outside to dismiss (optional)
- Escape key to close
- Focus trap inside modal

### 5.8 TOOLTIPS & POPOVERS

**Tooltip:**
```
Background: #2a2a2a
Text: #f5f5f5
Font Size: 0.75rem
Padding: 4px 8px
Border Radius: 4px
Max Width: 200px
Delay: 200ms on hover
Arrow: Pointing to triggering element
```

**Popover:**
```
Similar to tooltip but:
- Larger content area (wider max-width)
- Can contain interactive elements
- Close button or click-outside to dismiss
- Arrow pointing to trigger
```

---

## 6. LAYOUT PATTERNS FOR KEY PAGES

### 6.1 Dashboard Home Page

**Structure:**
```
┌─────────────────────────────────────────────────┐
│  Top Navigation Bar (64px)                      │
├──────────┬────────────────────────────────────────┤
│ Sidebar  │  Main Content Area                      │
│ (256px)  │                                         │
│          │  ┌────────────────────────────────────┐ │
│          │  │ Breadcrumbs / Page Title           │ │
│          │  ├────────────────────────────────────┤ │
│          │  │ Quick Stats Grid (4 columns)       │ │
│          │  │ ┌──────────┬──────────┐            │ │
│          │  │ │ Stat 1   │ Stat 2   │            │ │
│          │  │ ├──────────┼──────────┤            │ │
│          │  │ │ Stat 3   │ Stat 4   │            │ │
│          │  │ └──────────┴──────────┘            │ │
│          │  ├────────────────────────────────────┤ │
│          │  │ Main Metrics (2 columns)           │ │
│          │  │ ┌───────────────┬────────────────┐ │ │
│          │  │ │ Chart/Graph   │ Table/List     │ │ │
│          │  │ └───────────────┴────────────────┘ │ │
│          │  ├────────────────────────────────────┤ │
│          │  │ Activity Feed / Recent Updates     │ │
│          │  └────────────────────────────────────┘ │
└──────────┴────────────────────────────────────────┘
```

**Quick Stats Row:**
- 4 cards in a grid (responsive: 2 on tablet, 1 on mobile)
- Each card shows:
  - Large number (KPI value)
  - Label text
  - Trend indicator (↑ green or ↓ red with percentage)
  - Optional: Mini chart sparkline

**Example Cards:**
1. Total Contacts
2. Salvation Decision Rate
3. Active Members
4. Total Attendance

### 6.2 Evangelism Contacts Page

**Structure:**
```
Header:
- Title: "Evangelism Contacts"
- Add Contact button
- Search bar
- Filter dropdown (Category, Status)

Content:
- Table with columns:
  Name | Phone | Category | Date Contacted | Saved? | Attended? | Invited By | Last Action | Actions

Actions Column:
- Edit icon (pencil)
- View details (external link)
- Delete (trash, with confirmation)
- More options (three dots)

Responsive:
- Desktop: Full table
- Tablet: Show Name, Category, Invited By; hide Contacted Date initially
- Mobile: Card-based layout instead of table
```

**Add/Edit Contact Modal:**
```
Fields:
- Name (required)
- Phone (required, validation)
- Category (dropdown: responsive, non-responsive, etc.)
- Date Contacted (date picker)
- Salvation Decision? (checkbox/toggle) - Did they make a decision for Christ?
- Attended Church? (checkbox/toggle)
- Invited By (searchable select from People)
- Comments (textarea with timestamp notes)

Actions:
- Save button (primary)
- Cancel button
- Delete button (on edit, bottom right, red/danger)
```

### 6.3 Services & Meetings Page

**Tab Structure:**
```
Tabs:
[Sunday Services] [Bacenta] [Flow Prayer] [Farley Prayer] [All Night Prayer] [Basonta] [SAT]

Content Area:
- Title: "Meeting Name Services"
- Add Service button
- Filters (Date range, Location)
- Service List/Cards
  └─ Date | Topic/Type | Location | Attendance | Salvation Decisions | Actions
  
Meeting Details Card:
- Basic info
- Attendee list (with role badges)
- Salvation decisions count
- Tithers (if applicable)
- Images (photo gallery)
- Special notes
```

### 6.4 People Directory

**Layout:**
```
Top Section:
- Search bar (real-time filter)
- View toggle (List/Cards/Map)
- Sort dropdown
- Filter dropdown (Status, Role, Baptised)

List View:
- Name | Phone | Email | Role | Status | Baptised | Actions

Card View:
- Name
- Profile image (placeholder: initials circle)
- Phone
- Email
- Role badge
- Status badge
- Quick action buttons

Map View:
- Interactive map showing people locations
- Click to view profile
- Filter by role/status
```

**Person Profile Modal/Page:**
```
Left Column (Basic Info):
- Profile image (large)
- Name
- Phone
- Email
- Address
- Age (calculated from DOB)

Middle Column (Church Info):
- Role (Basonta Worker, Bacenta Leader, None)
- Status (guest, member, leader, archived)
- Baptised? (Yes/No)
- Tithe Status (Yes/No)
- Join Date

Right Column (Activity & Growth):
- Prayer meeting attendance (count)
- Invites made (count)
- Schools completed (checklist)
- Recent salvation decisions attributed
- Last attendance date
- Edit Profile button
```

---

## 7. MICRO-INTERACTIONS & ANIMATIONS

### Transition Timings
```
Fast:    150ms - Small state changes (hover, focus)
Normal:  200-250ms - Page transitions, modal opens
Slow:    400-500ms - Complex animations, data loads
```

### Easing Function
```
Standard: cubic-bezier(0.16, 1, 0.3, 1)
Ease-in:  cubic-bezier(0.4, 0, 1, 1)
Ease-out: cubic-bezier(0, 0, 0.2, 1)
```

### Specific Animations

1. **Button Hover:**
   - Background color shift (150ms)
   - Shadow increase (subtle)
   - Text color adjustment if needed

2. **Page Load:**
   - Fade in (200ms)
   - Stagger cards (50ms delay between each)

3. **Modal Open:**
   - Overlay fade in (200ms)
   - Modal scale from center (200ms, cubic-bezier(0.16, 1, 0.3, 1))

4. **Form Input Focus:**
   - Border color change (150ms)
   - Box shadow appear (glow effect)
   - Label move up (if floating label)

5. **List Item Hover:**
   - Background color shift (150ms)
   - Left border accent appear (150ms)

6. **Chart/Graph Load:**
   - Bars/lines animate from 0 (400-500ms)
   - Numbers count up (600-800ms)

7. **Data Update:**
   - Highlight flash (yellow/amber, 500ms)
   - Then fade to normal

### Subtle Hover Effects (Non-interactive Elements)
```
Information cards: Slight lift (transform: translateY(-2px)), shadow increase
Links: Underline appear, color shift
Icons: Slight scale (1.05x)
```

---

## 8. RESPONSIVE DESIGN SPECIFICATIONS

### Mobile (xs: 0px - sm: 640px)
```
- Sidebar: Hidden by default, hamburger menu opens drawer
- Layout: Single column (stack all cards)
- Navigation: Bottom nav bar for key sections
- Tables: Convert to card layout
- Buttons: Full width or stacked
- Padding: 12px
- Font sizes: Reduce by ~1 step
```

### Tablet (sm: 640px - lg: 1024px)
```
- Sidebar: Visible but narrower (80px icon-only or 200px) with toggle
- Layout: 2 columns where possible
- Tables: Horizontal scroll or abbreviated columns
- Grid: 2 columns for stat cards
- Padding: 16px
```

### Desktop (lg: 1024px+)
```
- Sidebar: Full width (256px, Tailwind w-64)
- Layout: 3+ columns possible
- Tables: Full display all columns
- Grid: 4 columns for stat cards
- Padding: 24px
```

### Touch-Friendly Design (All Mobile Devices)
```
- Minimum touch target: 44x44px (tap areas)
- Button sizes: 48px minimum height
- Spacing between buttons: 12px minimum
- Avoid hover-only interactions
- Double-tap zoom: Disabled (viewport settings)
```

---

## 9. ACCESSIBILITY REQUIREMENTS

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Text on background: 4.5:1 minimum (normal text)
- Large text (18px+ or 14px+ bold): 3:1 minimum
- UI components: 3:1 minimum

**Keyboard Navigation:**
- Tab order: Logical, left-to-right, top-to-bottom
- Skip link: To main content
- Focus indicators: Visible (2px outline, typically)
- All interactive elements: Keyboard accessible

**Semantic HTML:**
```html
<nav> - Navigation sections
<main> - Primary content
<header> - Page header
<article> - Content articles
<section> - Content sections
<button> - Clickable actions
<label> - Form labels (for="id")
<form> - Form containers
<table> - Tabular data (not layout)
```

**ARIA Attributes:**
```html
aria-label="Description" - For icon-only buttons
aria-describedby="id" - Additional descriptions
aria-expanded="true/false" - Toggle states
aria-hidden="true" - Decorative elements
role="tab" - Tab interface
aria-current="page" - Current page in navigation
```

**Focus States:**
```css
:focus-visible {
  outline: 2px solid #06b6d4;
  outline-offset: 2px;
}
```

**Screen Reader Testing:**
- All images have alt text (or aria-hidden if decorative)
- Form fields have associated labels
- Data tables have proper headers
- Lists use semantic `<ul>/<ol>/<li>`

---

## 10. DESIGN TOKENS & CSS VARIABLES

**ShadCN/UI Integration with Tailwind:**
```css
@layer base {
  :root {
    /* Colors */
    --background: 0 0% 10%;       /* #1a1a1a */
    --foreground: 0 0% 97%;       /* #f5f5f5 */
    --card: 0 0% 12%;             /* #1e1e1e */
    --card-foreground: 0 0% 97%;
    --primary: 184 100% 50%;       /* #06b6d4 Cyan */
    --primary-foreground: 0 0% 0%;
    --secondary: 0 0% 16%;         /* #2a2a2a */
    --secondary-foreground: 0 0% 97%;
    --destructive: 0 84% 60%;      /* #ef4444 Red */
    --destructive-foreground: 0 0% 100%;
    --muted: 0 0% 40%;             /* #666666 */
    --muted-foreground: 0 0% 60%;
    --accent: 184 100% 50%;        /* Same as primary */
    --accent-foreground: 0 0% 0%;
    --border: 0 0% 16%;            /* #2a2a2a */
    --input: 0 0% 12%;             /* #1e1e1e */
    --ring: 184 100% 50%;          /* Primary cyan */
    
    /* Rounded corners */
    --radius: 0.5rem;              /* 8px default */
  }

  .dark {
    /* Dark mode overrides if needed */
  }
}
```

---

## 11. DATA VISUALIZATION & CHARTS

### Chart Library
- **Recommendation:** `LayerChart` or `svelte-chartjs` (Svelte-specific charting libraries)
- **Dark Mode:** Ensure all charts use dark theme colors

### Chart Types by Section

**Evangelism Dashboard:**
- **Contacts Over Time:** Line chart (last 12 months)
- **Category Distribution:** Pie chart
- **Salvation Funnel:** Funnel chart (contacts → attended → salvation decision)
- **Inviter Effectiveness:** Bar chart (top inviters by salvation decisions)

**Services Dashboard:**
- **Attendance Trend:** Line chart (last 12 Sundays)
- **Capacity Utilization:** Bar chart (max capacity vs. actual)
- **Salvation Decisions by Week:** Line chart
- **Tithe Trend:** Area chart

**Meetings Dashboard:**
- **Meeting Attendance:** Bar chart (Flow, Farley, All Night comparison)
- **Prayer Hours Logged:** Area chart (cumulative over time)
- **Leader Participation:** Horizontal bar chart (role-based attendance)

**People Dashboard:**
- **Growth Over Time:** Line chart (total people by month)
- **Gender/Marital Distribution:** Pie/donut chart
- **Age Distribution:** Histogram/bar chart
- **Role Distribution:** Pie chart (Basonta, Bacenta, None)
- **Status Distribution:** Pie chart (guest, member, leader, archived)

### Chart Styling
```
- Background: Transparent (inherits card background)
- Grid: Subtle, secondary text color
- Axes: Secondary text color
- Legend: Below chart, horizontal, small text
- Tooltips: Dark overlay with white text
- Colors: Use semantic color palette (success, warning, error)
```

---

## 12. PRINT-FRIENDLY LAYOUT

### Print Stylesheet
```css
@media print {
  /* Hide navigation, buttons, filters */
  nav, .sidebar, .toolbar, button:not(.print-only) {
    display: none;
  }

  /* Full width layout */
  body {
    margin: 0;
    padding: 1in;
  }

  /* Page breaks */
  .page-break {
    page-break-after: always;
  }

  /* Color adjustments */
  background-color: white;
  color: black;

  /* Tables: Preserve layout */
  table {
    border-collapse: collapse;
  }

  /* Smaller font for print */
  body {
    font-size: 11pt;
  }
}
```

### Print View Features
- **Report Generation Button:** On each dashboard
- **Print-Ready Layout:** Remove shadows, use black/white
- **Page Numbers:** Footer with page count
- **Date Printed:** Top right corner
- **Header/Footer:** Institution name, generated date
- **Column Headers:** Repeat on each page

---

## 13. DEVELOPMENT ENVIRONMENT & TECHNOLOGY STACK

### Technology Stack Clarification

**IMPORTANT:** This project uses **standard Svelte (v5 if possible) + ShadCN/UI + Tailwind CSS + Supabase**.

- **Kilo Code** is the IDE/development environment being used to build this application
- All code produced must be **standard, exportable Svelte code** that can run independently
- Do NOT use any proprietary low-code components, visual builders, or platform-specific abstractions
- The codebase should be fully portable and work in any standard Svelte development environment

### Standard Svelte Development

1. **Component Architecture:**
   - Use standard Svelte 5 components (.svelte files)
   - Leverage ShadCN/UI components for consistent UI
   - Create custom components following Svelte best practices
   - All components must be standard, reusable Svelte code

2. **Data Binding:**
   - Use Svelte's native reactivity ($state, $derived, $effect in Svelte 5)
   - Bind form inputs directly to Supabase via standard JavaScript/TypeScript
   - Create calculated fields using derived stores or computed properties

3. **State Management:**
   - Use Svelte stores for global state
   - Leverage Supabase real-time subscriptions for live updates
   - Implement standard async/await patterns for data fetching

4. **Database Design (Supabase):**

   **Unified People Table:**
   ```sql
   -- Single table for ALL people (guests, members, leaders)
   CREATE TABLE people (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     phone TEXT,
     email TEXT,
     address TEXT,
     date_of_birth DATE,
     gender TEXT,
     status TEXT DEFAULT 'guest', -- 'guest', 'member', 'leader', 'archived'
     role TEXT, -- 'basonta_worker', 'bacenta_leader', etc.
     baptised BOOLEAN DEFAULT FALSE,
     tithe_status BOOLEAN DEFAULT FALSE,
     join_date DATE,
     invited_by_id UUID REFERENCES people(id),
     salvation_decision_date DATE, -- When they made a decision for Christ
     membership_join_date DATE, -- When guest became member
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

   **Meetings Table:**
   ```sql
   CREATE TABLE meetings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     meeting_type TEXT NOT NULL, -- 'sunday_service', 'bacenta', 'flow_prayer', etc.
     date DATE NOT NULL,
     topic TEXT,
     location TEXT,
     notes TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

   **Meeting Attendance (Many-to-Many Junction Table):**
   ```sql
   -- Links people to meetings they attended
   CREATE TABLE meeting_attendance (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     person_id UUID REFERENCES people(id) ON DELETE CASCADE,
     meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
     attended BOOLEAN DEFAULT TRUE,
     role_at_meeting TEXT, -- 'attendee', 'leader', 'speaker', etc.
     notes TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(person_id, meeting_id)
   );
   ```

   **Evangelism Contacts Table:**
   ```sql
   CREATE TABLE evangelism_contacts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     person_id UUID REFERENCES people(id) ON DELETE CASCADE,
     category TEXT, -- 'responsive', 'non_responsive', 'has_church', etc.
     date_contacted DATE,
     salvation_decision BOOLEAN DEFAULT FALSE, -- Did they make a decision for Christ?
     attended_church BOOLEAN DEFAULT FALSE,
     invited_by_id UUID REFERENCES people(id),
     comments TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

5. **Security Model (Single-Tenant):**
   
   **IMPORTANT:** This is a **single-user admin tool**.
   
   - Only ONE admin user has login credentials
   - "Leaders" and "Members" do NOT have their own login accounts
   - The Admin user manually logs all data for everyone
   - Row-Level Security (RLS) is configured for the single admin user
   - No multi-tenant considerations needed
   
   ```sql
   -- Simple RLS for single admin user
   ALTER TABLE people ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Admin full access" ON people
     FOR ALL
     USING (auth.uid() = 'admin-user-uuid-here');
   ```

6. **API Considerations:**
   - Use Supabase client library for all database operations
   - Implement real-time subscriptions for live data updates
   - Create TypeScript types matching database schema
   - Handle errors gracefully with user-friendly messages

---

## 14. IMPLEMENTATION CHECKLIST

### Phase 1: Setup & Foundation
- [ ] Create new Svelte 5 project with TypeScript
- [ ] Install and configure ShadCN/UI components for Svelte
- [ ] Configure Tailwind CSS with custom dark mode
- [ ] Set up color tokens and CSS variables
- [ ] Create global typography and spacing system
- [ ] Build basic layout (sidebar, header)
- [ ] Set up Supabase client and authentication

### Phase 2: Core Components
- [ ] Navigation components (sidebar, top nav, breadcrumbs)
- [ ] Button variants (primary, secondary, ghost, danger)
- [ ] Form components (input, select, checkbox, textarea)
- [ ] Card and container components
- [ ] Table/List components with sorting/pagination

### Phase 3: Dashboard Sections
- [ ] Dashboard home with key metrics
- [ ] Evangelism contacts list and detail views
- [ ] Services and meetings tracking
- [ ] People directory with profiles
- [ ] Visitation tracking interface

### Phase 4: Advanced Features
- [ ] Charts and data visualizations
- [ ] Search and filtering across all sections
- [ ] Print-friendly report generation
- [ ] Map view for people locations

### Phase 5: Polish & Optimization
- [ ] Micro-interactions and animations
- [ ] Accessibility audit (WCAG AA)
- [ ] Responsive design testing
- [ ] Performance optimization
- [ ] Cross-browser testing

---

## 15. PROMPT FOR AI MODEL GENERATION

### Primary Prompt Structure
When using an AI model to generate code, structure your request like:

```
I'm building a church management dashboard using Svelte 5, ShadCN/UI, and Tailwind CSS.

DESIGN SYSTEM:
- Dark mode primary (#1e1e1e backgrounds, #06b6d4 accent cyan)
- Design philosophy: Component-based, following Kole Jain's dashboard principles
- Color palette: [provide hex codes from section 2]
- Typography: [font stack and sizing from section 3]
- Spacing: 8px base unit grid
- Components: ShadCN/UI with custom Tailwind styling

FEATURE REQUIREMENT:
Build a [specific page/component] with:
- [Specific fields/data]
- [Interactions/behaviors]
- [Responsive breakpoints]

STYLING REQUIREMENTS:
- Use the enclosed design tokens
- Ensure WCAG AA contrast compliance
- Dark mode ONLY (no light mode)
- Smooth transitions (150-250ms)

CODE STRUCTURE:
- Standard Svelte 5 components (.svelte files)
- Type-safe (TypeScript)
- Supabase integration ready
- ShadCN/UI components only for UI
- Must be portable, standard Svelte code (no proprietary abstractions)

DATA MODEL:
- Single 'people' table with status column (guest/member/leader/archived)
- Many-to-many attendance via 'meeting_attendance' junction table
- "Salvation Decision" = spiritual decision for Christ
- "Membership Join" = guest becoming a member

Please provide:
1. Clean, production-ready code
2. Comments for complex logic
3. Tailwind classes (no CSS-in-JS)
4. Import statements for dependencies
```

---

## 16. DESIGN INSPIRATION REFERENCES

### YouTube Channels & Videos
1. **Kole Jain** (@KoleJain)
   - "EVERYTHING you need to know to build a Dashboard UI" (Aug 2025)
   - Focus: 4-component dashboard pattern (lists, cards, charts, modals)
   - Key takeaway: Proper spacing and micro-interactions

2. **Sajid** (@whosajid)
   - "The Smart Way to Build Websites" (Mar 2025)
   - Focus: Design systems and component reusability
   - Key takeaway: Variables, utility classes, consistency

3. **Specific Video:** "https://youtu.be/B7k5rOgmOGY?si=55U6ER5wSBxWO9-I"
   - Dashboard UI design fundamentals
   - Sidebars, modals, micro-interactions

### Design Inspiration Platforms
- **Dribbble:** Search "church management dashboard", "admin dashboard dark mode"
- **Figma Community:** Dashboard templates with dark mode
- **Product Hunt:** Church management SaaS platforms for UI inspiration

### Reference Designs
- **GoChurch** (Dribbble) - Modular widget-based dashboard
- **Nucleus** - Premium church website builder (aesthetic reference)
- **Apple Design System** - Dark mode best practices
- **Spotify** - Dark mode color harmony

---

## 17. TERMINOLOGY GLOSSARY

To avoid confusion, this project uses specific terminology:

| Term | Definition |
|------|------------|
| **Salvation Decision** | A spiritual decision where someone accepts Christ (getting saved). Tracked as `salvation_decision` boolean and `salvation_decision_date` in the database. |
| **Membership Join** | When a guest officially becomes a church member. Tracked as status change from 'guest' to 'member' and `membership_join_date` in the database. |
| **People** | The unified table containing ALL humans in the system (guests, members, leaders, archived). No separate "Members" or "First Timers" tables. |
| **Status** | A person's current standing: 'guest' (new/first-timer), 'member' (regular attendee), 'leader' (has leadership role), 'archived' (inactive/left). |
| **Meeting Attendance** | The many-to-many relationship linking people to meetings via the `meeting_attendance` junction table. |

---

## 18. NEXT STEPS

1. **Gather Inspiration:**
   - Watch Kole Jain's dashboard video (link provided)
   - Review Sajid's design systems approach
   - Explore church management dashboards on Dribbble/Reddit

2. **Prepare Assets:**
   - Export this specification as a markdown file
   - Create Figma file with color tokens and components (optional)
   - Prepare any church branding assets (logos, colors)

3. **AI Model Handoff:**
   - Use the prompt template in Section 15
   - Reference specific sections of this specification
   - Provide code examples if you have partial implementations

4. **Validation:**
   - Check output against design tokens
   - Verify accessibility (use axe DevTools)
   - Test responsive design
   - Validate dark mode consistency

---

## DOCUMENT METADATA

**Version:** 2.0  
**Created:** December 9, 2025  
**Last Updated:** December 9, 2025  
**Audience:** AI model implementation, development team, design review  
**Technology Stack:** Standard Svelte 5, ShadCN/UI, Tailwind CSS, Supabase  
**Development Environment:** Kilo Code (IDE only - all code is standard, exportable Svelte)  
**Status:** Ready for AI implementation  

---

**Last Section: Design Checklist for AI Review**

When AI generates components, validate:
- [ ] Colors match hex codes exactly
- [ ] Typography hierarchy preserved
- [ ] Spacing uses 8px increments
- [ ] ShadCN/UI components only (no custom div-based components)
- [ ] Dark mode is default (no light mode)
- [ ] Tailwind classes only (no CSS files)
- [ ] Responsive breakpoints match spec
- [ ] Accessibility attributes present (aria-*, labels)
- [ ] Animations use specified timings
- [ ] Button/input states complete (hover, focus, disabled, active)
- [ ] Uses unified 'people' table (not separate Members/First Timers)
- [ ] Uses 'Salvation Decision' not ambiguous 'Conversion'
- [ ] Attendance uses many-to-many junction table pattern
- [ ] Code is standard Svelte (no proprietary low-code abstractions)
