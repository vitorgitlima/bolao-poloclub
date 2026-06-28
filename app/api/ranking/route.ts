import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRankingCached } from "@/lib/ranking";

export type NextMatchWarning = {
  homeTeam: string;
  awayTeam: string;
  time: string;
} | null;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [result, remainingMatches, nextMatch, last3] = await Promise.all([
    computeRankingCached(),
    prisma.match.count({
      where: { status: "SCHEDULED", phase: { not: { startsWith: "🧪" } } },
    }),
    prisma.match.findFirst({
      where: { status: "SCHEDULED", phase: { not: { startsWith: "🧪" } }, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      select: { id: true, homeTeam: true, awayTeam: true, date: true },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED", phase: { not: { startsWith: "🧪" } } },
      orderBy: { date: "desc" },
      take: 3,
      select: { id: true },
    }),
  ]);

  const missingPredictionIds = new Set<string>();
  let nextMatchWarning: NextMatchWarning = null;

  if (nextMatch && last3.length > 0) {
    const last3Ids = last3.map((m) => m.id);

    const [activePreds, nextPreds] = await Promise.all([
      prisma.prediction.findMany({
        where: { matchId: { in: last3Ids } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.prediction.findMany({
        where: { matchId: nextMatch.id },
        select: { userId: true },
      }),
    ]);

    const activeIds = new Set(activePreds.map((p) => p.userId));
    const predictedIds = new Set(nextPreds.map((p) => p.userId));

    for (const uid of activeIds) {
      if (!predictedIds.has(uid)) missingPredictionIds.add(uid);
    }

    const brtNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const brtMatch = new Date(nextMatch.date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const isToday = brtNow.toDateString() === brtMatch.toDateString();
    const isTomorrow =
      new Date(brtNow.getFullYear(), brtNow.getMonth(), brtNow.getDate() + 1).toDateString() ===
      brtMatch.toDateString();

    const time = nextMatch.date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    nextMatchWarning = {
      homeTeam: nextMatch.homeTeam,
      awayTeam: nextMatch.awayTeam,
      time: isToday ? time : isTomorrow ? `Amanhã ${time}` : time,
    };
  }

  const ranking = result.ranking
    .filter((u) => !u.isDeveloper)
    .map((u) => ({ ...u, isMissingNextPrediction: missingPredictionIds.has(u.id) }));

  return NextResponse.json({ ...result, ranking, remainingMatches, nextMatchWarning });
}
