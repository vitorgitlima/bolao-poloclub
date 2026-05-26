/**
 * Atualiza homeFlag/awayFlag de todas as partidas da Copa 2026 no banco
 * usando as URLs de logo da ESPN CDN.
 * Seguro: só faz UPDATE nas flags, não toca em predictions nem scores.
 * Uso: DATABASE_URL=... npx tsx prisma/update-copa-flags.ts
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ESPN_LOGO_MAP, ESPN_NAME_MAP } from "../lib/espn-api";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Inverte ESPN_NAME_MAP: PT → EN, para buscar a logo pelo nome PT do banco
const PT_TO_EN: Record<string, string> = {};
for (const [en, pt] of Object.entries(ESPN_NAME_MAP)) {
  PT_TO_EN[pt] = en;
}

async function main() {
  const matches = await prisma.match.findMany({
    where: { phase: { not: { startsWith: "🧪" } } },
    select: { id: true, homeTeam: true, awayTeam: true, homeFlag: true, awayFlag: true },
  });

  let updated = 0;
  for (const m of matches) {
    const homeEn = PT_TO_EN[m.homeTeam] ?? m.homeTeam;
    const awayEn = PT_TO_EN[m.awayTeam] ?? m.awayTeam;
    const homeUrl = ESPN_LOGO_MAP[homeEn];
    const awayUrl = ESPN_LOGO_MAP[awayEn];

    if (!homeUrl && !awayUrl) continue;
    if (m.homeFlag === homeUrl && m.awayFlag === awayUrl) continue;

    await prisma.match.update({
      where: { id: m.id },
      data: {
        ...(homeUrl && { homeFlag: homeUrl }),
        ...(awayUrl && { awayFlag: awayUrl }),
      },
    });
    updated++;
  }

  console.log(`✅ ${updated} partidas atualizadas com logos ESPN`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
