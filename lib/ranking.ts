import { unstable_cache } from "next/cache";
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
  goalDifferenceHits: number;
  correctWinners: number;
  predictions: number;
  scoredPredictions: number;
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
  const [users, finishedMatchDates] = await Promise.all([
    prisma.user.findMany({
      where: filterUserIds ? { id: { in: filterUserIds } } : undefined,
      select: {
        id: true,
        name: true,
        image: true,
        isContributor: true,
        isArchitect: true,
        isIdealizador: true,
        isDeveloper: true,
        betaRank: true,
        isBetaTester: true,
        predictions: {
          select: {
            points: true,
            match: { select: { date: true, phase: true } },
          },
        },
      },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED", phase: { not: { startsWith: "🧪" } } },
      select: { date: true },
    }),
  ]);

  // Dias BRT (ordenados) que têm pelo menos 1 jogo encerrado — base do streak e Bola Murcha
  const finishedDays = [
    ...new Set(
      finishedMatchDates.map((m) =>
        new Date(m.date).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
      )
    ),
  ].sort();

  // Dia mais recente com jogo encerrado — usado para Bola Murcha ao vivo
  const latestDay = finishedDays.length > 0 ? finishedDays[finishedDays.length - 1] : null;

  const usersWithStats = users.map((user) => {
    const scored = user.predictions.filter(
      (p) => p.points !== null && !p.match.phase.startsWith("🧪")
    );
    const totalPoints = scored.reduce((s, p) => s + (p.points ?? 0), 0);
    const exactScores = scored.filter((p) => (p.points ?? 0) === 6).length;
    const goalDifferenceHits = scored.filter((p) => (p.points ?? 0) === 4).length;
    const correctWinners = scored.filter((p) => (p.points ?? 0) === 3).length;

    // Pontos por dia BRT — usado para Bola Murcha ao vivo
    const scoredByDay = new Map<string, number>();
    for (const p of scored) {
      const day = new Date(p.match.date).toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      });
      scoredByDay.set(day, (scoredByDay.get(day) ?? 0) + (p.points ?? 0));
    }

    // null = sem palpite no dia mais recente; 0 = palpitou mas zerou; >0 = pontuou
    const latestDayPoints = latestDay !== null
      ? (scoredByDay.has(latestDay) ? scoredByDay.get(latestDay)! : null)
      : null;

    // Placares exatos no dia mais recente (para Rei dos Exatos ao vivo)
    const latestDayExacts = latestDay !== null
      ? scored.filter(
          (p) =>
            (p.points ?? 0) === 6 &&
            new Date(p.match.date).toLocaleDateString("en-CA", {
              timeZone: "America/Sao_Paulo",
            }) === latestDay
        ).length
      : 0;

    // Streak: conta previsões positivas consecutivas do mais recente para o mais antigo.
    // Quebra no primeiro 0, e invalida se o usuário não palpitou em algum dia encerrado
    // dentro da janela da sequência (evita sequência "furada" por dias sem palpite).
    const byDateDesc = [...scored].sort(
      (a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime()
    );
    const userPredDays = new Set(scoredByDay.keys());
    let streak = 0;
    let oldestStreakDay: string | null = null;
    for (const pred of byDateDesc) {
      if ((pred.points ?? 0) > 0) {
        streak++;
        oldestStreakDay = new Date(pred.match.date).toLocaleDateString("en-CA", {
          timeZone: "America/Sao_Paulo",
        });
      } else break;
    }
    if (streak > 0 && oldestStreakDay !== null) {
      const relevantDays = finishedDays.filter((d) => d >= oldestStreakDay!);
      if (relevantDays.some((d) => !userPredDays.has(d))) streak = 0;
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
      goalDifferenceHits,
      correctWinners,
      predictions: user.predictions.filter((p) => !p.match.phase.startsWith("🧪")).length,
      scoredPredictions: scored.length,
      streak,
      latestDayPoints,
      latestDayExacts,
    };
  });

  function rankingSort(
    a: { totalPoints: number; exactScores: number; goalDifferenceHits: number; correctWinners: number; name: string | null },
    b: { totalPoints: number; exactScores: number; goalDifferenceHits: number; correctWinners: number; name: string | null }
  ) {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    if (b.goalDifferenceHits !== a.goalDifferenceHits) return b.goalDifferenceHits - a.goalDifferenceHits;
    if (b.correctWinners !== a.correctWinners) return b.correctWinners - a.correctWinners;
    // Empate absoluto — ordem alfabética (só afeta exibição, posição olímpica é a mesma)
    return (a.name ?? "").localeCompare(b.name ?? "", "pt-BR");
  }

  const ranked = usersWithStats.filter((u) => !u.isDeveloper).sort(rankingSort);
  const allSorted = [...usersWithStats].sort(rankingSort);

  // Streak winner (sempre live — não depende de snapshots)
  const maxStreak = Math.max(...ranked.map((u) => u.streak), 0);
  const streakWinnerIds = new Set(
    ranked.filter((u) => u.streak === maxStreak && maxStreak > 0).map((u) => u.id)
  );

  // ── Highlights e badges por snapshots de rodada ──────────────────────────
  let highlights: RankingHighlights | null = null;
  let riseWinnerIds = new Set<string>();
  let exactWinnerIds = new Set<string>();

  // Bola Murcha ao vivo: palpitou no dia mais recente com jogos encerrados mas zerou
  const bolaMurchaIds = new Set(
    ranked.filter((u) => u.latestDayPoints !== null && u.latestDayPoints === 0).map((u) => u.id)
  );

  const latestRounds = await prisma.roundSnapshot.findMany({
    distinct: ["roundLabel"],
    orderBy: { roundDate: "desc" },
    take: 1,
    select: { roundLabel: true, roundDate: true },
  });

  if (latestRounds.length > 0) {
    const latestLabel = latestRounds[0].roundLabel;

    const latestSnaps = await prisma.roundSnapshot.findMany({
      where: {
        roundLabel: latestLabel,
        ...(filterUserIds ? { userId: { in: filterUserIds } } : {}),
      },
    });

    // Posições atuais (ao vivo) para calcular Maior Subida em tempo real
    const liveNonDev = allSorted.filter((u) => !u.isDeveloper);
    const livePosMap = new Map(
      liveNonDev.map((u) => [
        u.id,
        liveNonDev.filter((x) => {
          if (x.totalPoints !== u.totalPoints) return x.totalPoints > u.totalPoints;
          if (x.exactScores !== u.exactScores) return x.exactScores > u.exactScores;
          if (x.goalDifferenceHits !== u.goalDifferenceHits) return x.goalDifferenceHits > u.goalDifferenceHits;
          return x.correctWinners > u.correctWinners;
        }).length + 1,
      ])
    );

    // Craque do Dia — ao vivo, do dia mais recente com jogos encerrados
    const maxLatestPts = Math.max(...ranked.map((u) => u.latestDayPoints ?? 0), 0);
    const craqueList = ranked.filter(
      (u) => u.latestDayPoints !== null && u.latestDayPoints === maxLatestPts && maxLatestPts > 0
    );

    // Rei dos Exatos — ao vivo, do dia mais recente
    const maxLatestExacts = Math.max(...ranked.map((u) => u.latestDayExacts), 0);
    const exatosList = ranked.filter(
      (u) => u.latestDayExacts === maxLatestExacts && maxLatestExacts > 0
    );
    exactWinnerIds = new Set(exatosList.map((u) => u.id));

    // Maior Subida — posição na snapshot vs posição atual ao vivo
    // Em liga: deriva posição relativa dentro dos membros da liga no momento da snapshot
    // No geral: usa s.position (posição geral armazenada)
    const riseList = latestSnaps
      .filter((s) => livePosMap.has(s.userId))
      .map((s) => {
        const snapshotPos = filterUserIds
          ? latestSnaps.filter((x) => x.totalPoints > s.totalPoints).length + 1
          : s.position;
        return { userId: s.userId, change: snapshotPos - livePosMap.get(s.userId)! };
      });
    const maxRise = Math.max(...riseList.map((r) => r.change), 0);
    const riseWinners = riseList.filter((r) => r.change === maxRise && maxRise > 0);
    riseWinnerIds = new Set(riseWinners.map((r) => r.userId));

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
              names: craqueList.map((u) => u.name).filter((n): n is string => !!n),
              points: maxLatestPts,
            }
          : null,
      reiExatos:
        exatosList.length > 0
          ? {
              names: exatosList.map((u) => u.name).filter((n): n is string => !!n),
              count: maxLatestExacts,
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
        bolaMurchaIds.size > 0
          ? ranked.filter((u) => bolaMurchaIds.has(u.id)).map((u) => u.name ?? null)
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
    goalDifferenceHits: u.goalDifferenceHits,
    correctWinners: u.correctWinners,
    predictions: u.predictions,
    scoredPredictions: u.scoredPredictions,
    isLeader: !u.isDeveloper && maxPoints > 0 && u.totalPoints === maxPoints,
    isTopStreak: streakWinnerIds.has(u.id),
    isTopExact: exactWinnerIds.has(u.id),
    isTopRiser: riseWinnerIds.has(u.id),
    isBolasMurcha: bolaMurchaIds.has(u.id),
  }));

  return { ranking, highlights };
}

// Cache compartilhado entre todas as instâncias Lambda da Vercel via Data Cache.
// revalidateTag('ranking') no sync invalida imediatamente após placar mudar.
export const computeRankingCached = unstable_cache(
  async (filterUserIds?: string[]) => computeRanking(filterUserIds),
  ["ranking"],
  { revalidate: 60, tags: ["ranking"] }
);

// Cria snapshot do ranking para uma data BRT específica.
// Chamada automaticamente pelo cron quando todos os jogos do dia fecham.
export async function snapshotCurrentRanking(
  roundLabel: string,
  roundDate: string // "YYYY-MM-DD" no fuso BRT
): Promise<void> {
  // Janela UTC correspondente ao dia BRT (BRT = UTC-3, então meia-noite BRT = 03:00 UTC)
  const startUTC = new Date(`${roundDate}T03:00:00Z`);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

  // Verifica se é criação nova (para notificações — evita reenvio em regenerações)
  const isNew = (await prisma.roundSnapshot.count({ where: { roundLabel } })) === 0;

  // Stats do dia (roundPoints, exatos, presença)
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
    // Palpite em jogo FINALIZADO no dia — para detectar Bola Murcha
    prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        match: {
          date: { gte: startUTC, lt: endUTC },
          status: "FINISHED",
          phase: { not: { startsWith: "🧪" } },
        },
      },
      _count: { id: true },
    }),
  ]);

  const roundPtsMap = new Map(roundPtsData.map((d) => [d.userId, d._sum.points ?? 0]));
  const roundExactsMap = new Map(roundExactsData.map((d) => [d.userId, d._count.id]));
  const hadPredSet = new Set(roundPredData.map((d) => d.userId));

  // Acumulado ATÉ o fim deste dia (date-bounded).
  // Garante que snapshots retroativos não capturem pontos de jogos posteriores ao dia.
  const closedStatuses = ["FINISHED", "EXTRA_TIME", "PENALTIES"] as const;
  const [cumulPtsData, cumulExactData, cumulGdhData, cumulCwData] = await Promise.all([
    prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        match: { date: { lt: endUTC }, status: { in: [...closedStatuses] }, phase: { not: { startsWith: "🧪" } } },
        points: { not: null },
      },
      _sum: { points: true },
    }),
    prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        match: { date: { lt: endUTC }, status: { in: [...closedStatuses] }, phase: { not: { startsWith: "🧪" } } },
        points: { equals: 6 },
      },
      _count: { id: true },
    }),
    prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        match: { date: { lt: endUTC }, status: { in: [...closedStatuses] }, phase: { not: { startsWith: "🧪" } } },
        points: { equals: 4 },
      },
      _count: { id: true },
    }),
    prisma.prediction.groupBy({
      by: ["userId"],
      where: {
        match: { date: { lt: endUTC }, status: { in: [...closedStatuses] }, phase: { not: { startsWith: "🧪" } } },
        points: { equals: 3 },
      },
      _count: { id: true },
    }),
  ]);

  const cumulPtsMap = new Map(cumulPtsData.map((d) => [d.userId, d._sum.points ?? 0]));
  const cumulExactMap = new Map(cumulExactData.map((d) => [d.userId, d._count.id]));
  const cumulGdhMap = new Map(cumulGdhData.map((d) => [d.userId, d._count.id]));
  const cumulCwMap = new Map(cumulCwData.map((d) => [d.userId, d._count.id]));

  // Todos os usuários não-developer
  const allNonDevUsers = await prisma.user.findMany({
    where: { isDeveloper: false },
    select: { id: true },
  });

  // Stats acumulados por usuário até endUTC
  const userStats = allNonDevUsers.map((u) => ({
    id: u.id,
    totalPoints: cumulPtsMap.get(u.id) ?? 0,
    exactScores: cumulExactMap.get(u.id) ?? 0,
    goalDifferenceHits: cumulGdhMap.get(u.id) ?? 0,
    correctWinners: cumulCwMap.get(u.id) ?? 0,
  }));

  // Snapshot anterior (para notificações de mudança de posição)
  const prevSnap = await prisma.roundSnapshot.findMany({
    where: {
      userId: { in: allNonDevUsers.map((u) => u.id) },
      roundDate: { lt: roundDate },
    },
    orderBy: { roundDate: "desc" },
    distinct: ["userId"],
  });
  const prevPosMap = new Map(prevSnap.map((s) => [s.userId, s.position]));

  const notifEntries: Parameters<typeof createRoundSummaryNotifications>[1] = [];

  for (const user of userStats) {
    // Posição olímpica baseada em stats acumulados até este dia
    const position =
      userStats.filter((other) => {
        if (other.totalPoints !== user.totalPoints) return other.totalPoints > user.totalPoints;
        if (other.exactScores !== user.exactScores) return other.exactScores > user.exactScores;
        if (other.goalDifferenceHits !== user.goalDifferenceHits)
          return other.goalDifferenceHits > user.goalDifferenceHits;
        return other.correctWinners > user.correctWinners;
      }).length + 1;

    const roundPoints = roundPtsMap.get(user.id) ?? 0;
    const roundExacts = roundExactsMap.get(user.id) ?? 0;
    const hadPrediction = hadPredSet.has(user.id) && roundPtsMap.has(user.id);

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

    if (isNew && hadPrediction) {
      notifEntries.push({
        userId: user.id,
        roundPoints,
        roundExacts,
        prevPosition: prevPosMap.get(user.id) ?? null,
        newPosition: position,
      });
    }
  }

  if (isNew) {
    await createRoundSummaryNotifications(roundLabel, notifEntries);
  }
}
