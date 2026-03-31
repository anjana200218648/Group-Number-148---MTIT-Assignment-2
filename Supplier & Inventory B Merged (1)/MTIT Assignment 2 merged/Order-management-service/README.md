# 🍽️ Order Management Microservice
## Restaurant Supply Chain System

A production-ready **Order Management Microservice** built with **FastAPI** (Python) + **Firebase Firestore** backend and **React + TypeScript** frontend.

---

## 🏗️ Architecture

```
Order Management Service/
├── order-service/              ← FastAPI Backend (port 8083)
│   ├── app/
│   │   ├── main.py             ← App entry, CORS, routes
│   │   ├── routes/             ← FastAPI routers
│   │   ├── controllers/        ← Request handlers
│   │   ├── services/           ← Business logic + Firestore ops
│   │   ├── models/             ← Pydantic data models
│   │   ├── database/           ← Firebase initialization
│   │   └── utils/              ← Logger, helpers
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                   ← React + TypeScript UI (port 8000)
    ├── src/
    │   ├── api/                ← Axios API client
    │   ├── components/         ← StatusChip, Sidebar, StatusFlow
    │   ├── pages/              ← Dashboard, OrdersList, Detail, Create
    │   └── types/              ← TypeScript interfaces
    └── package.json
```

---

## 🔧 Backend Setup

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project → Enable **Firestore Database**
3. Go to **Project Settings → Service Accounts**
4. Generate a new private key → download as `serviceAccountKey.json`
5. Place `serviceAccountKey.json` in the `order-service/` folder

### 2. Install & Run

```bash
cd order-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8083 --reload
```

Backend runs at: **http://localhost:8083**  
Swagger UI: **http://localhost:8083/docs**  
ReDoc: **http://localhost:8083/redoc**

---

## 🌐 Frontend Setup

```bash
cd frontend
npm install
npm start        # Starts on port 8000
```

Frontend runs at: **http://localhost:8000**

---

## 📦 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/orders/` | Create a new order |
| `GET` | `/api/v1/orders/` | Get all orders (with filters) |
| `GET` | `/api/v1/orders/{id}` | Get single order |
| `PUT` | `/api/v1/orders/{id}` | Update order details |
| `PATCH` | `/api/v1/orders/{id}/status` | Update order status |
| `DELETE` | `/api/v1/orders/{id}` | Delete pending order |
| `GET` | `/health` | Health check |

### Query Filters (GET /orders)
- `restaurant_id` — filter by restaurant
- `supplier_id` — filter by supplier
- `status` — filter by status value

---

## 📝 Sample Requests

### Create Order
```json
POST /api/v1/orders/
{
  "restaurant_id": "REST-001",
  "supplier_id": "SUP-042",
  "items": [
    { "name": "Olive Oil", "quantity": 10, "price": 12.50 },
    { "name": "Pasta",     "quantity": 5,  "price": 3.99  }
  ]
}
```

### Update Status
```json
PATCH /api/v1/orders/{id}/status
{
  "new_status": "Approved",
  "note": "Reviewed and approved by manager"
}
```

---

## 🔥 Status Workflow

```
Pending → Approved → Dispatched → Delivered
    ↓          ↓           ↓
 Cancelled  Cancelled   Cancelled
```

---

## 🗂️ Firestore Structure

```
orders/
  {order_id}/
    order_id        : string
    restaurant_id   : string
    supplier_id     : string
    items           : array [ { name, quantity, price } ]
    total_price     : number (auto-calculated)
    status          : string (Pending|Approved|Dispatched|Delivered|Cancelled)
    status_history  : array [ { from_status, to_status, changed_at, note } ]
    created_at      : ISO timestamp
    updated_at      : ISO timestamp
```

---

## ✅ Features Implemented

- [x] Order Creation with auto total calculation
- [x] Bulk items support
- [x] Valid status transition enforcement
- [x] Status change history tracking
- [x] Filter orders by restaurant, supplier, status
- [x] Item modification (Pending only)
- [x] Delete (Pending only)
- [x] Input validation (empty orders, qty > 0, price > 0)
- [x] Structured logging (file + console)
- [x] Swagger / ReDoc documentation
- [x] CORS enabled for frontend integration
- [x] Proper HTTP status codes
- [x] React UI with Dashboard, Create, List, Detail pages
- [x] Status flow visualization
- [x] Dark theme with brown/beige palette
