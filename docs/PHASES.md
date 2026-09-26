# BUILD PHASES & FEATURE SLICES — StockSense

## Feature Ownership & Slices

| Slice # | Feature Domain | Owner | Key Deliverables | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Slice 1** | **Authentication & Foundation** | Full-Stack Owner | JWT Auth, Users migration `001`, Login/Signup UI, Shell Nav | **Completed** |
| **Slice 2** | **Core Catalog & Warehouses** | Full-Stack Owner | Warehouses `002`, Products `003`, Stock reference APIs | **Completed** |
| **Slice 3** | **Delivery Orders (OUT)** | Full-Stack Owner | Deliveries `005`, Status pipeline, Out-of-stock check, Validation | **Completed** |
| **Slice 4** | **Receipts (IN)** | Full-Stack Owner | Receipts `004`, Supplier check-in, Stock increment | **In Progress** |
| **Slice 5** | **Move History & Adjustments** | Full-Stack Owner | Ledger `008`, Adjustments `007`, Transfers `006` | **Completed** |

---

## Delivery Module Execution Flow

1. **Create Delivery Order**: Select source warehouse location, customer contact, and delivery address.
2. **Add Items**: Add product lines with requested quantities. Real-time availability indicator checks on-hand stock.
3. **Check Availability**: Evaluates all lines. If any item is deficient, transitions to `Waiting`. If all items are available, transitions to `Ready`.
4. **Validate & Move Stock**: Atomic execution locks rows, decrements `on_hand_qty` & `free_to_use_qty`, appends an `out` direction entry into `move_history`, and transitions to `Done`.
5. **Print & Audit**: Print packing slip enabled upon completion.
