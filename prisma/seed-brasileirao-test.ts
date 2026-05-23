import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const L = (id: string) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;

// Nomes EXATOS conforme ESPN bra.1 API (displayName dos competitors)
// Qualquer divergência quebra o name-matching no sync
const BRASILEIRAO_TEST_MATCHES = [
  // ── Rodada 17 — jogos de 23/05 ──
  {
    homeTeam: "São Paulo",   homeFlag: L("2026"),
    awayTeam: "Botafogo",    awayFlag: L("6086"),
    date: new Date("2026-05-23T20:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estádio Cícero Pompeu de Toledo",
  },
  {
    homeTeam: "Vitória",       homeFlag: L("3457"),
    awayTeam: "Internacional", awayFlag: L("1936"),
    date: new Date("2026-05-23T20:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estadio Manoel Barradas",
  },
  {
    homeTeam: "Grêmio", homeFlag: L("6273"),
    awayTeam: "Santos", awayFlag: L("2674"),
    date: new Date("2026-05-23T22:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Arena do Grêmio",
  },
  {
    homeTeam: "Mirassol",   homeFlag: L("9169"),
    awayTeam: "Fluminense", awayFlag: L("3445"),
    date: new Date("2026-05-23T22:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estadio Municipal José Maria de Campos Maia",
  },
  {
    homeTeam: "Flamengo",  homeFlag: L("819"),
    awayTeam: "Palmeiras", awayFlag: L("2029"),
    date: new Date("2026-05-24T00:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estadio do Maracana",
  },

  // ── Rodada 17 — jogos de 24/05 ──
  {
    homeTeam: "Cruzeiro",     homeFlag: L("2022"),
    awayTeam: "Chapecoense",  awayFlag: L("9318"),
    date: new Date("2026-05-24T19:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estadio Mineirão",
  },
  {
    homeTeam: "Remo",         homeFlag: L("4936"),
    awayTeam: "Athletico-PR", awayFlag: L("3458"),
    date: new Date("2026-05-24T19:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Mangueirão",
  },
  {
    homeTeam: "Corinthians", homeFlag: L("874"),
    awayTeam: "Atlético-MG", awayFlag: L("7632"),
    date: new Date("2026-05-24T21:30:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Neo Química Arena",
  },
  {
    homeTeam: "Vasco da Gama",       homeFlag: L("3454"),
    awayTeam: "Red Bull Bragantino", awayFlag: L("6079"),
    date: new Date("2026-05-24T23:30:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estádio São Januário",
  },

  // ── Rodada 17 — jogo de 25/05 ──
  {
    homeTeam: "Coritiba", homeFlag: L("3456"),
    awayTeam: "Bahia",    awayFlag: L("9967"),
    date: new Date("2026-05-25T23:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Couto Pereira",
  },
];

async function main() {
  console.log("🧪 Seeding jogos de teste — Brasileirão Série A...");

  const deleted = await prisma.match.deleteMany({
    where: { phase: { startsWith: "🧪" } },
  });
  if (deleted.count > 0) {
    console.log(`  🗑  Removidos ${deleted.count} jogos de teste antigos`);
  }

  for (const match of BRASILEIRAO_TEST_MATCHES) {
    await prisma.match.create({ data: match });
  }

  console.log(`✅ Criados ${BRASILEIRAO_TEST_MATCHES.length} jogos de teste!`);
  console.log("   Rodada 17: ?dates=20260523 (5) + ?dates=20260524 (4) + ?dates=20260525 (1)");
  console.log("   Para remover: DELETE WHERE phase LIKE '🧪%'");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
