/**
 * Conecta ESPN event IDs às fixtures de fase eliminatória no banco.
 * Busca por data/hora exata (todos os jogos têm horário único).
 * Também atualiza nomes dos times e logos quando ESPN já tem os times reais.
 *
 * Uso (na VPS ou local):
 *   DATABASE_URL=... npx tsx prisma/link-knockout-espnids.ts
 *
 * Seguro para re-executar (idempotente).
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { espnKnockoutNameToPt, ESPN_LOGO_MAP } from "../lib/espn-api";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

const KNOCKOUT_DATES = [
  "20260628", "20260629", "20260630",
  "20260701", "20260702", "20260703", "20260704",
  "20260705", "20260706", "20260707",
  "20260709", "20260710", "20260711", "20260712",
  "20260714", "20260715",
  "20260718", "20260719",
];

const KNOCKOUT_SLUGS = new Set([
  "round-of-32", "round-of-16", "quarterfinals", "semifinals", "3rd-place-match", "final",
]);

const PHASE_MAP: Record<string, string> = {
  "round-of-32":  "Rodada de 32",
  "round-of-16":  "Oitavas de Final",
  "quarterfinals":"Quartas de Final",
  "semifinals":   "Semifinal",
  "3rd-place-match": "Disputa do 3º Lugar",
  "final":        "Final",
};

type EspnEvent = {
  id: string;
  date: string;
  seasonSlug: string;
  homeTeam: { name: string; logo?: string };
  awayTeam: { name: string; logo?: string };
};

async function fetchKnockoutEvents(): Promise<EspnEvent[]> {
  const events: EspnEvent[] = [];

  for (let i = 0; i < KNOCKOUT_DATES.length; i += 5) {
    const batch = KNOCKOUT_DATES.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (date) => {
        const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}&limit=20`, {
          cache: "no-store",
        });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.events ?? []) as Record<string, unknown>[];
      })
    );

    for (const dayEvents of results) {
      for (const ev of dayEvents) {
        const season = ev.season as Record<string, unknown>;
        const slug = season?.slug as string;
        if (!slug || !KNOCKOUT_SLUGS.has(slug)) continue;

        const comp = (ev.competitions as Record<string, unknown>[])[0];
        const competitors = comp.competitors as Record<string, unknown>[];
        const home = competitors.find((c) => c.homeAway === "home") as Record<string, unknown>;
        const away = competitors.find((c) => c.homeAway === "away") as Record<string, unknown>;
        if (!home || !away) continue;

        const ht = home.team as Record<string, unknown>;
        const at = away.team as Record<string, unknown>;
        const homeLogo = (ht.logo ?? (ht.logos as Record<string, unknown>[])?.[0]?.href) as string | undefined;
        const awayLogo = (at.logo ?? (at.logos as Record<string, unknown>[])?.[0]?.href) as string | undefined;

        events.push({
          id: ev.id as string,
          date: ev.date as string,
          seasonSlug: slug,
          homeTeam: { name: ht.displayName as string, logo: homeLogo || undefined },
          awayTeam: { name: at.displayName as string, logo: awayLogo || undefined },
        });
      }
    }
  }

  return events;
}

async function main() {
  console.log("🔍 Buscando jogos eliminatórios na ESPN...");
  const events = await fetchKnockoutEvents();
  console.log(`   ${events.length} jogos encontrados na ESPN\n`);

  let linked = 0;
  let nameUpdated = 0;
  let alreadyOk = 0;
  let notFound = 0;

  for (const ev of events) {
    const espnId = parseInt(ev.id);
    const espnDate = new Date(ev.date);
    const phase = PHASE_MAP[ev.seasonSlug] ?? ev.seasonSlug;

    const homePt = espnKnockoutNameToPt(ev.homeTeam.name);
    const awayPt = espnKnockoutNameToPt(ev.awayTeam.name);
    const homeFlag = ev.homeTeam.logo || ESPN_LOGO_MAP[ev.homeTeam.name] || "⚽";
    const awayFlag = ev.awayTeam.logo || ESPN_LOGO_MAP[ev.awayTeam.name] || "⚽";

    // Busca pelo espnId já vinculado (re-execuções)
    let match = await prisma.match.findUnique({ where: { externalId: espnId } });

    // Primeira vez: busca pelo horário exato
    if (!match) {
      match = await prisma.match.findFirst({
        where: {
          date: espnDate,
          phase: { in: [phase, "Rodada de 32", "Oitavas de Final", "Quartas de Final", "Semifinal", "Disputa do 3º Lugar", "Final"] },
        },
      });
    }

    if (!match) {
      console.log(`  ⚠️  NÃO ENCONTRADO: ${ev.date} | ${phase} | ${homePt} vs ${awayPt}`);
      notFound++;
      continue;
    }

    const needsLink = match.externalId !== espnId;
    const nameChanged = match.homeTeam !== homePt || match.awayTeam !== awayPt;
    const flagChanged =
      (ev.homeTeam.logo && match.homeFlag !== ev.homeTeam.logo) ||
      (ev.awayTeam.logo && match.awayFlag !== ev.awayTeam.logo);

    if (!needsLink && !nameChanged && !flagChanged) {
      alreadyOk++;
      continue;
    }

    await prisma.match.update({
      where: { id: match.id },
      data: {
        ...(needsLink && { externalId: espnId }),
        homeTeam: homePt,
        awayTeam: awayPt,
        homeFlag,
        awayFlag,
      },
    });

    if (needsLink) linked++;
    if (nameChanged) {
      nameUpdated++;
      console.log(`  ✅ ${phase} ${ev.date.slice(0, 10)} | ${match.homeTeam} → ${homePt} | ${match.awayTeam} → ${awayPt}`);
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`   ${linked} novos ESPN IDs vinculados`);
  console.log(`   ${nameUpdated} nomes de times atualizados`);
  console.log(`   ${alreadyOk} já estavam corretos`);
  if (notFound > 0) console.log(`   ${notFound} jogos NÃO encontrados no DB (rode upsert-copa-matches.ts primeiro)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
