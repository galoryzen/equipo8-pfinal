# TravelHub Backend

FastAPI + SQLAlchemy async + PostgreSQL + Redis + RabbitMQ

## Setup

```bash
docker compose up --build -d
```

Gateway (simula ALB): `http://localhost:8080`

## Services

| Service      | Port | Endpoint                       |
| ------------ | ---- | ------------------------------ |
| gateway      | 8080 | `/health`                      |
| auth         | 8001 | `/api/v1/auth/health`          |
| catalog      | 8002 | `/api/v1/catalog/health`       |
| booking      | 8003 | `/api/v1/booking/health`       |
| payment      | 8004 | `/api/v1/payment/health`       |
| notification | 8005 | `/api/v1/notifications/health` |

Each service also exposes `/health/db` to check database connectivity.

## Structure

```
backend/
  nginx/          # Reverse proxy config (local ALB)
  db/             # PostgreSQL init scripts
  services/
    auth/         # User & Auth Service (schema: users)
    catalog/      # Catalog & Availability Service (schema: catalog)
    booking/      # Booking Service (schema: booking)
    payment/      # Payment Service (schema: payments)
    notification/ # Notification Service (schema: notifications)
  libs/
    contracts/    # Shared contracts (events, schemas)
```

## Stack

Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2.0, asyncpg, Pydantic v2, Redis, RabbitMQ
