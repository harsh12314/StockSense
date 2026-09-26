# 🎙️ StockSense — End-to-End Presentation & Demo Script

> **Tagline:** *"Know what you have, where it is, before it's a problem."*  
> **Target Audience:** Hackathon Judges, Logistics Executives, Technical Evaluators  
> **Demo URL:** `http://localhost:5173` | **Credentials:** `admin1` / `Password1!`

---

## ⏱️ Pitch Breakdown & Timings

| Segment | Duration | Focus Area | Live Screen / Action |
| :--- | :--- | :--- | :--- |
| **1. Hook & Problem** | 45 sec | Real-world warehouse pain points | Landing / Login Page with 3D Spline Canvas |
| **2. Executive Command Center** | 60 sec | Real-time visibility & proactive KPIs | Operations Dashboard (`/dashboard`) |
| **3. Inbound Flow (Receipts)** | 60 sec | Supplier receiving & automated put-away | Receipts Pipeline (`/receipts`) |
| **4. Internal Transfers & Multi-Zone**| 45 sec | Multi-warehouse inter-facility movement | Transfers & Warehouse Settings (`/transfers`) |
| **5. Outbound Flow (Deliveries)** | 60 sec | Pick, pack & dispatch with auto-deduction | Deliveries Lifecycle (`/deliveries`) |
| **6. Audit & Discrepancies** | 45 sec | Shrinkage control & Stock Ledger | Adjustments & Live Move Ledger (`/ledger`) |
| **7. Tech Stack & Architecture** | 30 sec | Reliability, atomic transactions, UX | Architecture slide / Summary |
| **8. Conclusion & Q&A** | 15 sec | Business value & closing statement | Q&A Screen |

---

## 🎬 Section-by-Section Script

---

### 1. The Hook & The Problem (45 Seconds)
**Screen:** [Login Screen (`/login`)](http://localhost:5173/login)  
*(Interactive 3D logistics scene rotating in background, clean Light Blue split-hero)*

> **Speaker Says:**  
> *"Good morning judges and fellow engineers. Today, modern supply chains move at lightning speed, but behind the scenes, warehouses are still plagued by three critical failures:*
> 1. *Ghost inventory — items listed on paper that don't exist on the shelf.*
> 2. *Blind dispatch delays — discovering an item is out of stock only after an order is received.*
> 3. *Lack of traceability — zero audit trails when items go missing across multi-location hubs.*
>
> *Legacy ERPs like SAP or Oracle are notoriously bloated, requiring months of training, while lightweight tools lack transactional integrity.*
>
> *Enter **StockSense** — an intelligent, real-time warehouse operations system designed around one single truth: **Know what you have, where it is, before it's a problem.**"*

👉 **Action:** Click **"🔑 Fill Demo Admin Credentials"** and click **"Sign In"**. Instant transition to Dashboard.

---

### 2. The Executive Command Center (60 Seconds)
**Screen:** [Operations Dashboard (`/dashboard`)](http://localhost:5173/dashboard)

> **Speaker Says:**  
> *"Welcome to the StockSense Command Center. Rather than burying staff in endless menus, our dashboard surfaces operational status at a single glance.*
>
> *Across the top, four live KPI cards query our database in real-time:*
> - ***Total SKUs in catalogue*** *(₹25 Million in active inventory).*
> - ***Pending Receipts*** *and ***Pending Deliveries*** with color-coded operational tags.*
> - *And most importantly: **Low Stock Alerts**.*
>
> *Right here in the **Low Stock Critical Items panel**, StockSense identifies items breaching their safety threshold. For example, our **Precision Barcode Scanners** and **Forklift Batteries** have dropped below minimum reorder points.*
>
> *Instead of switching tools, the manager can click **'Reorder'** directly from the alert row, instantly generating an inbound receipt order."*

👉 **Action:** Hover over the Low Stock table, click the **"Receipts Pipeline"** card to jump directly to inbound logistics.

---

### 3. Inbound Flow: Supplier Receiving to Stock Room (60 Seconds)
**Screen:** [Incoming Receipts (`/receipts`)](http://localhost:5173/receipts)

> **Speaker Says:**  
> *"Let's trace how physical goods enter our facilities.*
>
> *In the **Incoming Receipts** module, orders progress through a 3-stage validation pipeline: **Draft → Ready → Done**.*
> - *When a supplier shipment is scheduled (like this shipment from Foxconn), it arrives in **Ready** state.*
> - *The warehouse staff inspects the shipment, confirms physical counts against order lines, and clicks **Validate**.*
>
> *Behind the scenes, StockSense executes an **atomic MySQL transaction**:*
> 1. *Stock quantities in the target location increase instantly.*
> 2. *An immutable record is stamped into our **Move History Ledger**.*
> 3. *If any item was previously marked as 'Waiting Stock' in customer deliveries, the system automatically flags it as ready to ship."*

👉 **Action:** Open receipt `WH/IN/00003`, demonstrate the status stepper, line items, and print receiving slip option.

---

### 4. Internal Warehousing & Multi-Zone Transfers (45 Seconds)
**Screen:** [Internal Transfers (`/transfers`)](http://localhost:5173/transfers) & [Warehouses (`/warehouses`)](http://localhost:5173/warehouses)

> **Speaker Says:**  
> *"Inventory rarely sits in one spot. In modern logistics, stock constantly shifts between Receiving Bays, High-Rack Storage, Cold Vaults, and secondary regional distribution centers.*
>
> *Under **Warehouses & Locations**, StockSense supports multi-facility topologies. Here we have our **Central Logistics Hub** in Hyderabad with 7 storage aisles, alongside our **Coastal Gateway Facility** in Navi Mumbai and **North Distribution Depot** in Gurugram.*
>
> *In **Internal Transfers**, when stock moves from Bulk Storage to Packing Staging, StockSense guarantees atomic transfer: stock is deducted from the source bin and credited to the destination bin simultaneously in one single database commit—preventing double counting or lost in-transit inventory."*

👉 **Action:** Show the multi-facility breakdown, then navigate to Delivery Orders.

---

### 5. Outbound Flow: Pick, Pack & Dispatch (60 Seconds)
**Screen:** [Delivery Orders (`/deliveries`)](http://localhost:5173/deliveries)

> **Speaker Says:**  
> *"Now let's examine customer fulfillment.*
>
> *In **Delivery Orders**, our pipeline tracks orders across: **Draft → Waiting Stock → Ready to Ship → Done**.*
>
> *Notice our high-contrast operational status cards:*
> - *Orders like **Tesla Gigafactory** and **Amazon Fulfillment** are already dispatched and stamped as **Done**.*
> - *Orders waiting on items that haven't arrived yet are visually marked as **Waiting Stock**.*
>
> *When we open an active order, warehouse operators get a dedicated **Pick & Pack interface**:*
> - *Operators check off picked items with physical barcode verification.*
> - *Once packing is verified, clicking **'Validate Delivery'** atomically deducts on-hand inventory, updates free-to-use quantities, and prints shipping labels and bills of lading."*

👉 **Action:** Open a delivery order like `WH/OUT/00003` (Siemens), demonstrate picking checkboxes and dispatch workflow.

---

### 6. Shrinkage Control & The Immutable Stock Ledger (45 Seconds)
**Screen:** [Stock Adjustments (`/adjustments`)](http://localhost:5173/adjustments) & [Stock Ledger (`/ledger`)](http://localhost:5173/ledger)

> **Speaker Says:**  
> *"What happens when reality doesn't match theory? Damaged goods, client samples, or human error?*
>
> *Rather than letting discrepancies fester, StockSense provides **Stock Adjustments & Physical Counts**:*
> - *Staff enter cycle counts, and the system automatically calculates the variance delta.*
> - *Every delta requires an operational reason code and staff signature.*
>
> *Finally, everything culminates in the **Stock Ledger & Move History**.*
> *This is our financial-grade, immutable audit log. Every single gram of stock that entered, moved, or departed is stamped with exact timestamps, partner contacts, location paths, and reference IDs.*
> *Managers can filter by Inbound, Outbound, or Adjustments, making quarterly compliance audits effortless."*

👉 **Action:** Show the ledger search and pill filters (`Incoming`, `Outgoing`, `Adjustments`).

---

### 7. Technical Architecture & Engineering Highlights (30 Seconds)

> **Speaker Says:**  
> *"Under the hood, StockSense is built for speed, resilience, and user delight:*
> - **Frontend:** *React with a high-contrast Light Blue design system, dynamic document routing, and interactive WebGL Spline 3D viewport.*
> - **Backend:** *Node.js & Express REST API with strict JWT authentication and role-based authorization.*
> - **Database:** *MySQL with foreign-key referential integrity, indexed status lookups, and ACID transactions for guaranteed stock safety.*
> - **Zero-Friction UX:** *Inline live stock editing, keyboard navigation, and instant search across tens of thousands of SKUs."*

---

### 8. Closing Statement (15 Seconds)

> **Speaker Says:**  
> *"StockSense transforms warehouse operations from a chaotic guessing game into a predictable, transparent, and profitable engine.*
>
> *Thank you, and we welcome your questions!"*

---

## 🎯 Quick Speaker Cue Cards & Cheat Sheet

```
┌────────────────────────────────────────────────────────┐
│ 1. LOGIN (30s)                                         │
│    "Ghost inventory, blind delays, zero audit trail." │
│    Click 'Fill Demo Credentials' -> Sign In            │
├────────────────────────────────────────────────────────┤
│ 2. DASHBOARD (45s)                                     │
│    4 live KPIs -> Low stock warnings -> Reorder button │
├────────────────────────────────────────────────────────┤
│ 3. RECEIPTS (45s)                                      │
│    Draft -> Ready -> Validate -> Stock auto-increments │
├────────────────────────────────────────────────────────┤
│ 4. TRANSFERS & WAREHOUSES (30s)                        │
│    3 Hubs (Central, Coastal, North) -> Atomic transfer │
├────────────────────────────────────────────────────────┤
│ 5. DELIVERIES (45s)                                    │
│    Pick & Pack checklist -> Validate -> Stock decrements│
├────────────────────────────────────────────────────────┤
│ 6. ADJUSTMENTS & LEDGER (30s)                          │
│    Variance delta -> Financial-grade audit trail       │
├────────────────────────────────────────────────────────┤
│ 7. TECH & CONCLUSION (20s)                             │
│    React + Node + MySQL ACID + Spline 3D               │
│    "Know what you have, before it's a problem."        │
└────────────────────────────────────────────────────────┘
```
