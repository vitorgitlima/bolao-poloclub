import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculatePoints } from "@/lib/points";

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      predictions: {
        include: {
          user: { select: { id: true, name: true, image: true, isDeveloper: true } },
        },
      },
    },
  });

  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const predictions = match.predictions
    .filter((p) => !p.user.isDeveloper)
    .map((p) => {
      let points: number | null = null;
      if (
        (["LIVE", "FINISHED", "EXTRA_TIME", "PENALTIES"].includes(match.status)) &&
        match.homeScore !== null &&
        match.awayScore !== null
      ) {
        points = calculatePoints(
          { home: p.homeScore, away: p.awayScore },
          { home: match.homeScore, away: match.awayScore }
        ).points;
      }
      return {
        userId: p.user.id,
        userName: p.user.name,
        userImage: p.user.image,
        predHome: p.homeScore,
        predAway: p.awayScore,
        points,
      };
    })
    .sort((a, b) => {
      // 1° pontos desc (exatos no topo)
      const ptsDiff = (b.points ?? -1) - (a.points ?? -1);
      if (ptsDiff !== 0) return ptsDiff;
      // 2° placar crescente (agrupa iguais, placares menores primeiro)
      const goalsDiff = (a.predHome + a.predAway) - (b.predHome + b.predAway);
      if (goalsDiff !== 0) return goalsDiff;
      if (a.predHome !== b.predHome) return a.predHome - b.predHome;
      return a.predAway - b.predAway;
    });

  return NextResponse.json({ predictions, status: match.status });
}
