# AI Advisor setup

This project’s AI Advisor uses the Vercel AI SDK. The server route is `app/api/chat/route.ts`.

## Recommended (server-side key)

1. Create a `.env.local` file (not committed) with:

```bash
OPENAI_API_KEY=your_openai_api_key

# Optional (defaults to gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

2. Restart the dev server:

```bash
pnpm dev
```

## Alternative (local demo only)

You can also store the key in the browser and let the UI send it with each request:

- `localStorage.setItem("openai_api_key", "your_openai_api_key")`

Notes:
- Do **not** do this for production apps.
- Prefer `OPENAI_API_KEY` for local development.

