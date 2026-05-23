import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Last completed phase (for round-specific badges)
  const lastFinished = await prisma.match.findFirst({
    where: { status: "FINISHED" },
    orderBy: { date: "desc" },
    select: { phase: true },
  });
  const lastPhase = lastFinished?.phase ?? null;

  const users = await prisma.user.findMany({
    include: {
      predictions: {
        include: { match: { select: { date: true, phase: true } } },
      },
      _count: { select: { predictions: true } },
    },
  });

  const usersWithStats = users.map((user) => {
    const scored = user.predictions.filter((p) => p.points !== null);

    const totalPoints = scored.reduce((s, p) => s + (p.points ?? 0), 0);

    const exactScores = scored.filter((p) =>
      p.isDoublePoints ? (p.points ?? 0) === 12 : (p.points ?? 0) === 6
    ).length;

    const correctWinners = scored.filter((p) =>
      p.isDoublePoints
        ? (p.points ?? 0) === 6 || (p.points ?? 0) === 8
        : (p.points ?? 0) === 3 || (p.points ?? 0) === 4
    ).length;

    // Last round stats
    const lastRoundAllPreds = lastPhase
      ? user.predictions.filter((p) => p.match.phase === lastPhase)
      : [];
    const lastRoundPreds = lastRoundAllPreds.filter((p) => p.points !== null);
    const lastRoundPoints = lastRoundPreds.reduce((s, p) => s + (p.points ?? 0), 0);
    const lastRoundExacts = lastRoundPreds.filter((p) =>
      p.isDoublePoints ? (p.points ?? 0) === 12 : (p.points ?? 0) === 6
    ).length;
    // hadLastRoundPred: participou da rodada (qualquer palpite, mesmo não pontuado ainda)
    // hadLastRoundScoredPred: tem ao menos um palpite já avaliado na rodada
    const hadLastRoundPred = lastRoundAllPreds.length > 0;
    const hadLastRoundScoredPred = lastRoundPreds.length > 0;

    // Streak: consecutive non-zero scored predictions from most recent backwards
    const byDate = [...scored].sort(
      (a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime()
    );
    let streak = 0;
    for (let i = byDate.length - 1; i >= 0; i--) {
      if ((byDate[i].points ?? 0) > 0) streak++;
      else break;
    }

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      isContributor: user.isContributor,
      totalPoints,
      exactScores,
      correctWinners,
      predictions: user._count.predictions,
      lastRoundPoints,
      lastRoundExacts,
      hadLastRoundPred,
      hadLastRoundScoredPred,
      streak,
    };
  });

  // Current ranking
  const ranked = [...usersWithStats].sort((a, b) => b.totalPoints - a.totalPoints);

  // Previous ranking (without last round) for position change
  const prevRanked = [...usersWithStats].sort(
    (a, b) => (b.totalPoints - b.lastRoundPoints) - (a.totalPoints - a.lastRoundPoints)
  );
  const prevRankMap = new Map(prevRanked.map((u, i) => [u.id, i + 1]));

  const positionChanges = ranked.map((u, i) => ({
    id: u.id,
    change: (prevRankMap.get(u.id) ?? i + 1) - (i + 1),
  }));

  // Badge winners
  const maxStreak = Math.max(...ranked.map((u) => u.streak), 0);
  const streakWinners = ranked.filter((u) => u.streak === maxStreak && maxStreak > 0);
  const topStreakId = streakWinners.length === 1 ? streakWinners[0].id : null;

  const maxExacts = Math.max(...ranked.map((u) => u.lastRoundExacts), 0);
  const exactWinners = ranked.filter((u) => u.lastRoundExacts === maxExacts && maxExacts > 0);
  const topExactId = exactWinners.length === 1 ? exactWinners[0].id : null;

  const maxRise = Math.max(...positionChanges.map((u) => u.change), 0);
  const riseWinners = positionChanges.filter((u) => u.change === maxRise && maxRise > 0);
  const topRiserId = riseWinners.length === 1 ? riseWinners[0].id : null;

  const bolaMurchaIds = new Set(
    ranked
      .filter((u) => u.hadLastRoundPred && u.hadLastRoundScoredPred && u.lastRoundPoints === 0)
      .map((u) => u.id)
  );

  // Highlights
  const highlights = lastPhase
    ? (() => {
        const maxRoundPts = Math.max(...ranked.map((u) => u.lastRoundPoints), 0);
        const craqueList = ranked.filter((u) => u.lastRoundPoints === maxRoundPts && maxRoundPts > 0);
        const craque = craqueList.length === 1
          ? { name: craqueList[0].name, points: maxRoundPts }
          : null;

        const reiExatos = topExactId
          ? { name: ranked.find((u) => u.id === topExactId)!.name, count: maxExacts }
          : null;

        const topRiserEntry = topRiserId ? positionChanges.find((u) => u.id === topRiserId) : null;
        const maiorSubida = topRiserEntry
          ? { name: ranked.find((u) => u.id === topRiserId)!.name, positions: topRiserEntry.change }
          : null;

        const bolaMurchaNames = ranked
          .filter((u) => bolaMurchaIds.has(u.id))
          .map((u) => u.name);

        return {
          roundName: lastPhase,
          craque,
          reiExatos,
          maiorSubida,
          bolaMurcha: bolaMurchaNames.length > 0 ? bolaMurchaNames : null,
        };
      })()
    : null;

  const ranking = ranked.map((u, i) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    isContributor: u.isContributor,
    totalPoints: u.totalPoints,
    exactScores: u.exactScores,
    correctWinners: u.correctWinners,
    predictions: u.predictions,
    isLeader: i === 0 && u.totalPoints > 0,
    isTopStreak: u.id === topStreakId,
    isTopExact: u.id === topExactId,
    isTopRiser: u.id === topRiserId,
    isBolasMurcha: bolaMurchaIds.has(u.id),
  }));

  return NextResponse.json({ ranking, highlights });
}
