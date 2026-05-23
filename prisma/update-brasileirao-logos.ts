import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const L = (id: string) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;

const LOGO_MAP: Record<string, string> = {
  "São Paulo":          L("2026"),
  "Botafogo":           L("6086"),
  "Vitória":            L("3457"),
  "Internacional":      L("1936"),
  "Grêmio":             L("6273"),
  "Santos":             L("2674"),
  "Mirassol":           L("9169"),
  "Fluminense":         L("3445"),
  "Flamengo":           L("819"),
  "Palmeiras":          L("2029"),
  "Cruzeiro":           L("2022"),
  "Chapecoense":        L("9318"),
  "Remo":               L("4936"),
  "Athletico-PR":       L("3458"),
  "Corinthians":        L("874"),
  "Atlético-MG":        L("7632"),
  "Vasco da Gama":      L("3454"),
  "Red Bull Bragantino":L("6079"),
  "Coritiba":           L("3456"),
  "Bahia":              L("9967"),
};

async function main() {
  console.log("🔄 Atualizando logos dos times do Brasileirão...");

  const matches = await prisma.match.findMany({
    where: { phase: { startsWith: "🧪" } },
  });

  let updated = 0;
  for (const match of matches) {
    const homeFlag = LOGO_MAP[match.homeTeam] ?? match.homeFlag;
    const awayFlag = LOGO_MAP[match.awayTeam] ?? match.awayFlag;
    if (homeFlag !== match.homeFlag || awayFlag !== match.awayFlag) {
      await prisma.match.update({
        where: { id: match.id },
        data: { homeFlag, awayFlag },
      });
      updated++;
      console.log(`  ✅ ${match.homeTeam} x ${match.awayTeam}`);
    }
  }

  console.log(`\n✅ ${updated} jogos atualizados (predictions intactas)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
