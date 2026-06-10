import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEspnMatchesByDate } from "@/lib/espn-api";
import { processEspnMatches } from "@/lib/sync-helpers";

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return email ? admins.includes(email) : false;
}

// GET /api/admin/sync-test — lista todos os jogos da Copa no banco
export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const matches = await prisma.match.findMany({
    where: { phase: { not: { startsWith: "🧪" } } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      date: true,
      phase: true,
      homeScore: true,
      awayScore: true,
      status: true,
    },
  });

  return NextResponse.json(matches);
}

// POST /api/admin/sync-test?dates=YYYYMMDD,YYYYMMDD,... — busca fifa.world para cada data e atualiza
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const datesParam =
    req.nextUrl.searchParams.get("dates") ??
    new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const dates = datesParam.split(",").filter(Boolean);

  try {
    const results = await Promise.all(dates.map((d) => getEspnMatchesByDate(d)));
    const seen = new Set<string>();
    const espnMatches = results.flat().filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    const { updatedMatches, updatedPredictions } = await processEspnMatches(espnMatches);

    return NextResponse.json({
      ok: true,
      dates,
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
