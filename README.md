<p align="center">
  <img src="frontend/public/brand/musify-logo.png" alt="Musify logo" width="120">
</p>

<h1 align="center">🎵 Musify</h1>

<p align="center">A full-stack music streaming web app: Next.js frontend + Express/TypeScript backend, with playlists, likes, listening history, and personalized recommendations.</p>

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-See_LICENSE-A855F7?style=for-the-badge">
</p>

## 🧩 Stack

| Layer | Tech |
|---|---|
| 🖥️ **Frontend** (`frontend/`) | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · TanStack Query · Zustand |
| ⚙️ **Backend** (`Backend/`) | Express · TypeScript · Prisma + PostgreSQL (Supabase) · Socket.IO · Zod · Winston · Sentry |
| 🔐 **Auth/DB** | Supabase (Postgres + auth) |
| 🎧 **Music data** | External third-party music catalog API |
| ⚡ **Optional infra** | Upstash Redis (distributed rate limiting + response caching) |

## 📂 Project layout

```
Backend/    Express API — routes, controllers, services, Prisma schema
frontend/   Next.js app — route groups: (marketing), (auth), (app)
```

📖 See [Backend/API_CONTRACT.md](Backend/API_CONTRACT.md) and [Backend/RUNBOOK.md](Backend/RUNBOOK.md) for API and ops details, and [frontend/README.md](frontend/README.md) for frontend architecture.

## 🚀 Getting started

### Prerequisites

- Node.js ≥ 22, npm ≥ 9
- A Supabase project (Postgres database + auth)

### ⚙️ Backend

```bash
cd Backend
cp .env.example .env   # fill in Supabase, CSRF_SECRET, etc.
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev             # http://localhost:3001
```

### 🖥️ Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:3000
```

Set `FRONTEND_URL`/`CORS_ORIGINS` in the backend `.env` to match the frontend origin, and point the frontend's API client at the backend URL.

## 📜 Scripts

| Location | Command | Purpose |
|---|---|---|
| Backend | `npm run dev` | Dev server with reload |
| Backend | `npm run build` / `npm start` | Production build/run |
| Backend | `npm test` | Jest test suite |
| Backend | `npm run prisma:studio` | Inspect the database |
| Backend | `npm run recommendations:compute` | Rebuild recommendation scores |
| frontend | `npm run dev` | Dev server |
| frontend | `npm run build` / `npm start` | Production build/run |
| frontend | `npm run lint` / `npm run typecheck` | Lint / type-check |

## 📄 License

See [LICENSE](LICENSE).
