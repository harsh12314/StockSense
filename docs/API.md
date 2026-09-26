# REST API SPECIFICATION — StockSense

Base URL: `http://localhost:5000/api`

All endpoints (except `/auth/signup`, `/auth/login`, and `/health`) require the HTTP Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. System & Health

### `GET /health`
* **Description**: Returns backend health status and server timestamp.
* **Auth**: Public
* **Response**:
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "timestamp": "2026-09-26T05:52:27.204Z"
    }
  }
  ```

---

## 2. Authentication (`/auth`)

### `POST /auth/signup`
* **Auth**: Public
* **Body**:
  ```json
  {
    "loginId": "staff_jane",
    "email": "jane@stocksense.io",
    "password": "Password123!",
    "role": "warehouse_staff"
  }
  ```
* **Validation**:
  - `loginId`: 6–12 characters, alphanumeric/underscores.
  - `password`: Length > 8, at least 1 uppercase, 1 lowercase, 1 special character.

### `POST /auth/login`
* **Auth**: Public
* **Body**:
  ```json
  {
    "loginId": "admin1",
    "password": "Password1!"
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Login successful!",
      "token": "eyJhbGciOi...",
      "user": {
        "id": 1,
        "loginId": "admin1",
        "email": "admin@stocksense.com",
        "role": "inventory_manager"
      }
    }
  }
  ```

### `GET /auth/profile`
* **Auth**: Bearer Token
* **Response**: Returns authenticated user profile details.

---

## 3. Delivery Orders (`/deliveries`)

### `GET /deliveries`
* **Query Params**:
  - `status` (`draft` | `waiting` | `ready` | `done` | `canceled`)
  - `search` (matches reference or customer contact)
  - `warehouse_id` (filters by warehouse)
* **Response**: Array of delivery summary objects with line count and responsible user.

### `GET /deliveries/stats`
* **Response**:
  ```json
  {
    "success": true,
    "data": {
      "late_count": 0,
      "waiting_count": 1,
      "operations_count": 3,
      "to_deliver_count": 4,
      "done_count": 8,
      "total_count": 12
    }
  }
  ```

### `GET /deliveries/:id`
* **Response**: Single delivery object with detailed product line items, available stock quantities, and source warehouse/location details.

### `POST /deliveries`
* **Body**:
  ```json
  {
    "from_location_id": 1,
    "to_contact": "Acme Retailers",
    "delivery_address": "742 Evergreen Terrace, Sector 4",
    "schedule_date": "2026-09-30",
    "operation_type": "Delivery Orders"
  }
  ```
* **Auto-generated**: Reference formatted as `<WarehouseCode>/OUT/<ID>` (e.g. `WH/OUT/00001`).

### `PUT /deliveries/:id`
* **Body**: Header update fields (`to_contact`, `delivery_address`, `schedule_date`, `operation_type`, `from_location_id`). Allowed only in `draft` or `waiting` state.

### `POST /deliveries/:id/lines`
* **Body**: `{ "product_id": 2, "quantity": 10 }`
* **Behavior**: Checks availability against source location and auto-flags `out_of_stock: true` if quantity exceeds on-hand stock.

### `DELETE /deliveries/:id/lines/:lineId`
* **Behavior**: Removes line item from draft/waiting delivery.

### `POST /deliveries/:id/check-availability`
* **Behavior**: Rechecks inventory on all lines. Sets status to `ready` if all stock is available, or `waiting` if any item is out of stock.

### `POST /deliveries/:id/validate`
* **Behavior**: Validates `ready` delivery:
  1. Decreases physical stock from source location.
  2. Inserts outward transaction record into `move_history`.
  3. Transitions status to `done`.

### `POST /deliveries/:id/cancel`
* **Behavior**: Cancels delivery order.

---

## 4. Reference Data (`/ref`)

| Endpoint | Description |
| :--- | :--- |
| `GET /ref/products` | Returns products with category names and computed `total_on_hand` and `total_free_to_use`. |
| `GET /ref/products/:id/stock` | Returns stock breakdown for product across specific locations. |
| `GET /ref/warehouses` | Returns list of configured warehouses. |
| `GET /ref/locations` | Returns storage bins/locations filtered by `warehouse_id`. |
| `GET /ref/categories` | Returns product categories. |
