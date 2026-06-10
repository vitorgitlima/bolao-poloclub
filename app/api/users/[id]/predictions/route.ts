import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Determina a fase 🧪 mais recente (maior número de rodada)
  const allPhases = await prisma.match.findMany({
    where: { phase: { startsWith: "🧪" } },
    select: { phase: true },
    distinct: ["phase"],
  });
  const currentPhase = allPhases
    .map((m) => m.phase)
    .sort((a, b) => {
      const num = (s: string) => parseInt(s.match(/(\d+)/)?.[1] ?? "0", 10);
      return num(b) - num(a);
    })[0] ?? null;

  if (!currentPhase) return NextResponse.json([]);

  // Exibe palpites da rodada atual cujas apostas já fecharam (10min antes do início)
  const lockCutoff = new Date(Date.now() + 10 * 60 * 1000);

  const predictions = await prisma.prediction.findMany({
    where: {
      userId: id,
      match: { phase: currentPhase, date: { lte: lockCutoff } },
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
    }))
  );
}
