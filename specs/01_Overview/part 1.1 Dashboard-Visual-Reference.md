# 🎨 CHURCH DASHBOARD - VISUAL REFERENCE & COMPONENT EXAMPLES

**Quick Reference for Designers & Developers**

---

## 1️⃣ DASHBOARD LAYOUT TEMPLATE

### Evangelism Dashboard Layout
```
┌────────────────────────────────────────────────────────────┐
│ HEADER: Search | User Icon | Settings                      │
├────────────────────────────────────────────────────────────┤
│ BREADCRUMBS: Dashboards > Evangelism                        │
├────────────────────────────────────────────────────────────┤
│ KPI METRICS ROW (4 Cards)                                   │
│ ┌──────────┬──────────┬──────────┬──────────┐              │
│ │Total     │Conversion│Active    │Top       │              │
│ │Contacts  │Rate      │Leads     │Inviter   │              │
│ │  247     │ 18.2%    │   34     │  John(12)│              │
│ │  ↗ +12%  │ ↗ +2.3%  │ ↗ +5     │ Mary(11) │              │
│ └──────────┴──────────┴──────────┴──────────┘              │
├────────────────────────────────────────────────────────────┤
│ MAIN SECTION (2 Columns)                                    │
│ ┌──────────────────────┬────────────────────┐              │
│ │ Conversion Funnel    │ Categories         │              │
│ │ (Bar Chart)          │ (Donut Chart)      │              │
│ │                      │                    │              │
│ │                      │                    │              │
│ └──────────────────────┴────────────────────┘              │
├────────────────────────────────────────────────────────────┤
│ SECONDARY SECTION: Full-Width Table                         │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Contact Status Table (Searchable, Sortable)            │ │
│ │ Name | Phone | Category | Status | Days | Inviter     │ │
│ │ John │ 123.. │Responsive│Follow │  7   │ Pastor Mark  │ │
│ │ Mary │ 456.. │Attended  │Active │ 14   │ John (above) │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ SIDEBAR NAVIGATION

```
┌──────────────────┐
│ 🙏 CHURCH APP    │  ← Logo + Text
│                  │
│ 📊 Dashboards    │  ← Main Section
│   └ Evangelism   │  ← Sub-item (dark gray)
│   └ Services     │
│   └ Meetings     │
│   └ Visitation   │
│   └ Members      │
│                  │
│ ➕ Quick Add     │  ← CTA Button (teal)
│                  │
│ ⚙️ Settings      │  ← Bottom action
│ ❓ Help          │
└──────────────────┘
```

**Styling:**
- **Sidebar Width:** 256px (hidden drawer on mobile behind hamburger menu)
- **Background:** `#1a1a1a` (dark blue-gray)
- **Icons:** Clean, 20-24px, light gray or teal when active
- **Active State:** Teal left border (4px) + light background
- **Hover State:** `#1e1e1e` background color

---

## 3️⃣ KPI METRIC CARD ANATOMY

```
┌─────────────────────────────────┐
│                                 │  ← Soft glow behind
│  📊 Total Contacts              │     (subtle cyan blur)
│                                 │
│              247                │  ← Large, bold number
│                                 │
│  ↗ +12 this month  (line chart) │  ← Trend + mini chart
│                                 │
└─────────────────────────────────┘
```

**Spacing:**
- **Padding:** 20px
- **Label Font:** 12px, medium, secondary gray
- **Number Font:** 32px, bold, white
- **Trend Font:** 12px, secondary gray
- **Glow:** `0 0 40px rgba(6,182,212,0.15)` (teal, behind)

**Hover State:**
- **Shadow:** Increase to `shadow-lg`
- **Transform:** Slight lift (`translateY(-2px)`)
- **Transition:** 200ms ease-out

---

## 4️⃣ BUTTONS & ACTIONS

### Primary Button (Call-to-Action)
```
┌────────────────────┐
│ ✓ Add New Contact  │  ← Teal background
└────────────────────┘
```
- **Background:** `#06b6d4` (teal)
- **Text:** White
- **Padding:** 10px 20px
- **Border Radius:** 8px
- **Hover:** Darker teal `#0891b2`, shadow-md
- **Active:** Inset shadow (pressed effect)

### Secondary Button
```
┌────────────────────┐
│ 🔄 Refresh Data    │  ← Gray background
└────────────────────┘
```
- **Background:** `#2a2a2a` (slate)
- **Border:** 1px `#3a3a3a`
- **Text:** Soft white
- **Hover:** Lighter background `#4a5568`

### Danger/Delete Button
```
┌────────────────────┐
│ 🗑️ Delete          │  ← Red background
└────────────────────┘
```
- **Background:** `#ef4444` (red)
- **Text:** White
- **Hover:** Darker red `#dc2626`

### Icon Button (Compact)
```
┌─────────────────┐
│ ⋮ (3 dots)      │  ← No background, just icon
└─────────────────┘
```
- **No background** (transparent)
- **Icon:** 20px, gray
- **Hover:** Background `#2a2a2a`, teal icon color
- **Tooltip:** Shows on hover (e.g., "More options")

---

## 5️⃣ FORM INPUTS & CONTROLS

### Text Input
```
Label: First Name
┌─────────────────────────────────┐
│ John                            │  ← Input field
└─────────────────────────────────┘

Focus State:
┌─────────────────────────────────┐
│ John                            │  ← Teal outline (2px)
└─────────────────────────────────┘
  Glow effect behind (soft teal)
```

**Styling:**
- **Background:** `#1e1e1e`
- **Border:** 1px solid `#3a3a3a` (normal), `#06b6d4` (focus)
- **Padding:** 10px 12px
- **Font:** 14px, regular
- **Placeholder:** `#718096` (lighter gray, 60% opacity)
- **Focus:** Teal outline (2px) + glow

### Select Dropdown
```
Meeting Type: ▼ Flow Prayer Service
┌─────────────────────────────────┐
│ Flow Prayer Service        ▼    │  ← Chevron icon right
└─────────────────────────────────┘

Open State:
┌─────────────────────────────────┐
│ Flow Prayer Service        ▲    │
├─────────────────────────────────┤
│ Bacenta Services               │  ← Items
│ Flow Prayer Service (checked)   │
│ Farley Prayer Meetings          │
│ All Night Prayers               │
│ Basonta Meetings                │
└─────────────────────────────────┘
```

**Styling:**
- Same as text input
- **Chevron Icon:** Right-aligned, 16px, teal when open
- **Dropdown Items:** 40px height, hover background `#2a2a2a`
- **Selected Item:** Teal checkmark on left

### Checkbox
```
Unchecked:           Checked:
┌─────────────────┐  ┌─────────────────┐
│ ☐ Is Tither     │  │ ☑ Is Tither     │  ← Teal, white check
└─────────────────┘  └─────────────────┘
```

**Styling:**
- **Size:** 20px × 20px
- **Unchecked:** Gray border, white background
- **Checked:** Teal background, white checkmark
- **Animation:** 150ms ease-out when toggled

### Toggle Switch
```
Off:  ◯─────────     On:  ─────────◯
```

- **Size:** 44px wide × 24px high
- **Slider:** 20px × 20px
- **Off Color:** Gray
- **On Color:** Teal
- **Animation:** 250ms ease-out

### Date Picker
```
Birthday: [12/15/1990] (dropdown icon)
Calendar opens on click:
┌──────────────────┐
│ December 1990    │ (month/year selector)
├──────────────────┤
│ Su Mo Tu We Th Fr Sa
│              1  2  3
│  4  5  6  7  8  9 10
│ 11 12 13 14 15 16 17
│ 18 19 20[21]22 23 24  ← Today: 21st (teal highlight)
│ 25 26 27 28 29 30 31
└──────────────────┘
```

---

## 6️⃣ TABLES & DATA LISTS

### Standard Data Table
```
┌────────────────────────────────────────────────────────────┐
│ 🔍 Search Contacts...                      [Filters ▼]    │
├─────┬──────────┬────────┬──────────┬──────┬────────────────┤
│     │ Name     │ Phone  │ Category │ Days │ Actions        │
├─────┼──────────┼────────┼──────────┼──────┼────────────────┤
│ ☐   │ John     │123-456 │Responsive│  7   │ ✎ 👁️ ⋮       │
│ ☐   │ Mary     │789-012 │Attended  │ 14   │ ✎ 👁️ ⋮       │
│ ☐   │ Pastor   │345-678 │Saved     │ 21   │ ✎ 👁️ ⋮       │
├─────┴──────────┴────────┴──────────┴──────┴────────────────┤
│ Rows 1-3 of 247  [< Previous] [1] [2] [3] [Next >]        │
└────────────────────────────────────────────────────────────┘
```

**Features:**
- **Header Row:** `#1a202c` background, `#a0aec0` text, 12px semibold
- **Data Rows:** 16px padding, 48px height
- **Alternating:** Optional subtle background on even rows
- **Hover:** `#2a2a2a` background, slight lift
- **Selection:** Row background becomes `#06b6d4` with 30% opacity
- **Actions:** Hidden until hover or mobile menu

---

## 7️⃣ CHARTS & VISUALIZATIONS

### Line Chart (Attendance Trend)
```
300 ┤        ╱╲       ╱╲
    │       ╱  ╲     ╱  ╲
250 ┤      ╱    ╲   ╱    ╲
    │     ╱      ╲ ╱      ╲
200 ┤────────────────────────
    │  Week 1  2  3  4  5  6
    
Members ═══  First-Timers ───
```

**Styling:**
- **Line Color:** Teal (`#06b6d4`)
- **Grid:** Subtle gray (`#2a2a2a`), horizontal only
- **Axes:** 12px gray text
- **Hover Tooltip:** Dark background, white text, shadow-lg
- **Animation on Load:** Line draws left-to-right (500ms)

### Bar Chart (Conversion Funnel)
```
Contacts     ████████████ 247
              
Saved        █████████    152

Attended     ███████       98

Members      █████         54
```

**Styling:**
- **Bar Color:** Teal
- **Bar Radius:** 4px (rounded corners)
- **Animation on Load:** Bars grow from 0 width (staggered 100ms each)
- **Label:** Number on right of bar (14px white)
- **Hover:** Slightly lighter color, tooltip with % increase

### Donut Chart (Category Distribution)
```
         Responsive (32%)
         ╭──────────╮
    Non-Responsive  │ 45%  ← Teal
    (23%)          │
    ╭──────────────┼──────╮
    │              │      │
    │      Has     │    Events
    │    Church    │     Only
    │    (19%)     │    (18%)
    │              │
    ╰──────────────┼──────╯
```

**Styling:**
- **Colors:** Teal, emerald, orange, blue (distinct)
- **Donut Hole:** Center can show total metric
- **Legend:** Below chart, 12px text
- **Hover:** Segment highlights, tooltip with count

---

## 8️⃣ MODALS & DIALOGS

### Modal Layout (Add New Contact)
```
┌──────────────────────────────────────────┐
│ ✕ Add New Contact                        │  ← Header + close
├──────────────────────────────────────────┤
│                                          │
│ Name: [John           ]                  │
│                                          │
│ Phone: [(123) 456-7890]                  │
│                                          │
│ Date Contacted: [12/15/2025] ▼           │
│                                          │
│ Category: [Responsive         ] ▼        │
│                                          │
│ Invited By: [Search name...    ]         │
│                                          │
│ ☑ Saved    ☑ Attended Church             │
│                                          │
│ Comments: [Optional notes...]            │
│                                          │
├──────────────────────────────────────────┤
│         [Cancel] [Save Contact]          │  ← Actions
└──────────────────────────────────────────┘
```

**Styling:**
- **Width:** 640px (medium size, responsive)
- **Background:** `#1e1e1e` (card color)
- **Header:** `#1a1a1a` background, border-bottom
- **Overlay:** `#000000` at 50% opacity
- **Border Radius:** 12px
- **Shadow:** `shadow-xl`
- **Animation:** Fade in + scale (0.95→1) over 250ms
- **Close Button:** Top right, hover color change

---

## 9️⃣ FILTERS & TAGS

### Filter Chips Row
```
Filters: 
[✕ Category: Responsive] [✕ Status: Active] [+ Add Filter]
```

**Styling:**
- **Background:** `#2a2a2a`
- **Border:** 1px `#3a3a3a`
- **Padding:** 6px 12px
- **Close Icon:** Hover to reveal X
- **Click X:** Remove filter instantly
- **+ Add:** Opens filter menu

### Filter Dropdown Menu
```
Category ▼
┌──────────────────────────┐
│ ☑ Responsive             │
│ ☐ Non-Responsive         │
│ ☐ Has Church             │
│ ☐ Events Only            │
└──────────────────────────┘

Status ▼
┌──────────────────────────┐
│ ☑ Active                 │
│ ☑ Following Up           │
│ ☐ Converted              │
│ ☐ Archived               │
└──────────────────────────┘
```

---

## 🔟 MEMBER PROFILE CARD (Quick View)

```
┌────────────────────────────────────┐
│ John Smith                    ✎ ⋮  │  ← Edit/Menu buttons
├────────────────────────────────────┤
│                                    │
│  👤 John Smith                     │  ← Avatar + name
│  📞 +1 (123) 456-7890             │
│  📧 john@example.com              │
│  🎂 28 years old (DOB: 12/15/1996)│
│  🏘️ 123 Main St, London, UK       │
│                                    │
│  Status: Regular Member            │
│  Role: Basonta Worker              │
│  Tithe Status: Yes                 │
│  Baptised: Yes                     │
│                                    │
│  Last Attended: Dec 8, 2025        │
│  Invites Made: 4 (Effective: 85%)  │
│  Prayer Activity: 12 meetings      │
│                                    │
│ [Spiritual Progress]               │
│ ████████░░ School of Evangelism   │
│ █████░░░░░ School of the Word     │
│                                    │
│         [View Full Profile]        │
└────────────────────────────────────┘
```

---

## 1️⃣1️⃣ ANIMATIONS & INTERACTIONS

### Number Counter (Metric Card)
```javascript
// When card loads, count from 0 → 247
// Duration: 1.5 seconds
// Easing: ease-out (fast start, smooth end)
// Format with thousands separator
0 → 50 → 100 → 150 → 200 → 247
```

### Chart Bar Growth
```javascript
// When chart loads, bars grow from 0 to 100%
// Staggered: each bar starts 100ms after previous
// Duration: 600ms per bar
// Easing: ease-out
Bar 1: ████░░░░░░ (loading)
Bar 2: ██░░░░░░░░ (starting)
Bar 3: ░░░░░░░░░░ (waiting)
```

### Modal Open/Close
```javascript
// Open:
// - Fade in background (200ms)
// - Scale modal from 95% → 100% (250ms)
// - Easing: ease-out

// Close:
// - Scale modal from 100% → 95% (150ms)
// - Fade out background (200ms)
// - Easing: ease-in
```

### Dropdown Menu Reveal
```javascript
// Open:
// - Slide down from 95% opacity
// - Duration: 200ms
// - Easing: ease-out

// Close:
// - Slide up
// - Duration: 150ms
// - Easing: ease-in
```

### Button Press Feedback
```javascript
// On click:
// - Apply inset shadow instantly
// - Scale down slightly (0.98) over 100ms
// - Release: return to normal over 150ms
```

---

## 1️⃣2️⃣ RESPONSIVE LAYOUT (BREAKPOINTS)

### Desktop (1024px+)
- Full sidebar visible (256px)
- All metrics shown (4-column grid)
- Tables with full columns
- Side-by-side charts

### Tablet (768px - 1023px)
- Sidebar still visible but slightly narrower (200px)
- Metrics: 2-column grid
- Charts stack vertically
- Tables scroll horizontally

### Mobile (<768px)
- Sidebar hidden (hamburger menu opens drawer)
- Metrics: Full width, stack vertically (1 column)
- Charts full width
- Tables: Scroll horizontally or switch to card view
- Modals: Full screen (minus safe areas)

---

## 1️⃣3️⃣ ACCESSIBILITY CHECKLIST

- [ ] **Color Contrast:** All text ≥ 4.5:1 ratio (WCAG AA)
- [ ] **Keyboard Navigation:** Tab through all interactive elements
- [ ] **Focus Indicators:** Visible ring/outline on focused elements
- [ ] **ARIA Labels:** `aria-label` on icon buttons, `aria-describedby` for complex elements
- [ ] **Semantic HTML:** Use `<button>`, `<input>`, `<select>` (not divs)
- [ ] **Form Labels:** Every input has associated `<label>`
- [ ] **Error Messages:** Linked to input via `aria-describedby`
- [ ] **Skip Links:** Option to skip to main content
- [ ] **Animations:** Respect `prefers-reduced-motion` setting
- [ ] **Mobile:** Touch targets ≥ 44px × 44px
- [ ] **Screen Reader:** All images have alt text, complex interactions tested

---

## 1️⃣4️⃣ CODE SNIPPET EXAMPLES

### Dark Mode Color System (Tailwind)
```javascript
// tailwind.config.js
const colors = {
  'dark-base': '#1a1a1a',
  'dark-card': '#1e1e1e',
  'dark-hover': '#2a2a2a',
  'dark-border': '#3a3a3a',
  'text-primary': '#e2e8f0',
  'text-secondary': '#a0aec0',
  'accent': '#06b6d4', // Teal
  'accent-dark': '#0891b2',
};
```

### Metric Card Component
```svelte
<!-- MetricCard.svelte -->
<script>
  export let label = '';
  export let value = 0;
  export let trend = '+12%';
  export let color = 'teal';
</script>

<div class="metric-card bg-slate-900 rounded-lg p-5 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
  <p class="text-sm text-gray-400">{label}</p>
  <p class="text-4xl font-bold text-white mt-2">{value}</p>
  <p class="text-sm text-gray-500 mt-2">↗ {trend}</p>
</div>

<style>
  .metric-card {
    background: linear-gradient(135deg, rgba(6,182,212,0.1), transparent);
    box-shadow: 0 0 40px rgba(6,182,212,0.15);
  }
</style>
```

---

## 1️⃣5️⃣ PRINT STYLESHEET

```css
@media print {
  /* Hide navigation */
  .sidebar, .top-nav, .filter-bar { display: none !important; }
  
  /* White background */
  body { background: white; color: black; }
  .card { background: white; border: 1px solid #ddd; }
  
  /* Readable text */
  .text-gray-400 { color: #666 !important; }
  
  /* Charts remain visible */
  svg { color: black; }
  
  /* Page breaks */
  .page-break { page-break-after: always; }
  
  /* Add header/footer */
  @page { margin: 0.5in; }
}
```

---

## 📚 RESOURCES FOR REFERENCE

**Kole Jain's Dashboard UI:**
https://youtu.be/B7k5rOgmOGY

**Kole Jain's UI Components:**
https://kolejain.com/resources

**Modern Dark Mode Practices:**
https://www.uinkits.com/blog-post/best-dark-mode-ui-design-examples-and-best-practices-in-2025

**Tailwind CSS Docs:**
https://tailwindcss.com

**ShadCN/UI Component Library:**
https://ui.shadcn.com

**Church Metrics (Reference):**
https://churchmetrics.com/features

---

**This guide should be paired with the main Design Brief for full context.**
