import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canPredictMatch } from "@/lib/points";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id },
    include: { match: true },
  });

  return NextResponse.json(predictions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { matchId, homeScore, awayScore, isDoublePoints } = body;

  if (
    !matchId ||
    homeScore === undefined ||
    awayScore === undefined ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (!canPredictMatch(match.date)) {
    return NextResponse.json(
      { error: "Prazo de palpite encerrado (1h antes do jogo)" },
      { status: 400 }
    );
  }

  if (isDoublePoints) {
    const phase = match.phase;
    const doubleUsed = await prisma.prediction.findFirst({
      where: {
        userId: session.user.id,
        isDoublePoints: true,
        match: { phase },
      },
    });

    const existingForThisMatch = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId: session.user.id, matchId } },
    });

    if (doubleUsed && doubleUsed.matchId !== matchId && !existingForThisMatch?.isDoublePoints) {
      return NextResponse.json(
        { error: "Você já usou o double points nesta fase" },
        { status: 400 }
      );
    }
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: session.user.id, matchId } },
    update: { homeScore, awayScore, isDoublePoints: isDoublePoints ?? false },
    create: {
      userId: session.user.id,
      matchId,
      homeScore,
      awayScore,
      isDoublePoints: isDoublePoints ?? false,
    },
  });

  return NextResponse.json(prediction);
}
