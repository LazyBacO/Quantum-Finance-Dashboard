# OpenNova-Finance

Modern financial dashboard with AI-powered insights, portfolio tracking, and a futuristic UI.

## Features
- Accounts, transactions, goals, and stock actions tracking
- AI advisor with portfolio-aware guidance
- Auto-save to localStorage
- Dark mode + neon/glass visual style
- Server sync API with per-user sync key (`/api/portfolio`)
- Monthly budget planner by category
- Smart alerts, goal simulator, and CSV import/export tools
- CI quality gates (typecheck, lint, tests, build)

## Getting Started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 (redirects to `/dashboard`).

## AI Setup

Create a `.env.local` file:

```bash
OPENAI_API_KEY=your_openai_api_key
# Optional (defaults to gpt-5.3-codex)
OPENAI_MODEL=gpt-5.3-codex
# Optional UI label (defaults to GPT-5.3-Codex)
NEXT_PUBLIC_OPENAI_MODEL_LABEL=GPT-5.3-Codex
# Optional public canonical URL for SEO metadata
NEXT_PUBLIC_SITE_URL=https://your-domain.example
# Optional: secure /api/notification-cron with this secret
NOTIFICATION_CRON_SECRET=your_cron_secret
```
For security reasons, `/api/chat` only accepts the server-side key (`OPENAI_API_KEY`).
If `NOTIFICATION_CRON_SECRET` is set, `/api/notification-cron` requires either `x-cron-secret` or `Authorization: Bearer <secret>`.

## Scripts
- `pnpm dev` — run locally
- `pnpm build` — production build
- `pnpm start` — run production server
- `pnpm typecheck` — TypeScript validation (`tsc --noEmit`)
- `pnpm lint` — ESLint checks
- `pnpm test` — unit tests (Vitest)

## Notes
- Auto-save uses localStorage (client-only).
- For SSR builds, localStorage access is guarded.
