# Hotel Reservation System — Engineering Edition

A production-minded starter for a single hotel with up to 10,000 rooms, built with React, TypeScript, Tailwind CSS, Node.js, Express, and MongoDB.

## Current scope

- React + TypeScript + Vite frontend
- Express + TypeScript backend
- Environment validation with Zod
- Security headers, CORS allowlist, request logging, rate limiting
- Health endpoint and consistent API 404 response
- ESLint + Prettier + strict TypeScript configuration
- Docker Compose for local MongoDB
- GitHub Actions CI workflow

> This is the foundation, not a finished booking system. Authentication, room inventory, reservations, concurrency-safe booking, payments, and admin features will be implemented in later steps. Do not claim production readiness or load-tested capacity yet.

## Prerequisites

- Node.js 22 LTS (or a supported current LTS)
- npm
- Git
- Docker Desktop (optional, for local MongoDB)

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

PowerShell users can copy the file with:

```powershell
Copy-Item .env.example .env
```

Health check: http://localhost:5000/api/v1/health

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, usually http://localhost:5173.

### 3. MongoDB (optional at this foundation stage)

From the repository root:

```bash
docker compose up -d mongo
```

MongoDB will be available locally at `mongodb://127.0.0.1:27017/hotel_reservation`.
The initial health endpoint does not yet require a database connection; database lifecycle and readiness checks will be added in the database step.

## Useful commands

Backend:
- `npm run dev` — development server
- `npm run typecheck` — strict TypeScript check
- `npm run lint` — ESLint
- `npm run format:check` — Prettier check
- `npm run build` — compile to `dist`

Frontend:
- `npm run dev` — Vite development server
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint
- `npm run build` — production build
- `npm run preview` — preview production build

## Project structure

```text
hotel-reservation-system/
├── .github/workflows/ci.yml
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── config/env.ts
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── index.css
    │   └── main.tsx
    └── package.json
```

## Security notes

- Never commit `.env` or credentials.
- Keep payment secrets server-side only.
- The current global rate limit is a starter default and should be tuned per route and deployment topology.
- Configure `CLIENT_URL` to the exact frontend origin for the environment.
