# Convex bootstrap (OpenNova-Finance)

This repository now includes a minimal Convex bootstrap to support real-time features.

## What was added

- Dependency: `convex`
- Helper: `lib/convex/client.ts`
- Env template entries in `.env.autonomy.example`

## Environment variables

- `NEXT_PUBLIC_CONVEX_URL`: Convex deployment URL
- `CONVEX_DEPLOY_KEY`: optional server-only admin key for privileged calls
- `HEALTHCHECK_SECRET`: required header secret for `/api/health/convex`

## Usage example (server-side)

```ts
import { createConvexHttpClient } from "@/lib/convex/client"

const convex = createConvexHttpClient()
// Example (replace with your generated API refs)
// const result = await convex.query(api.health.ping, {})
```

## Health endpoint

- `GET /api/health/convex`
- Returns `200` when `NEXT_PUBLIC_CONVEX_URL` is present.
- Returns `503` when Convex is not configured yet.
- Local quick check: `pnpm health:convex` (requires app running on port 3000).

## Security

- Never expose `CONVEX_DEPLOY_KEY` to browser/client bundles.
- Keep keys in CI/Vercel/OpenClaw secret stores.
