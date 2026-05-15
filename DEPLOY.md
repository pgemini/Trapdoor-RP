# Deploying Trapdoor — Free Tier

Free hosting for the whole app, auto-deployed from this GitHub repo:

| Piece | Host | Free tier |
|---|---|---|
| **Frontend** (Next.js) | [Vercel](https://vercel.com)   | 100 GB bandwidth / month, unlimited builds, custom domain |
| **Backend**  (FastAPI) | [Render](https://render.com)   | 512 MB / 0.1 CPU, sleeps after 15 min idle, cold starts in ~30 s |

Both auto-deploy on every `git push` to the `main` branch.

---

## 1 · Backend → Render

1. Sign in to [render.com](https://render.com) with GitHub (free).
2. **New +** → **Blueprint** → pick `pgemini/Trapdoor-RP`.
3. Render reads [`render.yaml`](render.yaml) and stages the `trapdoor-api` service. Click **Apply**.
4. After the first build, open the service → **Environment** → add these **secret** values
   (left as `sync: false` in the blueprint, so Render won't try to read them from anywhere):

   | Variable | Value |
   |---|---|
   | `AZURE_OPENAI_ENDPOINT` | `https://carerelay-1-resource.services.ai.azure.com/api/projects/carerelay-1/openai/v1/responses` |
   | `AZURE_OPENAI_API_KEY` | *(your rotated Foundry key)* |
   | `AZURE_REALTIME_ENDPOINT` | `https://carerelay-1-resource.services.ai.azure.com` |

5. Trigger a manual deploy from the dashboard (or just push to `main`).
6. After the build is green, hit `https://<your-service>.onrender.com/api/healthz` — you should see
   ```json
   { "ok": true, "ai_foundry": true, "transcription": { "enabled": true, "mode": "azure-deployment" } }
   ```

> **Why the seed samples are committed**: TTS (`pyttsx3`) and OpenCV's
> VideoWriter only run reliably on Windows / desktop. Render's headless Linux
> can't regenerate the audio + video demo files, so they're pre-generated and
> committed under `backend/samples/`. The committed files are 2.5 MB total.

---

## 2 · Frontend → Vercel

1. Sign in to [vercel.com](https://vercel.com) with GitHub (free).
2. **Add New → Project** → pick `pgemini/Trapdoor-RP`.
3. On the import screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `web` &nbsp;⬅ important — the app isn't at the repo root
4. Add a single **Environment Variable**:

   | Name | Value | Environments |
   |---|---|---|
   | `NEXT_PUBLIC_API_BASE` | `https://<your-render-service>.onrender.com` | Production, Preview, Development |

5. Click **Deploy**. Vercel builds, deploys, and gives you a `*.vercel.app` URL.
6. Open it — landing page renders, the nav badge probes the Render backend
   and shows `live · AI Foundry + Whisper` once the cold-start finishes.

> Every `git push` to `main` triggers an automatic redeploy of both services.

---

## 3 · Local development still works the same

```powershell
.\start-dev.ps1
# → backend on http://127.0.0.1:8000
# → frontend on http://127.0.0.1:3000  (proxies /api/* to backend)
```

The frontend uses `NEXT_PUBLIC_API_BASE` only if it's set. Without it, requests
go same-origin and the Next.js dev rewrite forwards them to FastAPI.

---

## 4 · After deploy — things to verify

- `GET /api/healthz` → `200` with `ai_foundry: true` and `transcription.enabled: true`
- `POST /api/scan/sample/resume` → `verdict: block`
- `POST /api/scan/sample/audio_voicemail` → `verdict: block` (proves Whisper works on Render)
- `POST /api/scan/sample/video_announcement` → `verdict: block` (proves vision-OCR + metadata work)
- The web app at `<project>.vercel.app/scan` runs the live journey end-to-end

---

## 5 · Free-tier gotchas

- **Cold starts**: first request after 15 min idle takes ~30 s. Render's free
  plan is fine for demos; bump to Starter (~$7/mo) for production.
- **CPU**: Whisper transcribes a 1-minute clip in ~10 s on the free plan.
  Larger files may need the Starter plan for snappier scans.
- **Storage**: Render free has 1 GB ephemeral disk. We only need ~3 MB for
  the demo samples; that's fine.
- **CORS** is already set to `allow_origins=["*"]` in `backend/app/main.py`,
  so the Vercel frontend can call the Render API from any domain.

---

## 6 · If you'd rather one-host everything

Two alternatives, both free:

- **Fly.io** — runs both the FastAPI backend and a Node.js sidecar in the
  same machine. Slightly more setup; no sleep timer.
- **Hugging Face Spaces** — supports Python apps with a Dockerfile. Free
  CPU tier, no sleep, great for ML demos.

Drop me a note and I'll add a `Dockerfile` + the corresponding manifest.
