# Штаб Тимы Осадка — Render V0.4 trial

Dedicated deployment branch only. Production main and GitHub Pages are unchanged.
This is the original 0.4 code snapshot verified as SHA-256 1acc928edda66c193a2519e915310d1fab88e03063c223de1a5d26bde102c016.
The source archive contains no MP4/SRT, secrets, or SQLite database.
Use `plan=free`, `runtime=docker`, context `shtab-cloud`, Dockerfile `shtab-cloud/Dockerfile`.
Set `SHTAB_ACCESS_TOKEN` as a protected Render environment secret before launching.
The service exposes only an authenticated **local MVP** UI over Render HTTPS. API JOHN/RICK is disabled unless OPENAI_API_KEY is configured separately.
The connected Semyon editor, full AV review and private ChatGPT MCP are **NOT** implemented. Don't claim full-cycle completion.
Render free ephemeral storage means trial data can disappear after restart/sleep.
