# StockSense — Inventory Management System

StockSense is a modular, high-performance Inventory Management System (IMS) inspired by Odoo Inventory. It provides real-time stock control, structured warehouse operations pipelines, automated ledger logging, and transactional inventory guarantees.

---

## Key Features

### 1. Operations Dashboard
* Real-time KPI summaries for incoming receipts, outgoing deliveries, low stock warnings, and total inventory.
* Filter bar with support for operation type, document status, warehouse location, and product category.
* Live inventory movement feed connected to the MySQL ledger.

### 2. Delivery Orders (Outgoing / OUT)
* Full operational pipeline: `Draft` → `Waiting` → `Ready` → `Done`.
* Automated stock availability checking with clear visual alerts for out-of-stock items.
* Atomic validation transactions that decrease on-hand stock and write outward records to the move history ledger.

### 3. Receipts (Incoming / IN)
* Vendor arrival workflow: `Draft` → `Ready` → `Done`.
* Product line item management with automatic stock increments upon validation.
* Reference numbering format: `<WarehouseCode>/IN/<ID>`.

### 4. Product & Stock Catalog
* Real-time visibility into `on_hand_qty` and `free_to_use_qty` across storage bins.
* Category organization, SKU search, and unit cost tracking.

### 5. Stock Ledger & Move History
* Immutable chronological audit trail recording every inventory movement.
* Color-coded directional tracking: green for incoming shipments, red for outgoing dispatches.

### 6. Authentication & Roles
* Custom JWT authentication with `bcrypt` password hashing.
* Role-based permissions supporting `inventory_manager` and `warehouse_staff`.

---

## Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Fast HMR, modular architecture, Lucide icons |
| **Styling** | Vanilla CSS Tokens | Custom commerce palette, zero heavy framework overhead |
| **Backend** | Node.js + Express 4.x | Thin routing, modular controller layers |
| **Database** | MySQL 8.x | Raw SQL via `mysql2/promise` connection pool (No ORMs) |
| **Security** | JWT + bcrypt | Stateless bearer tokens, salted password hashing |

---

## Project Structure

```
StockSense/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── api/                # API client wrapper
│   │   ├── components/         # Shared UI primitives (DataTable, FormField, Modal)
│   │   ├── features/           # Vertical slices (deliveries, receipts, products)
│   │   ├── layout/             # Navbar and Sidebar navigation
│   │   ├── App.jsx             # Route definitions
│   │   └── main.jsx            # React root
├── server/                     # Express.js Backend
│   ├── database/
│   │   ├── migrations/         # Numbered SQL migration files (001 to 008)
│   │   ├── migrate.js          # Migration runner
│   │   └── seed.js             # Database seeder
│   ├── src/
│   │   ├── controllers/        # Business logic & atomic transactions
│   │   ├── db/                 # MySQL pool connection
│   │   ├── middleware/         # JWT authentication middleware
│   │   └── routes/             # Express API routes (/auth, /deliveries, /receipts, /products, /ref)
│   └── server.js               # Main application entry point
└── docs/                       # Project Documentation Suite
    ├── PRD.md                  # Product requirements document
    ├── ARCHITECTURE.md         # System architecture & transaction rules
    ├── API.md                  # Complete REST API specification
    ├── DATABASE.md             # Schema definitions and migration workflow
    ├── DESIGN.md               # Design system & color tokens
    ├── RULES.md                # Engineering constraints
    ├── PHASES.md               # Feature slices and roadmaps
    └── GIT_WORKFLOW.md         # Git team collaboration guidelines
```

---

## Getting Started

### Prerequisites
* **Node.js**: v18 or higher
* **MySQL Server**: v8.0 or higher

---

### 1. Database Setup

1. Open your MySQL client and create the database:
   ```sql
   CREATE DATABASE stocksense_dev;
   ```

2. Configure environment variables in `server/.env`:
   ```env
   PORT=5000
   JWT_SECRET=hk_2026_s3cur3_jwt_t0k3n_x9Qm4rPzWv
   JWT_EXPIRES_IN=24h

   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=stocksense_dev
   ```

3. Run migrations and seed baseline records:
   ```bash
   cd server
   npm install
   node database/seed.js
   ```

---

### 2. Start the Backend API

```bash
cd server
npm install
node server.js
```
The API server starts on `http://localhost:5000`. Test health status at `http://localhost:5000/api/health`.

---

### 3. Start the Frontend Client

```bash
cd client
npm install
npm run dev
```
The client application runs at `http://localhost:5173`.

---

## Default Demo Credentials

| Role | Login ID | Password |
| :--- | :--- | :--- |
| **Inventory Manager** | `admin1` | `Password1!` |

---

## Documentation Links

* [Product Requirements Document (PRD)](file:///c:/Users/thvs1/OneDrive/Desktop/demo1/docs/PRD.md)
* [System Architecture](file:///c:/Users/thvs1/OneDrive/Desktop/demo1/docs/ARCHITECTURE.md)
* [REST API Specification](file:///c:/Users/thvs1/OneDrive/Desktop/demo1/docs/API.md)
* [Database Schema & Migrations](file:///c:/Users/thvs1/OneDrive/Desktop/demo1/docs/DATABASE.md)
* [Design System Specification](file:///c:/Users/thvs1/OneDrive/Desktop/demo1/docs/DESIGN.md)
