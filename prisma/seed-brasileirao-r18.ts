import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const L = (id: string) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;

// Rodada 18 — jogos de 30/05 e 31/05 (dados ESPN bra.1).
// Nomes EXATOS conforme displayName da ESPN para o sync existente casar por nome.
// Mesma estrutura da Rodada 17 (fallback manual). Os placares/status são
// preenchidos depois pelo sync que já existe — aqui entram como SCHEDULED.
const RODADA_18 = [
  // ── 30/05 ──
  {
    homeTeam: "Athletico-PR", homeFlag: L("3458"),
    awayTeam: "Mirassol",     awayFlag: L("9169"),
    date: new Date("2026-05-30T19:00:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Arena da Baixada",
  },
  {
    homeTeam: "Flamengo", homeFlag: L("819"),
    awayTeam: "Coritiba", awayFlag: L("3456"),
    date: new Date("2026-05-30T19:00:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Estadio do Maracana",
  },
  {
    homeTeam: "Bahia",    homeFlag: L("9967"),
    awayTeam: "Botafogo", awayFlag: L("6086"),
    date: new Date("2026-05-30T20:30:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Arena Fonte Nova",
  },
  {
    homeTeam: "Grêmio",      homeFlag: L("6273"),
    awayTeam: "Corinthians", awayFlag: L("874"),
    date: new Date("2026-05-30T20:30:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Arena do Grêmio",
  },
  {
    homeTeam: "Santos",  homeFlag: L("2674"),
    awayTeam: "Vitória", awayFlag: L("3457"),
    date: new Date("2026-05-30T23:00:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Estádio Vila Belmiro (Urbano Caldeira)",
  },
  // ── 31/05 ──
  {
    homeTeam: "Red Bull Bragantino", homeFlag: L("6079"),
    awayTeam: "Internacional",       awayFlag: L("1936"),
    date: new Date("2026-05-31T14:00:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Estádio Municipal Cicero de Souza Marques",
  },
  {
    homeTeam: "Palmeiras",   homeFlag: L("2029"),
    awayTeam: "Chapecoense", awayFlag: L("9318"),
    date: new Date("2026-05-31T19:00:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Allianz Parque",
  },
  {
    homeTeam: "Vasco da Gama", homeFlag: L("3454"),
    awayTeam: "Atlético-MG",   awayFlag: L("7632"),
    date: new Date("2026-05-31T19:00:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Estádio São Januário",
  },
  {
    homeTeam: "Cruzeiro",   homeFlag: L("2022"),
    awayTeam: "Fluminense", awayFlag: L("3445"),
    date: new Date("2026-05-31T23:30:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Estadio Mineirão",
  },
  {
    homeTeam: "Remo",      homeFlag: L("4936"),
    awayTeam: "São Paulo", awayFlag: L("2026"),
    date: new Date("2026-05-31T23:30:00Z"),
    phase: "🧪 Rodada 18",
    venue: "Mangueirão",
  },
];

async function main() {
  console.log("🧪 Adicionando Rodada 18 — Brasileirão Série A (aditivo, não apaga nada)...");

  // Idempotente: só cria o que ainda não existe (por home x away na Rodada 18).
  const existing = await prisma.match.findMany({
    where: { phase: "🧪 Rodada 18" },
    select: { homeTeam: true, awayTeam: true },
  });
  const have = new Set(existing.map((m) => `${m.homeTeam} x ${m.awayTeam}`));

  let created = 0;
  let skipped = 0;
  for (const match of RODADA_18) {
    if (have.has(`${match.homeTeam} x ${match.awayTeam}`)) {
      skipped++;
      console.log(`  ⏭  já existe: ${match.homeTeam} x ${match.awayTeam}`);
      continue;
    }
    await prisma.match.create({ data: match });
    created++;
    console.log(`  ➕ criado: ${match.homeTeam} x ${match.awayTeam}`);
  }

  console.log(`\n✅ Rodada 18: ${created} criados, ${skipped} já existiam.`);
  console.log("   Placares/status entram pelo sync que já existe (sync-test/cron).");
  console.log("   Rodada 17, palpites e ranking permanecem intactos.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
