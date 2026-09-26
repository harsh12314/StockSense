# ARCHITECTURE — StockSense

## 1. System Architecture Overview

StockSense is built as a lightweight, modular, full-stack Inventory Management System (IMS). It emphasizes raw database performance, transactional consistency, and clean modular boundaries without heavy third-party abstractions.

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite Client                  │
│  (Tailored Commerce UI, Feature Modules, JWT Auth)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON API
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Express.js Backend API                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Middlewares (CORS, JSON Parser, JWT Auth)        │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Route Modules (/auth, /deliveries, /ref, ...)    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Controllers & Atomic Transaction Logic           │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │ Parameterized SQL
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Local MySQL Database                  │
│ (Users, Warehouses, Products, Stock, Ledger, Moves)    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Key Details & Choices |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Fast HMR, component modularity, Lucide icons |
| **Styling** | Vanilla CSS Design System | Custom commerce palette, zero heavy CSS framework overhead |
| **Backend** | Node.js + Express 4.x | Thin routing, modular controller layers |
| **Database** | MySQL 8.x (Native Local) | Raw SQL via `mysql2/promise` connection pool (No ORMs) |
| **Authentication** | Self-issued JWT + bcrypt | Stateless bearer tokens (24h expiry), password hashing |

---

## 3. Standard API Envelope

Every API response strictly follows the unified response envelope:

### ✅ Success Envelope
```json
{
  "success": true,
  "data": { ... }
}
```

### ❌ Error Envelope
```json
{
  "success": false,
  "error": {
    "message": "Human-readable descriptive error message"
  }
}
```

---

## 4. Key Architectural Patterns

### 4.1 Stock Mutation & Move Ledger Atomicity
Any operation that alters inventory quantities (`Validate Delivery`, `Validate Receipt`, `Internal Transfer`, `Stock Adjustment`) **must** be executed within a single MySQL transaction:

1. Acquire row-level lock on the target stock records (`SELECT ... FOR UPDATE`).
2. Verify availability (`on_hand_qty >= required_qty`).
3. Apply stock delta (`INSERT ... ON DUPLICATE KEY UPDATE`).
4. Append an immutable record to `move_history`.
5. Update parent document status (`ready` / `done`).
6. `COMMIT` transaction (or `ROLLBACK` on any failure).

### 4.2 Reference Numbering Convention
Auto-generated standardized document codes:
$$\text{Reference} = \langle\text{WarehouseCode}\rangle / \langle\text{Operation}\rangle / \langle\text{PaddedID}\rangle$$

* Examples: `WH/OUT/00001`, `CENTRAL/IN/00042`, `WH/TRANS/00015`

### 4.3 Feature Slice Modularity
- **Client**: `client/src/features/<feature-name>/` houses all feature-specific state, modals, and views.
- **Server**: `server/src/controllers/<feature>Controller.js` and `server/src/routes/<feature>.js`.
- **Database**: `server/database/migrations/00X_<feature>.sql`.
