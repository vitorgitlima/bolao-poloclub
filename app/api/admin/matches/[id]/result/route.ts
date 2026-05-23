import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculatePoints } from "@/lib/points";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: matchId } = await params;
  const { homeScore, awayScore } = await req.json();

  if (homeScore === undefined || awayScore === undefined || homeScore < 0 || awayScore < 0) {
    return NextResponse.json({ error: "Placar inválido" }, { status: 400 });
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status: "FINISHED" },
  });

  const predictions = await prisma.prediction.findMany({ where: { matchId } });

  let updatedPredictions = 0;
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

  return NextResponse.json({ ok: true, updatedPredictions });
}
