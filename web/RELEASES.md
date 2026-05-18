# Deploy log

Tracks production releases of the API (Azure App Service `trapdoor-api-pg`) and web (Azure Static Web Apps `blue-mud-01b0f4b0f`).

## 2026-05-18

- First trigger of the auto-deploy pipelines (`.github/workflows/deploy-web.yml`, `deploy-api.yml`)
- Backend confirmed live at `https://trapdoor-api-pg.azurewebsites.net/api/healthz` with `ai_foundry: true` and Whisper transcription enabled.
- Frontend redeployed with `NEXT_PUBLIC_API_BASE` pointing at the App Service.
- 10-detector pipeline active end-to-end.
