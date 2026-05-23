import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    include: {
      predictions: {
        where: { points: { not: null } },
        select: { points: true, isDoublePoints: true },
      },
    },
  });

  const ranking = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
      totalPoints: user.predictions.reduce((sum, p) => sum + (p.points ?? 0), 0),
      exactScores: user.predictions.filter((p) => {
        if (p.isDoublePoints) return (p.points ?? 0) >= 20;
        return (p.points ?? 0) === 10;
      }).length,
      correctWinners: user.predictions.filter((p) => {
        if (p.isDoublePoints) return (p.points ?? 0) >= 10 && (p.points ?? 0) < 20;
        return (p.points ?? 0) === 5;
      }).length,
      predictions: user.predictions.length,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json(ranking);
}
