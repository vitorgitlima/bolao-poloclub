import { prisma } from "@/lib/db";

export type RankingUser = {
  id: string;
  name: string | null;
  image: string | null;
  isContributor: boolean;
  isDeveloper: boolean;
  betaRank: number | null;
  isBetaTester: boolean;
  totalPoints: number;
  exactScores: number;
  correctWinners: number;
  predictions: number;
  isLeader: boolean;
  isTopStreak: boolean;
  isTopExact: boolean;
  isTopRiser: boolean;
  isBolasMurcha: boolean;
};

export type RankingHighlights = {
  roundName: string;
  craque: { names: string[]; points: number } | null;
  reiExatos: { names: string[]; count: number } | null;
  maiorSubida: { names: string[]; positions: number } | null;
  bolaMurcha: Array<string | null> | null;
};

export type RankingResult = {
  ranking: RankingUser[];
  highlights: RankingHighlights | null;
};

// Calcula ranking para um conjunto de userIds (undefined = todos os usuários)
export async function computeRanking(filterUserIds?: string[]): Promise<RankingResult> {
  const lastFinished = await prisma.match.findFirst({
    where: { status: "FINISHED", NOT: { phase: { startsWith: "🧪" } } },
    orderBy: { date: "desc" },
    select: { phase: true },
  });
  const lastPhase = lastFinished?.phase ?? null;

  const allTestPhases = await prisma.match.findMany({
    where: { phase: { startsWith: "🧪" } },
    select: { phase: true },
    distinct: ["phase"],
  });
  const currentPhase = allTestPhases
    .map((m) => m.phase)
    .sort((a, b) => {
      const num = (s: string) => parseInt(s.match(/(\d+)/)?.[1] ?? "0", 10);
      return num(b) - num(a);
    })[0] ?? null;

  const users = await prisma.user.findMany({
    where: filterUserIds ? { id: { in: filterUserIds } } : undefined,
    include: {
      predictions: {
        include: { match: { select: { date: true, phase: true } } },
      },
      _count: { select: { predictions: true } },
    },
  });

  const usersWithStats = users.map((user) => {
    // Apenas Copa (exclui fases 🧪 do ranking competitivo)
    const scored = user.predictions.filter(
      (p) => p.points !== null && !p.match.phase.startsWith("🧪")
    );
    const totalPoints = scored.reduce((s, p) => s + (p.points ?? 0), 0);

    const exactScores = scored.filter((p) =>
      p.isDoublePoints ? (p.points ?? 0) === 12 : (p.points ?? 0) === 6
    ).length;

    const correctWinners = scored.filter((p) =>
      p.isDoublePoints
        ? (p.points ?? 0) === 6 || (p.points ?? 0) === 8
        : (p.points ?? 0) === 3 || (p.points ?? 0) === 4
    ).length;

    const lastRoundAllPreds = lastPhase
      ? user.predictions.filter((p) => p.match.phase === lastPhase)
      : [];
    const lastRoundPreds = lastRoundAllPreds.filter((p) => p.points !== null);
    const lastRoundPoints = lastRoundPreds.reduce((s, p) => s + (p.points ?? 0), 0);
    const lastRoundExacts = lastRoundPreds.filter((p) =>
      p.isDoublePoints ? (p.points ?? 0) === 12 : (p.points ?? 0) === 6
    ).length;
    const hadLastRoundPred = lastRoundAllPreds.length > 0;
    const hadLastRoundScoredPred = lastRoundPreds.length > 0;

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
      isDeveloper: user.isDeveloper,
      betaRank: user.betaRank,
      isBetaTester: user.isBetaTester,
      totalPoints,
      exactScores,
      correctWinners,
      predictions: currentPhase
        ? user.predictions.filter((p) => p.match.phase === currentPhase).length
        : user._count.predictions,
      lastRoundPoints,
      lastRoundExacts,
      hadLastRoundPred,
      hadLastRoundScoredPred,
      streak,
    };
  });

  // Competitivo: exclui devs de posições e badges
  const ranked = [...usersWithStats]
    .filter((u) => !u.isDeveloper)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const allSorted = [...usersWithStats].sort((a, b) => b.totalPoints - a.totalPoints);

  const prevRanked = [...usersWithStats]
    .filter((u) => !u.isDeveloper)
    .sort((a, b) => (b.totalPoints - b.lastRoundPoints) - (a.totalPoints - a.lastRoundPoints));
  const prevRankMap = new Map(prevRanked.map((u, i) => [u.id, i + 1]));

  const positionChanges = ranked.map((u, i) => ({
    id: u.id,
    change: (prevRankMap.get(u.id) ?? i + 1) - (i + 1),
  }));

  const maxStreak = Math.max(...ranked.map((u) => u.streak), 0);
  const streakWinnerIds = new Set(
    ranked.filter((u) => u.streak === maxStreak && maxStreak > 0).map((u) => u.id)
  );

  const maxExacts = Math.max(...ranked.map((u) => u.lastRoundExacts), 0);
  const exactWinners = ranked.filter((u) => u.lastRoundExacts === maxExacts && maxExacts > 0);
  const exactWinnerIds = new Set(exactWinners.map((u) => u.id));

  const maxRise = Math.max(...positionChanges.map((u) => u.change), 0);
  const riseWinners = positionChanges.filter((u) => u.change === maxRise && maxRise > 0);
  const riseWinnerIds = new Set(riseWinners.map((u) => u.id));

  const bolaMurchaIds = new Set(
    ranked
      .filter((u) => u.hadLastRoundPred && u.hadLastRoundScoredPred && u.lastRoundPoints === 0)
      .map((u) => u.id)
  );

  const highlights: RankingHighlights | null = lastPhase
    ? (() => {
        const maxRoundPts = Math.max(...ranked.map((u) => u.lastRoundPoints), 0);
        const craqueList = ranked.filter((u) => u.lastRoundPoints === maxRoundPts && maxRoundPts > 0);
        const craque = craqueList.length > 0
          ? { names: craqueList.map((u) => u.name).filter((n): n is string => !!n), points: maxRoundPts }
          : null;
        const reiExatos = exactWinners.length > 0
          ? { names: exactWinners.map((u) => u.name).filter((n): n is string => !!n), count: maxExacts }
          : null;
        const maiorSubida = riseWinners.length > 0
          ? {
              names: riseWinners
                .map((u) => ranked.find((r) => r.id === u.id)?.name)
                .filter((n): n is string => !!n),
              positions: maxRise,
            }
          : null;
        const bolaMurchaNames = ranked.filter((u) => bolaMurchaIds.has(u.id)).map((u) => u.name);
        return {
          roundName: lastPhase,
          craque,
          reiExatos,
          maiorSubida,
          bolaMurcha: bolaMurchaNames.length > 0 ? bolaMurchaNames : null,
        };
      })()
    : null;

  const maxPoints = ranked[0]?.totalPoints ?? 0;

  const ranking: RankingUser[] = allSorted.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    isContributor: u.isContributor,
    isDeveloper: u.isDeveloper,
    betaRank: u.betaRank,
    isBetaTester: u.isBetaTester,
    totalPoints: u.totalPoints,
    exactScores: u.exactScores,
    correctWinners: u.correctWinners,
    predictions: u.predictions,
    isLeader: !u.isDeveloper && maxPoints > 0 && u.totalPoints === maxPoints,
    isTopStreak: streakWinnerIds.has(u.id),
    isTopExact: exactWinnerIds.has(u.id),
    isTopRiser: riseWinnerIds.has(u.id),
    isBolasMurcha: bolaMurchaIds.has(u.id),
  }));

  return { ranking, highlights };
}
