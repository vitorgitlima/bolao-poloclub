import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Exibe palpites de qualquer jogo cujas apostas já fecharam (10min antes do início)
  const lockCutoff = new Date(Date.now() + 10 * 60 * 1000);

  const predictions = await prisma.prediction.findMany({
    where: {
      userId: id,
      match: { date: { lte: lockCutoff } },
    },
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
    orderBy: { match: { date: "desc" } },
  });

  return NextResponse.json(
    predictions.map((p) => ({
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
      isDoublePoints: p.isDoublePoints,
    }))
  );
}
