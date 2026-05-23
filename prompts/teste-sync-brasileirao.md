# Plano: Teste do Sync ESPN com Brasileirão Série A

## Contexto

A Copa do Mundo 2026 começa em junho — não há como testar o fluxo real de sync de placares antes disso. O objetivo é validar toda a cadeia agora, usando jogos do Brasileirão Série A que já estão acontecendo (rodadas de 23–24/05/2026). A ESPN tem uma API pública para o Série A (`bra.1`) com o **mesmo formato** de response que a do Mundial. Melhor ainda: os nomes dos times já vêm em português (`São Paulo`, `Fluminense`, `Botafogo`, etc.), então nenhum mapeamento adicional é necessário.

O que será validado:
- ESPN retorna scores corretamente para `bra.1`
- `parseEvent` (já existente) funciona sem alteração
- Team name matching funciona no banco
- `status: "FINISHED"` dispara o cálculo de pontos corretamente
- A tabela de classificação (`computeStandings`) atualiza ao vivo
- O fluxo completo: palpite → sync → pontuação

**Nenhuma estrutura da Copa é tocada.** Os jogos de teste ficam em fases separadas (`🧪 Rodada 1`, `🧪 Rodada 2`).

---

## Jogos confirmados para seed (nomes exatos da ESPN)

**Rodada 1 — 23/05/2026**
| Casa          | Fora      | Horário (UTC) |
|---------------|-----------|---------------|
| Botafogo      | São Paulo | ~20:00        |
| Internacional | Vitória   | ~20:00        |
| Santos        | Grêmio    | ~22:00        |
| Fluminense    | Mirassol  | ~22:00        |

**Rodada 2 — 24/05/2026**
| Casa      | Fora     | Horário (UTC) |
|-----------|----------|---------------|
| Palmeiras | Flamengo | ~00:00        |

> ⚠️ Verificar horários exatos e eventuais outros jogos do dia 24 na ESPN antes de rodar o seed.

---

## Arquivos a criar / modificar

### 1. `lib/espn-api.ts` — adicionar função bra.1

```ts
const ESPN_BRA = "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1";

export async function getEspnBrasileiraoByDate(date: string): Promise<EspnMatch[]> {
  // Reutiliza parseEvent já existente; só muda a base URL
  const res = await fetch(`${ESPN_BRA}/scoreboard?dates=${date}&limit=20`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ESPN bra.1 error: ${res.status}`);
  const json = await res.json();
  const events = (json.events ?? []) as Record<string, unknown>[];
  return events.map(parseEvent).filter(Boolean) as EspnMatch[];
}
```

`parseEvent` é reutilizado sem alteração — estrutura da response é idêntica.

---

### 2. `prisma/seed-brasileirao-test.ts` — seed isolado dos jogos de teste

Script standalone (não substitui o seed principal). Usa os nomes **exatos** da ESPN.
Fases: `"🧪 Rodada 1"` e `"🧪 Rodada 2"` — isoladas, nunca conflitam com Copa.

Flags: `🇧🇷` para todos (é um teste, estética não importa).

Executar com: `bun run prisma/seed-brasileirao-test.ts`

Para remover depois: rodar `prisma.match.deleteMany({ where: { phase: { startsWith: "🧪" } } })`.

---

### 3. `app/api/admin/sync-test/route.ts` — rota isolada de sync bra.1

Nova rota **separada** para não tocar na lógica de sync da Copa.

- `POST /api/admin/sync-test?date=YYYYMMDD` — busca jogos da data informada no bra.1
- `GET /api/admin/sync-test` — lista todos os matches com phase `🧪*` do banco
- Chama `getEspnBrasileiraoByDate(date)`
- Passa por `processEspnMatches` (função já existente, reutilizada sem alteração)
- Como os times do seed têm nomes idênticos ao da ESPN, o `findFirst({ where: { homeTeam, awayTeam } })` bate direto
- Retorna: `{ fixtures, updatedMatches, updatedPredictions }`
- Protegida por `isAdmin` (mesma lógica)

> `processEspnMatches` é extraída para `lib/sync-helpers.ts` para ser compartilhada entre `sync/route.ts` e `sync-test/route.ts` sem duplicação.

---

### 4. `app/(dashboard)/admin/page.tsx` — seção de teste

Adicionar uma seção colapsável ao final da página admin:

```
── 🧪 Modo Teste — Brasileirão ──────────────────────────────────

[Data: 23/05/2026]  [Sincronizar Rodada]

Resultado: 4 fixtures · 2 jogos atualizados · 3 pontuações recalculadas

Jogos de teste no banco:
  Botafogo 2 × 1 São Paulo     🧪 Rodada 1  [FINISHED]
  Internacional 0 × 0 Vitória  🧪 Rodada 1  [SCHEDULED]
  ...
```

- Input de data (default = hoje)
- Botão "Sincronizar" → `POST /api/admin/sync-test?date=...`
- Tabela com todos os matches de fase `🧪*` (via `GET /api/admin/sync-test`)

---

### 5. (Opcional) Tab temporária na página principal

Se quiser ver a tabela de classificação funcionando no UI principal, adicionar tab condicional em `page.tsx`:

```ts
// Só aparece se existirem matches com phase começando em "🧪"
const hasTestMatches = matches.some(m => m.phase.startsWith("🧪"));
```

Se existir, mostra um tab extra `🧪 Teste` com lista plana de MatchRows (sem standings de grupo). Isso permite ver o palpite + update funcionando na UI real.

---

## Fluxo de teste passo a passo

```
1. bun run prisma/seed-brasileirao-test.ts
   → Confirma: "Criados X jogos de teste no banco"

2. Abrir a app → Admin → seção 🧪
   → Ver lista de jogos com status SCHEDULED

3. Fazer palpites nos jogos de teste (via UI ou direto na API)

4. Aguardar um jogo terminar (ou simular manualmente:
   UPDATE match SET status='FINISHED', homeScore=2, awayScore=1
   WHERE homeTeam='Botafogo' via Prisma Studio)

5. Clicar "Sincronizar Rodada" no painel de teste (com a data correta)
   → Deve retornar: fixtures=N, updatedMatches=M, updatedPredictions=P

6. Verificar na UI:
   ✅ Score do jogo atualizado
   ✅ Status mudou para FINISHED
   ✅ Pontos calculados corretamente

7. Limpar dados de teste:
   prisma.match.deleteMany({ where: { phase: { startsWith: "🧪" } } })
```

---

## Verificação de não-regressão

- Jogos da Copa 2026 **não são tocados** (fases distintas, nenhum time em comum)
- `processEspnMatches` só atualiza matches que encontra no banco por nome — se não existir, pula silenciosamente
- `sync/route.ts` (Copa) continua apontando para `fifa.world`, sem alteração
- `seed.ts` principal não é modificado

---

## Resumo dos arquivos

| Arquivo | Ação |
|---|---|
| `lib/espn-api.ts` | Adicionar `getEspnBrasileiraoByDate` (~5 linhas) |
| `lib/sync-helpers.ts` | Extrair `processEspnMatches` (evitar duplicação) |
| `prisma/seed-brasileirao-test.ts` | Criar (seed isolado) |
| `app/api/admin/sync-test/route.ts` | Criar (rota GET + POST isolada) |
| `app/(dashboard)/admin/page.tsx` | Adicionar seção 🧪 ao final |
| `app/(dashboard)/page.tsx` | (Opcional) tab condicional 🧪 |

**Não alterados:** `sync/route.ts`, `seed.ts`, `matches-data.ts`, `group-view.tsx`, `match-row.tsx`, schema Prisma.
