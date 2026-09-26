# PRD — StockSense

## 1. Product Overview
StockSense is a modular Inventory Management System (IMS) that digitizes
stock-related operations — replacing manual registers, Excel sheets, and
scattered tracking with a centralized, real-time, easy-to-use app. UX is
loosely modeled on Odoo Inventory (list/kanban views, status pipelines,
reference numbering).

**Target Users**
- **Inventory Managers** — manage incoming & outgoing stock.
- **Warehouse Staff** — perform transfers, picking, shelving, and counting.

## 2. Authentication
- Splash → Login (`Login Id`, `Password`) → `SIGN IN`. Error on mismatch:
  "Invalid Login Id or Password".
- Sign Up (`Login Id`, `Email Id`, `Password`, `Re-Enter Password`).
  - Login ID: unique, 6–12 characters.
  - Email: not a duplicate.
  - Password: ≥1 lowercase, ≥1 uppercase, ≥1 special char, length > 8.
- Forgot Password → OTP-based reset (delivery channel unspecified — **assumption: email OTP**, see Open Questions).
- On successful login/signup → redirect to Dashboard.

## 3. Navigation
Sidebar/top nav on every authenticated screen:
1. Dashboard
2. Operations → Receipt / Delivery / Adjustment
3. Products
4. Move History
5. Settings → Warehouse → (Warehouse, Locations)
6. Profile menu (avatar) → My Profile, Logout

## 4. Dashboard
KPI tiles:
- Receipt: "N Late / N operations", "N to receive"
- Delivery: "N Late / N waiting / N operations", "N to Deliver"
- Total Products in Stock, Low/Out of Stock, Pending Receipts, Pending
  Deliveries, Internal Transfers Scheduled

Definitions:
- **Late** = schedule date < today, still open
- **Operations** = schedule date > today
- **Waiting** = waiting on stock availability

Filters: document type (Receipt/Delivery/Internal/Adjustment), status
(Draft/Waiting/Ready/Done/Canceled), warehouse/location, product category.

## 5. Core Modules

### 5.1 Products / Stock
Fields: Name, SKU/Code, Category, Unit of Measure, Initial stock (optional).
Stock table view: `Product | Per unit cost | On hand | Free to use` —
**inline-editable** ("user must be able to update stock from here").
Also: category management, SKU search/filters, low-stock alerts.
Reordering-rule thresholds are unspecified (see Open Questions —
**assumption: not built for MVP, stub the field only**).

### 5.2 Receipts (Incoming)
Flow: Create → add supplier & products → input quantities → Validate →
stock increases.
List: `Reference | From | To | Contact | Schedule date | Status`, NEW
button, List/Kanban toggle, search by reference & contact.
Detail: `Reference (WH/IN/xxx)`, `Schedule Date`, `Receive From`,
`Responsible` (auto-filled, current user), product lines
(`Product | Quantity`), Add Product.
Actions: New, Validate, Print, Cancel.
Pipeline: **Draft → Ready → Done**. "To Do" moves Draft→Ready;
"Validate" moves Ready→Done. Print available once Done.

### 5.3 Delivery (Outgoing)
Flow: Pick → Pack → Validate → stock decreases.
List: same column shape as Receipts, reversed From/To.
Detail: `Reference (WH/OUT/xxx)`, `Delivery Address`, `Schedule Date`,
`Responsible`, `Operation type`, product lines, Add Product.
Actions: New, Validate, Print, Cancel.
Pipeline: **Draft → Waiting → Ready → Done**.
Rule: out-of-stock lines are flagged/alerted and shown in red.

### 5.4 Internal Transfers
Move stock between locations without changing total stock. Logged to
Move History. Example: Main Warehouse → Production Floor.

### 5.5 Move History
Central ledger. Columns: `Reference | Date | Contact | From | To |
Quantity | Status`. Multi-product references split into multiple rows.
**In-moves green, Out-moves red.** Default List View. Fed by Receipts,
Deliveries, Transfers, Adjustments (append-only).

### 5.6 Stock Adjustments
Select product/location → enter counted quantity → system computes delta,
updates stock, logs to ledger. Approval workflow unspecified —
**assumption: auto-apply, no review step (MVP)**.

### 5.7 Settings — Warehouse & Locations
Warehouse: `Name`, `Short Code`, `Address`.
Location: `Name`, `Short Code`, `Warehouse` (parent FK) — locations are
sub-units of a warehouse (rooms, racks, e.g. `WH/Stock1`).

## 6. Cross-Cutting Rules

**Reference numbering:** `<Warehouse>/<Operation>/<ID>` — Operation is
`IN` (receipt) or `OUT` (delivery), ID auto-increments.

**Status pipelines:**
| Module | Pipeline |
|---|---|
| Receipt | Draft → Ready → Done |
| Delivery | Draft → Waiting → Ready → Done |
| Dashboard filter | Draft, Waiting, Ready, Done, Canceled |

**View conventions:** every operations list defaults to List View,
toggles to Kanban grouped by status; searchable by reference & contact.

**Auto-behaviors:** `Responsible` auto-fills with current user on
Receipt/Delivery forms; Validating auto-adjusts stock and enables Print
once Done.

## 7. Out of Scope for MVP (given the 8-hour window)
- OTP delivery integration (stub the flow; real SMTP/SMS optional stretch)
- Reordering-rule automation / auto-PO creation
- Multi-warehouse transfer permission rules beyond basic Location model
- Cancellation side-effects on stock/reservations (Cancel just sets status
  for MVP, no stock reversal logic unless time allows)
- Adjustment approval workflow (auto-applies)

## 8. Open Questions (inherited from spec, not blocking MVP)
- OTP channel (email vs SMS) — defaulting to email for MVP.
- Role-based permission differences (Inventory Manager vs Warehouse Staff)
  — not enforced at the route level for MVP; both roles get equal access
  unless time allows a simple role check.
- Reordering rule thresholds — field present, logic not built.
- Cross-warehouse transfer rules — basic transfer only.
- Cancellation flow — status-only, no stock reversal in MVP.
