# GitHub Actions — CI & deploy pipelines

Three workflows, all triggered automatically on push.  Each one shows
up on the **Actions** tab of the repository.

| File | Trigger | What it does |
|---|---|---|
| `ci.yml`         | every PR + every non-main branch push | Type-checks the web app, builds it, sanity-imports the detector chain, runs `backend/test_scan.py`. Catches regressions before they reach `main`. |
| `deploy-web.yml` | push to `main` touching `web/**`      | Builds the Next.js static export and uploads it to Azure Static Web Apps. |
| `deploy-api.yml` | push to `main` touching `backend/**` or `render.yaml` | Smoke-tests the backend, then deploys the package to an Azure App Service Python Web App. |

## Required secrets / variables

In GitHub → repo **Settings → Secrets and variables → Actions**:

### Secrets (kept private)

| Name | Value | Used by |
|---|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN`  | Azure portal → Static Web Apps → your SWA → **Manage deployment token** | `deploy-web.yml` |
| `AZUREAPPSERVICE_PUBLISHPROFILE`   | Azure portal → App Service → **Overview** → **Get publish profile** (download `.PublishSettings` file, paste full XML contents) | `deploy-api.yml` |

### Repository variables (visible in build logs — *not* for secrets)

| Name | Value | Used by |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `https://<your-app-name>.azurewebsites.net` | `ci.yml`, `deploy-web.yml` (embedded into the static bundle at build time) |
| `AZURE_WEBAPP_NAME`    | the App Service name, e.g. `trapdoor-api` | `deploy-api.yml` |

### One-time Azure-side setup for the App Service

| Setting | Value |
|---|---|
| Runtime stack | Python 3.11 (also pinned by `backend/runtime.txt`) |
| Startup command | `gunicorn -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 app.main:app` |
| Application setting `SCM_DO_BUILD_DURING_DEPLOYMENT` | `1` (lets Oryx run `pip install -r requirements.txt` on the server) |
| Application setting `AZURE_OPENAI_ENDPOINT` etc. | See `backend/.env.example` for the full env-var list |

## How a push lands

```
                ┌─────────────────────────────────────────┐
                │       push to main (or merged PR)       │
                └────────────────────┬────────────────────┘
                                     ▼
                ┌──────────────────────────────────────────┐
                │  GitHub Actions evaluates path filters   │
                └─────┬───────────────────────────────┬────┘
                      │                               │
            web/** changed                     backend/** changed
                      │                               │
                      ▼                               ▼
       ┌──────────────────────────┐   ┌──────────────────────────┐
       │  deploy-web.yml          │   │  deploy-api.yml          │
       │  npm ci → tsc → build    │   │  pip install → smoke      │
       │  Azure/static-web-apps   │   │  azure/webapps-deploy@v3 │
       └──────────────────────────┘   └──────────────────────────┘
```

If a push touches **both** `web/**` and `backend/**`, both deploy
workflows run in parallel.  Each deploy workflow has its own
`concurrency: group: deploy-<name>` so back-to-back pushes serialize
into a queue rather than racing.

## Manual triggers

Every workflow declares `workflow_dispatch:`, so you can rerun any of
them from the Actions tab UI without pushing a commit.

## Local equivalents

Same scripts that the workflows run, but on your own machine:

```bash
# CI
cd backend && python test_scan.py
cd web && npm ci && npx tsc --noEmit && npm run build

# Web deploy
cd web && ./deploy.ps1            # or ./deploy.sh

# API deploy (manual)
curl -X POST "$RENDER_DEPLOY_HOOK"
```
