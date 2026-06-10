import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const phaseFilter = searchParams.get("phase");

  // "Palpite fechado" = jogo FINISHED ou LIVE (sempre exibir)
  //                   OU jogo SCHEDULED mas já passou a janela de 10min (bloqueado)
  const lockCutoff = new Date(Date.now() + 10 * 60 * 1000);

  const phaseCondition = phaseFilter
    ? { phase: phaseFilter }
    : { phase: { not: { startsWith: "🧪" } } };

  const matchFilter = {
    ...phaseCondition,
    OR: [
      { status: { in: ["FINISHED", "LIVE"] } },
      { status: "SCHEDULED", date: { lte: lockCutoff } },
    ],
  };

  const [predictions, phasesRaw] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId: id, match: matchFilter },
      include: {
        match: {
          select: {
            homeTeam: true,
            awayTeam: true,
            homeFlag: true,
            awayFlag: true,
            homeScore: true,
            awayScore: true,
            date: true,
            phase: true,
            status: true,
          },
        },
      },
      orderBy: { match: { date: "asc" } },
    }),
    // Fases disponíveis (sem filtro de fase específica, para montar o seletor)
    prisma.prediction.findMany({
      where: {
        userId: id,
        match: {
          phase: { not: { startsWith: "🧪" } },
          OR: [
            { status: { in: ["FINISHED", "LIVE"] } },
            { status: "SCHEDULED", date: { lte: lockCutoff } },
          ],
        },
      },
      select: { match: { select: { phase: true, date: true } } },
      orderBy: { match: { date: "asc" } },
      distinct: ["matchId"],
    }),
  ]);

  // Fases em ordem cronológica (sem duplicatas)
  const seenPhases = new Set<string>();
  const phases: string[] = [];
  for (const p of phasesRaw) {
    if (!seenPhases.has(p.match.phase)) {
      seenPhases.add(p.match.phase);
      phases.push(p.match.phase);
    }
  }

  return NextResponse.json({
    phases,
    predictions: predictions.map((p) => ({
      matchId: p.matchId,
      homeTeam: p.match.homeTeam,
      awayTeam: p.match.awayTeam,
      homeFlag: p.match.homeFlag,
      awayFlag: p.match.awayFlag,
      date: p.match.date,
      phase: p.match.phase,
      status: p.match.status,
      actualHome: p.match.homeScore,
      actualAway: p.match.awayScore,
      predHome: p.homeScore,
      predAway: p.awayScore,
      points: p.points ?? 0,
    })),
  });
}
