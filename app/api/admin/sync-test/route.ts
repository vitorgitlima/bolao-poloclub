import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEspnBrasileiraoByDate } from "@/lib/espn-api";
import { processEspnMatches } from "@/lib/sync-helpers";

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return email ? admins.includes(email) : false;
}

// GET /api/admin/sync-test — lista todos os jogos de teste no banco
export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const matches = await prisma.match.findMany({
    where: { phase: { startsWith: "🧪" } },
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
      predictions: { select: { homeScore: true, awayScore: true, points: true } },
    },
  });

  return NextResponse.json(matches);
}

// POST /api/admin/sync-test?date=YYYYMMDD — busca bra.1 e atualiza jogos de teste
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const date =
    req.nextUrl.searchParams.get("date") ??
    new Date().toISOString().slice(0, 10).replace(/-/g, "");

  try {
    const espnMatches = await getEspnBrasileiraoByDate(date);
    const { updatedMatches, updatedPredictions } = await processEspnMatches(espnMatches);

    return NextResponse.json({
      ok: true,
      date,
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
