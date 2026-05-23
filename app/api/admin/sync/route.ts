import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEspnMatchesByDate, getEspnLiveAndToday, espnNameToPt, type EspnMatch } from "@/lib/espn-api";
import { calculatePoints } from "@/lib/points";

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return email ? admins.includes(email) : false;
}

async function getEspnAllGroupStageMatches(): Promise<EspnMatch[]> {
  const dates: string[] = [];
  const start = new Date("2026-06-11");
  const end = new Date("2026-06-28");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  const results = await Promise.all(dates.map((date) => getEspnMatchesByDate(date)));
  return results.flat();
}

async function processEspnMatches(espnMatches: EspnMatch[]) {
  let updatedMatches = 0;
  let updatedPredictions = 0;

  for (const em of espnMatches) {
    if (em.status === "pre") continue;

    const homePt = espnNameToPt(em.homeTeam.name);
    const awayPt = espnNameToPt(em.awayTeam.name);

    const match = await prisma.match.findFirst({
      where: { homeTeam: homePt, awayTeam: awayPt },
    });
    if (!match) continue;

    const status = em.completed ? "FINISHED" : "LIVE";
    const homeScore = em.homeTeam.score;
    const awayScore = em.awayTeam.score;

    await prisma.match.update({
      where: { id: match.id },
      data: { status, homeScore, awayScore },
    });
    updatedMatches++;

    if (em.completed) {
      const predictions = await prisma.prediction.findMany({
        where: { matchId: match.id },
      });
      for (const pred of predictions) {
        const { points } = calculatePoints(
          { home: pred.homeScore, away: pred.awayScore },
          { home: homeScore, away: awayScore },
          pred.isDoublePoints
        );
        if (pred.points !== points) {
          await prisma.prediction.update({ where: { id: pred.id }, data: { points } });
          updatedPredictions++;
        }
      }
    }
  }

  return { updatedMatches, updatedPredictions };
}

// POST /api/admin/sync?mode=today|all
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "today";

  try {
    const espnMatches =
      mode === "all"
        ? await getEspnAllGroupStageMatches()
        : await getEspnLiveAndToday();

    const { updatedMatches, updatedPredictions } = await processEspnMatches(espnMatches);

    return NextResponse.json({
      ok: true,
      mode,
      fixtures: espnMatches.length,
      updatedMatches,
      updatedPredictions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
