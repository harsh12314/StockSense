# PRD — StockSense Inventory Management System

## 1. Product Overview
**StockSense** is a modern, modular Inventory Management System (IMS) designed to replace spreadsheet tracking and fragmented warehouse logs with an enterprise-grade, real-time platform. The user experience is inspired by Odoo Inventory with list/kanban views, automated reference numbers, and status pipelines.

### Primary Personas
- **Inventory Managers**: Oversee warehouse logistics, incoming vendor receipts, customer deliveries, inventory audits, and low-stock alerts.
- **Warehouse Staff**: Execute picking, packing, shelving, internal location transfers, and physical counts.

---

## 2. Authentication & Authorization
- **Sign In**: Login ID and Password authentication with custom JWT generation and secure `bcrypt` hashing.
  - Error Handling: Explicit feedback (*"Invalid Login ID or password"*).
- **Sign Up**:
  - `Login ID`: Unique, 6–12 characters.
  - `Email`: Unique valid email format.
  - `Password`: Length > 8, containing at least 1 lowercase, 1 uppercase, and 1 special character.
- **Role Model**: `inventory_manager` and `warehouse_staff`.

---

## 3. Navigation & Shell
Shared persistent navigation across all views:
1. **Operations Dashboard**: Real-time KPI summaries, scheduled activity counters, stock alerts, and quick filters.
2. **Operations**:
   - **Receipts (IN)**: Vendor incoming shipments.
   - **Deliveries (OUT)**: Customer order fulfillment and picking.
   - **Internal Transfers**: Relocations between warehouse bins.
   - **Stock Adjustments**: Inventory reconciliation.
3. **Products & Stock**: Master product catalog with real-time on-hand and free-to-use quantities.
4. **Stock Ledger (Move History)**: Immutable chronological audit trail of all product movements.
5. **Settings**: Warehouses and Internal Locations configuration.
6. **Profile / Session**: Current user context and secure logout.

---

## 4. Operational Pipelines & Status Workflows

```
┌────────────────────────────────────────────────────────┐
│               Delivery Orders (OUT) Pipeline           │
└────────────────────────────────────────────────────────┘
 [ Draft ] ──(Add Products)──> [ Waiting (Stock Shortage) ]
    │                                │
    └──(Check Availability: OK)──────┴──> [ Ready ] ──(Validate)──> [ Done (Stock Decreased) ]
                                            │
                                            └──(Cancel)──> [ Canceled ]
```

### Pipeline Definitions
| Module | State Pipeline | Key Actions |
| :--- | :--- | :--- |
| **Receipts** | `Draft` → `Ready` → `Done` | Add Supplier Items → Validate into Stock |
| **Deliveries** | `Draft` → `Waiting` → `Ready` → `Done` | Check Availability → Pick/Pack → Validate Out |
| **Transfers** | `Draft` → `Done` | Move between internal locations |
| **Adjustments** | `Draft` → `Done` | Count physical inventory → Record Delta |

---

## 5. Core Business Rules

1. **Deterministic Reference Generation**:
   - Outbound: `<WarehouseCode>/OUT/<ID>` (e.g. `WH/OUT/00001`)
   - Inbound: `<WarehouseCode>/IN/<ID>` (e.g. `WH/IN/00001`)
2. **Atomic Inventory Mutation**:
   - Every status transition that confirms goods receipt or dispatch executes inside a MySQL transaction that locks rows, adjusts `stock`, and logs to `move_history`.
3. **Out of Stock Detection**:
   - Delivery lines automatically flag missing quantities with visual alerts and prevent validation until stock availability is satisfied.
4. **Ledger Audit Trail**:
   - All inward movements marked in green (`in`), all outward movements marked in red (`out`).
