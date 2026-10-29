# Deploy the OpenTerminal backend

This repository includes a Render Blueprint at the root `render.yaml`. It builds the API from `server/Dockerfile`, checks `/api/status) after deployment, and mounts a persistent disk at `/app/data` for SQLite.

## Deploy with Render Blueprint

1. Push the latest `main` branch to GitHub.
2. Open the [Render Dashboard](https://dashboard.render.com/).
3. Choose **New + → Blueprint** and select this repository.
4. Review the `openterminal-api` service and apply the Blueprint.
5. Wait for the Docker build and deploy to finish. The health check should return JSON from `/api/status`.
6. Open the service's **Environment** page and copy its generated `API_KEY`. Treat it like a password; do not commit it to GitHub.
7. Copy the public Render service URL, for example `https://openterminal-api-xxxx.onrender.com`.

The Blueprint uses a Render Starter service and a 1 GB persistent disk so SQLite data survives restarts and deploys. These are paid Render resources; confirm current pricing in Render before applying it.

## Connect the Vercel frontend

In the Vercel project settings, set these environment variables for Production (and Preview if you use preview deployments):

| Variable | Value |
|---|---|
| `API_URL` | Your Render service URL, with no trailing slash and no `/api` suffix |
| `API_KEY` | The exact generated key from the Render API service |

Redeploy the Vercel frontend after changing environment variables. The backend's `WEB_ORIGIN` must match the frontend's exact browser origin. The default Blueprint value is `https://open-terminal-roan.vercel.app`; update it if your Vercel domain differs, then redeploy the backend.

## Optional integrations

Set these only if you use the corresponding feature. Keep secrets in Render's Environment settings, never in frontend environment variables or source control.

- `ANTHROPIC_API_KEY`: enables AI responses.
- `ANTHROPIC_MODEL`: optional; defaults to `claude-opus-4-8`.
- `ALPACA_API_KEY` and `ALPACA_SECRET_KEY`: enable the Alpaca account test.
- `ALPACA_PAPER=true`: uses Alpaca paper trading endpoints; this is the default unless explicitly set to `false`.
- `RSS_FEEDS`: optional comma-separated list of trusted HTTPS RSS/Atom URLs.

## Verify the backend

Open `https://YOUR-RENDER-SERVICE.onrender.com/api/status`. A healthy service returns JSON containing `ok: true`, a timestamp, provider status and whether the AI key is configured.

The authenticated integrations endpoints also require the shared `API_KEY`. The public status endpoint is only a health check; it does not prove that AI or broker credentials are valid. Use **Settings → Integration health → Test API / Test account** for the provider handshakes that are implemented.

## Troubleshooting

- **TypeScript build error:** check the first `tsc` error, not only the final Docker failure. The IP-validation syntax error previously reported in `server/src/routes/integrations.ts` has been fixed in `main`.
- **Health check fails:** inspect Render logs and confirm the service starts on the port supplied by Render. The API reads `PORT` and binds to `0.0.0.0` when `API_HOST=0.0.0.0`.
- **Frontend gets 401:** ensure Vercel's `API_KEY` exactly matches Render's generated `API_KEY`, then redeploy Vercel.
- **Browser reports CORS:** ensure Render's `WEB_ORIGIN` exactly matches the frontend origin, without a trailing slash.
- **SQLite data disappears:** confirm the persistent disk is mounted at `/app/data` and `DATA_DIR=/app/data`.
- **Docker build fails:** check the complete Render build log; a Docker failure can be the final symptom of a TypeScript or dependency error earlier in the log.

## Local Docker build

From the repository root:

```bash
docker build -f server/Dockerfile -t openterminal-api .
docker run --rm -p 4000:4000 \
  -e API_HOST=0.0.0.0 \
  -e API_KEY=replace-with-a-long-random-secret \
  -e WEB_ORIGIN=http://localhost:3000 \
  -e DATA_DIR=/app/data \
  -v openterminal-data:/app/data \
  openterminal-api
```

Then visit `http://localhost:4000/api/status`.
