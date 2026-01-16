---
description: Reference for the Church Tracker design system tokens (colors, typography, animations, spacing).
---

# Design System Tokens

This skill documents all design tokens used in the Church Tracker application. Reference this when styling new components.

---

## 1. Color Tokens

All colors use HSL format via CSS custom properties for Tailwind opacity support.

### Backgrounds

| Token | Tailwind Class | Hex | Usage |
|-------|----------------|-----|-------|
| `--background` | `bg-background` | `#0f0f0f` | Main page background |
| `--card` | `bg-card` | `#161616` | Card/panel backgrounds |
| `--card-elevated` | `bg-card-elevated` | `#1a1a1a` | Elevated surfaces (modals, charts) |
| `--secondary` | `bg-secondary` | `#2a2a2a` | Secondary backgrounds, hover states |

### Text

| Token | Tailwind Class | Hex | Usage |
|-------|----------------|-----|-------|
| `--foreground` | `text-foreground` | `#f5f5f5` | Primary text |
| `--muted-foreground` | `text-muted-foreground` | `#b3b3b3` | Secondary text, labels |
| `--muted` | `text-muted` | `#999999` | Axis labels, timestamps |
| `--subtle` | `text-subtle` | `#808080` | Very faint text |

### Borders

| Token | Tailwind Class | Hex | Usage |
|-------|----------------|-----|-------|
| `--border` | `border-border` | `#2a2a2a` | Default borders |
| `--border-hover` | N/A | `#333333` | Hover state borders |

### Accent Colors

| Token | Tailwind Class | Hex | Usage |
|-------|----------------|-----|-------|
| `--primary` | `bg-primary`, `text-primary` | `#06b6d4` | Primary accent (cyan) - use sparingly |
| `--accent` | `bg-accent` | `#06b6d4` | Same as primary |

### Semantic Colors

| Token | Tailwind Class | Hex | Usage |
|-------|----------------|-----|-------|
| `--success` | `bg-success`, `text-success` | `#10b981` | Positive states, confirmations |
| `--destructive` | `bg-destructive` | `#ef4444` | Errors, delete actions |
| `--warning` | `bg-warning` | `#f59e0b` | Warnings, cautions |

---

## 2. Typography

### Tailwind Classes

| Class | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-dashboard` | 48px | 600 | Main page titles |
| `text-section` | 24px | 600 | Section headers |
| `text-metric` | 42px | 600 | KPI values |
| `text-label` | 12px | 500 | Uppercase labels |

### CSS Component Classes

```css
.text-dashboard-title  /* 48px, -0.02em, semibold */
.text-section-title    /* 24px, -0.01em, semibold */
.text-label            /* 12px, uppercase, +0.05em */
.text-body             /* 14px, regular */
.text-body-lg          /* 16px, regular */
```

---

## 3. Spacing

Base grid: 8px

| Name | Value | Tailwind |
|------|-------|----------|
| xs | 4px | `p-1`, `gap-1` |
| sm | 8px | `p-2`, `gap-2` |
| md | 16px | `p-4`, `gap-4` |
| lg | 24px | `p-6`, `gap-6` |
| xl | 32px | `p-8`, `gap-8` |
| Custom | 4.5rem | `p-18` |
| Custom | 5.5rem | `p-22` |

---

## 4. Border Radius

| Token | Value | Tailwind |
|-------|-------|----------|
| `--radius` | 12px | `rounded-lg` |
| Derived | 10px | `rounded-md` |
| Derived | 8px | `rounded-sm` |

---

## 5. Animations

### Keyframe Animations (Tailwind)

| Class | Effect | Timing |
|-------|--------|--------|
| `animate-fade-in` | Fade in | 200ms ease |
| `animate-slide-up` | Fade + slide up 10px | 200ms ease |
| `animate-scale-in` | Fade + scale from 95% | 200ms ease |

### Content Entrance (CSS)

```css
.animate-in          /* Fade + float up, 400ms */
.delay-1             /* 50ms delay */
.delay-2             /* 100ms delay */
.delay-3             /* 150ms delay */
.delay-4             /* 200ms delay */
.delay-5             /* 250ms delay */
```

### Transition Utilities

```css
.transition-premium  /* all 200ms cubic-bezier(0.4, 0, 0.2, 1) */
```

### Standard Timing Functions

| Name | Value | Usage |
|------|-------|-------|
| Premium | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard transitions |
| Tab slide | `cubic-bezier(0.23, 1, 0.32, 1)` | Tab pill/underline |

---

## 6. Shadows

| Class | Effect | Usage |
|-------|--------|-------|
| `shadow-glow` | Cyan glow 20px | Hover on interactive cards |
| `shadow-glow-lg` | Cyan glow 30px | Emphasized elements |

---

## 7. Card Styles

### Base Card
```html
<div class="card-base">
  <!-- Gradient background, border, padding -->
</div>
```

### Interactive Card
```html
<div class="card-interactive">
  <!-- Same as base + hover lift + glow -->
</div>
```

---

## 8. Interaction Patterns

### Hover States

| Element | Effect |
|---------|--------|
| Card | `hover:bg-muted/50` or `hover-lift hover-glow` |
| Button | Scale down, then action |
| Link | `hover:underline text-primary` |
| Row | `hover:bg-muted/50` |

### Cursor Hints

| Element | Cursor |
|---------|--------|
| Clickable | `cursor-pointer` |
| Editable field | `cursor-text` |
| Disabled | `cursor-not-allowed` |
| Link | `cursor-pointer` + underline on hover |

---

## 9. Focus States

```css
:focus-visible {
  outline: none;
  ring: 2px;
  ring-color: var(--ring);  /* Primary cyan */
  ring-offset: 2px;
  ring-offset-color: var(--background);
}
```

Use Tailwind: `focus-visible:ring-2 focus-visible:ring-ring`

---

## Quick Reference: Common Patterns

### Card with hover
```html
<div class="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-all cursor-pointer">
```

### Section title
```html
<h2 class="text-section-title text-foreground">Section Title</h2>
```

### Muted label
```html
<span class="text-label text-muted-foreground">LABEL</span>
```

### Primary button
```html
<button class="bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
```

### Staggered entrance
```html
<div class="animate-in delay-1">First</div>
<div class="animate-in delay-2">Second</div>
<div class="animate-in delay-3">Third</div>
```
