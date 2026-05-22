# Deployment target decision

## Decision

Use **Railway with Docker** for the first investor/mentor deployment.

## Why

- SQLite and Puppeteer already work in a Node container.
- No Postgres migration is required before the Startup Geeks / mentor demo.
- Railway supports persistent volumes for `data/database.sqlite`.
- Docker keeps Chromium dependencies explicit.

## Tradeoff

This is simpler than Vercel + Postgres + Browserless, but you must configure a
persistent Railway volume mounted at `/app/data`. Without a volume, SQLite data
will be ephemeral.

## Required environment variables

```env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL_PRIMARY=deepseek/deepseek-v4-pro
OPENROUTER_MODEL_CRITIC=deepseek/deepseek-v4-pro
QUALITY_GATE_THRESHOLD=75
DOCUMENT_GENERATION_TOKEN=...
NEXT_PUBLIC_DOCUMENT_GENERATION_TOKEN=...
```

## Smoke checks after deploy

1. Open `/api/health` and verify `{ "ok": true }`.
2. Complete the intake phase.
3. Generate the final document.
4. Export the phase PDF.
5. Complete all phases, then export the data room ZIP.

Do **not** run `npm run build` locally just to verify this file; deployment
builds inside Docker.
