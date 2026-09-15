# MUSIFY Frontend

A modern music streaming web application built with Next.js App Router, React 19, TypeScript, Tailwind CSS, TanStack Query, and Zustand.

## Architecture

- `app/`: Next.js App Router route groups (`(marketing)`, `(auth)`, `(app)`)
- `components/`: UI, layout, music, player, search, recommendations, ai, and provider components
- `lib/`: Centralized API clients, authentication helpers, audio engine, constants, and utilities
- `hooks/`: Reusable React hooks for auth, player, audio, search, etc.
- `stores/`: Zustand stores for client-side state (player, auth, UI)
- `types/`: Domain TypeScript type definitions matching backend API contracts

## Development

```bash
npm run dev
```

Runs the application at [http://localhost:3000](http://localhost:3000).
