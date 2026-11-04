# StayPilot — Hotel Reservation System

A single-hotel reservation platform built with React, TypeScript, Tailwind CSS, Node.js, Express, and MongoDB.

## Implemented

- User registration and login with scrypt password hashing and signed, expiring tokens
- Authenticated profile endpoint and active-user checks
- Admin-only room creation; public room listing and availability search
- Authenticated room reservations using the account profile for guest identity
- Date, guest-capacity, and overlapping-booking validation
- MongoDB transaction-based reservation creation (requires a replica set)
- Helmet security headers, CORS allowlist, JSON body limit, request logging, and API rate limiting
- Backend unit/integration tests and GitHub Actions CI

Payments, cancellation/refunds, customer booking history, email notifications, and production deployment configuration are not implemented yet.

## Requirements

- Node.js 22+
- npm
- Docker Desktop (recommended for local MongoDB)

## Local setup

### 1. Start MongoDB

From the repository root:

```bash
docker compose up -d mongo
```

The MongoDB service is configured as a single-node replica set because booking creation uses transactions. Initialize the replica set once:

```bash
docker exec hotel-reservation-mongo mongosh --quiet --eval "try { rs.status().ok } catch (e) { rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]}) }"
```

### 2. Configure and start the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

PowerShell:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Health endpoint: http://localhost:5000/api/v1/health

Set a unique, random `JWT_SECRET` of at least 32 characters before deployment. Never commit `.env`.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite development server proxies `/api` requests to the backend. For another API origin, set `VITE_API_URL` in the frontend environment.

## API overview

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Public | Health check |
| POST | `/api/v1/auth/register` | Public | Create an account |
| POST | `/api/v1/auth/login` | Public | Sign in |
| GET | `/api/v1/auth/me` | Bearer token | Current account |
| GET | `/api/v1/rooms` | Public | Paginated room inventory |
| GET | `/api/v1/rooms/availability` | Public | Search available rooms |
| GET | `/api/v1/rooms/:id` | Public | Room details |
| POST | `/api/v1/rooms` | Admin token | Create a room |
| POST | `/api/v1/bookings` | Bearer token | Reserve an available room |

New registrations receive the `user` role. Admin role assignment is an operational task and must be performed securely by an authorized operator; public registration cannot grant admin privileges.

## Checks

Backend: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`.

Frontend: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.

## Production-readiness notes

This repository is not yet production-ready. Before launch, add booking history and cancellation policies, payment-provider integration, email notifications, stronger token lifecycle/revocation, audit logging, deployment secrets, backups, monitoring, and load/security testing. Do not expose database credentials or payment secrets in frontend code.
