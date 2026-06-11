import { prisma } from "@/lib/db";
import { createRoundSummaryNotifications } from "@/lib/notifications";

export type RankingUser = {
  id: string;
  name: string | null;
  image: string | null;
  isContributor: boolean;
  isArchitect: boolean;
  isIdealizador: boolean;
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
  const users = await prisma.user.findMany({
    where: filterUserIds ? { id: { in: filterUserIds } } : undefined,
    include: {
      predictions: {
        include: { match: { select: { date: true, phase: true } } },
      },
    },
  });

  const usersWithStats = users.map((user) => {
    const scored = user.predictions.filter(
      (p) => p.points !== null && !p.match.phase.startsWith("🧪")
    );
    const totalPoints = scored.reduce((s, p) => s + (p.points ?? 0), 0);
    const exactScores = scored.filter((p) => (p.points ?? 0) === 6).length;
    const correctWinners = scored.filter(
      (p) => (p.points ?? 0) === 3 || (p.points ?? 0) === 4
    ).length;

    // Sequência de pontuações positivas consecutivas (da mais recente para trás)
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
      isArchitect: user.isArchitect,
      isIdealizador: user.isIdealizador,
      isDeveloper: user.isDeveloper,
      betaRank: user.betaRank,
      isBetaTester: user.isBetaTester,
      totalPoints,
      exactScores,
      correctWinners,
      predictions: user.predictions.filter((p) => !p.match.phase.startsWith("🧪")).length,
      streak,
    };
  });

  const ranked = usersWithStats
    .filter((u) => !u.isDeveloper)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const allSorted = [...usersWithStats].sort((a, b) => b.totalPoints - a.totalPoints);

  // Streak winner (sempre live — não depende de snapshots)
  const maxStreak = Math.max(...ranked.map((u) => u.streak), 0);
  const streakWinnerIds = new Set(
    ranked.filter((u) => u.streak === maxStreak && maxStreak > 0).map((u) => u.id)
  );

  // ── Highlights e badges por snapshots de rodada ──────────────────────────
  let highlights: RankingHighlights | null = null;
  let riseWinnerIds = new Set<string>();
  let bolaMurchaIds = new Set<string>();
  let exactWinnerIds = new Set<string>();

  const latestRounds = await prisma.roundSnapshot.findMany({
    distinct: ["roundLabel"],
    orderBy: { roundDate: "desc" },
    take: 2,
    select: { roundLabel: true, roundDate: true },
  });

  if (latestRounds.length > 0) {
    const latestLabel = latestRounds[0].roundLabel;
    const prevLabel = latestRounds[1]?.roundLabel ?? null;

    const [latestSnaps, prevSnaps] = await Promise.all([
      prisma.roundSnapshot.findMany({
        where: {
          roundLabel: latestLabel,
          ...(filterUserIds ? { userId: { in: filterUserIds } } : {}),
        },
      }),
      prevLabel
        ? prisma.roundSnapshot.findMany({
            where: {
              roundLabel: prevLabel,
              ...(filterUserIds ? { userId: { in: filterUserIds } } : {}),
            },
          })
        : Promise.resolve([]),
    ]);

    const prevMap = new Map(prevSnaps.map((s) => [s.userId, s]));

    // Craque da Rodada
    const maxRoundPts = Math.max(...latestSnaps.map((s) => s.roundPoints), 0);
    const craqueList = latestSnaps.filter(
      (s) => s.roundPoints === maxRoundPts && maxRoundPts > 0
    );

    // Rei dos Exatos (nessa rodada)
    const maxExacts = Math.max(...latestSnaps.map((s) => s.roundExacts), 0);
    const exatosList = latestSnaps.filter(
      (s) => s.roundExacts === maxExacts && maxExacts > 0
    );
    exactWinnerIds = new Set(exatosList.map((s) => s.userId));

    // Maior Subida (precisa de 2 snapshots)
    const riseList = latestSnaps
      .filter((s) => prevMap.has(s.userId))
      .map((s) => ({
        userId: s.userId,
        change: prevMap.get(s.userId)!.position - s.position,
      }));
    const maxRise = Math.max(...riseList.map((r) => r.change), 0);
    const riseWinners = riseList.filter((r) => r.change === maxRise && maxRise > 0);
    riseWinnerIds = new Set(riseWinners.map((r) => r.userId));

    // Bola Murcha (tinha palpite na rodada mas zerou)
    const bolaMurchaList = latestSnaps.filter(
      (s) => s.hadPrediction && s.roundPoints === 0
    );
    bolaMurchaIds = new Set(bolaMurchaList.map((s) => s.userId));

    // Mapa de nomes para highlights
    const snappedIds = [...new Set(latestSnaps.map((s) => s.userId))];
    const snappedUsers = await prisma.user.findMany({
      where: { id: { in: snappedIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(snappedUsers.map((u) => [u.id, u.name]));

    highlights = {
      roundName: latestLabel,
      craque:
        craqueList.length > 0
          ? {
              names: craqueList
                .map((s) => nameMap.get(s.userId))
                .filter((n): n is string => !!n),
              points: maxRoundPts,
            }
          : null,
      reiExatos:
        exatosList.length > 0
          ? {
              names: exatosList
                .map((s) => nameMap.get(s.userId))
                .filter((n): n is string => !!n),
              count: maxExacts,
            }
          : null,
      maiorSubida:
        riseWinners.length > 0
          ? {
              names: riseWinners
                .map((r) => nameMap.get(r.userId))
                .filter((n): n is string => !!n),
              positions: maxRise,
            }
          : null,
      bolaMurcha:
        bolaMurchaList.length > 0
          ? bolaMurchaList.map((s) => nameMap.get(s.userId) ?? null)
          : null,
    };
  }

  const maxPoints = ranked[0]?.totalPoints ?? 0;

  const ranking: RankingUser[] = allSorted.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    isContributor: u.isContributor,
    isArchitect: u.isArchitect,
    isIdealizador: u.isIdealizador,
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

// Cria snapshot do ranking para uma data BRT específica.
// Chamada automaticamente pelo cron quando todos os jogos do dia fecham.
export async function snapshotCurrentRanking(
  roundLabel: string,
  roundDate: string // "YYYY-MM-DD" no fuso BRT
): Promise<void> {
  // Janela UTC correspondente ao dia BRT (BRT = UTC-3, então meia-noite BRT = 03:00 UTC)
  const startUTC = new Date(`${roundDate}T03:00:00Z`);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

  const [roundPtsData, roundExactsData, roundPredData] = await Promise.all([
    prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        match: {
          date: { gte: startUTC, lt: endUTC },
          status: "FINISHED",
          phase: { not: { startsWith: "🧪" } },
        },
        points: { not: null },
      },
      _sum: { points: true },
    }),
    prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        match: {
          date: { gte: startUTC, lt: endUTC },
          status: "FINISHED",
          phase: { not: { startsWith: "🧪" } },
        },
        points: { equals: 6 },
      },
      _count: { id: true },
    }),
    // Qualquer palpite no dia (mesmo sem pontos) — para detectar Bola Murcha
    prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        match: {
          date: { gte: startUTC, lt: endUTC },
          phase: { not: { startsWith: "🧪" } },
        },
      },
      _count: { id: true },
    }),
  ]);

  const roundPtsMap = new Map(roundPtsData.map((d) => [d.userId, d._sum.points ?? 0]));
  const roundExactsMap = new Map(roundExactsData.map((d) => [d.userId, d._count.id]));
  const hadPredSet = new Set(roundPredData.map((d) => d.userId));

  const { ranking } = await computeRanking();
  const nonDevRanking = ranking.filter((u) => !u.isDeveloper);

  // Snapshot anterior para calcular mudança de posição (para notificações)
  const prevSnap = await prisma.roundSnapshot.findMany({
    where: { userId: { in: nonDevRanking.map((u) => u.id) } },
    orderBy: { roundDate: "desc" },
    distinct: ["userId"],
  });
  const prevPosMap = new Map(prevSnap.map((s) => [s.userId, s.position]));

  const notifEntries: Parameters<typeof createRoundSummaryNotifications>[1] = [];

  for (const user of nonDevRanking) {
    const position =
      nonDevRanking.filter((u) => u.totalPoints > user.totalPoints).length + 1;
    const roundPoints = roundPtsMap.get(user.id) ?? 0;
    const roundExacts = roundExactsMap.get(user.id) ?? 0;
    const hadPrediction = hadPredSet.has(user.id);

    await prisma.roundSnapshot.upsert({
      where: { userId_roundLabel: { userId: user.id, roundLabel } },
      update: { position, totalPoints: user.totalPoints, roundPoints, roundExacts, hadPrediction },
      create: {
        userId: user.id,
        roundLabel,
        roundDate,
        position,
        totalPoints: user.totalPoints,
        roundPoints,
        roundExacts,
        hadPrediction,
      },
    });

    if (hadPrediction) {
      notifEntries.push({
        userId: user.id,
        roundPoints,
        roundExacts,
        prevPosition: prevPosMap.get(user.id) ?? null,
        newPosition: position,
      });
    }
  }

  await createRoundSummaryNotifications(roundLabel, notifEntries);
}
