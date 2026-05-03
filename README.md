# 📦 StockOS — Smart Inventory Management System

A full-stack inventory management system built with **Node.js + Express**, **React + Vite**, **PostgreSQL + Prisma**, and **JWT authentication**.

---

## 🗂️ Project Structure

```
smart-inventory/
├── docker-compose.yml          # Full stack orchestration
├── .env                        # Root environment variables
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/
│   │       └── 20260503120000_init/
│   │           └── migration.sql
│   └── src/
│       ├── server.js           # Entry point
│       ├── app.js              # Express setup
│       ├── config/
│       │   └── database.js     # Prisma client
│       ├── controllers/        # Request handlers
│       │   ├── auth.controller.js
│       │   ├── product.controller.js
│       │   ├── inventory.controller.js
│       │   ├── transaction.controller.js
│       │   ├── report.controller.js
│       │   └── category.controller.js
│       ├── services/           # Business logic
│       │   ├── auth.service.js
│       │   ├── product.service.js
│       │   ├── inventory.service.js
│       │   ├── transaction.service.js
│       │   ├── report.service.js
│       │   └── category.service.js
│       ├── middleware/
│       │   ├── auth.middleware.js      # JWT verify
│       │   ├── error.middleware.js     # Global error handler
│       │   └── validate.middleware.js  # express-validator
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── product.routes.js
│       │   ├── inventory.routes.js
│       │   ├── transaction.routes.js
│       │   ├── report.routes.js
│       │   └── category.routes.js
│       └── utils/
│           └── seed.js         # Database seeder
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx             # Routes
        ├── index.css           # Global styles / design tokens
        ├── services/
        │   └── api.js          # Axios instance + interceptors
        ├── context/
        │   └── authStore.js    # Zustand auth state
        ├── components/
        │   ├── layout/
        │   │   ├── Layout.jsx
        │   │   └── Layout.module.css
        │   └── ui/
        │       └── index.jsx   # StatCard, Badge, Button, Modal, Table…
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx
            ├── ProductsPage.jsx
            ├── InventoryPage.jsx
            ├── TransactionsPage.jsx
            └── ReportsPage.jsx
```

---

## 🚀 Quick Start — Option A: Docker (Recommended)

### Prerequisites
- Docker + Docker Compose installed

### Steps

```bash
# 1. Clone / unzip the project
cd smart-inventory

# 2. Start all services (DB + backend + frontend)
docker-compose up --build

# Services started:
#   PostgreSQL  → localhost:5432
#   Backend API → http://localhost:4000
#   Frontend    → http://localhost:3000
```

The backend will automatically:
- Push the Prisma schema to the DB
- Seed demo data (products, users, transactions)

Open **http://localhost:3000** and log in with:
- `admin@stockos.com` / `admin123`
- `operator@stockos.com` / `operator123`
- `seller@stockos.com` / PIN `1234`

---

## ☁️ Free Deploy: Render + Aiven

This project can run for free as:
- one Aiven Free PostgreSQL service
- one Render Free Web Service using `Dockerfile.koyeb`

The web service serves both the React frontend and the Express API from the same public domain. API routes stay under `/api`, while all other routes return the React app.

### 1. Create PostgreSQL

Create an Aiven Free PostgreSQL service and copy its connection string.

Aiven free PostgreSQL does not require a credit card, has no fixed 30-day expiry, and includes 1 GB disk storage.

### 2. Create Web Service

Create a Render Blueprint from this GitHub repository. Render will read `render.yaml`.

```text
Repository: Bekezhan01/smart-inventory
Branch: main
Blueprint file: render.yaml
Runtime: Docker
Plan: Free
```

### 3. Environment variables

Render will ask for the variables marked `sync: false` in `render.yaml`. Set them like this:

```env
DATABASE_URL=<Aiven PostgreSQL connection string>
FRONTEND_URL=https://<your-render-domain>
WEBAUTHN_RP_ID=<your-render-domain-without-https>
WEBAUTHN_ORIGIN=https://<your-render-domain>
```

Do not set `VITE_API_URL` for this single-service deployment. The frontend uses `/api` by default.

On every production start, `npm start` runs Prisma migrations and the idempotent seed before starting the API.

Render Free Web Services spin down after inactivity and wake on the next request. First request after sleep can take about a minute.

---

## 🛠️ Option B: Local Development (No Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### Step 1 — Set up PostgreSQL

```sql
CREATE DATABASE inventory_db;
CREATE USER inventory_user WITH PASSWORD 'inventory_pass';
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;
```

### Step 2 — Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set your DATABASE_URL:
# DATABASE_URL="postgresql://inventory_user:inventory_pass@localhost:5432/inventory_db"

# Generate Prisma client
npm run db:generate

# Push schema to DB
npm run db:push

# Seed demo data
npm run db:seed

# Start development server
npm run dev
# → API running at http://localhost:4000
```

### Step 3 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# VITE_API_URL=http://localhost:4000/api

# Start dev server
npm run dev
# → App running at http://localhost:3000
```

---

## 🔑 API Reference

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/profile` | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all (search, page, limit, categoryId) |
| GET | `/api/products/:id` | Get one |
| POST | `/api/products` | Create (ADMIN/OPERATOR) |
| PUT | `/api/products/:id` | Update (ADMIN/OPERATOR) |
| DELETE | `/api/products/:id` | Delete (ADMIN only) |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List inventory |
| GET | `/api/inventory/summary` | Dashboard summary |
| GET | `/api/inventory/alerts` | Low stock items |
| GET | `/api/inventory/:productId` | Get one |
| PUT | `/api/inventory/:productId` | Update stock/location |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List (filter by type, product, date) |
| GET | `/api/transactions/:id` | Get one |
| POST | `/api/transactions` | Record IN/OUT/ADJUSTMENT |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Dashboard stats |
| GET | `/api/reports/transactions` | Transaction trend (groupBy=day/week/month) |
| GET | `/api/reports/top-products` | Top products by volume |
| GET | `/api/reports/inventory` | Inventory by category |
| GET | `/api/reports/forecast` | Demand forecast (AI) |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all |
| POST | `/api/categories` | Create |
| PUT | `/api/categories/:id` | Update |
| DELETE | `/api/categories/:id` | Delete |

---

## 🧠 Demand Forecasting Logic

The `/api/reports/forecast` endpoint uses a **moving average algorithm**:

1. Pulls all OUT transactions for the past 30 days per product
2. Calculates **average daily demand** = total_out / 30
3. **Forecasts next 7 days** = avg_daily * 7
4. Calculates **days of stock remaining** = current_qty / avg_daily
5. Detects **trend** by comparing last 7 days vs prior 7 days:
   - `increasing` if recent > prior × 1.2
   - `decreasing` if recent < prior × 0.8
   - `stable` otherwise
6. Flags products needing reorder if days_of_stock < 14

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| ADMIN | Full access: create, edit, delete products, manage users |
| OPERATOR | Create/edit products, manage inventory, record transactions, view reports |
| SELLER | Use POS, create sales, view own sales/settings |

---

## 🔧 Environment Variables

### Backend `.env`
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/inventory_db"
JWT_SECRET=your_secret_key_change_in_production
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:4000/api
```

### Production startup

For production backend deployments use the default start command:

```bash
npm start
```

This applies Prisma migrations and runs the idempotent seed before starting the API, so a reinitialized database gets the required roles, users, categories, products, inventory records, and demo transactions.

If the frontend is deployed separately from the backend, set:

```env
VITE_API_URL=https://your-backend-host/api
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Recharts, Zustand, Axios, React Router v6 |
| Backend | Node.js, Express 4, Prisma ORM |
| Database | PostgreSQL 15 |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Validation | express-validator |
| Security | Helmet, CORS, Rate limiting |
| DevOps | Docker, Docker Compose, Nginx |

---

## 🐛 Troubleshooting

**Database connection refused**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432
# Or in Docker:
docker-compose ps
```

**Prisma schema out of sync**
```bash
cd backend
npm run db:deploy  # apply production migrations
npm run db:seed    # restore required bootstrap data
```

**Port already in use**
```bash
# Change ports in docker-compose.yml or .env
# Backend default: 4000, Frontend default: 3000
```

**JWT token expired**
- Tokens expire in 7 days by default
- Just log in again — the frontend auto-redirects on 401

---

## 📄 License
MIT — Free to use and modify.
