import { NextRequest, NextResponse } from "next/server";
import { getEspnLiveAndToday } from "@/lib/espn-api";
import { processEspnMatches } from "@/lib/sync-helpers";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const matches = await getEspnLiveAndToday();
    const { updatedMatches, updatedPredictions } = await processEspnMatches(matches);

    // Jogo scheduled com data já passada = deveria estar ao vivo (ESPN ainda não detectou)
    const overdueScheduled = await prisma.match.count({
      where: { status: "SCHEDULED", date: { lte: new Date() } },
    });

    const nextMatch = await prisma.match.findFirst({
      where: { status: "SCHEDULED", date: { gt: new Date() } },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    // Se há jogo atrasado (scheduled mas data passada), reporta como 0s para forçar sync agressivo
    const nextMatchIn = overdueScheduled > 0
      ? 0
      : nextMatch
        ? Math.floor((nextMatch.date.getTime() - Date.now()) / 1000)
        : null;

    return NextResponse.json({ ok: true, updatedMatches, updatedPredictions, nextMatchIn });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
