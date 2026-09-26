# DESIGN — StockSense

## Design principles
Clean, consistent, Odoo-inspired: dense data tables, clear status
pipelines, minimal chrome. Every screen after login shares the same
sidebar, spacing scale, and component set — no feature reinvents its own
button or table style.

## Shared component set (build once, import everywhere)
- `Button` (primary / secondary / danger variants — Validate = primary,
  Cancel = secondary, destructive actions = danger)
- `StatusBadge` — renders Draft/Waiting/Ready/Done/Canceled with a fixed
  color mapping (see below), reused on Receipts, Delivery, Move History,
  Dashboard filters
- `DataTable` — shared list-view component with built-in search
  (by reference & contact), column sort, and List/Kanban toggle
- `FormField` — labeled input with inline validation error display
- `Sidebar` / `TopNav` — the fixed navigation shared across all
  authenticated screens
- `Modal` — for "Add New Product" line-item entry on Receipt/Delivery forms

## Color mapping (must be consistent everywhere)
| Status/State | Color |
|---|---|
| Draft | Neutral gray |
| Waiting | Amber/yellow |
| Ready | Blue |
| Done | Green |
| Canceled | Red (muted) |
| Late (schedule date passed) | Red text/badge |
| Move History — In | Green row |
| Move History — Out | Red row |
| Out-of-stock delivery line | Red highlight |

## Screen inventory
1. **Login** — Login Id, Password, Sign In, Forgot Password / Sign Up links
2. **Sign Up** — Login Id, Email Id, Password, Re-enter Password, inline
   validation feedback per rule (length, case, special char)
3. **Dashboard** — Receipt & Delivery KPI tiles, filter bar (type/status/
   warehouse/category)
4. **Products / Stock** — table (Product, per-unit cost, On hand, Free to
   use), inline-editable cells, search/filter
5. **Receipts list** — Reference/From/To/Contact/Schedule/Status table,
   NEW button, List/Kanban toggle
6. **Receipt detail** — header fields, product line table, Add Product,
   New/Validate/Print/Cancel actions, Draft→Ready→Done stepper
7. **Delivery list** — same shape as Receipts, reversed From/To
8. **Delivery detail** — header fields incl. Delivery Address/Operation
   type, product lines with red-flagged out-of-stock rows,
   New/Validate/Print/Cancel, Draft→Waiting→Ready→Done stepper
9. **Internal Transfer** — from/to location, product lines
10. **Stock Adjustment** — product/location select, counted quantity
    input, computed delta shown before confirm
11. **Move History** — Reference/Date/Contact/From/To/Quantity/Status
    table, green/red row coding
12. **Settings → Warehouse** — Name, Short Code, Address form
13. **Settings → Locations** — Name, Short Code, Warehouse (parent) form
14. **Profile menu** — My Profile, Logout

## Layout conventions
- Sidebar fixed left (or top nav on narrow viewports), containing:
  Dashboard, Operations (Receipt/Delivery/Adjustment), Products, Move
  History, Settings (Warehouse → Warehouse, Locations), Profile (avatar,
  top right → My Profile, Logout)
- List screens: table view by default, toggle button switches to Kanban
  grouped by status
- Forms: header fields at top, product-line table below, action buttons
  (New/Validate/Print/Cancel) anchored bottom or top-right, consistently
  placed across Receipt and Delivery forms

## Responsiveness
- Tables scroll horizontally on narrow screens rather than breaking
  layout
- Sidebar collapses to a top nav or hamburger on mobile widths
- Forms stack fields vertically below a breakpoint, product-line tables
  remain scrollable

## Usability notes tied to spec
- "Responsible" field always shows as pre-filled/read-only (auto-filled
  from logged-in user) — never an empty editable field
- Error messaging is specific, not generic: "Invalid Login Id or
  Password" rather than "Something went wrong"
- Out-of-stock lines get both a visual (red) and textual flag/alert, not
  color alone (accessibility — don't rely on color as the only signal)
