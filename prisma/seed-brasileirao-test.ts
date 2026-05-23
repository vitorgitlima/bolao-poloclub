import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Nomes EXATOS conforme ESPN bra.1 API (displayName dos competitors)
// Qualquer divergência quebra o name-matching no sync
const BRASILEIRAO_TEST_MATCHES = [
  // ── Rodada 17 — jogos de 23/05 ──
  {
    homeTeam: "São Paulo",   homeFlag: "🇧🇷",
    awayTeam: "Botafogo",    awayFlag: "🇧🇷",
    date: new Date("2026-05-23T20:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estádio Cícero Pompeu de Toledo",
  },
  {
    homeTeam: "Vitória",       homeFlag: "🇧🇷",
    awayTeam: "Internacional", awayFlag: "🇧🇷",
    date: new Date("2026-05-23T20:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estadio Manoel Barradas",
  },
  {
    homeTeam: "Grêmio", homeFlag: "🇧🇷",
    awayTeam: "Santos", awayFlag: "🇧🇷",
    date: new Date("2026-05-23T22:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Arena do Grêmio",
  },
  {
    homeTeam: "Mirassol",   homeFlag: "🇧🇷",
    awayTeam: "Fluminense", awayFlag: "🇧🇷",
    date: new Date("2026-05-23T22:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estadio Municipal José Maria de Campos Maia",
  },
  {
    homeTeam: "Flamengo",  homeFlag: "🇧🇷",
    awayTeam: "Palmeiras", awayFlag: "🇧🇷",
    date: new Date("2026-05-24T00:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estadio do Maracana",
  },

  // ── Rodada 17 — jogos de 24/05 ──
  {
    homeTeam: "Cruzeiro",     homeFlag: "🇧🇷",
    awayTeam: "Chapecoense",  awayFlag: "🇧🇷",
    date: new Date("2026-05-24T19:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estadio Mineirão",
  },
  {
    homeTeam: "Remo",         homeFlag: "🇧🇷",
    awayTeam: "Athletico-PR", awayFlag: "🇧🇷",
    date: new Date("2026-05-24T19:00:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Mangueirão",
  },
  {
    homeTeam: "Corinthians", homeFlag: "🇧🇷",
    awayTeam: "Atlético-MG", awayFlag: "🇧🇷",
    date: new Date("2026-05-24T21:30:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Neo Química Arena",
  },
  {
    homeTeam: "Vasco da Gama",      homeFlag: "🇧🇷",
    awayTeam: "Red Bull Bragantino", awayFlag: "🇧🇷",
    date: new Date("2026-05-24T23:30:00Z"),
    phase: "🧪 Rodada 17",
    venue: "Estádio São Januário",
  },

  // ── Rodada 17 — jogo de 25/05 ──
  {
    homeTeam: "Coritiba", homeFlag: "🇧🇷",
    awayTeam: "Bahia",    awayFlag: "🇧🇷",
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
