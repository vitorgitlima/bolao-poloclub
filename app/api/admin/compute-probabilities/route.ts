import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRanking } from "@/lib/ranking";

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return email ? admins.includes(email) : false;
}

function samplePoints(exactRate: number, diffRate: number, winRate: number): number {
  const r = Math.random();
  if (r < exactRate) return 6;
  if (r < exactRate + diffRate) return 4;
  if (r < exactRate + diffRate + winRate) return 3;
  return 0;
}

const N = 10_000; // simulações Monte Carlo
const PRIOR = 5;  // peso do prior bayesiano (imaginary games)

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // --- 1. Standings atuais ---
    const { ranking } = await computeRanking();
    const users = ranking.filter((u) => !u.isDeveloper);
    if (users.length === 0) return NextResponse.json({ error: "Sem usuários" }, { status: 400 });

    // --- 2. Jogos restantes ---
    const scheduledMatches = await prisma.match.findMany({
      where: { status: "SCHEDULED", phase: { not: { startsWith: "🧪" } } },
      select: { id: true },
    });
    const remainingMatches = scheduledMatches.length;
    const matchIds = scheduledMatches.map((m) => m.id);

    // --- 3. Quais usuários têm palpite para cada jogo futuro ---
    const predRows = await prisma.prediction.findMany({
      where: { matchId: { in: matchIds } },
      select: { matchId: true, userId: true },
    });
    const userPredicted = new Map<string, Set<string>>(); // userId → Set<matchId>
    for (const p of predRows) {
      if (!userPredicted.has(p.userId)) userPredicted.set(p.userId, new Set());
      userPredicted.get(p.userId)!.add(p.matchId);
    }

    // --- 4. Taxas históricas com suavização bayesiana ---
    const totalScored = users.reduce((s, u) => s + u.scoredPredictions, 0);
    const gExact = totalScored > 0 ? users.reduce((s, u) => s + u.exactScores, 0) / totalScored : 0.06;
    const gDiff  = totalScored > 0 ? users.reduce((s, u) => s + u.goalDifferenceHits, 0) / totalScored : 0.10;
    const gWin   = totalScored > 0 ? users.reduce((s, u) => s + u.correctWinners, 0) / totalScored : 0.35;

    const ustats = users.map((u) => {
      const n = u.scoredPredictions;
      const exactRate = (u.exactScores + gExact * PRIOR) / (n + PRIOR);
      const diffRate  = (u.goalDifferenceHits + gDiff * PRIOR) / (n + PRIOR);
      const winRate   = (u.correctWinners + gWin * PRIOR) / (n + PRIOR);
      const predicted = userPredicted.get(u.id) ?? new Set<string>();
      const predictedCount = predicted.size;
      const maxPossible    = u.totalPoints + predictedCount * 6;
      const expectedFinal  = Math.round(u.totalPoints + predictedCount * (6 * exactRate + 4 * diffRate + 3 * winRate));
      return {
        id: u.id, name: u.name,
        totalPoints: u.totalPoints,
        exactRate, diffRate, winRate,
        predictedMatchIds: predicted,
        predictedCount,
        missingPredictions: remainingMatches - predictedCount,
        maxPossible, expectedFinal,
      };
    });

    // Posições atuais (ranking olímpico simplificado por pontos)
    const currentPos = (u: typeof ustats[0]) =>
      ustats.filter((o) => o.totalPoints > u.totalPoints).length + 1;

    // --- 5. Monte Carlo ---
    const globalWins    = new Array(ustats.length).fill(0);
    const globalPodiums = new Array(ustats.length).fill(0);

    // Ligas com ≥ 3 membros não-dev
    const leaguesRaw = await prisma.league.findMany({
      select: { id: true, name: true, members: { select: { userId: true } } },
    });
    const leagues = leaguesRaw
      .map((lg) => ({
        id: lg.id, name: lg.name,
        memberIdxs: lg.members
          .map((m) => ustats.findIndex((u) => u.id === m.userId))
          .filter((i) => i >= 0),
      }))
      .filter((lg) => lg.memberIdxs.length >= 3);

    const lgWins  = leagues.map((lg) => new Array(lg.memberIdxs.length).fill(0));
    const lgRelg  = leagues.map((lg) => new Array(lg.memberIdxs.length).fill(0));

    for (let sim = 0; sim < N; sim++) {
      // Simula pontos finais
      const pts = ustats.map((u) => u.totalPoints);
      for (const mid of matchIds) {
        for (let i = 0; i < ustats.length; i++) {
          if (ustats[i].predictedMatchIds.has(mid)) {
            pts[i] += samplePoints(ustats[i].exactRate, ustats[i].diffRate, ustats[i].winRate);
          }
        }
      }

      // Posições globais
      for (let i = 0; i < ustats.length; i++) {
        const pos = pts.filter((p) => p > pts[i]).length + 1;
        if (pos === 1) globalWins[i]++;
        if (pos <= 3) globalPodiums[i]++;
      }

      // Posições por liga
      for (let li = 0; li < leagues.length; li++) {
        const idxs = leagues[li].memberIdxs;
        const lpts = idxs.map((i) => pts[i]);
        const mc   = idxs.length;
        for (let j = 0; j < idxs.length; j++) {
          const lpos = lpts.filter((p) => p > lpts[j]).length + 1;
          if (lpos === 1) lgWins[li][j]++;
          if (lpos >= mc - 1) lgRelg[li][j]++; // últimos 2
        }
      }
    }

    // --- 6. Resposta ---
    const leader = ustats.reduce((m, u) => (u.totalPoints > m.totalPoints ? u : m), ustats[0]);

    const global = ustats
      .map((u, i) => ({
        userId: u.id,
        name: u.name,
        position: currentPos(u),
        totalPoints: u.totalPoints,
        maxPossible: u.maxPossible,
        expectedFinal: u.expectedFinal,
        winProbability:    +(globalWins[i]    / N * 100).toFixed(1),
        podiumProbability: +(globalPodiums[i] / N * 100).toFixed(1),
        missingPredictions: u.missingPredictions,
        isEliminated: u.maxPossible < leader.totalPoints,
      }))
      .sort((a, b) => a.position - b.position);

    const leaguesResult = leagues.map((lg, li) => {
      const mc = lg.memberIdxs.length;
      return {
        leagueId: lg.id,
        leagueName: lg.name,
        members: lg.memberIdxs
          .map((uIdx, j) => {
            const u = ustats[uIdx];
            const lpts = lg.memberIdxs.map((i) => ustats[i].totalPoints);
            const leaguePos = lpts.filter((p) => p > u.totalPoints).length + 1;
            const relegProb = +(lgRelg[li][j] / N * 100).toFixed(1);
            return {
              userId: u.id,
              name: u.name,
              leaguePosition: leaguePos,
              totalPoints: u.totalPoints,
              winProbability:       +(lgWins[li][j]  / N * 100).toFixed(1),
              relegationProbability: relegProb,
              isSafe: relegProb < 1,
              isInDanger: relegProb > 60,
            };
          })
          .sort((a, b) => a.leaguePosition - b.leaguePosition),
      };
    });

    return NextResponse.json({
      remainingMatches,
      simulationsRun: N,
      global,
      leagues: leaguesResult,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Computation failed" },
      { status: 500 }
    );
  }
}
