# DESIGN SYSTEM & UI SPECIFICATION — StockSense

## 1. Visual Identity & Design Philosophy
StockSense features a clean, high-contrast, data-dense interface tailored specifically for warehouse and marketplace inventory operations. It avoids generic dark SaaS templates by utilizing warm slate, packaging kraft accents, ink tones, and clear semantic state badges.

---

## 2. Color Palette & Semantic Tokens

```
┌────────────────────────────────────────────────────────┐
│                   Color Token Matrix                   │
├──────────────────────┬─────────────┬───────────────────┤
│ Token                │ Hex Value   │ Application       │
├──────────────────────┼─────────────┼───────────────────┤
│ --bg-primary         │ #0d1117     │ Canvas Background │
│ --bg-surface         │ #161b22     │ Cards, Containers │
│ --bg-surface-elevated│ #21262d     │ Modals, Hover     │
│ --border-subtle      │ #30363d     │ Table & Card Grid │
│ --accent-brand       │ #7c3aed     │ Primary Brand CTA │
│ --accent-amber       │ #d97706     │ Waiting State     │
│ --accent-blue        │ #2563eb     │ Ready State       │
│ --accent-emerald     │ #059669     │ Done / Inward Move│
│ --accent-rose        │ #e11d48     │ Out of Stock / Out│
└──────────────────────┴─────────────┴───────────────────┘
```

---

## 3. Status Badges & Pipeline Steppers

### 3.1 Status Badge Color Mapping
| Status | Badge Background | Badge Text | Meaning |
| :--- | :--- | :--- | :--- |
| **Draft** | `#21262d` | `#8b949e` (Slate Gray) | New, unreserved document |
| **Waiting** | `rgba(217, 119, 6, 0.15)` | `#fbbf24` (Warm Amber) | Awaiting stock availability |
| **Ready** | `rgba(37, 99, 235, 0.15)` | `#60a5fa` (Cobalt Blue) | Stock reserved, ready to pick |
| **Done** | `rgba(5, 150, 105, 0.15)` | `#34d399` (Emerald Green)| Validated, physical stock moved |
| **Canceled** | `rgba(225, 29, 72, 0.15)` | `#f87171` (Rose Red) | Voided / Canceled |

### 3.2 Stepper Component
The top of the Delivery Detail view renders an interactive visual pipeline:
`Draft` → `Waiting` → `Ready` → `Done`

- **Active Step**: Solid glowing indicator with bold label.
- **Completed Steps**: Highlighted track with checkmark icon.
- **Future Steps**: Muted dashed line and low-contrast circle.

---

## 4. UI Components

### 4.1 Data Tables
- Sticky header with subtle border.
- Hover state highlighting active row.
- Monospace font for document references (`WH/OUT/00001`) and SKU tags (`SKU-001`).
- Direct action buttons with tooltips.

### 4.2 Out-of-Stock Alert Rows
When a delivery item quantity exceeds available stock:
- Row background tinted in light rose.
- Out of Stock badge displayed prominently beside product name.
- Stock availability indicator shows: `Available: X / Required: Y`.

### 4.3 Action Toolbar
Anchored in the top header:
- **Check Availability**: Primary action when in `Draft` or `Waiting`.
- **Validate Delivery**: Primary action when in `Ready` (moves stock).
- **Print Slip**: Enabled once status is `Done`.
- **Cancel Order**: Secondary destructive action.

---

## 5. Typography & Hierarchy
- **Font Family**: Modern system sans-serif (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`).
- **Headings**: Semibold weight, high contrast (`#f0f6fc`).
- **Labels & Subtext**: Medium weight, readable contrast (`#8b949e`).
- **Numerical & Code Data**: Tabular numbers for clean tabular alignment.
