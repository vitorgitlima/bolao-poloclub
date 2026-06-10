/**
 * Seed de teste para Ligas Privadas
 * - Busca usuários e jogos da Rodada 18 já existentes no banco
 * - Cria (ou reutiliza) a liga "Liga Polo Club"
 * - Coloca resultados reais nos jogos do dia 30/05
 * - Cria palpites com acertos variados para simular um ranking interessante
 * - Idempotente: pode rodar várias vezes sem duplicar
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculatePoints } from "../lib/points";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Resultados reais dos jogos do dia 30/05 (Rodada 18)
const RESULTADOS: Record<string, { home: number; away: number }> = {
  "Athletico-PR x Mirassol":          { home: 2, away: 0 },
  "Flamengo x Coritiba":              { home: 3, away: 1 },
  "Bahia x Botafogo":                 { home: 1, away: 1 },
  "Grêmio x Corinthians":             { home: 0, away: 2 },
  "Santos x Vitória":                 { home: 2, away: 1 },
};

// Palpites por usuário (nome → placar palpitado por jogo)
// Formato: [homePred, awayPred]
const PALPITES: Record<string, Array<[number, number]>> = {
  //                              Ath x Mir   Fla x Cor   Bah x Bot   Gre x Cor   San x Vit
  "Ana Lima":       [[2, 0], [3, 1], [1, 1], [1, 2], [2, 1]], // quase tudo certo
  "Carlos Mendes":  [[1, 0], [2, 0], [0, 0], [0, 2], [1, 0]], // alguns acertos
  "João Silva":     [[2, 0], [3, 1], [2, 0], [1, 0], [3, 1]], // placar exato no Atletico e Flamengo
  "Lucas Oliveira": [[0, 1], [1, 0], [2, 1], [1, 1], [0, 0]], // quase todos errado
  "Maria Santos":   [[2, 1], [2, 1], [1, 1], [0, 2], [2, 1]],
  "Pedro Costa":    [[1, 1], [3, 0], [1, 1], [0, 1], [2, 1]], // mediano
};

async function main() {
  console.log("🏆 Seed de Liga de Teste — Brasileirão Rodada 18\n");

  // 1. Buscar usuários
  const users = await prisma.user.findMany({
    where: { isDeveloper: false },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  console.log(`👥 Usuários encontrados: ${users.length}`);
  users.forEach(u => console.log(`   • ${u.name} (${u.email})`));

  if (users.length === 0) {
    console.log("❌ Nenhum usuário no banco. Rode o seed principal primeiro.");
    return;
  }

  // 2. Buscar jogos da Rodada 18
  const matches = await prisma.match.findMany({
    where: { phase: "🧪 Rodada 18" },
    orderBy: { date: "asc" },
  });
  console.log(`\n⚽ Jogos da Rodada 18: ${matches.length}`);

  if (matches.length === 0) {
    console.log("❌ Sem jogos da Rodada 18. Rode seed-brasileirao-r18.ts primeiro.");
    return;
  }

  // 3. Aplicar resultados nos jogos do dia 30
  let updatedMatches = 0;
  for (const match of matches) {
    const key = `${match.homeTeam} x ${match.awayTeam}`;
    const result = RESULTADOS[key];
    if (result) {
      await prisma.match.update({
        where: { id: match.id },
        data: { homeScore: result.home, awayScore: result.away, status: "FINISHED" },
      });
      console.log(`   ✓ ${key}: ${result.home}x${result.away} (FINISHED)`);
      updatedMatches++;
    }
  }
  console.log(`\n📊 ${updatedMatches} jogos marcados como finalizados`);

  // Recarregar matches com resultados atualizados
  const matchesUpdated = await prisma.match.findMany({
    where: { phase: "🧪 Rodada 18" },
    orderBy: { date: "asc" },
  });

  // 4. Criar ou reutilizar a liga de teste
  const LEAGUE_NAME = "Liga Polo Club 🏆";
  const owner = users.find(u => u.email === "test-ana@test.com") ?? users[0];

  let league = await prisma.league.findFirst({ where: { name: LEAGUE_NAME } });
  if (league) {
    console.log(`\n🏟️  Liga "${LEAGUE_NAME}" já existe (${league.id.slice(0, 8)}...) — reutilizando`);
  } else {
    league = await prisma.league.create({
      data: {
        name: LEAGUE_NAME,
        ownerId: owner.id,
        members: { create: { userId: owner.id } },
      },
    });
    console.log(`\n🏟️  Liga "${LEAGUE_NAME}" criada!`);
  }

  // 5. Adicionar todos os usuários como membros (idempotente)
  let membersAdded = 0;
  for (const user of users) {
    const existing = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId: user.id } },
    });
    if (!existing) {
      await prisma.leagueMember.create({ data: { leagueId: league.id, userId: user.id } });
      membersAdded++;
    }
  }
  console.log(`   ${membersAdded} membros adicionados (${users.length - membersAdded} já eram membros)`);

  // 6. Criar palpites e calcular pontos
  console.log("\n🎯 Criando palpites...\n");
  let totalPreds = 0;

  for (const user of users) {
    const userPalpites = PALPITES[user.name ?? ""];
    if (!userPalpites) {
      console.log(`   ⏭  ${user.name}: sem palpites definidos`);
      continue;
    }

    const jogosComResultado = matchesUpdated.filter(m => m.status === "FINISHED");
    let userPoints = 0;
    let created = 0;

    for (let i = 0; i < Math.min(userPalpites.length, jogosComResultado.length); i++) {
      const match = jogosComResultado[i];
      const [homePred, awayPred] = userPalpites[i];

      const { points } = match.homeScore !== null && match.awayScore !== null
        ? calculatePoints(
            { home: homePred, away: awayPred },
            { home: match.homeScore, away: match.awayScore }
          )
        : { points: null };

      await prisma.prediction.upsert({
        where: { userId_matchId: { userId: user.id, matchId: match.id } },
        update: { homeScore: homePred, awayScore: awayPred, points },
        create: { userId: user.id, matchId: match.id, homeScore: homePred, awayScore: awayPred, points },
      });

      if (points !== null) userPoints += points;
      created++;
      totalPreds++;
    }

    console.log(`   ${user.name?.padEnd(20)} → ${created} palpites · ${userPoints} pts`);
  }

  // 7. Resumo final
  const members = await prisma.leagueMember.count({ where: { leagueId: league.id } });
  console.log(`
✅ Seed concluído!
   Liga:     ${LEAGUE_NAME}
   ID:       ${league.id}
   Membros:  ${members}
   Palpites: ${totalPreds}

👉 Abra /ligas/${league.id} para ver o ranking
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
