import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Nomes EXATOS conforme ESPN bra.1 API (displayName dos competitors)
// Qualquer divergência quebra o name-matching no sync
const BRASILEIRAO_TEST_MATCHES = [
  // ── Rodada 1 — query ESPN: ?dates=20260523 ──
  {
    homeTeam: "São Paulo",   homeFlag: "🇧🇷",
    awayTeam: "Botafogo",    awayFlag: "🇧🇷",
    date: new Date("2026-05-23T20:00:00Z"),
    phase: "🧪 Rodada 1",
    venue: "Estádio Cícero Pompeu de Toledo",
  },
  {
    homeTeam: "Vitória",       homeFlag: "🇧🇷",
    awayTeam: "Internacional", awayFlag: "🇧🇷",
    date: new Date("2026-05-23T20:00:00Z"),
    phase: "🧪 Rodada 1",
    venue: "Estadio Manoel Barradas",
  },
  {
    homeTeam: "Grêmio", homeFlag: "🇧🇷",
    awayTeam: "Santos", awayFlag: "🇧🇷",
    date: new Date("2026-05-23T22:00:00Z"),
    phase: "🧪 Rodada 1",
    venue: "Arena do Grêmio",
  },
  {
    homeTeam: "Mirassol",   homeFlag: "🇧🇷",
    awayTeam: "Fluminense", awayFlag: "🇧🇷",
    date: new Date("2026-05-23T22:00:00Z"),
    phase: "🧪 Rodada 1",
    venue: "Estadio Municipal José Maria de Campos Maia",
  },
  {
    homeTeam: "Flamengo",  homeFlag: "🇧🇷",
    awayTeam: "Palmeiras", awayFlag: "🇧🇷",
    date: new Date("2026-05-24T00:00:00Z"),
    phase: "🧪 Rodada 1",
    venue: "Estadio do Maracana",
  },

  // ── Rodada 2 — query ESPN: ?dates=20260524 ──
  {
    homeTeam: "Cruzeiro",     homeFlag: "🇧🇷",
    awayTeam: "Chapecoense",  awayFlag: "🇧🇷",
    date: new Date("2026-05-24T19:00:00Z"),
    phase: "🧪 Rodada 2",
    venue: "Estadio Mineirão",
  },
  {
    homeTeam: "Remo",         homeFlag: "🇧🇷",
    awayTeam: "Athletico-PR", awayFlag: "🇧🇷",
    date: new Date("2026-05-24T19:00:00Z"),
    phase: "🧪 Rodada 2",
    venue: "Mangueirão",
  },
  {
    homeTeam: "Corinthians", homeFlag: "🇧🇷",
    awayTeam: "Atlético-MG", awayFlag: "🇧🇷",
    date: new Date("2026-05-24T21:30:00Z"),
    phase: "🧪 Rodada 2",
    venue: "Neo Química Arena",
  },
  {
    homeTeam: "Vasco da Gama",      homeFlag: "🇧🇷",
    awayTeam: "Red Bull Bragantino", awayFlag: "🇧🇷",
    date: new Date("2026-05-24T23:30:00Z"),
    phase: "🧪 Rodada 2",
    venue: "Estádio São Januário",
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
  console.log("   Rodada 1: ?dates=20260523  |  Rodada 2: ?dates=20260524");
  console.log("   Para remover: DELETE WHERE phase LIKE '🧪%'");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
