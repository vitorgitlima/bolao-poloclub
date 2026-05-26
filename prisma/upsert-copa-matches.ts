/**
 * Insere partidas da Copa 2026 que ainda não existem no banco E atualiza
 * os logos de todas as partidas da Copa para URLs da ESPN CDN.
 * SEGURO: nunca deleta dados. Predictions e ranking intocados.
 * Uso: DATABASE_URL=... npx tsx prisma/upsert-copa-matches.ts
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WORLD_CUP_2026_MATCHES } from "../lib/matches-data";
import { ESPN_LOGO_MAP, ESPN_NAME_MAP } from "../lib/espn-api";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PT_TO_EN: Record<string, string> = {};
for (const [en, pt] of Object.entries(ESPN_NAME_MAP)) {
  PT_TO_EN[pt] = en;
}

function logoFor(teamPt: string): string | undefined {
  const en = PT_TO_EN[teamPt] ?? teamPt;
  return ESPN_LOGO_MAP[en];
}

async function main() {
  let inserted = 0;
  let flagsUpdated = 0;

  for (const m of WORLD_CUP_2026_MATCHES) {
    const homeUrl = logoFor(m.homeTeam);
    const awayUrl = logoFor(m.awayTeam);

    const existing = await prisma.match.findFirst({
      where: { homeTeam: m.homeTeam, awayTeam: m.awayTeam, date: m.date },
    });

    if (!existing) {
      await prisma.match.create({
        data: {
          ...m,
          homeFlag: homeUrl ?? m.homeFlag,
          awayFlag: awayUrl ?? m.awayFlag,
        },
      });
      inserted++;
    } else {
      // Atualiza só as flags se ainda forem emoji
      const needsUpdate =
        (homeUrl && !existing.homeFlag.startsWith("http")) ||
        (awayUrl && !existing.awayFlag.startsWith("http"));

      if (needsUpdate) {
        await prisma.match.update({
          where: { id: existing.id },
          data: {
            ...(homeUrl && { homeFlag: homeUrl }),
            ...(awayUrl && { awayFlag: awayUrl }),
          },
        });
        flagsUpdated++;
      }
    }
  }

  console.log(`✅ ${inserted} partidas inseridas, ${flagsUpdated} flags atualizadas`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
