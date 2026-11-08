# LearnIQ Frontend

Multi-tenant exam management, classroom analytics, and AI coaching web client for the **LearnIQ** platform.

## Tech Stack

- **Framework & Build:** React 18, TypeScript (`strict: true`), Vite 6
- **Routing:** React Router v6
- **State Management:** Redux Toolkit (client/auth state) + TanStack Query v5 (tenant-isolated server cache)
- **HTTP Client:** Native `fetch` with single-flight token refresh and strict tenant header isolation
- **Styling & UI:** Tailwind CSS, accessible native `<dialog>` & UI primitives, Recharts
- **Testing:** Vitest + React Testing Library

## Getting Started

### 1. Prerequisites

- Node.js `>= 20.x`
- LearnIQ Backend API Gateway running (defaults to `http://localhost:8080`)

### 2. Environment Setup

Copy `.env.example` to `.env` (or `.env.local`) and adjust if your API Gateway runs on a different host/port:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Base URL for the LearnIQ Spring Cloud Gateway |

### 3. Install & Run

```bash
npm install
npm run dev
```

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite development server (`http://localhost:5173`) |
| `npm run typecheck` | Run TypeScript compiler check (`tsc --noEmit`) |
| `npm run test` | Run Vitest unit and behavioral test suites |
| `npm run build` | Type-check and build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |

