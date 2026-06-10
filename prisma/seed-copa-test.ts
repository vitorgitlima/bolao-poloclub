/**
 * Seed de simulação Copa 2026
 * - 15 jogadores com perfis variados (craque → bola murcha)
 * - Rodada 1: todos os 12 jogos FINISHED com resultados reais simulados
 * - Rodada 2 (Grupos A-C): 6 jogos FINISHED, restantes SCHEDULED
 * - Rodada 3: tudo SCHEDULED (para ver aba "Pendentes")
 * - Liga "Polo Club" com 12 dos 15 membros
 * - Idempotente: pode rodar várias vezes
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculatePoints } from "../lib/points";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Resultados simulados ──────────────────────────────────────────────────────

// Rodada 1 — todos os 12 primeiros jogos de cada grupo (FINISHED)
const R1: Array<{ home: string; away: string; hs: number; as: number }> = [
  { home: "México",           away: "África do Sul",  hs: 2, as: 1 },
  { home: "Coreia do Sul",    away: "Rep. Tcheca",    hs: 1, as: 1 },
  { home: "Canadá",           away: "Bósnia e Herz.", hs: 1, as: 1 },
  { home: "Catar",            away: "Suíça",          hs: 0, as: 2 },
  { home: "Brasil",           away: "Marrocos",       hs: 3, as: 0 },
  { home: "Haiti",            away: "Escócia",        hs: 0, as: 2 },
  { home: "EUA",              away: "Paraguai",       hs: 2, as: 0 },
  { home: "Austrália",        away: "Turquia",        hs: 1, as: 2 },
  { home: "Alemanha",         away: "Curaçao",        hs: 4, as: 1 },
  { home: "Costa do Marfim",  away: "Equador",        hs: 1, as: 1 },
  { home: "Holanda",          away: "Japão",          hs: 2, as: 2 },
  { home: "Suécia",           away: "Tunísia",        hs: 2, as: 0 },
];

// Rodada 2 — grupos A, B, C (6 jogos FINISHED); D, E, F ficam SCHEDULED
const R2: Array<{ home: string; away: string; hs: number; as: number }> = [
  { home: "Rep. Tcheca",  away: "África do Sul",  hs: 1, as: 0 },
  { home: "México",       away: "Coreia do Sul",  hs: 2, as: 1 },
  { home: "Suíça",        away: "Bósnia e Herz.", hs: 3, as: 1 },
  { home: "Canadá",       away: "Catar",          hs: 2, as: 0 },
  { home: "Escócia",      away: "Marrocos",       hs: 0, as: 1 },
  { home: "Brasil",       away: "Haiti",          hs: 5, as: 0 },
];

// ── Jogadores ─────────────────────────────────────────────────────────────────

const USERS = [
  { name: "Vitor Lima",        email: "vitor@poloclubtest.dev",    isDeveloper: true  },
  { name: "Ana Lima",          email: "ana@poloclubtest.dev",      isDeveloper: false },
  { name: "Lucas Pereira",     email: "lucas@poloclubtest.dev",    isDeveloper: false },
  { name: "Beatriz Costa",     email: "beatriz@poloclubtest.dev",  isDeveloper: false },
  { name: "Diego Martins",     email: "diego@poloclubtest.dev",    isDeveloper: false },
  { name: "Fernanda Lima",     email: "fernanda@poloclubtest.dev", isDeveloper: false },
  { name: "Gabriela Souza",    email: "gabriela@poloclubtest.dev", isDeveloper: false },
  { name: "Carlos Mendes",     email: "carlos@poloclubtest.dev",   isDeveloper: false },
  { name: "João Silva",        email: "joao@poloclubtest.dev",     isDeveloper: false },
  { name: "Camila Ferreira",   email: "camila@poloclubtest.dev",   isDeveloper: false },
  { name: "Mariana Oliveira",  email: "mariana@poloclubtest.dev",  isDeveloper: false },
  { name: "Thiago Rodrigues",  email: "thiago@poloclubtest.dev",   isDeveloper: false },
  { name: "Rodrigo Faria",     email: "rodrigo@poloclubtest.dev",  isDeveloper: false },
  { name: "Isabela Nunes",     email: "isabela@poloclubtest.dev",  isDeveloper: false },
  { name: "Pedro Alves",       email: "pedro@poloclubtest.dev",    isDeveloper: false },
  { name: "Rafael Santos",     email: "rafael@poloclubtest.dev",   isDeveloper: false },
];

// ── Palpites por usuário ──────────────────────────────────────────────────────
// Cada array: índice 0-11 = R1 (mesma ordem de R1 acima), null = não palpitou
// Índice 12-17 = R2 (mesma ordem de R2 acima)
// Índice null = não palpitou aquele jogo

type Pred = [number, number] | null;

const PREDS: Record<string, Pred[]> = {
  // R1: 0-11   |  R2: 12-17
  // México-AfSul | Cor-Tch | Can-Bós | Cat-Sui | Bra-Mar | Hai-Esc | EUA-Par | Aus-Tur | Ale-Cur | CdM-Equ | Hol-Jap | Sue-Tun
  // Rep-Afr | Mex-Cor | Sui-Bos | Can-Cat | Esc-Mar | Bra-Hai

  "Ana Lima": [
    [2,1],  [1,1],  [1,1],  [0,2],  [3,0],  [0,2],  [2,0],  [1,2],  [4,1],  [1,1],  [2,2],  [2,0],
    [1,0],  [2,1],  [3,1],  [2,0],  [0,1],  [5,0],
  ],
  // Ana: 12 exatos R1 + 6 exatos R2 → 72+36 = 108 pts — Craque absoluta

  "Lucas Pereira": [
    [2,0],  [1,1],  [0,0],  [0,2],  [3,0],  [0,3],  [2,0],  [0,1],  [3,0],  [1,1],  [1,1],  [2,0],
    [1,0],  [3,1],  [2,0],  [2,0],  [0,2],  [4,0],
  ],
  // Lucas: 7 exatos + 3 saldo + 2 venc R1; 3 exatos + 2 saldo + 1 errou R2 → ~70pts

  "Beatriz Costa": [
    [2,1],  [0,0],  [1,1],  [0,1],  [2,0],  [0,2],  [2,0],  [1,2],  [3,1],  [1,1],  [2,2],  [1,0],
    [1,0],  [2,1],  [3,0],  [1,0],  [0,1],  [4,0],
  ],
  // Beatriz: 6 exatos + 4 venc + 2 saldo R1; 3 exatos + 2 venc R2 → ~60pts

  "Diego Martins": [
    [1,0],  [0,0],  [2,2],  [0,2],  [3,0],  [0,1],  [1,0],  [1,2],  [4,1],  [0,0],  [1,1],  [2,0],
    [1,0],  [1,0],  [3,1],  [2,0],  [0,2],  [3,0],
  ],
  // Diego: 5 exatos + 4 venc + 2 saldo + 1 errou R1; 3 exatos + 1 saldo + 1 venc R2 → ~52pts

  "Fernanda Lima": [
    [1,0],  [2,2],  [1,1],  [0,1],  [2,0],  [0,1],  [2,0],  [1,2],  [3,0],  [1,1],  [1,1],  [1,0],
    [1,0],  [2,1],  [2,0],  [2,0],  [1,1],  [4,0],
  ],
  // Fernanda: 4 exatos + 5 venc + 2 saldo + 1 errou R1; 2 exatos + 2 venc + 2 errou R2 → ~44pts

  "Gabriela Souza": [
    [2,1],  [0,0],  [2,2],  [0,2],  [2,0],  [0,2],  [2,0],  [0,1],  [3,0],  [0,0],  [2,2],  [2,0],
    [1,0],  [2,0],  [2,1],  [1,0],  [0,0],  [3,0],
  ],
  // Gabriela: 5 exatos + 3 venc + 2 saldo + 2 errou R1; 2 exatos + 1 venc + 3 errou R2 → ~40pts

  "Carlos Mendes": [
    [1,0],  [0,0],  [1,1],  [1,2],  [2,0],  [0,1],  [1,0],  [1,1],  [3,1],  [2,2],  [1,1],  [1,0],
    [0,0],  [1,0],  [2,0],  [1,0],  [1,1],  [2,0],
  ],
  // Carlos: 3 exatos + 5 venc + 1 saldo + 3 errou R1; 1 exato + 3 venc + 2 errou R2 → ~34pts

  "João Silva": [
    [2,1],  [2,0],  [0,0],  [0,2],  [1,0],  [1,1],  [2,0],  [0,0],  [2,0],  [2,0],  [3,1],  [1,0],
    [1,0],  [1,0],  [2,1],  [1,0],  [1,1],  [2,0],
  ],
  // João: 3 exatos + 4 venc + 1 saldo + 4 errou R1; 2 exatos + 2 venc + 2 errou R2 → ~28pts

  "Camila Ferreira": [
    [1,0],  [0,0],  [0,0],  [1,0],  [2,0],  [1,2],  [1,0],  [1,2],  [2,0],  [0,0],  [1,1],  [1,0],
    [0,0],  [1,0],  [2,0],  [1,0],  [0,0],  [3,0],
  ],
  // Camila: 2 exatos + 5 venc + 0 saldo + 5 errou R1; 0 exato + 3 venc + 3 errou R2 → ~24pts

  "Mariana Oliveira": [
    [1,0],  [2,0],  [2,0],  [0,1],  [1,0],  [1,1],  [1,0],  [0,0],  [2,0],  [0,0],  [1,0],  [1,0],
    [0,0],  [1,0],  [2,0],  [2,0],  [1,0],  [2,0],
  ],
  // Mariana: 1 exato + 5 venc + 0 saldo + 6 errou R1; 0 exato + 3 venc + 3 errou R2 → ~21pts

  "Thiago Rodrigues": [
    [0,0],  [2,0],  [2,0],  [1,0],  [1,0],  [1,0],  [0,0],  [0,0],  [2,0],  [2,0],  [1,0],  [0,0],
    [0,0],  [0,0],  [1,0],  [0,0],  [1,0],  [1,0],
  ],
  // Thiago: 0 exatos + 2 venc + 0 saldo + 10 errou R1; 0+2 venc+4 errou R2 → ~12pts

  "Rodrigo Faria": [
    [1,0],  [0,0],  [1,0],  [0,1],  [2,0],  [0,1],  [1,0],  [0,1],  [2,0],  [0,0],  [1,1],  [1,0],
    null,   null,   null,   null,   null,   null,
    // não palpitou R2
  ],
  // Rodrigo: só R1, ~2 exatos + 3 venc → ~21pts mas sem R2

  "Isabela Nunes": [
    [2,1],  [1,1],  null,   null,   [3,0],  null,   null,   null,   [4,1],  null,   null,   [2,0],
    null,   null,   [3,1],  null,   null,   null,
    // palpitou poucos jogos
  ],
  // Isabela: 4 exatos em R1 + 1 exato em R2 → 30 pts mas só 5 palpites

  "Pedro Alves": [
    [0,1],  [2,0],  [0,2],  [1,0],  [0,1],  [1,0],  [0,1],  [2,1],  [1,2],  [2,1],  [1,0],  [0,1],
    [0,0],  [0,1],  [1,2],  [0,1],  [2,1],  [0,2],
  ],
  // Pedro: quase tudo errado → ~9pts

  "Rafael Santos": [
    [1,0],  [0,0],  [0,0],  [1,0],  [1,0],  [2,0],  [0,1],  [2,0],  [2,0],  [0,0],  [1,0],  [0,1],
    [0,2],  [0,2],  [0,2],  [0,2],  [2,0],  [0,2],
    // R2 é propositalmente tudo errado → Bola Murcha da Rodada 2
  ],
  // Rafael: ~6 pts R1 (vence alguns) + 0 pts R2 = Bola Murcha
};

// Palpites para R3 (SCHEDULED - Rodada 3) — para ver aba Pendentes
// Apenas alguns usuários já palpitaram Rodada 3 antecipadamente
const R3_SCHEDULED: Array<{ home: string; away: string }> = [
  { home: "Rep. Tcheca",       away: "México"      },
  { home: "África do Sul",     away: "Coreia do Sul"},
  { home: "Suíça",             away: "Canadá"      },
  { home: "Bósnia e Herz.",    away: "Catar"       },
  { home: "Escócia",           away: "Brasil"      },
  { home: "Marrocos",          away: "Haiti"       },
];

const PREDS_R3: Record<string, Pred[]> = {
  "Ana Lima":      [[1,1],[1,1],[2,1],[0,2],[0,3],[2,0]],
  "Lucas Pereira": [[1,2],[0,1],[2,0],[0,1],[0,2],[1,0]],
  "Beatriz Costa": [[1,1],[0,0],[1,1],[1,2],[0,2],[2,0]],
  // demais não palpitaram R3 ainda
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seed Copa 2026 — Simulação completa\n");

  // 1. Limpar dados de teste anteriores (usuários @poloclubtest.dev)
  const existingUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@poloclubtest.dev" } },
    select: { id: true },
  });
  if (existingUsers.length > 0) {
    const ids = existingUsers.map((u) => u.id);
    await prisma.prediction.deleteMany({ where: { userId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.leagueMember.deleteMany({ where: { userId: { in: ids } } });
    await prisma.league.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`🗑  ${existingUsers.length} usuários de teste anteriores removidos\n`);
  }

  // 2. Criar usuários
  const createdUsers: Record<string, string> = {}; // name → id
  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        isDeveloper: u.isDeveloper,
      },
    });
    createdUsers[u.name] = user.id;
    console.log(`👤 ${u.name} criado${u.isDeveloper ? " (dev)" : ""}`);
  }
  console.log();

  // 3. Aplicar resultados Rodada 1
  console.log("⚽ Aplicando resultados Rodada 1...");
  let r1Updated = 0;
  for (const r of R1) {
    const match = await prisma.match.findFirst({
      where: { homeTeam: r.home, awayTeam: r.away },
    });
    if (!match) { console.log(`   ⚠ Jogo não encontrado: ${r.home} × ${r.away}`); continue; }
    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore: r.hs, awayScore: r.as, status: "FINISHED" },
    });
    r1Updated++;
  }
  console.log(`   ✓ ${r1Updated} jogos R1 finalizados\n`);

  // 4. Aplicar resultados Rodada 2 (parcial)
  console.log("⚽ Aplicando resultados Rodada 2 (Grupos A, B, C)...");
  let r2Updated = 0;
  for (const r of R2) {
    const match = await prisma.match.findFirst({
      where: { homeTeam: r.home, awayTeam: r.away },
    });
    if (!match) { console.log(`   ⚠ Jogo não encontrado: ${r.home} × ${r.away}`); continue; }
    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore: r.hs, awayScore: r.as, status: "FINISHED" },
    });
    r2Updated++;
  }
  console.log(`   ✓ ${r2Updated} jogos R2 finalizados\n`);

  // 5. Criar palpites R1 e calcular pontos
  console.log("🎯 Criando palpites Rodada 1...\n");
  const r1Matches = await Promise.all(
    R1.map((r) => prisma.match.findFirst({ where: { homeTeam: r.home, awayTeam: r.away } }))
  );

  let totalPreds = 0;
  const userStats: Record<string, { pts: number; exatos: number; palpites: number }> = {};

  for (const [userName, preds] of Object.entries(PREDS)) {
    const userId = createdUsers[userName];
    if (!userId) continue;
    userStats[userName] = { pts: 0, exatos: 0, palpites: 0 };

    // R1 (índices 0-11)
    for (let i = 0; i < 12; i++) {
      const pred = preds[i];
      const match = r1Matches[i];
      if (!pred || !match || match.homeScore === null || match.awayScore === null) continue;

      const { points } = calculatePoints(
        { home: pred[0], away: pred[1] },
        { home: match.homeScore, away: match.awayScore }
      );

      await prisma.prediction.upsert({
        where: { userId_matchId: { userId, matchId: match.id } },
        update: { homeScore: pred[0], awayScore: pred[1], points },
        create: { userId, matchId: match.id, homeScore: pred[0], awayScore: pred[1], points },
      });

      userStats[userName].pts += points;
      if (points === 6) userStats[userName].exatos++;
      userStats[userName].palpites++;
      totalPreds++;
    }
  }
  console.log("   R1 concluída.\n");

  // 6. Criar palpites R2 e calcular pontos
  console.log("🎯 Criando palpites Rodada 2...\n");
  const r2Matches = await Promise.all(
    R2.map((r) => prisma.match.findFirst({ where: { homeTeam: r.home, awayTeam: r.away } }))
  );

  for (const [userName, preds] of Object.entries(PREDS)) {
    const userId = createdUsers[userName];
    if (!userId) continue;

    // R2 (índices 12-17)
    for (let i = 0; i < 6; i++) {
      const pred = preds[12 + i];
      const match = r2Matches[i];
      if (!pred || !match || match.homeScore === null || match.awayScore === null) continue;

      const { points } = calculatePoints(
        { home: pred[0], away: pred[1] },
        { home: match.homeScore, away: match.awayScore }
      );

      await prisma.prediction.upsert({
        where: { userId_matchId: { userId, matchId: match.id } },
        update: { homeScore: pred[0], awayScore: pred[1], points },
        create: { userId, matchId: match.id, homeScore: pred[0], awayScore: pred[1], points },
      });

      userStats[userName].pts += points;
      if (points === 6) userStats[userName].exatos++;
      userStats[userName].palpites++;
      totalPreds++;
    }
  }
  console.log("   R2 concluída.\n");

  // 7. Criar palpites R3 (SCHEDULED — aparecerão em "Registrados" aguardando)
  console.log("🎯 Criando palpites antecipados Rodada 3...\n");
  const r3Matches = await Promise.all(
    R3_SCHEDULED.map((r) => prisma.match.findFirst({ where: { homeTeam: r.home, awayTeam: r.away } }))
  );

  for (const [userName, preds] of Object.entries(PREDS_R3)) {
    const userId = createdUsers[userName];
    if (!userId) continue;

    for (let i = 0; i < preds.length; i++) {
      const pred = preds[i];
      const match = r3Matches[i];
      if (!pred || !match) continue;

      await prisma.prediction.upsert({
        where: { userId_matchId: { userId, matchId: match.id } },
        update: { homeScore: pred[0], awayScore: pred[1], points: null },
        create: { userId, matchId: match.id, homeScore: pred[0], awayScore: pred[1], points: null },
      });

      userStats[userName] ??= { pts: 0, exatos: 0, palpites: 0 };
      userStats[userName].palpites++;
      totalPreds++;
    }
  }

  // 8. Criar liga "Polo Club Copa 2026" com 12 membros
  console.log("🏟  Criando liga de teste...\n");
  const ownerId = createdUsers["Ana Lima"];
  const leagueMembers = Object.values(createdUsers).filter((id) => id !== createdUsers["Vitor Lima"]);

  const existingLeague = await prisma.league.findFirst({ where: { name: "Polo Club Copa 2026 🏆" } });
  let league;
  if (existingLeague) {
    league = existingLeague;
    console.log(`   Liga já existia: ${league.id.slice(0, 8)}...`);
  } else {
    league = await prisma.league.create({
      data: {
        name: "Polo Club Copa 2026 🏆",
        description: "Liga interna do grupo para a Copa do Mundo 2026",
        ownerId,
        members: { create: { userId: ownerId } },
      },
    });
    console.log(`   Liga criada: ${league.id.slice(0, 8)}...`);
  }

  let membersAdded = 0;
  for (const userId of leagueMembers) {
    const exists = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId } },
    });
    if (!exists) {
      await prisma.leagueMember.create({ data: { leagueId: league.id, userId } });
      membersAdded++;
    }
  }
  console.log(`   ${membersAdded} membros adicionados à liga\n`);

  // 9. Resumo final
  console.log("─".repeat(60));
  console.log("📊 RANKING SIMULADO\n");

  const sorted = Object.entries(userStats)
    .sort((a, b) => b[1].pts - a[1].pts);

  sorted.forEach(([name, s], i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
    console.log(
      `${medal.padEnd(4)} ${name.padEnd(22)} ${String(s.pts).padStart(4)} pts  |  ${s.exatos} exatos  |  ${s.palpites} palpites`
    );
  });

  // Bola murcha: quem tem palpites na R2 mas 0 pontos nela
  console.log("\n🤡 Bola Murcha da R2:");
  const r2StartIndex = 12;
  for (const [userName, preds] of Object.entries(PREDS)) {
    const userId = createdUsers[userName];
    if (!userId) continue;
    let r2pts = 0;
    let r2count = 0;
    for (let i = 0; i < 6; i++) {
      const pred = preds[r2StartIndex + i];
      const match = r2Matches[i];
      if (!pred || !match || match.homeScore === null || match.awayScore === null) continue;
      const { points } = calculatePoints(
        { home: pred[0], away: pred[1] },
        { home: match.homeScore, away: match.awayScore }
      );
      r2pts += points;
      r2count++;
    }
    if (r2count > 0 && r2pts === 0) console.log(`   🤡 ${userName}`);
  }

  console.log(`
─────────────────────────────────────────────────
✅ Seed concluído!
   Usuários:  ${USERS.length}
   Palpites:  ${totalPreds}
   R1:        12 jogos FINISHED (todos os grupos)
   R2:        6 jogos FINISHED (Grupos A, B, C)
   R3:        SCHEDULED — palpites pendentes para ver
   Liga:      ${league.name} (${leagueMembers.length} membros)

👉 /ranking — para ver o ranking geral
👉 /ligas/${league.id} — para ver o ranking da liga
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
