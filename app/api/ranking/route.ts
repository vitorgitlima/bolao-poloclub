import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRankingCached } from "@/lib/ranking";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [result, remainingMatches] = await Promise.all([
    computeRankingCached(),
    prisma.match.count({
      where: { status: "SCHEDULED", phase: { not: { startsWith: "🧪" } } },
    }),
  ]);

  const data = {
    ...result,
    ranking: result.ranking.filter((u) => !u.isDeveloper),
    remainingMatches,
  };

  return NextResponse.json(data);
}
