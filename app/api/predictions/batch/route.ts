import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canPredictMatch } from "@/lib/points";

type PredictionInput = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  isDoublePoints: boolean;
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
    if (!p.matchId || p.homeScore === undefined || p.awayScore === undefined || p.homeScore < 0 || p.awayScore < 0) {
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

  // Validate double points: at most 1 per phase across the batch
  const doublesInBatch = new Map<string, string>(); // phase → matchId
  for (const p of predictions) {
    if (!p.isDoublePoints) continue;
    const match = matchMap.get(p.matchId)!;
    const phase = match.phase;
    if (doublesInBatch.has(phase)) {
      return NextResponse.json({ error: `Apenas 1 double points por fase (${phase})` }, { status: 400 });
    }
    doublesInBatch.set(phase, p.matchId);
  }

  // Check existing DB doubles for phases that have a new double in batch
  for (const [phase, batchMatchId] of doublesInBatch) {
    const existing = await prisma.prediction.findFirst({
      where: { userId: session.user.id, isDoublePoints: true, match: { phase } },
    });
    if (existing && existing.matchId !== batchMatchId) {
      return NextResponse.json({ error: `Double points já usado na fase ${phase}` }, { status: 400 });
    }
  }

  // Upsert all predictions
  let saved = 0;
  for (const p of predictions) {
    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: session.user.id, matchId: p.matchId } },
      update: { homeScore: p.homeScore, awayScore: p.awayScore, isDoublePoints: p.isDoublePoints },
      create: { userId: session.user.id, matchId: p.matchId, homeScore: p.homeScore, awayScore: p.awayScore, isDoublePoints: p.isDoublePoints },
    });
    saved++;
  }

  return NextResponse.json({ ok: true, saved });
}
