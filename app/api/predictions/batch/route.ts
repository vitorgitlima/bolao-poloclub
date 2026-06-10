import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canPredictMatch } from "@/lib/points";

type PredictionInput = {
  matchId: string;
  homeScore: number;
  awayScore: number;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { predictions }: { predictions: PredictionInput[] } = await req.json();

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Validate all scores
  for (const p of predictions) {
    if (
      !p.matchId ||
      typeof p.homeScore !== "number" ||
      typeof p.awayScore !== "number" ||
      !Number.isInteger(p.homeScore) ||
      !Number.isInteger(p.awayScore) ||
      p.homeScore < 0 || p.awayScore < 0 ||
      p.homeScore > 99 || p.awayScore > 99
    ) {
      return NextResponse.json({ error: "Placar inválido em um dos jogos" }, { status: 400 });
    }
  }

  // Fetch all matches at once
  const matchIds = predictions.map((p) => p.matchId);
  const matches = await prisma.match.findMany({ where: { id: { in: matchIds } } });
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  // Validate deadlines
  for (const p of predictions) {
    const match = matchMap.get(p.matchId);
    if (!match) return NextResponse.json({ error: `Jogo não encontrado: ${p.matchId}` }, { status: 404 });
    if (!canPredictMatch(match.date)) {
      return NextResponse.json({ error: `Prazo encerrado para ${match.homeTeam} x ${match.awayTeam}` }, { status: 400 });
    }
  }

  // Upsert all predictions
  let saved = 0;
  for (const p of predictions) {
    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: session.user.id, matchId: p.matchId } },
      update: { homeScore: p.homeScore, awayScore: p.awayScore },
      create: { userId: session.user.id, matchId: p.matchId, homeScore: p.homeScore, awayScore: p.awayScore },
    });
    saved++;
  }

  return NextResponse.json({ ok: true, saved });
}
