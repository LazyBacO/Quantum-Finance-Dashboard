# OpenNova-Finance

Modern financial dashboard with AI-powered insights, portfolio tracking, and a futuristic UI.

## Features
- Accounts, transactions, goals, and stock actions tracking
- AI advisor with portfolio-aware guidance
- Auto-save to localStorage
- Dark mode + neon/glass visual style

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
# Optional (defaults to gpt-5.2)
OPENAI_MODEL=gpt-5.2
```

You can also set a local demo key in the browser:

```js
localStorage.setItem("openai_api_key", "your_openai_api_key")
```

## Scripts
- `pnpm dev` — run locally
- `pnpm build` — production build
- `pnpm start` — run production server
- `pnpm lint` — lint (requires eslint installed)

## Notes
- Auto-save uses localStorage (client-only).
- For SSR builds, localStorage access is guarded.
