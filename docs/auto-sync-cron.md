# Auto-sync a cada 15 minutos

## O que precisa ser feito

1. **Criar `app/api/cron/sync/route.ts`** — endpoint GET protegido por `Authorization: Bearer <CRON_SECRET>` (não usa sessão). Chama `processEspnMatches(await getEspnLiveAndToday())`.

2. **Adicionar `CRON_SECRET`** — variável de ambiente em Vercel + GitHub Secrets (string aleatória longa).

3. **Escolher agendador:**

   - **Vercel Pro** → adicionar em `vercel.json`:
     ```json
     {
       "crons": [{ "path": "/api/cron/sync", "schedule": "*/15 * * * *" }]
     }
     ```
     A Vercel injeta `Authorization: Bearer <CRON_SECRET>` automaticamente se configurado.

   - **Hobby (grátis)** → GitHub Actions em `.github/workflows/sync.yml`:
     ```yaml
     on:
       schedule:
         - cron: "*/15 * * * *"
     jobs:
       sync:
         runs-on: ubuntu-latest
         steps:
           - run: |
               curl -X GET https://<seu-dominio>/api/cron/sync \
                 -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
     ```

## ESPN API

- API não-oficial, sem chave, sem rate limit publicado.
- 1 request a cada 15 min é completamente seguro.
- Endpoint usado: `site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard`
