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
      _count: { select: { predictions: true } },
    },
  });

  const ranking = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
      isContributor: user.isContributor,
      totalPoints: user.predictions.reduce((sum, p) => sum + (p.points ?? 0), 0),
      exactScores: user.predictions.filter((p) =>
        p.isDoublePoints ? (p.points ?? 0) === 12 : (p.points ?? 0) === 6
      ).length,
      correctWinners: user.predictions.filter((p) =>
        p.isDoublePoints
          ? (p.points ?? 0) === 6 || (p.points ?? 0) === 8
          : (p.points ?? 0) === 3 || (p.points ?? 0) === 4
      ).length,
      predictions: user._count.predictions,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json(ranking);
}
