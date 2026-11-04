# StayPilot — Hotel Reservation System

A single-hotel reservation platform built with React, TypeScript, Tailwind CSS, Node.js, Express, and MongoDB.

## Implemented

- User registration and login with scrypt password hashing and signed, expiring tokens
- Authenticated profile endpoint and active-user checks
- Admin-only room creation; public room listing and availability search
- Authenticated room reservations linked to the customer account
- Customer booking history with ownership-scoped access
- Booking cancellation restricted to the owner or an administrator
- Downloadable booking invoice PDFs
- Administrator reservation overview and room activation/deactivation controls
- Date, guest-capacity, and overlapping-booking validation
- MongoDB transaction-based reservation creation (requires a replica set)
- Helmet security headers, CORS allowlist, JSON body limit, request logging, and API rate limiting
- Backend unit/integration tests and GitHub Actions CI

Online payments/refunds, email notifications, advanced room editing, and production deployment configuration are not implemented yet. Reservations currently use pay-at-hotel / offline payment wording; no online payment is collected.

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
| GET | `/api/v1/bookings/mine` | Bearer token | List the current user's bookings |
| PATCH | `/api/v1/bookings/:id/cancel` | Owner or admin | Cancel an active booking |
| GET | `/api/v1/bookings/:id/invoice` | Owner or admin | Download a PDF invoice |
| GET | `/api/v1/bookings/admin/all` | Admin token | List recent hotel bookings |
| PATCH | `/api/v1/rooms/:id` | Admin token | Update room details or active status |

New registrations receive the `user` role. Admin role assignment is an operational task and must be performed securely by an authorized operator; public registration cannot grant admin privileges.

## Checks

Backend: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`.

Frontend: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.

## Production-readiness notes

This repository is not yet production-ready. Before launch, add refund-aware cancellation policies, payment-provider integration, email notifications, stronger token lifecycle/revocation, audit logging, deployment secrets, backups, monitoring, and load/security testing. Do not expose database credentials or payment secrets in frontend code.
